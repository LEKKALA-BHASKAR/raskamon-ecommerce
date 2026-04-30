from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from database import users_col, products_col
from utils.security import get_current_user
from utils.helpers import serialize_doc, now
import uuid

router = APIRouter()


class AddressIn(BaseModel):
    name: str
    phone: str
    addressLine1: str
    addressLine2: Optional[str] = None
    city: str
    state: str
    pincode: str
    isDefault: bool = False


class UpdateProfileIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str


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


@router.get('/me/addresses')
async def get_addresses(current_user=Depends(get_current_user)):
    return current_user.get('addresses', [])


@router.post('/me/addresses')
async def add_address(data: AddressIn, current_user=Depends(get_current_user)):
    address = data.model_dump()
    address['id'] = str(uuid.uuid4())
    addresses = current_user.get('addresses', [])
    if data.isDefault:
        for a in addresses:
            a['isDefault'] = False
    addresses.append(address)
    await users_col.update_one({'_id': current_user['_id']}, {'$set': {'addresses': addresses, 'updatedAt': now()}})
    return {'message': 'Address added', 'address': address}


@router.put('/me/addresses/{address_id}')
async def update_address(address_id: str, data: AddressIn, current_user=Depends(get_current_user)):
    addresses = current_user.get('addresses', [])
    updated = False
    for i, a in enumerate(addresses):
        if a.get('id') == address_id:
            if data.isDefault:
                for addr in addresses:
                    addr['isDefault'] = False
            addresses[i] = {**data.model_dump(), 'id': address_id}
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail='Address not found')
    await users_col.update_one({'_id': current_user['_id']}, {'$set': {'addresses': addresses, 'updatedAt': now()}})
    return {'message': 'Address updated'}


@router.delete('/me/addresses/{address_id}')
async def delete_address(address_id: str, current_user=Depends(get_current_user)):
    addresses = [a for a in current_user.get('addresses', []) if a.get('id') != address_id]
    await users_col.update_one({'_id': current_user['_id']}, {'$set': {'addresses': addresses, 'updatedAt': now()}})
    return {'message': 'Address deleted'}


@router.get('/me/wishlist')
async def get_wishlist(current_user=Depends(get_current_user)):
    wishlist_ids = current_user.get('wishlist', [])
    products = await products_col.find(
        {'_id': {'$in': wishlist_ids}},
        {'description': 0}
    ).to_list(100)
    return serialize_doc(products)


@router.post('/me/wishlist/{product_id}')
async def add_to_wishlist(product_id: str, current_user=Depends(get_current_user)):
    wishlist = current_user.get('wishlist', [])
    if product_id not in wishlist:
        wishlist.append(product_id)
        await users_col.update_one({'_id': current_user['_id']}, {'$set': {'wishlist': wishlist}})
    return {'message': 'Added to wishlist', 'wishlist': wishlist}


@router.delete('/me/wishlist/{product_id}')
async def remove_from_wishlist(product_id: str, current_user=Depends(get_current_user)):
    wishlist = [w for w in current_user.get('wishlist', []) if w != product_id]
    await users_col.update_one({'_id': current_user['_id']}, {'$set': {'wishlist': wishlist}})
    return {'message': 'Removed from wishlist', 'wishlist': wishlist}


@router.get('/me/loyalty')
async def get_loyalty(current_user=Depends(get_current_user)):
    return {'points': current_user.get('loyaltyPoints', 0)}


@router.get('/me/notifications')
async def get_notifications(current_user=Depends(get_current_user)):
    from database import notifications_col
    notifs = await notifications_col.find(
        {'user': current_user['_id']},
        sort=[('createdAt', -1)]
    ).to_list(50)
    return serialize_doc(notifs)
