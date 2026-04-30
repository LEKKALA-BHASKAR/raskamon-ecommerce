from fastapi import APIRouter, HTTPException, Query, Depends
from database import products_col, reviews_col
from utils.security import get_current_user_optional
from utils.helpers import serialize_doc, paginate
from typing import Optional

router = APIRouter()


@router.get('')
@router.get('/')
async def list_products(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=48),
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    in_stock: Optional[bool] = None,
    tags: Optional[str] = None,
    sort: str = Query('newest', enum=['newest', 'price_asc', 'price_desc', 'rating', 'relevance']),
    search: Optional[str] = None,
    featured: Optional[bool] = None
):
    query = {'isActive': True}
    if category:
        query['category'] = category
    if subcategory:
        query['subcategory'] = subcategory
    if brand:
        query['brand'] = brand
    if min_price is not None:
        query['discountPrice'] = query.get('discountPrice', {})
        query['discountPrice']['$gte'] = min_price
    if max_price is not None:
        query['discountPrice'] = query.get('discountPrice', {})
        query['discountPrice']['$lte'] = max_price
    if min_rating is not None:
        query['rating'] = {'$gte': min_rating}
    if in_stock:
        query['stock'] = {'$gt': 0}
    if tags:
        query['tags'] = {'$in': tags.split(',')}
    if featured is not None:
        query['isFeatured'] = featured
    if search:
        query['$text'] = {'$search': search}

    sort_map = {
        'newest': [('createdAt', -1)],
        'price_asc': [('discountPrice', 1)],
        'price_desc': [('discountPrice', -1)],
        'rating': [('rating', -1)],
        'relevance': [('isFeatured', -1), ('rating', -1)]
    }
    sort_option = sort_map.get(sort, [('createdAt', -1)])

    skip, lim = paginate(page, limit)
    total = await products_col.count_documents(query)
    products = await products_col.find(
        query,
        {'description': 0, 'seoMeta': 0}
    ).sort(sort_option).skip(skip).limit(lim).to_list(lim)

    return {
        'products': serialize_doc(products),
        'total': total,
        'page': page,
        'pages': (total + limit - 1) // limit
    }


@router.get('/featured')
async def get_featured(limit: int = Query(8, le=20)):
    products = await products_col.find(
        {'isActive': True, 'isFeatured': True},
        {'description': 0}
    ).sort([('createdAt', -1)]).limit(limit).to_list(limit)
    return serialize_doc(products)


@router.get('/new-arrivals')
async def get_new_arrivals(limit: int = Query(8, le=20)):
    products = await products_col.find(
        {'isActive': True},
        {'description': 0}
    ).sort([('createdAt', -1)]).limit(limit).to_list(limit)
    return serialize_doc(products)


@router.get('/bestsellers')
async def get_bestsellers(limit: int = Query(8, le=20)):
    products = await products_col.find(
        {'isActive': True},
        {'description': 0}
    ).sort([('rating', -1), ('reviewCount', -1)]).limit(limit).to_list(limit)
    return serialize_doc(products)


@router.get('/search')
async def search_products(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, le=20)
):
    products = await products_col.find(
        {'isActive': True, '$text': {'$search': q}},
        {'name': 1, 'slug': 1, 'images': 1, 'discountPrice': 1, 'category': 1}
    ).limit(limit).to_list(limit)
    return serialize_doc(products)


@router.get('/brands')
async def get_brands():
    brands = await products_col.distinct('brand', {'isActive': True})
    return [b for b in brands if b]


@router.get('/{slug}')
async def get_product(slug: str):
    product = await products_col.find_one({'slug': slug, 'isActive': True})
    if not product:
        # Try by ID
        product = await products_col.find_one({'_id': slug, 'isActive': True})
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')
    return serialize_doc(product)


@router.get('/{product_id}/related')
async def get_related(product_id: str, limit: int = Query(6, le=12)):
    product = await products_col.find_one({'_id': product_id})
    if not product:
        product = await products_col.find_one({'slug': product_id})
    if not product:
        return []
    related = await products_col.find(
        {'category': product.get('category'), 'isActive': True, '_id': {'$ne': product['_id']}},
        {'description': 0}
    ).limit(limit).to_list(limit)
    return serialize_doc(related)
