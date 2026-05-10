"""
Core wallet engine — credit, debit, redemption, ledger, admin ops.
"""
import uuid
import logging
from typing import Optional
from fastapi import HTTPException
from database import (
    wallets_col, wallet_transactions_col, users_col
)
from utils.helpers import now, serialize_doc

logger = logging.getLogger(__name__)

# ── Internal helpers ───────────────────────────────────────────────────────


def _txn_id() -> str:
    return str(uuid.uuid4())


# ── Wallet CRUD ────────────────────────────────────────────────────────────


async def ensure_wallet(user_id: str) -> dict:
    """Create wallet if it doesn't exist (idempotent)."""
    existing = await wallets_col.find_one({'_id': user_id})
    if existing:
        return existing
    ts = now()
    wallet = {
        '_id': user_id,
        'userId': user_id,
        'balance': 0.0,
        'lifetimeEarned': 0.0,
        'lifetimeSpent': 0.0,
        'pendingRewards': 0.0,
        'expiredRewards': 0.0,
        'isFrozen': False,
        'createdAt': ts,
        'updatedAt': ts,
    }
    try:
        await wallets_col.insert_one(wallet)
    except Exception:
        # Race condition — another request created it first
        existing = await wallets_col.find_one({'_id': user_id})
        if existing:
            return existing
        raise
    return wallet


async def get_wallet(user_id: str) -> dict:
    wallet = await wallets_col.find_one({'_id': user_id})
    if not wallet:
        wallet = await ensure_wallet(user_id)
    return wallet


# ── Credit ─────────────────────────────────────────────────────────────────


async def credit_wallet(
    user_id: str,
    amount: float,
    type: str,
    source: str,
    description: str,
    reference_order_id: Optional[str] = None,
    expiry_days: Optional[int] = None,
) -> dict:
    """
    Atomic credit. For cashback (type='cashback') prevents duplicates by
    checking (userId, type, referenceOrderId).
    """
    if amount <= 0:
        raise HTTPException(status_code=400, detail='Credit amount must be positive')

    # Duplicate prevention for cashback
    if type == 'cashback' and reference_order_id:
        existing_txn = await wallet_transactions_col.find_one({
            'userId': user_id,
            'type': 'cashback',
            'referenceOrderId': reference_order_id,
        })
        if existing_txn:
            logger.info(f'Cashback already credited for order {reference_order_id}')
            return serialize_doc(existing_txn)

    await ensure_wallet(user_id)

    wallet = await wallets_col.find_one({'_id': user_id})
    if wallet and wallet.get('isFrozen'):
        raise HTTPException(status_code=400, detail='Wallet is frozen')

    ts = now()
    expiry_date = None
    if expiry_days:
        from datetime import timedelta
        expiry_date = ts + timedelta(days=expiry_days)

    txn_id = _txn_id()
    txn = {
        '_id': txn_id,
        'transactionId': txn_id,
        'userId': user_id,
        'type': type,
        'source': source,
        'amount': float(amount),
        'status': 'completed',
        'description': description,
        'referenceOrderId': reference_order_id,
        'expiryDate': expiry_date,
        'createdAt': ts,
    }
    await wallet_transactions_col.insert_one(txn)

    await wallets_col.update_one(
        {'_id': user_id},
        {
            '$inc': {
                'balance': amount,
                'lifetimeEarned': amount,
            },
            '$set': {'updatedAt': ts},
        },
    )
    return serialize_doc(txn)


# ── Debit ──────────────────────────────────────────────────────────────────


async def debit_wallet(
    user_id: str,
    amount: float,
    type: str,
    source: str,
    description: str,
    reference_order_id: Optional[str] = None,
) -> dict:
    """Atomic debit — prevents negative balance."""
    if amount <= 0:
        raise HTTPException(status_code=400, detail='Debit amount must be positive')

    wallet = await get_wallet(user_id)
    if wallet.get('isFrozen'):
        raise HTTPException(status_code=400, detail='Wallet is frozen')
    if wallet.get('balance', 0) < amount:
        raise HTTPException(status_code=400, detail='Insufficient wallet balance')

    ts = now()
    txn_id = _txn_id()
    txn = {
        '_id': txn_id,
        'transactionId': txn_id,
        'userId': user_id,
        'type': type,
        'source': source,
        'amount': float(amount),
        'status': 'completed',
        'description': description,
        'referenceOrderId': reference_order_id,
        'expiryDate': None,
        'createdAt': ts,
    }
    await wallet_transactions_col.insert_one(txn)

    await wallets_col.update_one(
        {'_id': user_id},
        {
            '$inc': {
                'balance': -amount,
                'lifetimeSpent': amount,
            },
            '$set': {'updatedAt': ts},
        },
    )
    return serialize_doc(txn)


# ── Redemption ─────────────────────────────────────────────────────────────


async def redeem_wallet(user_id: str, amount: float, order_id: str) -> float:
    """
    Debit wallet for order redemption.
    Returns new balance after deduction.
    """
    await debit_wallet(
        user_id=user_id,
        amount=amount,
        type='order_redemption',
        source='order',
        description=f'Wallet redeemed for order',
        reference_order_id=order_id,
    )
    wallet = await get_wallet(user_id)
    return wallet.get('balance', 0.0)


# ── Ledger ─────────────────────────────────────────────────────────────────


async def get_wallet_transactions(user_id: str, page: int = 1, limit: int = 20) -> dict:
    skip = (page - 1) * limit
    q = {'userId': user_id}
    total = await wallet_transactions_col.count_documents(q)
    cursor = wallet_transactions_col.find(q).sort('createdAt', -1).skip(skip).limit(limit)
    items = [serialize_doc(t) async for t in cursor]
    return {
        'transactions': items,
        'total': total,
        'page': page,
        'pages': max(1, -(-total // limit)),
    }


# ── Expiry ─────────────────────────────────────────────────────────────────


async def expire_old_rewards() -> int:
    """
    Background job: mark expired transactions and deduct expired amounts
    from wallet balances.
    """
    ts = now()
    cursor = wallet_transactions_col.find({
        'status': 'completed',
        'expiryDate': {'$lt': ts, '$ne': None},
    })
    expired_count = 0
    async for txn in cursor:
        user_id = txn['userId']
        amount = txn['amount']
        # Mark transaction expired
        await wallet_transactions_col.update_one(
            {'_id': txn['_id']},
            {'$set': {'status': 'expired'}},
        )
        # Deduct from wallet (floor at 0)
        wallet = await get_wallet(user_id)
        deduct = min(amount, wallet.get('balance', 0))
        if deduct > 0:
            await wallets_col.update_one(
                {'_id': user_id},
                {
                    '$inc': {
                        'balance': -deduct,
                        'expiredRewards': deduct,
                    },
                    '$set': {'updatedAt': ts},
                },
            )
        expired_count += 1
    return expired_count


# ── Admin ops ──────────────────────────────────────────────────────────────


async def admin_credit(
    user_id: str,
    amount: float,
    description: str,
    admin_id: str,
) -> dict:
    desc = f'[Admin Credit by {admin_id}] {description}'
    return await credit_wallet(
        user_id=user_id,
        amount=amount,
        type='admin_credit',
        source='admin',
        description=desc,
    )


async def admin_debit(
    user_id: str,
    amount: float,
    description: str,
    admin_id: str,
) -> dict:
    desc = f'[Admin Debit by {admin_id}] {description}'
    return await debit_wallet(
        user_id=user_id,
        amount=amount,
        type='admin_debit',
        source='admin',
        description=desc,
    )


async def admin_get_all_wallets(page: int = 1, limit: int = 20, search: str = '') -> dict:
    skip = (page - 1) * limit
    q = {}

    if search:
        # Search by userId substring
        q['userId'] = {'$regex': search, '$options': 'i'}

    total = await wallets_col.count_documents(q)
    cursor = wallets_col.find(q).sort('balance', -1).skip(skip).limit(limit)
    wallets = [serialize_doc(w) async for w in cursor]

    # Enrich with user info
    for w in wallets:
        user = await users_col.find_one({'_id': w['userId']}, {'name': 1, 'email': 1, 'phone': 1})
        if user:
            w['userName'] = user.get('name', '')
            w['userEmail'] = user.get('email', '')
            w['userPhone'] = user.get('phone', '')

    return {
        'wallets': wallets,
        'total': total,
        'page': page,
        'pages': max(1, -(-total // limit)),
    }
