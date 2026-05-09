import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, ArrowRight, Sparkles, Leaf, Shield, Star,
  ShoppingBag, Building2, Store, CheckCircle2, TrendingUp, Package, Users,
  ExternalLink, Zap, Clock, ShieldCheck, Truck,
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/layout/Layout';
import ProductCard from '../components/product/ProductCard';
import { useSiteContent, getProductsByIds } from '../utils/siteContent';

// Icon registry — maps backend-driven icon strings to lucide components.
const ICON_MAP = {
  truck: Truck, 'shield-check': ShieldCheck, leaf: Leaf, star: Star,
  shield: Shield, sparkles: Sparkles, users: Users, package: Package,
  store: Store, 'trending-up': TrendingUp, 'shopping-bag': ShoppingBag,
  building: Building2,
};
const Icon = ({ name, size = 14, className = '', style }) => {
  const C = ICON_MAP[name];
  if (!C) return null;
  return <C size={size} className={className} style={style} />;
};

// ────────────────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────────────────
const HeroBanner = ({ slides: slidesProp = [], trustBadges = [] }) => {
  const slides = (slidesProp || []).filter(s => s.isActive !== false);
  const [current, setCurrent] = useState(0);
  const slide = slides.length ? slides[current % slides.length] : null;

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slide) return null;

  const primaryCta = slide.primaryCta || { label: slide.primaryCtaLabel, to: slide.primaryCtaLink };
  const secondaryCta = slide.secondaryCta || { label: slide.secondaryCtaLabel, to: slide.secondaryCtaLink };

  return (
    <div data-testid="home-hero" className="relative overflow-hidden bg-gradient-to-br from-[#0f2620] via-[#1A3C34] to-[#0f2620]">
      <div className="container-sattva py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center min-h-[420px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.5 }}
            >
              {slide.badge && (
                <motion.span
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-5"
                  style={{ background: `${slide.accent}22`, color: slide.accent, border: `1px solid ${slide.accent}44` }}
                >
                  <Sparkles size={11} /> {slide.badge}
                </motion.span>
              )}
              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-5"
                style={{ whiteSpace: 'pre-line' }}
              >
                {slide.title}
              </motion.h1>
              {slide.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                  className="text-[rgba(255,255,255,0.7)] text-base leading-relaxed mb-8 max-w-lg"
                >
                  {slide.subtitle}
                </motion.p>
              )}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-3 mb-10"
              >
                {primaryCta?.label && (
                  <Link to={primaryCta.to || '#'} data-testid="home-hero-primary-cta">
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="px-7 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg"
                      style={{ background: slide.accent, color: '#1A3C34' }}
                    >
                      {primaryCta.label} <ArrowRight size={16} />
                    </motion.button>
                  </Link>
                )}
                {secondaryCta?.label && (
                  <Link to={secondaryCta.to || '#'}>
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="px-7 py-3.5 rounded-xl font-semibold text-sm border border-white/30 text-white hover:bg-white/10"
                    >
                      {secondaryCta.label}
                    </motion.button>
                  </Link>
                )}
              </motion.div>

              {trustBadges.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="flex flex-wrap gap-4"
                >
                  {trustBadges.map((b, i) => (
                    <div key={b.label || i} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Icon name={b.icon} size={14} className="text-[var(--sattva-gold)]" />
                      </div>
                      <div>
                        <p className="text-white text-[11px] font-bold leading-none">{b.label}</p>
                        {b.sub && <p className="text-white/50 text-[10px] leading-none mt-0.5">{b.sub}</p>}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={`img-${slide.id}`}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="relative hidden lg:block"
            >
              <div className="absolute inset-0 rounded-3xl opacity-30 blur-2xl" style={{ background: slide.accent }} />
              <div className="relative rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl" style={{ aspectRatio: '4/5', maxHeight: '480px' }}>
                {slide.image && <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${i === current ? 'w-8 h-2.5 bg-[var(--sattva-gold)]' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'}`}
              />
            ))}
          </div>
          <button
            data-testid="home-hero-prev"
            onClick={() => setCurrent(c => (c - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/25"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            data-testid="home-hero-next"
            onClick={() => setCurrent(c => (c + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/25"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Features Strip
// ────────────────────────────────────────────────────────────────────────────
const FeaturesStrip = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <div className="bg-[var(--sattva-forest)] text-[var(--sattva-cream)]">
      <div className="container-sattva py-4">
        <div className={`grid grid-cols-2 md:grid-cols-${Math.min(items.length, 4)} gap-4`}>
          {items.map((f, i) => (
            <div key={i} className="flex items-center gap-2 justify-center">
              <Icon name={f.icon} size={14} className="text-[var(--sattva-gold)] flex-shrink-0" />
              <span className="text-xs font-medium">{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Categories
// ────────────────────────────────────────────────────────────────────────────
const CategoryGrid = ({ categories }) => {
  const navigate = useNavigate();
  if (!categories.length) return null;
  return (
    <section className="section-padding bg-sattva-paper">
      <div className="container-sattva">
        <div className="text-center mb-10">
          <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-2">Shop by Care Goal</p>
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-[var(--sattva-ink)]">What Are You Looking For?</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.slice(0, 5).map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              onClick={() => navigate(`/products?category=${encodeURIComponent(cat.name)}`)}
              className="group cursor-pointer"
            >
              <div className="relative rounded-2xl overflow-hidden bg-[var(--sattva-muted)] mb-3" style={{ aspectRatio: '1/1' }}>
                {cat.image && (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                {cat.icon && <div className="absolute top-3 left-3"><span className="text-xl">{cat.icon}</span></div>}
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white font-heading font-bold text-sm leading-tight">{cat.name}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {categories.map(cat => (
            <Link
              key={cat.id}
              to={`/products?category=${encodeURIComponent(cat.name)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border border-[color:var(--sattva-border)] text-[var(--sattva-ink)] hover:bg-[var(--sattva-forest)] hover:text-white hover:border-[var(--sattva-forest)] transition-all duration-200"
            >
              {cat.icon && <span>{cat.icon}</span>} {cat.name}
            </Link>
          ))}
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-[var(--sattva-forest)] text-white border border-[var(--sattva-forest)] hover:opacity-90"
          >
            View All Products <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Product section
// ────────────────────────────────────────────────────────────────────────────
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
          <Link to={link} className="text-[var(--sattva-forest)] text-sm font-medium hover:text-[var(--sattva-gold)] flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Testimonials
// ────────────────────────────────────────────────────────────────────────────
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
              key={t.id || i}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="bg-[rgba(250,248,245,0.08)] border border-[rgba(200,169,110,0.2)] rounded-2xl p-6"
            >
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(t.rating || 5)].map((_, j) => (
                  <Star key={j} size={14} className="text-[var(--sattva-gold)] fill-current" />
                ))}
              </div>
              <p className="text-[rgba(250,248,245,0.85)] text-sm leading-relaxed mb-4">"{t.text}"</p>
              <div>
                <p className="font-semibold text-[var(--sattva-cream)] text-sm">{t.name}</p>
                {t.city && <p className="text-[rgba(250,248,245,0.5)] text-xs">{t.city}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Blog
// ────────────────────────────────────────────────────────────────────────────
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
          <Link to="/blog" className="text-[var(--sattva-forest)] text-sm font-medium hover:text-[var(--sattva-gold)] flex items-center gap-1">
            All Articles <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.slice(0, 3).map((post, i) => (
            <motion.div key={post.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Link to={`/blog/${post.slug}`} className="group block">
                <div className="aspect-video rounded-xl overflow-hidden bg-[var(--sattva-muted)] mb-4">
                  {post.featuredImage && <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                </div>
                <div className="flex gap-2 mb-2">
                  {post.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-[var(--sattva-muted)] text-[var(--sattva-forest)]">{tag}</span>
                  ))}
                </div>
                <h3 className="font-heading text-base font-semibold text-[var(--sattva-ink)] group-hover:text-[var(--sattva-forest)] line-clamp-2">{post.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Social videos
// ────────────────────────────────────────────────────────────────────────────
const PLATFORM_CONFIG = {
  youtube: { label: 'YouTube', color: '#FF0000', bg: '#FFF0F0', textColor: '#CC0000' },
  instagram: { label: 'Instagram', color: '#E1306C', bg: '#FFF0F5', textColor: '#E1306C' },
  facebook: { label: 'Facebook', color: '#1877F2', bg: '#F0F5FF', textColor: '#1877F2' },
};

const VideoCard = ({ video }) => {
  const platform = PLATFORM_CONFIG[video.platform] || PLATFORM_CONFIG.youtube;
  const isShort = video.type === 'reel' || video.type === 'short';
  const [playing, setPlaying] = useState(false);

  // Auto-fetched items have redirectUrl + thumbnail; manual items have embedUrl
  const isAutoFetched = Boolean(video.redirectUrl && !video.embedUrl);

  const autoplayUrl = (() => {
    const url = video.embedUrl || '';
    if (url.includes('youtube.com/embed/')) {
      const videoId = url.split('/embed/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0`;
    }
    if (url.includes('?')) return url.includes('autoplay') ? url : `${url}&autoplay=1&muted=1`;
    return url ? `${url}?autoplay=1&muted=1` : '';
  })();

  const publishedDate = video.publishedAt
    ? new Date(video.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const typeLabel = video.type === 'reel' ? 'REEL' : video.type === 'short' ? 'SHORT' : video.type === 'post' ? 'POST' : 'VIDEO';

  const MediaBlock = () => {
    if (isAutoFetched || !autoplayUrl) {
      // Thumbnail-based card with external redirect
      return (
        <a href={video.redirectUrl} target="_blank" rel="noopener noreferrer"
          className="relative block overflow-hidden" style={{ aspectRatio: isShort ? '9/16' : '16/9' }}>
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-4xl text-gray-300">▶</div>
          )}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: platform.color + 'cc' }}>
              <span className="text-white text-lg">▶</span>
            </div>
          </div>
          <div className="absolute top-3 left-3">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: platform.color, color: 'white' }}>
              {typeLabel}
            </span>
          </div>
        </a>
      );
    }

    return (
      <div className="relative overflow-hidden" style={{ aspectRatio: isShort ? '9/16' : '16/9' }}>
        {playing ? (
          <iframe
            src={autoplayUrl} className="w-full h-full" frameBorder="0"
            allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
            title={video.title} loading="lazy"
          />
        ) : (
          <button onClick={() => setPlaying(true)} className="w-full h-full block relative group/thumb">
            {video.thumbnail ? (
              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-4xl text-gray-300">▶</div>
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: platform.color + 'cc' }}>
                <span className="text-white text-lg">▶</span>
              </div>
            </div>
          </button>
        )}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: platform.color, color: 'white' }}>
            {typeLabel}
          </span>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      className={`group rounded-2xl overflow-hidden bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] hover:shadow-xl transition-all duration-300 ${isShort ? 'row-span-2' : ''}`}
    >
      <MediaBlock />
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: platform.bg, color: platform.textColor }}>{platform.label}</span>
          {video.views && <span className="text-xs text-gray-400">{video.views}</span>}
          {publishedDate && <span className="text-xs text-gray-400 ml-auto">{publishedDate}</span>}
        </div>
        <h4 className="font-semibold text-[var(--sattva-ink)] text-sm leading-snug line-clamp-2 group-hover:text-[var(--sattva-forest)]">{video.title}</h4>
        {video.caption && video.caption !== video.title && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{video.caption}</p>
        )}
        {video.channelTitle && <p className="text-xs text-gray-400 mt-1">{video.channelTitle}</p>}
        {video.channel && <p className="text-xs text-gray-400 mt-1">{video.channel}</p>}
        {video.redirectUrl && (
          <a href={video.redirectUrl} target="_blank" rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--sattva-forest)] hover:underline">
            View on {platform.label} →
          </a>
        )}
      </div>
    </motion.div>
  );
};

const SocialVideosSection = ({ videos = [], socials = {} }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  if (!videos.length) return null;
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
          <div className="flex gap-3 flex-wrap">
            {socials.youtube && (
              <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: '#FF0000', color: 'white' }}>YouTube</a>
            )}
            {socials.instagram && (
              <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: 'white' }}>Instagram</a>
            )}
            {socials.facebook && (
              <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: '#1877F2', color: 'white' }}>Facebook</a>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { key: 'all', label: 'All Videos' },
            { key: 'youtube', label: 'YouTube' },
            { key: 'instagram', label: 'Reels' },
            { key: 'facebook', label: 'Facebook' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeFilter === f.key ? 'bg-[var(--sattva-gold)] text-[var(--sattva-ink)]' : 'text-[rgba(255,255,255,0.6)] hover:text-white border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.4)]'}`}
            >{f.label}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(v => <VideoCard key={v.id} video={v} />)}
        </div>
      </div>
    </section>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Flash sale
// ────────────────────────────────────────────────────────────────────────────
const useCountdown = (endTime) => {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    if (!endTime) return;
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
  const fallbackEnd = useRef(Date.now() + 8 * 3600000).current;
  const endTime = config.endsAt || fallbackEnd;
  const { h, m, s } = useCountdown(endTime);
  if (config.enabled === false || !products?.length) return null;
  const saleProducts = products.slice(0, 4).map(p => ({
    ...p,
    saleDiscount: p.mrp ? Math.round(((p.mrp - p.discountPrice) / p.mrp) * 100) : 0,
  }));
  const title = config.title || "Today's Best Deals";
  const subtitle = config.subtitle || '';
  const pad = n => String(n).padStart(2, '0');

  return (
    <section style={{ background: 'linear-gradient(135deg, #1A3C34 0%, #0f2620 50%, #1A3C34 100%)' }} className="section-padding relative overflow-hidden">
      <div className="container-sattva relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-500/20 border border-red-400/40 rounded-full text-red-400 text-xs font-bold uppercase tracking-widest mb-3">
              <Zap size={12} className="fill-current" /> {config.badge || 'Flash Sale — Limited Time'}
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">{title}</h2>
            {subtitle && <p className="text-white/50 text-sm mt-1.5">{subtitle}</p>}
          </div>
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
                      <span className="font-heading text-2xl font-black text-white tabular-nums">{val}</span>
                    </div>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mt-1">{label}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {saleProducts.map((product, i) => (
            <motion.div
              key={product.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10"
            >
              {product.saleDiscount > 0 && (
                <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-red-500 text-white text-xs font-black rounded-full shadow-lg">-{product.saleDiscount}%</div>
              )}
              <div className="relative overflow-hidden" style={{ aspectRatio: '1/1' }}>
                {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />}
              </div>
              <div className="p-4">
                <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1">{product.category}</p>
                <h4 className="font-semibold text-white text-sm leading-snug line-clamp-2 mb-3">{product.name}</h4>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-black text-[var(--sattva-gold)] text-lg">₹{product.discountPrice?.toLocaleString('en-IN')}</span>
                  {product.mrp > product.discountPrice && <span className="text-white/40 text-xs line-through">₹{product.mrp?.toLocaleString('en-IN')}</span>}
                </div>
                <Link to={`/products/${product.slug}`}>
                  <button className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2" style={{ background: '#A3E635', color: '#1A3C34' }}>View Product</button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Portal section (admin-managed)
// ────────────────────────────────────────────────────────────────────────────
const PortalSection = ({ data, statsBar = [] }) => {
  if (!data || !Array.isArray(data.cards) || data.cards.length === 0) return null;
  return (
    <section className="section-padding bg-gradient-to-b from-[#F7F5F0] to-white">
      <div className="container-sattva">
        <div className="text-center mb-12">
          {data.eyebrow && <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-2">{data.eyebrow}</p>}
          {data.title && <h2 className="font-heading text-3xl md:text-4xl font-semibold text-[var(--sattva-ink)]">{data.title}</h2>}
          {data.subtitle && <p className="text-gray-500 text-sm mt-3 max-w-xl mx-auto">{data.subtitle}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.cards.map((card, i) => {
            const accent = card.theme?.accent || '#A3E635';
            const gradient = card.theme?.gradient || 'linear-gradient(145deg, #1A3C34, #0f2620)';
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                className="relative group rounded-3xl overflow-hidden"
                style={{ background: gradient }}
              >
                {card.isFeatured && (
                  <span className="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider" style={{ background: accent, color: '#1A3C34' }}>Most Popular</span>
                )}
                <div className="p-8">
                  {card.badge && (
                    <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide mb-4" style={{ background: `${accent}26`, color: accent, border: `1px solid ${accent}55` }}>{card.badge}</div>
                  )}
                  <h3 className="font-heading text-2xl font-bold text-white mb-2">{card.title}</h3>
                  {card.description && <p className="text-[rgba(255,255,255,0.65)] text-sm leading-relaxed mb-6">{card.description}</p>}
                  {card.features?.length > 0 && (
                    <ul className="space-y-2 mb-8">
                      {card.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-[rgba(255,255,255,0.75)] text-sm">
                          <CheckCircle2 size={14} style={{ color: accent }} className="flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-3">
                    {card.primaryCta?.label && (
                      <Link to={card.primaryCta.link || '#'} className="flex-1">
                        <button className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: accent, color: '#1A3C34' }}>
                          {card.primaryCta.label} <ArrowRight size={15} />
                        </button>
                      </Link>
                    )}
                    {card.secondaryCta?.label && (
                      <Link to={card.secondaryCta.link || '#'}>
                        <button className="py-3.5 px-4 rounded-xl font-bold text-sm border text-white" style={{ borderColor: `${accent}66` }}>
                          {card.secondaryCta.label}
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {statsBar.length > 0 && (
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            {statsBar.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}15` }}>
                  <Icon name={s.icon} size={18} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-lg font-black text-[var(--sattva-ink)]">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Banner strip (between sections — admin managed)
// ────────────────────────────────────────────────────────────────────────────
const BannerStrip = ({ banners = [] }) => {
  const active = banners.filter(b => b.isActive !== false).slice(0, 3);
  if (!active.length) return null;
  return (
    <section className="section-padding bg-sattva-paper">
      <div className="container-sattva grid grid-cols-1 md:grid-cols-3 gap-4">
        {active.map(b => (
          <Link key={b.id} to={b.link || '/products'} className="group relative rounded-2xl overflow-hidden block" style={{ aspectRatio: '4/3' }}>
            {b.image && <img src={b.image} alt={b.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <p className="font-heading font-bold text-lg leading-tight">{b.title}</p>
              {b.subtitle && <p className="text-xs text-white/70 mt-1 line-clamp-2">{b.subtitle}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Why Us — three-pillar value proposition (Kapiva-style)
// ────────────────────────────────────────────────────────────────────────────
const WhyUsSection = ({ data }) => {
  const defaults = {
    eyebrow: 'Healthy Inside, Happy Outside',
    title: 'Why Dr Mediscie?',
    pillars: [
      {
        heading: 'Formulated by Experts at Dr Mediscie Academy of Ayurveda',
        body:
          "Experts at Dr Mediscie Academy of Ayurveda, PhD's, and Ayurvedacharya with over 50 years of cumulative experience build formulations with scientifically and clinically tested ingredients, to make our proprietary products that help you reach your health goals.",
      },
      {
        heading: 'The Best Ingredients Passed Through Toughest Process',
        body:
          'We go the extra mile to source the best ingredients like Shilajit from 18000 Ft. in the Himalayas, Aloe Vera from the Thar Desert, and Noni from Andamans. Our Hair Oils are made with herbs slowly heated with Oil for days or Body butter with Ghee 100 times washed. We manufacture our products in GMP-certified facilities, of which 8 are USFDA approved.',
      },
      {
        heading: 'Holistic Solutions for Every Need',
        body:
          "Be it acne, hair fall, or diabetes, we don't stop at just giving you products as that is just one element of solving your problem. We also give free health expert advice, personalized diet plans, and lifestyle recommendations including Yoga Asanas.",
      },
    ],
  };
  const cfg = { ...defaults, ...(data || {}) };
  const pillars = (cfg.pillars && cfg.pillars.length ? cfg.pillars : defaults.pillars).slice(0, 3);

  const icons = [
    // Leaf / expert formulation
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M21 3c0 9-6 15-15 15-1 0-2 0-3-1 0-9 6-15 15-15 1 0 2 0 3 1z" />
      <path d="M3 21c4-8 9-13 18-15" />
    </svg>,
    // Sparkle / quality
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5L19 19M5 19l2.5-2.5M16.5 7.5L19 5" />
      <circle cx="12" cy="12" r="3" />
    </svg>,
    // Heart / holistic
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
      <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0112 6a5.5 5.5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z" />
    </svg>,
  ];

  return (
    <section className="section-padding relative overflow-hidden bg-gradient-to-b from-[var(--sattva-paper)] via-white to-[var(--sattva-paper)]">
      {/* Decorative background ornaments */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[var(--sattva-gold)]/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-[var(--sattva-forest)]/10 blur-3xl" />
        <svg className="absolute top-10 right-10 w-40 h-40 text-[var(--sattva-gold)]/15" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.6">
          <circle cx="50" cy="50" r="48" />
          <circle cx="50" cy="50" r="36" />
          <circle cx="50" cy="50" r="24" />
          <path d="M50 2v96M2 50h96M15 15l70 70M85 15L15 85" />
        </svg>
      </div>

      <div className="container-sattva relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14 md:mb-20"
        >
          {cfg.eyebrow && (
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="h-px w-8 bg-[var(--sattva-gold)]" />
              <p className="text-[var(--sattva-gold)] text-[11px] font-semibold uppercase tracking-[0.3em]">{cfg.eyebrow}</p>
              <span className="h-px w-8 bg-[var(--sattva-gold)]" />
            </div>
          )}
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold text-[var(--sattva-ink)] leading-tight">
            {cfg.title?.split('?')[0]}
            <span className="text-[var(--sattva-gold)]">?</span>
          </h2>
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="h-px w-12 bg-[var(--sattva-border)]" />
            <svg className="w-4 h-4 text-[var(--sattva-gold)]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6z" /></svg>
            <span className="h-px w-12 bg-[var(--sattva-border)]" />
          </div>
        </motion.div>

        {/* Pillar cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {pillars.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.12 }}
              className="group relative"
            >
              {/* Gold gradient border wrapper */}
              <div className="relative h-full rounded-2xl bg-gradient-to-br from-[var(--sattva-gold)]/40 via-transparent to-[var(--sattva-forest)]/30 p-[1.5px] shadow-sm hover:shadow-2xl transition-shadow duration-500">
                <div className="relative h-full rounded-2xl bg-white p-7 md:p-8 overflow-hidden">
                  {/* Big faded number */}
                  <span className="absolute -top-4 -right-2 font-heading text-[8rem] leading-none font-bold text-[var(--sattva-gold)]/[0.07] select-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Icon badge */}
                  <div className="relative mb-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--sattva-gold)] to-[#b8893a] text-white shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                      {icons[i % icons.length]}
                    </div>
                    <span className="absolute -bottom-1 left-3 right-3 h-2 rounded-full bg-[var(--sattva-gold)]/20 blur-md" />
                  </div>

                  {/* Step label */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-heading text-sm font-bold text-[var(--sattva-gold)] tracking-widest">
                      0{i + 1}
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-r from-[var(--sattva-gold)]/40 to-transparent" />
                  </div>

                  <h3 className="relative font-heading text-base md:text-lg font-bold text-[var(--sattva-ink)] mb-3 leading-snug">
                    {p.heading}
                  </h3>

                  <p className="relative text-[var(--sattva-ink)]/70 text-sm leading-relaxed">
                    {p.body}
                  </p>

                  {/* Bottom accent line */}
                  <div className="relative mt-6 h-[3px] w-10 rounded-full bg-gradient-to-r from-[var(--sattva-gold)] to-[var(--sattva-forest)] group-hover:w-20 transition-all duration-500" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-[0.25em] text-[var(--sattva-ink)]/60 font-semibold"
        >
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--sattva-gold)]" /> 100% Ayurvedic</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--sattva-gold)]" /> GMP Certified</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--sattva-gold)]" /> Clinically Tested</span>
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--sattva-gold)]" /> Cruelty Free</span>
        </motion.div>
      </div>
    </section>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// In the News — press mentions strip
// ────────────────────────────────────────────────────────────────────────────
const InTheNewsSection = ({ data }) => {
  const defaults = {
    title: 'In the News',
    eyebrow: 'Improving health with Ayurveda',
    statValue: '2M+',
    statLabel: 'Happy Ayurveda Consumers',
    items: [
      { source: 'D2C', text: 'Most Admired D2C Brand of the Year in the Fitness & Wellness category.' },
      { source: 'CNBC TV18', text: "Featured Dr Mediscie's Plans for Global Expansion." },
      { source: 'The Financial Express', text: "Featured Dr Mediscie's brand film launch." },
      { source: 'Hindustan Times', text: 'Featured Dr Mediscie Dia Free Juice as a solution to manage Diabetes.' },
    ],
  };
  const cfg = { ...defaults, ...(data || {}) };
  const items = cfg.items && cfg.items.length ? cfg.items : defaults.items;

  return (
    <section className="section-padding bg-sattva-paper">
      <div className="container-sattva">
        <h2 className="font-heading text-3xl md:text-4xl font-semibold text-[var(--sattva-ink)] mb-10">
          {cfg.title}
        </h2>

        <div className="text-center mb-10">
          {cfg.eyebrow && (
            <p className="text-[var(--sattva-gold)] text-sm italic font-medium mb-2">{cfg.eyebrow}</p>
          )}
          <p className="font-heading text-4xl md:text-5xl font-bold text-[var(--sattva-gold)] leading-none">
            {cfg.statValue}
          </p>
          <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.25em] mt-2">
            {cfg.statLabel}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-xl border border-[color:var(--sattva-border)] p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-10 flex items-center justify-center mb-3">
                {item.logo ? (
                  <img src={item.logo} alt={item.source} className="max-h-10 object-contain" loading="lazy" />
                ) : (
                  <span className="font-heading font-bold text-[var(--sattva-forest)] text-sm uppercase tracking-wide">
                    {item.source}
                  </span>
                )}
              </div>
              <div className="border-t border-[color:var(--sattva-border)] pt-3">
                <p className="text-xs text-[var(--sattva-ink)]/70 leading-relaxed">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Home
// ────────────────────────────────────────────────────────────────────────────
const Home = () => {
  const content = useSiteContent();
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, cRes, bpRes] = await Promise.all([
          api.get('/products?limit=100').catch(() => ({})),
          api.get('/categories').catch(() => ({})),
          api.get('/blog?limit=3').catch(() => ({})),
        ]);
        const products = pRes.data?.products || pRes.data || [];
        if (Array.isArray(products)) setAllProducts(products);
        if (Array.isArray(cRes.data)) setCategories(cRes.data.filter(c => !c.parent));
        if (Array.isArray(bpRes.data)) setBlogPosts(bpRes.data);
      } catch {}
    })();
  }, []);

  const featured = getProductsByIds(content.bestsellerIds, allProducts);
  const newArrivals = getProductsByIds(content.newArrivalIds, allProducts);
  const flashProducts = getProductsByIds(content.flashSale?.productIds || [], allProducts);

  return (
    <Layout>
      <HeroBanner slides={content.heroSlides} trustBadges={content.trustBadges} />
      <FeaturesStrip items={content.featuresStrip} />
      <CategoryGrid categories={categories} />
      <ProductSection title="Bestsellers" subtitle="Most Loved" products={featured} link="/products?featured=true" />
      <FlashSaleSection products={flashProducts} config={content.flashSale} />
      <BannerStrip banners={content.banners} />
      <SocialVideosSection videos={content.socialVideos} socials={content.nav?.footer?.socials || {}} />
      <PortalSection data={content.portalSection} statsBar={content.statsBar} />
      <WhyUsSection data={content.whyUs} />
      <Testimonials items={content.testimonials} />
      {/* <InTheNewsSection data={content.inTheNews} /> */}
      <ProductSection title="New Arrivals" subtitle="Fresh Rituals" products={newArrivals} link="/products?sort=newest" />
      <BlogPreview posts={blogPosts} />
    </Layout>
  );
};

export default Home;
