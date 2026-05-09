"""
Catalog seeder — wipes & reseeds categories + products only with the
six-category taxonomy: Men's Health, Women's Health, Fitness & Performance,
Immunity & Detox, Combos & Kits, Other's. Each subcategory has >=4 products.

Run from /backend:  python -m scripts.seed_catalog
"""
import asyncio
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import categories_col, products_col
from utils.helpers import make_slug, now


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


# ─── Taxonomy ────────────────────────────────────────────────────────────────

CATEGORIES = [
    {
        'name': "Men's Health", 'icon': '💪',
        'image': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80',
        'subs': [
            {'name': 'Sexual Wellness', 'icon': '🌿'},
            {'name': 'Strength & Vitality', 'icon': '⚡'},
            {'name': 'Hair Care for Men', 'icon': '💈'},
            {'name': 'Stress & Energy', 'icon': '🧘'},
        ],
    },
    {
        'name': "Women's Health", 'icon': '🌸',
        'image': 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
        'subs': [
            {'name': 'Hormonal Balance', 'icon': '🌺'},
            {'name': 'PCOS & Fertility', 'icon': '🌷'},
            {'name': 'Skin & Beauty', 'icon': '✨'},
            {'name': 'Bone & Joint', 'icon': '🦴'},
        ],
    },
    {
        'name': 'Fitness & Performance', 'icon': '🏋️',
        'image': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
        'subs': [
            {'name': 'Protein & Muscle', 'icon': '💪'},
            {'name': 'Pre-Workout', 'icon': '⚡'},
            {'name': 'Recovery & Joints', 'icon': '🦿'},
            {'name': 'Endurance', 'icon': '🏃'},
        ],
    },
    {
        'name': 'Immunity & Detox', 'icon': '🛡️',
        'image': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
        'subs': [
            {'name': 'Daily Immunity', 'icon': '🛡️'},
            {'name': 'Liver & Detox', 'icon': '🍃'},
            {'name': 'Gut Health', 'icon': '🌱'},
            {'name': 'Antioxidants', 'icon': '💊'},
        ],
    },
    {
        'name': 'Combos & Kits', 'icon': '🎁',
        'image': 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80',
        'subs': [
            {'name': 'Hair Care Kits', 'icon': '💇'},
            {'name': 'Skin Care Kits', 'icon': '🧴'},
            {'name': 'Wellness Bundles', 'icon': '🌿'},
            {'name': 'Gift Sets', 'icon': '🎁'},
        ],
    },
    {
        'name': "Other's", 'icon': '🔖',
        'image': 'https://images.unsplash.com/photo-1556228720-da4e85f5c1d2?w=800&q=80',
        'subs': [
            {'name': 'Aromatherapy & Essential Oils', 'icon': '🌼'},
            {'name': 'Wellness Accessories', 'icon': '🧘‍♀️'},
        ],
    },
]


# ─── Products: each subcategory has >=4 entries with original copy ───────────
# Image URLs use stable Unsplash photo IDs for wellness / herbs / skincare.

IMG = {
    'shilajit': 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
    'capsules1': 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80',
    'capsules2': 'https://images.unsplash.com/photo-1550572017-edd951aa8f7e?w=800&q=80',
    'tablets': 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80',
    'oil': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80',
    'serum': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
    'mist': 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80',
    'powder': 'https://images.unsplash.com/photo-1564174045278-4f3f2b3b0d0b?w=800&q=80',
    'protein': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
    'preworkout': 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&q=80',
    'recovery': 'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=80',
    'bcaa': 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800&q=80',
    'chyawanprash': 'https://images.unsplash.com/photo-1617897903246-719242758050?w=800&q=80',
    'triphala': 'https://images.unsplash.com/photo-1631390614266-57b9258e7d9a?w=800&q=80',
    'liver': 'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=800&q=80',
    'drops': 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&q=80',
    'hairkit': 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80',
    'skinkit': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
    'wellnesskit': 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&q=80',
    'giftset': 'https://images.unsplash.com/photo-1556228720-da4e85f5c1d2?w=800&q=80',
    'rose': 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80',
    'lavender': 'https://images.unsplash.com/photo-1611072547902-f96fffc44f6f?w=800&q=80',
    'mat': 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800&q=80',
    'tongue': 'https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=800&q=80',
}


def P(name, sub, price, dp, stock, rating, reviews, img, tags, desc, ing, how, featured=False):
    return {
        'name': name, 'subcategory': sub, 'price': price, 'discountPrice': dp,
        'stock': stock, 'rating': rating, 'reviewCount': reviews, 'images': [img],
        'tags': tags, 'description': desc, 'ingredients': ing, 'howToUse': how,
        'isFeatured': featured,
    }


PRODUCTS_BY_CATEGORY = {
    "Men's Health": [
        # Sexual Wellness
        P('Safed Musli Vigor Capsules', 'Sexual Wellness', 1499, 999, 80, 4.7, 386, IMG['capsules1'],
          ['sexual-wellness', 'vitality'],
          'Premium Safed Musli root extract — the time-honoured Ayurvedic herb for male vitality, libido and stamina.',
          'Safed Musli (Chlorophytum borivilianum) root extract 500mg.',
          '1 capsule twice daily with milk after meals.', True),
        P('Gokshura Performance Tablets', 'Sexual Wellness', 1199, 849, 100, 4.6, 421, IMG['tablets'],
          ['gokshura', 'libido', 'testosterone'],
          'Standardised Gokshura (Tribulus terrestris) for naturally elevated testosterone, drive and lean muscle.',
          'Gokshura extract (40% saponins) 500mg per tablet.',
          '1 tablet twice daily after meals for 90 days.'),
        P('Kapikacchu Mucuna Powder', 'Sexual Wellness', 1099, 799, 75, 4.5, 188, IMG['powder'],
          ['mucuna', 'mood', 'libido'],
          'Velvet bean (Mucuna pruriens) powder — natural L-Dopa for mood, motivation and reproductive health.',
          'Mucuna pruriens seed powder, 15% L-Dopa.',
          '1 tsp in warm milk at bedtime.'),
        P("Men's Daily Vitality Stack", 'Sexual Wellness', 1899, 1299, 65, 4.7, 254, IMG['capsules2'],
          ['vitality', 'stack', 'wellness'],
          'A clean three-herb stack of Musli, Gokshura and Ashwagandha for daily male vitality.',
          'Safed Musli, Gokshura, Ashwagandha (KSM-66).',
          '2 capsules with breakfast.'),

        # Strength & Vitality
        P('Shilajit Gold Resin', 'Strength & Vitality', 2999, 1999, 60, 4.9, 728, IMG['shilajit'],
          ['energy', 'minerals', 'adaptogen'],
          'Pure Himalayan Shilajit Gold with 85+ ionic minerals and fulvic acid for raw strength and stamina.',
          'Shudh Shilajit resin, Gold Bhasma, Fulvic Acid.',
          'Pea-sized (300–500mg) once daily with warm milk.', True),
        P('Pure Shilajit Capsules', 'Strength & Vitality', 1599, 1099, 130, 4.6, 412, IMG['capsules1'],
          ['shilajit', 'energy'],
          'Lab-purified Shilajit in convenient capsule form — same potency, no measuring.',
          'Purified Shilajit extract 500mg.',
          '1 capsule twice daily with water.'),
        P('Kaunch Beej Strength Tablets', 'Strength & Vitality', 999, 749, 95, 4.5, 162, IMG['tablets'],
          ['kaunch', 'strength'],
          'Kaunch Beej (Mucuna pruriens) tablets to support natural strength, recovery and lean mass.',
          'Kaunch Beej extract 500mg.',
          '1 tablet twice daily.'),
        P('Vitality Booster Drops', 'Strength & Vitality', 799, 599, 140, 4.4, 109, IMG['drops'],
          ['drops', 'energy'],
          'Fast-absorbing herbal drops with Ashwagandha, Shilajit and Gokshura — vitality in 10 drops.',
          'Ashwagandha, Shilajit, Gokshura blend in glycerin base.',
          '10 drops in warm water, twice daily.'),

        # Hair Care for Men
        P('Bhringraj Hair Growth Oil', 'Hair Care for Men', 899, 599, 150, 4.7, 521, IMG['oil'],
          ['hair-growth', 'scalp'],
          'Cold-pressed Bhringraj with Amla and Brahmi — clinically shown to reduce hair fall in 12 weeks.',
          'Bhringraj, Amla, Brahmi, Coconut Oil, Sesame Oil, Rosemary EO.',
          'Massage 5–10ml into scalp 30 min before wash, 3× a week.', True),
        P('DHT Blocker Caps for Men', 'Hair Care for Men', 1399, 999, 90, 4.6, 287, IMG['capsules2'],
          ['hair-loss', 'dht'],
          'Saw Palmetto + Pumpkin Seed extract to inhibit DHT and slow male pattern hair loss.',
          'Saw Palmetto 320mg, Pumpkin Seed 200mg, Biotin 5000mcg.',
          '1 capsule daily after lunch.'),
        P('Onion Black Seed Shampoo', 'Hair Care for Men', 599, 449, 200, 4.5, 318, IMG['oil'],
          ['shampoo', 'hair-fall'],
          'Sulphate-free shampoo with Red Onion and Kalonji — reduces breakage and adds visible thickness.',
          'Red Onion extract, Black Seed oil, Bhringraj, mild surfactants.',
          'Lather, leave for 2 minutes, rinse — 3× a week.'),
        P('Beard Growth Serum', 'Hair Care for Men', 749, 549, 110, 4.4, 142, IMG['serum'],
          ['beard', 'grooming'],
          'Lightweight beard serum with Redensyl and Bhringraj for fuller, softer beard growth.',
          'Redensyl 3%, Bhringraj oil, Jojoba, Vitamin E.',
          '4–6 drops massaged into beard at night.'),

        # Stress & Energy
        P('Ashwagandha KSM-66 Capsules', 'Stress & Energy', 1799, 1199, 120, 4.9, 892, IMG['capsules1'],
          ['stress', 'adaptogen'],
          'Clinically studied KSM-66® Ashwagandha 600mg — proven to lower cortisol and improve sleep quality.',
          'KSM-66 Ashwagandha root extract 600mg, veg capsule.',
          '1 capsule twice daily after meals.', True),
        P('Brahmi Memory Tablets', 'Stress & Energy', 1099, 849, 95, 4.6, 244, IMG['tablets'],
          ['memory', 'focus'],
          'Bacopa Monnieri standardised extract for memory, focus and exam-week mental clarity.',
          'Brahmi extract (50% bacosides) 250mg.',
          '1 tablet twice daily after meals.'),
        P('Tulsi Calm Drops', 'Stress & Energy', 599, 399, 220, 4.5, 165, IMG['drops'],
          ['tulsi', 'calm'],
          'Five-tulsi adaptogenic drops — gentle daily stress support that pairs well with tea or water.',
          'Rama, Krishna, Vana, Kapoor & Lemon Tulsi extracts.',
          '5–8 drops in warm water, twice daily.'),
        P('Sleep & Restore Capsules', 'Stress & Energy', 1299, 899, 80, 4.6, 198, IMG['capsules2'],
          ['sleep', 'relax'],
          'Ashwagandha + Jatamansi + Tagar — non-habit-forming Ayurvedic sleep support.',
          'Ashwagandha 300mg, Jatamansi 150mg, Tagar 100mg.',
          '2 capsules 30 minutes before bed.'),
    ],

    "Women's Health": [
        # Hormonal Balance
        P('Shatavari Capsules for Women', 'Hormonal Balance', 1399, 949, 110, 4.8, 634, IMG['capsules1'],
          ['hormones', 'adaptogen'],
          "Organic Shatavari root extract — Ayurveda's premier herb for hormonal balance through every life stage.",
          'Shatavari (Asparagus racemosus) extract 500mg.',
          '1 capsule twice daily with warm water or milk.', True),
        P('Ashoka Womens Wellness Tablets', 'Hormonal Balance', 999, 749, 130, 4.6, 312, IMG['tablets'],
          ['cycles', 'wellness'],
          'Ashoka bark blend traditionally used to regulate menstrual cycles and ease cramps.',
          'Ashoka, Lodhra, Manjistha, Daruharidra.',
          '1 tablet twice daily after meals.'),
        P('Menopause Balance Caps', 'Hormonal Balance', 1599, 1149, 75, 4.5, 142, IMG['capsules2'],
          ['menopause', 'balance'],
          'Shatavari + Ashwagandha + Soy Isoflavones to ease hot flashes, mood swings and night sweats.',
          'Shatavari, Ashwagandha, Soy Isoflavones, Vitamin E.',
          '1 capsule twice daily.'),
        P('Period Care Herbal Tea', 'Hormonal Balance', 449, 329, 250, 4.6, 198, IMG['powder'],
          ['tea', 'period'],
          'Soothing tea with Ashoka, Cinnamon, Ginger and Fennel for cramp-free, calmer cycles.',
          'Ashoka, Cinnamon, Ginger, Fennel, Cardamom.',
          '1 tsp steeped in hot water during your cycle.'),

        # PCOS & Fertility
        P('PCOS Care Combo', 'PCOS & Fertility', 1999, 1499, 60, 4.7, 312, IMG['wellnesskit'],
          ['pcos', 'fertility'],
          '90-day Ayurvedic protocol — hormonal balance, regular cycles and weight management for PCOS.',
          'Shatavari + Ashoka + Lodhra + Triphala combination.',
          '1 capsule of each, twice daily — see leaflet.', True),
        P('Myo-Inositol + D-Chiro Powder', 'PCOS & Fertility', 1799, 1299, 80, 4.7, 256, IMG['powder'],
          ['inositol', 'pcos'],
          '40:1 Myo + D-Chiro Inositol with Folate — clinically used to improve egg quality and insulin sensitivity.',
          'Myo-Inositol 2g, D-Chiro Inositol 50mg, Folic acid 200mcg.',
          '1 sachet daily before breakfast.'),
        P('Fertility Boost Capsules', 'PCOS & Fertility', 1499, 1099, 70, 4.6, 184, IMG['capsules1'],
          ['fertility', 'conception'],
          'Shatavari, Ashwagandha and CoQ10 — a daily herbal stack for fertility readiness.',
          'Shatavari 250mg, Ashwagandha 200mg, CoQ10 100mg.',
          '1 capsule twice daily.'),
        P('Womens Prenatal Multivitamin', 'PCOS & Fertility', 1299, 949, 110, 4.7, 226, IMG['tablets'],
          ['prenatal', 'vitamins'],
          'Comprehensive prenatal multi with active folate, iron, choline and DHA.',
          'L-Methylfolate 800mcg, Iron 30mg, B12, DHA 200mg, Choline.',
          '1 tablet daily with food.'),

        # Skin & Beauty
        P('Kumkumadi Radiance Serum', 'Skin & Beauty', 1499, 999, 70, 4.8, 412, IMG['serum'],
          ['brightening', 'glow'],
          'Ancient Kumkumadi oil with 26 herbs for visibly brighter, even-toned, glowing skin.',
          'Saffron, Sandalwood, Manjistha, Lotus, Vetiver, Sesame.',
          '3–4 drops to clean face nightly, massage in upward strokes.', True),
        P('Rose Hydrating Face Mist', 'Skin & Beauty', 599, 449, 200, 4.6, 156, IMG['mist'],
          ['hydration', 'rose'],
          'Steam-distilled Damask Rose hydrosol — instant hydration and natural toning.',
          '100% Damask rose hydrosol, alcohol-free.',
          'Spritz on clean face anytime, or after cleansing.'),
        P('Ubtan Brightening Face Wash', 'Skin & Beauty', 449, 329, 240, 4.6, 312, IMG['oil'],
          ['ubtan', 'face-wash'],
          'Classic Ubtan with Turmeric, Chickpea and Saffron for everyday glow without dryness.',
          'Turmeric, Besan, Saffron, Sandalwood, Aloe.',
          'Lather on damp face, rinse — morning and night.'),
        P('Vitamin C Glow Serum', 'Skin & Beauty', 899, 649, 150, 4.7, 274, IMG['serum'],
          ['vitamin-c', 'glow'],
          '15% stable Vitamin C with Ferulic Acid — fades dark spots and adds visible radiance.',
          'L-Ascorbic acid 15%, Ferulic acid, Vitamin E.',
          '4–5 drops in the morning before sunscreen.'),

        # Bone & Joint
        P('Calcium + D3 + K2 Tablets', 'Bone & Joint', 999, 749, 130, 4.6, 198, IMG['tablets'],
          ['calcium', 'bones'],
          'Coral Calcium with Vitamin D3 and MK-7 K2 for stronger bones and better calcium absorption.',
          'Coral Calcium 500mg, D3 1000IU, K2 (MK-7) 50mcg.',
          '1 tablet daily after lunch.'),
        P('Hadjod Bone Strength Capsules', 'Bone & Joint', 849, 649, 95, 4.5, 142, IMG['capsules2'],
          ['hadjod', 'bone'],
          'Cissus quadrangularis (Hadjod) — Ayurveda’s classic herb for bone density and recovery.',
          'Hadjod extract 500mg.',
          '1 capsule twice daily.'),
        P('Joint Mobility Caps (Boswellia)', 'Bone & Joint', 1199, 849, 110, 4.7, 286, IMG['capsules1'],
          ['joints', 'boswellia'],
          'Boswellia + Turmeric + Ginger — anti-inflammatory support for stiff, achy joints.',
          'Boswellia 250mg, Turmeric (95%) 200mg, Ginger 100mg.',
          '1 capsule twice daily after meals.'),
        P('Iron + Folate Womens Tonic', 'Bone & Joint', 749, 549, 160, 4.5, 124, IMG['drops'],
          ['iron', 'energy'],
          'Gentle iron tonic with folate and B12 for women — non-constipating, no metallic aftertaste.',
          'Iron bisglycinate 17mg, Folate 400mcg, B12 5mcg.',
          '10ml once daily after lunch.'),
    ],

    'Fitness & Performance': [
        # Protein & Muscle
        P('Plant Protein + Creatine Blend', 'Protein & Muscle', 2499, 1799, 80, 4.6, 198, IMG['protein'],
          ['protein', 'creatine'],
          'Organic pea + rice protein 25g + 3g creatine per scoop. Smooth chocolate, no chalk.',
          'Pea isolate, Brown rice protein, Creatine, Cocoa, Stevia.',
          '1 scoop in 250ml water/milk post-workout.', True),
        P('Whey Isolate Performance', 'Protein & Muscle', 3499, 2799, 60, 4.7, 412, IMG['protein'],
          ['whey', 'isolate'],
          '90% pure whey protein isolate — 27g protein, <1g sugar, instantised for fast mixing.',
          'Whey protein isolate, lecithin, natural flavour.',
          '1 scoop post-workout or between meals.'),
        P('Mass Gainer Strength', 'Protein & Muscle', 2999, 2249, 50, 4.5, 162, IMG['protein'],
          ['mass-gainer', 'bulk'],
          'Clean mass gainer with whey, complex carbs and creatine — no junk fillers.',
          'Whey concentrate, Oats flour, Maltodextrin, Creatine.',
          '2 scoops in 400ml milk post-workout.'),
        P('Creatine Monohydrate Pure', 'Protein & Muscle', 1299, 949, 140, 4.8, 488, IMG['powder'],
          ['creatine', 'strength'],
          'Micronised Creatine Monohydrate — unflavoured, lab-tested, third-party verified.',
          '100% pure Creatine Monohydrate (5g per serving).',
          '1 scoop daily, any time, with water.'),

        # Pre-Workout
        P('Pre-Workout Energy Shots', 'Pre-Workout', 1199, 799, 100, 4.5, 156, IMG['preworkout'],
          ['energy', 'pre-workout'],
          'Natural Ginseng + Ashwagandha shots. Zero sugar, no crash. 60ml × 6 pack.',
          'Korean Ginseng, Ashwagandha, Beetroot, Green-tea caffeine.',
          '1 shot 20–30 min before workout.'),
        P('Beta-Alanine Pump Powder', 'Pre-Workout', 1499, 1099, 80, 4.5, 142, IMG['powder'],
          ['pump', 'pre-workout'],
          'Beta-Alanine + Citrulline Malate — better pumps, longer endurance, less burnout.',
          'Beta-Alanine 3.2g, Citrulline Malate 6g, Pink salt.',
          '1 scoop 25 min before training.'),
        P('Caffeine + L-Theanine Caps', 'Pre-Workout', 749, 549, 180, 4.6, 218, IMG['capsules1'],
          ['caffeine', 'focus'],
          'Smart 100mg caffeine with 200mg L-Theanine — clean focus without jitters.',
          'Caffeine anhydrous 100mg, L-Theanine 200mg.',
          '1 capsule before training or focused work.'),
        P('Citrulline Malate Powder', 'Pre-Workout', 999, 749, 120, 4.6, 186, IMG['powder'],
          ['nitric-oxide', 'pump'],
          'Pure 2:1 Citrulline Malate for nitric-oxide pumps and reduced muscle soreness.',
          'L-Citrulline Malate 2:1 (6g per serving).',
          '1 scoop 30 min pre-workout.'),

        # Recovery & Joints
        P('Recovery Pro — Joint & Muscle', 'Recovery & Joints', 1999, 1299, 90, 4.7, 362, IMG['recovery'],
          ['recovery', 'joints'],
          'Boswellia + Turmeric + Marine Collagen for muscle recovery and joint mobility.',
          'Boswellia 250mg, Turmeric (95%) 200mg, Marine collagen 500mg.',
          '2 capsules post-workout or with dinner.'),
        P('Marine Collagen Peptides', 'Recovery & Joints', 2499, 1899, 70, 4.7, 244, IMG['powder'],
          ['collagen', 'joints'],
          'Type I Marine Collagen peptides — supports skin, hair, nails and joints.',
          'Hydrolysed marine collagen 10g per serving.',
          '1 scoop in coffee or warm water daily.'),
        P('Glucosamine Chondroitin MSM', 'Recovery & Joints', 1599, 1199, 90, 4.5, 178, IMG['tablets'],
          ['joints', 'cartilage'],
          'Triple-action joint formula for cartilage support, mobility and reduced stiffness.',
          'Glucosamine 1500mg, Chondroitin 1200mg, MSM 1000mg.',
          '2 tablets daily with food.'),
        P('Magnesium Glycinate Caps', 'Recovery & Joints', 899, 649, 160, 4.7, 296, IMG['capsules2'],
          ['magnesium', 'recovery'],
          'High-absorption magnesium glycinate — better recovery, deeper sleep, fewer cramps.',
          'Magnesium glycinate 400mg per serving.',
          '2 capsules before bed.'),

        # Endurance
        P('BCAA + Electrolytes Powder', 'Endurance', 1599, 1199, 75, 4.5, 142, IMG['bcaa'],
          ['bcaa', 'hydration'],
          '2:1:1 BCAA with electrolytes for muscle endurance and intra-workout hydration.',
          'L-Leucine, L-Isoleucine, L-Valine, Sodium, Potassium, Magnesium.',
          '1 scoop in 500ml water during workout.'),
        P('EAA Hydration Sticks', 'Endurance', 1299, 949, 110, 4.6, 168, IMG['powder'],
          ['eaa', 'hydration'],
          'Full-spectrum essential amino acid sticks with coconut water powder. Travel-friendly.',
          'EAAs 7g, Coconut water powder, Pink salt.',
          '1 stick in 500ml water during training.'),
        P('Beetroot Endurance Caps', 'Endurance', 999, 749, 100, 4.5, 124, IMG['capsules1'],
          ['beetroot', 'endurance'],
          'Concentrated beetroot extract — natural nitrates for stamina and oxygen efficiency.',
          'Beetroot extract 500mg (standardised nitrates).',
          '2 capsules 60 min before cardio.'),
        P('Cordyceps + Rhodiola Endure', 'Endurance', 1499, 1099, 80, 4.6, 156, IMG['capsules2'],
          ['cordyceps', 'rhodiola'],
          'Adaptogenic endurance stack — Cordyceps and Rhodiola for VO2 max and altitude resilience.',
          'Cordyceps militaris 500mg, Rhodiola rosea 200mg.',
          '1 capsule twice daily.'),
    ],

    'Immunity & Detox': [
        # Daily Immunity
        P('Chyawanprash Gold Premium', 'Daily Immunity', 999, 749, 200, 4.8, 728, IMG['chyawanprash'],
          ['immunity', 'antioxidant'],
          '41 Ayurvedic herbs including Amla 5000mg, Saffron and Gold Bhasma — daily immunity backbone.',
          'Amla pulp, Ghee, Honey, Saffron, Gold Bhasma, 36 herbs.',
          '1–2 tsp daily on empty stomach with warm milk.', True),
        P('Giloy Tulsi Immunity Drops', 'Daily Immunity', 499, 349, 250, 4.6, 178, IMG['drops'],
          ['giloy', 'tulsi'],
          'Concentrated Giloy + Tulsi extract — daily immunity in 5 drops, no sugar.',
          'Giloy stem extract, Tulsi extract, Black pepper, Ginger.',
          '5–10 drops in warm water twice daily.'),
        P('Vitamin C 1000 Effervescent', 'Daily Immunity', 449, 349, 220, 4.6, 218, IMG['tablets'],
          ['vitamin-c', 'immunity'],
          'Buffered Vitamin C 1000mg with Zinc and Rose Hips — fizzy orange flavour.',
          'Vitamin C 1000mg, Zinc 10mg, Rose Hips 50mg.',
          '1 tablet in a glass of water daily.'),
        P('Amla Vitamin-C Capsules', 'Daily Immunity', 599, 449, 180, 4.5, 162, IMG['capsules1'],
          ['amla', 'vitamin-c'],
          'Whole-fruit Amla extract — natural Vitamin C for immunity and skin radiance.',
          'Amla extract 500mg (standardised tannins).',
          '1 capsule twice daily.'),

        # Liver & Detox
        P('Liver Guard — Bhumi Amla', 'Liver & Detox', 1399, 899, 110, 4.6, 289, IMG['liver'],
          ['liver', 'detox'],
          'Bhumi Amla + Kutki + Kalmegh extract for liver protection and fatty-liver support.',
          'Bhumi Amla 250mg, Kutki 100mg, Kalmegh 100mg, Punarnava 100mg.',
          '1 capsule twice daily before meals.'),
        P('Milk Thistle Silymarin Caps', 'Liver & Detox', 1199, 899, 130, 4.7, 224, IMG['capsules2'],
          ['silymarin', 'liver'],
          'Standardised Milk Thistle (80% silymarin) — gold-standard liver detox.',
          'Milk Thistle extract 500mg (80% silymarin).',
          '1 capsule twice daily.'),
        P('Aloe Vera Juice (Sugar-Free)', 'Liver & Detox', 449, 329, 200, 4.4, 142, IMG['drops'],
          ['aloe', 'detox'],
          '99% pure Aloe Vera inner-leaf juice — gentle daily detox and gut soothing.',
          'Aloe vera inner leaf juice, citric acid (preservative).',
          '20–30ml on empty stomach.'),
        P('Detox Herbal Tea', 'Liver & Detox', 549, 399, 220, 4.5, 168, IMG['powder'],
          ['detox', 'tea'],
          'Bedtime detox blend with Triphala, Senna, Fennel and Ginger.',
          'Triphala, Senna, Fennel, Ginger, Cinnamon.',
          '1 tsp steeped in hot water at bedtime.'),

        # Gut Health
        P('Triphala Gut Cleanse', 'Gut Health', 799, 549, 180, 4.8, 634, IMG['triphala'],
          ['digestive', 'detox'],
          'Classic Amalaki + Bibhitaki + Haritaki trio for gentle gut cleansing.',
          'Amalaki, Bibhitaki, Haritaki (1:1:1).',
          '2 capsules at bedtime with warm water.'),
        P('Probiotic 30B + Prebiotic', 'Gut Health', 1499, 1099, 90, 4.7, 282, IMG['capsules1'],
          ['probiotic', 'gut'],
          '30 billion CFU multi-strain probiotic with FOS prebiotic — shelf-stable, no refrigeration.',
          '6-strain probiotic blend 30B CFU, FOS 100mg.',
          '1 capsule daily before breakfast.'),
        P('Saunf Jeera Digestive Drops', 'Gut Health', 399, 299, 240, 4.5, 132, IMG['drops'],
          ['digestive', 'fennel'],
          'Quick-relief drops with Fennel, Cumin and Ajwain for bloating and gas.',
          'Fennel, Cumin, Ajwain, Mint essential oil.',
          '5 drops in warm water after meals.'),
        P('Psyllium Husk Fibre', 'Gut Health', 549, 399, 200, 4.6, 192, IMG['powder'],
          ['fibre', 'isabgol'],
          'Soluble fibre Isabgol — supports regularity, cholesterol and gut microbiome.',
          'Plantago ovata husk powder.',
          '1 tbsp in water at bedtime.'),

        # Antioxidants
        P('Moringa Superfood Powder', 'Antioxidants', 699, 499, 220, 4.6, 289, IMG['powder'],
          ['superfood', 'antioxidant'],
          'Organic Moringa leaf powder — 92 nutrients, 46 antioxidants. Smoothie-ready.',
          'Organic Moringa oleifera leaf powder, sun-dried.',
          '1 tsp in smoothie or warm water.'),
        P('Curcumin 95% with BioPerine', 'Antioxidants', 999, 749, 140, 4.7, 318, IMG['capsules2'],
          ['curcumin', 'inflammation'],
          'High-potency Curcumin 95% with BioPerine for 20× absorption.',
          'Curcumin 500mg, BioPerine 5mg.',
          '1 capsule twice daily after meals.'),
        P('Spirulina Tablets', 'Antioxidants', 599, 449, 180, 4.5, 156, IMG['tablets'],
          ['spirulina', 'protein'],
          'Pure spirulina tablets — plant protein, B12, iron and chlorophyll.',
          '100% Spirulina platensis, sun-grown.',
          '4 tablets daily with breakfast.'),
        P('Resveratrol Antioxidant Caps', 'Antioxidants', 1299, 949, 100, 4.6, 168, IMG['capsules1'],
          ['resveratrol', 'longevity'],
          'Trans-Resveratrol 500mg from Japanese Knotweed — cellular antioxidant for longevity.',
          'Trans-Resveratrol 500mg (98% pure).',
          '1 capsule daily with breakfast.'),
    ],

    'Combos & Kits': [
        # Hair Care Kits
        P('Hair Transformation Kit (Men)', 'Hair Care Kits', 2999, 1799, 50, 4.8, 445, IMG['hairkit'],
          ['hair-kit', 'gift'],
          '90-day regrowth system — Bhringraj Oil 200ml + DHT Blocker + Scalp Serum.',
          'Bhringraj oil, DHT Blocker capsules, Scalp serum.',
          'Follow the included 90-day regimen card.', True),
        P('Anti-Hairfall Kit (Women)', 'Hair Care Kits', 2799, 1699, 55, 4.7, 312, IMG['hairkit'],
          ['hair-kit', 'women'],
          'Onion Shampoo + Bhringraj Oil + Hair-Growth Serum for thicker, longer hair.',
          'Onion-Kalonji Shampoo, Bhringraj Oil, Hair Serum.',
          'Wash 3× a week, oil 2× a week, serum daily.'),
        P('Scalp Detox Duo', 'Hair Care Kits', 1499, 999, 80, 4.6, 184, IMG['hairkit'],
          ['scalp', 'detox'],
          'Clarifying scalp scrub + tea-tree shampoo — fights dandruff and oily buildup.',
          'Salicylic scalp scrub, Tea-tree shampoo.',
          'Scrub once a week, shampoo as usual.'),
        P('Hair Vitamin Combo', 'Hair Care Kits', 1899, 1299, 70, 4.6, 142, IMG['hairkit'],
          ['hair-vitamins', 'biotin'],
          'Biotin gummies + Hair Vital capsules — inside-out hair nourishment for 90 days.',
          'Biotin 5000mcg gummies, Hair Vital multi-capsules.',
          '1 gummy + 1 capsule daily.'),

        # Skin Care Kits
        P('Skin Radiance Starter Kit', 'Skin Care Kits', 2499, 1499, 60, 4.7, 312, IMG['skinkit'],
          ['skin-kit', 'glow'],
          'Kumkumadi Serum + Turmeric Face Wash + Rose Mist — your full radiance routine.',
          'Kumkumadi serum, Turmeric face wash, Rose mist.',
          'Cleanse → Mist → Serum, twice daily.', True),
        P('Acne Clear Kit', 'Skin Care Kits', 1799, 1199, 80, 4.6, 244, IMG['skinkit'],
          ['acne', 'clear-skin'],
          'Neem face wash, Salicylic serum and Tea-Tree spot gel for breakout-prone skin.',
          'Neem face wash, Salicylic 2% serum, Tea-tree spot gel.',
          'AM cleanse + spot gel, PM cleanse + serum.'),
        P('Anti-Aging Night Kit', 'Skin Care Kits', 2999, 2199, 50, 4.7, 188, IMG['skinkit'],
          ['anti-aging', 'night'],
          'Retinal 0.05% serum + Bakuchiol cream + Eye Recovery roll-on.',
          'Retinaldehyde 0.05%, Bakuchiol 1%, Caffeine eye roll-on.',
          'Retinal then cream nightly; eye roll-on AM/PM.'),
        P('Sun Defence Combo', 'Skin Care Kits', 1499, 999, 100, 4.6, 162, IMG['skinkit'],
          ['sunscreen', 'defence'],
          'SPF 50 mineral sunscreen + Vitamin-C serum + after-sun aloe gel.',
          'Zinc oxide 12% sunscreen, 15% Vit-C serum, 99% aloe gel.',
          'Vit-C AM → sunscreen; aloe PM after sun.'),

        # Wellness Bundles
        P('Immunity Wellness Pack (Family)', 'Wellness Bundles', 3499, 2199, 40, 4.9, 187, IMG['wellnesskit'],
          ['family', 'immunity'],
          'Chyawanprash Gold + Triphala + Moringa + Ashwagandha — family immunity in one box.',
          '4 hero immunity products in one bundle.',
          'See individual product directions.'),
        P('Daily Energy Bundle', 'Wellness Bundles', 2499, 1799, 60, 4.7, 224, IMG['wellnesskit'],
          ['energy', 'daily'],
          'Shilajit + Ashwagandha + Spirulina — clean daily energy stack.',
          'Shilajit caps, Ashwagandha caps, Spirulina tablets.',
          '1–2 capsules of each daily.'),
        P('Detox Reset Bundle', 'Wellness Bundles', 1999, 1399, 70, 4.6, 168, IMG['wellnesskit'],
          ['detox', 'reset'],
          '14-day reset — Triphala, Liver Guard and Detox Tea.',
          'Triphala caps, Liver Guard, Detox tea.',
          'Follow 14-day plan inside the kit.'),
        P('Womens Glow Bundle', 'Wellness Bundles', 2799, 1899, 55, 4.7, 196, IMG['wellnesskit'],
          ['women', 'glow'],
          'Shatavari + Kumkumadi Serum + Vit-C — inside-out glow for women.',
          'Shatavari caps, Kumkumadi serum, Vit-C serum.',
          'Caps daily; serums morning + night.'),

        # Gift Sets
        P('New Mom Recovery Kit', 'Gift Sets', 2799, 1999, 35, 4.8, 92, IMG['giftset'],
          ['mother', 'recovery'],
          'Postnatal Ayurvedic recovery — Shatavari, Calcium D3, Lactation tea, Stretch-mark oil.',
          '4-product kit curated for new mothers.',
          'See enclosed leaflet for daily routine.'),
        P('Diwali Wellness Hamper', 'Gift Sets', 3499, 2499, 30, 4.8, 148, IMG['giftset'],
          ['gift', 'festive'],
          'Festive hamper — Chyawanprash Gold, Saffron Tea, Honey & gift card in a wooden box.',
          'Chyawanprash Gold, Saffron tea, Wild honey, Card.',
          'Beautifully boxed and ready to gift.'),
        P('Couple’s Wellness Box', 'Gift Sets', 2999, 1999, 40, 4.7, 102, IMG['giftset'],
          ['couple', 'gift'],
          'His & Hers wellness box — Ashwagandha for him, Shatavari for her, plus a tea blend.',
          'Ashwagandha caps, Shatavari caps, Calm tea.',
          '1 capsule each twice daily.'),
        P('Self-Care Sunday Box', 'Gift Sets', 1999, 1399, 60, 4.6, 88, IMG['giftset'],
          ['self-care', 'gift'],
          'Aroma candle, bath salts, Kumkumadi serum and herbal tea — pure Sunday reset.',
          'Soy candle, Himalayan bath salts, Kumkumadi 10ml, Calm tea.',
          'Light, soak, serum, sip.'),
    ],

    "Other's": [
        # Aromatherapy & Essential Oils
        P('Lavender Calm Essential Oil', 'Aromatherapy & Essential Oils', 749, 549, 130, 4.7, 218, IMG['lavender'],
          ['lavender', 'aroma'],
          'Steam-distilled French Lavender — calming aroma for sleep and stress relief.',
          '100% pure Lavandula angustifolia essential oil.',
          '4–6 drops in diffuser before bed.'),
        P('Tea Tree Purifying Oil', 'Aromatherapy & Essential Oils', 599, 449, 150, 4.6, 184, IMG['drops'],
          ['tea-tree', 'aroma'],
          'Australian Tea Tree oil — purifying for skin, scalp and home diffusion.',
          '100% pure Melaleuca alternifolia oil.',
          '3 drops with carrier oil for skin; 5 drops in diffuser.'),
        P('Eucalyptus Breathe Oil', 'Aromatherapy & Essential Oils', 549, 399, 160, 4.6, 142, IMG['drops'],
          ['eucalyptus', 'breathe'],
          'Cooling eucalyptus essential oil — clears congestion and refreshes the room.',
          '100% pure Eucalyptus globulus oil.',
          '5 drops in steam inhalation or diffuser.'),
        P('Sleep Diffuser Blend', 'Aromatherapy & Essential Oils', 899, 649, 100, 4.7, 162, IMG['lavender'],
          ['sleep', 'diffuser'],
          'Pre-mixed Lavender + Chamomile + Cedarwood diffuser blend for deep sleep.',
          'Lavender, Roman chamomile, Cedarwood essential oils.',
          '6–8 drops in diffuser 30 min before bed.'),

        # Wellness Accessories
        P('Cork Yoga Mat (5mm)', 'Wellness Accessories', 2999, 2199, 40, 4.8, 196, IMG['mat'],
          ['yoga', 'mat'],
          'Sustainable cork-top yoga mat with natural rubber base — non-slip even when sweaty.',
          'Portuguese cork top, natural tree-rubber base. 183×61cm.',
          'Wipe with damp cloth; air dry.'),
        P('Copper Tongue Cleaner', 'Wellness Accessories', 249, 199, 300, 4.7, 312, IMG['tongue'],
          ['ayurveda', 'oral-care'],
          'Pure copper tongue scraper — ancient Ayurvedic morning ritual for oral health.',
          '100% pure copper, hand-finished.',
          'Scrape tongue gently 5–7 times each morning.'),
        P('Brass Neti Pot', 'Wellness Accessories', 549, 399, 120, 4.6, 142, IMG['tongue'],
          ['neti', 'sinus'],
          'Traditional brass neti pot for jala neti — gentle daily sinus cleansing.',
          'Pure brass, 250ml capacity.',
          'Use with lukewarm saline water; rinse after.'),
        P('Wooden Kansa Face Wand', 'Wellness Accessories', 999, 749, 80, 4.6, 118, IMG['mat'],
          ['kansa', 'massage'],
          'Kansa metal face massage wand on a teak handle — improves circulation and glow.',
          'Kansa (bronze alloy) head, teak wood handle.',
          'Massage face 3–5 minutes after oiling.'),
    ],
}


# ─── Seed routines ───────────────────────────────────────────────────────────

async def seed():
    print('→ Wiping categories & products...')
    await categories_col.delete_many({})
    await products_col.delete_many({})

    print('→ Inserting categories...')
    cat_count = sub_count = 0
    for parent in CATEGORIES:
        pid = uid('cat')
        await categories_col.insert_one({
            '_id': pid, 'name': parent['name'], 'slug': make_slug(parent['name']),
            'icon': parent['icon'], 'image': parent['image'],
            'order': CATEGORIES.index(parent) + 1,
            'isActive': True, 'parent': None, 'createdAt': now(),
        })
        cat_count += 1
        for i, sub in enumerate(parent['subs']):
            await categories_col.insert_one({
                '_id': uid('cat'), 'name': sub['name'],
                'slug': make_slug(f"{parent['name']}-{sub['name']}"),
                'icon': sub['icon'], 'image': '', 'order': i,
                'isActive': True, 'parent': pid, 'createdAt': now(),
            })
            sub_count += 1
    print(f'  ✓ {cat_count} categories, {sub_count} subcategories')

    print('→ Inserting products...')
    total = 0
    sku = 1000
    for cat_name, items in PRODUCTS_BY_CATEGORY.items():
        for p in items:
            doc = {
                '_id': uid('p'),
                'name': p['name'],
                'slug': make_slug(f"{p['name']}-{sku}"),
                'brand': 'Dr MediScie',
                'sku': f'DRM-{sku}',
                'price': p['price'],
                'discountPrice': p['discountPrice'],
                'mrp': p['price'],
                'stock': p['stock'],
                'rating': p['rating'],
                'reviewCount': p['reviewCount'],
                'isFeatured': p.get('isFeatured', False),
                'isActive': True,
                'images': p['images'],
                'category': cat_name,
                'subcategory': p['subcategory'],
                'tags': p['tags'],
                'description': p['description'],
                'ingredients': p['ingredients'],
                'howToUse': p['howToUse'],
                'seoMeta': {'title': p['name'], 'description': p['description'][:160]},
                'createdAt': now(),
            }
            await products_col.insert_one(doc)
            sku += 1
            total += 1
    print(f'  ✓ {total} products inserted')
    print('\n✅ Catalog seed complete.')


if __name__ == '__main__':
    asyncio.run(seed())
