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
social_accounts_col = db['social_accounts']   # platform API config (per platform)
social_feed_col = db['social_feed']           # auto-fetched posts/videos
transactions_col = db['transactions']         # multi-gateway payment transactions

# ── Wallet / Cashback / Referral ──────────────────────────────────────────
wallets_col = db['wallets']
wallet_transactions_col = db['wallet_transactions']
cashback_campaigns_col = db['cashback_campaigns']
referral_profiles_col = db['referral_profiles']
referral_tracking_col = db['referral_tracking']
reward_settings_col = db['reward_settings']

# ── Retargeting & Remarketing Engine ─────────────────────────────────────
tracking_events_col = db['tracking_events']       # raw behavioral events
user_sessions_col = db['user_sessions']            # session metadata
audience_profiles_col = db['audience_profiles']    # computed user profiles + scores
audience_segments_col = db['audience_segments']    # segment definitions
retargeting_campaigns_col = db['retargeting_campaigns']
campaign_logs_col = db['campaign_logs']            # sent campaign records
abandoned_carts_col = db['abandoned_carts']        # cart abandonment snapshots
pixel_config_col = db['pixel_config']              # FB/Google pixel keys
recommendation_cache_col = db['recommendation_cache']
consent_col = db['tracking_consent']               # GDPR consent records


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
    await social_accounts_col.create_index('platform', unique=True)
    await social_feed_col.create_index([('platform', 1), ('externalId', 1)], unique=True)
    await social_feed_col.create_index('publishedAt')
    await transactions_col.create_index('userId')
    await transactions_col.create_index('orderId')
    await transactions_col.create_index('gatewayOrderId')
    await transactions_col.create_index('paymentStatus')
    await transactions_col.create_index('createdAt')
    # Wallet indexes
    await wallet_transactions_col.create_index('userId')
    await wallet_transactions_col.create_index('referenceOrderId')
    await wallet_transactions_col.create_index([('userId', 1), ('type', 1), ('referenceOrderId', 1)])
    await wallet_transactions_col.create_index('expiryDate')
    await wallet_transactions_col.create_index('createdAt')
    await referral_profiles_col.create_index('referralCode', unique=True)
    await referral_profiles_col.create_index('referredBy')
    await referral_tracking_col.create_index('referrerId')
    try:
        await referral_tracking_col.create_index('refereeId', unique=True)
    except Exception:
        pass  # May already exist
    await cashback_campaigns_col.create_index('isActive')
    # Retargeting indexes
    await tracking_events_col.create_index('sessionId')
    await tracking_events_col.create_index('userId')
    await tracking_events_col.create_index('event')
    await tracking_events_col.create_index('ts')
    await tracking_events_col.create_index([('userId', 1), ('event', 1)])
    await tracking_events_col.create_index([('userId', 1), ('ts', -1)])
    await tracking_events_col.create_index('productId')
    await user_sessions_col.create_index('sessionId', unique=True)
    await user_sessions_col.create_index('userId')
    await user_sessions_col.create_index('lastSeen')
    await audience_profiles_col.create_index('userId', unique=True)
    await audience_profiles_col.create_index('segment')
    await audience_profiles_col.create_index('engagementScore')
    await audience_profiles_col.create_index('lastActivity')
    await retargeting_campaigns_col.create_index('status')
    await retargeting_campaigns_col.create_index('trigger')
    await campaign_logs_col.create_index('userId')
    await campaign_logs_col.create_index('campaignId')
    await campaign_logs_col.create_index([('userId', 1), ('campaignId', 1)])
    await campaign_logs_col.create_index('sentAt')
    await abandoned_carts_col.create_index('userId')
    await abandoned_carts_col.create_index('sessionId')
    await abandoned_carts_col.create_index('status')
    await abandoned_carts_col.create_index('createdAt')
    await recommendation_cache_col.create_index('userId', unique=True)
    await recommendation_cache_col.create_index('updatedAt')
    await consent_col.create_index('userId', unique=True)
    await consent_col.create_index('sessionId')
