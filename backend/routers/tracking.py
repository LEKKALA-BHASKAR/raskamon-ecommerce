"""
Tracking API Router
Handles event ingestion, consent, pixel config, and recently-viewed data.
"""
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import base64
import uuid

from services.tracking_service import (
    track_event, merge_anonymous_to_user,
    get_user_profile, get_recently_viewed
)
from database import consent_col, pixel_config_col, tracking_events_col
from utils.helpers import serialize_doc

router = APIRouter()

# ── 1x1 transparent GIF for pixel tracking ───────────────────────────────
PIXEL_GIF = base64.b64decode(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
)

BOT_KEYWORDS = ["bot", "crawl", "spider", "slurp", "baidu", "yandex",
                 "facebookexternalhit", "twitterbot"]


def _is_bot(user_agent: str) -> bool:
    ua = user_agent.lower()
    return any(kw in ua for kw in BOT_KEYWORDS)


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else ""


class EventPayload(BaseModel):
    event: str
    sessionId: str
    userId: Optional[str] = None
    props: Dict[str, Any] = Field(default_factory=dict)


class ConsentPayload(BaseModel):
    sessionId: str
    userId: Optional[str] = None
    analytics: bool = True
    marketing: bool = True
    functional: bool = True


class MergePayload(BaseModel):
    sessionId: str
    userId: str


# ── Event ingestion ───────────────────────────────────────────────────────

@router.post("/events")
async def ingest_event(payload: EventPayload, request: Request):
    """Main tracking endpoint. Called from frontend for every behavioral event."""
    ua = request.headers.get("user-agent", "")
    if _is_bot(ua):
        return {"ok": True, "bot": True}

    # GDPR: check consent
    consent = await consent_col.find_one({"sessionId": payload.sessionId})
    if consent and not consent.get("analytics", True):
        return {"ok": True, "skipped": "no_consent"}

    ip = _get_client_ip(request)
    event_id = await track_event(
        event=payload.event,
        session_id=payload.sessionId,
        user_id=payload.userId,
        props=payload.props,
        ip=ip,
        user_agent=ua,
    )
    return {"ok": True, "eventId": event_id}


@router.post("/events/batch")
async def ingest_batch(events: List[EventPayload], request: Request):
    """Batch event ingestion — frontend queues events and flushes."""
    ua = request.headers.get("user-agent", "")
    ip = _get_client_ip(request)
    results = []
    for payload in events[:50]:  # hard cap at 50 per batch
        if _is_bot(ua):
            continue
        eid = await track_event(
            event=payload.event,
            session_id=payload.sessionId,
            user_id=payload.userId,
            props=payload.props,
            ip=ip,
            user_agent=ua,
        )
        results.append(eid)
    return {"ok": True, "count": len(results)}


@router.get("/pixel.gif")
async def tracking_pixel(
    e: str = "PAGE_VIEW",
    sid: str = "",
    uid: Optional[str] = None,
    pid: Optional[str] = None,
    request: Request = None,
):
    """1×1 GIF pixel — zero-JS tracking fallback."""
    if sid and not _is_bot(request.headers.get("user-agent", "")):
        props = {}
        if pid:
            props["productId"] = pid
        if request:
            props["referer"] = request.headers.get("referer", "")
        ua = request.headers.get("user-agent", "") if request else ""
        ip = _get_client_ip(request) if request else ""
        await track_event(e, sid, uid, props, ip, ua)

    return Response(
        content=PIXEL_GIF,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


# ── Identity merge ────────────────────────────────────────────────────────

@router.post("/merge")
async def merge_identity(payload: MergePayload):
    """Called after login/signup to merge anonymous events to user account."""
    await merge_anonymous_to_user(payload.sessionId, payload.userId)
    return {"ok": True}


# ── Consent (GDPR) ───────────────────────────────────────────────────────

@router.post("/consent")
async def save_consent(payload: ConsentPayload):
    doc = {
        "sessionId": payload.sessionId,
        "userId": payload.userId,
        "analytics": payload.analytics,
        "marketing": payload.marketing,
        "functional": payload.functional,
        "updatedAt": datetime.utcnow(),
    }
    await consent_col.update_one(
        {"sessionId": payload.sessionId},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True}


@router.get("/consent/{session_id}")
async def get_consent(session_id: str):
    doc = await consent_col.find_one({"sessionId": session_id})
    if not doc:
        return {"hasConsent": False}
    return {"hasConsent": True, **serialize_doc(doc)}


# ── User profile & recently viewed ───────────────────────────────────────

@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    profile = await get_user_profile(user_id)
    if not profile:
        return {"userId": user_id, "segment": "new_visitor", "engagementScore": 0}
    return profile


@router.get("/recently-viewed/{user_id}")
async def recently_viewed(user_id: str, limit: int = 10):
    products = await get_recently_viewed(user_id, limit)
    return {"products": products}


# ── Pixel configuration (for admin) ──────────────────────────────────────

@router.get("/pixel-config")
async def get_pixel_config():
    """Public-safe pixel config — only returns active pixel IDs (no secrets)."""
    configs = await pixel_config_col.find({"active": True}).to_list(20)
    safe = []
    for c in configs:
        safe.append({
            "platform": c.get("platform"),
            "pixelId": c.get("pixelId", ""),
            "active": True,
        })
    return {"pixels": safe}


# ── Analytics summary for admin ──────────────────────────────────────────

@router.get("/analytics/summary")
async def analytics_summary():
    now = datetime.utcnow()
    from datetime import timedelta
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)

    today_events = await tracking_events_col.count_documents({"ts": {"$gte": day_ago}})
    week_events = await tracking_events_col.count_documents({"ts": {"$gte": week_ago}})

    # Unique sessions today
    pipeline = [
        {"$match": {"ts": {"$gte": day_ago}}},
        {"$group": {"_id": "$sessionId"}},
        {"$count": "count"},
    ]
    res = [d async for d in tracking_events_col.aggregate(pipeline)]
    unique_sessions_today = res[0]["count"] if res else 0

    # Top events today
    top_pipeline = [
        {"$match": {"ts": {"$gte": day_ago}}},
        {"$group": {"_id": "$event", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]
    top_events = [d async for d in tracking_events_col.aggregate(top_pipeline)]

    # Top viewed products
    prod_pipeline = [
        {"$match": {"event": "PRODUCT_VIEW", "ts": {"$gte": week_ago}}},
        {"$group": {"_id": "$props.productId", "views": {"$sum": 1}}},
        {"$sort": {"views": -1}},
        {"$limit": 10},
    ]
    top_products = [d async for d in tracking_events_col.aggregate(prod_pipeline)]

    from database import abandoned_carts_col, audience_profiles_col
    abandoned_count = await abandoned_carts_col.count_documents({"status": "abandoned"})
    total_profiles = await audience_profiles_col.count_documents({})

    segment_pipeline = [
        {"$group": {"_id": "$segment", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    segments = [d async for d in audience_profiles_col.aggregate(segment_pipeline)]

    return {
        "todayEvents": today_events,
        "weekEvents": week_events,
        "uniqueSessionsToday": unique_sessions_today,
        "topEvents": top_events,
        "topProducts": top_products,
        "abandonedCarts": abandoned_count,
        "totalProfiles": total_profiles,
        "segmentBreakdown": segments,
    }
