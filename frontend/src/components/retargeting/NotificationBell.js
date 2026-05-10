import React, { useState } from 'react';
import { useTracking } from '../../context/TrackingContext';

export default function NotificationBell() {
  const { notifications, markNotificationRead } = useTracking();
  const [open, setOpen] = useState(false);
  const count = notifications.length;

  if (count === 0) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: 4,
          fontSize: 22,
        }}
        aria-label="Notifications"
      >
        🔔
        {count > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              width: 16,
              height: 16,
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9990 }}
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '110%',
              width: 320,
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              zIndex: 9991,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #f3f4f6',
                fontWeight: 700,
                fontSize: 14,
                color: '#1f2937',
              }}
            >
              Notifications ({count})
            </div>
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {notifications.map((n) => (
                <div
                  key={n._id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f9fafb',
                    background: n.read ? '#fff' : '#faf5ff',
                    cursor: 'pointer',
                  }}
                  onClick={() => markNotificationRead(n._id)}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    {new Date(n.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
