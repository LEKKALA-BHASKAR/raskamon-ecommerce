from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel, validator
from typing import Optional, List
from database import users_col, products_col, notifications_col, orders_col
from utils.security import get_current_user
from utils.helpers import serialize_doc, now
from passlib.context import CryptContext
import uuid
import re
import json
from datetime import datetime

router = APIRouter()
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


class AddressIn(BaseModel):
    name: str
    phone: str
    addressLine1: str
    addressLine2: Optional[str] = None
    city: str
    state: str
    pincode: str
    addressType: Optional[str] = 'home'
    isDefault: bool = False

    @validator('pincode')
    def validate_pincode(cls, v):
        if not re.match(r'^\d{6}$', v):
            raise ValueError('Pincode must be 6 digits')
        return v

    @validator('phone')
    def validate_phone(cls, v):
        digits = re.sub(r'\D', '', v)
        if len(digits) < 10:
            raise ValueError('Phone must have at least 10 digits')
        return v


class UpdateProfileIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None
    gender: Optional[str] = None
    dateOfBirth: Optional[str] = None
    # GST / billing details
    gstNumber: Optional[str] = None
    companyName: Optional[str] = None
    billingName: Optional[str] = None


class CommunicationPrefsIn(BaseModel):
    email_order_updates: Optional[bool] = True
    email_promotions: Optional[bool] = True
    email_newsletter: Optional[bool] = True
    sms_order_updates: Optional[bool] = True
    sms_promotions: Optional[bool] = False
    push_notifications: Optional[bool] = True


class SavedCardIn(BaseModel):
    last4: str  # last 4 digits only
    cardType: str  # visa | mastercard | rupay
    cardHolderName: str
    expiryMonth: int
    expiryYear: int
    bankName: Optional[str] = None
    isDefault: bool = False
    tokenRef: Optional[str] = None  # gateway tokenization ref


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str

    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


@router.get('/me')
async def get_profile(current_user=Depends(get_current_user)):
    return serialize_doc(current_user)


@router.put('/me')
async def update_profile(data: UpdateProfileIn, current_user=Depends(get_current_user)):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    update['updatedAt'] = now()
    await users_col.update_one({'_id': current_user['_id']}, {'$set': update})
    user = await users_col.find_one({'_id': current_user['_id']}, {'password': 0})
    return serialize_doc(user)


@router.post('/me/change-password')
async def change_password(data: ChangePasswordIn, current_user=Depends(get_current_user)):
    user_with_pw = await users_col.find_one({'_id': current_user['_id']})
    stored = user_with_pw.get('password', '')
    if not stored or not pwd_context.verify(data.old_password, stored):
        raise HTTPException(status_code=400, detail='Current password is incorrect')
    new_hash = pwd_context.hash(data.new_password)
    await users_col.update_one(
        {'_id': current_user['_id']},
        {'$set': {'password': new_hash, 'updatedAt': now()}}
    )
    return {'message': 'Password changed successfully'}


@router.get('/me/addresses')
async def get_addresses(current_user=Depends(get_current_user)):
    return current_user.get('addresses', [])


@router.post('/me/addresses')
async def add_address(data: AddressIn, current_user=Depends(get_current_user)):
    addresses = current_user.get('addresses', [])
    address = {**data.model_dump(), 'id': str(uuid.uuid4())}
    if data.isDefault or len(addresses) == 0:
        address['isDefault'] = True
        for a in addresses:
            a['isDefault'] = False
    addresses.append(address)
    await users_col.update_one(
        {'_id': current_user['_id']},
        {'$set': {'addresses': addresses, 'updatedAt': now()}}
    )
    return address


@router.put('/me/addresses/{address_id}')
async def update_address(address_id: str, data: AddressIn, current_user=Depends(get_current_user)):
    addresses = current_user.get('addresses', [])
    idx = next((i for i, a in enumerate(addresses) if a.get('id') == address_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail='Address not found')
    if data.isDefault:
        for a in addresses:
            a['isDefault'] = False
    addresses[idx] = {**data.model_dump(), 'id': address_id}
    await users_col.update_one(
        {'_id': current_user['_id']},
        {'$set': {'addresses': addresses, 'updatedAt': now()}}
    )
    return addresses[idx]


@router.delete('/me/addresses/{address_id}')
async def delete_address(address_id: str, current_user=Depends(get_current_user)):
    addresses = [a for a in current_user.get('addresses', []) if a.get('id') != address_id]
    if addresses and not any(a.get('isDefault') for a in addresses):
        addresses[0]['isDefault'] = True
    await users_col.update_one(
        {'_id': current_user['_id']},
        {'$set': {'addresses': addresses, 'updatedAt': now()}}
    )
    return {'message': 'Address deleted'}


@router.post('/me/addresses/{address_id}/set-default')
async def set_default_address(address_id: str, current_user=Depends(get_current_user)):
    addresses = current_user.get('addresses', [])
    found = False
    for a in addresses:
        a['isDefault'] = a.get('id') == address_id
        if a['isDefault']:
            found = True
    if not found:
        raise HTTPException(status_code=404, detail='Address not found')
    await users_col.update_one(
        {'_id': current_user['_id']},
        {'$set': {'addresses': addresses, 'updatedAt': now()}}
    )
    return {'message': 'Default address updated'}


@router.get('/me/wishlist')
async def get_wishlist(current_user=Depends(get_current_user)):
    wishlist_ids = current_user.get('wishlist', [])
    if not wishlist_ids:
        return []
    from bson import ObjectId
    oids = []
    for wid in wishlist_ids:
        try:
            oids.append(ObjectId(wid))
        except Exception:
            oids.append(wid)
    products = await products_col.find(
        {'_id': {'$in': oids}}, {'description': 0}
    ).to_list(100)
    serialized = serialize_doc(products)
    order_map = {p['id']: p for p in serialized}
    return [order_map[wid] for wid in wishlist_ids if wid in order_map]


@router.post('/me/wishlist/{product_id}')
async def add_to_wishlist(product_id: str, current_user=Depends(get_current_user)):
    wishlist = current_user.get('wishlist', [])
    if product_id not in wishlist:
        wishlist.append(product_id)
        await users_col.update_one({'_id': current_user['_id']}, {'$set': {'wishlist': wishlist}})
    return {'message': 'Added to wishlist', 'count': len(wishlist)}


@router.delete('/me/wishlist/{product_id}')
async def remove_from_wishlist(product_id: str, current_user=Depends(get_current_user)):
    wishlist = [w for w in current_user.get('wishlist', []) if w != product_id]
    await users_col.update_one({'_id': current_user['_id']}, {'$set': {'wishlist': wishlist}})
    return {'message': 'Removed from wishlist', 'count': len(wishlist)}


@router.get('/me/notifications')
async def get_notifications(
    current_user=Depends(get_current_user),
    limit: int = 30,
    unread_only: bool = False
):
    query = {'userId': current_user['_id']}
    if unread_only:
        query['read'] = False
    notifs = await notifications_col.find(
        query, sort=[('createdAt', -1)]
    ).limit(limit).to_list(limit)
    unread = await notifications_col.count_documents({'userId': current_user['_id'], 'read': False})
    return {'notifications': serialize_doc(notifs), 'unreadCount': unread}


@router.post('/me/notifications/mark-all-read')
async def mark_all_read(current_user=Depends(get_current_user)):
    await notifications_col.update_many(
        {'userId': current_user['_id'], 'read': False},
        {'$set': {'read': True}}
    )
    return {'message': 'All notifications marked as read'}


@router.get('/me/loyalty')
async def get_loyalty(current_user=Depends(get_current_user)):
    return {'points': current_user.get('loyaltyPoints', 0)}


# ── Communication Preferences ──────────────────────────────────────────

@router.get('/me/communication-prefs')
async def get_communication_prefs(current_user=Depends(get_current_user)):
    defaults = {
        'email_order_updates': True, 'email_promotions': True, 'email_newsletter': True,
        'sms_order_updates': True, 'sms_promotions': False, 'push_notifications': True,
    }
    prefs = current_user.get('communication_prefs', defaults)
    return {**defaults, **prefs}


@router.put('/me/communication-prefs')
async def update_communication_prefs(data: CommunicationPrefsIn, current_user=Depends(get_current_user)):
    prefs = {k: v for k, v in data.model_dump().items() if v is not None}
    await users_col.update_one(
        {'_id': current_user['_id']},
        {'$set': {'communication_prefs': prefs, 'updatedAt': now()}}
    )
    return prefs


# ── Saved Cards (Tokenized) ────────────────────────────────────────────

@router.get('/me/saved-cards')
async def get_saved_cards(current_user=Depends(get_current_user)):
    return current_user.get('saved_cards', [])


@router.post('/me/saved-cards')
async def add_saved_card(data: SavedCardIn, current_user=Depends(get_current_user)):
    cards = current_user.get('saved_cards', [])
    card = {**data.model_dump(), 'id': str(uuid.uuid4())}
    if data.isDefault or len(cards) == 0:
        card['isDefault'] = True
        for c in cards:
            c['isDefault'] = False
    cards.append(card)
    await users_col.update_one(
        {'_id': current_user['_id']},
        {'$set': {'saved_cards': cards, 'updatedAt': now()}}
    )
    return card


@router.delete('/me/saved-cards/{card_id}')
async def delete_saved_card(card_id: str, current_user=Depends(get_current_user)):
    cards = [c for c in current_user.get('saved_cards', []) if c.get('id') != card_id]
    if cards and not any(c.get('isDefault') for c in cards):
        cards[0]['isDefault'] = True
    await users_col.update_one(
        {'_id': current_user['_id']},
        {'$set': {'saved_cards': cards, 'updatedAt': now()}}
    )
    return {'message': 'Card removed'}


# ── Recently Viewed ────────────────────────────────────────────────────

@router.get('/me/recently-viewed')
async def get_recently_viewed(limit: int = 12, current_user=Depends(get_current_user)):
    try:
        from services.tracking_service import get_recently_viewed
        items = await get_recently_viewed(current_user['_id'], limit)
        return items
    except Exception:
        return []


# ── Invoice Download ───────────────────────────────────────────────────

@router.get('/me/orders/{order_id}/invoice')
async def download_invoice(order_id: str, current_user=Depends(get_current_user)):
    """Generate and return invoice JSON (can be rendered as PDF client-side)"""
    order = await orders_col.find_one({'_id': order_id, 'user': current_user['_id']})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')

    user = current_user
    invoice = {
        'invoiceId': order.get('invoiceId', f'INV-{order_id[:8].upper()}'),
        'orderId': order_id,
        'date': (order.get('createdAt') or datetime.utcnow()).isoformat(),
        'customer': {
            'name': user.get('name'),
            'email': user.get('email'),
            'phone': user.get('phone'),
            'gstNumber': user.get('gstNumber'),
            'companyName': user.get('companyName'),
        },
        'shippingAddress': order.get('shippingAddress'),
        'items': [{
            'name': item.get('name'),
            'quantity': item.get('quantity'),
            'price': item.get('price'),
            'total': item.get('price', 0) * item.get('quantity', 0),
            'variant': item.get('variant'),
        } for item in order.get('items', [])],
        'subtotal': order.get('subtotal', 0),
        'discount': order.get('discount', 0),
        'shippingCharge': order.get('shippingCharge', 0),
        'walletRedemption': order.get('walletRedemption', 0),
        'totalAmount': order.get('totalAmount', 0),
        'paymentMethod': order.get('paymentMethod'),
        'paymentStatus': order.get('paymentStatus'),
        'orderStatus': order.get('orderStatus'),
        'couponUsed': order.get('couponUsed'),
    }
    return invoice


# ── Default Billing Address ────────────────────────────────────────────

@router.post('/me/addresses/{address_id}/set-billing-default')
async def set_billing_default(address_id: str, current_user=Depends(get_current_user)):
    """Set an address as the default billing address"""
    addresses = current_user.get('addresses', [])
    found = False
    for a in addresses:
        a['isBillingDefault'] = a.get('id') == address_id
        if a['isBillingDefault']:
            found = True
    if not found:
        raise HTTPException(status_code=404, detail='Address not found')
    await users_col.update_one(
        {'_id': current_user['_id']},
        {'$set': {'addresses': addresses, 'updatedAt': now()}}
    )
    return {'message': 'Default billing address updated'}
