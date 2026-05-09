"""
Payment domain models — Pydantic schemas + MongoDB document shape.

Collection: transactions
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal, Any
from datetime import datetime


# ── Enums ──────────────────────────────────────────────────────────────────

GatewayName = Literal["razorpay", "phonepe", "airpay"]
PaymentStatus = Literal["pending", "success", "failed", "refunded"]


# ── MongoDB document (what we store) ───────────────────────────────────────

def new_transaction(
    *,
    transaction_id: str,
    user_id: str,
    order_id: str,
    gateway_name: GatewayName,
    amount: float,
    currency: str = "INR",
    gateway_order_id: str = "",
    ip_address: str = "",
    user_agent: str = "",
) -> dict:
    """Build a fresh transaction document for insertion."""
    now = datetime.utcnow()
    return {
        "_id": transaction_id,
        "userId": user_id,
        "orderId": order_id,
        "gatewayName": gateway_name,
        "transactionId": transaction_id,   # our internal ID
        "gatewayTransactionId": "",        # filled after gateway responds
        "gatewayOrderId": gateway_order_id,
        "amount": amount,
        "currency": currency,
        "paymentStatus": "pending",
        "gatewayResponse": {},
        "retryCount": 0,
        "ipAddress": ip_address,
        "userAgent": user_agent,
        "createdAt": now,
        "updatedAt": now,
    }


# ── Request / Response schemas ─────────────────────────────────────────────

class InitiatePaymentIn(BaseModel):
    order_id: str
    gateway: GatewayName
    # PhonePe redirect needs caller to tell us where to send the user back
    redirect_url: Optional[str] = None


class InitiatePaymentOut(BaseModel):
    transaction_id: str
    gateway: GatewayName
    # Razorpay — popup mode
    razorpay_order_id: Optional[str] = None
    key_id: Optional[str] = None
    amount: Optional[int] = None          # paise
    currency: Optional[str] = None
    # PhonePe / Airpay — redirect mode
    redirect_url: Optional[str] = None
    # Airpay — form POST mode
    form_action: Optional[str] = None
    form_fields: Optional[dict] = None


class VerifyRazorpayIn(BaseModel):
    transaction_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifyPhonePeIn(BaseModel):
    transaction_id: str
    merchant_transaction_id: str          # same as our transaction_id


class VerifyAirpayIn(BaseModel):
    transaction_id: str
    airpay_transaction_id: str
    order_id: str
    status: str                           # "success" / "failure"
    checksum: str


class TransactionOut(BaseModel):
    transaction_id: str
    order_id: str
    gateway: str
    amount: float
    currency: str
    status: str
    created_at: str
