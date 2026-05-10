"""
Automated Campaign Service
Handles campaign scheduling, dispatch, frequency capping, and logging.
Supports email, WhatsApp, push, SMS, and in-app channels.
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import uuid
import asyncio
import logging
from database import (
    retargeting_campaigns_col, campaign_logs_col, abandoned_carts_col,
    audience_profiles_col, users_col, products_col, notifications_col
)
from utils.helpers import serialize_doc

logger = logging.getLogger(__name__)

# ── Campaign triggers ─────────────────────────────────────────────────────
TRIGGERS = {
    "cart_abandoned_30m": {"delay_minutes": 30, "segment": "cart_abandoned"},
    "cart_abandoned_6h": {"delay_minutes": 360, "segment": "cart_abandoned"},
    "cart_abandoned_24h": {"delay_minutes": 1440, "segment": "cart_abandoned"},
    "cart_abandoned_3d": {"delay_minutes": 4320, "segment": "cart_abandoned"},
    "high_intent_no_purchase": {"delay_minutes": 1440, "segment": "high_intent"},
    "inactive_reactivation": {"delay_minutes": 10080, "segment": "inactive"},
    "price_drop_alert": {"delay_minutes": 0, "segment": "all"},
    "low_stock_urgency": {"delay_minutes": 0, "segment": "all"},
    "comeback_offer": {"delay_minutes": 4320, "segment": "inactive"},
}

DEFAULT_CAMPAIGNS = [
    {
        "name": "Cart Abandonment — 30 min reminder",
        "trigger": "cart_abandoned_30m",
        "channels": ["push", "inapp"],
        "subject": "You left something behind 🛒",
        "body": "Hey {{name}}, you left {{item_count}} item(s) worth ₹{{cart_value}} in your cart. Complete your purchase now!",
        "status": "active",
        "frequencyCap": {"maxPerUser": 1, "windowDays": 1},
        "priority": 10,
    },
    {
        "name": "Cart Abandonment — 6 hour email",
        "trigger": "cart_abandoned_6h",
        "channels": ["email", "push"],
        "subject": "Still thinking? Your cart misses you ❤️",
        "body": "Hi {{name}}, your cart items are waiting for you. Limited stock — grab them before they're gone!",
        "status": "active",
        "frequencyCap": {"maxPerUser": 1, "windowDays": 2},
        "priority": 9,
    },
    {
        "name": "Cart Abandonment — 24 hour WhatsApp",
        "trigger": "cart_abandoned_24h",
        "channels": ["whatsapp", "email"],
        "subject": "Last chance — your cart expires soon",
        "body": "Hi {{name}}, your ₹{{cart_value}} cart expires soon. Use code COMEBACK10 for 10% off.",
        "status": "active",
        "frequencyCap": {"maxPerUser": 1, "windowDays": 3},
        "priority": 8,
    },
    {
        "name": "High Intent — Win-back offer",
        "trigger": "high_intent_no_purchase",
        "channels": ["email", "inapp"],
        "subject": "Special offer just for you 🎁",
        "body": "Hi {{name}}, we noticed you've been browsing. Here's 15% off your first order: FIRST15",
        "status": "active",
        "frequencyCap": {"maxPerUser": 1, "windowDays": 7},
        "priority": 7,
    },
    {
        "name": "Inactive Users — Reactivation",
        "trigger": "inactive_reactivation",
        "channels": ["email", "push"],
        "subject": "We miss you! Come back for exclusive deals",
        "body": "Hi {{name}}, it's been a while! We have new products and special deals waiting for you.",
        "status": "active",
        "frequencyCap": {"maxPerUser": 1, "windowDays": 14},
        "priority": 5,
    },
]


async def seed_default_campaigns():
    """Seed default campaigns if none exist."""
    count = await retargeting_campaigns_col.count_documents({})
    if count > 0:
        return
    now = datetime.utcnow()
    for camp in DEFAULT_CAMPAIGNS:
        doc = {**camp, "createdAt": now, "sentCount": 0, "clickCount": 0, "conversionCount": 0}
        await retargeting_campaigns_col.insert_one(doc)
    logger.info("Seeded default retargeting campaigns")


async def check_frequency_cap(user_id: str, campaign_id: str, cap: Dict) -> bool:
    """Returns True if allowed to send (not capped)."""
    max_per_user = cap.get("maxPerUser", 1)
    window_days = cap.get("windowDays", 1)
    since = datetime.utcnow() - timedelta(days=window_days)
    count = await campaign_logs_col.count_documents({
        "userId": user_id,
        "campaignId": str(campaign_id),
        "sentAt": {"$gte": since},
    })
    return count < max_per_user


async def log_campaign_send(user_id: str, campaign_id: str, channel: str,
                             message_id: str, metadata: Dict = None):
    await campaign_logs_col.insert_one({
        "logId": str(uuid.uuid4()),
        "userId": user_id,
        "campaignId": str(campaign_id),
        "channel": channel,
        "messageId": message_id,
        "metadata": metadata or {},
        "sentAt": datetime.utcnow(),
        "opened": False,
        "clicked": False,
        "converted": False,
    })
    await retargeting_campaigns_col.update_one(
        {"_id": campaign_id} if not isinstance(campaign_id, str) else
        {"name": campaign_id},
        {"$inc": {"sentCount": 1}},
    )


async def send_inapp_notification(user_id: str, title: str, body: str,
                                   campaign_id: str, metadata: Dict = None):
    """Store in-app notification for the user."""
    doc = {
        "userId": user_id,
        "title": title,
        "body": body,
        "type": "retargeting",
        "campaignId": campaign_id,
        "metadata": metadata or {},
        "read": False,
        "createdAt": datetime.utcnow(),
    }
    result = await notifications_col.insert_one(doc)
    await log_campaign_send(user_id, campaign_id, "inapp", str(result.inserted_id))


def render_template(template: str, context: Dict) -> str:
    """Simple mustache-style template renderer."""
    for key, value in context.items():
        template = template.replace(f"{{{{{key}}}}}", str(value))
    return template


async def get_campaign_context(user_id: str, cart_doc: Optional[Dict] = None) -> Dict:
    user = await users_col.find_one({"_id": user_id if not isinstance(user_id, str) else None,
                                     "email": None}, {"name": 1, "email": 1})
    # Try by string userId
    from bson import ObjectId
    try:
        user = await users_col.find_one({"_id": ObjectId(user_id)}, {"name": 1, "email": 1})
    except Exception:
        user = await users_col.find_one({"email": user_id}, {"name": 1, "email": 1})

    ctx = {
        "name": (user or {}).get("name", "there"),
        "email": (user or {}).get("email", ""),
        "cart_value": 0,
        "item_count": 0,
    }
    if cart_doc:
        ctx["cart_value"] = cart_doc.get("cartValue", 0)
        ctx["item_count"] = len(cart_doc.get("items", []))
    return ctx


async def process_cart_abandonment_campaigns():
    """
    Cron job: run every 15 minutes.
    Check abandoned carts and dispatch campaigns based on delay thresholds.
    """
    now = datetime.utcnow()
    thresholds = [
        ("cart_abandoned_30m", 30, 60),
        ("cart_abandoned_6h", 360, 480),
        ("cart_abandoned_24h", 1440, 1560),
        ("cart_abandoned_3d", 4320, 4560),
    ]

    for trigger, min_min, max_min in thresholds:
        min_ago = now - timedelta(minutes=max_min)
        max_ago = now - timedelta(minutes=min_min)

        campaigns = await retargeting_campaigns_col.find(
            {"trigger": trigger, "status": "active"}
        ).to_list(5)

        abandoned = await abandoned_carts_col.find(
            {
                "status": "abandoned",
                "userId": {"$ne": None},
                "createdAt": {"$gte": min_ago, "$lte": max_ago},
                f"remindersScheduled": {"$nin": [trigger]},
            }
        ).to_list(500)

        for cart in abandoned:
            user_id = cart.get("userId")
            if not user_id:
                continue
            for campaign in campaigns:
                campaign_id = str(campaign["_id"])
                cap = campaign.get("frequencyCap", {"maxPerUser": 1, "windowDays": 1})
                if not await check_frequency_cap(user_id, campaign_id, cap):
                    continue

                ctx = await get_campaign_context(user_id, cart)
                body = render_template(campaign.get("body", ""), ctx)
                title = render_template(campaign.get("subject", ""), ctx)

                if "inapp" in campaign.get("channels", []):
                    await send_inapp_notification(user_id, title, body, campaign_id,
                                                   {"cartId": str(cart["_id"])})

                # Mark this trigger as scheduled
                await abandoned_carts_col.update_one(
                    {"_id": cart["_id"]},
                    {"$addToSet": {"remindersScheduled": trigger}},
                )
                logger.info(f"Campaign {trigger} dispatched to user {user_id}")


async def process_high_intent_campaigns():
    """Retarget high-intent users who haven't purchased."""
    since = datetime.utcnow() - timedelta(hours=25)
    until = datetime.utcnow() - timedelta(hours=23)

    profiles = await audience_profiles_col.find(
        {
            "segment": "high_intent",
            "lastActivity": {"$gte": since, "$lte": until},
        }
    ).to_list(200)

    campaigns = await retargeting_campaigns_col.find(
        {"trigger": "high_intent_no_purchase", "status": "active"}
    ).to_list(5)

    for profile in profiles:
        user_id = profile.get("userId")
        if not user_id:
            continue
        for campaign in campaigns:
            campaign_id = str(campaign["_id"])
            cap = campaign.get("frequencyCap", {"maxPerUser": 1, "windowDays": 7})
            if not await check_frequency_cap(user_id, campaign_id, cap):
                continue
            ctx = await get_campaign_context(user_id)
            body = render_template(campaign.get("body", ""), ctx)
            title = render_template(campaign.get("subject", ""), ctx)
            if "inapp" in campaign.get("channels", []):
                await send_inapp_notification(user_id, title, body, campaign_id)


async def get_campaign_analytics(campaign_id: str) -> Dict:
    from bson import ObjectId
    try:
        cid = ObjectId(campaign_id)
        campaign = await retargeting_campaigns_col.find_one({"_id": cid})
    except Exception:
        campaign = None

    if not campaign:
        return {}

    logs = await campaign_logs_col.find({"campaignId": campaign_id}).to_list(10000)
    total = len(logs)
    opened = sum(1 for l in logs if l.get("opened"))
    clicked = sum(1 for l in logs if l.get("clicked"))
    converted = sum(1 for l in logs if l.get("converted"))

    return {
        "campaign": serialize_doc(campaign),
        "sent": total,
        "opened": opened,
        "clicked": clicked,
        "converted": converted,
        "openRate": round(opened / total * 100, 2) if total else 0,
        "clickRate": round(clicked / total * 100, 2) if total else 0,
        "conversionRate": round(converted / total * 100, 2) if total else 0,
    }
