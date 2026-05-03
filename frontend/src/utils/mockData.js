// Comprehensive mock data for Dr MediScie — used as API fallback

export const MOCK_PRODUCTS = [
  // Men's Health
  { id: 'p1', _id: 'p1', name: 'Shilajit Gold Resin', slug: 'shilajit-gold-resin', brand: 'Dr MediScie', price: 2499, discountPrice: 1999, mrp: 2999, stock: 18, rating: 4.9, reviewCount: 728, isFeatured: true, images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80'], category: "Men's Health", tags: ['energy', 'strength', 'adaptogen', 'testosterone'], description: 'Pure Himalayan Shilajit Gold with 85+ ionic minerals, fulvic acid. Enhances strength, stamina & testosterone naturally.' },
  { id: 'p2', _id: 'p2', name: 'Ashwagandha KSM-66 Capsules', slug: 'ashwagandha-ksm66-capsules', brand: 'Dr MediScie', price: 1499, discountPrice: 1199, mrp: 1799, stock: 3, rating: 4.9, reviewCount: 892, isFeatured: true, images: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&q=80'], category: "Men's Health", tags: ['stress-relief', 'immunity', 'adaptogen', 'testosterone'], description: 'Clinically studied KSM-66® Ashwagandha root extract, 600mg per capsule. Proven to boost testosterone by 17%.' },
  { id: 'p3', _id: 'p3', name: 'Safed Musli Power Capsules', slug: 'safed-musli-power-capsules', brand: 'Dr MediScie', price: 1299, discountPrice: 999, mrp: 1499, stock: 42, rating: 4.7, reviewCount: 386, isFeatured: true, images: ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80'], category: "Men's Health", tags: ['sexual-wellness', 'strength', 'vitality'], description: 'Premium Safed Musli extract — the Ayurvedic answer to male vitality and performance.' },
  { id: 'p4', _id: 'p4', name: 'Bhringraj Hair Growth Oil (Men)', slug: 'bhringraj-hair-growth-oil', brand: 'Dr MediScie', price: 799, discountPrice: 599, mrp: 899, stock: 78, rating: 4.7, reviewCount: 521, isFeatured: false, images: ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&q=80'], category: "Men's Health", tags: ['hair-growth', 'scalp-care', 'grooming'], description: 'Cold-pressed Bhringraj with Amla and Brahmi. Clinically shown to reduce hair fall by 47% in 12 weeks.' },
  // Women's Health
  { id: 'p5', _id: 'p5', name: 'Shatavari Capsules for Women', slug: 'shatavari-capsules', brand: 'Dr MediScie', price: 1199, discountPrice: 949, mrp: 1399, stock: 65, rating: 4.8, reviewCount: 634, isFeatured: true, images: ['https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=500&q=80'], category: "Women's Health", tags: ['hormones', 'pcos', 'fertility', 'adaptogen'], description: 'Organic Shatavari root extract 500mg — Ayurveda\'s premier herb for women\'s hormonal balance and reproductive health.' },
  { id: 'p6', _id: 'p6', name: 'Kumkumadi Radiance Serum', slug: 'kumkumadi-radiance-serum', brand: 'Dr MediScie', price: 1299, discountPrice: 999, mrp: 1499, stock: 45, rating: 4.8, reviewCount: 412, isFeatured: true, images: ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80'], category: "Women's Health", tags: ['brightening', 'anti-aging', 'beauty'], description: 'Ancient Kumkumadi oil blend with 26 Ayurvedic herbs for luminous, glowing skin.' },
  { id: 'p7', _id: 'p7', name: 'Guduchi Women\'s Immunity Pack', slug: 'guduchi-womens-immunity', brand: 'Dr MediScie', price: 899, discountPrice: 749, mrp: 999, stock: 56, rating: 4.7, reviewCount: 289, isFeatured: false, images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&q=80'], category: "Women's Health", tags: ['immunity', 'hormones', 'antioxidant'], description: '40+ herbs including Amla, Giloy & Shatavari in traditional Chyawanprash formulation for women.' },
  // Fitness & Performance
  { id: 'p8', _id: 'p8', name: 'Plant Protein + Creatine Blend', slug: 'plant-protein-creatine', brand: 'Dr MediScie', price: 2199, discountPrice: 1799, mrp: 2499, stock: 34, rating: 4.6, reviewCount: 198, isFeatured: true, images: ['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&q=80'], category: 'Fitness & Performance', tags: ['protein', 'muscle', 'fitness', 'pre-workout'], description: 'Organic pea + rice protein 25g + 3g Creatine Monohydrate per serving. Chocolate & Vanilla available.' },
  { id: 'p9', _id: 'p9', name: 'Pre-Workout Energy Shots (Ginseng)', slug: 'pre-workout-ginseng-shots', brand: 'Dr MediScie', price: 999, discountPrice: 799, mrp: 1199, stock: 88, rating: 4.5, reviewCount: 156, isFeatured: false, images: ['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&q=80'], category: 'Fitness & Performance', tags: ['pre-workout', 'energy', 'stamina'], description: 'Natural Ginseng + Ashwagandha energy shots. Zero sugar, zero crashes. 100ml per shot.' },
  { id: 'p10', _id: 'p10', name: 'Recovery Pro — Joint & Muscle', slug: 'recovery-pro-joint-muscle', brand: 'Dr MediScie', price: 1699, discountPrice: 1299, mrp: 1999, stock: 42, rating: 4.7, reviewCount: 362, isFeatured: false, images: ['https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600&q=80'], category: 'Fitness & Performance', tags: ['recovery', 'joints', 'muscle'], description: 'Boswellia + Turmeric + Collagen complex for fast-track muscle recovery and joint mobility.' },
  // Immunity & Detox
  { id: 'p11', _id: 'p11', name: 'Chyawanprash Gold Premium', slug: 'chyawanprash-gold-premium', brand: 'Dr MediScie', price: 899, discountPrice: 749, mrp: 999, stock: 120, rating: 4.8, reviewCount: 728, isFeatured: true, images: ['https://images.unsplash.com/photo-1617897903246-719242758050?w=500&q=80'], category: 'Immunity & Detox', tags: ['immunity', 'antioxidant', 'adaptogen'], description: '41 Ayurvedic herbs including premium Amla (5000mg), Saffron & Gold Bhasma. India\'s most comprehensive immunity formula.' },
  { id: 'p12', _id: 'p12', name: 'Triphala Gut Cleanse Capsules', slug: 'triphala-gut-cleanse', brand: 'Dr MediScie', price: 699, discountPrice: 549, mrp: 799, stock: 95, rating: 4.8, reviewCount: 634, isFeatured: false, images: ['https://images.unsplash.com/photo-1631390614266-57b9258e7d9a?w=600&q=80'], category: 'Immunity & Detox', tags: ['digestive', 'detox', 'gut'], description: 'Classic trio of Amalaki, Bibhitaki & Haritaki for complete gut cleansing and detoxification.' },
  { id: 'p13', _id: 'p13', name: 'Liver Guard — Bhumi Amla Extract', slug: 'liver-guard-bhumi-amla', brand: 'Dr MediScie', price: 1199, discountPrice: 899, mrp: 1399, stock: 67, rating: 4.6, reviewCount: 289, isFeatured: false, images: ['https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=600&q=80'], category: 'Immunity & Detox', tags: ['liver', 'detox', 'digestive'], description: 'Bhumi Amla + Kutki + Kalmegh extract for liver protection, fatty liver management and detox.' },
  { id: 'p14', _id: 'p14', name: 'Moringa Superfood Powder', slug: 'moringa-superfood-powder', brand: 'Dr MediScie', price: 599, discountPrice: 499, mrp: 699, stock: 88, rating: 4.6, reviewCount: 289, isFeatured: false, images: ['https://images.unsplash.com/photo-1564174045278-4f3f2b3b0d0b?w=600&q=80'], category: 'Immunity & Detox', tags: ['superfood', 'energy', 'immunity'], description: 'Organic Moringa leaf powder with 92 nutrients, 46 antioxidants. Add to smoothies or water.' },
  // Combos & Kits
  { id: 'p15', _id: 'p15', name: 'Hair Transformation Kit (Men)', slug: 'hair-transformation-kit-men', brand: 'Dr MediScie', price: 2499, discountPrice: 1799, mrp: 2999, stock: 28, rating: 4.8, reviewCount: 445, isFeatured: true, images: ['https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&q=80'], category: 'Combos & Kits', tags: ['hair-kit', 'hair-growth', 'grooming', 'gift'], description: 'Complete 90-day hair regrowth system: Bhringraj Oil (200ml) + DHT Blocker Capsules + Scalp Serum.' },
  { id: 'p16', _id: 'p16', name: 'Skin Radiance Starter Kit', slug: 'skin-radiance-starter-kit', brand: 'Dr MediScie', price: 1999, discountPrice: 1499, mrp: 2499, stock: 35, rating: 4.7, reviewCount: 312, isFeatured: true, images: ['https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80'], category: 'Combos & Kits', tags: ['skin-kit', 'brightening', 'starter', 'gift'], description: 'Kumkumadi Serum + Turmeric Face Wash + Rose Mist — your complete Ayurvedic skin radiance routine.' },
  { id: 'p17', _id: 'p17', name: 'Immunity Wellness Pack (Family)', slug: 'immunity-wellness-pack-family', brand: 'Dr MediScie', price: 2999, discountPrice: 2199, mrp: 3499, stock: 22, rating: 4.9, reviewCount: 187, isFeatured: false, images: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&q=80'], category: 'Combos & Kits', tags: ['wellness-pack', 'immunity', 'gift', 'family'], description: 'Chyawanprash Gold + Triphala + Moringa + Ashwagandha — protect the entire family with Ayurvedic immunity.' },
];

export const MOCK_CATEGORIES = [
  { id: 'c1', name: "Men's Health", slug: 'mens-health', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', productCount: 48, icon: '💪', color: '#1E3A5F' },
  { id: 'c2', name: "Women's Health", slug: 'womens-health', image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&q=80', productCount: 56, icon: '🌸', color: '#831843' },
  { id: 'c3', name: 'Fitness & Performance', slug: 'fitness', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80', productCount: 39, icon: '🏋️', color: '#1A3C34' },
  { id: 'c4', name: 'Immunity & Detox', slug: 'immunity', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80', productCount: 52, icon: '🛡️', color: '#7C3AED' },
  { id: 'c5', name: 'Combos & Kits', slug: 'combos', image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80', productCount: 24, icon: '🎁', color: '#C8A96E' },
];

// Social Media Videos (YouTube, Instagram Reels, Facebook Videos)
export const MOCK_SOCIAL_VIDEOS = [
  {
    id: 'v1',
    platform: 'youtube',
    type: 'video',
    title: 'Ashwagandha KSM-66: The Science Behind Stress Relief',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1',
    thumbnail: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=80',
    views: '2.4M views',
    duration: '8:24',
    channel: 'Dr MediScie Official',
    isActive: true,
  },
  {
    id: 'v2',
    platform: 'youtube',
    type: 'short',
    title: '7 Signs Your Hair Is Crying For Bhringraj Oil',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1',
    thumbnail: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80',
    views: '890K views',
    duration: '0:45',
    channel: 'Dr MediScie Shorts',
    isActive: true,
  },
  {
    id: 'v3',
    platform: 'instagram',
    type: 'reel',
    title: 'Kumkumadi Morning Ritual — 30 Days Transformation ✨',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1',
    thumbnail: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80',
    views: '1.2M views',
    duration: '0:30',
    channel: '@drmediscie',
    isActive: true,
  },
  {
    id: 'v4',
    platform: 'instagram',
    type: 'reel',
    title: 'Shilajit Gold — The Real vs Fake Test You Need to See',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1',
    thumbnail: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80',
    views: '680K views',
    duration: '0:32',
    channel: '@drmediscie',
    isActive: true,
  },
  {
    id: 'v5',
    platform: 'facebook',
    type: 'video',
    title: 'LIVE: Ask Our Ayurvedic Expert — Immunity Masterclass',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1',
    thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80',
    views: '45K views',
    duration: '1:12:30',
    channel: 'Dr MediScie',
    isActive: true,
  },
  {
    id: 'v6',
    platform: 'youtube',
    type: 'video',
    title: 'Triphala: Ancient Detox for Modern Life | Full Guide',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&loop=1',
    thumbnail: 'https://images.unsplash.com/photo-1631390614266-57b9258e7d9a?w=600&q=80',
    views: '1.8M views',
    duration: '12:15',
    channel: 'Dr MediScie Official',
    isActive: true,
  },
];

export const MOCK_BANNERS = [
  { id: 'b1', title: 'Science Meets Ayurveda', subtitle: 'Clinically validated wellness products rooted in 5000 years of traditional wisdom', image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1400&q=85', link: '/products', isActive: true },
  { id: 'b2', title: 'Monsoon Wellness Sale — Up to 40% Off', subtitle: 'Boost immunity this season with our bestselling Ayurvedic supplements', image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1400&q=85', link: '/products?featured=true', isActive: true },
  { id: 'b3', title: 'The Kumkumadi Collection', subtitle: 'Ancient Kumkumadi formulations for transformative skin radiance', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1400&q=85', link: '/products?category=Skincare', isActive: true },
];

export const MOCK_BLOG_POSTS = [
  { id: 'bp1', title: '7 Ayurvedic Morning Rituals for Radiant Skin', slug: '7-ayurvedic-morning-rituals', excerpt: 'Start your day with these time-tested Ayurvedic practices for glowing, healthy skin that lasts all day.', featuredImage: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80', tags: ['Skincare', 'Routine'], isPublished: true, createdAt: '2026-04-15' },
  { id: 'bp2', title: 'Understanding Adaptogens: Ashwagandha vs Shilajit', slug: 'adaptogens-ashwagandha-vs-shilajit', excerpt: 'A comprehensive guide to two of India\'s most powerful adaptogens and how to choose the right one for you.', featuredImage: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80', tags: ['Wellness', 'Science'], isPublished: true, createdAt: '2026-04-08' },
  { id: 'bp3', title: 'The Science Behind Kumkumadi: Why It Works', slug: 'science-behind-kumkumadi', excerpt: 'Modern clinical research validates what Ayurvedic texts have known for centuries about this liquid gold.', featuredImage: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80', tags: ['Science', 'Skincare'], isPublished: true, createdAt: '2026-04-01' },
];

// Admin Dashboard Mock Stats
export const MOCK_ADMIN_STATS = {
  totalRevenue: 4872650,
  revenueGrowth: 18.4,
  ordersToday: 47,
  ordersGrowth: 12.3,
  pendingOrders: 23,
  totalCustomers: 8924,
  newCustomers: 142,
  totalProducts: 186,
  lowStock: 14,
  outOfStock: 6,
  totalVendors: 28,
  pendingApprovals: 5,
  b2bOrders: 89,
  b2bRevenue: 1234500,
  vendorPayoutsPending: 84500,
  topProducts: [
    { name: 'Ashwagandha KSM-66 Capsules', sales: 892, revenue: 1069308, growth: 24 },
    { name: 'Kumkumadi Radiance Serum', sales: 721, revenue: 720279, growth: 18 },
    { name: 'Shilajit Gold Resin', sales: 456, revenue: 911544, growth: 31 },
    { name: 'Bhringraj Hair Growth Oil', sales: 634, revenue: 379766, growth: 9 },
    { name: 'Chyawanprash Premium Blend', sales: 512, revenue: 383488, growth: 15 },
  ],
  recentOrders: [
    { id: 'ord1', userName: 'Priya Sharma', totalAmount: 2998, orderStatus: 'delivered', createdAt: '2026-05-02' },
    { id: 'ord2', userName: 'Rohit Patel', totalAmount: 1199, orderStatus: 'shipped', createdAt: '2026-05-02' },
    { id: 'ord3', userName: 'Ananya Gupta', totalAmount: 5499, orderStatus: 'confirmed', createdAt: '2026-05-01' },
    { id: 'ord4', userName: 'Vikram Singh', totalAmount: 899, orderStatus: 'placed', createdAt: '2026-05-01' },
    { id: 'ord5', userName: 'Meera Iyer', totalAmount: 3297, orderStatus: 'delivered', createdAt: '2026-04-30' },
  ],
  ordersByStatus: [
    { _id: 'delivered', count: 312 },
    { _id: 'shipped', count: 89 },
    { _id: 'confirmed', count: 67 },
    { _id: 'placed', count: 45 },
    { _id: 'cancelled', count: 23 },
  ],
  categoryRevenue: [
    { name: 'Wellness', value: 1876400 },
    { name: 'Skincare', value: 1432800 },
    { name: 'Hair Care', value: 678900 },
    { name: 'Body Care', value: 452300 },
    { name: 'Aromatherapy', value: 231250 },
  ],
  userGrowth: [
    { month: 'Nov', customers: 5200, b2b: 142, vendors: 18 },
    { month: 'Dec', customers: 5890, b2b: 168, vendors: 21 },
    { month: 'Jan', customers: 6340, b2b: 194, vendors: 23 },
    { month: 'Feb', customers: 7020, b2b: 218, vendors: 25 },
    { month: 'Mar', customers: 7780, b2b: 247, vendors: 26 },
    { month: 'Apr', customers: 8924, b2b: 289, vendors: 28 },
  ],
};

export const MOCK_REVENUE_DATA = [
  { _id: '2026-04-26', revenue: 48200, orders: 31 },
  { _id: '2026-04-27', revenue: 62400, orders: 42 },
  { _id: '2026-04-28', revenue: 38900, orders: 27 },
  { _id: '2026-04-29', revenue: 71800, orders: 49 },
  { _id: '2026-04-30', revenue: 89200, orders: 61 },
  { _id: '2026-05-01', revenue: 103400, orders: 72 },
  { _id: '2026-05-02', revenue: 94600, orders: 47 },
];

export const MOCK_MONTHLY_REVENUE = [
  { _id: '2025-11', revenue: 312400, orders: 218, growth: 0 },
  { _id: '2025-12', revenue: 489200, orders: 341, growth: 56.6 },
  { _id: '2026-01', revenue: 521800, orders: 364, growth: 6.7 },
  { _id: '2026-02', revenue: 634700, orders: 443, growth: 21.6 },
  { _id: '2026-03', revenue: 748900, orders: 523, growth: 18.0 },
  { _id: '2026-04', revenue: 872650, orders: 609, growth: 16.5 },
];

// Vendor Mock Data
export const MOCK_VENDOR_STATS = {
  products: { total: 24, active: 19, pending_approval: 3, rejected: 2 },
  orders: { total: 284, pending: 12, completed: 198 },
  revenue: { total: 384200, this_month: 62400, pending_payout: 18600 },
  ratings: { average: 4.6, count: 892 },
  recentOrders: [
    { id: 'vo1', customer: 'Priya S.', product: 'Kumkumadi Serum', qty: 2, amount: 1998, status: 'delivered', date: '2026-05-02' },
    { id: 'vo2', customer: 'Amit K.', product: 'Bhringraj Oil', qty: 1, amount: 599, status: 'shipped', date: '2026-05-01' },
    { id: 'vo3', customer: 'Sneha R.', product: 'Chyawanprash', qty: 3, amount: 2247, status: 'confirmed', date: '2026-05-01' },
    { id: 'vo4', customer: 'Raj M.', product: 'Moringa Powder', qty: 2, amount: 998, status: 'placed', date: '2026-04-30' },
  ],
  monthlyRevenue: [
    { month: 'Nov', revenue: 28400 },
    { month: 'Dec', revenue: 44200 },
    { month: 'Jan', revenue: 38900 },
    { month: 'Feb', revenue: 52400 },
    { month: 'Mar', revenue: 61800 },
    { month: 'Apr', revenue: 62400 },
  ],
  topProducts: [
    { name: 'Kumkumadi Radiance Serum', units: 142, revenue: 141858, rating: 4.8 },
    { name: 'Bhringraj Hair Growth Oil', units: 118, revenue: 70682, rating: 4.7 },
    { name: 'Chyawanprash Premium', units: 89, revenue: 66611, rating: 4.7 },
    { name: 'Moringa Superfood Powder', units: 96, revenue: 47904, rating: 4.6 },
  ],
};

// B2B Mock Data
export const MOCK_B2B_STATS = {
  company: { name: 'HealthBridge Distributors Pvt. Ltd.', gst: '29AABCH1234K1Z5', credit_limit: 500000, credit_used: 124500, credit_available: 375500, tier: 'Gold' },
  orders: { total: 48, this_month: 8, pending_approval: 2, total_value: 2847600 },
  rfq: { active: 3, total: 12 },
  savings: { total: 487200, percentage: 17.1 },
  recentOrders: [
    { id: 'b2b1', products: 'Ashwagandha (×100), Triphala (×50)', amount: 89400, status: 'DELIVERED', date: '2026-04-28', invoice: 'INV-2026-0428' },
    { id: 'b2b2', products: 'Kumkumadi Serum (×24), Hair Oil (×36)', amount: 46800, status: 'SHIPPED', date: '2026-05-01', invoice: 'INV-2026-0501' },
    { id: 'b2b3', products: 'Moringa Powder (×200)', amount: 72000, status: 'CONFIRMED', date: '2026-05-02', invoice: null },
  ],
  rfqList: [
    { id: 'rfq1', product: 'Shilajit Gold Resin ×50', requestedPrice: 1600, currentPrice: 1999, status: 'negotiating', expires: '2026-05-10' },
    { id: 'rfq2', product: 'Chyawanprash ×200', requestedPrice: 580, currentPrice: 749, status: 'approved', expires: '2026-05-15' },
    { id: 'rfq3', product: 'Ashwagandha Capsules ×500', requestedPrice: 900, currentPrice: 1199, status: 'pending', expires: '2026-05-08' },
  ],
  tierPricing: [
    { product: 'Ashwagandha KSM-66 Capsules', retail: 1199, tier1: '50+: ₹999', tier2: '100+: ₹879', tier3: '500+: ₹749', moq: 12 },
    { product: 'Kumkumadi Radiance Serum', retail: 999, tier1: '24+: ₹849', tier2: '48+: ₹749', tier3: '100+: ₹649', moq: 6 },
    { product: 'Shilajit Gold Resin', retail: 1999, tier1: '12+: ₹1699', tier2: '24+: ₹1499', tier3: '50+: ₹1299', moq: 6 },
  ],
};

export const MOCK_ORDERS = [
  { id: 'ORD-001', userName: 'Priya Sharma', email: 'priya@gmail.com', totalAmount: 2998, orderStatus: 'delivered', paymentStatus: 'paid', createdAt: '2026-05-01T10:30:00Z', items: [{ name: 'Kumkumadi Serum', qty: 2, price: 999 }, { name: 'Triphala Capsules', qty: 1, price: 549 }] },
  { id: 'ORD-002', userName: 'Rohit Patel', email: 'rohit@gmail.com', totalAmount: 1199, orderStatus: 'shipped', paymentStatus: 'paid', createdAt: '2026-05-02T08:15:00Z', items: [{ name: 'Ashwagandha KSM-66', qty: 1, price: 1199 }] },
  { id: 'ORD-003', userName: 'Ananya Gupta', email: 'ananya@gmail.com', totalAmount: 5499, orderStatus: 'confirmed', paymentStatus: 'paid', createdAt: '2026-05-01T14:22:00Z', items: [{ name: 'Shilajit Gold Resin', qty: 2, price: 1999 }, { name: 'Brahmi Tablets', qty: 2, price: 649 }] },
  { id: 'ORD-004', userName: 'Vikram Singh', email: 'vikram@gmail.com', totalAmount: 899, orderStatus: 'placed', paymentStatus: 'paid', createdAt: '2026-05-01T16:44:00Z', items: [{ name: 'Chyawanprash', qty: 1, price: 749 }] },
  { id: 'ORD-005', userName: 'Meera Iyer', email: 'meera@gmail.com', totalAmount: 3297, orderStatus: 'cancelled', paymentStatus: 'refunded', createdAt: '2026-04-30T11:00:00Z', items: [{ name: 'Saffron Vitamin C Cream', qty: 3, price: 899 }] },
  { id: 'ORD-006', userName: 'HealthBridge Distributors', email: 'buy@healthbridge.in', totalAmount: 89400, orderStatus: 'delivered', paymentStatus: 'paid', createdAt: '2026-04-28T09:00:00Z', isB2B: true, items: [{ name: 'Ashwagandha (B2B)', qty: 100, price: 749 }] },
];

export const MOCK_CUSTOMERS = [
  { id: 'u1', name: 'Priya Sharma', email: 'priya@gmail.com', role: 'B2C_CUSTOMER', orders: 8, totalSpent: 14296, createdAt: '2026-01-15', city: 'Mumbai' },
  { id: 'u2', name: 'Rohit Patel', email: 'rohit@gmail.com', role: 'B2C_CUSTOMER', orders: 3, totalSpent: 3597, createdAt: '2026-02-20', city: 'Ahmedabad' },
  { id: 'u3', name: 'Ananya Gupta', email: 'ananya@gmail.com', role: 'B2C_CUSTOMER', orders: 12, totalSpent: 22400, createdAt: '2025-11-08', city: 'Bengaluru' },
  { id: 'u4', name: 'HealthBridge Distributors', email: 'buy@healthbridge.in', role: 'B2B_BUYER', orders: 48, totalSpent: 2847600, createdAt: '2025-09-01', city: 'Delhi', company: 'HealthBridge Distributors Pvt. Ltd.' },
  { id: 'u5', name: 'WellnessFirst Pharma', email: 'procurement@wellnessfirst.com', role: 'B2B_BUYER', orders: 24, totalSpent: 1234500, createdAt: '2025-10-15', city: 'Hyderabad', company: 'WellnessFirst Pharmaceuticals' },
  { id: 'u6', name: 'Ayur Naturals (Vendor)', email: 'info@ayurnaturals.com', role: 'VENDOR', orders: 0, totalSpent: 0, createdAt: '2025-08-20', city: 'Pune', storeName: 'Ayur Naturals' },
];

export const MOCK_VENDORS = [
  { id: 'v1', name: 'Ayur Naturals', email: 'info@ayurnaturals.com', products: 18, revenue: 284600, rating: 4.7, status: 'approved', joinedAt: '2025-08-20', commission: 12 },
  { id: 'v2', name: 'Himalaya Herbs Co.', email: 'ops@himalayaherbs.com', products: 24, revenue: 412800, rating: 4.8, status: 'approved', joinedAt: '2025-07-15', commission: 10 },
  { id: 'v3', name: 'Pure Roots Organics', email: 'contact@pureroots.in', products: 9, revenue: 128400, rating: 4.5, status: 'approved', joinedAt: '2025-09-10', commission: 14 },
  { id: 'v4', name: 'Veda Botanicals', email: 'sales@vedabotanicals.com', products: 0, revenue: 0, rating: 0, status: 'pending', joinedAt: '2026-04-28', commission: 12 },
  { id: 'v5', name: 'Sattva Extracts', email: 'hello@sattvaextracts.com', products: 0, revenue: 0, rating: 0, status: 'pending', joinedAt: '2026-05-01', commission: 12 },
];
