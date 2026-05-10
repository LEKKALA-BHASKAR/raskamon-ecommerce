import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTracking } from '../../context/TrackingContext';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

const TABS = [
  { key: 'personalized', label: '✨ For You' },
  { key: 'trending', label: '🔥 Trending' },
  { key: 'similar', label: '🔍 Similar' },
  { key: 'frequentlyBoughtTogether', label: '🛍️ Often Bought' },
];

function getImage(product) {
  const img = (product.images || [])[0];
  if (!img) return null;
  if (img.startsWith('http')) return img;
  return `${BASE_URL}${img}`;
}

function ProductCard({ product }) {
  const { track } = useTracking();
  return (
    <Link
      to={`/products/${product.slug}`}
      style={{ textDecoration: 'none' }}
      onClick={() => track.productView(product)}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          transition: 'transform 0.2s, box-shadow 0.2s',
          height: '100%',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div
          style={{
            width: '100%',
            paddingTop: '100%',
            position: 'relative',
            background: '#f9fafb',
          }}
        >
          {getImage(product) && (
            <img
              src={getImage(product)}
              alt={product.name}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}
        </div>
        <div style={{ padding: '12px' }}>
          {product.brand && (
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {product.brand}
            </div>
          )}
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#1f2937',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              marginBottom: 6,
              minHeight: 36,
            }}
          >
            {product.name}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#7c3aed' }}>
            ₹{(product.price || 0).toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function RecommendedProducts({ title = 'Recommended For You' }) {
  const { recommendations } = useTracking();
  const [activeTab, setActiveTab] = useState('personalized');

  if (!recommendations) return null;

  const products = recommendations[activeTab] || [];
  const hasAnyProducts = TABS.some((t) => (recommendations[t.key] || []).length > 0);
  if (!hasAnyProducts) return null;

  return (
    <section style={{ margin: '40px 0' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, color: '#1f2937' }}>
        {title}
      </h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.filter((t) => (recommendations[t.key] || []).length > 0).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: activeTab === tab.key ? 'none' : '1px solid #e5e7eb',
              background: activeTab === tab.key
                ? 'linear-gradient(135deg,#7c3aed,#4f46e5)'
                : '#fff',
              color: activeTab === tab.key ? '#fff' : '#6b7280',
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Products grid */}
      {products.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      ) : (
        <div style={{ color: '#9ca3af', textAlign: 'center', padding: 32 }}>
          No recommendations yet. Keep browsing!
        </div>
      )}
    </section>
  );
}
