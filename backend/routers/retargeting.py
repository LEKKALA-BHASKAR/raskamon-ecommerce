"""
Retargeting Router — public + user-facing endpoints.
Admin CRUD is in admin_retargeting.py.
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime
from database import (
    abandoned_carts_col, notifications_col, campaign_logs_col, retargeting_campaigns_col
)
from utils.helpers import serialize_doc
from bson import ObjectId

router = APIRouter()


@router.get("/abandoned-cart/{user_id}")
async def get_abandoned_cart(user_id: str):
    """Return most recent abandoned cart for a user (for popup display)."""
    cart = await abandoned_carts_col.find_one(
        {"userId": user_id, "status": "abandoned"},
        sort=[("createdAt", -1)],
    )
    if not cart:
        return {"hasAbandonedCart": False}
    return {"hasAbandonedCart": True, "cart": serialize_doc(cart)}


@router.post("/abandoned-cart/{user_id}/dismiss")
async def dismiss_abandoned_cart(user_id: str):
    """User explicitly dismissed the cart popup."""
    await abandoned_carts_col.update_many(
        {"userId": user_id, "status": "abandoned"},
        {"$set": {"status": "dismissed", "dismissedAt": datetime.utcnow()}},
    )
    return {"ok": True}


@router.get("/notifications/{user_id}")
async def get_notifications(user_id: str, limit: int = 20, unread_only: bool = False):
    query = {"userId": user_id, "type": "retargeting"}
    if unread_only:
        query["read"] = False
    notifications = await notifications_col.find(query).sort(
        "createdAt", -1
    ).limit(limit).to_list(limit)
    unread_count = await notifications_col.count_documents({
        "userId": user_id, "type": "retargeting", "read": False
    })
    return {
        "notifications": serialize_doc(notifications),
        "unreadCount": unread_count,
    }


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    try:
        oid = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    await notifications_col.update_one(
        {"_id": oid},
        {"$set": {"read": True, "readAt": datetime.utcnow()}},
    )
    # Update campaign log click
    notif = await notifications_col.find_one({"_id": oid})
    if notif and notif.get("campaignId"):
        await campaign_logs_col.update_one(
            {"campaignId": notif["campaignId"], "userId": notif.get("userId")},
            {"$set": {"opened": True, "openedAt": datetime.utcnow()}},
            sort=[("sentAt", -1)],
        )
        await retargeting_campaigns_col.update_one(
            {"_id": ObjectId(notif["campaignId"]) if len(notif["campaignId"]) == 24 else None},
            {"$inc": {"clickCount": 1}},
        ) if len(notif.get("campaignId", "")) == 24 else None
    return {"ok": True}


@router.post("/track-conversion/{user_id}")
async def track_conversion(user_id: str, order_id: str):
    """Called on successful purchase to mark campaign conversions."""
    from services.tracking_service import mark_cart_recovered
    await mark_cart_recovered(user_id)

    # Mark recent campaign logs as converted
    await campaign_logs_col.update_many(
        {"userId": user_id, "converted": False},
        {"$set": {"converted": True, "convertedAt": datetime.utcnow(),
                  "conversionOrderId": order_id}},
    )
    return {"ok": True}


@router.get("/campaigns/active")
async def get_active_campaigns():
    """Active campaigns list (for admin preview)."""
    campaigns = await retargeting_campaigns_col.find(
        {"status": "active"},
        {"name": 1, "trigger": 1, "channels": 1, "sentCount": 1,
         "clickCount": 1, "conversionCount": 1}
    ).to_list(50)
    return {"campaigns": serialize_doc(campaigns)}
