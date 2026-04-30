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
    paymentMethod: str  # 'razorpay' | 'cod'
    couponCode: Optional[str] = None
    cartId: Optional[str] = None


@router.post('/')
async def create_order(data: CreateOrderIn, current_user=Depends(get_current_user)):
    # Validate items
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

    # Apply coupon
    discount = 0.0
    coupon_used = None
    if data.couponCode:
        coupon = await coupons_col.find_one({'code': data.couponCode.upper(), 'isActive': True})
        if coupon:
            if coupon.get('minOrder', 0) <= subtotal:
                if coupon.get('type') == 'flat':
                    discount = coupon['value']
                elif coupon.get('type') == 'percentage':
                    discount = min(subtotal * coupon['value'] / 100, coupon.get('maxDiscount', 99999))
                coupon_used = {'code': coupon['code'], 'discount': discount}
                await coupons_col.update_one({'_id': coupon['_id']}, {'$push': {'usedBy': current_user['_id']}})

    shipping_charge = 0 if subtotal >= 499 else 79
    total = subtotal - discount + shipping_charge

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
        'razorpayOrderId': None,
        'razorpayPaymentId': None,
        'timeline': [{'status': 'placed', 'timestamp': now().isoformat(), 'note': 'Order placed'}],
        'trackingNumber': None,
        'invoiceId': f'INV-{order_id[:8].upper()}',
        'createdAt': now(),
        'updatedAt': now()
    }
    await orders_col.insert_one(order_doc)

    # Deduct stock
    for item in order_items:
        await products_col.update_one(
            {'_id': item['productId']},
            {'$inc': {'stock': -item['quantity']}}
        )

    # Clear cart
    if data.cartId:
        await carts_col.update_one({'_id': data.cartId}, {'$set': {'items': []}})

    # Add loyalty points (1 point per 100 rupees)
    points = int(total / 100)
    await users_col.update_one({'_id': current_user['_id']}, {'$inc': {'loyaltyPoints': points}})

    return serialize_doc(order_doc)


@router.get('')
@router.get('/')
async def get_my_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(10),
    current_user=Depends(get_current_user)
):
    skip = (page - 1) * limit
    total = await orders_col.count_documents({'user': current_user['_id']})
    orders = await orders_col.find(
        {'user': current_user['_id']},
        sort=[('createdAt', -1)]
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
        raise HTTPException(status_code=400, detail='Order cannot be cancelled')
    timeline = order.get('timeline', [])
    timeline.append({'status': 'cancelled', 'timestamp': now().isoformat(), 'note': 'Cancelled by customer'})
    await orders_col.update_one(
        {'_id': order_id},
        {'$set': {'orderStatus': 'cancelled', 'timeline': timeline, 'updatedAt': now()}}
    )
    # Restore stock
    for item in order.get('items', []):
        await products_col.update_one({'_id': item['productId']}, {'$inc': {'stock': item['quantity']}})
    return {'message': 'Order cancelled'}
