"""
Seed script — populates the Dr MediScie database with realistic content
inspired by https://drmediscie.com/.

Run from the backend directory:
    python -m scripts.seed                  # seed (idempotent: wipes content collections first)
    python -m scripts.seed --keep-users     # don't touch users / orders / carts

Wipes & re-seeds:
- categories (parents + subcategories)
- products
- banners
- testimonials
- social_videos
- blog_posts
- site_content KV: hero, flash_sale, bestsellers, new_arrivals, nav,
  trust_badges, features_strip, portal_section, stats_bar

Never touches users, orders, carts, reviews, vendor_ledger, payouts, gst_invoices.
"""
import asyncio
import sys
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

# Allow running as `python -m scripts.seed` from /backend
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import (
    categories_col, products_col, banners_col, testimonials_col,
    social_videos_col, blog_col, site_content_col,
)
from utils.helpers import make_slug, now


# ─── Helpers ──────────────────────────────────────────────────────────────────

def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


async def kv_set(key: str, value):
    await site_content_col.update_one(
        {'key': key},
        {'$set': {'key': key, 'value': value, 'updatedAt': now()}},
        upsert=True,
    )


# ─── Categories (parents + subcategories) ────────────────────────────────────

CATEGORIES = [
    {
        'name': "Men's Health",
        'icon': '💪',
        'image': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
        'order': 1,
        'subs': [
            {'name': 'Sexual Wellness', 'icon': '🌿'},
            {'name': 'Strength & Vitality', 'icon': '⚡'},
            {'name': 'Hair Care for Men', 'icon': '💈'},
            {'name': 'Stress & Energy', 'icon': '🧘'},
        ],
    },
    {
        'name': "Women's Health",
        'icon': '🌸',
        'image': 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
        'order': 2,
        'subs': [
            {'name': 'Hormonal Balance', 'icon': '🌺'},
            {'name': 'PCOS & Fertility', 'icon': '🌷'},
            {'name': 'Skin & Beauty', 'icon': '✨'},
            {'name': 'Bone & Joint', 'icon': '🦴'},
        ],
    },
    {
        'name': 'Fitness & Performance',
        'icon': '🏋️',
        'image': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
        'order': 3,
        'subs': [
            {'name': 'Protein & Muscle', 'icon': '💪'},
            {'name': 'Pre-Workout', 'icon': '⚡'},
            {'name': 'Recovery & Joints', 'icon': '🦿'},
            {'name': 'Endurance', 'icon': '🏃'},
        ],
    },
    {
        'name': 'Immunity & Detox',
        'icon': '🛡️',
        'image': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
        'order': 4,
        'subs': [
            {'name': 'Daily Immunity', 'icon': '🛡️'},
            {'name': 'Liver & Detox', 'icon': '🍃'},
            {'name': 'Gut Health', 'icon': '🌱'},
            {'name': 'Antioxidants', 'icon': '💊'},
        ],
    },
    {
        'name': 'Combos & Kits',
        'icon': '🎁',
        'image': 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80',
        'order': 5,
        'subs': [
            {'name': 'Hair Care Kits', 'icon': '💇'},
            {'name': 'Skin Care Kits', 'icon': '🧴'},
            {'name': 'Wellness Bundles', 'icon': '🌿'},
            {'name': 'Gift Sets', 'icon': '🎁'},
        ],
    },
]


async def seed_categories():
    await categories_col.delete_many({})
    name_to_id = {}
    for parent in CATEGORIES:
        pid = uid('cat')
        slug = make_slug(parent['name'])
        await categories_col.insert_one({
            '_id': pid,
            'name': parent['name'],
            'slug': slug,
            'icon': parent['icon'],
            'image': parent['image'],
            'order': parent['order'],
            'isActive': True,
            'parent': None,
            'createdAt': now(),
        })
        name_to_id[parent['name']] = pid
        for i, sub in enumerate(parent['subs']):
            sid = uid('cat')
            sslug = make_slug(f"{parent['name']}-{sub['name']}")
            await categories_col.insert_one({
                '_id': sid,
                'name': sub['name'],
                'slug': sslug,
                'icon': sub.get('icon', ''),
                'image': '',
                'order': i,
                'isActive': True,
                'parent': pid,
                'createdAt': now(),
            })
    return name_to_id


# ─── Products ────────────────────────────────────────────────────────────────

PRODUCTS = [
    # Men's Health
    {'name': 'Shilajit Gold Resin', 'category': "Men's Health", 'subcategory': 'Strength & Vitality',
     'price': 2999, 'discountPrice': 1999, 'stock': 60, 'rating': 4.9, 'reviewCount': 728, 'isFeatured': True,
     'images': ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80'],
     'tags': ['energy', 'strength', 'adaptogen', 'testosterone'],
     'description': 'Pure Himalayan Shilajit Gold with 85+ ionic minerals and fulvic acid. Enhances strength, stamina and natural testosterone.',
     'ingredients': 'Shudh Shilajit (purified Shilajit resin), Gold Bhasma, Fulvic Acid, Minerals.',
     'howToUse': 'Take a pea-sized amount (300-500mg) once or twice daily with warm milk or water.'},
    {'name': 'Ashwagandha KSM-66 Capsules', 'category': "Men's Health", 'subcategory': 'Stress & Energy',
     'price': 1799, 'discountPrice': 1199, 'stock': 120, 'rating': 4.9, 'reviewCount': 892, 'isFeatured': True,
     'images': ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80'],
     'tags': ['stress-relief', 'immunity', 'adaptogen', 'testosterone'],
     'description': 'Clinically studied KSM-66® Ashwagandha root extract, 600mg per capsule. Proven to reduce cortisol and boost testosterone.',
     'ingredients': 'KSM-66 Ashwagandha root extract (600mg), vegetarian capsule.',
     'howToUse': '1 capsule twice daily after meals, or as directed by physician.'},
    {'name': 'Safed Musli Power Capsules', 'category': "Men's Health", 'subcategory': 'Sexual Wellness',
     'price': 1499, 'discountPrice': 999, 'stock': 80, 'rating': 4.7, 'reviewCount': 386, 'isFeatured': True,
     'images': ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80'],
     'tags': ['sexual-wellness', 'strength', 'vitality'],
     'description': 'Premium Safed Musli root extract — the Ayurvedic answer to male vitality and performance.',
     'ingredients': 'Safed Musli (Chlorophytum borivilianum) root extract 500mg.',
     'howToUse': '1 capsule twice daily with milk after meals.'},
    {'name': 'Bhringraj Hair Growth Oil', 'category': "Men's Health", 'subcategory': 'Hair Care for Men',
     'price': 899, 'discountPrice': 599, 'stock': 150, 'rating': 4.7, 'reviewCount': 521, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80'],
     'tags': ['hair-growth', 'scalp-care', 'grooming'],
     'description': 'Cold-pressed Bhringraj with Amla and Brahmi. Reduces hair fall by 47% in 12 weeks.',
     'ingredients': 'Bhringraj, Amla, Brahmi, Coconut Oil, Sesame Oil, Rosemary Essential Oil.',
     'howToUse': 'Massage 5-10ml into scalp 30 minutes before wash. Use 3 times a week.'},
    {'name': 'Brahmi Memory Tablets', 'category': "Men's Health", 'subcategory': 'Stress & Energy',
     'price': 1099, 'discountPrice': 849, 'stock': 95, 'rating': 4.6, 'reviewCount': 244, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80'],
     'tags': ['memory', 'focus', 'cognition'],
     'description': 'Bacopa Monnieri (Brahmi) standardised extract for memory, focus and mental clarity.',
     'ingredients': 'Brahmi extract (50% bacosides) 250mg per tablet.',
     'howToUse': '1 tablet twice daily after meals.'},

    # Women's Health
    {'name': 'Shatavari Capsules for Women', 'category': "Women's Health", 'subcategory': 'Hormonal Balance',
     'price': 1399, 'discountPrice': 949, 'stock': 110, 'rating': 4.8, 'reviewCount': 634, 'isFeatured': True,
     'images': ['https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80'],
     'tags': ['hormones', 'pcos', 'fertility', 'adaptogen'],
     'description': "Organic Shatavari root extract — Ayurveda's premier herb for women's hormonal balance and reproductive health.",
     'ingredients': 'Shatavari (Asparagus racemosus) root extract 500mg.',
     'howToUse': '1 capsule twice daily with warm water or milk.'},
    {'name': 'Kumkumadi Radiance Serum', 'category': "Women's Health", 'subcategory': 'Skin & Beauty',
     'price': 1499, 'discountPrice': 999, 'stock': 70, 'rating': 4.8, 'reviewCount': 412, 'isFeatured': True,
     'images': ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80'],
     'tags': ['brightening', 'anti-aging', 'beauty'],
     'description': 'Ancient Kumkumadi oil blend with 26 Ayurvedic herbs for luminous, glowing skin.',
     'ingredients': 'Saffron, Sandalwood, Manjistha, Lotus, Vetiver, Sesame Oil + 20 more herbs.',
     'howToUse': 'Apply 3-4 drops to clean face nightly. Massage gently in upward strokes.'},
    {'name': 'PCOS Care Combo (Shatavari + Triphala)', 'category': "Women's Health", 'subcategory': 'PCOS & Fertility',
     'price': 1999, 'discountPrice': 1499, 'stock': 60, 'rating': 4.7, 'reviewCount': 312, 'isFeatured': True,
     'images': ['https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80'],
     'tags': ['pcos', 'hormones', 'fertility'],
     'description': '90-day Ayurvedic protocol for PCOS — hormonal balance, regular cycles, weight management.',
     'ingredients': 'Shatavari + Ashoka + Lodhra + Triphala combination pack.',
     'howToUse': 'Follow the leaflet inside the kit — typically 1 capsule of each, twice daily.'},
    {'name': 'Calcium + Vitamin D3 (Coral Calcium)', 'category': "Women's Health", 'subcategory': 'Bone & Joint',
     'price': 999, 'discountPrice': 749, 'stock': 130, 'rating': 4.6, 'reviewCount': 198, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1550572017-edd951aa8f7e?w=800&q=80'],
     'tags': ['bones', 'calcium', 'joints'],
     'description': 'Coral Calcium with Vitamin D3 and K2 for stronger bones and joint health.',
     'ingredients': 'Coral Calcium 500mg, Vitamin D3 1000 IU, Vitamin K2 (MK-7) 50mcg.',
     'howToUse': '1 tablet daily after lunch.'},
    {'name': 'Rose Hydrating Face Mist', 'category': "Women's Health", 'subcategory': 'Skin & Beauty',
     'price': 599, 'discountPrice': 449, 'stock': 200, 'rating': 4.6, 'reviewCount': 156, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80'],
     'tags': ['hydration', 'skincare', 'rose'],
     'description': 'Pure steam-distilled Damask Rose hydrosol — instant hydration and natural toning.',
     'ingredients': '100% pure Damask rose hydrosol, no alcohol.',
     'howToUse': 'Spritz on clean face anytime, or after cleansing as a toner.'},

    # Fitness & Performance
    {'name': 'Plant Protein + Creatine Blend', 'category': 'Fitness & Performance', 'subcategory': 'Protein & Muscle',
     'price': 2499, 'discountPrice': 1799, 'stock': 80, 'rating': 4.6, 'reviewCount': 198, 'isFeatured': True,
     'images': ['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80'],
     'tags': ['protein', 'muscle', 'fitness', 'pre-workout'],
     'description': 'Organic pea + rice protein 25g + 3g Creatine Monohydrate per serving. Chocolate flavour.',
     'ingredients': 'Pea protein isolate, Brown rice protein, Creatine monohydrate, Cocoa, Stevia.',
     'howToUse': '1 scoop in 250ml water/milk post-workout.'},
    {'name': 'Pre-Workout Energy Shots (Ginseng)', 'category': 'Fitness & Performance', 'subcategory': 'Pre-Workout',
     'price': 1199, 'discountPrice': 799, 'stock': 100, 'rating': 4.5, 'reviewCount': 156, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&q=80'],
     'tags': ['pre-workout', 'energy', 'stamina'],
     'description': 'Natural Ginseng + Ashwagandha energy shots. Zero sugar, zero crashes. 60ml × 6 pack.',
     'ingredients': 'Korean Ginseng, Ashwagandha, Beetroot, Natural caffeine from green tea.',
     'howToUse': '1 shot 20-30 minutes before workout.'},
    {'name': 'Recovery Pro — Joint & Muscle', 'category': 'Fitness & Performance', 'subcategory': 'Recovery & Joints',
     'price': 1999, 'discountPrice': 1299, 'stock': 90, 'rating': 4.7, 'reviewCount': 362, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=80'],
     'tags': ['recovery', 'joints', 'muscle'],
     'description': 'Boswellia + Turmeric + Marine Collagen for fast-track muscle recovery and joint mobility.',
     'ingredients': 'Boswellia serrata 250mg, Turmeric (95% curcumin) 200mg, Marine collagen 500mg.',
     'howToUse': '2 capsules daily, post-workout or with dinner.'},
    {'name': 'BCAA + Electrolytes Powder', 'category': 'Fitness & Performance', 'subcategory': 'Endurance',
     'price': 1599, 'discountPrice': 1199, 'stock': 75, 'rating': 4.5, 'reviewCount': 142, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&q=80'],
     'tags': ['bcaa', 'endurance', 'hydration'],
     'description': '2:1:1 BCAA with electrolytes for muscle endurance and intra-workout hydration.',
     'ingredients': 'L-Leucine, L-Isoleucine, L-Valine, Sodium, Potassium, Magnesium.',
     'howToUse': '1 scoop in 500ml water during workout.'},

    # Immunity & Detox
    {'name': 'Chyawanprash Gold Premium', 'category': 'Immunity & Detox', 'subcategory': 'Daily Immunity',
     'price': 999, 'discountPrice': 749, 'stock': 200, 'rating': 4.8, 'reviewCount': 728, 'isFeatured': True,
     'images': ['https://images.unsplash.com/photo-1617897903246-719242758050?w=800&q=80'],
     'tags': ['immunity', 'antioxidant', 'adaptogen'],
     'description': "41 Ayurvedic herbs including premium Amla (5000mg), Saffron and Gold Bhasma. India's most comprehensive immunity formula.",
     'ingredients': 'Amla pulp, Ghee, Honey, Saffron, Gold Bhasma, 36 supporting herbs.',
     'howToUse': '1-2 teaspoons daily on empty stomach with warm milk.'},
    {'name': 'Triphala Gut Cleanse Capsules', 'category': 'Immunity & Detox', 'subcategory': 'Gut Health',
     'price': 799, 'discountPrice': 549, 'stock': 180, 'rating': 4.8, 'reviewCount': 634, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1631390614266-57b9258e7d9a?w=800&q=80'],
     'tags': ['digestive', 'detox', 'gut'],
     'description': 'Classic trio of Amalaki, Bibhitaki and Haritaki for gut cleansing and detoxification.',
     'ingredients': 'Amalaki, Bibhitaki, Haritaki (1:1:1 ratio).',
     'howToUse': '2 capsules at bedtime with warm water.'},
    {'name': 'Liver Guard — Bhumi Amla Extract', 'category': 'Immunity & Detox', 'subcategory': 'Liver & Detox',
     'price': 1399, 'discountPrice': 899, 'stock': 110, 'rating': 4.6, 'reviewCount': 289, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=800&q=80'],
     'tags': ['liver', 'detox', 'digestive'],
     'description': 'Bhumi Amla + Kutki + Kalmegh extract for liver protection, fatty liver and detox support.',
     'ingredients': 'Bhumi Amla 250mg, Kutki 100mg, Kalmegh 100mg, Punarnava 100mg.',
     'howToUse': '1 capsule twice daily before meals.'},
    {'name': 'Moringa Superfood Powder', 'category': 'Immunity & Detox', 'subcategory': 'Antioxidants',
     'price': 699, 'discountPrice': 499, 'stock': 220, 'rating': 4.6, 'reviewCount': 289, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1564174045278-4f3f2b3b0d0b?w=800&q=80'],
     'tags': ['superfood', 'energy', 'immunity'],
     'description': 'Organic Moringa leaf powder — 92 nutrients, 46 antioxidants. Add to smoothies or warm water.',
     'ingredients': '100% organic Moringa oleifera leaf powder, sun-dried.',
     'howToUse': '1 teaspoon daily in smoothie, juice or warm water.'},
    {'name': 'Giloy Tulsi Immunity Drops', 'category': 'Immunity & Detox', 'subcategory': 'Daily Immunity',
     'price': 499, 'discountPrice': 349, 'stock': 250, 'rating': 4.6, 'reviewCount': 178, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&q=80'],
     'tags': ['immunity', 'giloy', 'tulsi'],
     'description': 'Concentrated Giloy and Tulsi extract drops — daily immunity in 5 drops.',
     'ingredients': 'Giloy stem extract, Tulsi leaf extract, Black pepper, Ginger.',
     'howToUse': '5-10 drops in warm water twice daily.'},

    # Combos & Kits
    {'name': 'Hair Transformation Kit (Men)', 'category': 'Combos & Kits', 'subcategory': 'Hair Care Kits',
     'price': 2999, 'discountPrice': 1799, 'stock': 50, 'rating': 4.8, 'reviewCount': 445, 'isFeatured': True,
     'images': ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80'],
     'tags': ['hair-kit', 'hair-growth', 'grooming', 'gift'],
     'description': '90-day hair regrowth system: Bhringraj Oil (200ml) + DHT Blocker Capsules + Scalp Serum.',
     'ingredients': 'Bhringraj Oil + DHT Blocker capsules + Scalp activation serum.',
     'howToUse': 'Follow the included 90-day regimen card.'},
    {'name': 'Skin Radiance Starter Kit', 'category': 'Combos & Kits', 'subcategory': 'Skin Care Kits',
     'price': 2499, 'discountPrice': 1499, 'stock': 60, 'rating': 4.7, 'reviewCount': 312, 'isFeatured': True,
     'images': ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80'],
     'tags': ['skin-kit', 'brightening', 'starter', 'gift'],
     'description': 'Kumkumadi Serum + Turmeric Face Wash + Rose Mist — your complete Ayurvedic skin radiance routine.',
     'ingredients': 'Kumkumadi serum, Turmeric face wash, Rose hydrating mist.',
     'howToUse': 'Cleanse → Mist → Serum, twice daily.'},
    {'name': 'Immunity Wellness Pack (Family)', 'category': 'Combos & Kits', 'subcategory': 'Wellness Bundles',
     'price': 3499, 'discountPrice': 2199, 'stock': 40, 'rating': 4.9, 'reviewCount': 187, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80'],
     'tags': ['wellness-pack', 'immunity', 'gift', 'family'],
     'description': 'Chyawanprash Gold + Triphala + Moringa + Ashwagandha — a complete family immunity bundle.',
     'ingredients': '4 hero immunity products in one box.',
     'howToUse': 'See individual product directions inside the kit.'},
    {'name': 'New Mom Recovery Kit', 'category': 'Combos & Kits', 'subcategory': 'Gift Sets',
     'price': 2799, 'discountPrice': 1999, 'stock': 35, 'rating': 4.8, 'reviewCount': 92, 'isFeatured': False,
     'images': ['https://images.unsplash.com/photo-1556228720-da4e85f5c1d2?w=800&q=80'],
     'tags': ['mother', 'recovery', 'gift'],
     'description': 'Postnatal Ayurvedic recovery: Shatavari, Calcium D3, Lactation tea and stretch-mark oil.',
     'ingredients': '4-product kit curated for new mothers.',
     'howToUse': 'See enclosed leaflet for daily routine.'},
]


async def seed_products(name_to_id):
    await products_col.delete_many({})
    inserted = []
    for i, p in enumerate(PRODUCTS):
        pid = uid('p')
        slug = make_slug(p['name'])
        doc = {
            '_id': pid,
            'name': p['name'],
            'slug': slug,
            'brand': 'Dr MediScie',
            'sku': f"DRM-{1000 + i}",
            'price': p['price'],
            'discountPrice': p['discountPrice'],
            'mrp': p['price'],
            'stock': p['stock'],
            'rating': p['rating'],
            'reviewCount': p['reviewCount'],
            'isFeatured': p.get('isFeatured', False),
            'isActive': True,
            'images': p['images'],
            'category': p['category'],
            'subcategory': p.get('subcategory'),
            'tags': p.get('tags', []),
            'description': p['description'],
            'ingredients': p.get('ingredients', ''),
            'howToUse': p.get('howToUse', ''),
            'seoMeta': {'title': p['name'], 'description': p['description'][:160]},
            'createdAt': now(),
        }
        await products_col.insert_one(doc)
        inserted.append(doc)
    return inserted


# ─── Hero slides ─────────────────────────────────────────────────────────────

HERO_SLIDES = [
    {
        'badge': 'Clinically Backed Ayurveda',
        'title': 'Ancient Wisdom,\nModern Science',
        'subtitle': 'Premium Ayurvedic supplements crafted for modern wellness. Trusted by 50,000+ customers across India.',
        'image': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&q=85',
        'accent': '#A3E635',
        'ctas': [
            {'label': 'Shop Now', 'link': '/products', 'style': 'primary'},
            {'label': 'Explore Range', 'link': '/products', 'style': 'secondary'},
        ],
    },
    {
        'badge': "Men's Wellness Range",
        'title': 'Unlock Your\nPeak Performance',
        'subtitle': 'KSM-66 Ashwagandha, Shilajit Gold and more — scientifically formulated for men who demand the best.',
        'image': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=85',
        'accent': '#60A5FA',
        'ctas': [
            {'label': "Shop Men's Health", 'link': "/products?category=Men's Health", 'style': 'primary'},
            {'label': 'See Results', 'link': '/blog', 'style': 'secondary'},
        ],
    },
    {
        'badge': "Women's Wellness Range",
        'title': 'Glow From\nThe Inside Out',
        'subtitle': "Shatavari, Kumkumadi and holistic women's wellness blends. Balance hormones, boost glow, feel your best.",
        'image': 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=900&q=85',
        'accent': '#F472B6',
        'ctas': [
            {'label': "Shop Women's Health", 'link': "/products?category=Women's Health", 'style': 'primary'},
            {'label': 'Learn More', 'link': '/blog', 'style': 'secondary'},
        ],
    },
]


async def seed_hero():
    slides = []
    for i, s in enumerate(HERO_SLIDES):
        slides.append({
            'id': uid('hs'),
            'order': i,
            'isActive': True,
            **s,
        })
    await kv_set('hero', slides)


# ─── Banners ─────────────────────────────────────────────────────────────────

BANNERS = [
    {'title': 'Science Meets Ayurveda', 'subtitle': 'Clinically validated wellness products rooted in 5000 years of tradition.',
     'image': 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1600&q=85', 'link': '/products', 'position': 'home_mid', 'order': 1},
    {'title': 'Monsoon Wellness Sale — Up to 40% Off', 'subtitle': 'Boost immunity this season with our bestsellers.',
     'image': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1600&q=85', 'link': '/products?featured=true', 'position': 'home_mid', 'order': 2},
    {'title': 'The Kumkumadi Collection', 'subtitle': 'Ancient Kumkumadi formulations for transformative skin radiance.',
     'image': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1600&q=85', 'link': "/products?category=Women's Health", 'position': 'home_mid', 'order': 3},
]


async def seed_banners():
    await banners_col.delete_many({})
    for b in BANNERS:
        bid = uid('b')
        await banners_col.insert_one({'_id': bid, **b, 'isActive': True, 'createdAt': now()})


# ─── Testimonials ────────────────────────────────────────────────────────────

TESTIMONIALS = [
    {'name': 'Priya Sharma', 'city': 'Mumbai', 'rating': 5,
     'text': "I've been using Kumkumadi serum for 3 months and the glow is unreal. My pigmentation has visibly faded."},
    {'name': 'Rohit Patel', 'city': 'Ahmedabad', 'rating': 5,
     'text': "The KSM-66 Ashwagandha genuinely changed my stress levels. Sleep is deeper, mornings are easier."},
    {'name': 'Ananya Gupta', 'city': 'Bengaluru', 'rating': 5,
     'text': "Shatavari fixed my cycles in 2 months after years of irregularity. Finally something that actually works."},
    {'name': 'Vikram Singh', 'city': 'Delhi', 'rating': 5,
     'text': 'Bhringraj oil + DHT blocker — my hairline has noticeably filled in. Worth every rupee.'},
]


async def seed_testimonials():
    await testimonials_col.delete_many({})
    for i, t in enumerate(TESTIMONIALS):
        await testimonials_col.insert_one({
            'id': uid('t'),
            **t,
            'isActive': True,
            'order': i,
            'avatar': '',
            'createdAt': now(),
        })


# ─── Social videos ───────────────────────────────────────────────────────────

SOCIAL_VIDEOS = [
    {'platform': 'youtube', 'type': 'video',
     'title': 'Ashwagandha KSM-66: The Science Behind Stress Relief',
     'embedUrl': 'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'thumbnail': 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80',
     'views': '2.4M views', 'duration': '8:24', 'channel': 'Dr MediScie Official'},
    {'platform': 'youtube', 'type': 'short',
     'title': '7 Signs Your Hair Is Crying For Bhringraj Oil',
     'embedUrl': 'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'thumbnail': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80',
     'views': '890K views', 'duration': '0:45', 'channel': 'Dr MediScie Shorts'},
    {'platform': 'instagram', 'type': 'reel',
     'title': 'Kumkumadi Morning Ritual — 30 Days Transformation',
     'embedUrl': 'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'thumbnail': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80',
     'views': '1.2M views', 'duration': '0:30', 'channel': '@drmediscie'},
    {'platform': 'instagram', 'type': 'reel',
     'title': 'Shilajit Gold — Real vs Fake Test',
     'embedUrl': 'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'thumbnail': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80',
     'views': '680K views', 'duration': '0:32', 'channel': '@drmediscie'},
    {'platform': 'facebook', 'type': 'video',
     'title': 'LIVE: Ask Our Ayurvedic Expert — Immunity Masterclass',
     'embedUrl': 'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'thumbnail': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
     'views': '45K views', 'duration': '1:12:30', 'channel': 'Dr MediScie'},
    {'platform': 'youtube', 'type': 'video',
     'title': 'Triphala: Ancient Detox for Modern Life',
     'embedUrl': 'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'thumbnail': 'https://images.unsplash.com/photo-1631390614266-57b9258e7d9a?w=600&q=80',
     'views': '1.8M views', 'duration': '12:15', 'channel': 'Dr MediScie Official'},
]


async def seed_videos():
    await social_videos_col.delete_many({})
    for i, v in enumerate(SOCIAL_VIDEOS):
        await social_videos_col.insert_one({
            'id': uid('v'),
            **v,
            'isActive': True,
            'order': i,
            'createdAt': now(),
        })


# ─── Blog ────────────────────────────────────────────────────────────────────

BLOG_POSTS = [
    {'title': '7 Ayurvedic Morning Rituals for Radiant Skin',
     'excerpt': 'Start your day with these time-tested Ayurvedic practices for glowing, healthy skin that lasts all day.',
     'tags': ['Skincare', 'Routine'],
     'featuredImage': 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=900&q=85',
     'content': '<p>Ayurveda places enormous value on morning rituals — the way we begin a day shapes the day. Here are seven rituals you can adopt for visibly radiant skin within weeks...</p>'},
    {'title': 'Understanding Adaptogens: Ashwagandha vs Shilajit',
     'excerpt': "A comprehensive guide to two of India's most powerful adaptogens — and how to choose the right one for you.",
     'tags': ['Wellness', 'Science'],
     'featuredImage': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=900&q=85',
     'content': '<p>Both Ashwagandha and Shilajit are revered adaptogens, but their actions, ideal use cases and dosages differ. This guide breaks down the science...</p>'},
    {'title': 'The Science Behind Kumkumadi: Why It Works',
     'excerpt': 'Modern clinical research validates what Ayurvedic texts have known for centuries about this liquid gold.',
     'tags': ['Science', 'Skincare'],
     'featuredImage': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=85',
     'content': '<p>Kumkumadi — literally "saffron-blend" — is an ancient Ayurvedic formulation. Modern research now confirms its remarkable effects on hyperpigmentation, dullness and aging...</p>'},
]


async def seed_blog():
    await blog_col.delete_many({})
    for i, p in enumerate(BLOG_POSTS):
        slug = make_slug(p['title'])
        await blog_col.insert_one({
            '_id': uid('bp'),
            'slug': slug,
            'title': p['title'],
            'excerpt': p['excerpt'],
            'content': p['content'],
            'tags': p['tags'],
            'featuredImage': p['featuredImage'],
            'isPublished': True,
            'author': 'Dr MediScie Team',
            'createdAt': now() - timedelta(days=(i + 1) * 7),
        })


# ─── Curated lists, flash sale, nav, content blocks ──────────────────────────

async def seed_site_kv(products):
    featured = [p['_id'] for p in products if p.get('isFeatured')]
    await kv_set('bestsellers', {'productIds': featured[:8]})
    await kv_set('new_arrivals', {'productIds': [p['_id'] for p in products[:4]]})

    flash_ids = [p['_id'] for p in products if p.get('isFeatured')][:4]
    await kv_set('flash_sale', {
        'enabled': True,
        'title': "Today's Best Deals",
        'subtitle': "Grab these offers before they're gone — massive savings on top sellers",
        'badge': 'Flash Sale — Limited Time',
        'startsAt': None,
        'endsAt': int((datetime.now(timezone.utc) + timedelta(hours=24)).timestamp() * 1000),
        'productIds': flash_ids,
    })

    await kv_set('nav', {
        'announcements': [
            '🌿 Free delivery on orders above ₹499 — Across India',
            '✨ Use code WELLNESS15 for 15% off on your first order',
        ],
        'simpleLinks': [
            {'label': 'Blog', 'href': '/blog'},
            {'label': 'About Us', 'href': '/about'},
        ],
        'footer': {
            'tagline': 'Premium Ayurvedic wellness crafted with ancient wisdom for modern lives.',
            'helpLinks': [
                {'label': 'About Us', 'to': '/about'},
                {'label': 'Contact Us', 'to': '/contact'},
                {'label': 'FAQ', 'to': '/faq'},
                {'label': 'Blog', 'to': '/blog'},
                {'label': 'Shipping & Returns', 'to': '/shipping'},
                {'label': 'Privacy Policy', 'to': '/privacy'},
                {'label': 'Terms & Conditions', 'to': '/terms'},
            ],
            'contact': {
                'email': 'info@drmediscie.com',
                'phone': '+91-8860908070',
                'address': 'Delhi, New Delhi, 110034',
            },
            'socials': {
                'instagram': 'https://instagram.com/drmediscie',
                'facebook': 'https://facebook.com/drmediscie',
                'twitter': 'https://twitter.com/drmediscie',
                'youtube': 'https://youtube.com/@drmediscie',
            },
        },
    })

    # Trust badges (above-the-fold strip beside hero)
    await kv_set('trust_badges', [
        {'icon': 'truck', 'label': 'Free Shipping', 'sub': 'Above ₹499'},
        {'icon': 'shield-check', 'label': 'Secure Payment', 'sub': '100% Safe'},
        {'icon': 'leaf', 'label': 'Natural & Organic', 'sub': 'No Chemicals'},
        {'icon': 'star', 'label': '4.9★ Rated', 'sub': '50K+ Reviews'},
    ])

    # Features strip (dark green band below hero)
    await kv_set('features_strip', [
        {'icon': 'leaf', 'text': '100% Natural Ingredients'},
        {'icon': 'shield', 'text': 'Dermatologist Tested'},
        {'icon': 'sparkles', 'text': 'Cruelty-Free & Vegan'},
        {'icon': 'star', 'text': '50,000+ Happy Customers'},
    ])

    # Stats bar (under portal section)
    await kv_set('stats_bar', [
        {'icon': 'users', 'value': '50,000+', 'label': 'Happy Customers', 'color': '#1A3C34'},
        {'icon': 'package', 'value': '180+', 'label': 'Ayurvedic Products', 'color': '#3B82F6'},
        {'icon': 'store', 'value': '28', 'label': 'Verified Vendors', 'color': '#F59E0B'},
        {'icon': 'trending-up', 'value': '₹4.8Cr+', 'label': 'Revenue Processed', 'color': '#8B5CF6'},
    ])

    # Offers strip (admin-managed promotional cards)
    await kv_set('offers', [
        {'id': uid('off'), 'title': 'Buy 2 Get 1 Free', 'subtitle': 'On all immunity essentials',
         'image': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=85',
         'link': '/products?category=Immunity%20%26%20Detox', 'badge': 'Limited Time',
         'isActive': True, 'order': 0, 'startsAt': None, 'endsAt': None},
        {'id': uid('off'), 'title': 'Flat 30% Off', 'subtitle': "Women's wellness range",
         'image': 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=85',
         'link': "/products?category=Women's%20Health", 'badge': 'Sale',
         'isActive': True, 'order': 1, 'startsAt': None, 'endsAt': None},
        {'id': uid('off'), 'title': 'Combo Kits from ₹999', 'subtitle': 'Curated wellness bundles',
         'image': 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1200&q=85',
         'link': '/products?category=Combos%20%26%20Kits', 'badge': 'Best Value',
         'isActive': True, 'order': 2, 'startsAt': None, 'endsAt': None},
    ])

    # Featured products block (separate curated list)
    await kv_set('featured_products', {
        'title': 'Featured Wellness Picks',
        'subtitle': 'Hand-selected by our Ayurvedic experts',
        'productIds': [p['_id'] for p in products if p.get('isFeatured')][:6],
    })

    # Homepage layout — ordered list of sections the admin can toggle/reorder
    await kv_set('homepage_layout', [
        {'key': 'hero', 'enabled': True, 'order': 0},
        {'key': 'trust_badges', 'enabled': True, 'order': 1},
        {'key': 'features_strip', 'enabled': True, 'order': 2},
        {'key': 'flash_sale', 'enabled': True, 'order': 3},
        {'key': 'categories', 'enabled': True, 'order': 4},
        {'key': 'featured_products', 'enabled': True, 'order': 5},
        {'key': 'offers', 'enabled': True, 'order': 6},
        {'key': 'banners', 'enabled': True, 'order': 7},
        {'key': 'bestsellers', 'enabled': True, 'order': 8},
        {'key': 'new_arrivals', 'enabled': True, 'order': 9},
        {'key': 'portal_section', 'enabled': True, 'order': 10},
        {'key': 'testimonials', 'enabled': True, 'order': 11},
        {'key': 'social_videos', 'enabled': True, 'order': 12},
        {'key': 'stats_bar', 'enabled': True, 'order': 13},
        {'key': 'blog', 'enabled': True, 'order': 14},
    ])

    # About page content
    await kv_set('about_page', {
        'title': 'Rooted in Ayurveda. Driven by Science.',
        'body': 'Dr MediScie blends 5000-year-old Ayurvedic wisdom with modern clinical research to deliver wellness products you can trust.',
        'image': 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1600&q=85',
        'mission': 'Make authentic Ayurvedic wellness accessible to every Indian household.',
        'vision': 'A healthier India, naturally — backed by science, rooted in tradition.',
        'values': [
            {'icon': 'leaf', 'title': 'Authenticity', 'description': 'Every formula is rooted in classical Ayurvedic texts.'},
            {'icon': 'shield-check', 'title': 'Safety', 'description': 'Lab-tested, third-party verified, and clinically backed.'},
            {'icon': 'heart', 'title': 'Trust', 'description': '50,000+ customers and a 4.9★ average rating.'},
        ],
    })

    # Contact info
    await kv_set('contact_info', {
        'email': 'info@drmediscie.com',
        'phone': '+91-8860908070',
        'address': 'Delhi, New Delhi, 110034',
        'hours': 'Mon – Sat, 10:00 AM – 7:00 PM IST',
        'mapEmbed': '',
    })

    # Portal section (3 cards: retail / b2b / vendor)
    await kv_set('portal_section', {
        'eyebrow': 'One Platform, Three Experiences',
        'title': 'Who Are You Shopping For?',
        'subtitle': 'Dr MediScie serves retail customers, B2B buyers and marketplace vendors — each with a tailored experience designed for you.',
        'cards': [
            {
                'kind': 'retail', 'badge': 'Retail', 'title': 'Retail Customer',
                'description': 'Shop 180+ premium Ayurvedic wellness products. Exclusive deals, express delivery, and loyalty rewards.',
                'features': [
                    '100% authentic Ayurvedic formulations',
                    'Free delivery above ₹499',
                    'Loyalty points on every order',
                    'Exclusive member discounts',
                ],
                'primaryCta': {'label': 'Shop Wellness Products', 'link': '/products'},
                'secondaryCta': None,
                'theme': {'gradient': 'linear-gradient(145deg, #1A3C34, #0f2620)', 'accent': '#A3E635'},
                'isFeatured': False,
            },
            {
                'kind': 'b2b', 'badge': 'B2B', 'title': 'Business Buyer',
                'description': 'Wholesale pricing, GST invoicing, credit terms up to Net-60, and dedicated account management.',
                'features': [
                    'Wholesale pricing — up to 40% off retail',
                    'GST invoices + Input Tax Credit',
                    'Credit terms: Net 15/30/60',
                    'RFQ & custom contract pricing',
                    'Bulk order management',
                ],
                'primaryCta': {'label': 'B2B Catalog', 'link': '/b2b/catalog'},
                'secondaryCta': {'label': 'Register', 'link': '/register/b2b'},
                'theme': {'gradient': 'linear-gradient(145deg, #1E3A5F, #0c1e35)', 'accent': '#60A5FA'},
                'isFeatured': True,
            },
            {
                'kind': 'vendor', 'badge': 'Vendor', 'title': 'Sell on Dr MediScie',
                'description': 'List your Ayurvedic products and reach 50,000+ wellness seekers. Competitive commissions, fast payouts.',
                'features': [
                    'Reach 50,000+ active buyers',
                    'Competitive 10–15% commission',
                    'Weekly payouts to your account',
                    'Full inventory & order management',
                    'Analytics & growth insights',
                ],
                'primaryCta': {'label': 'Vendor Portal', 'link': '/vendor/dashboard'},
                'secondaryCta': {'label': 'Register', 'link': '/register/vendor'},
                'theme': {'gradient': 'linear-gradient(145deg, #451A03, #2d1002)', 'accent': '#F59E0B'},
                'isFeatured': False,
            },
        ],
    })


# ─── Main ────────────────────────────────────────────────────────────────────

async def main():
    print('→ Seeding categories...')
    name_to_id = await seed_categories()
    print(f'  ✓ {len(CATEGORIES)} parents + {sum(len(c["subs"]) for c in CATEGORIES)} sub-categories')

    print('→ Seeding products...')
    products = await seed_products(name_to_id)
    print(f'  ✓ {len(products)} products')

    print('→ Seeding hero slides...')
    await seed_hero()
    print(f'  ✓ {len(HERO_SLIDES)} slides')

    print('→ Seeding banners...')
    await seed_banners()
    print(f'  ✓ {len(BANNERS)} banners')

    print('→ Seeding testimonials...')
    await seed_testimonials()
    print(f'  ✓ {len(TESTIMONIALS)} testimonials')

    print('→ Seeding social videos...')
    await seed_videos()
    print(f'  ✓ {len(SOCIAL_VIDEOS)} videos')

    print('→ Seeding blog posts...')
    await seed_blog()
    print(f'  ✓ {len(BLOG_POSTS)} posts')

    print('→ Seeding site KV blocks (curated, flash sale, nav, trust_badges, features_strip, portal_section, stats_bar)...')
    await seed_site_kv(products)
    print('  ✓ done')

    print('\n✅ Seed complete.')


if __name__ == '__main__':
    asyncio.run(main())
