"""
Referral engine — code generation, signup linking, reward processing.
"""
import uuid
import random
import string
import logging
import os
from typing import Optional
from fastapi import HTTPException
from database import (
    referral_profiles_col, referral_tracking_col, orders_col, users_col
)
from utils.helpers import now, serialize_doc
from services import wallet_service

logger = logging.getLogger(__name__)

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000').rstrip('/')


# ── Code generation ────────────────────────────────────────────────────────


def _generate_code(name: str = '') -> str:
    """Generate unique 8-char alphanumeric referral code."""
    prefix = (name[:3].upper().replace(' ', '') if name else 'REF')[:3]
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return prefix + suffix


async def generate_referral_code(user_id: str, name: str) -> str:
    for _ in range(10):
        code = _generate_code(name)
        existing = await referral_profiles_col.find_one({'referralCode': code})
        if not existing:
            return code
    # Fallback: uuid-based
    return str(uuid.uuid4()).replace('-', '').upper()[:8]


# ── Profile management ─────────────────────────────────────────────────────


async def get_or_create_referral_profile(user_id: str) -> dict:
    profile = await referral_profiles_col.find_one({'_id': user_id})
    if profile:
        return profile

    user = await users_col.find_one({'_id': user_id})
    name = user.get('name', '') if user else ''
    code = await generate_referral_code(user_id, name)
    link = f'{FRONTEND_URL}/register?ref={code}'

    ts = now()
    profile = {
        '_id': user_id,
        'userId': user_id,
        'referralCode': code,
        'referralLink': link,
        'referredBy': None,
        'totalReferrals': 0,
        'successfulReferrals': 0,
        'pendingReferrals': 0,
        'totalEarned': 0.0,
        'createdAt': ts,
    }
    try:
        await referral_profiles_col.insert_one(profile)
    except Exception:
        existing = await referral_profiles_col.find_one({'_id': user_id})
        if existing:
            return existing
        raise
    return profile


# ── Apply referral on signup ───────────────────────────────────────────────


async def apply_referral_on_signup(new_user_id: str, referral_code: str) -> Optional[dict]:
    """
    Links new user to referrer. Called right after user creation.
    Does NOT award bonus yet — that happens after first paid order.
    """
    if not referral_code:
        return None

    code = referral_code.strip().upper()

    # Find referrer profile
    referrer_profile = await referral_profiles_col.find_one({'referralCode': code})
    if not referrer_profile:
        logger.info(f'Referral code {code} not found')
        return None

    referrer_id = referrer_profile['userId']

    # Prevent self-referral
    if referrer_id == new_user_id:
        logger.info(f'Self-referral attempt by {new_user_id}')
        return None

    # Check if new user already has a referrer
    existing_tracking = await referral_tracking_col.find_one({'refereeId': new_user_id})
    if existing_tracking:
        logger.info(f'User {new_user_id} already has a referrer')
        return None

    from services.cashback_service import get_cashback_settings
    settings = await get_cashback_settings()

    ts = now()
    tracking_id = str(uuid.uuid4())
    tracking = {
        '_id': tracking_id,
        'referrerId': referrer_id,
        'refereeId': new_user_id,
        'referralCode': code,
        'status': 'pending',
        'referrerBonus': float(settings.get('referrerBonus', 100.0)),
        'refereeBonus': float(settings.get('refereeBonus', 50.0)),
        'rewardOrderId': None,
        'createdAt': ts,
        'rewardedAt': None,
    }
    await referral_tracking_col.insert_one(tracking)

    # Update referral profile to record referred_by and increment counts
    await referral_profiles_col.update_one(
        {'_id': referrer_id},
        {
            '$inc': {'totalReferrals': 1, 'pendingReferrals': 1},
        },
    )

    # Set referredBy on new user's profile
    await referral_profiles_col.update_one(
        {'_id': new_user_id},
        {'$set': {'referredBy': referrer_id}},
        upsert=False,
    )

    logger.info(f'Referral linked: referrer={referrer_id}, referee={new_user_id}')
    return serialize_doc(tracking)


# ── Process referral reward ────────────────────────────────────────────────


async def process_referral_reward(order: dict) -> None:
    """
    Called after a payment succeeds. Credits referrer and referee bonuses
    if this is the referee's first paid order and referral is pending.
    """
    user_id = order.get('user', '')
    order_id = order.get('_id', '')

    # Check if this user has a pending referral (as referee)
    tracking = await referral_tracking_col.find_one({
        'refereeId': user_id,
        'status': 'pending',
    })
    if not tracking:
        return

    from services.cashback_service import get_cashback_settings
    settings = await get_cashback_settings()

    if not settings.get('referralEnabled'):
        return

    # Check condition: first paid order
    condition = settings.get('referralCondition', 'first_order')
    if condition == 'first_order':
        paid_orders_count = await orders_col.count_documents({
            'user': user_id,
            'paymentStatus': 'paid',
        })
        if paid_orders_count > 1:
            # Already had a paid order before — don't reward
            await referral_tracking_col.update_one(
                {'_id': tracking['_id']},
                {'$set': {'status': 'failed'}},
            )
            return

    referrer_id = tracking['referrerId']
    referee_id = tracking['refereeId']
    referrer_bonus = float(tracking.get('referrerBonus', 100.0))
    referee_bonus = float(tracking.get('refereeBonus', 50.0))
    expiry_days = settings.get('cashbackExpiryDays', 365)

    ts = now()

    # Credit referrer
    try:
        await wallet_service.credit_wallet(
            user_id=referrer_id,
            amount=referrer_bonus,
            type='referral_bonus',
            source='referral',
            description=f'Referral bonus — friend made first purchase',
            reference_order_id=order_id,
            expiry_days=expiry_days,
        )
    except Exception as e:
        logger.error(f'Failed to credit referrer {referrer_id}: {e}')

    # Credit referee
    try:
        await wallet_service.credit_wallet(
            user_id=referee_id,
            amount=referee_bonus,
            type='referral_bonus',
            source='referral',
            description=f'Welcome bonus — joined via referral',
            reference_order_id=order_id,
            expiry_days=expiry_days,
        )
    except Exception as e:
        logger.error(f'Failed to credit referee {referee_id}: {e}')

    # Mark tracking as rewarded
    await referral_tracking_col.update_one(
        {'_id': tracking['_id']},
        {
            '$set': {
                'status': 'rewarded',
                'rewardOrderId': order_id,
                'rewardedAt': ts,
            }
        },
    )

    # Update referrer profile stats
    await referral_profiles_col.update_one(
        {'_id': referrer_id},
        {
            '$inc': {
                'successfulReferrals': 1,
                'pendingReferrals': -1,
                'totalEarned': referrer_bonus,
            }
        },
    )

    logger.info(
        f'Referral reward processed: referrer={referrer_id} +₹{referrer_bonus}, '
        f'referee={referee_id} +₹{referee_bonus}, order={order_id}'
    )


# ── Referral dashboard ─────────────────────────────────────────────────────


async def get_referral_dashboard(user_id: str) -> dict:
    profile = await get_or_create_referral_profile(user_id)

    # Get all referrals (people this user referred)
    cursor = referral_tracking_col.find({'referrerId': user_id}).sort('createdAt', -1)
    referrals = []
    async for tracking in cursor:
        referee = await users_col.find_one({'_id': tracking['refereeId']}, {'name': 1, 'email': 1, 'createdAt': 1})
        entry = serialize_doc(tracking)
        if referee:
            entry['refereeName'] = referee.get('name', '')
            entry['refereeEmail'] = referee.get('email', '')
            entry['refereeJoinedAt'] = referee.get('createdAt', '').isoformat() if hasattr(referee.get('createdAt', ''), 'isoformat') else str(referee.get('createdAt', ''))
        referrals.append(entry)

    # Get referral bonus transactions
    from database import wallet_transactions_col
    txn_cursor = wallet_transactions_col.find({
        'userId': user_id,
        'type': 'referral_bonus',
    }).sort('createdAt', -1).limit(20)
    transactions = [serialize_doc(t) async for t in txn_cursor]

    return {
        'profile': serialize_doc(profile),
        'referrals': referrals,
        'transactions': transactions,
    }


# ── Admin analytics ────────────────────────────────────────────────────────


async def admin_get_referral_stats() -> dict:
    total_referrals = await referral_tracking_col.count_documents({})
    successful = await referral_tracking_col.count_documents({'status': 'rewarded'})
    pending = await referral_tracking_col.count_documents({'status': 'pending'})
    failed = await referral_tracking_col.count_documents({'status': 'failed'})

    # Top referrers
    cursor = referral_profiles_col.find({}).sort('successfulReferrals', -1).limit(10)
    top_referrers = []
    async for profile in cursor:
        user = await users_col.find_one({'_id': profile['userId']}, {'name': 1, 'email': 1})
        entry = serialize_doc(profile)
        if user:
            entry['userName'] = user.get('name', '')
            entry['userEmail'] = user.get('email', '')
        top_referrers.append(entry)

    return {
        'totalReferrals': total_referrals,
        'successfulReferrals': successful,
        'pendingReferrals': pending,
        'failedReferrals': failed,
        'topReferrers': top_referrers,
    }
