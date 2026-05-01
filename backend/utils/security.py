from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import secrets
import string

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
security = HTTPBearer(auto_error=False)

JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'sattva_secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_EXPIRE = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 60))
REFRESH_EXPIRE = int(os.environ.get('REFRESH_TOKEN_EXPIRE_DAYS', 7))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE)
    payload.update({'exp': expire, 'type': 'access'})
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRE)
    payload.update({'exp': expire, 'type': 'refresh'})
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail='Invalid or expired token')


def generate_otp(length: int = 6) -> str:
    """Generate cryptographically secure OTP"""
    return ''.join(secrets.choice(string.digits) for _ in range(length))


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail='Authentication required')
    token = credentials.credentials
    payload = decode_token(token)
    if payload.get('type') != 'access':
        raise HTTPException(status_code=401, detail='Invalid token type')
    from database import users_col

    # Support both token formats:
    #   * Legacy B2C:   { sub: <mongo _id / uuid>, email: ... }
    #   * Phase 1:      { user_id: <usr_...>, email: ..., role: ... }
    user = None
    phase1_id = payload.get('user_id')
    legacy_id = payload.get('sub')

    if phase1_id:
        user = await users_col.find_one({'id': phase1_id}, {'password': 0})
    if not user and legacy_id:
        user = await users_col.find_one({'_id': legacy_id}, {'password': 0})
        if not user:
            user = await users_col.find_one({'id': legacy_id}, {'password': 0})

    if not user:
        raise HTTPException(status_code=401, detail='User not found')

    # Normalize user shape so downstream RBAC / handlers work uniformly
    if 'id' not in user and '_id' in user:
        user['id'] = user['_id']

    # Derive status shortcuts expected by RBAC decorator
    if user.get('role') == 'B2B_BUYER':
        user['b2b_status'] = (user.get('b2b_profile') or {}).get('approval_status')
    if user.get('role') == 'VENDOR':
        user['vendor_status'] = (user.get('vendor_profile') or {}).get('approval_status')
        user['vendor_id'] = (user.get('vendor_profile') or {}).get('vendor_id')

    # Preserve original role string; RBAC decorator normalises case + legacy mapping
    if user.get('isBlocked'):
        raise HTTPException(status_code=403, detail='Account is blocked')
    if user.get('is_active') is False:
        raise HTTPException(status_code=403, detail='Account is inactive')

    return user


async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


async def require_admin(current_user=Depends(get_current_user)):
    if current_user.get('role') not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail='Admin access required')
    return current_user


async def require_staff(current_user=Depends(get_current_user)):
    if current_user.get('role') not in ['admin', 'manager', 'support']:
        raise HTTPException(status_code=403, detail='Staff access required')
    return current_user
