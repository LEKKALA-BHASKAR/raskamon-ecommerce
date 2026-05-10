import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTracking } from '../../context/TrackingContext';

/**
 * Dynamic retargeting banner shown to users in high-intent or cart-abandoned segments.
 * Displays a personalized message with a CTA.
 */
export default function RetargetingBanner() {
  const { recommendations, abandonedCart } = useTracking();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Show cart recovery banner
  if (abandonedCart) {
    const { items = [], cartValue = 0 } = abandonedCart;
    return (
      <div
        style={{
          background: 'linear-gradient(135deg,#fef3c7,#fde68a)',
          border: '1px solid #f59e0b',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          margin: '16px 0',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 28 }}>🛒</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#92400e' }}>
            You have {items.length} item{items.length !== 1 ? 's' : ''} waiting in your cart
          </div>
          <div style={{ fontSize: 13, color: '#b45309', marginTop: 2 }}>
            Total: ₹{cartValue.toLocaleString('en-IN')} — Complete your purchase before stock runs out!
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Link
            to="/checkout"
            style={{
              background: '#d97706',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Complete Order
          </Link>
          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'transparent',
              border: '1px solid #d97706',
              color: '#d97706',
              padding: '8px 12px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Show "trending near you" banner if trending products exist
  const trending = recommendations?.trending || [];
  if (trending.length === 0) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
        border: '1px solid #c4b5fd',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        margin: '16px 0',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 28 }}>🔥</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#5b21b6' }}>
          Trending right now
        </div>
        <div style={{ fontSize: 13, color: '#7c3aed', marginTop: 2 }}>
          {trending[0]?.name} and {trending.length - 1} more products are popular today
        </div>
      </div>
      <Link
        to="/products"
        style={{
          background: '#7c3aed',
          color: '#fff',
          padding: '8px 18px',
          borderRadius: 8,
          textDecoration: 'none',
          fontSize: 13,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        Shop Now
      </Link>
    </div>
  );
}
