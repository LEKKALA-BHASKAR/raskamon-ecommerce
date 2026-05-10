"""
User-facing wallet, cashback, and referral APIs.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional
from utils.security import get_current_user
from utils.helpers import serialize_doc
from services import wallet_service, cashback_service, referral_service

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────


class RedeemIn(BaseModel):
    order_id: str
    amount: float


class ApplyReferralIn(BaseModel):
    referral_code: str


# ── Routes ─────────────────────────────────────────────────────────────────


@router.get('/')
async def get_my_wallet(current_user=Depends(get_current_user)):
    user_id = current_user['_id']
    wallet = await wallet_service.get_wallet(user_id)
    return serialize_doc(wallet)


@router.get('/transactions')
async def get_my_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user=Depends(get_current_user),
):
    user_id = current_user['_id']
    return await wallet_service.get_wallet_transactions(user_id, page, limit)


@router.post('/redeem')
async def redeem_wallet(data: RedeemIn, current_user=Depends(get_current_user)):
    user_id = current_user['_id']
    settings = await cashback_service.get_cashback_settings()

    if not settings.get('walletRedemptionEnabled'):
        raise HTTPException(status_code=400, detail='Wallet redemption is currently disabled')

    if data.amount < settings.get('minRedemptionAmount', 10):
        raise HTTPException(
            status_code=400,
            detail=f'Minimum redemption amount is ₹{settings.get("minRedemptionAmount", 10)}'
        )

    wallet = await wallet_service.get_wallet(user_id)
    if wallet.get('balance', 0) < data.amount:
        raise HTTPException(status_code=400, detail='Insufficient wallet balance')

    new_balance = await wallet_service.redeem_wallet(user_id, data.amount, data.order_id)
    return {'success': True, 'newBalance': new_balance, 'redeemedAmount': data.amount}


@router.get('/referral')
async def get_referral_dashboard(current_user=Depends(get_current_user)):
    user_id = current_user['_id']
    return await referral_service.get_referral_dashboard(user_id)


@router.get('/cashback/preview')
async def preview_cashback(
    order_id: Optional[str] = Query(None),
    order_amount: Optional[float] = Query(None),
    current_user=Depends(get_current_user),
):
    """Preview cashback for a given order amount or order_id."""
    from database import orders_col
    user_id = current_user['_id']

    if order_id:
        order = await orders_col.find_one({'_id': order_id, 'user': user_id})
        if not order:
            raise HTTPException(status_code=404, detail='Order not found')
    elif order_amount is not None:
        # Synthetic order for preview
        order = {'totalAmount': order_amount, 'user': user_id, 'items': [], 'paymentMethod': 'razorpay'}
    else:
        raise HTTPException(status_code=400, detail='Provide order_id or order_amount')

    result = await cashback_service.calculate_cashback(order, current_user)
    settings = await cashback_service.get_cashback_settings()
    return {
        'estimatedCashback': result['amount'],
        'campaign': result.get('campaign'),
        'source': result.get('source'),
        'walletBalance': (await wallet_service.get_wallet(user_id)).get('balance', 0),
        'settings': {
            'walletRedemptionEnabled': settings.get('walletRedemptionEnabled'),
            'maxRedemptionPercent': settings.get('maxRedemptionPercent'),
            'minRedemptionAmount': settings.get('minRedemptionAmount'),
        },
    }


@router.post('/referral/apply')
async def apply_referral_code(data: ApplyReferralIn, current_user=Depends(get_current_user)):
    user_id = current_user['_id']
    tracking = await referral_service.apply_referral_on_signup(user_id, data.referral_code)
    if not tracking:
        raise HTTPException(status_code=400, detail='Invalid referral code or already applied')
    return {'success': True, 'message': 'Referral code applied successfully'}
