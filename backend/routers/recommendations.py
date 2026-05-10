"""
Recommendations API Router
Returns personalized product recommendations for frontend carousels.
"""
from fastapi import APIRouter
from typing import Optional
from services.recommendation_service import get_recommendations, compute_conversion_probability
from database import products_col
from utils.helpers import serialize_doc

router = APIRouter()


@router.get("/")
async def recommendations(
    userId: Optional[str] = None,
    sessionId: str = "",
    limit: int = 12,
):
    data = await get_recommendations(userId, sessionId, limit)
    return data


@router.get("/probability/{user_id}")
async def conversion_probability(user_id: str):
    prob = await compute_conversion_probability(user_id)
    return {"userId": user_id, "conversionProbability": prob}


@router.get("/trending")
async def trending(limit: int = 12):
    from services.recommendation_service import _get_trending_products
    products = await _get_trending_products(limit)
    return {"products": products}


@router.get("/similar/{product_id}")
async def similar_products(product_id: str, limit: int = 8):
    from services.recommendation_service import _get_similar_products, _to_oids
    products = await _get_similar_products([product_id], limit)
    return {"products": products}
