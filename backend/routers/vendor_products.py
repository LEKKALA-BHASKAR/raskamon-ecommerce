"""
Vendor Product Management Router
Vendors can CRUD their own products with strict row-level isolation.
Dual pricing: b2b_retail_price (for B2B buyers) and b2b_vendor_price (cross-vendor wholesale).
All vendor products have visibility=b2b_only and require admin approval before going live.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import re

from database import products_col, users_col
from utils.security import get_current_user
from utils.audit import get_audit_logger
from utils.helpers import serialize_doc, paginate

router = APIRouter()


# ==================== HELPERS ====================

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text


async def get_approved_vendor(current_user: dict) -> dict:
    """Ensure caller is an approved vendor. Returns vendor user doc."""
    if current_user.get('role') != 'VENDOR':
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Vendor access required"})
    user = await users_col.find_one({"id": current_user['id']})
    if not user:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vp = user.get('vendor_profile', {})
    if vp.get('approval_status') != 'APPROVED':
        raise HTTPException(status_code=403, detail={"code": "VENDOR_NOT_APPROVED", "message": "Your vendor account is pending approval"})
    return user


# ==================== REQUEST MODELS ====================

class VendorProductCreate(BaseModel):
    name: str
    description: str
    category: str
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    sku: Optional[str] = None
    # Dual pricing (mandatory for vendor products)
    b2b_retail_price: float        # Price shown to B2B buyers
    b2b_vendor_price: float        # Wholesale price for other vendors
    mrp: Optional[float] = None    # Maximum retail price (for display)
    # Inventory
    stock: int = 0
    low_stock_threshold: int = 10
    # Meta
    tags: Optional[List[str]] = []
    images: Optional[List[str]] = []  # Cloudinary URLs
    weight: Optional[float] = None
    dimensions: Optional[dict] = None
    # MOQ
    min_order_qty: int = 1
    # Tax
    gst_rate: float = 18.0


class VendorProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    b2b_retail_price: Optional[float] = None
    b2b_vendor_price: Optional[float] = None
    mrp: Optional[float] = None
    stock: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    tags: Optional[List[str]] = None
    images: Optional[List[str]] = None
    weight: Optional[float] = None
    dimensions: Optional[dict] = None
    min_order_qty: Optional[int] = None
    gst_rate: Optional[float] = None


# ==================== VENDOR PRODUCT CRUD ====================

@router.post('')
@router.post('/')
async def create_vendor_product(
    data: VendorProductCreate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Create a new vendor product. Requires admin approval before going live."""
    vendor_user = await get_approved_vendor(current_user)
    vp = vendor_user['vendor_profile']

    if data.b2b_vendor_price >= data.b2b_retail_price:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_PRICING", "message": "Vendor wholesale price must be less than retail price"}
        )

    product_id = f"vprd_{uuid.uuid4().hex[:16]}"
    base_slug = slugify(data.name)
    slug = base_slug
    # Ensure unique slug
    counter = 1
    while await products_col.find_one({"slug": slug}):
        slug = f"{base_slug}-{counter}"
        counter += 1

    product_doc = {
        "id": product_id,
        "name": data.name,
        "slug": slug,
        "description": data.description,
        "category": data.category,
        "subcategory": data.subcategory,
        "brand": data.brand or vp.get('business_name'),
        "sku": data.sku or product_id,
        "tags": data.tags or [],
        "images": data.images or [],

        # Pricing — dual price isolation
        "b2b_retail_price": data.b2b_retail_price,
        "b2b_vendor_price": data.b2b_vendor_price,
        "mrp": data.mrp or data.b2b_retail_price,
        "discountPrice": data.b2b_retail_price,  # legacy compat

        # Inventory
        "stock": data.stock,
        "low_stock_threshold": data.low_stock_threshold,
        "in_stock": data.stock > 0,

        # Vendor info (IMMUTABLE after creation)
        "vendor_id": vp['vendor_id'],
        "vendor_user_id": vendor_user['id'],
        "vendor_name": vp['store_name'],
        "is_vendor_product": True,

        # B2B-only visibility (CRITICAL)
        "visibility": "b2b_only",
        "b2c_visible": False,
        "b2b_visible": True,

        # Approval — product must be approved by admin before showing in catalog
        "approval_status": "PENDING",  # PENDING | APPROVED | REJECTED
        "approved_by": None,
        "approved_at": None,
        "rejection_reason": None,

        # MOQ & Tax
        "min_order_qty": data.min_order_qty,
        "gst_rate": data.gst_rate,
        "weight": data.weight,
        "dimensions": data.dimensions,

        # Standard flags
        "isActive": False,  # Goes live only after APPROVED
        "isDeleted": False,
        "isFeatured": False,
        "rating": 0.0,
        "reviewCount": 0,

        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
    }

    await products_col.insert_one(product_doc)

    audit_logger = get_audit_logger()
    await audit_logger.log_action(
        user_id=current_user['id'],
        user_email=current_user.get('email'),
        user_role='VENDOR',
        action="VENDOR_PRODUCT_CREATED",
        entity_type="PRODUCT",
        entity_id=product_id,
        entity_name=data.name,
        changes={"slug": slug, "b2b_retail_price": data.b2b_retail_price},
        description=f"Vendor {vp['store_name']} created product: {data.name}",
        severity="INFO",
        category="PRODUCT_MANAGEMENT",
        user_ip=request.client.host if request else None
    )

    return {
        "success": True,
        "message": "Product submitted for admin approval. It will go live once approved.",
        "data": serialize_doc(product_doc)
    }


@router.get('')
@router.get('/')
async def list_vendor_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    approval_status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List vendor's own products only. Strict isolation — vendor sees ONLY their products."""
    vendor_user = await get_approved_vendor(current_user)
    vendor_id = vendor_user['vendor_profile']['vendor_id']

    query = {"vendor_id": vendor_id, "isDeleted": False}
    if approval_status:
        query["approval_status"] = approval_status
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}}
        ]

    skip, lim = paginate(page, limit)
    total = await products_col.count_documents(query)
    products = await products_col.find(query).sort("createdAt", -1).skip(skip).limit(lim).to_list(lim)

    return {
        "success": True,
        "data": serialize_doc(products),
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + lim - 1) // lim}
    }


@router.get('/{product_id}')
async def get_vendor_product(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a single vendor product. Only the owning vendor can access."""
    vendor_user = await get_approved_vendor(current_user)
    vendor_id = vendor_user['vendor_profile']['vendor_id']

    product = await products_col.find_one({"id": product_id, "vendor_id": vendor_id, "isDeleted": False})
    if not product:
        raise HTTPException(status_code=404, detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found"})

    return {"success": True, "data": serialize_doc(product)}


@router.put('/{product_id}')
async def update_vendor_product(
    product_id: str,
    data: VendorProductUpdate,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Update a vendor product. Only the owning vendor can update."""
    vendor_user = await get_approved_vendor(current_user)
    vendor_id = vendor_user['vendor_profile']['vendor_id']

    product = await products_col.find_one({"id": product_id, "vendor_id": vendor_id, "isDeleted": False})
    if not product:
        raise HTTPException(status_code=404, detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found"})

    update_fields = {k: v for k, v in data.dict(exclude_none=True).items()}

    # Price validation
    new_retail = update_fields.get('b2b_retail_price', product.get('b2b_retail_price', 0))
    new_vendor = update_fields.get('b2b_vendor_price', product.get('b2b_vendor_price', 0))
    if new_vendor >= new_retail:
        raise HTTPException(status_code=400, detail={"code": "INVALID_PRICING", "message": "Vendor wholesale price must be less than retail price"})

    if 'b2b_retail_price' in update_fields:
        update_fields['discountPrice'] = update_fields['b2b_retail_price']
    if 'stock' in update_fields:
        update_fields['in_stock'] = update_fields['stock'] > 0

    # Editing a product re-triggers approval if it was approved
    if product.get('approval_status') == 'APPROVED':
        update_fields['approval_status'] = 'PENDING'
        update_fields['isActive'] = False
        update_fields['approved_by'] = None
        update_fields['approved_at'] = None

    update_fields['updatedAt'] = datetime.utcnow()

    await products_col.update_one({"id": product_id}, {"$set": update_fields})

    return {"success": True, "message": "Product updated and re-submitted for approval"}


@router.delete('/{product_id}')
async def delete_vendor_product(
    product_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Soft-delete a vendor product."""
    vendor_user = await get_approved_vendor(current_user)
    vendor_id = vendor_user['vendor_profile']['vendor_id']

    product = await products_col.find_one({"id": product_id, "vendor_id": vendor_id, "isDeleted": False})
    if not product:
        raise HTTPException(status_code=404, detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found"})

    await products_col.update_one(
        {"id": product_id},
        {"$set": {"isDeleted": True, "isActive": False, "updatedAt": datetime.utcnow()}}
    )

    return {"success": True, "message": "Product deleted successfully"}


# ==================== ADMIN PRODUCT MODERATION ====================

@router.get('/admin/pending')
async def admin_get_pending_vendor_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    vendor_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Admin: list all pending vendor products for moderation."""
    if current_user.get('role') not in ['ADMIN', 'SUB_ADMIN']:
        raise HTTPException(status_code=403, detail="Admin access required")

    query = {"is_vendor_product": True, "approval_status": "PENDING", "isDeleted": False}
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


@router.post('/admin/{product_id}/approve')
async def admin_approve_vendor_product(
    product_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Admin: approve a vendor product listing."""
    if current_user.get('role') not in ['ADMIN', 'SUB_ADMIN']:
        raise HTTPException(status_code=403, detail="Admin access required")

    product = await products_col.find_one({"id": product_id, "is_vendor_product": True})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await products_col.update_one(
        {"id": product_id},
        {"$set": {
            "approval_status": "APPROVED",
            "isActive": True,
            "approved_by": current_user['id'],
            "approved_at": datetime.utcnow(),
            "rejection_reason": None,
            "updatedAt": datetime.utcnow()
        }}
    )

    return {"success": True, "message": "Product approved and is now live in B2B catalog"}


@router.post('/admin/{product_id}/reject')
async def admin_reject_vendor_product(
    product_id: str,
    rejection_reason: str,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Admin: reject a vendor product listing."""
    if current_user.get('role') not in ['ADMIN', 'SUB_ADMIN']:
        raise HTTPException(status_code=403, detail="Admin access required")

    product = await products_col.find_one({"id": product_id, "is_vendor_product": True})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await products_col.update_one(
        {"id": product_id},
        {"$set": {
            "approval_status": "REJECTED",
            "isActive": False,
            "rejection_reason": rejection_reason,
            "updatedAt": datetime.utcnow()
        }}
    )

    return {"success": True, "message": "Product rejected"}
