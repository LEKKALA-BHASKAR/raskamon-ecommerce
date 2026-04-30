"""Seed script for Sattva store — run once to populate the database"""
import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv
import os
import sys
from slugify import slugify

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
sys.path.insert(0, str(ROOT_DIR))

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'sattva_store')

def now():
    return datetime.now(timezone.utc)

# Product image URLs from Unsplash/Pexels (wellness/skincare)
IMG = [
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80',
    'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80',
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80',
    'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&q=80',
    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&q=80',
    'https://images.unsplash.com/photo-1631390614266-57b9258e7d9a?w=600&q=80',
    'https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=600&q=80',
    'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=600&q=80',
    'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600&q=80',
    'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80',
    'https://images.unsplash.com/photo-1564174045278-4f3f2b3b0d0b?w=600&q=80',
    'https://images.unsplash.com/photo-1531425300797-d5dc8b021c84?w=600&q=80',
    'https://images.unsplash.com/photo-1505069108510-a6e1d29d8d01?w=600&q=80',
]

BANNER_IMGS = [
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1400&q=85',
    'https://images.unsplash.com/photo-1614930118543-1e82e0f2b82d?w=1400&q=85',
    'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1400&q=85',
]

CATEGORIES = [
    {'name': 'Skincare', 'order': 1, 'image': IMG[0]},
    {'name': 'Hair Care', 'order': 2, 'image': IMG[1]},
    {'name': 'Wellness', 'order': 3, 'image': IMG[2]},
    {'name': 'Body Care', 'order': 4, 'image': IMG[3]},
    {'name': 'Aromatherapy', 'order': 5, 'image': IMG[4]},
]

BRANDS = ['Forest Essentials', 'Kama Ayurveda', 'Biotique', 'Himalaya', 'Mamaearth', 'Sattva Organics', 'Pure & Natural', 'Earth Rhythm']

PRODUCTS_DATA = [
    # SKINCARE
    {'name': 'Kumkumadi Brightening Serum', 'category': 'Skincare', 'brand': 'Forest Essentials', 'price': 1899, 'discountPrice': 1299, 'stock': 48, 'isFeatured': True, 'tags': ['serum', 'brightening', 'kumkumadi', 'face care'], 'images': [IMG[0], IMG[5]], 'description': 'Ancient Ayurvedic formula with Kumkumadi Tailam, Saffron, and precious botanical extracts. This luxury serum brightens skin, reduces dark spots, and imparts a luminous glow with regular use.', 'ingredients': 'Kumkumadi Tailam, Saffron (Kesar), Sandalwood, Turmeric, Rose Water', 'howToUse': 'Apply 3-4 drops on cleansed face. Gently massage in upward circular motions. Use AM/PM for best results.', 'rating': 4.7, 'reviewCount': 124},
    {'name': 'Neem & Tulsi Purifying Face Wash', 'category': 'Skincare', 'brand': 'Biotique', 'price': 449, 'discountPrice': 349, 'stock': 112, 'isFeatured': False, 'tags': ['face wash', 'neem', 'tulsi', 'purifying'], 'images': [IMG[1]], 'description': 'Ayurvedic face wash with Neem and Tulsi extracts that deep cleanses pores, controls excess oil, and prevents breakouts for clear, healthy skin.', 'ingredients': 'Neem Extract, Tulsi (Holy Basil), Aloe Vera, Tea Tree Oil', 'howToUse': 'Wet face, apply a pea-sized amount, lather and massage for 60 seconds, rinse.', 'rating': 4.3, 'reviewCount': 89},
    {'name': 'Rosehip Vitamin C Moisturizer', 'category': 'Skincare', 'brand': 'Earth Rhythm', 'price': 1199, 'discountPrice': 899, 'stock': 67, 'isFeatured': True, 'tags': ['moisturizer', 'vitamin c', 'rosehip', 'anti-aging'], 'images': [IMG[2], IMG[6]], 'description': 'Lightweight, fast-absorbing moisturizer enriched with cold-pressed Rosehip oil and stabilised Vitamin C. Targets fine lines, uneven tone, and dullness.', 'ingredients': 'Rosehip Seed Oil, Vitamin C (Ascorbic Acid), Hyaluronic Acid, Niacinamide', 'howToUse': 'Apply on cleansed skin morning and night. Follow with SPF in the morning.', 'rating': 4.5, 'reviewCount': 203},
    {'name': 'Saffron & Sandalwood Face Pack', 'category': 'Skincare', 'brand': 'Kama Ayurveda', 'price': 799, 'discountPrice': 599, 'stock': 55, 'isFeatured': False, 'tags': ['face pack', 'saffron', 'sandalwood', 'brightening'], 'images': [IMG[3]], 'description': 'Traditional Lepa (Ayurvedic mask) with Saffron, Sandalwood, and Multani Mitti. Deep cleanses, brightens, and leaves skin satiny soft.', 'ingredients': 'Saffron, Sandalwood Powder, Multani Mitti, Rose Petals, Turmeric', 'howToUse': 'Mix with rose water to form paste. Apply on face. Leave 15 mins. Wash off.', 'rating': 4.4, 'reviewCount': 67},
    {'name': 'SPF 50 Mineral Sunscreen', 'category': 'Skincare', 'brand': 'Mamaearth', 'price': 999, 'discountPrice': 799, 'stock': 89, 'isFeatured': True, 'tags': ['sunscreen', 'spf 50', 'mineral', 'uv protection'], 'images': [IMG[4]], 'description': 'Broad-spectrum mineral sunscreen with non-nano Zinc Oxide. Water-resistant, suitable for sensitive skin. No white cast.', 'ingredients': 'Zinc Oxide 20%, Vitamin E, Aloe Vera, Shea Butter', 'howToUse': 'Apply generously 20 minutes before sun exposure. Reapply every 2 hours.', 'rating': 4.6, 'reviewCount': 312},
    {'name': 'Ubtan Brightening Face Scrub', 'category': 'Skincare', 'brand': 'Sattva Organics', 'price': 549, 'discountPrice': 449, 'stock': 73, 'isFeatured': False, 'tags': ['scrub', 'ubtan', 'exfoliant', 'brightening'], 'images': [IMG[5]], 'description': 'Traditional Ubtan recipe with turmeric, besan, and sandalwood. Gently exfoliates dead skin, brightens complexion, and reveals fresh glowing skin.', 'ingredients': 'Besan, Turmeric, Sandalwood, Kashmiri Saffron, Multani Mitti', 'howToUse': 'Mix with milk or rose water. Apply and scrub gently in circular motion. Rinse.', 'rating': 4.2, 'reviewCount': 45},
    # HAIR CARE
    {'name': 'Bhringraj & Amla Hair Oil', 'category': 'Hair Care', 'brand': 'Kama Ayurveda', 'price': 649, 'discountPrice': 449, 'stock': 94, 'isFeatured': True, 'tags': ['hair oil', 'bhringraj', 'amla', 'hair growth'], 'images': [IMG[6]], 'description': 'Revered Ayurvedic hair oil with Bhringraj, Amla, and Brahmi in a pure Sesame base. Strengthens roots, prevents hair fall, and promotes healthy growth.', 'ingredients': 'Bhringraj, Amla, Brahmi, Sesame Oil, Neem', 'howToUse': 'Warm oil gently. Apply from roots to tips. Leave overnight or 2 hours. Wash with mild shampoo.', 'rating': 4.8, 'reviewCount': 256},
    {'name': 'Onion & Fenugreek Shampoo', 'category': 'Hair Care', 'brand': 'Mamaearth', 'price': 499, 'discountPrice': 399, 'stock': 130, 'isFeatured': False, 'tags': ['shampoo', 'onion', 'fenugreek', 'hair fall'], 'images': [IMG[7]], 'description': 'Clinically tested shampoo with Onion extract and Fenugreek seed powder. Controls hair fall from root, strengthens hair shaft, and adds natural lustre.', 'ingredients': 'Onion Extract, Fenugreek Seed Oil, Biotin, Keratin', 'howToUse': 'Apply to wet hair, lather and massage for 2 minutes. Rinse thoroughly.', 'rating': 4.4, 'reviewCount': 189},
    {'name': 'Brahmi & Hibiscus Deep Conditioning Mask', 'category': 'Hair Care', 'brand': 'Forest Essentials', 'price': 799, 'discountPrice': 549, 'stock': 61, 'isFeatured': True, 'tags': ['hair mask', 'brahmi', 'hibiscus', 'conditioning'], 'images': [IMG[8]], 'description': 'Intense conditioning hair mask with Brahmi extract and Hibiscus flower. Repairs damage, detangles, and leaves hair silky smooth.', 'ingredients': 'Brahmi Extract, Hibiscus Flower, Coconut Milk, Argan Oil', 'howToUse': 'Apply to shampooed damp hair. Leave for 20 minutes. Rinse thoroughly.', 'rating': 4.6, 'reviewCount': 77},
    {'name': 'Rice Protein Hair Strengthening Mask', 'category': 'Hair Care', 'brand': 'Earth Rhythm', 'price': 849, 'discountPrice': 649, 'stock': 44, 'isFeatured': False, 'tags': ['hair mask', 'rice protein', 'strengthening', 'repair'], 'images': [IMG[9]], 'description': 'Japanese-inspired rice protein hair mask with fermented rice water. Fills hair shaft gaps, reduces breakage, and adds brilliant shine.', 'ingredients': 'Fermented Rice Water, Rice Protein, Panthenol, Silk Amino Acids', 'howToUse': 'Use after shampoo. Apply generously, leave 15 mins, rinse.', 'rating': 4.5, 'reviewCount': 92},
    # WELLNESS
    {'name': 'Ashwagandha Root Powder (KSM-66)', 'category': 'Wellness', 'brand': 'Himalaya', 'price': 1299, 'discountPrice': 999, 'stock': 78, 'isFeatured': True, 'tags': ['ashwagandha', 'supplement', 'adaptogen', 'stress relief'], 'images': [IMG[10]], 'description': 'Premium KSM-66 Ashwagandha — the world\'s most studied root extract. Clinically proven to reduce stress, improve endurance, and support hormonal balance.', 'ingredients': 'Ashwagandha Root Extract (KSM-66, 5% withanolides)', 'howToUse': 'Take 1 capsule or 1/2 tsp with warm milk at bedtime.', 'rating': 4.7, 'reviewCount': 445},
    {'name': 'Triphala Churna', 'category': 'Wellness', 'brand': 'Biotique', 'price': 349, 'discountPrice': 249, 'stock': 156, 'isFeatured': False, 'tags': ['triphala', 'digestive', 'detox', 'churna'], 'images': [IMG[11]], 'description': 'Classical Ayurvedic blend of three potent fruits — Amalaki, Bibhitaki, Haritaki. Supports healthy digestion, gentle detox, and immunity.', 'ingredients': 'Amalaki (Amla), Bibhitaki (Baheda), Haritaki (Harad) — equal parts', 'howToUse': '1/2 tsp with warm water at bedtime.', 'rating': 4.4, 'reviewCount': 201},
    {'name': 'Immunity Booster Herbal Tea', 'category': 'Wellness', 'brand': 'Sattva Organics', 'price': 449, 'discountPrice': 349, 'stock': 112, 'isFeatured': True, 'tags': ['tea', 'immunity', 'herbal', 'tulsi', 'ginger'], 'images': [IMG[12]], 'description': 'Hand-blended immunity tea with Tulsi, Ginger, Echinacea, and Green Tea. Packed with antioxidants to fight infections and boost vitality.', 'ingredients': 'Tulsi, Ginger, Echinacea, Green Tea, Licorice, Black Pepper', 'howToUse': 'Steep 1 teaspoon in 200ml hot water for 5 minutes. Drink twice daily.', 'rating': 4.5, 'reviewCount': 133},
    {'name': 'Turmeric Latte Golden Milk Mix', 'category': 'Wellness', 'brand': 'Pure & Natural', 'price': 399, 'discountPrice': 299, 'stock': 88, 'isFeatured': False, 'tags': ['turmeric', 'latte', 'golden milk', 'anti-inflammatory'], 'images': [IMG[13]], 'description': 'Traditional Haldi Doodh blend with Turmeric, Ashwagandha, Shatavari, and warming spices. Anti-inflammatory, sleep-promoting, immunity-enhancing.', 'ingredients': 'Turmeric (95% Curcumin), Ashwagandha, Shatavari, Cardamom, Cinnamon, Black Pepper', 'howToUse': 'Mix 1.5 tsp in warm milk. Sweeten with honey if desired.', 'rating': 4.6, 'reviewCount': 178},
    # BODY CARE
    {'name': 'Kumkumadi Body Oil', 'category': 'Body Care', 'brand': 'Forest Essentials', 'price': 1299, 'discountPrice': 899, 'stock': 42, 'isFeatured': True, 'tags': ['body oil', 'kumkumadi', 'brightening', 'luxury'], 'images': [IMG[14]], 'description': 'Luxurious body elixir with Kumkumadi Tailam, Saffron, and 16 precious botanicals. Deeply nourishes, brightens skin, and leaves a subtle golden glow.', 'ingredients': 'Kumkumadi Tailam, Saffron, Sesame Oil, Lotus Extract, Gold Bhasma', 'howToUse': 'After shower, apply warm oil on damp skin. Massage in upward strokes.', 'rating': 4.8, 'reviewCount': 67},
    {'name': 'Coffee & Walnut Body Scrub', 'category': 'Body Care', 'brand': 'Mamaearth', 'price': 599, 'discountPrice': 449, 'stock': 85, 'isFeatured': False, 'tags': ['body scrub', 'coffee', 'walnut', 'exfoliant'], 'images': [IMG[0]], 'description': 'Energising body scrub with ground coffee, walnut shell, and coconut oil. Exfoliates dead skin, improves circulation, and leaves skin soft and radiant.', 'ingredients': 'Ground Coffee, Walnut Shell, Coconut Oil, Vitamin E, Shea Butter', 'howToUse': 'Massage on wet skin in circular motions. Leave 5 mins. Rinse well.', 'rating': 4.3, 'reviewCount': 112},
    {'name': 'Shea & Cocoa Body Butter', 'category': 'Body Care', 'brand': 'Earth Rhythm', 'price': 799, 'discountPrice': 599, 'stock': 60, 'isFeatured': True, 'tags': ['body butter', 'shea', 'cocoa', 'moisturizer'], 'images': [IMG[1]], 'description': 'Rich, decadent body butter with unrefined Shea Butter, Cocoa Butter, and Sweet Almond Oil. Provides 72-hour moisture and heals dry, rough skin.', 'ingredients': 'Shea Butter, Cocoa Butter, Sweet Almond Oil, Vitamin E, Jasmine Essential Oil', 'howToUse': 'Apply on clean dry skin after bath. Massage until absorbed.', 'rating': 4.6, 'reviewCount': 94},
    # AROMATHERAPY
    {'name': 'Lavender Essential Oil', 'category': 'Aromatherapy', 'brand': 'Sattva Organics', 'price': 699, 'discountPrice': 499, 'stock': 95, 'isFeatured': True, 'tags': ['essential oil', 'lavender', 'aromatherapy', 'sleep'], 'images': [IMG[2]], 'description': 'Pure steam-distilled Lavender essential oil from the Himalayan foothills. Promotes relaxation, improves sleep quality, and relieves anxiety.', 'ingredients': '100% Pure Lavandula angustifolia', 'howToUse': 'Diffuse 5-7 drops. Add 5 drops to bath. Dilute 2% in carrier oil for skin.', 'rating': 4.7, 'reviewCount': 189},
    {'name': 'Jasmine & Amber Soy Candle', 'category': 'Aromatherapy', 'brand': 'Pure & Natural', 'price': 649, 'discountPrice': 449, 'stock': 55, 'isFeatured': False, 'tags': ['candle', 'soy wax', 'jasmine', 'amber'], 'images': [IMG[3]], 'description': 'Hand-poured soy wax candle with jasmine absolue and warm amber notes. 40-hour burn time. Cotton wick for clean burn.', 'ingredients': 'Soy Wax, Jasmine Absolue, Amber Fragrance, Cotton Wick', 'howToUse': 'Trim wick to 5mm before each use. Burn for 2-3 hours at a time.', 'rating': 4.4, 'reviewCount': 78},
    {'name': 'Chakra Healing Roll-On Set', 'category': 'Aromatherapy', 'brand': 'Forest Essentials', 'price': 1199, 'discountPrice': 799, 'stock': 35, 'isFeatured': True, 'tags': ['roll-on', 'chakra', 'healing', 'essential oil blend'], 'images': [IMG[4]], 'description': 'Set of 7 roll-on blends aligned with the 7 chakras. Each blend crafted with specific essential oils to balance energy centers.', 'ingredients': 'Essential oil blends in Jojoba base', 'howToUse': 'Roll on pulse points and corresponding chakra locations. Breathe deeply.', 'rating': 4.5, 'reviewCount': 45},
]


async def seed_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print('\n🌿 Seeding Sattva Database...')

    # Clear existing data (optional — comment out to preserve)
    await db.categories.drop()
    await db.products.drop()
    await db.banners.drop()
    await db.coupons.drop()
    await db.reviews.drop()
    await db.blog_posts.drop()
    print('  Cleared existing collections')

    # Create indexes
    await db.users.create_index('email', unique=True)
    await db.products.create_index('slug', unique=True)
    await db.products.create_index([('name', 'text'), ('description', 'text'), ('brand', 'text'), ('tags', 'text')])
    await db.categories.create_index('slug', unique=True)
    await db.coupons.create_index('code', unique=True)
    await db.blog_posts.create_index('slug', unique=True)
    print('  Indexes created')

    # Seed categories
    cat_id_map = {}
    for cat_data in CATEGORIES:
        cat_id = str(uuid.uuid4())
        cat_id_map[cat_data['name']] = cat_id
        doc = {
            '_id': cat_id,
            'slug': slugify(cat_data['name']),
            'isActive': True,
            'createdAt': now(),
            **cat_data
        }
        await db.categories.insert_one(doc)
    print(f'  Seeded {len(CATEGORIES)} categories')

    # Seed products
    for p in PRODUCTS_DATA:
        pid = str(uuid.uuid4())
        slug = slugify(p['name'])
        existing = await db.products.find_one({'slug': slug})
        if existing:
            slug = f'{slug}-{pid[:6]}'
        doc = {
            '_id': pid,
            'slug': slug,
            'isActive': True,
            'subcategory': None,
            'sku': f'SKU-{pid[:8].upper()}',
            'variants': [],
            'seoMeta': {'title': p['name'], 'description': p.get('description', '')[:150]},
            'createdAt': now(),
            'updatedAt': now(),
            **p
        }
        await db.products.insert_one(doc)
    print(f'  Seeded {len(PRODUCTS_DATA)} products')

    # Seed banners
    banners = [
        {'_id': str(uuid.uuid4()), 'title': 'Discover Ancient Wisdom', 'subtitle': 'Premium Ayurvedic skincare rituals curated for modern living', 'image': BANNER_IMGS[0], 'link': '/products', 'position': 'home_hero', 'isActive': True, 'order': 1, 'createdAt': now()},
        {'_id': str(uuid.uuid4()), 'title': 'New Arrivals: Hair Rituals', 'subtitle': 'Restore strength & shine with time-tested botanical formulas', 'image': BANNER_IMGS[1], 'link': '/products?category=Hair+Care', 'position': 'home_hero', 'isActive': True, 'order': 2, 'createdAt': now()},
        {'_id': str(uuid.uuid4()), 'title': 'Free Shipping on Orders ₹499+', 'subtitle': 'Authentic, cruelty-free, and sustainably sourced', 'image': BANNER_IMGS[2], 'link': '/products', 'position': 'home_hero', 'isActive': True, 'order': 3, 'createdAt': now()},
    ]
    await db.banners.insert_many(banners)
    print('  Seeded banners')

    # Seed coupons
    from datetime import timedelta
    coupons = [
        {'_id': str(uuid.uuid4()), 'code': 'SATTVA10', 'type': 'percentage', 'value': 10, 'minOrder': 499, 'maxDiscount': 200, 'maxUses': 1000, 'usedBy': [], 'isActive': True, 'description': '10% off on orders above ₹499', 'expiresAt': (now() + timedelta(days=365)).isoformat(), 'createdAt': now()},
        {'_id': str(uuid.uuid4()), 'code': 'WELCOME15', 'type': 'percentage', 'value': 15, 'minOrder': 999, 'maxDiscount': 300, 'maxUses': 500, 'usedBy': [], 'isActive': True, 'description': '15% off for new customers', 'expiresAt': (now() + timedelta(days=365)).isoformat(), 'createdAt': now()},
        {'_id': str(uuid.uuid4()), 'code': 'FLAT200', 'type': 'flat', 'value': 200, 'minOrder': 1499, 'maxDiscount': 200, 'maxUses': 200, 'usedBy': [], 'isActive': True, 'description': 'Flat ₹200 off on orders above ₹1499', 'expiresAt': (now() + timedelta(days=365)).isoformat(), 'createdAt': now()},
        {'_id': str(uuid.uuid4()), 'code': 'FREESHIP', 'type': 'free_shipping', 'value': 79, 'minOrder': 0, 'maxDiscount': 79, 'maxUses': None, 'usedBy': [], 'isActive': True, 'description': 'Free shipping on any order', 'expiresAt': None, 'createdAt': now()},
    ]
    await db.coupons.insert_many(coupons)
    print('  Seeded coupons')

    # Seed admin user
    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=['bcrypt'], deprecated='auto')
    admin_id = str(uuid.uuid4())
    existing_admin = await db.users.find_one({'email': 'admin@sattva.in'})
    if not existing_admin:
        await db.users.insert_one({
            '_id': admin_id,
            'name': 'Sattva Admin',
            'email': 'admin@sattva.in',
            'password': pwd_ctx.hash('Admin@1234'),
            'role': 'admin',
            'isVerified': True,
            'isBlocked': False,
            'addresses': [],
            'wishlist': [],
            'loyaltyPoints': 0,
            'createdAt': now()
        })
        print('  Created admin user: admin@sattva.in / Admin@1234')

    # Seed blog posts
    blog_posts = [
        {
            '_id': str(uuid.uuid4()),
            'title': 'The Art of Ayurvedic Skincare: A Modern Guide',
            'slug': 'art-of-ayurvedic-skincare-modern-guide',
            'excerpt': 'Discover how ancient Ayurvedic wisdom translates to modern skincare routines for radiant, healthy skin.',
            'body': '<p>Ayurveda, the ancient Indian system of medicine, has long known the secrets to radiant skin...</p>',
            'featuredImage': BANNER_IMGS[0],
            'author': 'Sattva Admin',
            'isPublished': True,
            'tags': ['ayurveda', 'skincare', 'wellness'],
            'seoMeta': {},
            'createdAt': now()
        },
        {
            '_id': str(uuid.uuid4()),
            'title': 'Bhringraj: The King of Herbs for Hair Growth',
            'slug': 'bhringraj-king-of-herbs-hair-growth',
            'excerpt': 'Learn why Bhringraj has been the cornerstone of Ayurvedic hair care for centuries and how to use it effectively.',
            'body': '<p>Bhringraj, known as Eclipta alba, is revered in Ayurveda as the king of herbs for hair...</p>',
            'featuredImage': BANNER_IMGS[1],
            'author': 'Sattva Admin',
            'isPublished': True,
            'tags': ['hair care', 'bhringraj', 'ayurveda'],
            'seoMeta': {},
            'createdAt': now()
        },
        {
            '_id': str(uuid.uuid4()),
            'title': 'Adaptogens Explained: Ashwagandha, Shatavari & More',
            'slug': 'adaptogens-explained-ashwagandha-shatavari',
            'excerpt': 'Understanding the power of Ayurvedic adaptogens and how they help your body manage stress naturally.',
            'body': '<p>Adaptogens are herbs that help the body adapt to stress and maintain balance...</p>',
            'featuredImage': BANNER_IMGS[2],
            'author': 'Sattva Admin',
            'isPublished': True,
            'tags': ['wellness', 'adaptogens', 'ashwagandha'],
            'seoMeta': {},
            'createdAt': now()
        },
    ]
    await db.blog_posts.insert_many(blog_posts)
    print('  Seeded blog posts')

    print('\n✅ Seeding complete!')
    print('\nAdmin credentials:')
    print('  Email: admin@sattva.in')
    print('  Password: Admin@1234')
    print('\nCoupon codes: SATTVA10, WELCOME15, FLAT200, FREESHIP')
    client.close()


if __name__ == '__main__':
    asyncio.run(seed_database())
