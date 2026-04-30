from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from database import (
    products_col, categories_col, orders_col, users_col,
    coupons_col, banners_col, reviews_col, blog_col, audit_logs_col
)
from utils.security import require_admin, require_staff, get_current_user
from utils.helpers import serialize_doc, now, make_slug, paginate
import uuid

router = APIRouter()

# ─── DASHBOARD ────────────────────────────────────────────────────────────────

@router.get('/dashboard/stats')
async def get_dashboard_stats(admin=Depends(require_staff)):
    from datetime import timedelta
    today_start = now().replace(hour=0, minute=0, second=0, microsecond=0)

    total_revenue_pipeline = [
        {'$match': {'paymentStatus': 'paid'}},
        {'$group': {'_id': None, 'total': {'$sum': '$totalAmount'}}}
    ]
    revenue_result = await orders_col.aggregate(total_revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]['total'] if revenue_result else 0

    orders_today = await orders_col.count_documents({'createdAt': {'$gte': today_start}})
    pending_orders = await orders_col.count_documents({'orderStatus': {'$in': ['placed', 'confirmed']}})
    total_customers = await users_col.count_documents({'role': 'customer'})
    total_products = await products_col.count_documents({'isActive': True})
    low_stock = await products_col.count_documents({'stock': {'$lte': 10, '$gt': 0}, 'isActive': True})
    out_of_stock = await products_col.count_documents({'stock': 0, 'isActive': True})

    # Top selling products
    top_pipeline = [
        {'$match': {'orderStatus': {'$nin': ['cancelled']}}},
        {'$unwind': '$items'},
        {'$group': {'_id': '$items.productId', 'name': {'$first': '$items.name'}, 'sales': {'$sum': '$items.quantity'}, 'revenue': {'$sum': {'$multiply': ['$items.price', '$items.quantity']}}}},
        {'$sort': {'sales': -1}},
        {'$limit': 5}
    ]
    top_products = await orders_col.aggregate(top_pipeline).to_list(5)

    # Recent orders
    recent_orders = await orders_col.find(
        {},
        {'_id': 1, 'userName': 1, 'totalAmount': 1, 'orderStatus': 1, 'createdAt': 1}
    ).sort([('createdAt', -1)]).limit(5).to_list(5)

    # Orders by status
    status_pipeline = [
        {'$group': {'_id': '$orderStatus', 'count': {'$sum': 1}}}
    ]
    orders_by_status = await orders_col.aggregate(status_pipeline).to_list(10)

    # Revenue last 7 days
    revenue_pipeline = [
        {'$match': {'paymentStatus': 'paid', 'createdAt': {'$gte': today_start - timedelta(days=7)}}},
        {'$group': {'_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$createdAt'}}, 'revenue': {'$sum': '$totalAmount'}, 'orders': {'$sum': 1}}},
        {'$sort': {'_id': 1}}
    ]
    revenue_trend = await orders_col.aggregate(revenue_pipeline).to_list(7)

    return {
        'totalRevenue': total_revenue,
        'ordersToday': orders_today,
        'pendingOrders': pending_orders,
        'totalCustomers': total_customers,
        'totalProducts': total_products,
        'lowStock': low_stock,
        'outOfStock': out_of_stock,
        'topProducts': top_products,
        'recentOrders': serialize_doc(recent_orders),
        'ordersByStatus': orders_by_status,
        'revenueTrend': revenue_trend
    }


# ─── PRODUCTS ─────────────────────────────────────────────────────────────────

class ProductIn(BaseModel):
    name: str
    description: Optional[str] = ''
    price: float
    discountPrice: float
    stock: int
    sku: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    tags: Optional[List[str]] = []
    images: Optional[List[str]] = []
    isFeatured: bool = False
    isActive: bool = True
    variants: Optional[List[dict]] = []
    seoMeta: Optional[dict] = {}
    ingredients: Optional[str] = ''
    howToUse: Optional[str] = ''


@router.get('/products')
async def admin_list_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20),
    search: Optional[str] = None,
    category: Optional[str] = None,
    admin=Depends(require_staff)
):
    query = {}
    if search:
        query['$or'] = [{'name': {'$regex': search, '$options': 'i'}}, {'sku': {'$regex': search, '$options': 'i'}}]
    if category:
        query['category'] = category
    skip, lim = paginate(page, limit)
    total = await products_col.count_documents(query)
    products = await products_col.find(query).sort([('createdAt', -1)]).skip(skip).limit(lim).to_list(lim)
    return {'products': serialize_doc(products), 'total': total, 'page': page, 'pages': (total + lim - 1) // lim}


@router.post('/products')
async def admin_create_product(data: ProductIn, admin=Depends(require_admin)):
    product_id = str(uuid.uuid4())
    slug = make_slug(data.name)
    # Make slug unique
    existing = await products_col.find_one({'slug': slug})
    if existing:
        slug = f'{slug}-{product_id[:6]}'
    doc = {
        '_id': product_id,
        'slug': slug,
        'rating': 0.0,
        'reviewCount': 0,
        'createdAt': now(),
        'updatedAt': now(),
        **data.model_dump()
    }
    await products_col.insert_one(doc)
    return serialize_doc(doc)


@router.get('/products/{product_id}')
async def admin_get_product(product_id: str, admin=Depends(require_staff)):
    p = await products_col.find_one({'_id': product_id})
    if not p:
        raise HTTPException(status_code=404, detail='Product not found')
    return serialize_doc(p)


@router.put('/products/{product_id}')
async def admin_update_product(product_id: str, data: ProductIn, admin=Depends(require_admin)):
    update = {**data.model_dump(), 'updatedAt': now()}
    await products_col.update_one({'_id': product_id}, {'$set': update})
    p = await products_col.find_one({'_id': product_id})
    return serialize_doc(p)


@router.delete('/products/{product_id}')
async def admin_delete_product(product_id: str, admin=Depends(require_admin)):
    await products_col.delete_one({'_id': product_id})
    return {'message': 'Product deleted'}


# ─── CATEGORIES ───────────────────────────────────────────────────────────────

class CategoryIn(BaseModel):
    name: str
    parent: Optional[str] = None
    image: Optional[str] = None
    order: int = 0
    isActive: bool = True


@router.get('/categories')
async def admin_list_categories(admin=Depends(require_staff)):
    cats = await categories_col.find({}).sort([('order', 1)]).to_list(200)
    return serialize_doc(cats)


@router.post('/categories')
async def admin_create_category(data: CategoryIn, admin=Depends(require_admin)):
    cat_id = str(uuid.uuid4())
    slug = make_slug(data.name)
    existing = await categories_col.find_one({'slug': slug})
    if existing:
        slug = f'{slug}-{cat_id[:4]}'
    doc = {'_id': cat_id, 'slug': slug, 'createdAt': now(), **data.model_dump()}
    await categories_col.insert_one(doc)
    return serialize_doc(doc)


@router.put('/categories/{cat_id}')
async def admin_update_category(cat_id: str, data: CategoryIn, admin=Depends(require_admin)):
    update = {**data.model_dump(), 'updatedAt': now()}
    await categories_col.update_one({'_id': cat_id}, {'$set': update})
    cat = await categories_col.find_one({'_id': cat_id})
    return serialize_doc(cat)


@router.delete('/categories/{cat_id}')
async def admin_delete_category(cat_id: str, admin=Depends(require_admin)):
    await categories_col.delete_one({'_id': cat_id})
    return {'message': 'Category deleted'}


# ─── ORDERS ───────────────────────────────────────────────────────────────────

@router.get('/orders')
async def admin_list_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20),
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    admin=Depends(require_staff)
):
    query = {}
    if status:
        query['orderStatus'] = status
    if payment_status:
        query['paymentStatus'] = payment_status
    skip, lim = paginate(page, limit)
    total = await orders_col.count_documents(query)
    orders = await orders_col.find(query).sort([('createdAt', -1)]).skip(skip).limit(lim).to_list(lim)
    return {'orders': serialize_doc(orders), 'total': total, 'page': page, 'pages': (total + lim - 1) // lim}


@router.get('/orders/{order_id}')
async def admin_get_order(order_id: str, admin=Depends(require_staff)):
    order = await orders_col.find_one({'_id': order_id})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    return serialize_doc(order)


class OrderStatusIn(BaseModel):
    status: str
    note: Optional[str] = None
    trackingNumber: Optional[str] = None


@router.put('/orders/{order_id}/status')
async def admin_update_order_status(order_id: str, data: OrderStatusIn, admin=Depends(require_staff)):
    order = await orders_col.find_one({'_id': order_id})
    if not order:
        raise HTTPException(status_code=404, detail='Order not found')
    timeline = order.get('timeline', [])
    timeline.append({'status': data.status, 'timestamp': now().isoformat(), 'note': data.note or ''})
    update = {'orderStatus': data.status, 'timeline': timeline, 'updatedAt': now()}
    if data.trackingNumber:
        update['trackingNumber'] = data.trackingNumber
    await orders_col.update_one({'_id': order_id}, {'$set': update})
    return {'message': 'Order status updated'}


# ─── CUSTOMERS ────────────────────────────────────────────────────────────────

@router.get('/customers')
async def admin_list_customers(
    page: int = Query(1, ge=1),
    limit: int = Query(20),
    search: Optional[str] = None,
    admin=Depends(require_staff)
):
    query = {'role': 'customer'}
    if search:
        query['$or'] = [{'name': {'$regex': search, '$options': 'i'}}, {'email': {'$regex': search, '$options': 'i'}}]
    skip, lim = paginate(page, limit)
    total = await users_col.count_documents(query)
    customers = await users_col.find(query, {'password': 0}).sort([('createdAt', -1)]).skip(skip).limit(lim).to_list(lim)
    return {'customers': serialize_doc(customers), 'total': total, 'page': page, 'pages': (total + lim - 1) // lim}


@router.put('/customers/{user_id}/block')
async def block_customer(user_id: str, blocked: bool = True, admin=Depends(require_admin)):
    await users_col.update_one({'_id': user_id}, {'$set': {'isBlocked': blocked}})
    return {'message': f'User {"blocked" if blocked else "unblocked"}'}


# ─── COUPONS ──────────────────────────────────────────────────────────────────

class CouponIn(BaseModel):
    code: str
    type: str  # flat | percentage | free_shipping
    value: float
    minOrder: float = 0
    maxDiscount: Optional[float] = None
    maxUses: Optional[int] = None
    expiresAt: Optional[str] = None
    isActive: bool = True
    description: Optional[str] = ''


@router.get('/coupons')
async def admin_list_coupons(admin=Depends(require_staff)):
    coupons = await coupons_col.find({}).sort([('createdAt', -1)]).to_list(100)
    return serialize_doc(coupons)


@router.post('/coupons')
async def admin_create_coupon(data: CouponIn, admin=Depends(require_admin)):
    existing = await coupons_col.find_one({'code': data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail='Coupon code already exists')
    coupon_id = str(uuid.uuid4())
    doc = {'_id': coupon_id, **data.model_dump(), 'code': data.code.upper(), 'usedBy': [], 'createdAt': now()}
    await coupons_col.insert_one(doc)
    return serialize_doc(doc)


@router.put('/coupons/{coupon_id}')
async def admin_update_coupon(coupon_id: str, data: CouponIn, admin=Depends(require_admin)):
    update = {**data.model_dump(), 'code': data.code.upper(), 'updatedAt': now()}
    await coupons_col.update_one({'_id': coupon_id}, {'$set': update})
    c = await coupons_col.find_one({'_id': coupon_id})
    return serialize_doc(c)


@router.delete('/coupons/{coupon_id}')
async def admin_delete_coupon(coupon_id: str, admin=Depends(require_admin)):
    await coupons_col.delete_one({'_id': coupon_id})
    return {'message': 'Coupon deleted'}


# ─── BANNERS ──────────────────────────────────────────────────────────────────

class BannerIn(BaseModel):
    title: str
    image: str
    link: Optional[str] = '/'
    position: str = 'home_hero'
    isActive: bool = True
    order: int = 0
    subtitle: Optional[str] = ''


@router.get('/banners')
async def admin_list_banners(admin=Depends(require_staff)):
    banners = await banners_col.find({}).sort([('order', 1)]).to_list(20)
    return serialize_doc(banners)


@router.post('/banners')
async def admin_create_banner(data: BannerIn, admin=Depends(require_admin)):
    banner_id = str(uuid.uuid4())
    doc = {'_id': banner_id, **data.model_dump(), 'createdAt': now()}
    await banners_col.insert_one(doc)
    return serialize_doc(doc)


@router.put('/banners/{banner_id}')
async def admin_update_banner(banner_id: str, data: BannerIn, admin=Depends(require_admin)):
    update = {**data.model_dump(), 'updatedAt': now()}
    await banners_col.update_one({'_id': banner_id}, {'$set': update})
    b = await banners_col.find_one({'_id': banner_id})
    return serialize_doc(b)


@router.delete('/banners/{banner_id}')
async def admin_delete_banner(banner_id: str, admin=Depends(require_admin)):
    await banners_col.delete_one({'_id': banner_id})
    return {'message': 'Banner deleted'}


# ─── REVIEWS ──────────────────────────────────────────────────────────────────

@router.get('/reviews')
async def admin_list_reviews(
    page: int = Query(1, ge=1),
    limit: int = Query(20),
    approved: Optional[bool] = None,
    admin=Depends(require_staff)
):
    query = {}
    if approved is not None:
        query['isApproved'] = approved
    skip, lim = paginate(page, limit)
    total = await reviews_col.count_documents(query)
    reviews = await reviews_col.find(query).sort([('createdAt', -1)]).skip(skip).limit(lim).to_list(lim)
    return {'reviews': serialize_doc(reviews), 'total': total}


@router.put('/reviews/{review_id}/approve')
async def admin_approve_review(review_id: str, approved: bool = True, admin=Depends(require_staff)):
    await reviews_col.update_one({'_id': review_id}, {'$set': {'isApproved': approved}})
    return {'message': f'Review {"approved" if approved else "rejected"}'}


@router.delete('/reviews/{review_id}')
async def admin_delete_review(review_id: str, admin=Depends(require_admin)):
    await reviews_col.delete_one({'_id': review_id})
    return {'message': 'Review deleted'}


# ─── BLOG ─────────────────────────────────────────────────────────────────────

class BlogIn(BaseModel):
    title: str
    body: str
    excerpt: Optional[str] = ''
    featuredImage: Optional[str] = None
    tags: Optional[List[str]] = []
    isPublished: bool = False
    seoMeta: Optional[dict] = {}


@router.get('/blog')
async def admin_list_blog(
    page: int = Query(1, ge=1),
    limit: int = Query(20),
    admin=Depends(require_staff)
):
    skip, lim = paginate(page, limit)
    total = await blog_col.count_documents({})
    posts = await blog_col.find({}).sort([('createdAt', -1)]).skip(skip).limit(lim).to_list(lim)
    return {'posts': serialize_doc(posts), 'total': total}


@router.post('/blog')
async def admin_create_blog(data: BlogIn, admin=Depends(require_admin)):
    post_id = str(uuid.uuid4())
    slug = make_slug(data.title)
    existing = await blog_col.find_one({'slug': slug})
    if existing:
        slug = f'{slug}-{post_id[:6]}'
    doc = {'_id': post_id, 'slug': slug, 'author': admin.get('name'), 'createdAt': now(), **data.model_dump()}
    await blog_col.insert_one(doc)
    return serialize_doc(doc)


@router.put('/blog/{post_id}')
async def admin_update_blog(post_id: str, data: BlogIn, admin=Depends(require_admin)):
    update = {**data.model_dump(), 'updatedAt': now()}
    await blog_col.update_one({'_id': post_id}, {'$set': update})
    post = await blog_col.find_one({'_id': post_id})
    return serialize_doc(post)


@router.delete('/blog/{post_id}')
async def admin_delete_blog(post_id: str, admin=Depends(require_admin)):
    await blog_col.delete_one({'_id': post_id})
    return {'message': 'Blog post deleted'}


# ─── ANALYTICS ────────────────────────────────────────────────────────────────

@router.get('/analytics/revenue')
async def get_revenue_analytics(
    period: str = Query('30d', enum=['7d', '30d', '90d', '365d']),
    admin=Depends(require_staff)
):
    days_map = {'7d': 7, '30d': 30, '90d': 90, '365d': 365}
    days = days_map[period]
    from datetime import timedelta
    start = now() - timedelta(days=days)

    pipeline = [
        {'$match': {'paymentStatus': 'paid', 'createdAt': {'$gte': start}}},
        {'$group': {
            '_id': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$createdAt'}},
            'revenue': {'$sum': '$totalAmount'},
            'orders': {'$sum': 1}
        }},
        {'$sort': {'_id': 1}}
    ]
    data = await orders_col.aggregate(pipeline).to_list(365)
    return data


@router.get('/analytics/categories')
async def get_category_analytics(admin=Depends(require_staff)):
    pipeline = [
        {'$match': {'orderStatus': {'$nin': ['cancelled']}}},
        {'$unwind': '$items'},
        {'$group': {
            '_id': '$items.productId',
            'revenue': {'$sum': {'$multiply': ['$items.price', '$items.quantity']}},
            'quantity': {'$sum': '$items.quantity'}
        }}
    ]
    return await orders_col.aggregate(pipeline).to_list(100)


# ─── ADMIN USERS ──────────────────────────────────────────────────────────────

@router.get('/staff')
async def list_staff(admin=Depends(require_admin)):
    staff = await users_col.find(
        {'role': {'$in': ['admin', 'manager', 'support']}},
        {'password': 0}
    ).to_list(50)
    return serialize_doc(staff)


class InviteStaffIn(BaseModel):
    name: str
    email: str
    role: str = 'support'


@router.post('/staff')
async def invite_staff(data: InviteStaffIn, admin=Depends(require_admin)):
    from utils.security import hash_password
    import random
    import string
    temp_password = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
    user_id = str(uuid.uuid4())
    doc = {
        '_id': user_id,
        'name': data.name,
        'email': data.email.lower(),
        'password': hash_password(temp_password),
        'role': data.role,
        'isVerified': True,
        'isBlocked': False,
        'addresses': [],
        'wishlist': [],
        'loyaltyPoints': 0,
        'createdAt': now()
    }
    await users_col.insert_one(doc)
    return {'message': 'Staff invited', 'temp_password': temp_password}


# ─── BANNERS PUBLIC ──────────────────────────────────────────────────────────

@router.get('/public/banners')
async def get_public_banners():
    """Public endpoint for banners"""
    banners = await banners_col.find({'isActive': True}).sort([('order', 1)]).to_list(10)
    return serialize_doc(banners)
