/**
 * useTracking hook
 * Convenience wrapper — components can call individual tracking functions
 * without importing the full context.
 */
import { useCallback } from 'react';
import { useTracking as _useTracking } from '../context/TrackingContext';

export default function useTracking() {
  const ctx = _useTracking();
  const { track, consent } = ctx;

  const allowed = consent === null || consent?.analytics !== false;

  const trackProductView = useCallback(
    (product) => { if (allowed) track.productView(product); },
    [allowed, track]
  );

  const trackAddToCart = useCallback(
    (product, quantity) => { if (allowed) track.addToCart(product, quantity); },
    [allowed, track]
  );

  const trackBeginCheckout = useCallback(
    (items, cartValue) => { if (allowed) track.beginCheckout(items, cartValue); },
    [allowed, track]
  );

  const trackPurchase = useCallback(
    (orderId, value, items) => { if (allowed) track.purchase(orderId, value, items); },
    [allowed, track]
  );

  const trackSearch = useCallback(
    (query) => { if (allowed) track.search(query); },
    [allowed, track]
  );

  const trackCategoryView = useCallback(
    (category) => { if (allowed) track.categoryView(category); },
    [allowed, track]
  );

  const trackWishlistAdd = useCallback(
    (product) => { if (allowed) track.wishlistAdd(product); },
    [allowed, track]
  );

  return {
    ...ctx,
    trackProductView,
    trackAddToCart,
    trackBeginCheckout,
    trackPurchase,
    trackSearch,
    trackCategoryView,
    trackWishlistAdd,
  };
}
