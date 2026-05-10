import React from 'react';
import { Link } from 'react-router-dom';
import { useTracking } from '../../context/TrackingContext';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

function getImage(product) {
  const img = (product.images || [])[0];
  if (!img) return null;
  if (img.startsWith('http')) return img;
  return `${BASE_URL}${img}`;
}

export default function RecentlyViewed() {
  const { recommendations } = useTracking();
  const products = recommendations?.recentlyViewed || [];
  if (products.length === 0) return null;

  return (
    <section style={{ margin: '32px 0' }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 16,
          color: '#1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>👁️</span> Recently Viewed
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {products.map((p) => (
          <Link
            key={p._id}
            to={`/products/${p.slug}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
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
                  background: '#f3f4f6',
                }}
              >
                {getImage(p) && (
                  <img
                    src={getImage(p)}
                    alt={p.name}
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
              <div style={{ padding: '10px' }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#1f2937',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    marginBottom: 4,
                  }}
                >
                  {p.name}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed' }}>
                  ₹{(p.price || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
