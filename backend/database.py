from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'sattva_store')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_col = db['users']
products_col = db['products']
categories_col = db['categories']
orders_col = db['orders']
carts_col = db['carts']
reviews_col = db['reviews']
coupons_col = db['coupons']
banners_col = db['banners']
blog_col = db['blog_posts']
notifications_col = db['notifications']
audit_logs_col = db['audit_logs']
vendor_ledger_col = db['vendor_ledger']
payouts_col = db['payouts']
gst_invoices_col = db['gst_invoices']
site_content_col = db['site_content']
testimonials_col = db['testimonials']
social_videos_col = db['social_videos']


async def create_indexes():
    """Create MongoDB indexes for performance"""
    await users_col.create_index('email', unique=True)
    await products_col.create_index('slug', unique=True)
    await products_col.create_index([('name', 'text'), ('description', 'text'), ('brand', 'text'), ('tags', 'text')])
    await products_col.create_index('category')
    await products_col.create_index('isFeatured')
    await products_col.create_index('isActive')
    await categories_col.create_index('slug', unique=True)
    await orders_col.create_index('user')
    await orders_col.create_index('razorpayOrderId')
    await reviews_col.create_index([('product', 1), ('user', 1)])
    await coupons_col.create_index('code', unique=True)
    await blog_col.create_index('slug', unique=True)
    await vendor_ledger_col.create_index('vendor_id')
    await vendor_ledger_col.create_index('created_at')
    await payouts_col.create_index('vendor_id')
    await payouts_col.create_index('status')
    await gst_invoices_col.create_index('order_id', unique=True)
    await site_content_col.create_index('key', unique=True)
    await testimonials_col.create_index('order')
    await social_videos_col.create_index('order')
