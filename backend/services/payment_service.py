"""
Payment orchestration layer.
All gateway calls and DB writes go through here — controllers stay thin.
"""
import uuid
import os
import logging
from datetime import datetime, timezone
from typing import Optional

from database import orders_col, transactions_col
from models.payment import new_transaction
from utils.helpers import now, serialize_doc
from services import razorpay_service, phonepe_service, airpay_service

logger = logging.getLogger(__name__)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
BACKEND_URL  = os.environ.get("BACKEND_URL",  "http://localhost:8000").rstrip("/")


# ── Internal helpers ───────────────────────────────────────────────────────

def _make_txn_id() -> str:
    return "TXN-" + uuid.uuid4().hex.upper()[:20]


async def _get_order_or_raise(order_id: str, user_id: str) -> dict:
    order = await orders_col.find_one({"_id": order_id, "user": user_id})
    if not order:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Order not found")
    return order


async def _create_txn_doc(
    *,
    transaction_id: str,
    user_id: str,
    order_id: str,
    gateway: str,
    amount: float,
    gateway_order_id: str = "",
    ip_address: str = "",
    user_agent: str = "",
) -> dict:
    doc = new_transaction(
        transaction_id=transaction_id,
        user_id=user_id,
        order_id=order_id,
        gateway_name=gateway,
        amount=amount,
        gateway_order_id=gateway_order_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await transactions_col.insert_one(doc)
    return doc


async def _mark_success(transaction_id: str, order_id: str, gateway_txn_id: str, gateway_response: dict):
    ts = now()
    await transactions_col.update_one(
        {"_id": transaction_id},
        {"$set": {
            "paymentStatus": "success",
            "gatewayTransactionId": gateway_txn_id,
            "gatewayResponse": gateway_response,
            "updatedAt": ts,
        }},
    )
    # Update order — idempotent via $set only if not already paid
    order = await orders_col.find_one({"_id": order_id})
    if order and order.get("paymentStatus") != "paid":
        timeline = order.get("timeline", [])
        timeline.append({
            "status": "confirmed",
            "timestamp": ts.isoformat(),
            "note": "Payment verified",
        })
        await orders_col.update_one(
            {"_id": order_id},
            {"$set": {
                "paymentStatus": "paid",
                "orderStatus": "confirmed",
                "timeline": timeline,
                "updatedAt": ts,
            }},
        )


async def _mark_failed(transaction_id: str, gateway_response: dict):
    await transactions_col.update_one(
        {"_id": transaction_id},
        {"$set": {
            "paymentStatus": "failed",
            "gatewayResponse": gateway_response,
            "updatedAt": now(),
        }},
    )


# ── Initiate ───────────────────────────────────────────────────────────────

async def initiate(
    *,
    order_id: str,
    user_id: str,
    gateway: str,
    redirect_url: Optional[str],
    ip_address: str = "",
    user_agent: str = "",
) -> dict:
    order = await _get_order_or_raise(order_id, user_id)
    amount = float(order["totalAmount"])
    txn_id = _make_txn_id()

    if gateway == "razorpay":
        rz_order = razorpay_service.create_order(
            amount_inr=amount,
            receipt=order.get("invoiceId", txn_id)[:40],
            internal_order_id=order_id,
        )
        await _create_txn_doc(
            transaction_id=txn_id,
            user_id=user_id,
            order_id=order_id,
            gateway="razorpay",
            amount=amount,
            gateway_order_id=rz_order["id"],
        )
        await orders_col.update_one(
            {"_id": order_id},
            {"$set": {"razorpayOrderId": rz_order["id"], "updatedAt": now()}},
        )
        return {
            "transaction_id": txn_id,
            "gateway": "razorpay",
            "razorpay_order_id": rz_order["id"],
            "key_id": razorpay_service.RZ_KEY_ID,
            "amount": int(round(amount * 100)),
            "currency": "INR",
        }

    if gateway == "phonepe":
        cb_redirect = (
            redirect_url
            or f"{FRONTEND_URL}/payment/callback?gateway=phonepe&txnId={txn_id}"
        )
        webhook_cb = f"{BACKEND_URL}/api/payments/webhook/phonepe"
        pay_url, raw = phonepe_service.initiate_payment(
            merchant_transaction_id=txn_id,
            amount_inr=amount,
            user_id=user_id,
            mobile_number=order.get("shippingAddress", {}).get("phone", ""),
            redirect_url=cb_redirect,
            callback_url=webhook_cb,
        )
        await _create_txn_doc(
            transaction_id=txn_id,
            user_id=user_id,
            order_id=order_id,
            gateway="phonepe",
            amount=amount,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return {
            "transaction_id": txn_id,
            "gateway": "phonepe",
            "redirect_url": pay_url,
        }

    if gateway == "airpay":
        shipping = order.get("shippingAddress", {})
        success_url = f"{FRONTEND_URL}/payment/callback?gateway=airpay&txnId={txn_id}&status=success"
        failure_url = f"{FRONTEND_URL}/payment/callback?gateway=airpay&txnId={txn_id}&status=failure"
        form_fields = airpay_service.build_form_fields(
            order_id=txn_id,
            amount_inr=amount,
            buyer_email=order.get("userEmail", "buyer@example.com"),
            buyer_phone=shipping.get("phone", "9999999999"),
            buyer_name=shipping.get("name", "Customer"),
            success_url=success_url,
            failure_url=failure_url,
        )
        await _create_txn_doc(
            transaction_id=txn_id,
            user_id=user_id,
            order_id=order_id,
            gateway="airpay",
            amount=amount,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return {
            "transaction_id": txn_id,
            "gateway": "airpay",
            "form_action": airpay_service.get_form_action(),
            "form_fields": form_fields,
        }

    from fastapi import HTTPException
    raise HTTPException(status_code=400, detail=f"Unsupported gateway: {gateway}")


# ── Verify ─────────────────────────────────────────────────────────────────

async def verify_razorpay(
    *,
    transaction_id: str,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    user_id: str,
) -> dict:
    txn = await transactions_col.find_one({"_id": transaction_id, "userId": user_id})
    if not txn:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Transaction not found")

    if txn["paymentStatus"] == "success":
        return {"message": "Already verified", "order_id": txn["orderId"]}

    ok = razorpay_service.verify_payment_signature(
        razorpay_order_id, razorpay_payment_id, razorpay_signature
    )
    if not ok:
        await _mark_failed(transaction_id, {"reason": "signature_mismatch"})
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    gateway_response = {
        "razorpay_order_id": razorpay_order_id,
        "razorpay_payment_id": razorpay_payment_id,
        "razorpay_signature": razorpay_signature,
    }
    await _mark_success(transaction_id, txn["orderId"], razorpay_payment_id, gateway_response)
    return {"message": "Payment verified", "order_id": txn["orderId"]}


async def verify_phonepe(*, transaction_id: str, user_id: str) -> dict:
    txn = await transactions_col.find_one({"_id": transaction_id, "userId": user_id})
    if not txn:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Transaction not found")

    if txn["paymentStatus"] == "success":
        return {"message": "Already verified", "order_id": txn["orderId"]}

    status = phonepe_service.check_status(transaction_id)
    if phonepe_service.is_payment_successful(status):
        gateway_txn_id = (
            status.get("data", {})
                  .get("transactionId", transaction_id)
        )
        await _mark_success(transaction_id, txn["orderId"], gateway_txn_id, status)
        return {"message": "Payment verified", "order_id": txn["orderId"]}
    else:
        await _mark_failed(transaction_id, status)
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Payment not successful")


async def verify_airpay(*, transaction_id: str, params: dict, user_id: str) -> dict:
    txn = await transactions_col.find_one({"_id": transaction_id, "userId": user_id})
    if not txn:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Transaction not found")

    if txn["paymentStatus"] == "success":
        return {"message": "Already verified", "order_id": txn["orderId"]}

    if not airpay_service.verify_response_checksum(params):
        await _mark_failed(transaction_id, {"reason": "checksum_mismatch", "params": params})
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid Airpay checksum")

    if airpay_service.is_payment_successful(params):
        await _mark_success(
            transaction_id,
            txn["orderId"],
            params.get("transactionid", ""),
            params,
        )
        return {"message": "Payment verified", "order_id": txn["orderId"]}
    else:
        await _mark_failed(transaction_id, params)
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Payment failed")


# ── Transaction fetch ──────────────────────────────────────────────────────

async def get_transaction(transaction_id: str, user_id: str) -> dict:
    txn = await transactions_col.find_one({"_id": transaction_id, "userId": user_id})
    if not txn:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Transaction not found")
    return serialize_doc(txn)


async def list_user_transactions(user_id: str) -> list:
    cursor = transactions_col.find({"userId": user_id}).sort("createdAt", -1).limit(50)
    return [serialize_doc(t) async for t in cursor]
