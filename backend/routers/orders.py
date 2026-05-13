from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from database import orders_col, products_col, carts_col, coupons_col, users_col
from utils.security import get_current_user
from utils.helpers import serialize_doc, now
import uuid

router = APIRouter()


class OrderItemIn(BaseModel):
    productId: str
    quantity: int
    variant: Optional[dict] = None


class ShippingAddressIn(BaseModel):
    name: str
    phone: str
    addressLine1: str
    addressLine2: Optional[str] = None
    city: str
    state: str
    pincode: str


class CreateOrderIn(BaseModel):
    items: List[OrderItemIn]
    shippingAddress: ShippingAddressIn
    paymentMethod: str
    couponCode: Optional[str] = None
    cartId: Optional[str] = None
    walletRedemption: Optional[float] = 0.0


class ReturnRequestIn(BaseModel):
    reason: str
    items: Optional[List[str]] = None  # list of productIds, None = all items
    refundMethod: Optional[str] = 'wallet'  # wallet | original


@router.post('/')
async def create_order(data: CreateOrderIn, current_user=Depends(get_current_user)):
    order_items = []
    subtotal = 0.0
    for item in data.items:
        product = await products_col.find_one({'_id': item.productId})
        if not product:
            raise HTTPException(status_code=404, detail=f'Product {item.productId} not found')
        if product.get('stock', 0) < item.quantity:
            raise HTTPException(status_code=400, detail=f'Insufficient stock for {product["name"]}')
        price = product.get('discountPrice', product.get('price', 0))
        order_items.append({
            'productId': item.productId,
            'name': product['name'],
            'image': product.get('images', [''])[0],
            'price': price,
            'quantity': item.quantity,
            'variant': item.variant or {}
        })
        subtotal += price * item.quantity

    discount = 0.0
    coupon_used = None
    if data.couponCode:
        coupon = await coupons_col.find_one({'code': data.couponCode.upper(), 'isActive': True})
        if coupon and coupon.get('minOrder', 0) <= subtotal:
            if coupon.get('type') == 'flat':
                discount = coupon['value']
            elif coupon.get('type') == 'percentage':
                discount = min(subtotal * coupon['value'] / 100, coupon.get('maxDiscount', 99999))
            coupon_used = {'code': coupon['code'], 'discount': discount}
            await coupons_col.update_one({'_id': coupon['_id']}, {'$push': {'usedBy': current_user['_id']}})

    shipping_charge = 0 if subtotal >= 499 else 79
    total_before_wallet = subtotal - discount + shipping_charge

    wallet_redemption = float(data.walletRedemption or 0)
    if wallet_redemption > 0:
        try:
            from services.cashback_service import get_cashback_settings
            from services.wallet_service import get_wallet
            settings = await get_cashback_settings()
            if not settings.get('walletRedemptionEnabled', True):
                wallet_redemption = 0
            else:
                wallet = await get_wallet(current_user['_id'])
                wallet_balance = wallet.get('balance', 0)
                max_redemption_pct = settings.get('maxRedemptionPercent', 50.0)
                max_allowed = total_before_wallet * max_redemption_pct / 100
                wallet_redemption = min(wallet_redemption, wallet_balance, max_allowed)
                wallet_redemption = round(wallet_redemption, 2)
        except Exception:
            wallet_redemption = 0

    total = max(0.0, total_before_wallet - wallet_redemption)

    order_id = str(uuid.uuid4())
    order_doc = {
        '_id': order_id,
        'user': current_user['_id'],
        'userName': current_user.get('name'),
        'userEmail': current_user.get('email'),
        'items': order_items,
        'shippingAddress': data.shippingAddress.model_dump(),
        'paymentMethod': data.paymentMethod,
        'paymentStatus': 'pending' if data.paymentMethod == 'razorpay' else 'cod',
        'orderStatus': 'placed',
        'subtotal': subtotal,
        'discount': discount,
        'shippingCharge': shipping_charge,
        'totalAmount': total,
        'couponUsed': coupon_used,
        'walletRedemption': wallet_redemption,
        'razorpayOrderId': None,
        'razorpayPaymentId': None,
        'timeline': [{'status': 'placed', 'timestamp': now().isoformat(), 'note': 'Order placed successfully'}],
        'trackingNumber': None,
        'invoiceId': f'INV-{order_id[:8].upper()}',
        'returnRequest': None,
        'refundStatus': None,
        'createdAt': now(),
        'updatedAt': now()
    }
    await orders_col.insert_one(order_doc)

    if wallet_redemption > 0:
        try:
            from services.wallet_service import redeem_wallet
            await redeem_wallet(current_user['_id'], wallet_redemption, order_id)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Wallet debit failed for order {order_id}: {e}')

    for item in order_items:
        await products_col.update_one({'_id': item['productId']}, {'$inc': {'stock': -item['quantity']}})

    if data.cartId:
        await carts_col.update_one({'_id': data.cartId}, {'$set': {'items': []}})

    points = int(total / 100)
    await users_col.update_one({'_id': current_user['_id']}, {'$inc': {'loyaltyPoints': points}})

    return serialize_doc(order_doc)


@router.get('')
@router.get('/')
async def get_my_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(10, le=50),
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    query = {'user': current_user['_id']}
    if status and status != 'all':
        query['orderStatus'] = status
    if search:
        query['invoiceId'] = {'$regex': search.upper(), '$options': 'i'}

    skip = (page - 1) * limit
    total = await orders_col.count_documents(query)
    orders = await orders_col.find(
        query, sort=[('createdAt', -1)]
    ).skip(skip).limit(limit).to_list(limit)
    return {
        'orders': serialize_doc(orders),
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit
    }


@router.get('/{order_id}')
async def get_order(order_id: str, current_user=Depends(get_current_user)):
    order = await orders_col.find_one({'_id': order_id, 'user': current_user['_id']})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    return serialize_doc(order)


@router.post('/{order_id}/cancel')
async def cancel_order(order_id: str, current_user=Depends(get_current_user)):
    order = await orders_col.find_one({'_id': order_id, 'user': current_user['_id']})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    if order.get('orderStatus') not in ['placed', 'confirmed']:
        raise HTTPException(status_code=400, detail='Order cannot be cancelled at this stage')
    timeline = order.get('timeline', [])
    timeline.append({'status': 'cancelled', 'timestamp': now().isoformat(), 'note': 'Cancelled by customer'})

    refund_status = None
    if order.get('paymentStatus') == 'paid':
        refund_status = 'initiated'
        # Refund to wallet
        try:
            from services.wallet_service import credit_wallet
            await credit_wallet(
                user_id=current_user['_id'],
                amount=order['totalAmount'],
                description=f"Refund for cancelled order #{order.get('invoiceId')}",
                reference_order_id=order_id,
                txn_type='refund'
            )
            refund_status = 'refunded'
        except Exception:
            pass

    await orders_col.update_one(
        {'_id': order_id},
        {'$set': {
            'orderStatus': 'cancelled',
            'refundStatus': refund_status,
            'timeline': timeline,
            'updatedAt': now()
        }}
    )
    for item in order.get('items', []):
        await products_col.update_one({'_id': item['productId']}, {'$inc': {'stock': item['quantity']}})
    return {'message': 'Order cancelled', 'refundStatus': refund_status}


@router.post('/{order_id}/return')
async def request_return(order_id: str, data: ReturnRequestIn, current_user=Depends(get_current_user)):
    order = await orders_col.find_one({'_id': order_id, 'user': current_user['_id']})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    if order.get('orderStatus') != 'delivered':
        raise HTTPException(status_code=400, detail='Only delivered orders can be returned')
    if order.get('returnRequest'):
        raise HTTPException(status_code=400, detail='Return already requested')

    timeline = order.get('timeline', [])
    timeline.append({'status': 'return_requested', 'timestamp': now().isoformat(), 'note': f'Return requested: {data.reason}'})

    return_doc = {
        'reason': data.reason,
        'refundMethod': data.refundMethod,
        'requestedAt': now().isoformat(),
        'status': 'pending',
        'items': data.items
    }

    await orders_col.update_one(
        {'_id': order_id},
        {'$set': {
            'orderStatus': 'return_requested',
            'returnRequest': return_doc,
            'refundStatus': 'pending',
            'timeline': timeline,
            'updatedAt': now()
        }}
    )
    return {'message': 'Return request submitted successfully'}


@router.post('/{order_id}/reorder')
async def reorder(order_id: str, current_user=Depends(get_current_user)):
    """Add all items from a past order back to the user's cart."""
    order = await orders_col.find_one({'_id': order_id, 'user': current_user['_id']})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')

    cart = await carts_col.find_one({'user': current_user['_id']}) or {'items': []}
    existing_items = {item['productId']: item for item in cart.get('items', [])}

    added, unavailable = [], []
    for item in order.get('items', []):
        product = await products_col.find_one({'_id': item['productId'], 'isActive': True})
        if not product or product.get('stock', 0) == 0:
            unavailable.append(item['name'])
            continue
        if item['productId'] in existing_items:
            existing_items[item['productId']]['quantity'] += item['quantity']
        else:
            existing_items[item['productId']] = {
                'productId': item['productId'],
                'name': item['name'],
                'image': item.get('image', ''),
                'price': product.get('discountPrice', item['price']),
                'quantity': item['quantity'],
                'variant': item.get('variant', {})
            }
            added.append(item['name'])

    new_items = list(existing_items.values())
    cart_total = sum(i['price'] * i['quantity'] for i in new_items)

    await carts_col.update_one(
        {'user': current_user['_id']},
        {'$set': {'items': new_items, 'total': cart_total, 'updatedAt': now()}},
        upsert=True
    )
    return {'message': f'{len(added)} item(s) added to cart', 'unavailable': unavailable}
