"""
Enhanced Authentication Router
Google OAuth · Mobile OTP Login · 2FA (TOTP) · CAPTCHA · Sessions · Login History
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request, Header
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import uuid
import os
import secrets
import logging
import hashlib

from database import users_col, login_history_col, device_sessions_col, otp_requests_col
from utils.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    get_current_user, generate_otp
)
from utils.audit import get_audit_logger
from middleware.rbac import rate_limit

logger = logging.getLogger(__name__)
router = APIRouter()


# ════════════════════════════════════════════════════════════════════════
#  HELPERS
# ════════════════════════════════════════════════════════════════════════

def _parse_ua(ua: str = "") -> dict:
    """Extract rough device info from User-Agent string"""
    ua = ua or ""
    ua_lower = ua.lower()
    browser = "Unknown"
    os_name = "Unknown"
    device_type = "Desktop"

    # Browser detection
    if "edg/" in ua_lower or "edge/" in ua_lower:
        browser = "Edge"
    elif "opr/" in ua_lower or "opera" in ua_lower:
        browser = "Opera"
    elif "chrome" in ua_lower and "safari" in ua_lower:
        browser = "Chrome"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "safari" in ua_lower:
        browser = "Safari"

    # OS detection
    if "windows" in ua_lower:
        os_name = "Windows"
    elif "macintosh" in ua_lower or "mac os" in ua_lower:
        os_name = "macOS"
    elif "linux" in ua_lower:
        os_name = "Linux"
    elif "android" in ua_lower:
        os_name = "Android"
        device_type = "Mobile"
    elif "iphone" in ua_lower or "ipad" in ua_lower:
        os_name = "iOS"
        device_type = "Mobile"

    return {"browser": browser, "os": os_name, "device_type": device_type, "raw": ua[:200]}


def _device_fingerprint(ip: str, ua: str) -> str:
    """Create a rough device fingerprint from IP + UA"""
    return hashlib.sha256(f"{ip}:{ua}".encode()).hexdigest()[:24]


async def _record_login(user_id: str, email: str, method: str, ip: str, ua: str, success: bool, reason: str = ""):
    """Record a login attempt to login_history"""
    parsed = _parse_ua(ua)
    doc = {
        "id": f"lh_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "email": email,
        "method": method,  # email_password | mobile_otp | google_oauth
        "ip_address": ip,
        "user_agent": ua[:300],
        "browser": parsed["browser"],
        "os": parsed["os"],
        "device_type": parsed["device_type"],
        "success": success,
        "failure_reason": reason if not success else None,
        "created_at": datetime.utcnow(),
    }
    try:
        await login_history_col.insert_one(doc)
    except Exception as e:
        logger.error(f"Failed to record login history: {e}")


async def _create_device_session(user_id: str, ip: str, ua: str) -> str:
    """Create or update a device session, return session_token"""
    fp = _device_fingerprint(ip, ua)
    parsed = _parse_ua(ua)
    session_token = secrets.token_urlsafe(32)

    existing = await device_sessions_col.find_one({"user_id": user_id, "fingerprint": fp, "is_active": True})
    if existing:
        await device_sessions_col.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "last_active_at": datetime.utcnow(),
                "ip_address": ip,
                "session_token": session_token,
                "expires_at": datetime.utcnow() + timedelta(days=30),
            }}
        )
        return session_token

    doc = {
        "id": f"ds_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "session_token": session_token,
        "fingerprint": fp,
        "ip_address": ip,
        "user_agent": ua[:300],
        "browser": parsed["browser"],
        "os": parsed["os"],
        "device_type": parsed["device_type"],
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_active_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(days=30),
    }
    await device_sessions_col.insert_one(doc)
    return session_token


# ════════════════════════════════════════════════════════════════════════
#  REQUEST / RESPONSE MODELS
# ════════════════════════════════════════════════════════════════════════

class MobileOTPRequest(BaseModel):
    phone: str  # 10-digit Indian mobile

class MobileOTPVerify(BaseModel):
    phone: str
    otp: str

class GoogleOAuthRequest(BaseModel):
    token: str  # Google ID token from frontend

class Setup2FAResponse(BaseModel):
    secret: str
    qr_uri: str

class Verify2FARequest(BaseModel):
    code: str

class Login2FARequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: str

class CAPTCHAVerifyRequest(BaseModel):
    captcha_token: str


# ════════════════════════════════════════════════════════════════════════
#  1. MOBILE NUMBER LOGIN (OTP-based)
# ════════════════════════════════════════════════════════════════════════

@router.post('/mobile/send-otp')
@rate_limit(max_requests=5, window_seconds=60)
async def send_mobile_otp(data: MobileOTPRequest, request: Request):
    """Send OTP to mobile number for login / registration"""
    phone = data.phone.strip().replace(" ", "")
    if not phone.isdigit() or len(phone) != 10:
        raise HTTPException(400, detail="Invalid mobile number. Must be 10 digits.")

    # Generate OTP
    otp = generate_otp(6)

    # Store OTP with 5-min expiry
    await otp_requests_col.update_one(
        {"identifier": phone, "type": "mobile_login"},
        {"$set": {
            "otp": otp,
            "attempts": 0,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=5),
        }},
        upsert=True
    )

    # TODO: Integrate SMS gateway (MSG91, Twilio, etc.)
    logger.info(f"[DEV] Mobile OTP for {phone}: {otp}")

    return {
        "success": True,
        "message": "OTP sent to your mobile number",
        "dev_otp": otp if os.environ.get("DEV_MODE") == "1" else None
    }


@router.post('/mobile/verify-otp')
@rate_limit(max_requests=10, window_seconds=60)
async def verify_mobile_otp(data: MobileOTPVerify, request: Request, user_agent: Optional[str] = Header(None)):
    """Verify mobile OTP and login / auto-register"""
    phone = data.phone.strip().replace(" ", "")
    ip = request.client.host if request else "unknown"
    ua = user_agent or ""

    # Check OTP
    otp_doc = await otp_requests_col.find_one({"identifier": phone, "type": "mobile_login"})
    if not otp_doc:
        await _record_login("unknown", phone, "mobile_otp", ip, ua, False, "OTP not found")
        raise HTTPException(400, detail="No OTP found for this number. Request a new one.")

    if otp_doc.get("attempts", 0) >= 5:
        raise HTTPException(429, detail="Too many attempts. Request a new OTP.")

    if datetime.utcnow() > otp_doc.get("expires_at", datetime.utcnow()):
        raise HTTPException(400, detail="OTP has expired. Request a new one.")

    if otp_doc["otp"] != data.otp:
        await otp_requests_col.update_one({"_id": otp_doc["_id"]}, {"$inc": {"attempts": 1}})
        await _record_login("unknown", phone, "mobile_otp", ip, ua, False, "Invalid OTP")
        raise HTTPException(400, detail="Invalid OTP")

    # OTP valid — remove it
    await otp_requests_col.delete_one({"_id": otp_doc["_id"]})

    # Find or create user by phone
    user = await users_col.find_one({"phone": phone})

    if not user:
        # Auto-register a B2C customer
        user_id = f"usr_{uuid.uuid4().hex[:16]}"
        user = {
            "id": user_id,
            "_id": user_id,
            "email": None,
            "password": None,
            "name": f"User {phone[-4:]}",
            "phone": phone,
            "role": "B2C_CUSTOMER",
            "b2b_profile": None,
            "vendor_profile": None,
            "addresses": [],
            "wishlist": [],
            "refresh_tokens": [],
            "is_active": True,
            "is_verified": True,
            "phone_verified": True,
            "email_verified_at": None,
            "last_login_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await users_col.insert_one(user)
        logger.info(f"Auto-registered mobile user: {user_id}")

    _uid = user.get("id") or user.get("_id")
    _role = user.get("role") or "B2C_CUSTOMER"

    if not user.get("is_active", True) or user.get("isBlocked"):
        raise HTTPException(403, detail="Account is inactive or blocked")

    # Update phone verified
    await users_col.update_one(
        {"$or": [{"id": _uid}, {"_id": _uid}]},
        {"$set": {"phone_verified": True, "last_login_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
    )

    # Create tokens
    access_token = create_access_token({"sub": _uid, "user_id": _uid, "email": user.get("email"), "role": _role})
    refresh_token = create_refresh_token({"sub": _uid, "user_id": _uid})

    # Record login + device session
    await _record_login(_uid, phone, "mobile_otp", ip, ua, True)
    session_token = await _create_device_session(_uid, ip, ua)

    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "session_token": session_token,
            "token_type": "Bearer",
            "is_new_user": user.get("email") is None,
            "user": {
                "id": _uid,
                "email": user.get("email"),
                "name": user.get("name"),
                "phone": phone,
                "role": _role,
                "is_verified": True,
            }
        }
    }


# ════════════════════════════════════════════════════════════════════════
#  2. GOOGLE OAUTH LOGIN
# ════════════════════════════════════════════════════════════════════════

@router.post('/google')
@rate_limit(max_requests=20, window_seconds=60)
async def google_oauth_login(data: GoogleOAuthRequest, request: Request, user_agent: Optional[str] = Header(None)):
    """Authenticate with Google ID token"""
    import httpx

    ip = request.client.host if request else "unknown"
    ua = user_agent or ""

    # Verify token with Google
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={data.token}")
            if resp.status_code != 200:
                raise HTTPException(401, detail="Invalid Google token")
            google_data = resp.json()
    except httpx.HTTPError:
        raise HTTPException(401, detail="Failed to verify Google token")

    g_email = google_data.get("email", "").lower()
    g_name = google_data.get("name", "")
    g_picture = google_data.get("picture")
    g_sub = google_data.get("sub")  # Google user ID

    if not g_email:
        raise HTTPException(400, detail="Google account has no email")

    # Check GOOGLE_CLIENT_ID audience validation
    google_client_id = os.environ.get("GOOGLE_CLIENT_ID")
    if google_client_id and google_data.get("aud") != google_client_id:
        raise HTTPException(401, detail="Google token audience mismatch")

    # Find existing user or create new
    user = await users_col.find_one({"email": g_email})

    if not user:
        # Auto-create B2C account
        user_id = f"usr_{uuid.uuid4().hex[:16]}"
        user = {
            "id": user_id,
            "_id": user_id,
            "email": g_email,
            "password": None,  # OAuth user — no password
            "name": g_name,
            "phone": None,
            "avatar": g_picture,
            "role": "B2C_CUSTOMER",
            "google_id": g_sub,
            "b2b_profile": None,
            "vendor_profile": None,
            "addresses": [],
            "wishlist": [],
            "refresh_tokens": [],
            "is_active": True,
            "is_verified": True,
            "email_verified_at": datetime.utcnow(),
            "auth_provider": "google",
            "last_login_at": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await users_col.insert_one(user)
        logger.info(f"Google OAuth new user created: {g_email}")
    else:
        # Link Google ID if not present
        update = {"last_login_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
        if not user.get("google_id"):
            update["google_id"] = g_sub
        if not user.get("avatar") and g_picture:
            update["avatar"] = g_picture
        if not user.get("is_verified"):
            update["is_verified"] = True
            update["email_verified_at"] = datetime.utcnow()
        await users_col.update_one(
            {"email": g_email},
            {"$set": update}
        )

    _uid = user.get("id") or user.get("_id")
    _role = user.get("role") or "B2C_CUSTOMER"

    if not user.get("is_active", True) or user.get("isBlocked"):
        await _record_login(_uid, g_email, "google_oauth", ip, ua, False, "Account blocked")
        raise HTTPException(403, detail="Account is inactive or blocked")

    # Generate tokens
    access_token = create_access_token({
        "sub": _uid, "user_id": _uid, "email": g_email, "role": _role,
        "vendor_id": (user.get("vendor_profile") or {}).get("vendor_id") if _role == "VENDOR" else None,
    })
    refresh_token = create_refresh_token({"sub": _uid, "user_id": _uid})

    await _record_login(_uid, g_email, "google_oauth", ip, ua, True)
    session_token = await _create_device_session(_uid, ip, ua)

    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "session_token": session_token,
            "token_type": "Bearer",
            "user": {
                "id": _uid,
                "email": g_email,
                "name": user.get("name") or g_name,
                "phone": user.get("phone"),
                "role": _role,
                "avatar": user.get("avatar") or g_picture,
                "is_verified": True,
            }
        }
    }


# ════════════════════════════════════════════════════════════════════════
#  3. TWO-FACTOR AUTHENTICATION (TOTP)
# ════════════════════════════════════════════════════════════════════════

@router.post('/2fa/setup')
async def setup_2fa(current_user=Depends(get_current_user)):
    """Generate TOTP secret + QR provisioning URI for user to scan"""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(500, detail="2FA module not installed (pyotp)")

    if current_user.get("totp_secret"):
        raise HTTPException(400, detail="2FA is already enabled. Disable it first to re-setup.")

    secret = pyotp.random_base32()
    user_email = current_user.get("email") or "user"
    qr_uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user_email, issuer_name="Dr MediScie")

    # Store secret but mark as NOT yet verified
    _uid = current_user.get("id") or current_user.get("_id")
    await users_col.update_one(
        {"$or": [{"id": _uid}, {"_id": _uid}]},
        {"$set": {"totp_secret_pending": secret, "updated_at": datetime.utcnow()}}
    )

    return {"success": True, "data": {"secret": secret, "qr_uri": qr_uri}}


@router.post('/2fa/verify-setup')
async def verify_2fa_setup(data: Verify2FARequest, current_user=Depends(get_current_user)):
    """Verify TOTP code to confirm 2FA setup"""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(500, detail="2FA module not installed")

    pending_secret = current_user.get("totp_secret_pending")
    if not pending_secret:
        raise HTTPException(400, detail="No pending 2FA setup found. Call /2fa/setup first.")

    totp = pyotp.TOTP(pending_secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(400, detail="Invalid TOTP code. Please try again.")

    # Activate 2FA
    _uid = current_user.get("id") or current_user.get("_id")
    backup_codes = [secrets.token_hex(4) for _ in range(8)]

    await users_col.update_one(
        {"$or": [{"id": _uid}, {"_id": _uid}]},
        {"$set": {
            "totp_secret": pending_secret,
            "totp_enabled": True,
            "totp_backup_codes": backup_codes,
            "totp_enabled_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }, "$unset": {"totp_secret_pending": ""}}
    )

    audit_logger = get_audit_logger()
    await audit_logger.log_security_event(
        "2FA_ENABLED",
        f"2FA enabled for user {current_user.get('email')}",
        user_id=_uid,
        user_email=current_user.get("email"),
    )

    return {
        "success": True,
        "message": "2FA enabled successfully",
        "data": {"backup_codes": backup_codes}
    }


@router.post('/2fa/disable')
async def disable_2fa(data: Verify2FARequest, current_user=Depends(get_current_user)):
    """Disable 2FA — requires a valid TOTP code"""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(500, detail="2FA module not installed")

    secret = current_user.get("totp_secret")
    if not secret or not current_user.get("totp_enabled"):
        raise HTTPException(400, detail="2FA is not enabled")

    totp = pyotp.TOTP(secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(400, detail="Invalid TOTP code")

    _uid = current_user.get("id") or current_user.get("_id")
    await users_col.update_one(
        {"$or": [{"id": _uid}, {"_id": _uid}]},
        {"$unset": {"totp_secret": "", "totp_enabled": "", "totp_backup_codes": "", "totp_enabled_at": "", "totp_secret_pending": ""},
         "$set": {"updated_at": datetime.utcnow()}}
    )

    audit_logger = get_audit_logger()
    await audit_logger.log_security_event(
        "2FA_DISABLED",
        f"2FA disabled for user {current_user.get('email')}",
        user_id=_uid,
        user_email=current_user.get("email"),
    )

    return {"success": True, "message": "2FA has been disabled"}


@router.get('/2fa/status')
async def get_2fa_status(current_user=Depends(get_current_user)):
    """Check if 2FA is enabled for current user"""
    return {
        "success": True,
        "data": {
            "enabled": bool(current_user.get("totp_enabled")),
            "enabled_at": current_user.get("totp_enabled_at"),
        }
    }


@router.post('/login-2fa')
@rate_limit(max_requests=10, window_seconds=60)
async def login_with_2fa(data: Login2FARequest, request: Request, user_agent: Optional[str] = Header(None)):
    """Login with email + password + TOTP code (for users with 2FA enabled)"""
    try:
        import pyotp
    except ImportError:
        raise HTTPException(500, detail="2FA module not installed")

    ip = request.client.host if request else "unknown"
    ua = user_agent or ""

    user = await users_col.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user.get("password", "")):
        await _record_login("unknown", data.email, "email_password_2fa", ip, ua, False, "Invalid credentials")
        raise HTTPException(401, detail="Invalid email or password")

    if not user.get("totp_enabled") or not user.get("totp_secret"):
        raise HTTPException(400, detail="2FA is not enabled for this account")

    totp = pyotp.TOTP(user["totp_secret"])
    # Check TOTP code or backup codes
    code_valid = totp.verify(data.totp_code, valid_window=1)
    backup_used = False
    if not code_valid:
        # Check backup codes
        backup_codes = user.get("totp_backup_codes", [])
        if data.totp_code in backup_codes:
            code_valid = True
            backup_used = True
            # Remove used backup code
            backup_codes.remove(data.totp_code)
            await users_col.update_one(
                {"email": data.email.lower()},
                {"$set": {"totp_backup_codes": backup_codes}}
            )

    if not code_valid:
        await _record_login(user.get("id") or user.get("_id"), data.email, "email_password_2fa", ip, ua, False, "Invalid 2FA code")
        raise HTTPException(401, detail="Invalid 2FA code")

    _uid = user.get("id") or user.get("_id")
    _role = user.get("role") or "B2C_CUSTOMER"

    access_token = create_access_token({"sub": _uid, "user_id": _uid, "email": user["email"], "role": _role})
    refresh_token = create_refresh_token({"sub": _uid, "user_id": _uid})

    await users_col.update_one(
        {"email": data.email.lower()},
        {"$set": {"last_login_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
    )

    await _record_login(_uid, data.email, "email_password_2fa", ip, ua, True)
    session_token = await _create_device_session(_uid, ip, ua)

    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "session_token": session_token,
            "token_type": "Bearer",
            "backup_code_used": backup_used,
            "user": {
                "id": _uid,
                "email": user["email"],
                "name": user.get("name"),
                "phone": user.get("phone"),
                "role": _role,
                "is_verified": user.get("is_verified", False),
            }
        }
    }


# ════════════════════════════════════════════════════════════════════════
#  4. CAPTCHA VERIFICATION
# ════════════════════════════════════════════════════════════════════════

@router.post('/captcha/verify')
async def verify_captcha(data: CAPTCHAVerifyRequest, request: Request):
    """Verify reCAPTCHA v3 / hCaptcha / Turnstile token server-side"""
    import httpx

    captcha_secret = os.environ.get("CAPTCHA_SECRET_KEY")
    captcha_provider = os.environ.get("CAPTCHA_PROVIDER", "recaptcha")  # recaptcha | hcaptcha | turnstile

    if not captcha_secret:
        # If no CAPTCHA configured, pass-through (dev mode)
        return {"success": True, "message": "CAPTCHA not configured — passed", "score": 1.0}

    verify_url = {
        "recaptcha": "https://www.google.com/recaptcha/api/siteverify",
        "hcaptcha": "https://hcaptcha.com/siteverify",
        "turnstile": "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    }.get(captcha_provider, "https://www.google.com/recaptcha/api/siteverify")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(verify_url, data={
                "secret": captcha_secret,
                "response": data.captcha_token,
                "remoteip": request.client.host,
            })
            result = resp.json()
    except Exception as e:
        logger.error(f"CAPTCHA verification error: {e}")
        raise HTTPException(500, detail="CAPTCHA verification failed")

    passed = result.get("success", False)
    score = result.get("score", 0)  # reCAPTCHA v3 score (0.0 to 1.0)

    if not passed:
        raise HTTPException(400, detail="CAPTCHA verification failed. Please try again.")

    # For reCAPTCHA v3, also check score threshold
    threshold = float(os.environ.get("CAPTCHA_SCORE_THRESHOLD", "0.5"))
    if captcha_provider == "recaptcha" and score < threshold:
        raise HTTPException(400, detail="CAPTCHA score too low. Suspicious activity detected.")

    return {"success": True, "message": "CAPTCHA verified", "score": score}


# ════════════════════════════════════════════════════════════════════════
#  5. LOGIN HISTORY
# ════════════════════════════════════════════════════════════════════════

@router.get('/login-history')
async def get_login_history(page: int = 1, limit: int = 20, current_user=Depends(get_current_user)):
    """Get login history for current user"""
    _uid = current_user.get("id") or current_user.get("_id")
    skip = (page - 1) * limit

    total = await login_history_col.count_documents({"user_id": _uid})
    items = await login_history_col.find(
        {"user_id": _uid},
        {"_id": 0, "user_agent": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "success": True,
        "data": {
            "items": items,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit if total else 1
        }
    }


# ════════════════════════════════════════════════════════════════════════
#  6. DEVICE / SESSION MANAGEMENT
# ════════════════════════════════════════════════════════════════════════

@router.get('/sessions')
async def get_active_sessions(current_user=Depends(get_current_user)):
    """List all active sessions/devices for current user"""
    _uid = current_user.get("id") or current_user.get("_id")

    sessions = await device_sessions_col.find(
        {"user_id": _uid, "is_active": True, "expires_at": {"$gt": datetime.utcnow()}},
        {"_id": 0, "session_token": 0, "fingerprint": 0, "user_agent": 0}
    ).sort("last_active_at", -1).to_list(20)

    return {"success": True, "data": sessions}


@router.delete('/sessions/{session_id}')
async def revoke_session(session_id: str, current_user=Depends(get_current_user)):
    """Revoke a specific device session"""
    _uid = current_user.get("id") or current_user.get("_id")

    result = await device_sessions_col.update_one(
        {"id": session_id, "user_id": _uid},
        {"$set": {"is_active": False, "revoked_at": datetime.utcnow()}}
    )

    if result.modified_count == 0:
        raise HTTPException(404, detail="Session not found")

    audit_logger = get_audit_logger()
    await audit_logger.log_security_event(
        "SESSION_REVOKED",
        f"Session {session_id} revoked by user {current_user.get('email')}",
        user_id=_uid,
        user_email=current_user.get("email"),
    )

    return {"success": True, "message": "Session revoked"}


@router.post('/sessions/revoke-all')
async def revoke_all_sessions(current_user=Depends(get_current_user)):
    """Revoke all sessions except current"""
    _uid = current_user.get("id") or current_user.get("_id")

    result = await device_sessions_col.update_many(
        {"user_id": _uid, "is_active": True},
        {"$set": {"is_active": False, "revoked_at": datetime.utcnow()}}
    )

    audit_logger = get_audit_logger()
    await audit_logger.log_security_event(
        "ALL_SESSIONS_REVOKED",
        f"All {result.modified_count} sessions revoked by user {current_user.get('email')}",
        user_id=_uid,
        user_email=current_user.get("email"),
    )

    return {"success": True, "message": f"Revoked {result.modified_count} sessions"}


# ════════════════════════════════════════════════════════════════════════
#  7. ACCOUNT ACTIVITY TRACKING
# ════════════════════════════════════════════════════════════════════════

@router.get('/account-activity')
async def get_account_activity(page: int = 1, limit: int = 30, current_user=Depends(get_current_user)):
    """Get combined account activity — logins, security events, profile changes"""
    _uid = current_user.get("id") or current_user.get("_id")
    skip = (page - 1) * limit

    # Merge login history and audit log security events
    from database import audit_logs_col

    login_events = await login_history_col.find(
        {"user_id": _uid},
        {"_id": 0, "user_agent": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    # Format login events as activity items
    activities = []
    for ev in login_events:
        activities.append({
            "type": "login" if ev.get("success") else "login_failed",
            "title": f"{'Successful' if ev.get('success') else 'Failed'} login via {ev.get('method', 'email')}",
            "details": f"{ev.get('browser', '?')} on {ev.get('os', '?')} · {ev.get('ip_address', '?')}",
            "timestamp": ev.get("created_at"),
            "severity": "info" if ev.get("success") else "warning",
        })

    # Fetch security audit events for this user
    security_events = await audit_logs_col.find(
        {"user_id": _uid, "category": {"$in": ["SECURITY", "USER_ACTION"]}},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)

    for ev in security_events:
        activities.append({
            "type": ev.get("action", "").lower(),
            "title": ev.get("action", "").replace("_", " ").title(),
            "details": ev.get("description", ""),
            "timestamp": ev.get("timestamp"),
            "severity": ev.get("severity", "info").lower(),
        })

    # Sort combined by timestamp
    activities.sort(key=lambda a: a.get("timestamp") or datetime.min, reverse=True)

    return {
        "success": True,
        "data": {
            "items": activities[:limit],
            "total": len(activities),
        }
    }
