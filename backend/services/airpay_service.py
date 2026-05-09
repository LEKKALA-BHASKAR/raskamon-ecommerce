"""
Airpay service — form-POST redirect flow.

Flow:
  1. POST /payments/initiate  → backend builds signed form fields
  2. Frontend renders hidden form and auto-submits to Airpay
  3. Airpay redirects back to FRONTEND_URL/payment/callback?gateway=airpay
  4. Frontend sends POST params to POST /payments/airpay/verify
  5. Webhook at POST /payments/webhook/airpay (Airpay calls our server)

Docs: https://airpay.co.in/developer-docs
"""
import base64
import hashlib
import hmac
import os
from typing import Dict

AIRPAY_MERCHANT_ID = os.environ.get("AIRPAY_MERCHANT_ID", "")
AIRPAY_SECRET_KEY  = os.environ.get("AIRPAY_SECRET_KEY", "")
AIRPAY_USERNAME    = os.environ.get("AIRPAY_USERNAME", "")
AIRPAY_PASSWORD    = os.environ.get("AIRPAY_PASSWORD", "")
AIRPAY_ENV         = os.environ.get("AIRPAY_ENV", "sandbox")  # "sandbox" | "production"

_ENDPOINTS = {
    "sandbox":    "https://uat.airpay.co.in/pay/index",
    "production": "https://payments.airpay.co.in/pay/index",
}


def _endpoint() -> str:
    return _ENDPOINTS.get(AIRPAY_ENV, _ENDPOINTS["sandbox"])


def _fetchtoken() -> str:
    """Base64(username:password) — Airpay basic auth token."""
    raw = f"{AIRPAY_USERNAME}:{AIRPAY_PASSWORD}"
    return base64.b64encode(raw.encode()).decode()


def _compute_checksum(
    email: str,
    phone: str,
    name: str,
    amount: str,
    order_id: str,
    currency: str,
) -> str:
    """
    SHA512(privateKey + email + phone + name + amount + orderId + currency)
    as per Airpay docs.
    """
    raw = (
        AIRPAY_SECRET_KEY
        + email
        + phone
        + name
        + amount
        + order_id
        + currency
    )
    return hashlib.sha512(raw.encode("utf-8")).hexdigest()


def build_form_fields(
    *,
    order_id: str,
    amount_inr: float,
    buyer_email: str,
    buyer_phone: str,
    buyer_name: str,
    success_url: str,
    failure_url: str,
) -> Dict[str, str]:
    """
    Build all form fields required for Airpay's hosted checkout.
    Frontend renders these in a hidden form and auto-submits.
    """
    if not AIRPAY_MERCHANT_ID or not AIRPAY_SECRET_KEY:
        raise RuntimeError("Airpay credentials not configured")

    amount_str = f"{amount_inr:.2f}"
    currency   = "356"          # ISO 4217 numeric for INR

    checksum = _compute_checksum(
        buyer_email, buyer_phone, buyer_name,
        amount_str, order_id, currency,
    )

    return {
        "merchantid":   AIRPAY_MERCHANT_ID,
        "orderid":      order_id,
        "currency":     currency,
        "isocurrency":  "INR",
        "amount":       amount_str,
        "buyeremail":   buyer_email,
        "buyerphone":   buyer_phone,
        "buyername":    buyer_name,
        "fetchtoken":   _fetchtoken(),
        "checksum":     checksum,
        "successurl":   success_url,
        "failurl":      failure_url,
        "cancelurl":    failure_url,
    }


def verify_response_checksum(params: Dict[str, str]) -> bool:
    """
    Verify the SHA512 checksum Airpay sends back in the redirect / webhook.
    Airpay sends:  checksum = SHA512(secret + transactionid + status)
    """
    received = params.get("checksum", "")
    txn_id   = params.get("transactionid", "")
    status   = params.get("status", "")
    raw      = AIRPAY_SECRET_KEY + txn_id + status
    expected = hashlib.sha512(raw.encode("utf-8")).hexdigest()
    return hmac.compare_digest(expected, received)


def is_payment_successful(params: Dict[str, str]) -> bool:
    return params.get("status", "").lower() in ("success", "200", "0")


def get_form_action() -> str:
    return _endpoint()
