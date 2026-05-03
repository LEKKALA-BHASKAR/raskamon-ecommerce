"""
Admin User Management Router
Handles B2B user and vendor approval workflows
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime

from database import users_col
from utils.security import get_current_user
from utils.audit import get_audit_logger
from middleware.rbac import require_role
from utils.helpers import serialize_doc

router = APIRouter()


# ==================== REQUEST MODELS ====================

class ApprovalRequest(BaseModel):
    """Approval/rejection request"""
    approval_note: Optional[str] = None
    rejection_reason: Optional[str] = None


class CommissionUpdateRequest(BaseModel):
    """Update vendor commission rate"""
    commission_rate: float


# ==================== B2B USER MANAGEMENT ====================

@router.get('/b2b-users')
@require_role(["ADMIN", "SUB_ADMIN"])
async def get_b2b_users(
    status: Optional[Literal["PENDING", "APPROVED", "REJECTED"]] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """
    Get list of B2B users with optional status filter
    
    Admin can view all B2B registration requests
    """
    query = {"role": "B2B_BUYER"}
    
    if status:
        query["b2b_profile.approval_status"] = status
    
    # Count total
    total = await users_col.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * limit
    users = await users_col.find(
        query,
        {
            "password": 0,  # Exclude password
            "refresh_tokens": 0  # Exclude refresh tokens
        }
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "data": serialize_doc(users),
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }


@router.get('/b2b-users/{user_id}')
@require_role(["ADMIN", "SUB_ADMIN"])
async def get_b2b_user_details(
    user_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get detailed information about a B2B user
    """
    b2b_user = await users_col.find_one(
        {"id": user_id, "role": "B2B_BUYER"},
        {"password": 0, "refresh_tokens": 0}
    )
    
    if not b2b_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "USER_NOT_FOUND",
                "message": "B2B user not found"
            }
        )
    
    return {
        "success": True,
        "data": serialize_doc(b2b_user)
    }


@router.post('/b2b-users/{user_id}/approve')
@require_role(["ADMIN"])
async def approve_b2b_user(
    user_id: str,
    approval_data: ApprovalRequest,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """
    Approve a B2B user registration
    
    CRITICAL: This enables the B2B user to login and access the platform
    """
    # Find the B2B user
    b2b_user = await users_col.find_one({"id": user_id, "role": "B2B_BUYER"})
    
    if not b2b_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "USER_NOT_FOUND",
                "message": "B2B user not found"
            }
        )
    
    # Check current status
    current_status = b2b_user.get('b2b_profile', {}).get('approval_status')
    
    if current_status == 'APPROVED':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "ALREADY_APPROVED",
                "message": "This B2B user is already approved"
            }
        )
    
    # Update user status to APPROVED
    update_result = await users_col.update_one(
        {"id": user_id},
        {
            "$set": {
                "b2b_profile.approval_status": "APPROVED",
                "b2b_profile.approval_note": approval_data.approval_note,
                "b2b_profile.approved_by": admin_user.get('id'),
                "b2b_profile.approved_at": datetime.utcnow(),
                "b2b_profile.rejection_reason": None,
                "b2b_profile.rejected_at": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if update_result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "UPDATE_FAILED",
                "message": "Failed to update user status"
            }
        )
    
    # Log the approval action
    audit_logger = get_audit_logger()
    await audit_logger.log_b2b_approval(
        admin_user=admin_user,
        b2b_user_id=user_id,
        company_name=b2b_user.get('b2b_profile', {}).get('company_name'),
        approval_status="APPROVED",
        note=approval_data.approval_note,
        user_ip=request.client.host if request else None
    )
    
    # TODO: Send approval email to B2B user
    # TODO: Send notification
    
    return {
        "success": True,
        "message": "B2B user approved successfully",
        "data": {
            "user_id": user_id,
            "company_name": b2b_user.get('b2b_profile', {}).get('company_name'),
            "approval_status": "APPROVED",
            "approved_by": admin_user.get('email'),
            "approved_at": datetime.utcnow().isoformat()
        }
    }


@router.post('/b2b-users/{user_id}/reject')
@require_role(["ADMIN"])
async def reject_b2b_user(
    user_id: str,
    rejection_data: ApprovalRequest,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """
    Reject a B2B user registration
    
    User will not be able to login
    """
    if not rejection_data.rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "REJECTION_REASON_REQUIRED",
                "message": "Rejection reason is required"
            }
        )
    
    # Find the B2B user
    b2b_user = await users_col.find_one({"id": user_id, "role": "B2B_BUYER"})
    
    if not b2b_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "USER_NOT_FOUND",
                "message": "B2B user not found"
            }
        )
    
    # Update user status to REJECTED
    update_result = await users_col.update_one(
        {"id": user_id},
        {
            "$set": {
                "b2b_profile.approval_status": "REJECTED",
                "b2b_profile.rejection_reason": rejection_data.rejection_reason,
                "b2b_profile.rejected_at": datetime.utcnow(),
                "b2b_profile.approved_by": admin_user.get('id'),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if update_result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "UPDATE_FAILED",
                "message": "Failed to update user status"
            }
        )
    
    # Log the rejection action
    audit_logger = get_audit_logger()
    await audit_logger.log_b2b_approval(
        admin_user=admin_user,
        b2b_user_id=user_id,
        company_name=b2b_user.get('b2b_profile', {}).get('company_name'),
        approval_status="REJECTED",
        note=rejection_data.rejection_reason,
        user_ip=request.client.host if request else None
    )
    
    # TODO: Send rejection email to B2B user
    # TODO: Send notification
    
    return {
        "success": True,
        "message": "B2B user rejected",
        "data": {
            "user_id": user_id,
            "company_name": b2b_user.get('b2b_profile', {}).get('company_name'),
            "approval_status": "REJECTED",
            "rejection_reason": rejection_data.rejection_reason,
            "rejected_by": admin_user.get('email')
        }
    }


# ==================== VENDOR MANAGEMENT ====================

@router.get('/vendors')
@require_role(["ADMIN", "SUB_ADMIN"])
async def get_vendors(
    status: Optional[Literal["PENDING", "APPROVED", "REJECTED"]] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """
    Get list of vendors with optional status filter
    """
    query = {"role": "VENDOR"}
    
    if status:
        query["vendor_profile.approval_status"] = status
    
    # Count total
    total = await users_col.count_documents(query)
    
    # Get paginated results
    skip = (page - 1) * limit
    vendors = await users_col.find(
        query,
        {
            "password": 0,
            "refresh_tokens": 0,
            "vendor_profile.bank_details.account_number": 0  # Mask account number
        }
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "data": serialize_doc(vendors),
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }


@router.get('/vendors/{vendor_id}')
@require_role(["ADMIN", "SUB_ADMIN"])
async def get_vendor_details(
    vendor_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Get detailed information about a vendor
    Note: vendor_id is the actual vendor_profile.vendor_id, not user.id
    """
    vendor = await users_col.find_one(
        {"vendor_profile.vendor_id": vendor_id},
        {
            "password": 0,
            "refresh_tokens": 0
        }
    )
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "VENDOR_NOT_FOUND",
                "message": "Vendor not found"
            }
        )
    
    # Mask sensitive bank details (show last 4 digits only)
    if vendor.get('vendor_profile', {}).get('bank_details'):
        account_number = vendor['vendor_profile']['bank_details'].get('account_number', '')
        if len(account_number) > 4:
            vendor['vendor_profile']['bank_details']['account_number'] = f"****{account_number[-4:]}"
    
    return {
        "success": True,
        "data": serialize_doc(vendor)
    }


@router.post('/vendors/{vendor_id}/approve')
@require_role(["ADMIN"])
async def approve_vendor(
    vendor_id: str,
    approval_data: ApprovalRequest,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """
    Approve a vendor registration
    
    CRITICAL: This enables the vendor to login and manage products
    """
    # Find the vendor (by vendor_profile.vendor_id)
    vendor = await users_col.find_one({"vendor_profile.vendor_id": vendor_id})
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "VENDOR_NOT_FOUND",
                "message": "Vendor not found"
            }
        )
    
    # Check current status
    current_status = vendor.get('vendor_profile', {}).get('approval_status')
    
    if current_status == 'APPROVED':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "ALREADY_APPROVED",
                "message": "This vendor is already approved"
            }
        )
    
    # Update vendor status to APPROVED
    update_result = await users_col.update_one(
        {"vendor_profile.vendor_id": vendor_id},
        {
            "$set": {
                "vendor_profile.approval_status": "APPROVED",
                "vendor_profile.approval_note": approval_data.approval_note,
                "vendor_profile.approved_by": admin_user.get('id'),
                "vendor_profile.approved_at": datetime.utcnow(),
                "vendor_profile.onboarded_at": datetime.utcnow(),
                "vendor_profile.rejection_reason": None,
                "vendor_profile.rejected_at": None,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if update_result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "UPDATE_FAILED",
                "message": "Failed to update vendor status"
            }
        )
    
    # Log the approval action
    audit_logger = get_audit_logger()
    await audit_logger.log_vendor_approval(
        admin_user=admin_user,
        vendor_id=vendor_id,
        store_name=vendor.get('vendor_profile', {}).get('store_name'),
        approval_status="APPROVED",
        note=approval_data.approval_note,
        user_ip=request.client.host if request else None
    )
    
    # TODO: Send approval email to vendor
    # TODO: Send notification
    # TODO: Create vendor onboarding guide
    
    return {
        "success": True,
        "message": "Vendor approved successfully",
        "data": {
            "vendor_id": vendor_id,
            "store_name": vendor.get('vendor_profile', {}).get('store_name'),
            "approval_status": "APPROVED",
            "approved_by": admin_user.get('email'),
            "approved_at": datetime.utcnow().isoformat()
        }
    }


@router.post('/vendors/{vendor_id}/reject')
@require_role(["ADMIN"])
async def reject_vendor(
    vendor_id: str,
    rejection_data: ApprovalRequest,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """
    Reject a vendor registration
    
    Vendor will not be able to login
    """
    if not rejection_data.rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "REJECTION_REASON_REQUIRED",
                "message": "Rejection reason is required"
            }
        )
    
    # Find the vendor
    vendor = await users_col.find_one({"vendor_profile.vendor_id": vendor_id})
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "VENDOR_NOT_FOUND",
                "message": "Vendor not found"
            }
        )
    
    # Update vendor status to REJECTED
    update_result = await users_col.update_one(
        {"vendor_profile.vendor_id": vendor_id},
        {
            "$set": {
                "vendor_profile.approval_status": "REJECTED",
                "vendor_profile.rejection_reason": rejection_data.rejection_reason,
                "vendor_profile.rejected_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    if update_result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "UPDATE_FAILED",
                "message": "Failed to update vendor status"
            }
        )
    
    # Log the rejection action
    audit_logger = get_audit_logger()
    await audit_logger.log_vendor_approval(
        admin_user=admin_user,
        vendor_id=vendor_id,
        store_name=vendor.get('vendor_profile', {}).get('store_name'),
        approval_status="REJECTED",
        note=rejection_data.rejection_reason,
        user_ip=request.client.host if request else None
    )
    
    # TODO: Send rejection email to vendor
    # TODO: Send notification
    
    return {
        "success": True,
        "message": "Vendor rejected",
        "data": {
            "vendor_id": vendor_id,
            "store_name": vendor.get('vendor_profile', {}).get('store_name'),
            "approval_status": "REJECTED",
            "rejection_reason": rejection_data.rejection_reason,
            "rejected_by": admin_user.get('email')
        }
    }


@router.put('/vendors/{vendor_id}/commission')
@require_role(["ADMIN"])
async def update_vendor_commission(
    vendor_id: str,
    commission_data: CommissionUpdateRequest,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """
    Update vendor commission rate
    
    Admin can adjust the platform commission percentage for each vendor
    """
    if commission_data.commission_rate < 0 or commission_data.commission_rate > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_COMMISSION_RATE",
                "message": "Commission rate must be between 0 and 100"
            }
        )
    
    # Find vendor
    vendor = await users_col.find_one({"vendor_profile.vendor_id": vendor_id})
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "VENDOR_NOT_FOUND",
                "message": "Vendor not found"
            }
        )
    
    old_rate = vendor.get('vendor_profile', {}).get('commission_rate', 0)
    
    # Update commission rate
    await users_col.update_one(
        {"vendor_profile.vendor_id": vendor_id},
        {
            "$set": {
                "vendor_profile.commission_rate": commission_data.commission_rate,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Log the commission update
    audit_logger = get_audit_logger()
    await audit_logger.log_action(
        user_id=admin_user.get('id'),
        user_email=admin_user.get('email'),
        user_role=admin_user.get('role'),
        action="UPDATE_VENDOR_COMMISSION",
        entity_type="VENDOR",
        entity_id=vendor_id,
        entity_name=vendor.get('vendor_profile', {}).get('store_name'),
        changes={
            "field": "commission_rate",
            "old_value": old_rate,
            "new_value": commission_data.commission_rate
        },
        description=f"Commission rate updated from {old_rate}% to {commission_data.commission_rate}%",
        severity="INFO",
        category="VENDOR_MANAGEMENT",
        user_ip=request.client.host if request else None
    )
    
    return {
        "success": True,
        "message": "Commission rate updated successfully",
        "data": {
            "vendor_id": vendor_id,
            "old_commission_rate": old_rate,
            "new_commission_rate": commission_data.commission_rate
        }
    }


# ==================== AUDIT LOGS ====================

@router.get('/audit-logs')
@require_role(["ADMIN", "SUB_ADMIN"])
async def get_audit_logs(
    user_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    admin_user: dict = Depends(get_current_user)
):
    """
    Get audit logs with filters
    
    Admin can view all audit logs for compliance and security monitoring
    """
    audit_logger = get_audit_logger()
    
    result = await audit_logger.get_audit_logs(
        user_id=user_id,
        entity_type=entity_type,
        action=action,
        category=category,
        severity=severity,
        page=page,
        limit=limit
    )
    
    return {
        "success": True,
        "data": result['logs'],
        "pagination": {
            "page": result['page'],
            "limit": result['limit'],
            "total": result['total'],
            "pages": result['pages']
        }
    }


# ==================== SUSPEND / REACTIVATE ====================

@router.post('/vendors/{vendor_id}/suspend')
@require_role(["ADMIN"])
async def suspend_vendor(
    vendor_id: str,
    request: Request,
    reason: str = "Policy violation",
    admin_user: dict = Depends(get_current_user)
):
    """Suspend an approved vendor. Their products become inactive."""
    from database import products_col
    vendor = await users_col.find_one({"vendor_profile.vendor_id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail={"code": "VENDOR_NOT_FOUND", "message": "Vendor not found"})

    await users_col.update_one(
        {"vendor_profile.vendor_id": vendor_id},
        {"$set": {"vendor_profile.approval_status": "SUSPENDED", "vendor_profile.suspension_reason": reason, "updated_at": datetime.utcnow()}}
    )
    # Deactivate all their products
    await products_col.update_many({"vendor_id": vendor_id}, {"$set": {"isActive": False, "updatedAt": datetime.utcnow()}})

    audit_logger = get_audit_logger()
    await audit_logger.log_action(
        user_id=admin_user.get('id'), user_email=admin_user.get('email'), user_role='ADMIN',
        action="VENDOR_SUSPENDED", entity_type="VENDOR", entity_id=vendor_id,
        entity_name=vendor.get('vendor_profile', {}).get('store_name'),
        changes={"reason": reason}, description=f"Vendor suspended: {reason}",
        severity="HIGH", category="VENDOR_MANAGEMENT", user_ip=request.client.host if request else None
    )
    return {"success": True, "message": "Vendor suspended and all products deactivated"}


@router.post('/vendors/{vendor_id}/reactivate')
@require_role(["ADMIN"])
async def reactivate_vendor(
    vendor_id: str,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """Reactivate a suspended vendor."""
    from database import products_col
    vendor = await users_col.find_one({"vendor_profile.vendor_id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail={"code": "VENDOR_NOT_FOUND", "message": "Vendor not found"})

    await users_col.update_one(
        {"vendor_profile.vendor_id": vendor_id},
        {"$set": {"vendor_profile.approval_status": "APPROVED", "vendor_profile.suspension_reason": None, "updated_at": datetime.utcnow()}}
    )
    # Re-activate only approved products
    await products_col.update_many(
        {"vendor_id": vendor_id, "approval_status": "APPROVED"},
        {"$set": {"isActive": True, "updatedAt": datetime.utcnow()}}
    )
    return {"success": True, "message": "Vendor reactivated"}


@router.post('/b2b-users/{user_id}/suspend')
@require_role(["ADMIN"])
async def suspend_b2b_user(
    user_id: str,
    request: Request,
    reason: str = "Policy violation",
    admin_user: dict = Depends(get_current_user)
):
    """Suspend a B2B buyer account."""
    b2b_user = await users_col.find_one({"id": user_id, "role": "B2B_BUYER"})
    if not b2b_user:
        raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "B2B user not found"})

    await users_col.update_one(
        {"id": user_id},
        {"$set": {"b2b_profile.approval_status": "SUSPENDED", "b2b_profile.suspension_reason": reason, "updated_at": datetime.utcnow()}}
    )
    return {"success": True, "message": "B2B user suspended"}


@router.post('/b2b-users/{user_id}/reactivate')
@require_role(["ADMIN"])
async def reactivate_b2b_user(
    user_id: str,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """Reactivate a suspended B2B buyer."""
    b2b_user = await users_col.find_one({"id": user_id, "role": "B2B_BUYER"})
    if not b2b_user:
        raise HTTPException(status_code=404, detail={"code": "USER_NOT_FOUND", "message": "B2B user not found"})

    await users_col.update_one(
        {"id": user_id},
        {"$set": {"b2b_profile.approval_status": "APPROVED", "b2b_profile.suspension_reason": None, "updated_at": datetime.utcnow()}}
    )
    return {"success": True, "message": "B2B user reactivated"}


# ==================== PRODUCT MODERATION (ADMIN) ====================

@router.get('/vendor-products')
@require_role(["ADMIN", "SUB_ADMIN"])
async def admin_list_vendor_products(
    approval_status: Optional[str] = None,
    vendor_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    admin_user: dict = Depends(get_current_user)
):
    """Admin: list all vendor products for moderation."""
    from database import products_col
    from utils.helpers import serialize_doc, paginate

    query = {"is_vendor_product": True, "isDeleted": {"$ne": True}}
    if approval_status:
        query["approval_status"] = approval_status
    if vendor_id:
        query["vendor_id"] = vendor_id

    skip, lim = paginate(page, limit)
    total = await products_col.count_documents(query)
    products = await products_col.find(query).sort("createdAt", -1).skip(skip).limit(lim).to_list(lim)

    return {
        "success": True,
        "data": serialize_doc(products),
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + lim - 1) // lim}
    }


@router.post('/vendor-products/{product_id}/approve')
@require_role(["ADMIN", "SUB_ADMIN"])
async def admin_approve_product(
    product_id: str,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """Admin: approve a vendor product."""
    from database import products_col
    product = await products_col.find_one({"id": product_id, "is_vendor_product": True})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await products_col.update_one(
        {"id": product_id},
        {"$set": {"approval_status": "APPROVED", "isActive": True, "approved_by": admin_user.get('id'), "approved_at": datetime.utcnow(), "rejection_reason": None, "updatedAt": datetime.utcnow()}}
    )
    return {"success": True, "message": "Product approved and live in B2B catalog"}


@router.post('/vendor-products/{product_id}/reject')
@require_role(["ADMIN", "SUB_ADMIN"])
async def admin_reject_product(
    product_id: str,
    rejection_reason: str,
    request: Request,
    admin_user: dict = Depends(get_current_user)
):
    """Admin: reject a vendor product."""
    from database import products_col
    product = await products_col.find_one({"id": product_id, "is_vendor_product": True})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    await products_col.update_one(
        {"id": product_id},
        {"$set": {"approval_status": "REJECTED", "isActive": False, "rejection_reason": rejection_reason, "updatedAt": datetime.utcnow()}}
    )
    return {"success": True, "message": "Product rejected"}


# ==================== ADMIN FINANCIAL OVERVIEW ====================

@router.get('/financial-overview')
@require_role(["ADMIN"])
async def admin_financial_overview(admin_user: dict = Depends(get_current_user)):
    """Admin: GMV, commission earned, total vendor payables."""
    from database import orders_col, vendor_ledger_col

    # GMV from all orders
    gmv_pipeline = [
        {"$match": {"status": {"$ne": "CANCELLED"}}},
        {"$group": {"_id": None, "gmv": {"$sum": "$total"}, "order_count": {"$sum": 1}}}
    ]
    gmv_data = await orders_col.aggregate(gmv_pipeline).to_list(1)
    gmv = gmv_data[0] if gmv_data else {"gmv": 0, "order_count": 0}

    # Vendor ledger totals (platform commission = gross - net across all vendors)
    ledger_pipeline = [
        {"$group": {
            "_id": None,
            "total_gross": {"$sum": "$gross_amount"},
            "total_net": {"$sum": {"$cond": [{"$eq": ["$type", "CREDIT"]}, "$net_amount", 0]}},
            "total_commission": {"$sum": "$commission_amount"},
            "total_paid_out": {"$sum": {"$cond": [{"$eq": ["$type", "DEBIT"]}, "$amount", 0]}}
        }}
    ]
    ledger_data = await vendor_ledger_col.aggregate(ledger_pipeline).to_list(1)
    ledger = ledger_data[0] if ledger_data else {}

    total_earned = ledger.get("total_net", 0)
    total_paid = ledger.get("total_paid_out", 0)
    total_payable = total_earned - total_paid

    return {
        "success": True,
        "data": {
            "gmv": round(gmv.get("gmv", 0), 2),
            "total_orders": gmv.get("order_count", 0),
            "platform_commission": round(ledger.get("total_commission", 0), 2),
            "vendor_total_earned": round(total_earned, 2),
            "vendor_total_paid": round(total_paid, 2),
            "vendor_total_payable": round(total_payable, 2)
        }
    }
