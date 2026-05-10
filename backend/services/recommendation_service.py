"""
AI-based Recommendation Engine
Generates personalized product recommendations using behavioral signals.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from database import (
    tracking_events_col, audience_profiles_col, orders_col,
    products_col, recommendation_cache_col
)
from utils.helpers import serialize_doc
from bson import ObjectId


async def get_recommendations(user_id: Optional[str], session_id: str,
                               limit: int = 12) -> Dict:
    """
    Returns personalized recommendations with multiple carousels.
    Checks cache first (5 min TTL).
    """
    cache_key = user_id or session_id
    if user_id:
        cache = await recommendation_cache_col.find_one({"userId": user_id})
        if cache and (datetime.utcnow() - cache["updatedAt"]).seconds < 300:
            return serialize_doc(cache.get("data", {}))

    recently_viewed = await _get_recently_viewed_ids(user_id, session_id, 10)
    similar = await _get_similar_products(recently_viewed, limit)
    trending = await _get_trending_products(limit)
    personalized = await _get_personalized(user_id, limit)
    fbt = await _get_frequently_bought_together(user_id, limit // 2)

    data = {
        "recentlyViewed": await _hydrate_products(recently_viewed[:limit]),
        "similar": similar,
        "trending": trending,
        "personalized": personalized,
        "frequentlyBoughtTogether": fbt,
        "generatedAt": datetime.utcnow().isoformat(),
    }

    if user_id:
        await recommendation_cache_col.update_one(
            {"userId": user_id},
            {"$set": {"userId": user_id, "data": data, "updatedAt": datetime.utcnow()}},
            upsert=True,
        )
    return data


async def _get_recently_viewed_ids(user_id: Optional[str], session_id: str,
                                   limit: int) -> List[str]:
    query = {"event": "PRODUCT_VIEW"}
    if user_id:
        query["userId"] = user_id
    else:
        query["sessionId"] = session_id

    pipeline = [
        {"$match": query},
        {"$sort": {"ts": -1}},
        {"$group": {"_id": "$props.productId", "lastSeen": {"$first": "$ts"}}},
        {"$sort": {"lastSeen": -1}},
        {"$limit": limit},
    ]
    return [d["_id"] async for d in tracking_events_col.aggregate(pipeline) if d["_id"]]


async def _get_similar_products(product_ids: List[str], limit: int) -> List[Dict]:
    if not product_ids:
        return []
    oids = _to_oids(product_ids[:3])
    if not oids:
        return []
    source_products = await products_col.find(
        {"_id": {"$in": oids}}, {"category": 1, "tags": 1, "brand": 1}
    ).to_list(3)

    categories = list({p.get("category") for p in source_products if p.get("category")})
    tags = list({t for p in source_products for t in (p.get("tags") or [])})

    query = {
        "isActive": True,
        "_id": {"$nin": oids},
        "$or": [
            {"category": {"$in": categories}},
            {"tags": {"$in": tags[:10]}},
        ],
    }
    products = await products_col.find(
        query, {"name": 1, "slug": 1, "price": 1, "images": 1, "brand": 1, "category": 1}
    ).limit(limit).to_list(limit)
    return serialize_doc(products)


async def _get_trending_products(limit: int) -> List[Dict]:
    since = datetime.utcnow() - timedelta(days=7)
    pipeline = [
        {"$match": {"event": "PRODUCT_VIEW", "ts": {"$gte": since}}},
        {"$group": {"_id": "$props.productId", "views": {"$sum": 1}}},
        {"$sort": {"views": -1}},
        {"$limit": limit * 2},
    ]
    top_ids = [d["_id"] async for d in tracking_events_col.aggregate(pipeline) if d["_id"]]
    oids = _to_oids(top_ids[:limit])
    if not oids:
        # fallback to featured
        products = await products_col.find(
            {"isActive": True, "isFeatured": True},
            {"name": 1, "slug": 1, "price": 1, "images": 1, "brand": 1}
        ).limit(limit).to_list(limit)
        return serialize_doc(products)
    products = await products_col.find(
        {"_id": {"$in": oids}, "isActive": True},
        {"name": 1, "slug": 1, "price": 1, "images": 1, "brand": 1}
    ).to_list(limit)
    return serialize_doc(products)


async def _get_personalized(user_id: Optional[str], limit: int) -> List[Dict]:
    if not user_id:
        return []
    profile = await audience_profiles_col.find_one({"userId": user_id})
    if not profile:
        return []

    viewed_ids = [v["productId"] for v in profile.get("viewedProducts", [])]
    oids = _to_oids(viewed_ids)

    # Get categories from viewed products
    viewed_prods = await products_col.find(
        {"_id": {"$in": oids}}, {"category": 1}
    ).to_list(20) if oids else []
    categories = list({p.get("category") for p in viewed_prods if p.get("category")})

    if not categories:
        return []

    # Products in same categories not yet purchased/viewed
    purchased_pipeline = [
        {"$match": {"user": user_id, "paymentStatus": "paid"}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product"}},
    ]
    purchased_ids = [d["_id"] async for d in orders_col.aggregate(purchased_pipeline)]
    exclude_oids = oids + _to_oids(purchased_ids)

    products = await products_col.find(
        {
            "isActive": True,
            "category": {"$in": categories},
            "_id": {"$nin": exclude_oids},
        },
        {"name": 1, "slug": 1, "price": 1, "images": 1, "brand": 1}
    ).limit(limit).to_list(limit)
    return serialize_doc(products)


async def _get_frequently_bought_together(user_id: Optional[str], limit: int) -> List[Dict]:
    """Find products commonly purchased together via co-occurrence in orders."""
    since = datetime.utcnow() - timedelta(days=30)
    pipeline = [
        {"$match": {"paymentStatus": "paid", "createdAt": {"$gte": since}}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    top_ids = [d["_id"] async for d in orders_col.aggregate(pipeline)]
    oids = _to_oids(top_ids)
    if not oids:
        return []
    products = await products_col.find(
        {"_id": {"$in": oids}, "isActive": True},
        {"name": 1, "slug": 1, "price": 1, "images": 1, "brand": 1}
    ).to_list(limit)
    return serialize_doc(products)


async def _hydrate_products(product_ids: List[str]) -> List[Dict]:
    oids = _to_oids(product_ids)
    if not oids:
        return []
    products = await products_col.find(
        {"_id": {"$in": oids}, "isActive": True},
        {"name": 1, "slug": 1, "price": 1, "images": 1, "brand": 1}
    ).to_list(len(oids))
    return serialize_doc(products)


def _to_oids(ids: List) -> List[ObjectId]:
    result = []
    for id_ in ids:
        try:
            result.append(ObjectId(str(id_)))
        except Exception:
            pass
    return result


async def compute_conversion_probability(user_id: str) -> float:
    """Score 0-1 probability of purchase in next 24h."""
    profile = await audience_profiles_col.find_one({"userId": user_id})
    if not profile:
        return 0.1
    score = profile.get("engagementScore", 0)
    cart_abandoned = profile.get("cartAbandoned", False)
    has_purchase = profile.get("purchaseCount", 0) > 0
    days_inactive = profile.get("daysInactive", 30)

    prob = min(score / 500, 0.6)
    if cart_abandoned:
        prob += 0.25
    if has_purchase:
        prob += 0.15
    prob -= days_inactive * 0.005
    return round(max(0.01, min(prob, 0.99)), 3)
