"""
Razorpay service — popup/modal flow.

Flow:
  1. POST /api/payments/initiate  → creates Razorpay order, returns key + order id
  2. Frontend loads Razorpay checkout.js and opens the popup
  3. On success frontend POSTs to /api/payments/razorpay/verify
  4. Backend verifies HMAC-SHA256 signature and marks order paid
  5. Webhook at POST /api/payments/webhook/razorpay handles async events

Credentials are read fresh per call so .env changes don't need a restart.
"""
import hmac
import hashlib
import os
import razorpay


def _key_id() -> str:
    return os.environ.get("RAZORPAY_KEY_ID", "")


def _key_secret() -> str:
    return os.environ.get("RAZORPAY_KEY_SECRET", "")


def _webhook_secret() -> str:
    return os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")


def _client() -> razorpay.Client:
    kid, ksec = _key_id(), _key_secret()
    if not kid or not ksec:
        raise RuntimeError("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set in environment")
    return razorpay.Client(auth=(kid, ksec))


def create_order(amount_inr: float, receipt: str, internal_order_id: str) -> dict:
    """
    Create a Razorpay order.
    amount_inr  — total amount in rupees (will be converted to paise)
    receipt     — short string (≤ 40 chars) stored in Razorpay for reference
    Returns the full Razorpay order dict (includes 'id', 'amount', 'status').
    """
    client = _client()
    amount_paise = int(round(amount_inr * 100))
    return client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt[:40],
        "payment_capture": 1,
        "notes": {"internal_order_id": internal_order_id},
    })


def verify_payment_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> bool:
    """
    HMAC-SHA256 server-side signature check.
    Razorpay signs the string  "{order_id}|{payment_id}"  with the key secret.
    This MUST run server-side — never accept the client's word for payment success.
    """
    raw = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
    expected = hmac.new(_key_secret().encode(), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, razorpay_signature)


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Verify the X-Razorpay-Signature header on incoming webhooks.
    Returns True when RAZORPAY_WEBHOOK_SECRET is not set (safe for dev mode).
    """
    ws = _webhook_secret()
    if not ws:
        return True
    expected = hmac.new(ws.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def fetch_payment(razorpay_payment_id: str) -> dict:
    """Fetch live payment details from Razorpay API (used for idempotent re-verify)."""
    return _client().payment.fetch(razorpay_payment_id)
