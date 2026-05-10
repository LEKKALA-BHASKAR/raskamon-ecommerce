/**
 * Tracking Pixel & Tag Manager
 * Handles Facebook Pixel, Google Tag Manager, Google Ads, and custom internal tracking.
 * All calls are fire-and-forget with async batching.
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const BATCH_INTERVAL_MS = 3000;
const MAX_BATCH_SIZE = 20;

let eventQueue = [];
let flushTimer = null;

// ── Session / identity management ────────────────────────────────────────

export function getSessionId() {
  let sid = sessionStorage.getItem('_rt_sid');
  if (!sid) {
    sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('_rt_sid', sid);
  }
  return sid;
}

export function getUserId() {
  try {
    const raw = localStorage.getItem('access_token');
    if (!raw) return null;
    const payload = JSON.parse(atob(raw.split('.')[1]));
    return payload.sub || payload.id || null;
  } catch {
    return null;
  }
}

// ── Core event fire ───────────────────────────────────────────────────────

export function fireEvent(event, props = {}) {
  const payload = {
    event,
    sessionId: getSessionId(),
    userId: getUserId(),
    props: {
      ...props,
      url: window.location.pathname,
      referrer: document.referrer || '',
      ts: Date.now(),
    },
  };

  eventQueue.push(payload);

  if (eventQueue.length >= MAX_BATCH_SIZE) {
    flushQueue();
  } else {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flushQueue, BATCH_INTERVAL_MS);
  }

  // Also fire 3rd-party pixels
  _fireFacebookPixel(event, props);
  _fireGoogleTag(event, props);
}

async function flushQueue() {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0, MAX_BATCH_SIZE);
  try {
    await fetch(`${BACKEND_URL}/api/tracking/events/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      keepalive: true,
    });
  } catch {
    // silently fail — tracking must never break the app
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushQueue);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushQueue();
  });
}

// ── Convenience event wrappers ────────────────────────────────────────────

export const track = {
  pageView: (path) => fireEvent('PAGE_VIEW', { path }),
  productView: (product) =>
    fireEvent('PRODUCT_VIEW', {
      productId: product._id || product.id,
      name: product.name,
      price: product.price,
      category: product.category,
      brand: product.brand,
    }),
  categoryView: (category) => fireEvent('CATEGORY_VIEW', { category }),
  search: (query) => fireEvent('SEARCH', { query }),
  addToCart: (product, quantity = 1) =>
    fireEvent('ADD_TO_CART', {
      productId: product._id || product.id,
      name: product.name,
      price: product.price,
      quantity,
    }),
  removeFromCart: (productId) => fireEvent('REMOVE_FROM_CART', { productId }),
  beginCheckout: (items, cartValue) =>
    fireEvent('BEGIN_CHECKOUT', { items, cartValue }),
  purchase: (orderId, value, items) =>
    fireEvent('PURCHASE', { orderId, value, items }),
  wishlistAdd: (product) =>
    fireEvent('WISHLIST_ADD', {
      productId: product._id || product.id,
      name: product.name,
    }),
  sessionStart: () => fireEvent('SESSION_START', {}),
};

// ── Facebook Pixel ────────────────────────────────────────────────────────

const FB_EVENT_MAP = {
  PRODUCT_VIEW: 'ViewContent',
  ADD_TO_CART: 'AddToCart',
  BEGIN_CHECKOUT: 'InitiateCheckout',
  PURCHASE: 'Purchase',
  SEARCH: 'Search',
  WISHLIST_ADD: 'AddToWishlist',
};

function _fireFacebookPixel(event, props) {
  if (typeof window === 'undefined' || !window.fbq) return;
  const fbEvent = FB_EVENT_MAP[event];
  if (!fbEvent) return;
  const data = {};
  if (props.productId) data.content_ids = [props.productId];
  if (props.name) data.content_name = props.name;
  if (props.price) data.value = props.price;
  if (props.cartValue) data.value = props.cartValue;
  if (props.query) data.search_string = props.query;
  data.currency = 'INR';
  window.fbq('track', fbEvent, data);
}

// ── Google Tag Manager / Analytics ───────────────────────────────────────

const GA_EVENT_MAP = {
  PRODUCT_VIEW: 'view_item',
  ADD_TO_CART: 'add_to_cart',
  REMOVE_FROM_CART: 'remove_from_cart',
  BEGIN_CHECKOUT: 'begin_checkout',
  PURCHASE: 'purchase',
  SEARCH: 'search',
  WISHLIST_ADD: 'add_to_wishlist',
};

function _fireGoogleTag(event, props) {
  if (typeof window === 'undefined') return;

  // GTM dataLayer
  if (window.dataLayer) {
    const gaEvent = GA_EVENT_MAP[event];
    if (gaEvent) {
      const payload = { event: gaEvent };
      if (props.productId) {
        payload.ecommerce = {
          items: [{
            item_id: props.productId,
            item_name: props.name || '',
            price: props.price || 0,
            item_category: props.category || '',
          }],
        };
      }
      if (props.orderId) payload.transaction_id = props.orderId;
      if (props.value || props.cartValue) payload.value = props.value || props.cartValue;
      payload.currency = 'INR';
      window.dataLayer.push(payload);
    }
  }

  // gtag fallback
  if (window.gtag && GA_EVENT_MAP[event]) {
    window.gtag('event', GA_EVENT_MAP[event], {
      currency: 'INR',
      value: props.price || props.cartValue || props.value || 0,
    });
  }
}

// ── Identity merge after login ────────────────────────────────────────────

export async function mergeIdentity(userId) {
  const sessionId = getSessionId();
  try {
    await fetch(`${BACKEND_URL}/api/tracking/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId }),
    });
  } catch {
    // ignore
  }
}

// ── Consent management ────────────────────────────────────────────────────

export async function saveConsent(consent) {
  const sessionId = getSessionId();
  const userId = getUserId();
  try {
    await fetch(`${BACKEND_URL}/api/tracking/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId, ...consent }),
    });
    localStorage.setItem('_rt_consent', JSON.stringify({ ...consent, ts: Date.now() }));
  } catch {
    // ignore
  }
}

export function hasConsent() {
  try {
    const raw = localStorage.getItem('_rt_consent');
    if (!raw) return null; // not set yet
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Inject Facebook Pixel script ──────────────────────────────────────────

export function injectFacebookPixel(pixelId) {
  if (!pixelId || typeof window === 'undefined') return;
  if (window.fbq) return; // already loaded
  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

// ── Inject GTM ────────────────────────────────────────────────────────────

export function injectGTM(gtmId) {
  if (!gtmId || typeof window === 'undefined') return;
  if (window.dataLayer) return;
  window.dataLayer = window.dataLayer || [];
  (function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l !== 'dataLayer' ? '&l=' + l : '';
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
    f.parentNode.insertBefore(j, f);
  })(window, document, 'script', 'dataLayer', gtmId);
}
