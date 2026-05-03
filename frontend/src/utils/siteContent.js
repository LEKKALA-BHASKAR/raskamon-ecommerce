// Centralized site content store — API-backed.
// Single source of truth for admin & customer pages.
// Reads from /api/site/* (public) and writes via /api/admin/* (admin auth).
// No localStorage cache, no mock fallbacks — empty data renders empty states.

import { useEffect, useState, useCallback } from 'react';
import api from './api';

const EMPTY = {
  heroSlides: [],
  testimonials: [],
  flashSale: { enabled: false, productIds: [] },
  bestsellerIds: [],
  newArrivalIds: [],
  socialVideos: [],
  nav: null,
  trustBadges: [],
  featuresStrip: [],
  portalSection: null,
  statsBar: [],
  banners: [],
};

// ===== Normalisers =====
// Backend hero slides expose a `ctas: [{label, link, style}]` array. Home.js
// supports either object-form (primaryCta/secondaryCta) or flat fields
// (primaryCtaLabel/Link). We project ctas to the legacy flat fields here.
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
  const out = { ...EMPTY };
  await Promise.all([
    api.get('/site/hero').then(r => { out.heroSlides = (r.data || []).map(normaliseHero); }).catch(() => {}),
    api.get('/site/flash-sale').then(r => { if (r.data) out.flashSale = r.data; }).catch(() => {}),
    api.get('/site/curated/bestsellers').then(r => { out.bestsellerIds = r.data?.productIds || []; }).catch(() => {}),
    api.get('/site/curated/new-arrivals').then(r => { out.newArrivalIds = r.data?.productIds || []; }).catch(() => {}),
    api.get('/site/testimonials').then(r => { out.testimonials = r.data || []; }).catch(() => {}),
    api.get('/site/social-videos').then(r => { out.socialVideos = r.data || []; }).catch(() => {}),
    api.get('/site/nav').then(r => { out.nav = r.data; }).catch(() => {}),
    api.get('/site/blocks/trust_badges').then(r => { out.trustBadges = r.data || []; }).catch(() => {}),
    api.get('/site/blocks/features_strip').then(r => { out.featuresStrip = r.data || []; }).catch(() => {}),
    api.get('/site/blocks/portal_section').then(r => { out.portalSection = r.data || null; }).catch(() => {}),
    api.get('/site/blocks/stats_bar').then(r => { out.statsBar = r.data || []; }).catch(() => {}),
    api.get('/banners').then(r => { out.banners = r.data || []; }).catch(() => {}),
  ]);
  return out;
};

// React hook — primary consumer
export const useSiteContent = () => {
  const [content, setContent] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const fresh = await fetchSiteContent();
    setContent(fresh);
    window.dispatchEvent(new CustomEvent('siteContentChange'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchSiteContent()
      .then(c => { if (!cancelled) { setContent(c); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    const handler = () => { fetchSiteContent().then(c => { if (!cancelled) setContent(c); }).catch(() => {}); };
    window.addEventListener('siteContentChange', handler);
    return () => { cancelled = true; window.removeEventListener('siteContentChange', handler); };
  }, []);

  return { ...content, loading, reload };
};

// ===== Admin write helpers =====
const denormaliseHero = (slide) => {
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
  const { data } = await api.put(`/admin/curated/${name}`, { productIds });
  return data;
};

// Testimonials
export const listTestimonialsAdmin = () => api.get('/admin/testimonials').then(r => r.data);
export const createTestimonial = (t) => api.post('/admin/testimonials', t).then(r => r.data);
export const updateTestimonial = (id, t) => api.put(`/admin/testimonials/${id}`, t).then(r => r.data);
export const deleteTestimonial = (id) => api.delete(`/admin/testimonials/${id}`).then(r => r.data);

// Social videos
export const listSocialVideosAdmin = () => api.get('/admin/social-videos').then(r => r.data);
export const createSocialVideo = (v) => api.post('/admin/social-videos', v).then(r => r.data);
export const updateSocialVideo = (id, v) => api.put(`/admin/social-videos/${id}`, v).then(r => r.data);
export const deleteSocialVideo = (id) => api.delete(`/admin/social-videos/${id}`).then(r => r.data);

// Nav (header + footer)
export const getNavAdmin = () => api.get('/admin/nav').then(r => r.data);
export const saveNav = (cfg) => api.put('/admin/nav', cfg).then(r => r.data);

// Generic content blocks (trust_badges, features_strip, portal_section, stats_bar)
export const getBlockAdmin = (key) => api.get(`/admin/blocks/${key}`).then(r => r.data);
export const saveBlock = (key, value) => api.put(`/admin/blocks/${key}`, { value }).then(r => r.data);

// Helpers
export const getProductsByIds = (ids, allProducts) => {
  if (!Array.isArray(ids)) return [];
  return ids.map(id => allProducts.find(p => p.id === id || p._id === id)).filter(Boolean);
};

// Notify subscribers (called by admin pages after a successful save)
export const broadcastSiteContentChange = async () => {
  window.dispatchEvent(new CustomEvent('siteContentChange'));
};
