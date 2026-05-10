"""
Admin wallet management APIs — wallets, transactions, campaigns, settings, referrals.
"""
import uuid
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from utils.security import require_staff
from utils.helpers import serialize_doc, now
from database import (
    wallets_col, wallet_transactions_col, cashback_campaigns_col,
    users_col, referral_tracking_col
)
from services import wallet_service, cashback_service, referral_service

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────


class AdminCreditIn(BaseModel):
    user_id: str
    amount: float
    description: str


class AdminDebitIn(BaseModel):
    user_id: str
    amount: float
    description: str


class FreezeWalletIn(BaseModel):
    user_id: str
    freeze: bool


class CampaignIn(BaseModel):
    name: str
    type: str  # 'percentage' | 'flat'
    value: float
    minOrderAmount: float = 0.0
    maxCashback: Optional[float] = None
    applicableTo: str = 'all'
    categoryIds: list = []
    productIds: list = []
    isActive: bool = True
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None
    paymentMethods: list = []
    userTiers: list = []


class SettingsIn(BaseModel):
    cashbackEnabled: Optional[bool] = None
    defaultCashbackPercent: Optional[float] = None
    referralEnabled: Optional[bool] = None
    referrerBonus: Optional[float] = None
    refereeBonus: Optional[float] = None
    referralCondition: Optional[str] = None
    walletRedemptionEnabled: Optional[bool] = None
    maxRedemptionPercent: Optional[float] = None
    minRedemptionAmount: Optional[float] = None
    cashbackExpiryDays: Optional[int] = None


# ── Wallet management ──────────────────────────────────────────────────────


@router.get('/wallet/wallets')
async def list_all_wallets(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(''),
    current_user=Depends(require_staff),
):
    return await wallet_service.admin_get_all_wallets(page, limit, search)


@router.get('/wallet/wallet/{user_id}')
async def get_user_wallet_detail(
    user_id: str,
    current_user=Depends(require_staff),
):
    wallet = await wallet_service.get_wallet(user_id)
    txns = await wallet_service.get_wallet_transactions(user_id, page=1, limit=50)
    user = await users_col.find_one({'_id': user_id}, {'name': 1, 'email': 1, 'phone': 1})
    return {
        'wallet': serialize_doc(wallet),
        'transactions': txns,
        'user': serialize_doc(user) if user else None,
    }


@router.post('/wallet/credit')
async def admin_credit_wallet(data: AdminCreditIn, current_user=Depends(require_staff)):
    admin_id = current_user['_id']
    txn = await wallet_service.admin_credit(data.user_id, data.amount, data.description, admin_id)
    return {'success': True, 'transaction': txn}


@router.post('/wallet/debit')
async def admin_debit_wallet(data: AdminDebitIn, current_user=Depends(require_staff)):
    admin_id = current_user['_id']
    txn = await wallet_service.admin_debit(data.user_id, data.amount, data.description, admin_id)
    return {'success': True, 'transaction': txn}


@router.post('/wallet/freeze')
async def freeze_wallet(data: FreezeWalletIn, current_user=Depends(require_staff)):
    wallet = await wallets_col.find_one({'_id': data.user_id})
    if not wallet:
        await wallet_service.ensure_wallet(data.user_id)
    await wallets_col.update_one(
        {'_id': data.user_id},
        {'$set': {'isFrozen': data.freeze, 'updatedAt': now()}},
    )
    return {'success': True, 'isFrozen': data.freeze}


@router.get('/wallet/transactions')
async def list_all_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user=Depends(require_staff),
):
    q = {}
    if status:
        q['status'] = status
    if type:
        q['type'] = type
    if search:
        q['$or'] = [
            {'userId': {'$regex': search, '$options': 'i'}},
            {'description': {'$regex': search, '$options': 'i'}},
            {'referenceOrderId': {'$regex': search, '$options': 'i'}},
        ]

    skip = (page - 1) * limit
    total = await wallet_transactions_col.count_documents(q)
    cursor = wallet_transactions_col.find(q).sort('createdAt', -1).skip(skip).limit(limit)
    items = [serialize_doc(t) async for t in cursor]

    # Enrich with user info
    for item in items:
        user = await users_col.find_one({'_id': item['userId']}, {'name': 1, 'email': 1})
        if user:
            item['userName'] = user.get('name', '')
            item['userEmail'] = user.get('email', '')

    return {
        'transactions': items,
        'total': total,
        'page': page,
        'pages': max(1, -(-total // limit)),
    }


@router.get('/wallet/analytics')
async def wallet_analytics(current_user=Depends(require_staff)):
    # Total balance across all wallets
    pipeline = [
        {'$group': {
            '_id': None,
            'totalBalance': {'$sum': '$balance'},
            'totalDistributed': {'$sum': '$lifetimeEarned'},
            'totalSpent': {'$sum': '$lifetimeSpent'},
            'totalExpired': {'$sum': '$expiredRewards'},
            'frozenCount': {'$sum': {'$cond': ['$isFrozen', 1, 0]}},
            'walletCount': {'$sum': 1},
        }}
    ]
    agg = await wallets_col.aggregate(pipeline).to_list(1)
    summary = agg[0] if agg else {
        'totalBalance': 0, 'totalDistributed': 0, 'totalSpent': 0,
        'totalExpired': 0, 'frozenCount': 0, 'walletCount': 0,
    }
    summary.pop('_id', None)

    # Active campaigns count
    active_campaigns = await cashback_campaigns_col.count_documents({'isActive': True})

    # Top wallet users by balance
    top_cursor = wallets_col.find({}).sort('balance', -1).limit(10)
    top_wallets = []
    async for w in top_cursor:
        user = await users_col.find_one({'_id': w['userId']}, {'name': 1, 'email': 1})
        entry = serialize_doc(w)
        if user:
            entry['userName'] = user.get('name', '')
            entry['userEmail'] = user.get('email', '')
        top_wallets.append(entry)

    # Recent transactions summary
    recent_cashback = await wallet_transactions_col.count_documents({'type': 'cashback', 'status': 'completed'})
    recent_referral = await wallet_transactions_col.count_documents({'type': 'referral_bonus', 'status': 'completed'})

    return {
        **summary,
        'activeCampaigns': active_campaigns,
        'topWallets': top_wallets,
        'totalCashbackTransactions': recent_cashback,
        'totalReferralTransactions': recent_referral,
    }


# ── Campaign management ────────────────────────────────────────────────────


@router.get('/wallet/campaigns')
async def list_campaigns(
    page: int = Query(1, ge=1),
    limit: int = Query(20),
    current_user=Depends(require_staff),
):
    return await cashback_service.get_all_campaigns(page, limit)


@router.post('/wallet/campaigns')
async def create_campaign(data: CampaignIn, current_user=Depends(require_staff)):
    from datetime import datetime
    ts = now()
    campaign_id = str(uuid.uuid4())

    starts_at = ts
    if data.startsAt:
        try:
            starts_at = datetime.fromisoformat(data.startsAt.replace('Z', '+00:00'))
        except Exception:
            starts_at = ts

    ends_at = None
    if data.endsAt:
        try:
            ends_at = datetime.fromisoformat(data.endsAt.replace('Z', '+00:00'))
        except Exception:
            ends_at = None

    campaign = {
        '_id': campaign_id,
        'name': data.name,
        'type': data.type,
        'value': data.value,
        'minOrderAmount': data.minOrderAmount,
        'maxCashback': data.maxCashback,
        'applicableTo': data.applicableTo,
        'categoryIds': data.categoryIds,
        'productIds': data.productIds,
        'isActive': data.isActive,
        'startsAt': starts_at,
        'endsAt': ends_at,
        'paymentMethods': data.paymentMethods,
        'userTiers': data.userTiers,
        'createdAt': ts,
        'updatedAt': ts,
    }
    await cashback_campaigns_col.insert_one(campaign)
    return serialize_doc(campaign)


@router.put('/wallet/campaigns/{campaign_id}')
async def update_campaign(
    campaign_id: str,
    data: CampaignIn,
    current_user=Depends(require_staff),
):
    from datetime import datetime
    ts = now()
    existing = await cashback_campaigns_col.find_one({'_id': campaign_id})
    if not existing:
        raise HTTPException(status_code=404, detail='Campaign not found')

    starts_at = existing.get('startsAt', ts)
    if data.startsAt:
        try:
            starts_at = datetime.fromisoformat(data.startsAt.replace('Z', '+00:00'))
        except Exception:
            pass

    ends_at = existing.get('endsAt')
    if data.endsAt:
        try:
            ends_at = datetime.fromisoformat(data.endsAt.replace('Z', '+00:00'))
        except Exception:
            pass

    updates = {
        'name': data.name,
        'type': data.type,
        'value': data.value,
        'minOrderAmount': data.minOrderAmount,
        'maxCashback': data.maxCashback,
        'applicableTo': data.applicableTo,
        'categoryIds': data.categoryIds,
        'productIds': data.productIds,
        'isActive': data.isActive,
        'startsAt': starts_at,
        'endsAt': ends_at,
        'paymentMethods': data.paymentMethods,
        'userTiers': data.userTiers,
        'updatedAt': ts,
    }
    await cashback_campaigns_col.update_one({'_id': campaign_id}, {'$set': updates})
    updated = await cashback_campaigns_col.find_one({'_id': campaign_id})
    return serialize_doc(updated)


@router.delete('/wallet/campaigns/{campaign_id}')
async def delete_campaign(campaign_id: str, current_user=Depends(require_staff)):
    existing = await cashback_campaigns_col.find_one({'_id': campaign_id})
    if not existing:
        raise HTTPException(status_code=404, detail='Campaign not found')
    await cashback_campaigns_col.delete_one({'_id': campaign_id})
    return {'success': True}


# ── Settings ───────────────────────────────────────────────────────────────


@router.get('/wallet/settings')
async def get_settings(current_user=Depends(require_staff)):
    settings = await cashback_service.get_cashback_settings()
    return serialize_doc(settings)


@router.put('/wallet/settings')
async def update_settings(data: SettingsIn, current_user=Depends(require_staff)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    result = await cashback_service.update_cashback_settings(updates)
    return serialize_doc(result)


# ── Referrals ──────────────────────────────────────────────────────────────


@router.get('/wallet/referrals')
async def list_referrals(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    current_user=Depends(require_staff),
):
    q = {}
    if status:
        q['status'] = status

    skip = (page - 1) * limit
    total = await referral_tracking_col.count_documents(q)
    cursor = referral_tracking_col.find(q).sort('createdAt', -1).skip(skip).limit(limit)
    items = []
    async for tracking in cursor:
        entry = serialize_doc(tracking)
        referrer = await users_col.find_one({'_id': tracking['referrerId']}, {'name': 1, 'email': 1})
        referee = await users_col.find_one({'_id': tracking['refereeId']}, {'name': 1, 'email': 1})
        if referrer:
            entry['referrerName'] = referrer.get('name', '')
            entry['referrerEmail'] = referrer.get('email', '')
        if referee:
            entry['refereeName'] = referee.get('name', '')
            entry['refereeEmail'] = referee.get('email', '')
        items.append(entry)

    stats = await referral_service.admin_get_referral_stats()

    return {
        'referrals': items,
        'total': total,
        'page': page,
        'pages': max(1, -(-total // limit)),
        'stats': stats,
    }
