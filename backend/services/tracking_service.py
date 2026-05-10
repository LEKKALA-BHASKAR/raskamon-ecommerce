"""
Behavioral Tracking Service
Handles all user event ingestion, session management, and profile computation.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import hashlib
import uuid
import asyncio
from database import (
    tracking_events_col, user_sessions_col, audience_profiles_col,
    abandoned_carts_col, products_col, orders_col
)
from utils.helpers import serialize_doc

# ── Event types ───────────────────────────────────────────────────────────
EVENTS = {
    "PAGE_VIEW", "PRODUCT_VIEW", "CATEGORY_VIEW", "SEARCH",
    "ADD_TO_CART", "REMOVE_FROM_CART", "BEGIN_CHECKOUT",
    "CHECKOUT_STEP", "PURCHASE", "WISHLIST_ADD", "WISHLIST_REMOVE",
    "CLICK", "SCROLL", "SESSION_START", "SESSION_END",
}

# ── Scoring weights ───────────────────────────────────────────────────────
EVENT_SCORES = {
    "PURCHASE": 100,
    "BEGIN_CHECKOUT": 60,
    "ADD_TO_CART": 40,
    "PRODUCT_VIEW": 10,
    "WISHLIST_ADD": 20,
    "CATEGORY_VIEW": 5,
    "SEARCH": 8,
    "PAGE_VIEW": 2,
}

# ── Segment thresholds ────────────────────────────────────────────────────
def compute_segment(score: int, has_purchase: bool, cart_abandoned: bool,
                    days_inactive: int, visit_count: int) -> str:
    if has_purchase and score >= 200:
        return "repeat_customer"
    if has_purchase:
        return "existing_customer"
    if cart_abandoned and score >= 60:
        return "hot_lead"
    if score >= 100:
        return "high_intent"
    if days_inactive > 30:
        return "inactive"
    if visit_count >= 5:
        return "cold_lead"
    return "new_visitor"


async def track_event(
    event: str,
    session_id: str,
    user_id: Optional[str],
    props: Dict[str, Any],
    ip: str = "",
    user_agent: str = "",
) -> str:
    """Ingest a single tracking event. Returns event_id."""
    if event not in EVENTS:
        event = "PAGE_VIEW"

    event_doc = {
        "eventId": str(uuid.uuid4()),
        "event": event,
        "sessionId": session_id,
        "userId": user_id,
        "props": props,
        "ip": _hash_ip(ip),  # hashed for privacy
        "userAgent": user_agent[:300] if user_agent else "",
        "ts": datetime.utcnow(),
    }
    await tracking_events_col.insert_one(event_doc)

    # Update session
    await _upsert_session(session_id, user_id, event, props, ip, user_agent)

    # Async profile update (non-blocking)
    if user_id:
        asyncio.create_task(_update_audience_profile(user_id))

    # Detect cart abandonment
    if event == "BEGIN_CHECKOUT":
        asyncio.create_task(_snapshot_abandoned_cart(session_id, user_id, props))

    return event_doc["eventId"]


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()[:16] if ip else ""


async def _upsert_session(session_id: str, user_id: Optional[str], event: str,
                          props: Dict, ip: str, user_agent: str):
    now = datetime.utcnow()
    update = {
        "$set": {
            "lastSeen": now,
            "lastEvent": event,
        },
        "$setOnInsert": {
            "sessionId": session_id,
            "startedAt": now,
            "ip": ip[:50] if ip else "",
            "userAgent": user_agent[:300] if user_agent else "",
            "device": _detect_device(user_agent),
        },
        "$addToSet": {},
        "$inc": {"eventCount": 1},
    }
    if user_id:
        update["$set"]["userId"] = user_id
    await user_sessions_col.update_one(
        {"sessionId": session_id}, update, upsert=True
    )


def _detect_device(ua: str) -> str:
    ua_lower = ua.lower()
    if "mobile" in ua_lower or "android" in ua_lower:
        return "mobile"
    if "tablet" in ua_lower or "ipad" in ua_lower:
        return "tablet"
    return "desktop"


async def _snapshot_abandoned_cart(session_id: str, user_id: Optional[str],
                                   props: Dict):
    """Snapshot cart state when checkout begins so we can retarget abandoners."""
    items = props.get("items", [])
    if not items:
        return
    cart_value = props.get("cartValue", 0)
    doc = {
        "sessionId": session_id,
        "userId": user_id,
        "items": items,
        "cartValue": cart_value,
        "status": "abandoned",
        "createdAt": datetime.utcnow(),
        "remindersScheduled": [],
    }
    # Upsert per session so we don't duplicate
    await abandoned_carts_col.update_one(
        {"sessionId": session_id, "status": "abandoned"},
        {"$setOnInsert": doc},
        upsert=True,
    )


async def mark_cart_recovered(user_id: str):
    """Called on successful purchase to mark abandoned cart as recovered."""
    await abandoned_carts_col.update_many(
        {"userId": user_id, "status": "abandoned"},
        {"$set": {"status": "recovered", "recoveredAt": datetime.utcnow()}},
    )


async def _update_audience_profile(user_id: str):
    """Recompute audience profile scores from recent events."""
    now = datetime.utcnow()
    since = now - timedelta(days=90)

    # Aggregate event scores
    pipeline = [
        {"$match": {"userId": user_id, "ts": {"$gte": since}}},
        {"$group": {"_id": "$event", "count": {"$sum": 1}}},
    ]
    event_counts = {d["_id"]: d["count"] async for d in tracking_events_col.aggregate(pipeline)}

    score = sum(EVENT_SCORES.get(evt, 1) * cnt for evt, cnt in event_counts.items())

    # Check purchase history
    purchase_count = await orders_col.count_documents(
        {"user": user_id, "paymentStatus": "paid"}
    )

    # Cart abandonment check
    cart_abandoned = await abandoned_carts_col.count_documents(
        {"userId": user_id, "status": "abandoned"}
    ) > 0

    # Last activity
    last_event = await tracking_events_col.find_one(
        {"userId": user_id}, sort=[("ts", -1)]
    )
    last_activity = last_event["ts"] if last_event else now
    days_inactive = (now - last_activity).days

    # Visit count
    visit_count = event_counts.get("PAGE_VIEW", 0) + event_counts.get("PRODUCT_VIEW", 0)

    # Recently viewed products
    viewed_pipeline = [
        {"$match": {"userId": user_id, "event": "PRODUCT_VIEW", "ts": {"$gte": since}}},
        {"$sort": {"ts": -1}},
        {"$group": {"_id": "$props.productId", "count": {"$sum": 1}, "lastSeen": {"$first": "$ts"}}},
        {"$sort": {"lastSeen": -1}},
        {"$limit": 20},
    ]
    viewed_products = [
        {"productId": d["_id"], "count": d["count"], "lastSeen": d["lastSeen"]}
        async for d in tracking_events_col.aggregate(viewed_pipeline)
        if d["_id"]
    ]

    # Search queries
    search_pipeline = [
        {"$match": {"userId": user_id, "event": "SEARCH", "ts": {"$gte": since}}},
        {"$sort": {"ts": -1}},
        {"$limit": 10},
    ]
    searches = [d["props"].get("query", "") async for d in tracking_events_col.aggregate(search_pipeline)]

    segment = compute_segment(score, purchase_count > 0, cart_abandoned, days_inactive, visit_count)

    await audience_profiles_col.update_one(
        {"userId": user_id},
        {
            "$set": {
                "userId": user_id,
                "engagementScore": score,
                "segment": segment,
                "purchaseCount": purchase_count,
                "cartAbandoned": cart_abandoned,
                "daysInactive": days_inactive,
                "visitCount": visit_count,
                "viewedProducts": viewed_products,
                "recentSearches": [s for s in searches if s],
                "lastActivity": last_activity,
                "updatedAt": now,
            }
        },
        upsert=True,
    )


async def merge_anonymous_to_user(session_id: str, user_id: str):
    """Merge anonymous session events to a logged-in user after login/signup."""
    await tracking_events_col.update_many(
        {"sessionId": session_id, "userId": None},
        {"$set": {"userId": user_id}},
    )
    await user_sessions_col.update_one(
        {"sessionId": session_id},
        {"$set": {"userId": user_id}},
    )
    asyncio.create_task(_update_audience_profile(user_id))


async def get_user_profile(user_id: str) -> Optional[Dict]:
    doc = await audience_profiles_col.find_one({"userId": user_id})
    return serialize_doc(doc) if doc else None


async def get_recently_viewed(user_id: str, limit: int = 10) -> List[Dict]:
    profile = await audience_profiles_col.find_one({"userId": user_id})
    if not profile:
        return []
    viewed = profile.get("viewedProducts", [])[:limit]
    product_ids = [v["productId"] for v in viewed if v.get("productId")]
    if not product_ids:
        return []
    from bson import ObjectId
    oids = []
    for pid in product_ids:
        try:
            oids.append(ObjectId(pid))
        except Exception:
            pass
    if not oids:
        return []
    products = await products_col.find(
        {"_id": {"$in": oids}, "isActive": True},
        {"name": 1, "slug": 1, "price": 1, "images": 1, "brand": 1}
    ).to_list(limit)
    return serialize_doc(products)
