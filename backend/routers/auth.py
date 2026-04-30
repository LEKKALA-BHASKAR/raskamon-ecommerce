from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, EmailStr
from database import users_col
from utils.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
    get_current_user, generate_otp
)
from utils.helpers import serialize_doc, now
from typing import Optional
import uuid
import os

router = APIRouter()

# --- Schemas ---
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class RefreshIn(BaseModel):
    refresh_token: str

class VerifyOTPIn(BaseModel):
    email: EmailStr
    otp: str

# --- Routes ---

@router.post('/register')
async def register(data: RegisterIn):
    existing = await users_col.find_one({'email': data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    user_id = str(uuid.uuid4())
    otp = generate_otp()
    user_doc = {
        '_id': user_id,
        'name': data.name,
        'email': data.email.lower(),
        'password': hash_password(data.password),
        'phone': data.phone,
        'role': 'customer',
        'avatar': None,
        'addresses': [],
        'wishlist': [],
        'loyaltyPoints': 0,
        'isBlocked': False,
        'isVerified': True,  # Auto-verify for now
        'otp': otp,
        'otpExpiry': None,
        'createdAt': now(),
        'updatedAt': now(),
    }
    await users_col.insert_one(user_doc)
    access_token = create_access_token({'sub': user_id, 'email': data.email.lower()})
    refresh_token = create_refresh_token({'sub': user_id})
    user_doc.pop('password', None)
    user_doc.pop('otp', None)
    return {
        'message': 'Registration successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': serialize_doc(user_doc)
    }


@router.post('/login')
async def login(data: LoginIn):
    user = await users_col.find_one({'email': data.email.lower()})
    if not user or not verify_password(data.password, user.get('password', '')):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    if user.get('isBlocked'):
        raise HTTPException(status_code=403, detail='Account blocked')
    access_token = create_access_token({'sub': user['_id'], 'email': user['email']})
    refresh_token = create_refresh_token({'sub': user['_id']})
    user.pop('password', None)
    user.pop('otp', None)
    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': serialize_doc(user)
    }


@router.post('/refresh')
async def refresh_token(data: RefreshIn):
    payload = decode_token(data.refresh_token)
    if payload.get('type') != 'refresh':
        raise HTTPException(status_code=401, detail='Invalid refresh token')
    user_id = payload.get('sub')
    user = await users_col.find_one({'_id': user_id})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    access_token = create_access_token({'sub': user_id, 'email': user['email']})
    return {'access_token': access_token}


@router.post('/forgot-password')
async def forgot_password(data: ForgotPasswordIn):
    user = await users_col.find_one({'email': data.email.lower()})
    if not user:
        # Don't reveal if email exists
        return {'message': 'If this email exists, you will receive an OTP'}
    otp = generate_otp()
    from datetime import timedelta
    expiry = now()
    await users_col.update_one(
        {'_id': user['_id']},
        {'$set': {'otp': otp, 'otpExpiry': expiry, 'updatedAt': now()}}
    )
    # TODO: Send email with OTP
    print(f'[DEV] OTP for {data.email}: {otp}')  # Log for dev testing
    return {'message': 'OTP sent to your email', 'dev_otp': otp}  # Remove dev_otp in production


@router.post('/verify-otp')
async def verify_otp(data: VerifyOTPIn):
    user = await users_col.find_one({'email': data.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if user.get('otp') != data.otp:
        raise HTTPException(status_code=400, detail='Invalid OTP')
    await users_col.update_one({'_id': user['_id']}, {'$set': {'isVerified': True, 'otp': None}})
    return {'message': 'OTP verified successfully'}


@router.post('/reset-password')
async def reset_password(data: ResetPasswordIn):
    user = await users_col.find_one({'email': data.email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    if user.get('otp') != data.otp:
        raise HTTPException(status_code=400, detail='Invalid OTP')
    await users_col.update_one(
        {'_id': user['_id']},
        {'$set': {'password': hash_password(data.new_password), 'otp': None, 'updatedAt': now()}}
    )
    return {'message': 'Password reset successful'}


@router.get('/me')
async def get_me(current_user=Depends(get_current_user)):
    return serialize_doc(current_user)
