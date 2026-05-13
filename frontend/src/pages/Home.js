import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RecommendedProducts from '../components/retargeting/RecommendedProducts';
import RetargetingBanner from '../components/retargeting/RetargetingBanner';
import RecentlyViewed from '../components/retargeting/RecentlyViewed';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Sparkles, Leaf, Shield, Star,
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
const SLIDE_DURATION = 6000;

const HeroBanner = ({ slides: slidesProp = [] }) => {
  const slides = (slidesProp || []).filter(s => s.isActive !== false);
  const [current, setCurrent] = useState(0);
  const slide = slides.length ? slides[current % slides.length] : null;

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % slides.length), SLIDE_DURATION);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slide) return null;

  const primaryCta = slide.primaryCta || { label: slide.primaryCtaLabel, to: slide.primaryCtaLink };
  const secondaryCta = slide.secondaryCta || { label: slide.secondaryCtaLabel, to: slide.secondaryCtaLink };

  return (
    <div data-testid="home-hero" className="relative overflow-hidden">
      {/* Full-bleed background image with overlay */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${slide.id}`}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          {slide.image && (
            <img src={slide.image} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f2620]/95 via-[#1A3C34]/80 to-[#0f2620]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f2620]/60 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative container-sattva py-10 md:py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[374px]">

          {/* Content */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                {slide.badge && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-sm"
                    style={{ background: `${slide.accent}18`, color: slide.accent, border: `1px solid ${slide.accent}33` }}
                  >
                    <Sparkles size={11} /> {slide.badge}
                  </motion.span>
                )}
                <motion.h1
                  initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.5 }}
                  className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold text-white leading-[1.08] mb-5"
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {slide.title}
                </motion.h1>
                {slide.subtitle && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.45 }}
                    className="text-white/70 text-base md:text-lg leading-relaxed mb-8 max-w-xl"
                  >
                    {slide.subtitle}
                  </motion.p>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
                  className="flex flex-wrap gap-3 mb-10"
                >
                  {primaryCta?.label && (
                    <Link to={primaryCta.to || '#'} data-testid="home-hero-primary-cta">
                      <motion.button
                        whileHover={{ scale: 1.04, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
                        whileTap={{ scale: 0.97 }}
                        className="px-8 py-3.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-xl transition-shadow"
                        style={{ background: slide.accent, color: '#1A3C34' }}
                      >
                        {primaryCta.label} <ArrowRight size={16} />
                      </motion.button>
                    </Link>
                  )}
                  {secondaryCta?.label && (
                    <Link to={secondaryCta.to || '#'}>
                      <motion.button
                        whileHover={{ scale: 1.04, background: 'rgba(255,255,255,0.12)' }}
                        whileTap={{ scale: 0.97 }}
                        className="px-8 py-3.5 rounded-full font-semibold text-sm border border-white/25 text-white backdrop-blur-sm"
                      >
                        {secondaryCta.label}
                      </motion.button>
                    </Link>
                  )}
                </motion.div>

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: decorative accent card (visible on large screens) */}
          <div className="lg:col-span-5 hidden lg:flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`card-${slide.id}`}
                initial={{ opacity: 0, y: 30, rotateY: -5 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative w-full max-w-[320px]"
              >
                <div className="absolute -inset-4 rounded-[2rem] opacity-20 blur-3xl" style={{ background: slide.accent }} />
                <div className="relative rounded-[1.5rem] overflow-hidden border border-white/15 shadow-2xl bg-white/5 backdrop-blur-md" style={{ aspectRatio: '4/5' }}>
                  {slide.image && <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: slide.accent }} />
                      <span className="text-white/80 text-xs font-medium">Now Trending</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

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
      <div className="container-sattva py-3.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.slice(0, 4).map((f, i) => (
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
        <div className="text-center mb-8">
          <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-2">Shop by Care Goal</p>
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-[var(--sattva-ink)]">What Are You Looking For?</h2>
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
// Why Us — premium immersive section
// ────────────────────────────────────────────────────────────────────────────
const WhyUsSection = ({ data }) => {
  const defaults = {
    eyebrow: 'Healthy Inside, Happy Outside',
    title: 'Why Dr Mediscie?',
    pillars: [
      {
        heading: 'Formulated by Experts',
        body:
          "PhD's and Ayurvedacharya with over 50 years of cumulative experience build formulations with scientifically and clinically tested ingredients at Dr Mediscie Academy of Ayurveda.",
        stat: '50+',
        statLabel: 'Years Experience',
      },
      {
        heading: 'Finest Ingredients, Toughest Process',
        body:
          'Shilajit from 18,000 ft in the Himalayas, Aloe Vera from Thar Desert, Noni from Andamans. Manufactured in GMP-certified, USFDA approved facilities.',
        stat: '8',
        statLabel: 'USFDA Approved',
      },
      {
        heading: 'Holistic Wellness Solutions',
        body:
          "Beyond products — free health expert advice, personalized diet plans, and lifestyle recommendations including Yoga Asanas for complete well-being.",
        stat: '360°',
        statLabel: 'Care Approach',
      },
    ],
  };
  const cfg = { ...defaults, ...(data || {}) };
  const pillars = (cfg.pillars && cfg.pillars.length ? cfg.pillars : defaults.pillars).slice(0, 3);

  return (
    <section className="relative overflow-hidden">
      {/* Dark immersive background */}
      <div className="absolute inset-0 bg-[#0f2620]" />
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.4) 1px, transparent 0)',
        backgroundSize: '32px 32px',
      }} />
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[var(--sattva-gold)]/5 blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--sattva-forest)]/10 blur-[100px]" />

      <div className="relative container-sattva py-16 md:py-20">
        {/* Top: Logo + Heading */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-14">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-xl"
          >
            {cfg.eyebrow && (
              <p className="text-[var(--sattva-gold)] text-[10px] font-bold uppercase tracking-[0.35em] mb-3">{cfg.eyebrow}</p>
            )}
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
              {cfg.title?.split('?')[0]}
              <span className="text-[var(--sattva-gold)]">?</span>
            </h2>
            <p className="text-white/50 text-sm mt-4 max-w-md leading-relaxed">
              Ancient Ayurvedic wisdom meets modern science — delivering authentic, effective wellness solutions you can trust.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-shrink-0"
          >
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-[var(--sattva-gold)]/10 blur-xl" />
              <img src="/LOGO-1.jpeg" alt="Dr MediScie" className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-2xl object-contain border border-white/10 shadow-xl" />
            </div>
          </motion.div>
        </div>

        {/* Pillar cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          {pillars.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative"
            >
              <div className="relative h-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-7 hover:bg-white/[0.06] hover:border-[var(--sattva-gold)]/30 transition-all duration-500 overflow-hidden">
                {/* Hover glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--sattva-gold)] to-[var(--sattva-forest)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Stat */}
                <div className="mb-5">
                  <span className="font-heading text-4xl md:text-5xl font-bold text-[var(--sattva-gold)] leading-none">
                    {p.stat || `0${i + 1}`}
                  </span>
                  <p className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-semibold mt-1">
                    {p.statLabel || 'Step'}
                  </p>
                </div>

                <h3 className="font-heading text-lg font-bold text-white mb-3 leading-snug group-hover:text-[var(--sattva-gold)] transition-colors duration-300">
                  {p.heading}
                </h3>

                <p className="text-white/55 text-sm leading-relaxed">
                  {p.body}
                </p>

                {/* Bottom connector */}
                <div className="mt-5 flex items-center gap-2">
                  <div className="w-8 h-[2px] rounded-full bg-[var(--sattva-gold)]/40 group-hover:w-12 group-hover:bg-[var(--sattva-gold)] transition-all duration-500" />
                  <div className="w-2 h-2 rounded-full border border-[var(--sattva-gold)]/40 group-hover:border-[var(--sattva-gold)] group-hover:bg-[var(--sattva-gold)]/20 transition-all duration-500" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom trust strip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-12 pt-8 border-t border-white/10"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {['100% Ayurvedic', 'GMP Certified', 'Clinically Tested', 'Cruelty Free', 'Made in India'].map((badge, i) => (
              <motion.div
                key={badge}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5 text-[var(--sattva-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-white/60 text-xs font-semibold uppercase tracking-[0.15em]">{badge}</span>
              </motion.div>
            ))}
          </div>
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

/**
 * Fetch products by curated IDs. Falls back to a direct endpoint when
 * no IDs are configured in admin.
 */
async function fetchCuratedOrFallback(ids, fallbackUrl, limit = 8) {
  if (Array.isArray(ids) && ids.length > 0) {
    try {
      const res = await api.get(`/products/by-ids?ids=${ids.slice(0, 20).join(',')}`);
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}
  }
  // Fallback: use a direct sorted endpoint
  try {
    const res = await api.get(`${fallbackUrl}?limit=${limit}`);
    if (Array.isArray(res.data)) return res.data;
  } catch {}
  return [];
}

async function fetchFlashProducts(flashConfig) {
  // Backend already applies startsAt / endsAt schedule and returns enabled:false when out of window
  if (!flashConfig?.enabled) return [];
  const ids = flashConfig?.productIds || [];
  if (ids.length > 0) {
    try {
      const res = await api.get(`/products/by-ids?ids=${ids.slice(0, 20).join(',')}`);
      if (Array.isArray(res.data) && res.data.length > 0) return res.data;
    } catch {}
  }
  // enabled=true but no products pinned — fall back to isFeatured products
  try {
    const res = await api.get('/products/featured?limit=8');
    if (Array.isArray(res.data) && res.data.length > 0) return res.data;
  } catch {}
  return [];
}

const Home = () => {
  const content = useSiteContent();
  const [bestsellers, setBestsellers] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [flashProducts, setFlashProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);

  // Load categories and blog immediately (don't depend on content)
  useEffect(() => {
    api.get('/categories').then(r => {
      if (Array.isArray(r.data)) setCategories(r.data.filter(c => !c.parent));
    }).catch(() => {});
    api.get('/blog?limit=3').then(r => {
      if (Array.isArray(r.data)) setBlogPosts(r.data);
    }).catch(() => {});
  }, []);

  // Load product sections — re-run whenever content IDs change
  useEffect(() => {
    if (content.loading) return; // wait for site content to resolve first
    (async () => {
      const [bs, na, fp] = await Promise.all([
        fetchCuratedOrFallback(content.bestsellerIds, '/products/bestsellers', 8),
        fetchCuratedOrFallback(content.newArrivalIds, '/products/new-arrivals', 8),
        fetchFlashProducts(content.flashSale),
      ]);
      setBestsellers(bs);
      setNewArrivals(na);
      setFlashProducts(fp);
    })();
  }, [content.bestsellerIds, content.newArrivalIds, content.flashSale, content.loading]);

  // Pass backend config as-is; FlashSaleSection already guards on enabled + products.length
  const flashConfig = content.flashSale || {};

  return (
    <Layout>
      <HeroBanner slides={content.heroSlides} />
      <FeaturesStrip items={content.featuresStrip} />
      <CategoryGrid categories={categories} />
      <ProductSection title="Bestsellers" subtitle="Most Loved" products={bestsellers} link="/products?featured=true" />
      <FlashSaleSection products={flashProducts} config={flashConfig} />
      <BannerStrip banners={content.banners} />
      <SocialVideosSection videos={content.socialVideos} socials={content.nav?.footer?.socials || {}} />
      <PortalSection data={content.portalSection} statsBar={content.statsBar} />
      <WhyUsSection data={content.whyUs} />
      <ProductSection title="New Arrivals" subtitle="Fresh Rituals" products={newArrivals} link="/products?sort=newest" />
      <BlogPreview posts={blogPosts} />
      {/* Personalized section */}
      <section className="section-padding">
        <div className="container-sattva space-y-8">
          <RetargetingBanner />
          <RecentlyViewed />
          <RecommendedProducts title="Recommended For You" />
        </div>
      </section>
    </Layout>
  );
};

export default Home;
