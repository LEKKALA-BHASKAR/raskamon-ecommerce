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
    user = await users_col.find_one({'_id': payload.get('sub')}, {'password': 0})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    if user.get('isBlocked'):
        raise HTTPException(status_code=403, detail='Account is blocked')
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
