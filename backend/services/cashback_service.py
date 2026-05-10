"""
Cashback engine — campaign management, cashback calculation, order crediting.
"""
import logging
from typing import Optional
from fastapi import HTTPException
from database import cashback_campaigns_col, reward_settings_col, orders_col
from utils.helpers import now, serialize_doc
from services import wallet_service

logger = logging.getLogger(__name__)


# ── Default settings ───────────────────────────────────────────────────────

DEFAULT_SETTINGS = {
    '_id': 'global',
    'cashbackEnabled': True,
    'defaultCashbackPercent': 2.0,
    'referralEnabled': True,
    'referrerBonus': 100.0,
    'refereeBonus': 50.0,
    'referralCondition': 'first_order',
    'walletRedemptionEnabled': True,
    'maxRedemptionPercent': 50.0,
    'minRedemptionAmount': 10.0,
    'cashbackExpiryDays': 365,
}


async def get_cashback_settings() -> dict:
    doc = await reward_settings_col.find_one({'_id': 'global'})
    if not doc:
        ts = now()
        settings = {**DEFAULT_SETTINGS, 'updatedAt': ts}
        await reward_settings_col.insert_one(settings)
        return settings
    return doc


async def update_cashback_settings(updates: dict) -> dict:
    updates['updatedAt'] = now()
    await reward_settings_col.update_one(
        {'_id': 'global'},
        {'$set': updates},
        upsert=True,
    )
    return await get_cashback_settings()


# ── Campaigns ──────────────────────────────────────────────────────────────


async def get_active_campaigns() -> list:
    ts = now()
    q = {
        'isActive': True,
        'startsAt': {'$lte': ts},
        '$or': [
            {'endsAt': None},
            {'endsAt': {'$gte': ts}},
        ],
    }
    cursor = cashback_campaigns_col.find(q).sort('createdAt', -1)
    return [serialize_doc(c) async for c in cursor]


async def get_all_campaigns(page: int = 1, limit: int = 20) -> dict:
    skip = (page - 1) * limit
    total = await cashback_campaigns_col.count_documents({})
    cursor = cashback_campaigns_col.find({}).sort('createdAt', -1).skip(skip).limit(limit)
    items = [serialize_doc(c) async for c in cursor]
    return {'campaigns': items, 'total': total, 'page': page, 'pages': max(1, -(-total // limit))}


# ── Cashback calculation ───────────────────────────────────────────────────


async def calculate_cashback(order: dict, user: dict) -> dict:
    """
    Returns {'amount': float, 'campaign': dict|None, 'source': str}
    """
    settings = await get_cashback_settings()
    if not settings.get('cashbackEnabled'):
        return {'amount': 0.0, 'campaign': None, 'source': 'disabled'}

    total_amount = float(order.get('totalAmount', 0))
    if total_amount <= 0:
        return {'amount': 0.0, 'campaign': None, 'source': 'zero_amount'}

    # Check if this is first order (for first_order campaigns)
    user_id = order.get('user', '')
    total_user_orders = await orders_col.count_documents({
        'user': user_id,
        'paymentStatus': 'paid',
    })
    is_first_order = total_user_orders <= 1  # current order may already be paid

    # Try active campaigns first
    campaigns = await get_active_campaigns()
    best_cashback = 0.0
    best_campaign = None

    product_ids = [item.get('productId', '') for item in order.get('items', [])]

    for campaign in campaigns:
        applicable_to = campaign.get('applicableTo', 'all')

        # Check order amount
        if total_amount < campaign.get('minOrderAmount', 0):
            continue

        # Check applicability
        if applicable_to == 'first_order' and not is_first_order:
            continue
        if applicable_to == 'product':
            campaign_products = campaign.get('productIds', [])
            if not any(pid in campaign_products for pid in product_ids):
                continue
        if applicable_to == 'category':
            # We'd need category info — skip for now unless product lookup done
            pass

        # Check payment method
        allowed_methods = campaign.get('paymentMethods', [])
        if allowed_methods and order.get('paymentMethod') not in allowed_methods:
            continue

        # Calculate cashback
        cashback = 0.0
        if campaign.get('type') == 'percentage':
            cashback = total_amount * campaign.get('value', 0) / 100
        elif campaign.get('type') == 'flat':
            cashback = float(campaign.get('value', 0))

        # Cap at maxCashback
        max_cb = campaign.get('maxCashback')
        if max_cb:
            cashback = min(cashback, float(max_cb))

        if cashback > best_cashback:
            best_cashback = cashback
            best_campaign = campaign

    # Fallback to default cashback
    if best_cashback == 0:
        default_pct = settings.get('defaultCashbackPercent', 2.0)
        best_cashback = round(total_amount * default_pct / 100, 2)
        source = 'default'
    else:
        source = f'campaign:{best_campaign.get("id", "")}'

    return {
        'amount': round(best_cashback, 2),
        'campaign': serialize_doc(best_campaign) if best_campaign else None,
        'source': source,
    }


# ── Credit cashback after order payment ───────────────────────────────────


async def credit_order_cashback(order_id: str, user_id: str) -> Optional[dict]:
    """
    Called after payment success. Credits cashback to user wallet.
    Idempotent — safe to call multiple times for same order.
    """
    order = await orders_col.find_one({'_id': order_id})
    if not order:
        logger.warning(f'credit_order_cashback: order {order_id} not found')
        return None

    if order.get('paymentStatus') != 'paid':
        logger.info(f'credit_order_cashback: order {order_id} not paid, skipping')
        return None

    # Calculate cashback
    user = {'_id': user_id}
    result = await calculate_cashback(order, user)
    amount = result.get('amount', 0.0)
    if amount <= 0:
        return None

    settings = await get_cashback_settings()
    expiry_days = settings.get('cashbackExpiryDays', 365)

    try:
        txn = await wallet_service.credit_wallet(
            user_id=user_id,
            amount=amount,
            type='cashback',
            source='order',
            description=f'Cashback earned on order {order.get("invoiceId", order_id)}',
            reference_order_id=order_id,
            expiry_days=expiry_days,
        )
        logger.info(f'Cashback ₹{amount} credited for order {order_id} to user {user_id}')
        return txn
    except Exception as e:
        logger.error(f'Failed to credit cashback for order {order_id}: {e}')
        return None
