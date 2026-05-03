from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import routers
from routers import auth, users, products, categories, cart, orders, reviews, payments, upload, coupons, admin
from routers import auth_v2, admin_users
from routers import vendor_products, b2b_catalog, vendor_analytics, vendor_ledger
from routers import site_content
from database import create_indexes, db as _mongo_db
from utils.audit import init_audit_logger

app = FastAPI(
    title="Dr MediScie API",
    description="Premium Indian Wellness E-commerce API",
    version="1.0.0",
    redirect_slashes=False
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Public banner endpoint (no auth needed)
@app.get("/api/banners")
async def get_banners():
    from database import banners_col
    from utils.helpers import serialize_doc
    banners = await banners_col.find({'isActive': True}).sort([('order', 1)]).to_list(10)
    return serialize_doc(banners)

# Blog public endpoints
@app.get("/api/blog")
async def get_blog_posts(limit: int = 10):
    from database import blog_col
    from utils.helpers import serialize_doc
    posts = await blog_col.find({'isPublished': True}).sort([('createdAt', -1)]).limit(limit).to_list(limit)
    return serialize_doc(posts)

@app.get("/api/blog/{slug}")
async def get_blog_post(slug: str):
    from database import blog_col
    from utils.helpers import serialize_doc
    from fastapi import HTTPException
    post = await blog_col.find_one({'slug': slug, 'isPublished': True})
    if not post:
        raise HTTPException(status_code=404, detail='Post not found')
    return serialize_doc(post)

# Include all routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])
app.include_router(cart.router, prefix="/api/cart", tags=["cart"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(payments.router, prefix="/api/payments", tags=["payments"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])
app.include_router(coupons.router, prefix="/api/coupons", tags=["coupons"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

# ==================== PHASE 1: UNIFIED COMMERCE (B2B + VENDOR) ====================
# These routers power the new B2B gatekeeping and vendor approval workflows.
# They coexist with the legacy B2C auth (`/api/auth/*`) to enable incremental migration.
app.include_router(auth_v2.router, prefix="/api/auth_v2", tags=["auth_v2"])
app.include_router(admin_users.router, prefix="/api/admin_users", tags=["admin_users"])

# ==================== B2B + VENDOR MARKETPLACE ====================
app.include_router(vendor_products.router, prefix="/api/vendor/products", tags=["vendor_products"])
app.include_router(b2b_catalog.router, prefix="/api/b2b", tags=["b2b_catalog"])
app.include_router(vendor_analytics.router, prefix="/api/vendor/analytics", tags=["vendor_analytics"])
app.include_router(vendor_ledger.router, prefix="/api/vendor/ledger", tags=["vendor_ledger"])

# ==================== SITE CONTENT (hero, testimonials, flash sale, social videos, nav) ====================
# Mixed prefix: exposes /api/site/* (public) and /api/admin/* (auth) from one router.
app.include_router(site_content.router, prefix="/api", tags=["site_content"])

@app.get("/api")
async def root():
    return {"message": "Dr MediScie API v1.0.0", "status": "running"}

@app.on_event("startup")
async def startup():
    await create_indexes()
    # Initialize audit logger for Phase 1 RBAC endpoints
    init_audit_logger(_mongo_db)
    # Create Phase 1 indexes (sparse unique for new B2B/Vendor fields)
    try:
        from database import users_col
        await users_col.create_index('id', unique=True, sparse=True)
        await users_col.create_index('b2b_profile.gst_number', unique=True, sparse=True)
        await users_col.create_index('vendor_profile.gstin', unique=True, sparse=True)
        await users_col.create_index('vendor_profile.store_slug', unique=True, sparse=True)
        await users_col.create_index('vendor_profile.vendor_id', unique=True, sparse=True)
        await users_col.create_index('b2b_profile.approval_status')
        await users_col.create_index('vendor_profile.approval_status')
    except Exception as _e:
        logging.warning(f"Phase 1 index creation warning: {_e}")
    logging.basicConfig(level=logging.INFO)

@app.on_event("shutdown")
async def shutdown():
    from database import client
    client.close()
