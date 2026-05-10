"""
Admin Retargeting Router
Full campaign management, audience management, pixel config, analytics.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

from database import (
    retargeting_campaigns_col, audience_profiles_col, abandoned_carts_col,
    campaign_logs_col, pixel_config_col, tracking_events_col, user_sessions_col
)
from services.segment_service import get_segment_counts, get_segment_users, create_custom_segment
from services.campaign_service import get_campaign_analytics, seed_default_campaigns
from utils.helpers import serialize_doc
from middleware.rbac import require_role

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str
    trigger: str
    channels: List[str] = Field(default_factory=list)
    subject: str = ""
    body: str = ""
    status: str = "draft"
    frequencyCap: Dict[str, Any] = Field(default_factory=lambda: {"maxPerUser": 1, "windowDays": 1})
    priority: int = 5
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None
    channels: Optional[List[str]] = None
    frequencyCap: Optional[Dict[str, Any]] = None
    priority: Optional[int] = None


class PixelConfigCreate(BaseModel):
    platform: str  # facebook, google_ads, gtm, tiktok, custom
    pixelId: str
    accessToken: Optional[str] = None
    active: bool = True
    events: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SegmentCreate(BaseModel):
    name: str
    description: str = ""
    rules: Dict[str, Any] = Field(default_factory=dict)


# ── Campaigns ─────────────────────────────────────────────────────────────

@router.get("/campaigns")
async def list_campaigns():
    await seed_default_campaigns()
    campaigns = await retargeting_campaigns_col.find({}).sort("priority", -1).to_list(100)
    return {"campaigns": serialize_doc(campaigns)}


@router.post("/campaigns")
async def create_campaign(data: CampaignCreate):
    doc = {
        **data.dict(),
        "createdAt": datetime.utcnow(),
        "sentCount": 0,
        "clickCount": 0,
        "conversionCount": 0,
    }
    result = await retargeting_campaigns_col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return serialize_doc(doc)


@router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, data: CampaignUpdate):
    try:
        oid = ObjectId(campaign_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    update = {k: v for k, v in data.dict().items() if v is not None}
    update["updatedAt"] = datetime.utcnow()
    await retargeting_campaigns_col.update_one({"_id": oid}, {"$set": update})
    updated = await retargeting_campaigns_col.find_one({"_id": oid})
    return serialize_doc(updated)


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    try:
        oid = ObjectId(campaign_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    await retargeting_campaigns_col.delete_one({"_id": oid})
    return {"ok": True}


@router.get("/campaigns/{campaign_id}/analytics")
async def campaign_analytics(campaign_id: str):
    return await get_campaign_analytics(campaign_id)


@router.post("/campaigns/{campaign_id}/toggle")
async def toggle_campaign(campaign_id: str):
    try:
        oid = ObjectId(campaign_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
    campaign = await retargeting_campaigns_col.find_one({"_id": oid})
    if not campaign:
        raise HTTPException(status_code=404, detail="Not found")
    new_status = "active" if campaign.get("status") != "active" else "paused"
    await retargeting_campaigns_col.update_one({"_id": oid}, {"$set": {"status": new_status}})
    return {"status": new_status}


# ── Audience Segments ─────────────────────────────────────────────────────

@router.get("/segments")
async def list_segments():
    segments = await get_segment_counts()
    return {"segments": segments}


@router.get("/segments/{segment_id}/users")
async def segment_users(segment_id: str, limit: int = 50, skip: int = 0):
    return await get_segment_users(segment_id, limit, skip)


@router.post("/segments")
async def create_segment(data: SegmentCreate):
    return await create_custom_segment(data.name, data.description, data.rules)


# ── Audience Profiles ─────────────────────────────────────────────────────

@router.get("/profiles")
async def list_profiles(
    segment: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    sort_by: str = "engagementScore",
):
    query = {}
    if segment:
        query["segment"] = segment
    profiles = await audience_profiles_col.find(query).sort(
        sort_by, -1
    ).skip(skip).limit(limit).to_list(limit)
    total = await audience_profiles_col.count_documents(query)
    return {"profiles": serialize_doc(profiles), "total": total}


@router.get("/profiles/{user_id}")
async def get_profile(user_id: str):
    profile = await audience_profiles_col.find_one({"userId": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return serialize_doc(profile)


# ── Abandoned Carts ───────────────────────────────────────────────────────

@router.get("/abandoned-carts")
async def list_abandoned_carts(
    status: str = "abandoned",
    limit: int = 50,
    skip: int = 0,
):
    carts = await abandoned_carts_col.find(
        {"status": status}
    ).sort("createdAt", -1).skip(skip).limit(limit).to_list(limit)
    total = await abandoned_carts_col.count_documents({"status": status})
    total_value = 0
    async for c in abandoned_carts_col.find({"status": "abandoned"}, {"cartValue": 1}):
        total_value += c.get("cartValue", 0)
    return {
        "carts": serialize_doc(carts),
        "total": total,
        "totalValue": total_value,
    }


# ── Pixel Configuration ───────────────────────────────────────────────────

@router.get("/pixels")
async def list_pixels():
    configs = await pixel_config_col.find({}).to_list(20)
    return {"pixels": serialize_doc(configs)}


@router.post("/pixels")
async def save_pixel(data: PixelConfigCreate):
    doc = {**data.dict(), "updatedAt": datetime.utcnow()}
    await pixel_config_col.update_one(
        {"platform": data.platform},
        {"$set": doc},
        upsert=True,
    )
    saved = await pixel_config_col.find_one({"platform": data.platform})
    return serialize_doc(saved)


@router.delete("/pixels/{platform}")
async def delete_pixel(platform: str):
    await pixel_config_col.delete_one({"platform": platform})
    return {"ok": True}


# ── Funnel Analytics ──────────────────────────────────────────────────────

@router.get("/analytics/funnel")
async def funnel_analytics(days: int = 7):
    from datetime import timedelta
    since = datetime.utcnow() - timedelta(days=days)
    funnel_events = ["PAGE_VIEW", "PRODUCT_VIEW", "ADD_TO_CART", "BEGIN_CHECKOUT", "PURCHASE"]
    funnel = []
    for event in funnel_events:
        count_pipeline = [
            {"$match": {"event": event, "ts": {"$gte": since}}},
            {"$group": {"_id": "$sessionId"}},
            {"$count": "count"},
        ]
        res = [d async for d in tracking_events_col.aggregate(count_pipeline)]
        funnel.append({"event": event, "sessions": res[0]["count"] if res else 0})
    return {"funnel": funnel, "days": days}


@router.get("/analytics/overview")
async def analytics_overview(days: int = 30):
    from datetime import timedelta
    since = datetime.utcnow() - timedelta(days=days)

    # Daily event volume
    daily_pipeline = [
        {"$match": {"ts": {"$gte": since}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}},
            "events": {"$sum": 1},
            "sessions": {"$addToSet": "$sessionId"},
        }},
        {"$sort": {"_id": 1}},
    ]
    daily = [
        {"date": d["_id"], "events": d["events"], "sessions": len(d["sessions"])}
        async for d in tracking_events_col.aggregate(daily_pipeline)
    ]

    # Device breakdown
    device_pipeline = [
        {"$match": {"ts": {"$gte": since}}},
        {"$group": {"_id": "$device", "count": {"$sum": 1}}},
    ]
    devices = [d async for d in user_sessions_col.aggregate(device_pipeline)]

    # Campaigns performance
    camp_pipeline = [
        {"$match": {"createdAt": {"$gte": since}}},
        {"$group": {
            "_id": "$campaignId",
            "sent": {"$sum": 1},
            "opened": {"$sum": {"$cond": ["$opened", 1, 0]}},
            "clicked": {"$sum": {"$cond": ["$clicked", 1, 0]}},
            "converted": {"$sum": {"$cond": ["$converted", 1, 0]}},
        }},
    ]
    camp_stats = [d async for d in campaign_logs_col.aggregate(camp_pipeline)]

    abandoned_total = await abandoned_carts_col.count_documents({"status": "abandoned"})
    recovered_total = await abandoned_carts_col.count_documents({"status": "recovered"})

    return {
        "daily": daily,
        "devices": devices,
        "campaignStats": camp_stats,
        "abandonedCarts": abandoned_total,
        "recoveredCarts": recovered_total,
        "recoveryRate": round(recovered_total / (abandoned_total + recovered_total) * 100, 2)
        if (abandoned_total + recovered_total) > 0 else 0,
    }


# ── Campaign Logs ─────────────────────────────────────────────────────────

@router.get("/logs")
async def list_campaign_logs(campaign_id: Optional[str] = None, limit: int = 100):
    query = {}
    if campaign_id:
        query["campaignId"] = campaign_id
    logs = await campaign_logs_col.find(query).sort("sentAt", -1).limit(limit).to_list(limit)
    return {"logs": serialize_doc(logs)}
