"""
Vendor Analytics Router
Vendors see analytics ONLY for their own products and orders.
Strict data isolation — no cross-vendor data leakage.
"""

from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta
from typing import Optional

from database import products_col, orders_col, vendor_ledger_col
from utils.security import get_current_user
from utils.helpers import serialize_doc

router = APIRouter()


async def get_approved_vendor_id(current_user: dict) -> str:
    from fastapi import HTTPException
    from database import users_col
    if current_user.get('role') != 'VENDOR':
        raise HTTPException(status_code=403, detail="Vendor access required")
    user = await users_col.find_one({"id": current_user['id']})
    vp = user.get('vendor_profile', {}) if user else {}
    if vp.get('approval_status') != 'APPROVED':
        raise HTTPException(status_code=403, detail="Vendor account not approved")
    return vp['vendor_id']


@router.get('/overview')
async def vendor_overview(current_user: dict = Depends(get_current_user)):
    """Summary stats: total products, total orders, total revenue, pending balance."""
    vendor_id = await get_approved_vendor_id(current_user)

    # Product counts
    total_products = await products_col.count_documents({"vendor_id": vendor_id, "isDeleted": False})
    active_products = await products_col.count_documents({"vendor_id": vendor_id, "isActive": True, "isDeleted": False})
    pending_products = await products_col.count_documents({"vendor_id": vendor_id, "approval_status": "PENDING", "isDeleted": False})

    # Orders containing vendor's products
    order_pipeline = [
        {"$match": {"items.vendor_id": vendor_id, "status": {"$ne": "CANCELLED"}}},
        {"$unwind": "$items"},
        {"$match": {"items.vendor_id": vendor_id}},
        {"$group": {
            "_id": None,
            "total_orders": {"$addToSet": "$_id"},
            "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}},
            "total_items_sold": {"$sum": "$items.quantity"}
        }}
    ]
    order_stats = await orders_col.aggregate(order_pipeline).to_list(1)
    stats = order_stats[0] if order_stats else {}

    # Ledger balance
    ledger_pipeline = [
        {"$match": {"vendor_id": vendor_id}},
        {"$group": {
            "_id": None,
            "total_earned": {"$sum": {"$cond": [{"$eq": ["$type", "CREDIT"]}, "$amount", 0]}},
            "total_paid": {"$sum": {"$cond": [{"$eq": ["$type", "DEBIT"]}, "$amount", 0]}}
        }}
    ]
    ledger = await vendor_ledger_col.aggregate(ledger_pipeline).to_list(1)
    ledger_data = ledger[0] if ledger else {"total_earned": 0, "total_paid": 0}
    pending_balance = ledger_data.get("total_earned", 0) - ledger_data.get("total_paid", 0)

    # Low stock alert
    low_stock = await products_col.count_documents({
        "vendor_id": vendor_id,
        "isDeleted": False,
        "isActive": True,
        "$expr": {"$lte": ["$stock", "$low_stock_threshold"]}
    })

    return {
        "success": True,
        "data": {
            "products": {
                "total": total_products,
                "active": active_products,
                "pending_approval": pending_products,
                "low_stock": low_stock
            },
            "orders": {
                "total_orders": len(stats.get("total_orders", [])),
                "total_items_sold": stats.get("total_items_sold", 0),
                "total_revenue": round(stats.get("total_revenue", 0), 2)
            },
            "financials": {
                "total_earned": round(ledger_data.get("total_earned", 0), 2),
                "total_paid_out": round(ledger_data.get("total_paid", 0), 2),
                "pending_balance": round(pending_balance, 2)
            }
        }
    }


@router.get('/sales')
async def vendor_sales_chart(
    period: str = Query('30d', enum=['7d', '30d', '90d', '1y']),
    current_user: dict = Depends(get_current_user)
):
    """Sales revenue over time for chart display."""
    vendor_id = await get_approved_vendor_id(current_user)

    days_map = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}
    days = days_map[period]
    start_date = datetime.utcnow() - timedelta(days=days)

    pipeline = [
        {"$match": {
            "items.vendor_id": vendor_id,
            "status": {"$ne": "CANCELLED"},
            "createdAt": {"$gte": start_date}
        }},
        {"$unwind": "$items"},
        {"$match": {"items.vendor_id": vendor_id}},
        {"$group": {
            "_id": {
                "year": {"$year": "$createdAt"},
                "month": {"$month": "$createdAt"},
                "day": {"$dayOfMonth": "$createdAt"}
            },
            "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}},
            "orders": {"$addToSet": "$_id"},
            "items_sold": {"$sum": "$items.quantity"}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
    ]

    results = await orders_col.aggregate(pipeline).to_list(400)
    chart_data = [
        {
            "date": f"{r['_id']['year']}-{r['_id']['month']:02d}-{r['_id']['day']:02d}",
            "revenue": round(r["revenue"], 2),
            "orders": len(r["orders"]),
            "items_sold": r["items_sold"]
        }
        for r in results
    ]

    return {"success": True, "data": chart_data, "period": period}


@router.get('/top-products')
async def vendor_top_products(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Top performing products by revenue."""
    vendor_id = await get_approved_vendor_id(current_user)

    pipeline = [
        {"$match": {"items.vendor_id": vendor_id, "status": {"$ne": "CANCELLED"}}},
        {"$unwind": "$items"},
        {"$match": {"items.vendor_id": vendor_id}},
        {"$group": {
            "_id": "$items.product",
            "product_name": {"$first": "$items.name"},
            "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}},
            "total_units": {"$sum": "$items.quantity"},
            "order_count": {"$sum": 1}
        }},
        {"$sort": {"total_revenue": -1}},
        {"$limit": limit}
    ]

    results = await orders_col.aggregate(pipeline).to_list(limit)
    return {"success": True, "data": results}


@router.get('/orders')
async def vendor_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List orders that include vendor's products. Vendor sees ONLY their items."""
    vendor_id = await get_approved_vendor_id(current_user)

    match = {"items.vendor_id": vendor_id}
    if status:
        match["status"] = status

    skip = (page - 1) * limit
    total = await orders_col.count_documents(match)

    pipeline = [
        {"$match": match},
        {"$sort": {"createdAt": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {"$project": {
            "id": 1,
            "userName": 1,
            "status": 1,
            "createdAt": 1,
            "total": 1,
            "paymentMethod": 1,
            # Only show this vendor's items
            "items": {
                "$filter": {
                    "input": "$items",
                    "as": "item",
                    "cond": {"$eq": ["$$item.vendor_id", vendor_id]}
                }
            }
        }}
    ]

    orders = await orders_col.aggregate(pipeline).to_list(limit)

    return {
        "success": True,
        "data": serialize_doc(orders),
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}
    }
