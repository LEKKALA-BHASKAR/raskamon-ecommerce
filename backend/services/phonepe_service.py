"""
PhonePe Standard Checkout service — redirect flow.

Flow:
  1. POST /payments/initiate  → build payload, get redirect URL from PhonePe
  2. Redirect user to PhonePe payment page
  3. PhonePe redirects back to FRONTEND_URL/payment/callback?gateway=phonepe&txnId=...
  4. Frontend calls POST /payments/phonepe/verify
  5. Webhook at POST /payments/webhook/phonepe

Docs: https://developer.phonepe.com/v1/docs/pay-api/
"""
import base64
import hashlib
import json
import os
import httpx
from typing import Tuple

PHONEPE_MERCHANT_ID  = os.environ.get("PHONEPE_MERCHANT_ID", "")
PHONEPE_SALT_KEY     = os.environ.get("PHONEPE_SALT_KEY", "")
PHONEPE_SALT_INDEX   = os.environ.get("PHONEPE_SALT_INDEX", "1")
PHONEPE_ENV          = os.environ.get("PHONEPE_ENV", "sandbox")   # "sandbox" | "production"

_BASE_URLS = {
    "sandbox":    "https://api-preprod.phonepe.com/apis/pg-sandbox",
    "production": "https://api.phonepe.com/apis/hermes",
}

PAY_ENDPOINT    = "/pg/v1/pay"
STATUS_ENDPOINT = "/pg/v1/status/{merchant_id}/{merchant_txn_id}"


def _base_url() -> str:
    return _BASE_URLS.get(PHONEPE_ENV, _BASE_URLS["sandbox"])


def _build_checksum(b64_payload: str, endpoint: str) -> str:
    """SHA256(base64Payload + endpoint + saltKey) + '###' + saltIndex"""
    raw = b64_payload + endpoint + PHONEPE_SALT_KEY
    sha = hashlib.sha256(raw.encode()).hexdigest()
    return f"{sha}###{PHONEPE_SALT_INDEX}"


def initiate_payment(
    *,
    merchant_transaction_id: str,
    amount_inr: float,
    user_id: str,
    mobile_number: str = "",
    redirect_url: str,
    callback_url: str,
) -> Tuple[str, dict]:
    """
    Create a PhonePe payment session.
    Returns (redirect_url_for_user, raw_response_dict).
    """
    if not PHONEPE_MERCHANT_ID or not PHONEPE_SALT_KEY:
        raise RuntimeError("PhonePe credentials not configured")

    amount_paise = int(round(amount_inr * 100))

    payload = {
        "merchantId": PHONEPE_MERCHANT_ID,
        "merchantTransactionId": merchant_transaction_id,
        "merchantUserId": user_id,
        "amount": amount_paise,
        "redirectUrl": redirect_url,
        "redirectMode": "REDIRECT",
        "callbackUrl": callback_url,
        "paymentInstrument": {"type": "PAY_PAGE"},
    }
    if mobile_number:
        payload["mobileNumber"] = mobile_number

    b64 = base64.b64encode(json.dumps(payload).encode()).decode()
    checksum = _build_checksum(b64, PAY_ENDPOINT)

    headers = {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
    }
    body = {"request": b64}

    resp = httpx.post(
        _base_url() + PAY_ENDPOINT,
        json=body,
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    instrument_response = (
        data.get("data", {})
            .get("instrumentResponse", {})
            .get("redirectInfo", {})
    )
    pay_url = instrument_response.get("url", "")
    return pay_url, data


def check_status(merchant_transaction_id: str) -> dict:
    """
    Poll PhonePe for the current payment status.
    Use this for verification (webhook may be delayed).
    """
    if not PHONEPE_MERCHANT_ID or not PHONEPE_SALT_KEY:
        raise RuntimeError("PhonePe credentials not configured")

    endpoint = STATUS_ENDPOINT.format(
        merchant_id=PHONEPE_MERCHANT_ID,
        merchant_txn_id=merchant_transaction_id,
    )
    checksum = _build_checksum("", endpoint)

    headers = {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
    }
    resp = httpx.get(
        _base_url() + endpoint,
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def is_payment_successful(status_response: dict) -> bool:
    """Parse PhonePe status response to a bool."""
    return (
        status_response.get("success") is True
        and status_response.get("code") == "PAYMENT_SUCCESS"
    )


def verify_webhook_checksum(x_verify: str, payload_b64: str) -> bool:
    """Verify PhonePe webhook X-VERIFY header."""
    try:
        sig, idx = x_verify.rsplit("###", 1)
        expected = hashlib.sha256(
            (payload_b64 + PHONEPE_SALT_KEY).encode()
        ).hexdigest()
        return sig == expected
    except Exception:
        return False
