"""
Audience Segmentation Service
Computes and manages retargeting audience segments.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from database import (
    audience_profiles_col, abandoned_carts_col, tracking_events_col,
    audience_segments_col, orders_col
)
from utils.helpers import serialize_doc


BUILTIN_SEGMENTS = [
    {
        "id": "hot_leads",
        "name": "Hot Leads",
        "description": "Users with cart abandonment and high engagement score",
        "color": "#ef4444",
        "icon": "🔥",
        "builtin": True,
    },
    {
        "id": "cart_abandoned",
        "name": "Cart Abandoners",
        "description": "Users who added items to cart but did not purchase",
        "color": "#f97316",
        "icon": "🛒",
        "builtin": True,
    },
    {
        "id": "high_intent",
        "name": "High Intent Buyers",
        "description": "Users with engagement score ≥ 100, no purchase yet",
        "color": "#eab308",
        "icon": "⚡",
        "builtin": True,
    },
    {
        "id": "repeat_customer",
        "name": "Repeat Customers",
        "description": "Users with 2+ successful purchases",
        "color": "#22c55e",
        "icon": "👑",
        "builtin": True,
    },
    {
        "id": "inactive",
        "name": "Inactive Users",
        "description": "Users with no activity in last 30 days",
        "color": "#6b7280",
        "icon": "💤",
        "builtin": True,
    },
    {
        "id": "new_visitor",
        "name": "New Visitors",
        "description": "First-time visitors with low engagement",
        "color": "#3b82f6",
        "icon": "👋",
        "builtin": True,
    },
    {
        "id": "high_value",
        "name": "High Value Customers",
        "description": "Customers with lifetime value > ₹5000",
        "color": "#8b5cf6",
        "icon": "💎",
        "builtin": True,
    },
]


async def get_segment_counts() -> List[Dict]:
    """Return all segments with live user counts."""
    results = []
    now = datetime.utcnow()

    for seg in BUILTIN_SEGMENTS:
        sid = seg["id"]
        if sid == "cart_abandoned":
            count = await abandoned_carts_col.count_documents({"status": "abandoned"})
        elif sid == "inactive":
            cutoff = now - timedelta(days=30)
            count = await audience_profiles_col.count_documents(
                {"lastActivity": {"$lt": cutoff}}
            )
        elif sid == "high_value":
            pipeline = [
                {"$match": {"paymentStatus": "paid"}},
                {"$group": {"_id": "$user", "total": {"$sum": "$totalAmount"}}},
                {"$match": {"total": {"$gte": 5000}}},
                {"$count": "count"},
            ]
            res = [d async for d in orders_col.aggregate(pipeline)]
            count = res[0]["count"] if res else 0
        else:
            count = await audience_profiles_col.count_documents({"segment": sid})

        results.append({**seg, "userCount": count})

    # Custom segments from DB
    custom = await audience_segments_col.find({"builtin": {"$ne": True}}).to_list(50)
    for c in serialize_doc(custom):
        count = await _count_custom_segment(c)
        results.append({**c, "userCount": count})

    return results


async def _count_custom_segment(segment: Dict) -> int:
    """Count users matching a custom segment's rules."""
    rules = segment.get("rules", {})
    query = _build_profile_query(rules)
    return await audience_profiles_col.count_documents(query)


def _build_profile_query(rules: Dict) -> Dict:
    query = {}
    if rules.get("minScore"):
        query["engagementScore"] = {"$gte": rules["minScore"]}
    if rules.get("maxScore"):
        query.setdefault("engagementScore", {})["$lte"] = rules["maxScore"]
    if rules.get("segment"):
        query["segment"] = rules["segment"]
    if rules.get("minPurchases"):
        query["purchaseCount"] = {"$gte": rules["minPurchases"]}
    if rules.get("inactiveDays"):
        cutoff = datetime.utcnow() - timedelta(days=rules["inactiveDays"])
        query["lastActivity"] = {"$lt": cutoff}
    return query


async def get_segment_users(segment_id: str, limit: int = 100, skip: int = 0) -> Dict:
    """Fetch users belonging to a segment."""
    if segment_id == "cart_abandoned":
        carts = await abandoned_carts_col.find(
            {"status": "abandoned"},
            {"userId": 1, "cartValue": 1, "items": 1, "createdAt": 1}
        ).skip(skip).limit(limit).to_list(limit)
        total = await abandoned_carts_col.count_documents({"status": "abandoned"})
        return {"users": serialize_doc(carts), "total": total}

    if segment_id == "high_value":
        pipeline = [
            {"$match": {"paymentStatus": "paid"}},
            {"$group": {"_id": "$user", "ltv": {"$sum": "$totalAmount"}, "orders": {"$sum": 1}}},
            {"$match": {"ltv": {"$gte": 5000}}},
            {"$sort": {"ltv": -1}},
            {"$skip": skip},
            {"$limit": limit},
        ]
        users = [d async for d in orders_col.aggregate(pipeline)]
        return {"users": serialize_doc(users), "total": len(users)}

    if segment_id == "inactive":
        cutoff = datetime.utcnow() - timedelta(days=30)
        query = {"lastActivity": {"$lt": cutoff}}
    else:
        query = {"segment": segment_id}

    profiles = await audience_profiles_col.find(query).skip(skip).limit(limit).to_list(limit)
    total = await audience_profiles_col.count_documents(query)
    return {"users": serialize_doc(profiles), "total": total}


async def create_custom_segment(name: str, description: str, rules: Dict) -> Dict:
    doc = {
        "name": name,
        "description": description,
        "rules": rules,
        "builtin": False,
        "createdAt": datetime.utcnow(),
    }
    result = await audience_segments_col.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return serialize_doc(doc)
