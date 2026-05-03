import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp, ShoppingCart, Users, Package, AlertTriangle, ArrowUpRight,
  ArrowDownRight, Download, RefreshCw, Store, Building2, Wallet,
  BarChart3, Activity, Star, Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, LineChart, Line,
  CartesianGrid, RadialBarChart, RadialBar
} from 'recharts';
import api from '../../utils/api';
import { MOCK_ADMIN_STATS, MOCK_REVENUE_DATA, MOCK_MONTHLY_REVENUE } from '../../utils/mockData';

const STATUS_COLORS = {
  placed: '#3B82F6', confirmed: '#F59E0B', shipped: '#8B5CF6',
  out_for_delivery: '#F97316', delivered: '#10B981', cancelled: '#EF4444'
};

const CHART_COLORS = ['#1A3C34', '#C8A96E', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444'];

const KPICard = ({ icon: Icon, label, value, sub, color, growth, trend = 'up' }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl p-5 hover:shadow-md transition-shadow"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
      {growth !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(growth)}%
        </div>
      )}
    </div>
    <p className="text-2xl font-black tabular-nums text-[var(--sattva-ink)] tracking-tight">{value}</p>
    <p className="text-sm text-gray-500 mt-1 font-medium">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </motion.div>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-5">
    <div>
      <h3 className="font-heading text-base font-semibold text-[var(--sattva-ink)]">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const CustomTooltip = ({ active, payload, label, prefix = '₹' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {prefix}{Number(p.value).toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

const exportCSV = (data, filename) => {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => row[k]).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${filename}-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(MOCK_ADMIN_STATS);
  const [revenue, setRevenue] = useState(MOCK_REVENUE_DATA);
  const [monthly, setMonthly] = useState(MOCK_MONTHLY_REVENUE);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('7d');

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, r] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get(`/admin/analytics/revenue?period=${period}`),
      ]);
      if (s.data) setStats({ ...MOCK_ADMIN_STATS, ...s.data });
      if (r.data?.length) setRevenue(r.data);
    } catch {
      // keep mock data
    } finally {
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  const pieData = (stats?.ordersByStatus || []).map(s => ({
    name: s._id?.charAt(0).toUpperCase() + s._id?.slice(1),
    value: s.count,
    color: STATUS_COLORS[s._id] || '#94A3B8'
  }));

  const fmt = v => `₹${Number(v || 0).toLocaleString('en-IN')}`;
  const fmtK = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-[var(--sattva-ink)]">Business Intelligence</h2>
          <p className="text-sm text-gray-400 mt-0.5">Real-time analytics across all channels</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="text-xs border border-[color:var(--sattva-border)] rounded-lg px-3 py-2 bg-white text-[var(--sattva-ink)]"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[color:var(--sattva-border)] rounded-lg hover:bg-[var(--sattva-muted)] transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => exportCSV(revenue, 'revenue-report')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[var(--sattva-forest)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={TrendingUp} label="Total Revenue" value={fmtK(stats?.totalRevenue)} sub="All time" color="#1A3C34" growth={18.4} trend="up" />
        <KPICard icon={ShoppingCart} label="Orders Today" value={stats?.ordersToday || 0} sub={`${stats?.pendingOrders || 0} pending`} color="#C8A96E" growth={12.3} trend="up" />
        <KPICard icon={Users} label="Total Customers" value={(stats?.totalCustomers || 0).toLocaleString('en-IN')} sub={`+${stats?.newCustomers || 0} this month`} color="#3B82F6" growth={8.7} trend="up" />
        <KPICard icon={Package} label="Products Live" value={stats?.totalProducts || 0} sub={`${stats?.lowStock || 0} low · ${stats?.outOfStock || 0} OOS`} color="#8B5CF6" growth={4.2} trend="up" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Building2} label="B2B Revenue" value={fmtK(stats?.b2bRevenue)} sub={`${stats?.b2bOrders} orders`} color="#0EA5E9" growth={24.1} trend="up" />
        <KPICard icon={Store} label="Active Vendors" value={stats?.totalVendors || 0} sub={`${stats?.pendingApprovals} pending`} color="#F59E0B" growth={14.3} trend="up" />
        <KPICard icon={Wallet} label="Pending Payouts" value={fmtK(stats?.vendorPayoutsPending)} sub="To vendors" color="#EF4444" />
        <KPICard icon={Activity} label="Avg Order Value" value={fmt(Math.round((stats?.totalRevenue || 0) / 609))} sub="This month" color="#10B981" growth={6.8} trend="up" />
      </div>

      {/* Revenue Chart + Order Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl p-5">
          <SectionHeader
            title="Revenue Trend"
            subtitle={`${period === '7d' ? 'Daily' : 'Weekly'} revenue breakdown`}
            action={
              <button onClick={() => exportCSV(revenue, 'revenue')} className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)] flex items-center gap-1">
                <Download size={12} /> CSV
              </button>
            }
          />
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenue} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A3C34" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1A3C34" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C8A96E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C8A96E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={d => d?.slice(5)} />
              <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={fmtK} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="#1A3C34" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 3, fill: '#1A3C34' }} />
              <Area yAxisId="ord" type="monotone" dataKey="orders" name="Orders" stroke="#C8A96E" strokeWidth={2} fill="url(#ordGrad)" dot={{ r: 3, fill: '#C8A96E' }} />
              <Legend iconType="circle" iconSize={8} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Pie */}
        <div className="bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl p-5">
          <SectionHeader title="Order Status" subtitle="Current distribution" />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={40} paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-1.5">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-600">{d.name}</span>
                </div>
                <span className="font-bold text-[var(--sattva-ink)]">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Revenue Bar + Category Revenue Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl p-5">
          <SectionHeader title="Monthly Revenue (6M)" subtitle="Revenue & order volume trend" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={fmtK} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#1A3C34" radius={[4, 4, 0, 0]} />
              <Bar dataKey="orders" name="Orders" fill="#C8A96E" radius={[4, 4, 0, 0]} />
              <Legend iconType="circle" iconSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl p-5">
          <SectionHeader title="Revenue by Category" subtitle="Category performance breakdown" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats?.categoryRevenue || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
                {(stats?.categoryRevenue || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [fmtK(v), 'Revenue']} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* User Growth Line Chart */}
      <div className="bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl p-5">
        <SectionHeader
          title="User Growth by Segment"
          subtitle="Retail customers, B2B buyers, and vendors over 6 months"
          action={
            <button onClick={() => exportCSV(stats?.userGrowth, 'user-growth')} className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)] flex items-center gap-1">
              <Download size={12} /> CSV
            </button>
          }
        />
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats?.userGrowth || []} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE6" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
            <Tooltip content={<CustomTooltip prefix="" />} />
            <Line type="monotone" dataKey="customers" name="Retail Customers" stroke="#1A3C34" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="b2b" name="B2B Buyers" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="vendors" name="Vendors" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />
            <Legend iconType="circle" iconSize={8} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl p-5">
          <SectionHeader
            title="Top Selling Products"
            subtitle="By revenue this month"
            action={
              <Link to="/admin/products" className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)]">
                View All →
              </Link>
            }
          />
          <div className="space-y-4">
            {(stats?.topProducts || []).map((p, i) => {
              const maxRev = stats.topProducts[0]?.revenue || 1;
              const pct = Math.round((p.revenue / maxRev) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="w-6 h-6 bg-[var(--sattva-muted)] rounded-full flex items-center justify-center text-xs font-black text-[var(--sattva-forest)]">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold line-clamp-1 text-[var(--sattva-ink)]">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.sales} units sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black tabular-nums text-[var(--sattva-forest)]">{fmtK(p.revenue)}</p>
                      {p.growth && (
                        <p className="text-[10px] text-green-500 font-bold">+{p.growth}%</p>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-[var(--sattva-muted)] rounded-full overflow-hidden ml-9">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl p-5">
          <SectionHeader
            title="Recent Orders"
            subtitle="Last 5 transactions"
            action={
              <Link to="/admin/orders" className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)]">
                View All →
              </Link>
            }
          />
          <div className="space-y-3">
            {(stats?.recentOrders || []).map(order => {
              const statusColor = STATUS_COLORS[order.orderStatus] || '#94A3B8';
              return (
                <div key={order.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--sattva-muted)] hover:bg-[var(--sattva-paper)] transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: statusColor }}>
                    {order.userName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--sattva-ink)] truncate">{order.userName}</p>
                    <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full capitalize" style={{ backgroundColor: `${statusColor}18`, color: statusColor }}>
                    {order.orderStatus}
                  </span>
                  <span className="text-sm font-black tabular-nums text-[var(--sattva-ink)]">{fmt(order.totalAmount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(stats?.lowStock > 0 || stats?.outOfStock > 0 || stats?.pendingApprovals > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats?.outOfStock > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-700">{stats.outOfStock} Out of Stock</p>
                <Link to="/admin/products" className="text-xs text-red-600 underline">Manage inventory</Link>
              </div>
            </div>
          )}
          {stats?.lowStock > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700">{stats.lowStock} Low Stock</p>
                <Link to="/admin/products" className="text-xs text-amber-600 underline">Restock products</Link>
              </div>
            </div>
          )}
          {stats?.pendingApprovals > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
              <Clock size={16} className="text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-700">{stats.pendingApprovals} Pending Approvals</p>
                <Link to="/admin/approvals" className="text-xs text-blue-600 underline">Review vendors</Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
