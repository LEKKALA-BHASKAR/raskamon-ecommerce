"""
Enhanced Authentication Router
Supports B2C, B2B, and Vendor registration with approval workflows
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import uuid

from database import users_col
from utils.security import hash_password, verify_password, create_access_token, create_refresh_token, get_current_user
from utils.audit import get_audit_logger
from middleware.rbac import rate_limit

router = APIRouter()


# ==================== REQUEST MODELS ====================

class B2BRegistrationRequest(BaseModel):
    """B2B registration request"""
    # User basics
    email: EmailStr
    password: str
    name: str
    phone: str
    
    # B2B company info
    company_name: str
    gst_number: str
    pan_number: str
    
    # Business address
    business_street: str
    business_city: str
    business_state: str
    business_pincode: str
    
    # Contact person
    contact_name: str
    contact_designation: str
    contact_phone: str
    contact_email: EmailStr
    
    # Optional
    business_type: Optional[str] = None
    annual_turnover: Optional[float] = None
    years_in_business: Optional[int] = None


class VendorRegistrationRequest(BaseModel):
    """Vendor registration request"""
    # User basics
    email: EmailStr
    password: str
    name: str
    phone: str
    
    # Vendor business info
    business_name: str
    store_name: str
    gstin: str
    pan: str
    
    # Bank details
    account_holder_name: str
    account_number: str
    ifsc_code: str
    bank_name: str
    branch: str
    account_type: str = "CURRENT"
    
    # Identity proof
    identity_type: str  # AADHAAR | PAN | PASSPORT | DRIVING_LICENSE
    identity_number: str


class LoginRequest(BaseModel):
    """Universal login request"""
    email: EmailStr
    password: str


# ==================== B2C REGISTRATION (Existing - Enhanced) ====================

@router.post('/register')
@rate_limit(max_requests=10, window_seconds=60)
async def register_b2c_customer(
    email: EmailStr,
    password: str,
    name: str,
    phone: Optional[str] = None,
    request: Request = None
):
    """
    Register a B2C customer (regular retail customer)
    This is the default registration for normal shoppers
    """
    # Check if user already exists
    existing = await users_col.find_one({"email": email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "EMAIL_EXISTS",
                "message": "Email already registered"
            }
        )
    
    # Create user
    user_id = f"usr_{uuid.uuid4().hex[:16]}"
    hashed_pw = hash_password(password)
    
    user_data = {
        "id": user_id,
        "email": email.lower(),
        "password": hashed_pw,
        "name": name,
        "phone": phone,
        "role": "B2C_CUSTOMER",
        
        # B2C-specific
        "b2b_profile": None,
        "vendor_profile": None,
        
        "addresses": [],
        "wishlist": [],
        "refresh_tokens": [],
        
        "is_active": True,
        "is_verified": False,
        "email_verified_at": None,
        
        "last_login_at": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await users_col.insert_one(user_data)
    
    # Log registration
    audit_logger = get_audit_logger()
    await audit_logger.log_user_action(
        user={"id": user_id, "email": email, "role": "B2C_CUSTOMER"},
        action="USER_REGISTERED",
        description=f"New B2C customer registered: {name}",
        user_ip=request.client.host if request else None
    )
    
    return {
        "success": True,
        "message": "Registration successful",
        "data": {
            "user_id": user_id,
            "email": email,
            "role": "B2C_CUSTOMER"
        }
    }


# ==================== B2B REGISTRATION ====================

@router.post('/register-b2b')
@rate_limit(max_requests=5, window_seconds=60)
async def register_b2b_buyer(data: B2BRegistrationRequest, request: Request):
    """
    Register a B2B buyer (business/wholesale buyer)
    
    Flow:
    1. User registers with company details
    2. Status set to PENDING
    3. Cannot login until admin APPROVES
    4. Once approved, can access B2B products and wholesale pricing
    """
    # Check if email exists
    existing = await users_col.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "EMAIL_EXISTS",
                "message": "Email already registered"
            }
        )
    
    # Check if GST number exists
    existing_gst = await users_col.find_one({"b2b_profile.gst_number": data.gst_number.upper()})
    if existing_gst:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "GST_EXISTS",
                "message": "GST number already registered"
            }
        )
    
    # Create user
    user_id = f"usr_{uuid.uuid4().hex[:16]}"
    hashed_pw = hash_password(data.password)
    
    user_data = {
        "id": user_id,
        "email": data.email.lower(),
        "password": hashed_pw,
        "name": data.name,
        "phone": data.phone,
        "role": "B2B_BUYER",
        
        # B2B Profile (CRITICAL)
        "b2b_profile": {
            "company_name": data.company_name,
            "gst_number": data.gst_number.upper(),
            "pan_number": data.pan_number.upper(),
            "business_address": {
                "street": data.business_street,
                "city": data.business_city,
                "state": data.business_state,
                "pincode": data.business_pincode,
                "country": "India",
                "address_type": "REGISTERED"
            },
            "contact_person": {
                "name": data.contact_name,
                "designation": data.contact_designation,
                "phone": data.contact_phone,
                "email": data.contact_email
            },
            "business_documents": [],  # Will be uploaded separately
            
            # Approval workflow (CRITICAL)
            "approval_status": "PENDING",
            "approval_note": None,
            "approved_by": None,
            "approved_at": None,
            "rejection_reason": None,
            "rejected_at": None,
            
            # Optional fields
            "business_type": data.business_type,
            "annual_turnover": data.annual_turnover,
            "years_in_business": data.years_in_business
        },
        
        "vendor_profile": None,
        
        "addresses": [],
        "wishlist": [],
        "refresh_tokens": [],
        
        "is_active": True,
        "is_verified": False,
        "email_verified_at": None,
        
        "last_login_at": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await users_col.insert_one(user_data)
    
    # Log registration
    audit_logger = get_audit_logger()
    await audit_logger.log_user_action(
        user={"id": user_id, "email": data.email, "role": "B2B_BUYER"},
        action="B2B_USER_REGISTERED",
        description=f"New B2B registration: {data.company_name} (GST: {data.gst_number})",
        user_ip=request.client.host if request else None
    )
    
    # TODO: Send notification to admin
    # TODO: Send confirmation email to user
    
    return {
        "success": True,
        "message": "B2B registration submitted successfully. Your account is pending admin approval.",
        "data": {
            "user_id": user_id,
            "email": data.email,
            "role": "B2B_BUYER",
            "company_name": data.company_name,
            "approval_status": "PENDING"
        }
    }


# ==================== VENDOR REGISTRATION ====================

@router.post('/register-vendor')
@rate_limit(max_requests=5, window_seconds=60)
async def register_vendor(data: VendorRegistrationRequest, request: Request):
    """
    Register a vendor (seller)
    
    Flow:
    1. Vendor registers with business and bank details
    2. Status set to PENDING
    3. Cannot login until admin APPROVES
    4. Once approved, can manage products and view analytics
    """
    # Check if email exists
    existing = await users_col.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "EMAIL_EXISTS",
                "message": "Email already registered"
            }
        )
    
    # Check if GSTIN exists
    existing_gstin = await users_col.find_one({"vendor_profile.gstin": data.gstin.upper()})
    if existing_gstin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "GSTIN_EXISTS",
                "message": "GSTIN already registered"
            }
        )
    
    # Generate unique vendor ID and store slug
    vendor_id = f"vnd_{uuid.uuid4().hex[:16]}"
    store_slug = data.store_name.lower().replace(' ', '-').replace('_', '-')
    
    # Ensure store_slug is unique
    existing_slug = await users_col.find_one({"vendor_profile.store_slug": store_slug})
    if existing_slug:
        store_slug = f"{store_slug}-{uuid.uuid4().hex[:6]}"
    
    # Create user
    user_id = f"usr_{uuid.uuid4().hex[:16]}"
    hashed_pw = hash_password(data.password)
    
    user_data = {
        "id": user_id,
        "email": data.email.lower(),
        "password": hashed_pw,
        "name": data.name,
        "phone": data.phone,
        "role": "VENDOR",
        
        "b2b_profile": None,
        
        # Vendor Profile (CRITICAL)
        "vendor_profile": {
            "vendor_id": vendor_id,
            "business_name": data.business_name,
            "store_name": data.store_name,
            "store_slug": store_slug,
            "gstin": data.gstin.upper(),
            "pan": data.pan.upper(),
            
            # Bank details (for settlements)
            "bank_details": {
                "account_holder_name": data.account_holder_name,
                "account_number": data.account_number,  # Should be encrypted in production
                "ifsc_code": data.ifsc_code.upper(),
                "bank_name": data.bank_name,
                "branch": data.branch,
                "account_type": data.account_type
            },
            
            # Identity proof
            "identity_proof": {
                "type": data.identity_type,
                "number": data.identity_number,  # Should be masked in API responses
                "document_url": None,  # Will be uploaded separately
                "public_id": None,
                "verified": False
            },
            
            # Approval workflow (CRITICAL)
            "approval_status": "PENDING",
            "approval_note": None,
            "approved_by": None,
            "approved_at": None,
            "rejection_reason": None,
            "rejected_at": None,
            
            # Platform commission
            "commission_rate": 15.0,  # Default 15%, can be adjusted by admin
            
            "onboarded_at": None
        },
        
        "addresses": [],
        "wishlist": [],
        "refresh_tokens": [],
        
        "is_active": True,
        "is_verified": False,
        "email_verified_at": None,
        
        "last_login_at": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await users_col.insert_one(user_data)
    
    # Log registration
    audit_logger = get_audit_logger()
    await audit_logger.log_user_action(
        user={"id": user_id, "email": data.email, "role": "VENDOR"},
        action="VENDOR_REGISTERED",
        description=f"New vendor registration: {data.store_name} (GSTIN: {data.gstin})",
        user_ip=request.client.host if request else None
    )
    
    # TODO: Send notification to admin
    # TODO: Send confirmation email to vendor
    
    return {
        "success": True,
        "message": "Vendor registration submitted successfully. Your account is pending admin approval.",
        "data": {
            "user_id": user_id,
            "vendor_id": vendor_id,
            "email": data.email,
            "role": "VENDOR",
            "store_name": data.store_name,
            "store_slug": store_slug,
            "approval_status": "PENDING"
        }
    }


# ==================== ENHANCED LOGIN WITH ROLE GATING ====================

@router.post('/login')
@rate_limit(max_requests=5, window_seconds=60)
async def login(credentials: LoginRequest, request: Request):
    """
    Universal login endpoint with strict role-based access control
    
    CRITICAL RULES:
    - B2B users with status PENDING/REJECTED → CANNOT LOGIN
    - Vendors with status PENDING/REJECTED → CANNOT LOGIN
    - Only APPROVED B2B/Vendors can access the platform
    """
    # Find user
    user = await users_col.find_one({"email": credentials.email.lower()})
    
    if not user:
        # Log failed login
        audit_logger = get_audit_logger()
        await audit_logger.log_failed_login(
            email=credentials.email,
            reason="User not found",
            user_ip=request.client.host if request else None
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password"
            }
        )
    
    # Verify password
    if not verify_password(credentials.password, user['password']):
        # Log failed login
        audit_logger = get_audit_logger()
        await audit_logger.log_failed_login(
            email=credentials.email,
            reason="Invalid password",
            user_ip=request.client.host if request else None
        )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password"
            }
        )
    
    # CRITICAL: Check B2B approval status
    if user['role'] == 'B2B_BUYER':
        b2b_status = user.get('b2b_profile', {}).get('approval_status')
        
        if b2b_status != 'APPROVED':
            # Log blocked login attempt
            audit_logger = get_audit_logger()
            await audit_logger.log_failed_login(
                email=credentials.email,
                reason=f"B2B account not approved (status: {b2b_status})",
                user_ip=request.client.host if request else None
            )
            
            if b2b_status == 'PENDING':
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "code": "B2B_NOT_APPROVED",
                        "message": "Your B2B account is pending admin approval",
                        "details": "Please wait for our team to review your application. You will receive an email once approved."
                    }
                )
            elif b2b_status == 'REJECTED':
                rejection_reason = user.get('b2b_profile', {}).get('rejection_reason', 'Not specified')
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "code": "B2B_REJECTED",
                        "message": "Your B2B application has been rejected",
                        "details": f"Reason: {rejection_reason}. Please contact support for more information."
                    }
                )
    
    # CRITICAL: Check Vendor approval status
    if user['role'] == 'VENDOR':
        vendor_status = user.get('vendor_profile', {}).get('approval_status')
        
        if vendor_status != 'APPROVED':
            # Log blocked login attempt
            audit_logger = get_audit_logger()
            await audit_logger.log_failed_login(
                email=credentials.email,
                reason=f"Vendor account not approved (status: {vendor_status})",
                user_ip=request.client.host if request else None
            )
            
            if vendor_status == 'PENDING':
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "code": "VENDOR_NOT_APPROVED",
                        "message": "Your vendor account is pending admin approval",
                        "details": "Please wait for our team to review your application. You will receive an email once approved."
                    }
                )
            elif vendor_status == 'REJECTED':
                rejection_reason = user.get('vendor_profile', {}).get('rejection_reason', 'Not specified')
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "code": "VENDOR_REJECTED",
                        "message": "Your vendor application has been rejected",
                        "details": f"Reason: {rejection_reason}. Please contact support for more information."
                    }
                )
    
    # Check if account is active
    if not user.get('is_active', True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_INACTIVE",
                "message": "Your account has been deactivated. Please contact support."
            }
        )
    
    # Generate tokens
    access_token = create_access_token({
        "user_id": user['id'],
        "email": user['email'],
        "role": user['role'],
        "b2b_status": user.get('b2b_profile', {}).get('approval_status') if user['role'] == 'B2B_BUYER' else None,
        "vendor_id": user.get('vendor_profile', {}).get('vendor_id') if user['role'] == 'VENDOR' else None,
        "vendor_status": user.get('vendor_profile', {}).get('approval_status') if user['role'] == 'VENDOR' else None
    })
    
    refresh_token = create_refresh_token(user['id'])
    
    # Store refresh token
    await users_col.update_one(
        {"id": user['id']},
        {
            "$push": {
                "refresh_tokens": {
                    "token": refresh_token,
                    "created_at": datetime.utcnow(),
                    "expires_at": datetime.utcnow() + timedelta(days=30),
                    "revoked": False
                }
            },
            "$set": {
                "last_login_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Log successful login
    audit_logger = get_audit_logger()
    await audit_logger.log_user_action(
        user=user,
        action="USER_LOGIN",
        description=f"User logged in successfully",
        user_ip=request.client.host if request else None
    )
    
    # Prepare response
    user_response = {
        "id": user['id'],
        "email": user['email'],
        "name": user['name'],
        "phone": user.get('phone'),
        "role": user['role'],
        "is_active": user.get('is_active', True),
        "is_verified": user.get('is_verified', False),
        "created_at": user['created_at'],
        "last_login_at": user['last_login_at']
    }
    
    # Add role-specific fields
    if user['role'] == 'B2B_BUYER':
        user_response['b2b_status'] = user.get('b2b_profile', {}).get('approval_status')
        user_response['company_name'] = user.get('b2b_profile', {}).get('company_name')
    
    if user['role'] == 'VENDOR':
        user_response['vendor_id'] = user.get('vendor_profile', {}).get('vendor_id')
        user_response['vendor_status'] = user.get('vendor_profile', {}).get('approval_status')
        user_response['store_name'] = user.get('vendor_profile', {}).get('store_name')
    
    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "user": user_response
        }
    }
