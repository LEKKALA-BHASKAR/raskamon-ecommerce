"""
User Model for Unified Commerce Platform
Supports: B2C Customers, B2B Buyers, Vendors, Admin, Sub-Admin
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration"""
    B2C_CUSTOMER = "B2C_CUSTOMER"
    B2B_BUYER = "B2B_BUYER"
    VENDOR = "VENDOR"
    ADMIN = "ADMIN"
    SUB_ADMIN = "SUB_ADMIN"


class ApprovalStatus(str, Enum):
    """Approval status for B2B and Vendor accounts"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ==================== B2B BUYER MODELS ====================

class BusinessDocument(BaseModel):
    """Business document uploaded during B2B registration"""
    type: Literal["GST_CERTIFICATE", "PAN_CARD", "TRADE_LICENSE", "COMPANY_REGISTRATION", "OTHER"]
    url: str
    public_id: str  # Cloudinary public_id
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class ContactPerson(BaseModel):
    """Contact person for B2B company"""
    name: str
    designation: str
    phone: str
    email: EmailStr


class BusinessAddress(BaseModel):
    """Business address"""
    street: str
    city: str
    state: str
    pincode: str
    country: str = "India"
    address_type: Literal["REGISTERED", "BILLING", "SHIPPING"] = "REGISTERED"


class B2BProfile(BaseModel):
    """B2B Buyer Profile - Extended fields for business buyers"""
    company_name: str
    gst_number: str
    pan_number: str
    business_address: BusinessAddress
    contact_person: ContactPerson
    business_documents: List[BusinessDocument] = []
    
    # Approval workflow
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    approval_note: Optional[str] = None
    approved_by: Optional[str] = None  # admin user_id
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    rejected_at: Optional[datetime] = None
    
    # Additional info
    business_type: Optional[Literal["DISTRIBUTOR", "RETAILER", "WHOLESALER", "MANUFACTURER", "OTHER"]] = None
    annual_turnover: Optional[float] = None
    years_in_business: Optional[int] = None
    
    class Config:
        use_enum_values = True


# ==================== VENDOR MODELS ====================

class BankDetails(BaseModel):
    """Vendor bank details for settlements"""
    account_holder_name: str
    account_number: str  # Stored encrypted/masked
    ifsc_code: str
    bank_name: str
    branch: str
    account_type: Literal["SAVINGS", "CURRENT"] = "CURRENT"


class IdentityProof(BaseModel):
    """Vendor identity proof"""
    type: Literal["AADHAAR", "PAN", "PASSPORT", "DRIVING_LICENSE"]
    number: str  # Masked in API responses
    document_url: str
    public_id: str
    verified: bool = False


class VendorProfile(BaseModel):
    """Vendor Profile - Extended fields for sellers"""
    vendor_id: str  # Unique vendor identifier (vnd_uuid)
    business_name: str
    store_name: str
    store_slug: str  # URL-friendly
    gstin: str  # GST Identification Number
    pan: str
    
    # Bank details for payouts
    bank_details: BankDetails
    
    # Identity verification
    identity_proof: IdentityProof
    
    # Approval workflow
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    approval_note: Optional[str] = None
    approved_by: Optional[str] = None  # admin user_id
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    rejected_at: Optional[datetime] = None
    
    # Business configuration
    commission_rate: float = 15.0  # Platform commission percentage
    
    # Timestamps
    onboarded_at: Optional[datetime] = None
    
    class Config:
        use_enum_values = True


# ==================== ADDRESS MODEL ====================

class Address(BaseModel):
    """User address - shipping/billing"""
    id: str  # addr_uuid
    type: Literal["SHIPPING", "BILLING", "BOTH"] = "SHIPPING"
    name: str
    phone: str
    street: str
    landmark: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: str = "India"
    is_default: bool = False


# ==================== REFRESH TOKEN MODEL ====================

class RefreshToken(BaseModel):
    """Refresh token for JWT authentication"""
    token: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    revoked: bool = False
    revoked_at: Optional[datetime] = None


# ==================== MAIN USER MODEL ====================

class User(BaseModel):
    """Main User model - supports all roles"""
    # Basic Info
    id: str  # usr_uuid_v4
    email: EmailStr
    password: str  # Hashed
    name: str
    phone: Optional[str] = None
    
    # Role & Status
    role: UserRole = UserRole.B2C_CUSTOMER
    
    # Role-specific profiles (null if not applicable)
    b2b_profile: Optional[B2BProfile] = None
    vendor_profile: Optional[VendorProfile] = None
    
    # Addresses
    addresses: List[Address] = []
    
    # Wishlist & Cart
    wishlist: List[str] = []  # List of product_ids
    
    # Authentication
    refresh_tokens: List[RefreshToken] = []
    password_reset_token: Optional[str] = None
    password_reset_expires: Optional[datetime] = None
    
    # Status
    is_active: bool = True
    is_verified: bool = False
    email_verified_at: Optional[datetime] = None
    
    # Timestamps
    last_login_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        use_enum_values = True
    
    @validator('email')
    def email_lowercase(cls, v):
        return v.lower()
    
    @validator('gst_number', 'gstin', pre=True, always=True)
    def validate_gst(cls, v):
        """Validate GST format (basic)"""
        if v and len(v) != 15:
            raise ValueError("GST number must be 15 characters")
        return v.upper() if v else v
    
    @validator('pan', 'pan_number', pre=True, always=True)
    def validate_pan(cls, v):
        """Validate PAN format (basic)"""
        if v and len(v) != 10:
            raise ValueError("PAN must be 10 characters")
        return v.upper() if v else v


# ==================== REQUEST/RESPONSE MODELS ====================

class B2BRegistrationRequest(BaseModel):
    """B2B registration request payload"""
    # User basics
    email: EmailStr
    password: str
    name: str
    phone: str
    
    # B2B specific
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
    """Vendor registration request payload"""
    # User basics
    email: EmailStr
    password: str
    name: str
    phone: str
    
    # Vendor specific
    business_name: str
    store_name: str
    store_slug: str
    gstin: str
    pan: str
    
    # Bank details
    account_holder_name: str
    account_number: str
    ifsc_code: str
    bank_name: str
    branch: str
    account_type: Literal["SAVINGS", "CURRENT"] = "CURRENT"
    
    # Identity proof
    identity_type: Literal["AADHAAR", "PAN", "PASSPORT", "DRIVING_LICENSE"]
    identity_number: str


class UserResponse(BaseModel):
    """User response (safe - no password)"""
    id: str
    email: str
    name: str
    phone: Optional[str]
    role: str
    
    # Conditional fields
    b2b_status: Optional[str] = None  # For B2B buyers
    vendor_id: Optional[str] = None   # For vendors
    vendor_status: Optional[str] = None  # For vendors
    
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime]


class ApprovalRequest(BaseModel):
    """Admin approval/rejection request"""
    approval_note: Optional[str] = None
    rejection_reason: Optional[str] = None  # Required if rejecting


class LoginRequest(BaseModel):
    """Login request"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response with tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    user: UserResponse
