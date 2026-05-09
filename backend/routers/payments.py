"""
Multi-gateway payment router.

Mounted at: /api/payments

Endpoints:
  POST /api/payments/initiate                — start any gateway flow
  POST /api/payments/razorpay/verify         — verify Razorpay popup result
  POST /api/payments/phonepe/verify          — verify PhonePe after redirect
  POST /api/payments/airpay/verify           — verify Airpay after redirect
  GET  /api/payments/transaction/{txn_id}    — get single transaction
  GET  /api/payments/transactions            — list user's transactions
  POST /api/payments/webhook/razorpay        — Razorpay server-to-server
  POST /api/payments/webhook/phonepe         — PhonePe server-to-server
  POST /api/payments/webhook/airpay          — Airpay server-to-server
"""
import json
import logging
import base64

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional

from database import transactions_col
from utils.security import get_current_user
from models.payment import InitiatePaymentIn, VerifyRazorpayIn
from services import payment_service, razorpay_service, phonepe_service, airpay_service

logger = logging.getLogger(__name__)
router = APIRouter()


def _ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    return forwarded.split(",")[0].strip() if forwarded else (request.client.host or "")


# ── Initiate ───────────────────────────────────────────────────────────────

@router.post("/initiate", summary="Initiate payment with any gateway")
async def initiate_payment(
    data: InitiatePaymentIn,
    request: Request,
    current_user=Depends(get_current_user),
):
    """
    Start a payment flow for a placed order.

    Body:
      order_id     — internal order ID
      gateway      — "razorpay" | "phonepe" | "airpay"
      redirect_url — optional override for PhonePe callback URL

    Returns gateway-specific credentials for the frontend to proceed.
    """
    return await payment_service.initiate(
        order_id=data.order_id,
        user_id=current_user["_id"],
        gateway=data.gateway,
        redirect_url=data.redirect_url,
        ip_address=_ip(request),
        user_agent=request.headers.get("User-Agent", ""),
    )


# ── Razorpay verify ────────────────────────────────────────────────────────

@router.post("/razorpay/verify", summary="Verify Razorpay payment signature")
async def verify_razorpay(
    data: VerifyRazorpayIn,
    current_user=Depends(get_current_user),
):
    """
    Called after Razorpay modal closes with success.
    Server validates HMAC-SHA256 before marking order paid.
    """
    return await payment_service.verify_razorpay(
        transaction_id=data.transaction_id,
        razorpay_order_id=data.razorpay_order_id,
        razorpay_payment_id=data.razorpay_payment_id,
        razorpay_signature=data.razorpay_signature,
        user_id=current_user["_id"],
    )


# ── PhonePe verify ─────────────────────────────────────────────────────────

class PhonePeVerifyIn(BaseModel):
    transaction_id: str


@router.post("/phonepe/verify", summary="Verify PhonePe payment via status API")
async def verify_phonepe(
    data: PhonePeVerifyIn,
    current_user=Depends(get_current_user),
):
    """
    Called after user returns from PhonePe redirect.
    Server polls PhonePe Status API to confirm payment.
    """
    return await payment_service.verify_phonepe(
        transaction_id=data.transaction_id,
        user_id=current_user["_id"],
    )


# ── Airpay verify ──────────────────────────────────────────────────────────

class AirpayVerifyIn(BaseModel):
    transaction_id: str
    airpay_params: dict


@router.post("/airpay/verify", summary="Verify Airpay payment checksum")
async def verify_airpay(
    data: AirpayVerifyIn,
    current_user=Depends(get_current_user),
):
    """
    Called after user returns from Airpay redirect.
    Server re-validates SHA512 checksum.
    """
    return await payment_service.verify_airpay(
        transaction_id=data.transaction_id,
        params=data.airpay_params,
        user_id=current_user["_id"],
    )


# ── Transaction reads ──────────────────────────────────────────────────────

@router.get("/transaction/{transaction_id}", summary="Get a single transaction")
async def get_transaction(
    transaction_id: str,
    current_user=Depends(get_current_user),
):
    return await payment_service.get_transaction(transaction_id, current_user["_id"])


@router.get("/transactions", summary="List current user's payment history")
async def list_transactions(current_user=Depends(get_current_user)):
    return await payment_service.list_user_transactions(current_user["_id"])


# ── Webhooks ───────────────────────────────────────────────────────────────

@router.post("/webhook/razorpay", summary="Razorpay webhook receiver")
async def webhook_razorpay(request: Request):
    """
    Register in Razorpay Dashboard → Settings → Webhooks
    URL: {BACKEND_URL}/api/payments/webhook/razorpay
    Secret: RAZORPAY_WEBHOOK_SECRET
    Events: payment.captured, payment.failed
    """
    payload = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")

    if not razorpay_service.verify_webhook_signature(payload, sig):
        logger.warning("Razorpay webhook: bad signature")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event_data = json.loads(payload)
        event = event_data.get("event", "")

        if event == "payment.captured":
            payment    = event_data.get("payload", {}).get("payment", {}).get("entity", {})
            rz_order_id = payment.get("order_id", "")
            txn = await transactions_col.find_one({"gatewayOrderId": rz_order_id})
            if txn and txn.get("paymentStatus") != "success":
                await payment_service._mark_success(
                    txn["_id"], txn["orderId"],
                    payment.get("id", ""),
                    {"razorpay_payment_id": payment.get("id"), "event": event},
                )
                logger.info(f"Razorpay webhook: paid — {rz_order_id}")

        elif event == "payment.failed":
            payment     = event_data.get("payload", {}).get("payment", {}).get("entity", {})
            rz_order_id = payment.get("order_id", "")
            txn = await transactions_col.find_one({"gatewayOrderId": rz_order_id})
            if txn and txn.get("paymentStatus") == "pending":
                await payment_service._mark_failed(txn["_id"], {"event": event, "error": payment.get("error_description")})

    except Exception as exc:
        logger.error(f"Razorpay webhook error: {exc}")

    return {"status": "ok"}


@router.post("/webhook/phonepe", summary="PhonePe webhook callback")
async def webhook_phonepe(request: Request):
    """
    Pass callbackUrl = {BACKEND_URL}/api/payments/webhook/phonepe when initiating.
    PhonePe POSTs a base64-encoded JSON with X-VERIFY header.
    """
    try:
        body        = await request.json()
        payload_b64 = body.get("response", "")
        x_verify    = request.headers.get("X-VERIFY", "")

        if not phonepe_service.verify_webhook_checksum(x_verify, payload_b64):
            logger.warning("PhonePe webhook: checksum mismatch")
            raise HTTPException(status_code=400, detail="Invalid checksum")

        decoded     = json.loads(base64.b64decode(payload_b64).decode())
        txn_id      = decoded.get("data", {}).get("merchantTransactionId", "")
        gateway_txn = decoded.get("data", {}).get("transactionId", "")
        success     = decoded.get("success", False)
        code        = decoded.get("code", "")

        txn = await transactions_col.find_one({"_id": txn_id})
        if txn and txn.get("paymentStatus") != "success":
            if success and code == "PAYMENT_SUCCESS":
                await payment_service._mark_success(txn_id, txn["orderId"], gateway_txn, decoded)
                logger.info(f"PhonePe webhook: paid — {txn_id}")
            else:
                await payment_service._mark_failed(txn_id, decoded)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"PhonePe webhook error: {exc}")

    return {"status": "ok"}


@router.post("/webhook/airpay", summary="Airpay webhook callback")
async def webhook_airpay(request: Request):
    """
    Configure in Airpay merchant dashboard → Webhook URL.
    Airpay POSTs form data.
    """
    try:
        form   = await request.form()
        params = dict(form)

        if not airpay_service.verify_response_checksum(params):
            logger.warning("Airpay webhook: checksum mismatch")
            raise HTTPException(status_code=400, detail="Invalid checksum")

        txn_id = params.get("orderid", "")
        txn    = await transactions_col.find_one({"_id": txn_id})
        if txn and txn.get("paymentStatus") != "success":
            if airpay_service.is_payment_successful(params):
                await payment_service._mark_success(
                    txn_id, txn["orderId"], params.get("transactionid", ""), dict(params)
                )
                logger.info(f"Airpay webhook: paid — {txn_id}")
            else:
                await payment_service._mark_failed(txn_id, dict(params))

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Airpay webhook error: {exc}")

    return {"status": "ok"}
