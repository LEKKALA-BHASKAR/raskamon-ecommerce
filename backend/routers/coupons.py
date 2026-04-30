from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import coupons_col
from utils.helpers import serialize_doc, now

router = APIRouter()


class ValidateCouponIn(BaseModel):
    code: str
    cart_total: float


@router.post('/validate')
async def validate_coupon(data: ValidateCouponIn):
    coupon = await coupons_col.find_one({'code': data.code.upper(), 'isActive': True})
    if not coupon:
        raise HTTPException(status_code=404, detail='Coupon not found or expired')

    # Check expiry
    if coupon.get('expiresAt'):
        from datetime import datetime, timezone
        expiry = coupon['expiresAt']
        if isinstance(expiry, str):
            expiry = datetime.fromisoformat(expiry.replace('Z', '+00:00'))
        if expiry.replace(tzinfo=timezone.utc) < now():
            raise HTTPException(status_code=400, detail='Coupon has expired')

    # Check min order
    if data.cart_total < coupon.get('minOrder', 0):
        raise HTTPException(status_code=400, detail=f'Minimum order amount is ₹{coupon["minOrder"]}')

    # Check max uses
    max_uses = coupon.get('maxUses')
    if max_uses and len(coupon.get('usedBy', [])) >= max_uses:
        raise HTTPException(status_code=400, detail='Coupon usage limit reached')

    # Calculate discount
    discount = 0.0
    if coupon['type'] == 'flat':
        discount = coupon['value']
    elif coupon['type'] == 'percentage':
        discount = min(data.cart_total * coupon['value'] / 100, coupon.get('maxDiscount', 99999))
    elif coupon['type'] == 'free_shipping':
        discount = 79  # Standard shipping charge

    return {
        'valid': True,
        'code': coupon['code'],
        'type': coupon['type'],
        'value': coupon['value'],
        'discount': round(discount, 2),
        'message': f'Coupon applied! You save ₹{round(discount, 2)}'
    }
