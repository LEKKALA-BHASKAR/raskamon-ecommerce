/**
 * TrackingContext
 * Provides tracking, consent state, pixel config, and retargeting data
 * across the entire app.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  track, getSessionId, getUserId, hasConsent, saveConsent,
  mergeIdentity, injectFacebookPixel, injectGTM,
} from '../utils/trackingPixel';
import { useAuth } from './AuthContext';
import api from '../utils/api';

const TrackingContext = createContext({});

export const useTracking = () => useContext(TrackingContext);

export const TrackingProvider = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [consent, setConsent] = useState(hasConsent());
  const [showConsentBanner, setShowConsentBanner] = useState(false);
  const [abandonedCart, setAbandonedCart] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pixelConfig, setPixelConfig] = useState([]);
  const initialized = useRef(false);
  const prevUserId = useRef(null);

  // ── Initialize pixels from backend config ─────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.get('/tracking/pixel-config');
        setPixelConfig(data.pixels || []);
        for (const pixel of data.pixels || []) {
          if (pixel.platform === 'facebook' && pixel.pixelId) {
            injectFacebookPixel(pixel.pixelId);
          }
          if (pixel.platform === 'gtm' && pixel.pixelId) {
            injectGTM(pixel.pixelId);
          }
        }
      } catch {
        // pixel config fetch failure is non-fatal
      }
    };
    init();
  }, []);

  // ── Show consent banner if no consent saved ───────────────────────────

  useEffect(() => {
    if (consent === null) {
      setTimeout(() => setShowConsentBanner(true), 2000);
    }
  }, [consent]);

  // ── Track page views on route change ─────────────────────────────────

  useEffect(() => {
    if (consent && !consent.analytics) return;
    track.pageView(location.pathname);
  }, [location.pathname, consent]);

  // ── Identity merge after login ────────────────────────────────────────

  useEffect(() => {
    const userId = user?._id || user?.id;
    if (userId && userId !== prevUserId.current) {
      prevUserId.current = userId;
      mergeIdentity(userId);
      fetchAbandonedCart(userId);
      fetchNotifications(userId);
      fetchRecommendations(userId);
    }
  }, [user]);

  // ── Session start ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      track.sessionStart();
      fetchRecommendations(getUserId());
    }
  }, []);

  // ── Fetch abandoned cart (for popup) ─────────────────────────────────

  const fetchAbandonedCart = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const { data } = await api.get(`/retargeting/abandoned-cart/${userId}`);
      if (data.hasAbandonedCart) {
        setAbandonedCart(data.cart);
      }
    } catch {
      // ignore
    }
  }, []);

  // ── Fetch in-app notifications ────────────────────────────────────────

  const fetchNotifications = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const { data } = await api.get(`/retargeting/notifications/${userId}?unread_only=true`);
      setNotifications(data.notifications || []);
    } catch {
      // ignore
    }
  }, []);

  // ── Fetch recommendations ─────────────────────────────────────────────

  const fetchRecommendations = useCallback(async (userId) => {
    try {
      const params = new URLSearchParams({ sessionId: getSessionId() });
      if (userId) params.set('userId', userId);
      const { data } = await api.get(`/recommendations?${params}`);
      setRecommendations(data);
    } catch {
      // ignore
    }
  }, []);

  // ── Accept / reject consent ───────────────────────────────────────────

  const acceptConsent = useCallback(async (marketing = true) => {
    const c = { analytics: true, marketing, functional: true };
    await saveConsent(c);
    setConsent(c);
    setShowConsentBanner(false);
  }, []);

  const rejectConsent = useCallback(async () => {
    const c = { analytics: false, marketing: false, functional: true };
    await saveConsent(c);
    setConsent(c);
    setShowConsentBanner(false);
  }, []);

  // ── Dismiss abandoned cart popup ──────────────────────────────────────

  const dismissAbandonedCart = useCallback(async () => {
    const userId = getUserId();
    if (userId) {
      await api.post(`/retargeting/abandoned-cart/${userId}/dismiss`).catch(() => {});
    }
    setAbandonedCart(null);
  }, []);

  // ── Mark notification read ────────────────────────────────────────────

  const markNotificationRead = useCallback(async (notificationId) => {
    try {
      await api.post(`/retargeting/notifications/${notificationId}/read`);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch {
      // ignore
    }
  }, []);

  return (
    <TrackingContext.Provider
      value={{
        track,
        consent,
        showConsentBanner,
        acceptConsent,
        rejectConsent,
        abandonedCart,
        dismissAbandonedCart,
        recommendations,
        fetchRecommendations,
        notifications,
        markNotificationRead,
        fetchNotifications,
        pixelConfig,
        sessionId: getSessionId(),
      }}
    >
      {children}
    </TrackingContext.Provider>
  );
};
