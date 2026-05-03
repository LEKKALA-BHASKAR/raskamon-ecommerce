import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../utils/api';
import { Download, TrendingUp, ShoppingCart, Users, Package } from 'lucide-react';
import { MOCK_REVENUE_DATA, MOCK_MONTHLY_REVENUE, MOCK_ADMIN_STATS } from '../../utils/mockData';

const fmtK = v => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`;
const COLORS = ['#1A3C34', '#C8A96E', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981'];

const exportCSV = (data, filename) => {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => row[k]).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${filename}.csv`;
  a.click();
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === 'number' && p.name.toLowerCase().includes('revenue') ? fmtK(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const AdminAnalytics = () => {
  const [period, setPeriod] = useState('7d');
  const [revenue, setRevenue] = useState(MOCK_REVENUE_DATA);
  const [loading, setLoading] = useState(false);
  const stats = MOCK_ADMIN_STATS;

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/analytics/revenue?period=${period}`)
      .then(r => { if (r.data?.length) setRevenue(r.data); })
      .catch(() => setRevenue(period === '7d' ? MOCK_REVENUE_DATA : MOCK_MONTHLY_REVENUE))
      .finally(() => setLoading(false));
  }, [period]);

  const kpis = [
    { icon: TrendingUp, label: 'Total Revenue', value: fmtK(stats.totalRevenue), color: '#1A3C34', growth: '+18.4%' },
    { icon: ShoppingCart, label: 'Total Orders', value: '609', color: '#3B82F6', growth: '+12.1%' },
    { icon: Users, label: 'Customers', value: stats.totalCustomers.toLocaleString('en-IN'), color: '#8B5CF6', growth: '+8.7%' },
    { icon: Package, label: 'Products', value: stats.totalProducts, color: '#F59E0B', growth: '+4.2%' },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold">Analytics</h2>
          <p className="text-sm text-gray-400">Full business performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-[color:var(--sattva-border)] px-3 py-2 rounded-lg bg-[var(--sattva-surface)]">
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={() => exportCSV(revenue, `revenue-${period}`)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[var(--sattva-forest)] text-white rounded-lg hover:opacity-90"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(({ icon: Icon, label, value, color, growth }) => (
          <div key={label} className="card-sattva p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{growth}</span>
            </div>
            <p className="text-2xl font-black text-[var(--sattva-ink)]">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card-sattva p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-semibold">Revenue & Orders Trend</h3>
            <button onClick={() => exportCSV(revenue, 'revenue-trend')} className="text-xs text-[var(--sattva-forest)] flex items-center gap-1"><Download size={11} /> CSV</button>
          </div>
          {loading ? <div className="h-64 skeleton rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenue} margin={{ left: -10 }}>
                <defs>
                  <linearGradient id="rG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A3C34" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1A3C34" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
                <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
                <YAxis yAxisId="r" tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                <YAxis yAxisId="o" orientation="right" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area yAxisId="r" type="monotone" dataKey="revenue" name="Revenue" stroke="#1A3C34" strokeWidth={2.5} fill="url(#rG)" dot={{ r: 3 }} />
                <Area yAxisId="o" type="monotone" dataKey="orders" name="Orders" stroke="#C8A96E" strokeWidth={2} fill="none" dot={{ r: 3 }} />
                <Legend iconType="circle" iconSize={8} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card-sattva p-6">
          <h3 className="font-heading text-base font-semibold mb-4">Revenue by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.categoryRevenue} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={36} paddingAngle={3}>
                {stats.categoryRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [fmtK(v), 'Revenue']} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {stats.categoryRevenue.map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600">{cat.name}</span>
                </div>
                <span className="font-bold text-[var(--sattva-ink)]">{fmtK(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly + User Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card-sattva p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-semibold">Monthly Revenue (6M)</h3>
            <button onClick={() => exportCSV(MOCK_MONTHLY_REVENUE, 'monthly-revenue')} className="text-xs text-[var(--sattva-forest)] flex items-center gap-1"><Download size={11} /> CSV</button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MOCK_MONTHLY_REVENUE} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#1A3C34" radius={[4, 4, 0, 0]} />
              <Bar dataKey="orders" name="Orders" fill="#C8A96E" radius={[4, 4, 0, 0]} />
              <Legend iconType="circle" iconSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card-sattva p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-semibold">User Growth by Segment</h3>
            <button onClick={() => exportCSV(stats.userGrowth, 'user-growth')} className="text-xs text-[var(--sattva-forest)] flex items-center gap-1"><Download size={11} /> CSV</button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.userGrowth} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="customers" name="Retail" stroke="#1A3C34" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="b2b" name="B2B" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="vendors" name="Vendors" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />
              <Legend iconType="circle" iconSize={8} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="card-sattva overflow-hidden">
        <div className="px-6 py-4 border-b border-[color:var(--sattva-border)] flex items-center justify-between">
          <h3 className="font-heading text-base font-semibold">Top Products by Revenue</h3>
          <button onClick={() => exportCSV(stats.topProducts, 'top-products')} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[color:var(--sattva-border)] rounded-lg hover:bg-[var(--sattva-muted)]">
            <Download size={12} /> Export
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[var(--sattva-muted)]">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Units Sold</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Growth</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--sattva-border)]">
            {stats.topProducts.map((p, i) => {
              const totalRev = stats.topProducts.reduce((s, x) => s + x.revenue, 0);
              const share = Math.round((p.revenue / totalRev) * 100);
              return (
                <tr key={i} className="hover:bg-[var(--sattva-muted)]/40">
                  <td className="px-6 py-3.5">
                    <span className="w-6 h-6 bg-[var(--sattva-muted)] rounded-full flex items-center justify-center text-xs font-black text-[var(--sattva-forest)]">{i + 1}</span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-[var(--sattva-ink)]">{p.name}</td>
                  <td className="px-4 py-3.5 text-center text-gray-600">{p.sales.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3.5 text-right font-bold text-[var(--sattva-forest)]">{fmtK(p.revenue)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">+{p.growth}%</span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-[var(--sattva-muted)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${share}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-500">{share}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AdminAnalytics;
