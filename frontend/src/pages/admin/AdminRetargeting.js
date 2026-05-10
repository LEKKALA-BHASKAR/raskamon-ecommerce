import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';

// ── Utility ───────────────────────────────────────────────────────────────

const fmt = (n) => (n || 0).toLocaleString('en-IN');
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '0%');

const SEGMENT_COLORS = {
  hot_lead: '#ef4444',
  cart_abandoned: '#f97316',
  high_intent: '#eab308',
  repeat_customer: '#22c55e',
  existing_customer: '#10b981',
  inactive: '#6b7280',
  new_visitor: '#3b82f6',
  high_value: '#8b5cf6',
  cold_lead: '#94a3b8',
};

const CHANNEL_ICONS = {
  email: '📧',
  whatsapp: '💬',
  push: '🔔',
  sms: '📱',
  inapp: '🔵',
  social: '📲',
};

// ── Section: Overview ─────────────────────────────────────────────────────

function OverviewTab() {
  const [data, setData] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [ovRes, fnRes] = await Promise.all([
          api.get('/admin/retargeting/analytics/overview?days=30'),
          api.get('/admin/retargeting/analytics/funnel?days=7'),
        ]);
        setData(ovRes.data);
        setFunnel(fnRes.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <p style={{ color: '#9ca3af' }}>No data yet.</p>;

  const totalSent = (data.campaignStats || []).reduce((s, c) => s + (c.sent || 0), 0);
  const totalClicked = (data.campaignStats || []).reduce((s, c) => s + (c.clicked || 0), 0);
  const totalConverted = (data.campaignStats || []).reduce((s, c) => s + (c.converted || 0), 0);

  const funnelSteps = funnel?.funnel || [];
  const maxFunnelVal = Math.max(...funnelSteps.map((s) => s.sessions), 1);

  return (
    <div>
      {/* KPI cards */}
      <div style={styles.kpiRow}>
        <KPICard label="Abandoned Carts" value={fmt(data.abandonedCarts)} color="#f97316" icon="🛒" />
        <KPICard label="Recovered Carts" value={fmt(data.recoveredCarts)} color="#22c55e" icon="✅" />
        <KPICard label="Recovery Rate" value={`${data.recoveryRate || 0}%`} color="#7c3aed" icon="📈" />
        <KPICard label="Campaigns Sent" value={fmt(totalSent)} color="#3b82f6" icon="📤" />
        <KPICard label="Clicked" value={fmt(totalClicked)} color="#eab308" icon="👆" />
        <KPICard label="Converted" value={fmt(totalConverted)} color="#10b981" icon="💰" />
      </div>

      {/* Funnel */}
      {funnelSteps.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Conversion Funnel (7 days)</h3>
          {funnelSteps.map((step, i) => {
            const width = Math.max((step.sessions / maxFunnelVal) * 100, 2);
            const dropOff = i > 0
              ? Math.round((1 - step.sessions / funnelSteps[i - 1].sessions) * 100)
              : 0;
            return (
              <div key={step.event} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ fontWeight: 500 }}>{step.event.replace(/_/g, ' ')}</span>
                  <span>
                    {fmt(step.sessions)} sessions
                    {i > 0 && <span style={{ color: '#ef4444', marginLeft: 8 }}>↓{dropOff}%</span>}
                  </span>
                </div>
                <div style={{ height: 28, background: '#f3f4f6', borderRadius: 6, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${width}%`,
                      background: `hsl(${220 + i * 20},70%,55%)`,
                      borderRadius: 6,
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Daily volume chart (simple bars) */}
      {(data.daily || []).length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Daily Tracking Events (30 days)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, overflowX: 'auto' }}>
            {data.daily.map((d) => {
              const maxVal = Math.max(...data.daily.map((x) => x.events), 1);
              const h = Math.max((d.events / maxVal) * 70, 2);
              return (
                <div key={d.date} title={`${d.date}: ${d.events} events`} style={{ textAlign: 'center', flex: '0 0 auto', width: 14 }}>
                  <div
                    style={{
                      width: '100%',
                      height: h,
                      background: 'linear-gradient(to top,#7c3aed,#a78bfa)',
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: Campaigns ────────────────────────────────────────────────────

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', trigger: 'cart_abandoned_30m', channels: ['inapp'],
    subject: '', body: '', status: 'active', priority: 5,
    frequencyCap: { maxPerUser: 1, windowDays: 1 },
  });

  const load = useCallback(async () => {
    const { data } = await api.get('/admin/retargeting/campaigns');
    setCampaigns(data.campaigns || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => {
    await api.post(`/admin/retargeting/campaigns/${id}/toggle`);
    load();
  };

  const deleteC = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    await api.delete(`/admin/retargeting/campaigns/${id}`);
    load();
  };

  const loadAnalytics = async (id) => {
    setSelected(id);
    const { data } = await api.get(`/admin/retargeting/campaigns/${id}/analytics`);
    setAnalytics(data);
  };

  const save = async () => {
    await api.post('/admin/retargeting/campaigns', form);
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={styles.cardTitle}>Retargeting Campaigns</h3>
        <button onClick={() => setShowForm(true)} style={styles.btn}>+ New Campaign</button>
      </div>

      {showForm && (
        <div style={styles.card}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>Create Campaign</h4>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Name</label>
              <input style={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Trigger</label>
              <select style={styles.input} value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })}>
                <option value="cart_abandoned_30m">Cart Abandoned — 30 min</option>
                <option value="cart_abandoned_6h">Cart Abandoned — 6 hr</option>
                <option value="cart_abandoned_24h">Cart Abandoned — 24 hr</option>
                <option value="cart_abandoned_3d">Cart Abandoned — 3 days</option>
                <option value="high_intent_no_purchase">High Intent — No Purchase</option>
                <option value="inactive_reactivation">Inactive Reactivation</option>
                <option value="comeback_offer">Comeback Offer</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Subject / Title</label>
              <input style={styles.input} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label style={styles.label}>Priority (1–10)</label>
              <input type="number" style={styles.input} value={form.priority} min={1} max={10}
                onChange={(e) => setForm({ ...form, priority: +e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}>Body / Message (use {'{{name}}'}, {'{{cart_value}}'}, {'{{item_count}}'})</label>
            <textarea style={{ ...styles.input, height: 80, resize: 'vertical' }}
              value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}>Channels</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['email', 'whatsapp', 'push', 'sms', 'inapp'].map((ch) => (
                <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={form.channels.includes(ch)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...form.channels, ch]
                        : form.channels.filter((c) => c !== ch);
                      setForm({ ...form, channels: updated });
                    }}
                  />
                  {CHANNEL_ICONS[ch]} {ch}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={styles.btn}>Save Campaign</button>
            <button onClick={() => setShowForm(false)} style={styles.btnOutline}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {campaigns.map((c) => (
          <div key={c._id} style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>⚡ {c.trigger}</span>
                  <span>{(c.channels || []).map((ch) => CHANNEL_ICONS[ch] || ch).join(' ')}</span>
                  <span>Priority: {c.priority}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(c.sentCount)}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Sent</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#eab308' }}>{fmt(c.clickCount)}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Clicks</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>{fmt(c.conversionCount)}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>Converted</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: c.status === 'active' ? '#dcfce7' : '#f3f4f6',
                    color: c.status === 'active' ? '#16a34a' : '#6b7280',
                  }}>
                    {c.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => toggle(c._id)} style={styles.iconBtn} title="Toggle status">
                    {c.status === 'active' ? '⏸' : '▶️'}
                  </button>
                  <button onClick={() => loadAnalytics(c._id)} style={styles.iconBtn} title="Analytics">📊</button>
                  <button onClick={() => deleteC(c._id)} style={{ ...styles.iconBtn, color: '#ef4444' }} title="Delete">🗑</button>
                </div>
              </div>
            </div>
            {selected === c._id && analytics && (
              <div style={{ marginTop: 16, padding: '12px 0 0', borderTop: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <Stat label="Sent" value={analytics.sent} />
                  <Stat label="Opened" value={analytics.opened} sub={pct(analytics.opened, analytics.sent)} />
                  <Stat label="Clicked" value={analytics.clicked} sub={pct(analytics.clicked, analytics.sent)} />
                  <Stat label="Converted" value={analytics.converted} sub={pct(analytics.converted, analytics.sent)} />
                </div>
              </div>
            )}
          </div>
        ))}
        {campaigns.length === 0 && <p style={{ color: '#9ca3af' }}>No campaigns yet.</p>}
      </div>
    </div>
  );
}

// ── Section: Audiences ────────────────────────────────────────────────────

function AudiencesTab() {
  const [segments, setSegments] = useState([]);
  const [users, setUsers] = useState(null);
  const [activeSegment, setActiveSegment] = useState(null);

  useEffect(() => {
    api.get('/admin/retargeting/segments').then(({ data }) => setSegments(data.segments || []));
  }, []);

  const loadUsers = async (segId) => {
    setActiveSegment(segId);
    const { data } = await api.get(`/admin/retargeting/segments/${segId}/users?limit=20`);
    setUsers(data);
  };

  return (
    <div>
      <h3 style={styles.cardTitle}>Audience Segments</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginBottom: 24 }}>
        {segments.map((seg) => (
          <div
            key={seg.id || seg._id}
            onClick={() => loadUsers(seg.id || seg._id)}
            style={{
              ...styles.card,
              cursor: 'pointer',
              borderLeft: `4px solid ${SEGMENT_COLORS[seg.id] || '#7c3aed'}`,
              transition: 'box-shadow 0.2s',
              background: activeSegment === (seg.id || seg._id) ? '#faf5ff' : '#fff',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{seg.icon || '👥'}</div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{seg.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>{seg.description}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: SEGMENT_COLORS[seg.id] || '#7c3aed' }}>
              {fmt(seg.userCount)}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>users</div>
          </div>
        ))}
      </div>

      {users && (
        <div style={styles.card}>
          <h4 style={{ margin: '0 0 12px', fontSize: 15 }}>
            Segment Users — {activeSegment} ({fmt(users.total)} total)
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['User ID', 'Score', 'Segment', 'Last Activity', 'Cart?'].map((h) => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(users.users || []).map((u, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{(u.userId || u._id || '').slice(-8)}</td>
                    <td style={styles.td}>{u.engagementScore || u.ltv || 0}</td>
                    <td style={styles.td}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: 11,
                        background: '#ede9fe', color: '#7c3aed',
                      }}>
                        {u.segment || activeSegment}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {u.lastActivity
                        ? new Date(u.lastActivity).toLocaleDateString('en-IN')
                        : u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td style={styles.td}>{u.cartAbandoned ? '🛒 Yes' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section: Abandoned Carts ──────────────────────────────────────────────

function AbandonedCartsTab() {
  const [carts, setCarts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    api.get('/admin/retargeting/abandoned-carts').then(({ data }) => {
      setCarts(data.carts || []);
      setTotal(data.total || 0);
      setTotalValue(data.totalValue || 0);
    });
  }, []);

  return (
    <div>
      <div style={styles.kpiRow}>
        <KPICard label="Abandoned Carts" value={fmt(total)} color="#f97316" icon="🛒" />
        <KPICard label="Total Lost Revenue" value={`₹${fmt(totalValue)}`} color="#ef4444" icon="💸" />
      </div>
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Abandoned Cart List</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['User ID', 'Items', 'Cart Value', 'Abandoned At', 'Reminders Sent', 'Status'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {carts.map((c, i) => (
                <tr key={i}>
                  <td style={styles.td}>{c.userId ? c.userId.slice(-8) : 'Anon'}</td>
                  <td style={styles.td}>{(c.items || []).length}</td>
                  <td style={styles.td} style={{ ...styles.td, fontWeight: 600, color: '#7c3aed' }}>
                    ₹{fmt(c.cartValue)}
                  </td>
                  <td style={styles.td}>{new Date(c.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td style={styles.td}>{(c.remindersScheduled || []).length}</td>
                  <td style={styles.td}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 11,
                      background: c.status === 'recovered' ? '#dcfce7' : '#fef3c7',
                      color: c.status === 'recovered' ? '#16a34a' : '#92400e',
                    }}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {carts.length === 0 && (
                <tr><td colSpan={6} style={{ ...styles.td, textAlign: 'center', color: '#9ca3af' }}>No abandoned carts</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Section: Pixel Config ─────────────────────────────────────────────────

function PixelConfigTab() {
  const [pixels, setPixels] = useState([]);
  const [form, setForm] = useState({ platform: 'facebook', pixelId: '', accessToken: '', active: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/admin/retargeting/pixels');
    setPixels(data.pixels || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    await api.post('/admin/retargeting/pixels', form).finally(() => setSaving(false));
    load();
    setForm({ platform: 'facebook', pixelId: '', accessToken: '', active: true });
  };

  const del = async (platform) => {
    await api.delete(`/admin/retargeting/pixels/${platform}`);
    load();
  };

  return (
    <div>
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Add / Update Pixel</h3>
        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>Platform</label>
            <select style={styles.input} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              <option value="facebook">Facebook / Meta Pixel</option>
              <option value="google_ads">Google Ads Remarketing</option>
              <option value="gtm">Google Tag Manager</option>
              <option value="tiktok">TikTok Pixel</option>
              <option value="custom">Custom Pixel</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Pixel ID / Container ID</label>
            <input style={styles.input} placeholder="Enter ID..." value={form.pixelId}
              onChange={(e) => setForm({ ...form, pixelId: e.target.value })} />
          </div>
          <div>
            <label style={styles.label}>Access Token (optional, for server-side)</label>
            <input type="password" style={styles.input} placeholder="Token..."
              value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
          </div>
        </div>
        <button onClick={save} disabled={saving} style={{ ...styles.btn, marginTop: 12 }}>
          {saving ? 'Saving…' : 'Save Pixel'}
        </button>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Configured Pixels</h3>
        {pixels.length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>No pixels configured yet.</p>}
        {pixels.map((p) => (
          <div key={p.platform} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: '1px solid #f3f4f6',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{p.platform}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>ID: {p.pixelId}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                padding: '2px 8px', borderRadius: 20, fontSize: 11,
                background: p.active ? '#dcfce7' : '#f3f4f6',
                color: p.active ? '#16a34a' : '#6b7280',
              }}>
                {p.active ? 'Active' : 'Inactive'}
              </span>
              <button onClick={() => del(p.platform)} style={{ ...styles.iconBtn, color: '#ef4444' }}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section: Tracking Analytics ───────────────────────────────────────────

function TrackingTab() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/tracking/analytics/summary').then(({ data }) => setSummary(data));
  }, []);

  if (!summary) return <Spinner />;

  return (
    <div>
      <div style={styles.kpiRow}>
        <KPICard label="Events Today" value={fmt(summary.todayEvents)} color="#7c3aed" icon="📊" />
        <KPICard label="Events (7d)" value={fmt(summary.weekEvents)} color="#3b82f6" icon="📈" />
        <KPICard label="Sessions Today" value={fmt(summary.uniqueSessionsToday)} color="#10b981" icon="👤" />
        <KPICard label="Total Profiles" value={fmt(summary.totalProfiles)} color="#f97316" icon="🎯" />
        <KPICard label="Abandoned Carts" value={fmt(summary.abandonedCarts)} color="#ef4444" icon="🛒" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Event Breakdown (Today)</h3>
          {(summary.topEvents || []).map((e) => (
            <div key={e._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb', fontSize: 13 }}>
              <span>{e._id}</span>
              <span style={{ fontWeight: 600 }}>{fmt(e.count)}</span>
            </div>
          ))}
        </div>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Segment Breakdown</h3>
          {(summary.segmentBreakdown || []).map((s) => (
            <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb', fontSize: 13 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: SEGMENT_COLORS[s._id] || '#7c3aed', display: 'inline-block' }} />
                {s._id || 'unknown'}
              </span>
              <span style={{ fontWeight: 600 }}>{fmt(s.count)}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Top Viewed Products (7d)</h3>
        {(summary.topProducts || []).map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb', fontSize: 13 }}>
            <span style={{ color: '#6b7280', marginRight: 8 }}>#{i + 1}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p._id || '—'}</span>
            <span style={{ fontWeight: 600, color: '#7c3aed', marginLeft: 8 }}>{fmt(p.views)} views</span>
          </div>
        ))}
        {(summary.topProducts || []).length === 0 && <p style={{ color: '#9ca3af', fontSize: 13 }}>No product view data yet.</p>}
      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────

function KPICard({ label, value, color, icon }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '16px 20px',
      border: '1px solid #e5e7eb',
      borderTop: `3px solid ${color}`,
      flex: '1 1 140px',
    }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(value)}</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</div>}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
      Loading…
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: '📊 Overview' },
  { key: 'campaigns', label: '🚀 Campaigns' },
  { key: 'audiences', label: '👥 Audiences' },
  { key: 'abandoned', label: '🛒 Abandoned Carts' },
  { key: 'pixels', label: '🔲 Pixel Config' },
  { key: 'tracking', label: '📡 Tracking Analytics' },
];

export default function AdminRetargeting() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#1f2937' }}>
          🎯 Retargeting & Remarketing Engine
        </h1>
        <p style={{ color: '#6b7280', marginTop: 6, fontSize: 14 }}>
          Behavioral tracking, audience segmentation, automated campaigns, and conversion analytics.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === t.key ? '2px solid #7c3aed' : '2px solid transparent',
              marginBottom: -2,
              color: activeTab === t.key ? '#7c3aed' : '#6b7280',
              fontWeight: activeTab === t.key ? 700 : 400,
              cursor: 'pointer',
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'campaigns' && <CampaignsTab />}
      {activeTab === 'audiences' && <AudiencesTab />}
      {activeTab === 'abandoned' && <AbandonedCartsTab />}
      {activeTab === 'pixels' && <PixelConfigTab />}
      {activeTab === 'tracking' && <TrackingTab />}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────

const styles = {
  kpiRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '20px',
    border: '1px solid #e5e7eb',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    margin: '0 0 16px',
    color: '#1f2937',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
    gap: 12,
    marginBottom: 12,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
  },
  btn: {
    background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
    color: '#fff',
    border: 'none',
    padding: '9px 18px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  btnOutline: {
    background: '#fff',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    padding: '9px 18px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: '4px',
    borderRadius: 6,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  th: {
    textAlign: 'left',
    padding: '8px 12px',
    background: '#f9fafb',
    color: '#6b7280',
    fontWeight: 600,
    fontSize: 12,
    borderBottom: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '10px 12px',
    borderBottom: '1px solid #f3f4f6',
    color: '#374151',
  },
};
