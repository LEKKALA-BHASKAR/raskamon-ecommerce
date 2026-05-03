// Centralized site content store — API-backed.
// Single source of truth for admin & customer pages.
// Reads from /api/site/* (public) and writes via /api/admin/* (admin auth).
// localStorage is used purely as a hot-cache to avoid blank flashes during fetch.

import { useEffect, useState, useCallback } from 'react';
import api from './api';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from './mockData';

const CACHE_KEY = 'drmediscie_site_content_cache_v2';

// ===== Defaults (used until API responds; also used as seed by admin) =====
const DEFAULT_HERO_SLIDES = [
  {
    id: 'hs_default_1',
    badge: 'Clinically Backed Ayurveda',
    title: 'Ancient Wisdom,\nModern Science',
    subtitle: 'Premium Ayurvedic supplements crafted for modern wellness. Trusted by 50,000+ customers across India.',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&q=80',
    accent: '#A3E635',
    isActive: true,
    order: 0,
    ctas: [
      { label: 'Shop Now', link: '/products', style: 'primary' },
      { label: 'Explore Products', link: '/products', style: 'secondary' },
    ],
  },
];

const DEFAULT_FLASH_SALE = {
  enabled: true,
  title: "Today's Best Deals",
  subtitle: "Grab these offers before they're gone — massive savings on top sellers",
  badge: 'Flash Sale — Limited Time',
  endsAt: Date.now() + 8 * 3600000,
  productIds: [],
};

const DEFAULTS = {
  heroSlides: DEFAULT_HERO_SLIDES,
  testimonials: [],
  flashSale: DEFAULT_FLASH_SALE,
  bestsellerIds: MOCK_PRODUCTS.filter(p => p.isFeatured).slice(0, 8).map(p => p.id),
  newArrivalIds: MOCK_PRODUCTS.slice(0, 4).map(p => p.id),
  categories: MOCK_CATEGORIES,
  socialVideos: [],
};

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
};

// ===== Normalisers =====
// Backend hero slides expose a `ctas: [{label, link, style}]` array. Home.js
// already supports either object-form (primaryCta/secondaryCta) or flat fields
// (primaryCtaLabel/Link). We project ctas back to the legacy flat fields so
// Home.js needs no changes.
const normaliseHero = (slide) => {
  if (!slide) return slide;
  const out = { ...slide };
  const ctas = Array.isArray(slide.ctas) ? slide.ctas : [];
  const [primary, secondary] = ctas;
  if (primary && !out.primaryCtaLabel) {
    out.primaryCtaLabel = primary.label;
    out.primaryCtaLink = primary.link;
  }
  if (secondary && !out.secondaryCtaLabel) {
    out.secondaryCtaLabel = secondary.label;
    out.secondaryCtaLink = secondary.link;
  }
  return out;
};

// ===== Fetcher =====
export const fetchSiteContent = async () => {
  const out = { ...DEFAULTS };
  const calls = [
    api.get('/site/hero').then(r => { out.heroSlides = (r.data || []).map(normaliseHero); }).catch(() => {}),
    api.get('/site/flash-sale').then(r => { if (r.data) out.flashSale = r.data; }).catch(() => {}),
    api.get('/site/curated/bestsellers').then(r => { out.bestsellerIds = r.data?.productIds || []; }).catch(() => {}),
    api.get('/site/curated/new-arrivals').then(r => { out.newArrivalIds = r.data?.productIds || []; }).catch(() => {}),
    api.get('/site/testimonials').then(r => { out.testimonials = r.data || []; }).catch(() => {}),
    api.get('/site/social-videos').then(r => { out.socialVideos = r.data || []; }).catch(() => {}),
    api.get('/site/nav').then(r => { out.nav = r.data; }).catch(() => {}),
  ];
  await Promise.all(calls);
  writeCache(out);
  return out;
};

// React hook — primary consumer
export const useSiteContent = () => {
  const cached = readCache();
  const [content, setContent] = useState(cached || DEFAULTS);

  const reload = useCallback(async () => {
    const fresh = await fetchSiteContent();
    setContent(fresh);
    window.dispatchEvent(new CustomEvent('siteContentChange'));
  }, []);

  useEffect(() => {
    fetchSiteContent().then(setContent).catch(() => {});
    const handler = () => {
      const c = readCache();
      if (c) setContent(c);
    };
    window.addEventListener('siteContentChange', handler);
    return () => window.removeEventListener('siteContentChange', handler);
  }, []);

  return { ...content, reload };
};

// ===== Admin write helpers =====
const denormaliseHero = (slide) => {
  // Convert flat primary/secondary fields back to ctas array if needed
  const out = { ...slide };
  if (!Array.isArray(out.ctas) || out.ctas.length === 0) {
    const ctas = [];
    if (out.primaryCtaLabel) ctas.push({ label: out.primaryCtaLabel, link: out.primaryCtaLink || '#', style: 'primary' });
    if (out.secondaryCtaLabel) ctas.push({ label: out.secondaryCtaLabel, link: out.secondaryCtaLink || '#', style: 'secondary' });
    out.ctas = ctas;
  }
  return out;
};

export const saveHeroSlides = async (slides) => {
  const payload = { slides: (slides || []).map(denormaliseHero) };
  const { data } = await api.put('/admin/hero-slides', payload);
  return data;
};

export const saveFlashSale = async (config) => {
  const { data } = await api.put('/admin/flash-sale', config);
  return data;
};

export const saveCurated = async (name, productIds) => {
  // name: 'bestsellers' | 'new-arrivals'
  const { data } = await api.put(`/admin/curated/${name}`, { productIds });
  return data;
};

// Testimonials CRUD
export const listTestimonialsAdmin = () => api.get('/admin/testimonials').then(r => r.data);
export const createTestimonial = (t) => api.post('/admin/testimonials', t).then(r => r.data);
export const updateTestimonial = (id, t) => api.put(`/admin/testimonials/${id}`, t).then(r => r.data);
export const deleteTestimonial = (id) => api.delete(`/admin/testimonials/${id}`).then(r => r.data);

// Social videos CRUD
export const listSocialVideosAdmin = () => api.get('/admin/social-videos').then(r => r.data);
export const createSocialVideo = (v) => api.post('/admin/social-videos', v).then(r => r.data);
export const updateSocialVideo = (id, v) => api.put(`/admin/social-videos/${id}`, v).then(r => r.data);
export const deleteSocialVideo = (id) => api.delete(`/admin/social-videos/${id}`).then(r => r.data);

// Nav (header + footer)
export const getNavAdmin = () => api.get('/admin/nav').then(r => r.data);
export const saveNav = (cfg) => api.put('/admin/nav', cfg).then(r => r.data);

// Helpers
export const getProductsByIds = (ids, allProducts) => {
  if (!Array.isArray(ids)) return [];
  return ids.map(id => allProducts.find(p => p.id === id || p._id === id)).filter(Boolean);
};

// Notify subscribers (called by admin pages after a successful save)
export const broadcastSiteContentChange = async () => {
  await fetchSiteContent();
  window.dispatchEvent(new CustomEvent('siteContentChange'));
};

// Backwards-compatibility no-ops (legacy code paths)
export const getSiteContent = () => readCache() || DEFAULTS;
export const setSiteContent = () => { /* deprecated — use save* helpers */ };
export const resetSiteContent = () => { try { localStorage.removeItem(CACHE_KEY); } catch {} };
