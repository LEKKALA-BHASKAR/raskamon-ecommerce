// Shared nav hook — single source of truth for Header & Footer.
// Pulls categories tree + announcement strip + footer config from /api/site/nav.
// Falls back to sensible defaults so the header/footer never blank out.

import { useEffect, useState } from 'react';
import api from './api';

const FALLBACK = {
  announcements: [
    '🌿 Free delivery on orders above ₹499 — Across India',
    '✨ Use code WELLNESS15 for 15% off on your first order',
  ],
  categories: [],
  footer: {
    tagline: "Premium Ayurvedic wellness crafted with ancient wisdom for modern lives.",
    helpLinks: [
      { label: 'About Us', to: '/about' },
      { label: 'Customer Care', to: '/contact' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Blog', to: '/blog' },
      { label: 'Shipping & Returns', to: '/shipping' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms & Conditions', to: '/terms' },
    ],
    contact: { email: 'info@drmediscie.com', phone: '+91-8860908070', address: 'Delhi, New Delhi, 110034' },
    socials: { instagram: '#', facebook: '#', twitter: '#', youtube: '#' },
  },
  simpleLinks: [
    { label: 'Customer Care', href: '/contact' },
    { label: 'B2B Buyer', href: '/register/b2b' },
  ],
};

const CACHE_KEY = 'drmediscie_nav_cache_v1';

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || null; } catch { return null; }
};

const EXCLUDED_SIMPLE_LINKS = ['Blog', 'About Us'];

const mergeLinks = (primary = [], fallback = []) => {
  const seen = new Set();
  const normalize = (link) => `${link.label}::${link.href || link.to || ''}`;
  const merged = [];

  [...primary, ...fallback].forEach((link) => {
    const key = normalize(link);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(link);
    }
  });

  return merged;
};

const filterSimpleLinks = (links = []) => links.filter(link => !EXCLUDED_SIMPLE_LINKS.includes(link.label));

export const useSiteNav = () => {
  const [nav, setNav] = useState(() => readCache() || FALLBACK);

  useEffect(() => {
    api.get('/site/nav').then(r => {
      if (r.data) {
        const merged = { ...FALLBACK, ...r.data };
        merged.footer = { ...FALLBACK.footer, ...(r.data.footer || {}) };
        merged.simpleLinks = filterSimpleLinks(mergeLinks(r.data.simpleLinks || [], FALLBACK.simpleLinks));
        merged.footer.helpLinks = mergeLinks(r.data.footer?.helpLinks || [], FALLBACK.footer.helpLinks);
        setNav(merged);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch {}
      }
    }).catch(() => {
      localStorage.removeItem(CACHE_KEY);
    });

    const handler = () => {
      api.get('/site/nav').then(r => {
        if (r.data) {
          const merged = { ...FALLBACK, ...r.data };
          merged.footer = { ...FALLBACK.footer, ...(r.data.footer || {}) };
          merged.simpleLinks = filterSimpleLinks(mergeLinks(r.data.simpleLinks || [], FALLBACK.simpleLinks));
          merged.footer.helpLinks = mergeLinks(r.data.footer?.helpLinks || [], FALLBACK.footer.helpLinks);
          setNav(merged);
        }
      }).catch(() => {});
    };
    window.addEventListener('siteContentChange', handler);
    return () => window.removeEventListener('siteContentChange', handler);
  }, []);

  return nav;
};
