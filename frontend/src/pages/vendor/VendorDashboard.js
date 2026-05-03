import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import {
  Package, ShoppingBag, TrendingUp, Wallet, AlertTriangle, Clock,
  CheckCircle2, Plus, Star, Download
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend
} from 'recharts';
import { MOCK_VENDOR_STATS } from '../../utils/mockData';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtK = v => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`;

const STATUS_COLORS = {
  delivered: { bg: 'bg-green-100', text: 'text-green-700' },
  shipped: { bg: 'bg-purple-100', text: 'text-purple-700' },
  confirmed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  placed: { bg: 'bg-amber-100', text: 'text-amber-700' },
};

const StatCard = ({ icon: Icon, label, value, sub, color = '#1A3C34', badge }) => (
  <div className="bg-[var(--sattva-surface)] rounded-2xl p-5 border border-[color:var(--sattva-border)] hover:shadow-sm transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
      {badge !== undefined && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>{badge}</span>
      )}
    </div>
    <p className="text-2xl font-black tabular-nums text-[var(--sattva-ink)]">{value ?? '—'}</p>
    <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

export default function VendorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(MOCK_VENDOR_STATS);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.get('/vendor/analytics/overview')
      .then(r => {
        if (r.data?.data) setData({ ...MOCK_VENDOR_STATS, ...r.data.data });
      })
      .catch(() => {});
  }, []);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'products', label: 'Products' },
    { key: 'orders', label: 'Orders' },
    { key: 'analytics', label: 'Analytics' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sattva-ink)]">
            {user?.store_name || user?.name || 'Vendor'} Store
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your products, orders, and earnings</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[color:var(--sattva-border)] rounded-xl hover:bg-[var(--sattva-muted)] transition-colors">
            <Download size={13} /> Export
          </button>
          <Link
            to="/vendor/products/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--sattva-forest)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> Add Product
          </Link>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-0 border-b border-[color:var(--sattva-border)]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-[var(--sattva-forest)] text-[var(--sattva-forest)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Package} label="Active Products" value={data.products.active} sub={`${data.products.total} total`} color="#1A3C34" />
            <StatCard icon={Clock} label="Pending Approval" value={data.products.pending_approval} badge={data.products.pending_approval > 0 ? 'Action' : undefined} color="#F59E0B" />
            <StatCard icon={ShoppingBag} label="Total Orders" value={data.orders.total} sub={`${data.orders.pending} pending`} color="#3B82F6" />
            <StatCard icon={Star} label="Avg Rating" value={data.ratings.average} sub={`${data.ratings.count} reviews`} color="#F59E0B" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <StatCard icon={TrendingUp} label="Total Revenue" value={fmtK(data.revenue.total)} sub="All time" color="#1A3C34" />
            <StatCard icon={TrendingUp} label="This Month" value={fmtK(data.revenue.this_month)} color="#8B5CF6" />
            <StatCard icon={Wallet} label="Pending Payout" value={fmtK(data.revenue.pending_payout)} sub="Next: Fri 9th May" color="#10B981" />
          </div>

          {/* Revenue Chart */}
          <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading text-base font-semibold text-[var(--sattva-ink)]">Monthly Revenue</h3>
                <p className="text-xs text-gray-400">Last 6 months performance</p>
              </div>
              <button onClick={() => {}} className="text-xs text-[var(--sattva-forest)] flex items-center gap-1">
                <Download size={11} /> CSV
              </button>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.monthlyRevenue} margin={{ left: -10 }}>
                <defs>
                  <linearGradient id="vRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A3C34" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1A3C34" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={fmtK} />
                <Tooltip formatter={v => [fmtK(v), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#1A3C34" strokeWidth={2.5} fill="url(#vRevGrad)" dot={{ r: 4, fill: '#1A3C34' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Orders + Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[color:var(--sattva-border)] flex justify-between items-center">
                <h3 className="font-semibold text-[var(--sattva-ink)]">Recent Orders</h3>
                <button onClick={() => setActiveTab('orders')} className="text-xs text-[var(--sattva-forest)] font-medium">View All →</button>
              </div>
              <div className="divide-y divide-[color:var(--sattva-border)]">
                {data.recentOrders.map(o => {
                  const st = STATUS_COLORS[o.status] || { bg: 'bg-gray-100', text: 'text-gray-600' };
                  return (
                    <div key={o.id} className="px-5 py-3.5 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--sattva-muted)] flex items-center justify-center text-xs font-bold text-[var(--sattva-forest)]">
                        {o.customer?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--sattva-ink)] truncate">{o.customer} · <span className="text-gray-500">{o.product}</span></p>
                        <p className="text-xs text-gray-400">Qty: {o.qty} · {o.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[var(--sattva-forest)]">{fmt(o.amount)}</p>
                        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${st.bg} ${st.text}`}>{o.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-5">
              <h3 className="font-semibold text-[var(--sattva-ink)] mb-4">Top Products</h3>
              <div className="space-y-4">
                {data.topProducts.map((p, i) => {
                  const maxRev = data.topProducts[0]?.revenue || 1;
                  const pct = Math.round((p.revenue / maxRev) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-5 h-5 rounded-full bg-[var(--sattva-muted)] flex items-center justify-center text-[10px] font-black text-[var(--sattva-forest)]">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[var(--sattva-ink)] truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.units} units · ★ {p.rating}</p>
                        </div>
                        <p className="text-sm font-black text-[var(--sattva-forest)]">{fmtK(p.revenue)}</p>
                      </div>
                      <div className="h-1.5 bg-[var(--sattva-muted)] rounded-full ml-7 overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--sattva-forest)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: data.products.total, color: '#6B7280' },
              { label: 'Active', value: data.products.active, color: '#10B981' },
              { label: 'Pending', value: data.products.pending_approval, color: '#F59E0B' },
              { label: 'Rejected', value: data.products.rejected, color: '#EF4444' },
            ].map(s => (
              <div key={s.label} className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-5 text-center">
                <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-6 text-center">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm mb-4">Manage your product listings</p>
            <div className="flex gap-3 justify-center">
              <Link to="/vendor/products" className="px-5 py-2.5 text-sm font-semibold bg-[var(--sattva-forest)] text-white rounded-xl hover:opacity-90">View All Products</Link>
              <Link to="/vendor/products/new" className="px-5 py-2.5 text-sm font-semibold border border-[color:var(--sattva-border)] text-[var(--sattva-ink)] rounded-xl hover:bg-[var(--sattva-muted)]">+ Add New</Link>
            </div>
          </div>
          {data.products.pending_approval > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
              <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">{data.products.pending_approval} products pending approval</p>
                <p className="text-xs text-amber-700 mt-0.5">Products are reviewed within 24–48 hours. You'll be notified once approved.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[color:var(--sattva-border)] flex justify-between items-center">
            <h3 className="font-semibold text-[var(--sattva-ink)]">All Orders</h3>
            <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[color:var(--sattva-border)] rounded-lg hover:bg-[var(--sattva-muted)]">
              <Download size={12} /> Export CSV
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-[var(--sattva-muted)]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--sattva-border)]">
              {data.recentOrders.map(o => {
                const st = STATUS_COLORS[o.status] || { bg: 'bg-gray-100', text: 'text-gray-600' };
                return (
                  <tr key={o.id} className="hover:bg-[var(--sattva-muted)]/40">
                    <td className="px-6 py-3.5 font-medium">{o.customer}</td>
                    <td className="px-4 py-3.5 text-gray-600">{o.product}</td>
                    <td className="px-4 py-3.5 text-center">{o.qty}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-[var(--sattva-forest)]">{fmt(o.amount)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${st.bg} ${st.text}`}>{o.status}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right text-xs text-gray-400">{o.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-5">
            <h3 className="font-heading text-base font-semibold mb-4">Revenue vs Orders (6M)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.monthlyRevenue} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={fmtK} />
                <Tooltip formatter={v => [fmtK(v), 'Revenue']} />
                <Bar dataKey="revenue" name="Revenue" fill="#1A3C34" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Conversion Rate', value: '3.4%', icon: TrendingUp, color: '#10B981' },
              { label: 'Return Rate', value: '1.2%', icon: AlertTriangle, color: '#EF4444' },
              { label: 'Avg. Order Value', value: '₹1,352', icon: ShoppingBag, color: '#3B82F6' },
              { label: 'Repeat Customers', value: '42%', icon: CheckCircle2, color: '#8B5CF6' },
            ].map(s => (
              <div key={s.label} className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-5">
                <s.icon size={18} style={{ color: s.color }} className="mb-3" />
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notice */}
      {data.products.pending_approval > 0 && activeTab === 'overview' && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <Clock size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{data.products.pending_approval} product(s) pending approval</p>
            <p className="text-xs text-amber-700 mt-0.5">Products are reviewed within 24-48 hours.</p>
          </div>
        </div>
      )}
    </div>
  );
}
