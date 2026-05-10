"""
Payment orchestration service.

All gateway calls and DB writes live here.
Controllers (routers/payments.py) stay thin — they only parse HTTP, call these
functions, and return the result.
"""
import uuid
import os
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from database import orders_col, transactions_col
from models.payment import new_transaction
from utils.helpers import now, serialize_doc
from services import razorpay_service

logger = logging.getLogger(__name__)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
BACKEND_URL  = os.environ.get("BACKEND_URL",  "http://localhost:8000").rstrip("/")


# ── Internal helpers ───────────────────────────────────────────────────────

def _make_txn_id() -> str:
    return "TXN-" + uuid.uuid4().hex.upper()[:20]


async def _get_order(order_id: str, user_id: str) -> dict:
    order = await orders_col.find_one({"_id": order_id, "user": user_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


async def _insert_transaction(doc: dict) -> None:
    try:
        await transactions_col.insert_one(doc)
    except Exception as e:
        # Duplicate key means we already have this txn — fine
        if "duplicate" not in str(e).lower():
            raise


async def _mark_success(
    transaction_id: str,
    order_id: str,
    gateway_txn_id: str,
    gateway_response: dict,
) -> None:
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
    # Update order only if not already paid (idempotent)
    order = await orders_col.find_one({"_id": order_id})
    if order and order.get("paymentStatus") != "paid":
        timeline = order.get("timeline", [])
        timeline.append({
            "status": "confirmed",
            "timestamp": ts.isoformat(),
            "note": "Payment verified and captured",
        })
        await orders_col.update_one(
            {"_id": order_id},
            {"$set": {
                "paymentStatus": "paid",
                "orderStatus": "confirmed",
                "razorpayPaymentId": gateway_txn_id,
                "timeline": timeline,
                "updatedAt": ts,
            }},
        )
        # Trigger cashback and referral rewards
        user_id = order.get("user", "")
        try:
            from services.cashback_service import credit_order_cashback
            await credit_order_cashback(order_id, user_id)
        except Exception as _ce:
            logger.error(f"Cashback credit failed for order {order_id}: {_ce}")
        try:
            from services.referral_service import process_referral_reward
            fresh_order = await orders_col.find_one({"_id": order_id})
            if fresh_order:
                await process_referral_reward(fresh_order)
        except Exception as _re:
            logger.error(f"Referral reward failed for order {order_id}: {_re}")


async def _mark_failed(transaction_id: str, reason: dict) -> None:
    await transactions_col.update_one(
        {"_id": transaction_id},
        {"$set": {
            "paymentStatus": "failed",
            "gatewayResponse": reason,
            "updatedAt": now(),
        }},
    )


# ── Razorpay initiate ──────────────────────────────────────────────────────

async def initiate_razorpay(
    *,
    order_id: str,
    user_id: str,
    ip_address: str = "",
    user_agent: str = "",
) -> dict:
    """
    Create a Razorpay order and a pending transaction record.
    Returns all data the frontend needs to open the Razorpay modal.
    """
    order = await _get_order(order_id, user_id)
    amount = float(order["totalAmount"])
    txn_id = _make_txn_id()

    # Create Razorpay order via API
    try:
        rz_order = razorpay_service.create_order(
            amount_inr=amount,
            receipt=order.get("invoiceId", txn_id)[:40],
            internal_order_id=order_id,
        )
    except Exception as e:
        logger.error(f"Razorpay create_order failed: {e}")
        raise HTTPException(status_code=502, detail=f"Payment gateway error: {str(e)}")

    # Persist transaction record
    doc = new_transaction(
        transaction_id=txn_id,
        user_id=user_id,
        order_id=order_id,
        gateway_name="razorpay",
        amount=amount,
        gateway_order_id=rz_order["id"],
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await _insert_transaction(doc)

    # Cache razorpay order id on the order itself
    await orders_col.update_one(
        {"_id": order_id},
        {"$set": {"razorpayOrderId": rz_order["id"], "updatedAt": now()}},
    )

    return {
        "transaction_id": txn_id,
        "gateway": "razorpay",
        "razorpay_order_id": rz_order["id"],
        "key_id": os.environ.get("RAZORPAY_KEY_ID", ""),
        "amount": int(round(amount * 100)),    # paise
        "currency": "INR",
    }


# ── Razorpay verify ────────────────────────────────────────────────────────

async def verify_razorpay(
    *,
    transaction_id: str,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    user_id: str,
) -> dict:
    """
    Server-side HMAC-SHA256 verification of the Razorpay payment.
    Idempotent — calling twice returns success without re-processing.
    """
    txn = await transactions_col.find_one({"_id": transaction_id, "userId": user_id})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Idempotency guard
    if txn["paymentStatus"] == "success":
        return {"message": "Payment already verified", "order_id": txn["orderId"]}

    if txn["paymentStatus"] == "failed":
        raise HTTPException(status_code=400, detail="This transaction was marked failed. Please initiate a new payment.")

    # Signature check
    ok = razorpay_service.verify_payment_signature(
        razorpay_order_id, razorpay_payment_id, razorpay_signature
    )
    if not ok:
        await _mark_failed(transaction_id, {"reason": "signature_mismatch", "razorpay_order_id": razorpay_order_id})
        raise HTTPException(status_code=400, detail="Payment signature verification failed")

    gateway_response = {
        "razorpay_order_id":   razorpay_order_id,
        "razorpay_payment_id": razorpay_payment_id,
        "razorpay_signature":  razorpay_signature,
    }
    await _mark_success(transaction_id, txn["orderId"], razorpay_payment_id, gateway_response)
    logger.info(f"Payment verified: txn={transaction_id} order={txn['orderId']} pay={razorpay_payment_id}")

    return {"message": "Payment verified successfully", "order_id": txn["orderId"]}


# ── Transaction reads ──────────────────────────────────────────────────────

async def get_transaction(transaction_id: str, user_id: str) -> dict:
    txn = await transactions_col.find_one({"_id": transaction_id, "userId": user_id})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return serialize_doc(txn)


async def list_user_transactions(user_id: str) -> list:
    cursor = transactions_col.find({"userId": user_id}).sort("createdAt", -1).limit(50)
    return [serialize_doc(t) async for t in cursor]


# ── Admin reads ────────────────────────────────────────────────────────────

async def admin_list_transactions(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    gateway: Optional[str] = None,
    search: Optional[str] = None,
) -> dict:
    """Return paginated transactions with optional filters for admin panel."""
    q: dict = {}
    if status:
        q["paymentStatus"] = status
    if gateway:
        q["gatewayName"] = gateway
    if search:
        # search by orderId, userId, or gatewayTransactionId prefix
        q["$or"] = [
            {"orderId": {"$regex": search, "$options": "i"}},
            {"userId": {"$regex": search, "$options": "i"}},
            {"gatewayTransactionId": {"$regex": search, "$options": "i"}},
            {"_id": {"$regex": search, "$options": "i"}},
        ]

    total = await transactions_col.count_documents(q)
    skip  = (page - 1) * limit
    cursor = transactions_col.find(q).sort("createdAt", -1).skip(skip).limit(limit)
    items  = [serialize_doc(t) async for t in cursor]

    # Enrich with order + user data
    for item in items:
        order = await orders_col.find_one({"_id": item.get("orderId", "")})
        if order:
            item["orderInvoiceId"]    = order.get("invoiceId", "")
            item["userName"]          = order.get("userName", "")
            item["userEmail"]         = order.get("userEmail", "")
            item["orderStatus"]       = order.get("orderStatus", "")
            item["shippingAddress"]   = order.get("shippingAddress", {})

    return {"items": items, "total": total, "page": page, "pages": max(1, -(-total // limit))}
