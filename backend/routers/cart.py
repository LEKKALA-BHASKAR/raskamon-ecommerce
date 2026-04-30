from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import carts_col, products_col
from utils.security import get_current_user_optional
from utils.helpers import serialize_doc, now
import uuid

router = APIRouter()


class CartItemIn(BaseModel):
    product_id: str
    quantity: int = 1
    variant: Optional[dict] = None


class UpdateCartItem(BaseModel):
    quantity: int


async def get_or_create_cart(cart_id: str):
    cart = await carts_col.find_one({'_id': cart_id})
    if not cart:
        cart = {'_id': cart_id, 'items': [], 'updatedAt': now()}
        await carts_col.insert_one(cart)
    return cart


@router.get('/{cart_id}')
async def get_cart(cart_id: str):
    cart = await carts_col.find_one({'_id': cart_id})
    if not cart:
        return {'id': cart_id, 'items': [], 'total': 0}
    # Enrich items with product data
    enriched = []
    for item in cart.get('items', []):
        product = await products_col.find_one({'_id': item['productId']}, {'name': 1, 'images': 1, 'discountPrice': 1, 'price': 1, 'stock': 1, 'slug': 1})
        if product:
            enriched.append({
                **item,
                'product': serialize_doc(product)
            })
    total = sum(i['product']['discountPrice'] * i['quantity'] for i in enriched if 'product' in i)
    return {'id': cart_id, 'items': enriched, 'total': total}


@router.post('/{cart_id}/items')
async def add_to_cart(cart_id: str, data: CartItemIn):
    product = await products_col.find_one({'_id': data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')
    if product.get('stock', 0) < data.quantity:
        raise HTTPException(status_code=400, detail='Insufficient stock')
    cart = await get_or_create_cart(cart_id)
    items = cart.get('items', [])
    # Check if already in cart
    found = False
    for item in items:
        if item['productId'] == data.product_id and item.get('variant') == data.variant:
            item['quantity'] = min(item['quantity'] + data.quantity, product.get('stock', 99))
            found = True
            break
    if not found:
        items.append({
            'productId': data.product_id,
            'quantity': data.quantity,
            'variant': data.variant or {}
        })
    await carts_col.update_one({'_id': cart_id}, {'$set': {'items': items, 'updatedAt': now()}})
    return {'message': 'Item added to cart'}


@router.put('/{cart_id}/items/{product_id}')
async def update_cart_item(cart_id: str, product_id: str, data: UpdateCartItem):
    cart = await carts_col.find_one({'_id': cart_id})
    if not cart:
        raise HTTPException(status_code=404, detail='Cart not found')
    items = cart.get('items', [])
    for item in items:
        if item['productId'] == product_id:
            if data.quantity <= 0:
                items.remove(item)
            else:
                item['quantity'] = data.quantity
            break
    await carts_col.update_one({'_id': cart_id}, {'$set': {'items': items, 'updatedAt': now()}})
    return {'message': 'Cart updated'}


@router.delete('/{cart_id}/items/{product_id}')
async def remove_from_cart(cart_id: str, product_id: str):
    cart = await carts_col.find_one({'_id': cart_id})
    if not cart:
        return {'message': 'Cart not found'}
    items = [i for i in cart.get('items', []) if i['productId'] != product_id]
    await carts_col.update_one({'_id': cart_id}, {'$set': {'items': items, 'updatedAt': now()}})
    return {'message': 'Item removed'}


@router.delete('/{cart_id}')
async def clear_cart(cart_id: str):
    await carts_col.update_one({'_id': cart_id}, {'$set': {'items': [], 'updatedAt': now()}})
    return {'message': 'Cart cleared'}
