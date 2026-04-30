from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from database import reviews_col, products_col, orders_col
from utils.security import get_current_user
from utils.helpers import serialize_doc, now, paginate
import uuid

router = APIRouter()


class ReviewIn(BaseModel):
    product: str
    rating: int
    title: str
    body: str
    images: Optional[List[str]] = []


@router.get('/product/{product_id}')
async def get_product_reviews(
    product_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10)
):
    skip, lim = paginate(page, limit)
    total = await reviews_col.count_documents({'product': product_id})
    reviews = await reviews_col.find(
        {'product': product_id},
        sort=[('createdAt', -1)]
    ).skip(skip).limit(lim).to_list(lim)
    return {
        'reviews': serialize_doc(reviews),
        'total': total
    }


@router.post('/')
async def create_review(data: ReviewIn, current_user=Depends(get_current_user)):
    # Check if user already reviewed
    existing = await reviews_col.find_one({'product': data.product, 'user': current_user['_id']})
    if existing:
        raise HTTPException(status_code=400, detail='You have already reviewed this product')

    # Check if verified purchase
    order = await orders_col.find_one(
        {'user': current_user['_id'], 'items.productId': data.product, 'orderStatus': 'delivered'}
    )

    review_id = str(uuid.uuid4())
    review = {
        '_id': review_id,
        'product': data.product,
        'user': current_user['_id'],
        'userName': current_user.get('name'),
        'userAvatar': current_user.get('avatar'),
        'rating': min(5, max(1, data.rating)),
        'title': data.title,
        'body': data.body,
        'images': data.images,
        'helpful': 0,
        'verified': bool(order),
        'isApproved': True,
        'createdAt': now()
    }
    await reviews_col.insert_one(review)

    # Update product rating
    all_reviews = await reviews_col.find({'product': data.product, 'isApproved': True}).to_list(1000)
    if all_reviews:
        avg = sum(r['rating'] for r in all_reviews) / len(all_reviews)
        await products_col.update_one(
            {'_id': data.product},
            {'$set': {'rating': round(avg, 1), 'reviewCount': len(all_reviews)}}
        )

    return serialize_doc(review)


@router.post('/{review_id}/helpful')
async def mark_helpful(review_id: str, current_user=Depends(get_current_user)):
    await reviews_col.update_one({'_id': review_id}, {'$inc': {'helpful': 1}})
    return {'message': 'Marked as helpful'}
