"""
Payment router — Razorpay first, PhonePe/Airpay stubs ready.

Mounted at: /api/payments

Endpoints (Razorpay):
  POST /api/payments/initiate            — create Razorpay order + transaction record
  POST /api/payments/razorpay/verify     — verify signature server-side
  POST /api/payments/webhook/razorpay    — async webhook from Razorpay
  GET  /api/payments/transaction/{id}    — single transaction (owner only)
  GET  /api/payments/transactions        — current user's history

Admin endpoints:
  GET  /api/payments/admin/transactions  — all transactions with filters
"""
import json
import logging

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel
from typing import Optional

from database import transactions_col
from utils.security import get_current_user, require_staff
from services import payment_service, razorpay_service

logger = logging.getLogger(__name__)
router = APIRouter()


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("X-Forwarded-For")
    return fwd.split(",")[0].strip() if fwd else (request.client.host or "")


# ── Schemas ────────────────────────────────────────────────────────────────

class InitiateIn(BaseModel):
    order_id: str
    gateway: str = "razorpay"   # only razorpay implemented for now


class RazorpayVerifyIn(BaseModel):
    transaction_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ── Initiate ───────────────────────────────────────────────────────────────

@router.post("/initiate", summary="Start a Razorpay payment")
async def initiate_payment(
    data: InitiateIn,
    request: Request,
    current_user=Depends(get_current_user),
):
    """
    Creates a Razorpay order and a pending transaction record in MongoDB.

    Returns:
      transaction_id      — our internal transaction ID
      razorpay_order_id   — Razorpay order ID (pass to checkout.js)
      key_id              — Razorpay public key (pass to checkout.js)
      amount              — amount in paise
      currency            — "INR"
    """
    if data.gateway != "razorpay":
        raise HTTPException(status_code=400, detail=f"Gateway '{data.gateway}' not yet enabled")

    return await payment_service.initiate_razorpay(
        order_id=data.order_id,
        user_id=current_user["_id"],
        ip_address=_client_ip(request),
        user_agent=request.headers.get("User-Agent", ""),
    )


# ── Razorpay verify ────────────────────────────────────────────────────────

@router.post("/razorpay/verify", summary="Verify Razorpay payment signature")
async def verify_razorpay(
    data: RazorpayVerifyIn,
    current_user=Depends(get_current_user),
):
    """
    Called by frontend immediately after the Razorpay modal closes with success.
    Validates HMAC-SHA256 signature server-side then marks order paid.
    Idempotent — safe to call twice (returns success without re-processing).
    """
    return await payment_service.verify_razorpay(
        transaction_id=data.transaction_id,
        razorpay_order_id=data.razorpay_order_id,
        razorpay_payment_id=data.razorpay_payment_id,
        razorpay_signature=data.razorpay_signature,
        user_id=current_user["_id"],
    )


# ── Transaction reads (user) ───────────────────────────────────────────────

@router.get("/transaction/{transaction_id}", summary="Get a single transaction (owner only)")
async def get_transaction(
    transaction_id: str,
    current_user=Depends(get_current_user),
):
    return await payment_service.get_transaction(transaction_id, current_user["_id"])


@router.get("/transactions", summary="List current user's payment history")
async def list_transactions(current_user=Depends(get_current_user)):
    return await payment_service.list_user_transactions(current_user["_id"])


# ── Admin reads ────────────────────────────────────────────────────────────

@router.get("/admin/transactions", summary="Admin: all transactions with filters")
async def admin_list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    gateway: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    _admin=Depends(require_staff),
):
    """
    Admin-only endpoint.
    Filters: status (pending|success|failed|refunded), gateway (razorpay|phonepe|airpay), search (txnId/orderId/userId).
    Returns paginated list enriched with order + user data.
    """
    return await payment_service.admin_list_transactions(
        page=page, limit=limit, status=status, gateway=gateway, search=search
    )


# ── Razorpay webhook ───────────────────────────────────────────────────────

@router.post("/webhook/razorpay", summary="Razorpay server-to-server webhook (no auth)")
async def webhook_razorpay(request: Request):
    """
    Register this URL in Razorpay Dashboard → Settings → Webhooks.
    URL: {BACKEND_URL}/api/payments/webhook/razorpay
    Secret: value of RAZORPAY_WEBHOOK_SECRET env var
    Events to subscribe: payment.captured, payment.failed

    This provides a safety net — if the user closes the browser before
    verify is called, the webhook marks the order paid automatically.
    """
    payload   = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not razorpay_service.verify_webhook_signature(payload, signature):
        logger.warning("Razorpay webhook: bad signature — ignoring")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event_data = json.loads(payload)
        event      = event_data.get("event", "")
        logger.info(f"Razorpay webhook received: {event}")

        if event == "payment.captured":
            payment     = event_data["payload"]["payment"]["entity"]
            rz_order_id = payment.get("order_id", "")
            rz_pay_id   = payment.get("id", "")

            txn = await transactions_col.find_one({"gatewayOrderId": rz_order_id})
            if txn and txn.get("paymentStatus") != "success":
                await payment_service._mark_success(
                    txn["_id"],
                    txn["orderId"],
                    rz_pay_id,
                    {"razorpay_payment_id": rz_pay_id, "event": event, "via": "webhook"},
                )
                logger.info(f"Webhook: order {txn['orderId']} marked paid via {rz_pay_id}")

        elif event == "payment.failed":
            payment     = event_data["payload"]["payment"]["entity"]
            rz_order_id = payment.get("order_id", "")
            txn = await transactions_col.find_one({"gatewayOrderId": rz_order_id})
            if txn and txn.get("paymentStatus") == "pending":
                await payment_service._mark_failed(txn["_id"], {
                    "event":  event,
                    "error":  payment.get("error_description", ""),
                    "code":   payment.get("error_code", ""),
                })
                logger.info(f"Webhook: txn {txn['_id']} marked failed")

    except Exception as exc:
        logger.error(f"Razorpay webhook processing error: {exc}", exc_info=True)
        # Return 200 so Razorpay doesn't keep retrying for non-signature errors
        return {"status": "ok", "note": "processing_error_logged"}

    return {"status": "ok"}
