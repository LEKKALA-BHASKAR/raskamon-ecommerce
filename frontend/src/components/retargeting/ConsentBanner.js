import React from 'react';
import { useTracking } from '../../context/TrackingContext';

export default function ConsentBanner() {
  const { showConsentBanner, acceptConsent, rejectConsent } = useTracking();

  if (!showConsentBanner) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(17,17,27,0.97)',
        color: '#fff',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        animation: 'slideUp 0.3s ease',
      }}
    >
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      <div style={{ flex: 1, minWidth: 260 }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
          We use cookies to personalize your experience, show relevant products, and improve our
          services. By continuing, you agree to our{' '}
          <a href="/privacy" style={{ color: '#a78bfa', textDecoration: 'underline' }}>
            Privacy Policy
          </a>
          .
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button
          onClick={rejectConsent}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Reject
        </button>
        <button
          onClick={() => acceptConsent(false)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Analytics Only
        </button>
        <button
          onClick={() => acceptConsent(true)}
          style={{
            background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            border: 'none',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Accept All
        </button>
      </div>
    </div>
  );
}
