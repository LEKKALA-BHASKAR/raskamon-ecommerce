"""
B2B Catalog Router
B2B buyers and vendors can browse vendor products with role-appropriate pricing.
Regular B2C users NEVER see these products — enforced at the query level.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import Optional
from datetime import datetime

from database import products_col, orders_col, reviews_col
from utils.security import get_current_user
from utils.helpers import serialize_doc, paginate

router = APIRouter()


def get_b2b_price_projection(role: str) -> dict:
    """
    Returns the MongoDB projection that strips the price not meant for this role.
    B2B_BUYER  → sees b2b_retail_price (not b2b_vendor_price)
    VENDOR     → sees b2b_vendor_price (wholesale, not retail)
    ADMIN      → sees both
    """
    if role in ('ADMIN', 'SUB_ADMIN'):
        return {}  # No projection filter — admins see all fields

    # Never expose B2C pricing fields in B2B context
    base_exclude = {'discountPrice': 0, 'b2c_visible': 0}

    if role == 'VENDOR':
        # Vendors buying from other vendors get wholesale price
        return {**base_exclude, 'b2b_retail_price': 0}
    else:
        # B2B_BUYER gets retail B2B price
        return {**base_exclude, 'b2b_vendor_price': 0}


async def require_b2b_access(current_user: dict):
    """Only approved B2B buyers, approved vendors, and admins can access the B2B catalog."""
    role = current_user.get('role')
    if role in ('ADMIN', 'SUB_ADMIN'):
        return current_user
    if role == 'B2B_BUYER':
        # B2B status is embedded in the JWT — additional DB check for safety
        from database import users_col
        user = await users_col.find_one({"id": current_user['id']})
        if not user or user.get('b2b_profile', {}).get('approval_status') != 'APPROVED':
            raise HTTPException(status_code=403, detail={"code": "B2B_NOT_APPROVED", "message": "B2B account not approved"})
        return current_user
    if role == 'VENDOR':
        from database import users_col
        user = await users_col.find_one({"id": current_user['id']})
        if not user or user.get('vendor_profile', {}).get('approval_status') != 'APPROVED':
            raise HTTPException(status_code=403, detail={"code": "VENDOR_NOT_APPROVED", "message": "Vendor account not approved"})
        return current_user
    raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "B2B access required. Please register as a B2B buyer."})


@router.get('/products')
async def list_b2b_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=48),
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    vendor_id: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = Query('newest', enum=['newest', 'price_asc', 'price_desc', 'rating']),
    current_user: dict = Depends(get_current_user)
):
    """
    List all approved B2B-only vendor products.
    Price shown depends on caller role (B2B buyer vs cross-vendor).
    """
    await require_b2b_access(current_user)
    role = current_user.get('role')

    # CRITICAL: Only show b2b_only active approved products
    query = {
        "isActive": True,
        "isDeleted": {"$ne": True},
        "visibility": "b2b_only",
        "approval_status": "APPROVED",
        "is_vendor_product": True
    }

    if category:
        query["category"] = category
    if subcategory:
        query["subcategory"] = subcategory
    if vendor_id:
        query["vendor_id"] = vendor_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}}
        ]

    # Price filter on the relevant price field
    price_field = "b2b_vendor_price" if role == 'VENDOR' else "b2b_retail_price"
    if min_price is not None or max_price is not None:
        price_filter = {}
        if min_price is not None:
            price_filter["$gte"] = min_price
        if max_price is not None:
            price_filter["$lte"] = max_price
        query[price_field] = price_filter

    sort_map = {
        "newest": [("createdAt", -1)],
        "price_asc": [(price_field, 1)],
        "price_desc": [(price_field, -1)],
        "rating": [("rating", -1)]
    }
    sort_option = sort_map.get(sort, [("createdAt", -1)])

    projection = get_b2b_price_projection(role)
    skip, lim = paginate(page, limit)
    total = await products_col.count_documents(query)
    products = await products_col.find(query, projection or None).sort(sort_option).skip(skip).limit(lim).to_list(lim)

    return {
        "success": True,
        "data": serialize_doc(products),
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + lim - 1) // lim},
        "price_type": "wholesale" if role == 'VENDOR' else "b2b_retail"
    }


@router.get('/products/{slug}')
async def get_b2b_product_detail(
    slug: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get B2B product detail with role-appropriate price.
    Includes reviews and stock level.
    """
    await require_b2b_access(current_user)
    role = current_user.get('role')

    query = {
        "slug": slug,
        "isActive": True,
        "isDeleted": {"$ne": True},
        "visibility": "b2b_only",
        "approval_status": "APPROVED"
    }

    product = await products_col.find_one(query)
    if not product:
        raise HTTPException(status_code=404, detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found in B2B catalog"})

    # Strip wrong price
    product_data = serialize_doc(product)
    if role == 'VENDOR':
        product_data.pop('b2b_retail_price', None)
        product_data['price'] = product_data.get('b2b_vendor_price')
        product_data['price_type'] = 'wholesale'
    else:
        product_data.pop('b2b_vendor_price', None)
        product_data['price'] = product_data.get('b2b_retail_price')
        product_data['price_type'] = 'b2b_retail'

    # Get reviews
    reviews = await reviews_col.find({"product": str(product['_id'])}).sort("createdAt", -1).limit(5).to_list(5)
    product_data['reviews'] = serialize_doc(reviews)

    return {"success": True, "data": product_data}


@router.get('/categories')
async def get_b2b_categories(
    current_user: dict = Depends(get_current_user)
):
    """Get distinct categories that have active B2B products."""
    await require_b2b_access(current_user)

    pipeline = [
        {"$match": {"isActive": True, "visibility": "b2b_only", "approval_status": "APPROVED", "isDeleted": {"$ne": True}}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    cats = await products_col.aggregate(pipeline).to_list(50)
    return {"success": True, "data": [{"category": c["_id"], "product_count": c["count"]} for c in cats]}


@router.get('/vendors')
async def list_b2b_vendors(
    current_user: dict = Depends(get_current_user)
):
    """List vendors that have active B2B products in the catalog."""
    await require_b2b_access(current_user)

    pipeline = [
        {"$match": {"isActive": True, "visibility": "b2b_only", "approval_status": "APPROVED", "isDeleted": {"$ne": True}}},
        {"$group": {
            "_id": "$vendor_id",
            "vendor_name": {"$first": "$vendor_name"},
            "product_count": {"$sum": 1}
        }},
        {"$sort": {"product_count": -1}}
    ]
    vendors = await products_col.aggregate(pipeline).to_list(100)
    return {"success": True, "data": [{"vendor_id": v["_id"], "vendor_name": v["vendor_name"], "product_count": v["product_count"]} for v in vendors]}
