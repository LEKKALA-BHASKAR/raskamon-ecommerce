import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, Leaf, Shield, Star, ShoppingBag, Building2, Store, CheckCircle2, TrendingUp, Package, Users, ExternalLink, Zap, Clock, ShieldCheck, Truck } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/layout/Layout';
import ProductCard from '../components/product/ProductCard';
import { MOCK_BANNERS, MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_BLOG_POSTS, MOCK_SOCIAL_VIDEOS } from '../utils/mockData';
import { useSiteContent, getProductsByIds } from '../utils/siteContent';

// Split Hero Banner
const HERO_SLIDES = [
  {
    id: 1,
    badge: 'Clinically Backed Ayurveda',
    title: 'Ancient Wisdom,\nModern Science',
    subtitle: 'Premium Ayurvedic supplements crafted for modern wellness. Trusted by 50,000+ customers across India.',
    primaryCta: { label: 'Shop Now', to: '/products' },
    secondaryCta: { label: 'Explore Products', to: '/products' },
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&q=80',
    accent: '#A3E635',
  },
  {
    id: 2,
    badge: "Men's Wellness Range",
    title: "Unlock Your\nPeak Performance",
    subtitle: 'KSM-66 Ashwagandha, Shilajit Gold & more — scientifically formulated for men who demand the best.',
    primaryCta: { label: "Shop Men's Health", to: "/products?category=Men's Health" },
    secondaryCta: { label: 'See Results', to: '/blog' },
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=700&q=80',
    accent: '#60A5FA',
  },
  {
    id: 3,
    badge: "Women's Wellness Range",
    title: 'Glow From\nThe Inside Out',
    subtitle: "Shatavari, Kumkumadi & holistic women's wellness blends. Balance hormones, boost glow, feel your best.",
    primaryCta: { label: "Shop Women's Health", to: "/products?category=Women's Health" },
    secondaryCta: { label: 'Learn More', to: '/blog' },
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=700&q=80',
    accent: '#F472B6',
  },
];

const TRUST_BADGES = [
  { icon: Truck, label: 'Free Shipping', sub: 'Above ₹499' },
  { icon: ShieldCheck, label: 'Secure Payment', sub: '100% Safe' },
  { icon: Leaf, label: 'Natural & Organic', sub: 'No Chemicals' },
  { icon: Star, label: '4.9★ Rated', sub: '50K+ Reviews' },
];

const HeroBanner = ({ slides: slidesProp }) => {
  const slides = (slidesProp && slidesProp.length ? slidesProp : HERO_SLIDES).filter(s => s.isActive !== false);
  const [current, setCurrent] = useState(0);
  const slide = slides[current % slides.length] || slides[0];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (!slide) return null;
  // Normalize CTA fields (admin uses primaryCtaLabel/Link, defaults use primaryCta object)
  const primaryCta = slide.primaryCta || { label: slide.primaryCtaLabel, to: slide.primaryCtaLink };
  const secondaryCta = slide.secondaryCta || { label: slide.secondaryCtaLabel, to: slide.secondaryCtaLink };

  return (
    <div data-testid="home-hero" className="relative overflow-hidden bg-gradient-to-br from-[#0f2620] via-[#1A3C34] to-[#0f2620]">
      <div className="container-sattva py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center min-h-[420px]">

          {/* Left — Text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.5 }}
            >
              <motion.span
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
                style={{ background: `${slide.accent}22`, color: slide.accent, border: `1px solid ${slide.accent}44` }}
              >
                <Sparkles size={11} /> {slide.badge}
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-5"
                style={{ whiteSpace: 'pre-line' }}
              >
                {slide.title}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="text-[rgba(255,255,255,0.7)] text-base leading-relaxed mb-8 max-w-lg"
              >
                {slide.subtitle}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-3 mb-10"
              >
                <Link to={primaryCta.to} data-testid="home-hero-primary-cta">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-7 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg transition-all"
                    style={{ background: slide.accent, color: '#1A3C34' }}
                  >
                    {primaryCta.label} <ArrowRight size={16} />
                  </motion.button>
                </Link>
                <Link to={secondaryCta.to}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="px-7 py-3.5 rounded-xl font-semibold text-sm border border-white/30 text-white hover:bg-white/10 transition-all"
                  >
                    {secondaryCta.label}
                  </motion.button>
                </Link>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-4"
              >
                {TRUST_BADGES.map(({ icon: Icon, label, sub }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-[var(--sattva-gold)]" />
                    </div>
                    <div>
                      <p className="text-white text-[11px] font-bold leading-none">{label}</p>
                      <p className="text-white/50 text-[10px] leading-none mt-0.5">{sub}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Right — Image Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`img-${slide.id}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="relative hidden lg:block"
            >
              {/* Glow ring */}
              <div className="absolute inset-0 rounded-3xl opacity-30 blur-2xl" style={{ background: slide.accent }} />
              <div className="relative rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl" style={{ aspectRatio: '4/5', maxHeight: '480px' }}>
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                {/* Floating badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute bottom-5 left-5 right-5 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-[11px] uppercase tracking-wider mb-0.5">Most Loved Product</p>
                      <p className="text-white font-bold text-sm">Ashwagandha KSM-66</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-0.5 justify-end mb-0.5">
                        {[...Array(5)].map((_, i) => <Star key={i} size={10} className="text-[var(--sattva-gold)] fill-current" />)}
                      </div>
                      <p className="text-white/70 text-[11px]">892 reviews</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Slide controls */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-8 h-2.5 bg-[var(--sattva-gold)]' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'}`}
          />
        ))}
      </div>

      {/* Prev / Next */}
      <button
        data-testid="home-hero-prev"
        onClick={() => setCurrent(c => (c - 1 + slides.length) % slides.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        data-testid="home-hero-next"
        onClick={() => setCurrent(c => (c + 1) % slides.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

// Features Strip
const FeaturesStrip = () => (
  <div className="bg-[var(--sattva-forest)] text-[var(--sattva-cream)]">
    <div className="container-sattva py-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Leaf, text: '100% Natural Ingredients' },
          { icon: Shield, text: 'Dermatologist Tested' },
          { icon: Sparkles, text: 'Cruelty-Free & Vegan' },
          { icon: Star, text: '50,000+ Happy Customers' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 justify-center">
            <Icon size={14} className="text-[var(--sattva-gold)] flex-shrink-0" />
            <span className="text-xs font-medium">{text}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Category Grid
const CategoryGrid = ({ categories }) => {
  const navigate = useNavigate();
  if (!categories.length) return null;
  return (
    <section className="section-padding bg-sattva-paper">
      <div className="container-sattva">
        <div className="text-center mb-10">
          <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-2">Shop by Health Goal</p>
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-[var(--sattva-ink)]">What Are You Looking For?</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.slice(0, 5).map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              onClick={() => navigate(`/products?category=${encodeURIComponent(cat.name)}`)}
              className="group cursor-pointer"
            >
              <div className="relative rounded-2xl overflow-hidden bg-[var(--sattva-muted)] mb-3" style={{ aspectRatio: '1/1' }}>
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                {/* Icon + Count */}
                <div className="absolute top-3 left-3">
                  <span className="text-xl">{cat.icon}</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white font-heading font-bold text-sm leading-tight">{cat.name}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">{cat.productCount}+ products</p>
                </div>
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/40 rounded-2xl transition-all duration-300" />
              </div>
            </motion.div>
          ))}
        </div>
        {/* Quick category links bar */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {categories.map(cat => (
            <Link
              key={cat.id}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border border-[color:var(--sattva-border)] text-[var(--sattva-ink)] hover:bg-[var(--sattva-forest)] hover:text-white hover:border-[var(--sattva-forest)] transition-all duration-200"
            >
              <span>{cat.icon}</span> {cat.name}
            </Link>
          ))}
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-[var(--sattva-forest)] text-white border border-[var(--sattva-forest)] hover:opacity-90 transition-all"
          >
            View All Products <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
};

// Product Section
const ProductSection = ({ title, subtitle, products, link }) => {
  if (!products.length) return null;
  return (
    <section className="section-padding">
      <div className="container-sattva">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-1">{subtitle}</p>
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-[var(--sattva-ink)]">{title}</h2>
          </div>
          <Link to={link} className="text-[var(--sattva-forest)] text-sm font-medium hover:text-[var(--sattva-gold)] transition-colors flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

// Testimonials
const Testimonials = ({ items = [] }) => {
  const testimonials = items.filter(t => t.isActive !== false);
  if (!testimonials.length) return null;
  return (
  <section className="section-padding bg-[var(--sattva-forest)]">
    <div className="container-sattva">
      <div className="text-center mb-10">
        <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-2">Testimonials</p>
        <h2 className="font-heading text-2xl md:text-3xl font-semibold text-[var(--sattva-cream)]">What Our Customers Say</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-[rgba(250,248,245,0.08)] border border-[rgba(200,169,110,0.2)] rounded-2xl p-6"
          >
            <div className="flex items-center gap-0.5 mb-4">
              {[...Array(t.rating)].map((_, j) => (
                <Star key={j} size={14} className="text-[var(--sattva-gold)] fill-current" />
              ))}
            </div>
            <p className="text-[rgba(250,248,245,0.85)] text-sm leading-relaxed mb-4">"{t.text}"</p>
            <div>
              <p className="font-semibold text-[var(--sattva-cream)] text-sm">{t.name}</p>
              <p className="text-[rgba(250,248,245,0.5)] text-xs">{t.city}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
  );
};

// Blog Preview
const BlogPreview = ({ posts }) => {
  if (!posts.length) return null;
  return (
    <section className="section-padding bg-sattva-paper">
      <div className="container-sattva">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-1">Wisdom & Rituals</p>
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-[var(--sattva-ink)]">From the Journal</h2>
          </div>
          <Link to="/blog" className="text-[var(--sattva-forest)] text-sm font-medium hover:text-[var(--sattva-gold)] transition-colors flex items-center gap-1">
            All Articles <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.slice(0, 3).map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={`/blog/${post.slug}`} className="group block">
                <div className="aspect-video rounded-xl overflow-hidden bg-[var(--sattva-muted)] mb-4">
                  <img
                    src={post.featuredImage || 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80'}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex gap-2 mb-2">
                  {post.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-[var(--sattva-muted)] text-[var(--sattva-forest)]">{tag}</span>
                  ))}
                </div>
                <h3 className="font-heading text-base font-semibold text-[var(--sattva-ink)] group-hover:text-[var(--sattva-forest)] transition-colors line-clamp-2">{post.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===== Social Media Videos Section =====
const PLATFORM_CONFIG = {
  youtube: { label: 'YouTube', color: '#FF0000', bg: '#FFF0F0', icon: '▶', textColor: '#CC0000' },
  instagram: { label: 'Instagram', color: '#E1306C', bg: '#FFF0F5', icon: '📸', textColor: '#E1306C' },
  facebook: { label: 'Facebook', color: '#1877F2', bg: '#F0F5FF', icon: '📘', textColor: '#1877F2' },
};

const VideoCard = ({ video }) => {
  const platform = PLATFORM_CONFIG[video.platform] || PLATFORM_CONFIG.youtube;
  const isShort = video.type === 'reel' || video.type === 'short';

  // Build autoplay embed URL
  const autoplayUrl = (() => {
    const url = video.embedUrl || '';
    if (url.includes('youtube.com/embed/')) {
      const videoId = url.split('/embed/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0`;
    }
    // Instagram / Facebook: append autoplay if not already there
    if (url.includes('?')) return url.includes('autoplay') ? url : `${url}&autoplay=1&muted=1`;
    return `${url}?autoplay=1&muted=1`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`group rounded-2xl overflow-hidden bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] hover:shadow-xl transition-all duration-300 ${isShort ? 'row-span-2' : ''}`}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: isShort ? '9/16' : '16/9' }}>
        <iframe
          src={autoplayUrl}
          className="w-full h-full"
          frameBorder="0"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          title={video.title}
          loading="lazy"
        />
        {/* Type badge overlay (pointer-events-none so iframe stays clickable) */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: platform.color, color: 'white' }}>
            {video.type === 'reel' ? '🎬 REEL' : video.type === 'short' ? '⚡ SHORT' : '▶ VIDEO'}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: platform.bg, color: platform.textColor }}>
            {platform.label}
          </span>
          <span className="text-xs text-gray-400">{video.views}</span>
        </div>
        <h4 className="font-semibold text-[var(--sattva-ink)] text-sm leading-snug line-clamp-2 group-hover:text-[var(--sattva-forest)] transition-colors">{video.title}</h4>
        <p className="text-xs text-gray-400 mt-1">{video.channel}</p>
      </div>
    </motion.div>
  );
};

const SocialVideosSection = ({ videos }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const filtered = activeFilter === 'all' ? videos : videos.filter(v => v.platform === activeFilter);

  return (
    <section className="section-padding bg-[var(--sattva-ink)]">
      <div className="container-sattva">
        <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
          <div>
            <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-2">Watch & Learn</p>
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-white">Follow Us on Social Media</h2>
            <p className="text-[rgba(255,255,255,0.5)] text-sm mt-2">Expert wellness tips, product demos, and Ayurvedic wisdom</p>
          </div>
          {/* Social links */}
          <div className="flex gap-3">
            <a href="https://youtube.com/@drmediscie" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all" style={{ background: '#FF0000', color: 'white' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
              YouTube
            </a>
            <a href="https://instagram.com/drmediscie" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: 'white' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              Instagram
            </a>
            <a href="https://facebook.com/drmediscie" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: '#1877F2', color: 'white' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </a>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-8">
          {[
            { key: 'all', label: 'All Videos' },
            { key: 'youtube', label: '▶ YouTube' },
            { key: 'instagram', label: '📸 Reels' },
            { key: 'facebook', label: '📘 Facebook' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeFilter === f.key
                  ? 'bg-[var(--sattva-gold)] text-[var(--sattva-ink)]'
                  : 'text-[rgba(255,255,255,0.6)] hover:text-white border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.4)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((video, i) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>

        {/* Follow CTA */}
        <div className="mt-10 text-center">
          <p className="text-[rgba(255,255,255,0.5)] text-sm mb-4">Subscribe for weekly Ayurvedic wellness content</p>
          <div className="flex justify-center gap-3 flex-wrap">
            <a href="https://youtube.com/@drmediscie" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors">
              <ExternalLink size={14} /> Subscribe on YouTube
            </a>
            <a href="https://instagram.com/drmediscie" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-colors">
              <ExternalLink size={14} /> Follow on Instagram
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

// ===== Flash Sale Countdown =====
const useCountdown = (endTime) => {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, endTime - Date.now());
      setTimeLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endTime]);
  return timeLeft;
};

const FlashSaleSection = ({ products, config = {} }) => {
  const fallbackEnd = useRef(Date.now() + 8 * 3600000 + 23 * 60000 + 47000).current;
  const endTime = config.endsAt || fallbackEnd;
  const { h, m, s } = useCountdown(endTime);
  if (config.enabled === false || !products?.length) return null;
  const saleProducts = products.slice(0, 4).map(p => ({
    ...p,
    saleDiscount: Math.round(((p.mrp - p.discountPrice) / p.mrp) * 100),
  }));
  const title = config.title || "Today's Best Deals";
  const subtitle = config.subtitle || "Grab these offers before they're gone — massive savings on top sellers";

  const pad = n => String(n).padStart(2, '0');

  return (
    <section style={{ background: 'linear-gradient(135deg, #1A3C34 0%, #0f2620 50%, #1A3C34 100%)' }} className="section-padding relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #A3E635, transparent)', transform: 'translate(-30%, -30%)' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #C8A96E, transparent)', transform: 'translate(30%, 30%)' }} />

      <div className="container-sattva relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-500/20 border border-red-400/40 rounded-full text-red-400 text-xs font-bold uppercase tracking-widest mb-3">
              <Zap size={12} className="fill-current" /> Flash Sale — Limited Time
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">{title}</h2>
            <p className="text-white/50 text-sm mt-1.5">{subtitle}</p>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 text-white/60 text-xs font-semibold">
              <Clock size={13} /> Ends in:
            </div>
            <div className="flex gap-2">
              {[{ label: 'HRS', val: pad(h) }, { label: 'MIN', val: pad(m) }, { label: 'SEC', val: pad(s) }].map(({ label, val }, i) => (
                <React.Fragment key={label}>
                  {i > 0 && <span className="text-white/40 text-2xl font-black self-center leading-none">:</span>}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl flex items-center justify-center">
                      <motion.span
                        key={val}
                        initial={{ y: -8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="font-heading text-2xl font-black text-white tabular-nums"
                      >
                        {val}
                      </motion.span>
                    </div>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mt-1">{label}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {saleProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-white/25 transition-all duration-300"
            >
              {/* Discount badge */}
              <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-red-500 text-white text-xs font-black rounded-full shadow-lg">
                -{product.saleDiscount}%
              </div>

              <div className="relative overflow-hidden" style={{ aspectRatio: '1/1' }}>
                <img
                  src={product.images?.[0]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>

              <div className="p-4">
                <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">{product.category}</p>
                <h4 className="font-semibold text-white text-sm leading-snug line-clamp-2 mb-3">{product.name}</h4>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-black text-[var(--sattva-gold)] text-lg">₹{product.discountPrice?.toLocaleString('en-IN')}</span>
                  <span className="text-white/40 text-xs line-through">₹{product.mrp?.toLocaleString('en-IN')}</span>
                </div>
                {/* Stock urgency */}
                {product.stock < 50 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/50">Only {product.stock} left</span>
                      <span className="text-[10px] text-orange-400 font-bold">Selling fast!</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
                        style={{ width: `${Math.max(20, 100 - (product.stock / 100) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                <Link to={`/products/${product.slug}`}>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    style={{ background: '#A3E635', color: '#1A3C34' }}
                  >
                    Add to Cart
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View all */}
        <div className="mt-8 text-center">
          <Link to="/products">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm border border-white/30 text-white hover:bg-white/10 transition-all"
            >
              View All Sale Products <ArrowRight size={15} />
            </motion.button>
          </Link>
        </div>
      </div>
    </section>
  );
};

// ===== Portal Cards Section =====
const PortalSection = () => (
  <section className="section-padding bg-gradient-to-b from-[#F7F5F0] to-white">
    <div className="container-sattva">
      <div className="text-center mb-12">
        <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-2">One Platform, Three Experiences</p>
        <h2 className="font-heading text-3xl md:text-4xl font-semibold text-[var(--sattva-ink)]">Who Are You Shopping For?</h2>
        <p className="text-gray-500 text-sm mt-3 max-w-xl mx-auto">Dr MediScie serves retail customers, B2B buyers and marketplace vendors — each with a tailored experience designed for you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Retail Customer Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0 }}
          className="relative group rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #1A3C34, #0f2620)' }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #A3E635, transparent)', transform: 'translate(20%, -20%)' }} />
          <div className="p-8">
            <div className="w-14 h-14 rounded-2xl bg-[#A3E635]/20 flex items-center justify-center mb-5">
              <ShoppingBag size={26} className="text-[#A3E635]" />
            </div>
            <div className="inline-block px-3 py-1 bg-[#A3E635]/15 border border-[#A3E635]/30 rounded-full text-[#A3E635] text-[10px] font-bold uppercase tracking-wide mb-4">Retail</div>
            <h3 className="font-heading text-2xl font-bold text-white mb-2">Retail Customer</h3>
            <p className="text-[rgba(255,255,255,0.65)] text-sm leading-relaxed mb-6">Shop 180+ premium Ayurvedic wellness products. Exclusive deals, express delivery, and loyalty rewards.</p>
            <ul className="space-y-2 mb-8">
              {['100% authentic Ayurvedic formulations', 'Free delivery above ₹499', 'Loyalty points on every order', 'Exclusive member discounts'].map(f => (
                <li key={f} className="flex items-center gap-2 text-[rgba(255,255,255,0.75)] text-sm">
                  <CheckCircle2 size={14} className="text-[#A3E635] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link to="/products">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: '#A3E635', color: '#1A3C34' }}
              >
                Shop Wellness Products <ArrowRight size={16} />
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Business Buyer Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.12 }}
          className="relative group rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #1E3A5F, #0c1e35)' }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #60A5FA, transparent)', transform: 'translate(20%, -20%)' }} />
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #3B82F6, #6366F1)' }} />
          <div className="p-8">
            <div className="flex items-start justify-between mb-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Building2 size={26} className="text-blue-400" />
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ background: 'linear-gradient(90deg, #3B82F6, #6366F1)', color: 'white' }}>Most Popular</span>
            </div>
            <div className="inline-block px-3 py-1 bg-blue-500/15 border border-blue-400/30 rounded-full text-blue-300 text-[10px] font-bold uppercase tracking-wide mb-4">B2B</div>
            <h3 className="font-heading text-2xl font-bold text-white mb-2">Business Buyer</h3>
            <p className="text-[rgba(255,255,255,0.65)] text-sm leading-relaxed mb-6">Wholesale pricing, GST invoicing, credit terms up to Net-60, and dedicated account management.</p>
            <ul className="space-y-2 mb-8">
              {['Wholesale pricing — up to 40% off retail', 'GST invoices + Input Tax Credit', 'Credit terms: Net 15/30/60', 'RFQ & custom contract pricing', 'Bulk order management'].map(f => (
                <li key={f} className="flex items-center gap-2 text-[rgba(255,255,255,0.75)] text-sm">
                  <CheckCircle2 size={14} className="text-blue-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <Link to="/b2b/catalog" className="flex-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(90deg, #3B82F6, #6366F1)', color: 'white' }}
                >
                  B2B Catalog <ArrowRight size={15} />
                </motion.button>
              </Link>
              <Link to="/register/b2b">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="py-3.5 px-4 rounded-xl font-bold text-sm border border-blue-400/40 text-blue-300 hover:bg-blue-500/10 transition-colors"
                >
                  Register
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Vendor Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.24 }}
          className="relative group rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #451A03, #2d1002)' }}
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #F59E0B, transparent)', transform: 'translate(20%, -20%)' }} />
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #F59E0B, #EF4444)' }} />
          <div className="p-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-5">
              <Store size={26} className="text-amber-400" />
            </div>
            <div className="inline-block px-3 py-1 bg-amber-500/15 border border-amber-400/30 rounded-full text-amber-300 text-[10px] font-bold uppercase tracking-wide mb-4">Vendor</div>
            <h3 className="font-heading text-2xl font-bold text-white mb-2">Sell on Dr MediScie</h3>
            <p className="text-[rgba(255,255,255,0.65)] text-sm leading-relaxed mb-6">List your Ayurvedic products and reach 50,000+ wellness seekers. Competitive commissions, fast payouts.</p>
            <ul className="space-y-2 mb-8">
              {['Reach 50,000+ active buyers', 'Competitive 10–15% commission', 'Weekly payouts to your account', 'Full inventory & order management', 'Analytics & growth insights'].map(f => (
                <li key={f} className="flex items-center gap-2 text-[rgba(255,255,255,0.75)] text-sm">
                  <CheckCircle2 size={14} className="text-amber-400 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <Link to="/vendor/dashboard" className="flex-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(90deg, #F59E0B, #EF4444)', color: 'white' }}
                >
                  Vendor Portal <ArrowRight size={15} />
                </motion.button>
              </Link>
              <Link to="/register/vendor">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="py-3.5 px-4 rounded-xl font-bold text-sm border border-amber-400/40 text-amber-300 hover:bg-amber-500/10 transition-colors"
                >
                  Register
                </motion.button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stats Bar */}
      <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, value: '50,000+', label: 'Happy Customers', color: '#1A3C34' },
          { icon: Package, value: '180+', label: 'Ayurvedic Products', color: '#3B82F6' },
          { icon: Store, value: '28', label: 'Verified Vendors', color: '#F59E0B' },
          { icon: TrendingUp, value: '₹4.8Cr+', label: 'Revenue Processed', color: '#8B5CF6' },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-lg font-black text-[var(--sattva-ink)]">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// Main Home Page
const Home = () => {
  const content = useSiteContent();
  const [allProducts, setAllProducts] = useState(MOCK_PRODUCTS);
  const [categories, setCategories] = useState(MOCK_CATEGORIES);
  const [blogPosts, setBlogPosts] = useState(MOCK_BLOG_POSTS);
  const videos = (content.socialVideos && content.socialVideos.length) ? content.socialVideos : MOCK_SOCIAL_VIDEOS;

  useEffect(() => {
    (async () => {
      try {
        const [pRes, cRes, bpRes] = await Promise.all([
          api.get('/products?limit=100').catch(() => ({})),
          api.get('/categories').catch(() => ({})),
          api.get('/blog?limit=3').catch(() => ({})),
        ]);
        if (pRes.data?.length) setAllProducts(pRes.data);
        if (cRes.data?.length) setCategories(cRes.data);
        if (bpRes.data?.length) setBlogPosts(bpRes.data);
      } catch {}
    })();
  }, []);

  // Resolve admin-curated lists against current product catalog
  const featured = getProductsByIds(content.bestsellerIds, allProducts);
  const newArrivals = getProductsByIds(content.newArrivalIds, allProducts);
  const flashProducts = getProductsByIds(content.flashSale?.productIds || [], allProducts);

  return (
    <Layout>
      <HeroBanner slides={content.heroSlides} />
      <FeaturesStrip />
      <CategoryGrid categories={categories} />
      <ProductSection
        title="Bestsellers"
        subtitle="Most Loved"
        products={featured}
        link="/products?featured=true"
      />
      <FlashSaleSection products={flashProducts} config={content.flashSale} />
      <SocialVideosSection videos={videos} />
      <PortalSection />
      <Testimonials items={content.testimonials} />
      <ProductSection
        title="New Arrivals"
        subtitle="Fresh Rituals"
        products={newArrivals}
        link="/products?sort=newest"
      />
      <BlogPreview posts={blogPosts} />
    </Layout>
  );
};

export default Home;
