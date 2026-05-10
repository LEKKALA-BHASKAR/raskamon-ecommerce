import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTracking } from '../../context/TrackingContext';

export default function AbandonedCartPopup() {
  const { abandonedCart, dismissAbandonedCart } = useTracking();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!abandonedCart || dismissed) return null;

  const { items = [], cartValue = 0 } = abandonedCart;
  const itemCount = items.length;

  const handleRecover = () => {
    setDismissed(true);
    navigate('/checkout');
  };

  const handleDismiss = () => {
    setDismissed(true);
    dismissAbandonedCart();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9998,
        width: 340,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        animation: 'fadeInUp 0.4s ease',
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>
          🛒 Your cart misses you!
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.8)',
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '16px' }}>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: '#374151' }}>
          You left{' '}
          <strong>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </strong>{' '}
          worth{' '}
          <strong style={{ color: '#7c3aed' }}>₹{cartValue.toLocaleString('en-IN')}</strong> in
          your cart.
        </p>

        {/* Item previews */}
        {items.slice(0, 3).map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
              padding: '6px 8px',
              background: '#f9fafb',
              borderRadius: 8,
            }}
          >
            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }}
              />
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#1f2937',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.name}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                Qty: {item.quantity} · ₹{(item.price || 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={handleRecover}
          style={{
            width: '100%',
            marginTop: 12,
            background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '12px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseOver={(e) => (e.target.style.opacity = 0.9)}
          onMouseOut={(e) => (e.target.style.opacity = 1)}
        >
          Complete Purchase →
        </button>

        <button
          onClick={handleDismiss}
          style={{
            width: '100%',
            marginTop: 8,
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            fontSize: 12,
            cursor: 'pointer',
            padding: '6px',
          }}
        >
          No thanks, maybe later
        </button>
      </div>
    </div>
  );
}
