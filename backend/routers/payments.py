from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from database import orders_col, products_col
from utils.security import get_current_user
from utils.helpers import serialize_doc, now
import razorpay
import hmac
import hashlib
import os
import json

router = APIRouter()

RZ_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RZ_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
RZ_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')


class CreateRazorpayOrderIn(BaseModel):
    order_id: str  # Our order ID


class VerifyPaymentIn(BaseModel):
    order_id: str  # Our order ID
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.post('/create-order')
async def create_razorpay_order(data: CreateRazorpayOrderIn, current_user=Depends(get_current_user)):
    order = await orders_col.find_one({'_id': data.order_id, 'user': current_user['_id']})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    if order.get('paymentMethod') != 'razorpay':
        raise HTTPException(status_code=400, detail='Order is not Razorpay payment')

    try:
        rz_client = razorpay.Client(auth=(RZ_KEY_ID, RZ_KEY_SECRET))
        amount_paise = int(order['totalAmount'] * 100)
        rz_order = rz_client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'receipt': order['invoiceId'][:40],
            'payment_capture': 1,
            'notes': {'order_id': data.order_id}
        })
        await orders_col.update_one(
            {'_id': data.order_id},
            {'$set': {'razorpayOrderId': rz_order['id'], 'updatedAt': now()}}
        )
        return {
            'razorpay_order_id': rz_order['id'],
            'amount': amount_paise,
            'currency': 'INR',
            'key_id': RZ_KEY_ID
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Payment gateway error: {str(e)}')


@router.post('/verify')
async def verify_payment(data: VerifyPaymentIn, current_user=Depends(get_current_user)):
    # Verify signature
    raw = f'{data.razorpay_order_id}|{data.razorpay_payment_id}'
    expected = hmac.new(
        RZ_KEY_SECRET.encode('utf-8'),
        raw.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, data.razorpay_signature):
        raise HTTPException(status_code=400, detail='Invalid payment signature')

    order = await orders_col.find_one({'_id': data.order_id})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')

    timeline = order.get('timeline', [])
    timeline.append({'status': 'confirmed', 'timestamp': now().isoformat(), 'note': 'Payment received'})

    await orders_col.update_one(
        {'_id': data.order_id},
        {'$set': {
            'paymentStatus': 'paid',
            'orderStatus': 'confirmed',
            'razorpayPaymentId': data.razorpay_payment_id,
            'timeline': timeline,
            'updatedAt': now()
        }}
    )
    return {'message': 'Payment verified', 'order_id': data.order_id}


@router.post('/webhook')
async def razorpay_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get('X-Razorpay-Signature', '')
    if RZ_WEBHOOK_SECRET:
        expected = hmac.new(
            RZ_WEBHOOK_SECRET.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail='Invalid webhook signature')
    data = json.loads(payload)
    event = data.get('event')
    if event == 'payment.captured':
        payment = data.get('payload', {}).get('payment', {}).get('entity', {})
        notes = payment.get('notes', {})
        order_id = notes.get('order_id')
        if order_id:
            order = await orders_col.find_one({'_id': order_id})
            if order and order.get('paymentStatus') != 'paid':
                timeline = order.get('timeline', [])
                timeline.append({'status': 'confirmed', 'timestamp': now().isoformat(), 'note': 'Payment captured via webhook'})
                await orders_col.update_one(
                    {'_id': order_id},
                    {'$set': {'paymentStatus': 'paid', 'orderStatus': 'confirmed', 'timeline': timeline, 'updatedAt': now()}}
                )
    return {'status': 'ok'}
