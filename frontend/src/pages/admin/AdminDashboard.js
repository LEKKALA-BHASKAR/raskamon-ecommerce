import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp, ShoppingCart, Users, Package, AlertTriangle, ArrowUpRight,
  ArrowDownRight, Download, RefreshCw, Store, CreditCard, IndianRupee,
  BarChart3, Activity, Clock, XCircle, Crown, Zap
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
  CartesianGrid
} from 'recharts';
import api from '../../utils/api';
import { MOCK_ADMIN_STATS, MOCK_REVENUE_DATA, MOCK_MONTHLY_REVENUE } from '../../utils/mockData';

const STATUS_COLORS = {
  placed: '#3B82F6', confirmed: '#F59E0B', shipped: '#8B5CF6',
  out_for_delivery: '#F97316', delivered: '#10B981', cancelled: '#EF4444'
};
const CHART_COLORS = ['#1A3C34', '#C8A96E', '#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444'];
const PAYMENT_COLORS = { razorpay: '#3B82F6', cod: '#F59E0B', upi: '#8B5CF6', wallet: '#10B981', card: '#0EA5E9' };

const fmt = v => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const fmtK = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : `₹${v}`;
const pctChange = (curr, prev) => prev ? Math.round(((curr - prev) / prev) * 100) : 0;

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl p-5 ${className}`}>{children}</div>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="font-heading text-base font-semibold text-[var(--sattva-ink)]">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);

const MiniStat = ({ label, value, sub, icon: Icon, color, growth }) => {
  const isUp = growth >= 0;
  return (
    <div className="bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {growth !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
            {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {Math.abs(growth)}%
          </span>
        )}
      </div>
      <p className="text-xl font-black tabular-nums text-[var(--sattva-ink)] tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
};

const SkeletonBlock = ({ className = '' }) => (
  <div className={`bg-[var(--sattva-muted)] rounded animate-pulse ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div><SkeletonBlock className="h-6 w-40 mb-2" /><SkeletonBlock className="h-3 w-60" /></div>
      <div className="flex gap-2"><SkeletonBlock className="h-9 w-24 rounded-lg" /><SkeletonBlock className="h-9 w-20 rounded-lg" /><SkeletonBlock className="h-9 w-20 rounded-lg" /></div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {[...Array(5)].map((_, i) => <SkeletonBlock key={i} className="h-28 rounded-2xl" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SkeletonBlock className="h-64 rounded-2xl lg:col-span-2" />
      <SkeletonBlock className="h-64 rounded-2xl" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <SkeletonBlock className="h-72 rounded-2xl lg:col-span-2" />
      <SkeletonBlock className="h-72 rounded-2xl" />
    </div>
  </div>
);

const ComparisonRow = ({ label, current, previous, isCurrency = true }) => {
  const change = pctChange(current, previous);
  const isUp = change >= 0;
  const display = isCurrency ? fmtK : v => v?.toLocaleString('en-IN');
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[color:var(--sattva-border)] last:border-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm font-black tabular-nums text-[var(--sattva-ink)]">{display(current)}</span>
        <span className="text-[10px] text-gray-400">vs {display(previous)}</span>
        <span className={`text-[10px] font-bold ${isUp ? 'text-green-600' : 'text-red-500'}`}>
          {isUp ? '+' : ''}{change}%
        </span>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, prefix = '₹' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-[var(--sattva-ink)] mb-1">{label}</p>
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
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('7d');
  const hasMounted = useRef(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const results = await Promise.allSettled([
        api.get('/admin/dashboard/stats'),
        api.get(`/admin/analytics/revenue?period=${period}`),
      ]);
      const sData = results[0].status === 'fulfilled' ? results[0].value.data : null;
      const rData = results[1].status === 'fulfilled' ? results[1].value.data : null;
      setStats(prev => {
        const base = prev || MOCK_ADMIN_STATS;
        return sData ? { ...MOCK_ADMIN_STATS, ...sData } : base;
      });
      setRevenue(prev => (rData?.length ? rData : prev || MOCK_REVENUE_DATA));
      setMonthly(prev => (sData?.monthlyRevenue?.length ? sData.monthlyRevenue : prev || MOCK_MONTHLY_REVENUE));
    } catch {
      // On first load with no data, fall back to mock
      setStats(prev => prev || MOCK_ADMIN_STATS);
      setRevenue(prev => prev || MOCK_REVENUE_DATA);
      setMonthly(prev => prev || MOCK_MONTHLY_REVENUE);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      loadData(false);
    } else {
      loadData(false);
    }
  }, [loadData]);

  if (loading) return <DashboardSkeleton />;

  const s = stats || MOCK_ADMIN_STATS;

  const pieData = (s.ordersByStatus || []).map(st => ({
    name: (st._id || '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
    value: st.count,
    color: STATUS_COLORS[st._id] || '#94A3B8'
  }));

  const hourlyData = (s.hourlySales || []).map(h => ({ hour: `${h._id}:00`, orders: h.orders, revenue: h.revenue }));

  const paymentData = (s.paymentMethods || []).map(p => ({
    name: (p._id || 'other').toUpperCase(),
    value: p.count,
    revenue: p.revenue,
    color: PAYMENT_COLORS[p._id] || '#94A3B8'
  }));
  const totalPaymentOrders = paymentData.reduce((sum, p) => sum + p.value, 0) || 1;

  return (
    <div className="space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-[var(--sattva-ink)]">Sales Dashboard</h2>
          <p className="text-xs text-gray-400 mt-0.5">Real-time business intelligence · Last updated just now</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="text-xs border border-[color:var(--sattva-border)] rounded-lg px-3 py-2 bg-[var(--sattva-surface)] text-[var(--sattva-ink)]">
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button onClick={() => loadData(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[color:var(--sattva-border)] rounded-lg hover:bg-[var(--sattva-muted)] transition-colors">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => exportCSV(revenue, 'revenue-report')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[var(--sattva-forest)] text-white rounded-lg hover:opacity-90 transition-opacity">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* ═══ TODAY'S SALES HIGHLIGHT ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MiniStat icon={IndianRupee} label="Today's Revenue" value={fmtK(s.todayRevenue)} sub={`Yesterday: ${fmtK(s.yesterdayRevenue)}`} color="#1A3C34" growth={pctChange(s.todayRevenue, s.yesterdayRevenue)} />
        <MiniStat icon={ShoppingCart} label="Today's Orders" value={s.todayOrders || 0} sub={`Yesterday: ${s.yesterdayOrders || 0}`} color="#C8A96E" growth={pctChange(s.todayOrders, s.yesterdayOrders)} />
        <MiniStat icon={Activity} label="Avg Order Value" value={fmt(s.todayAOV)} sub={`Yesterday: ${fmt(s.yesterdayAOV)}`} color="#10B981" growth={pctChange(s.todayAOV, s.yesterdayAOV)} />
        <MiniStat icon={Users} label="Customers" value={(s.totalCustomers || 0).toLocaleString('en-IN')} sub={`+${s.newCustomers || 0} this month`} color="#3B82F6" />
        <MiniStat icon={Package} label="Products Live" value={s.totalProducts || 0} sub={`${s.lowStock || 0} low · ${s.outOfStock || 0} OOS`} color="#8B5CF6" />
      </div>

      {/* ═══ MONTH COMPARISON + QUICK STATS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard className="lg:col-span-2">
          <SectionHeader title="This Month vs Last Month" subtitle="Performance comparison" />
          <ComparisonRow label="Revenue" current={s.thisMonthRevenue} previous={s.lastMonthRevenue} />
          <ComparisonRow label="Orders" current={s.thisMonthOrders} previous={s.lastMonthOrders} isCurrency={false} />
          <ComparisonRow label="Avg Order Value" current={s.thisMonthAOV} previous={Math.round(s.lastMonthRevenue / (s.lastMonthOrders || 1))} />
          <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-[color:var(--sattva-border)]">
            <div className="text-center">
              <p className="text-lg font-black text-[var(--sattva-forest)] tabular-nums">{fmtK(s.totalRevenue)}</p>
              <p className="text-[10px] text-gray-400 font-medium">All-time Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-[var(--sattva-ink)] tabular-nums">{(s.totalOrders || 0).toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-gray-400 font-medium">Total Orders</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-[var(--sattva-gold-deep)] tabular-nums">{s.pendingOrders || 0}</p>
              <p className="text-[10px] text-gray-400 font-medium">Pending Orders</p>
            </div>
          </div>
        </SectionCard>

        {/* Quick Action Alerts */}
        <SectionCard>
          <SectionHeader title="Action Required" subtitle="Items needing attention" />
          <div className="space-y-3">
            {s.pendingOrders > 0 && (
              <Link to="/admin/orders" className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-100 hover:border-blue-200 transition-colors">
                <Clock size={16} className="text-blue-500 flex-shrink-0" />
                <div className="flex-1"><p className="text-xs font-bold text-blue-700">{s.pendingOrders} Pending Orders</p><p className="text-[10px] text-blue-500">Need confirmation</p></div>
                <ArrowUpRight size={12} className="text-blue-400" />
              </Link>
            )}
            {s.outOfStock > 0 && (
              <Link to="/admin/products" className="flex items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-100 hover:border-red-200 transition-colors">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                <div className="flex-1"><p className="text-xs font-bold text-red-700">{s.outOfStock} Out of Stock</p><p className="text-[10px] text-red-500">Needs restocking</p></div>
                <ArrowUpRight size={12} className="text-red-400" />
              </Link>
            )}
            {s.lowStock > 0 && (
              <Link to="/admin/products" className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100 hover:border-amber-200 transition-colors">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
                <div className="flex-1"><p className="text-xs font-bold text-amber-700">{s.lowStock} Low Stock</p><p className="text-[10px] text-amber-500">Below threshold</p></div>
                <ArrowUpRight size={12} className="text-amber-400" />
              </Link>
            )}
            {s.pendingApprovals > 0 && (
              <Link to="/admin/approvals" className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 border border-purple-100 hover:border-purple-200 transition-colors">
                <Store size={16} className="text-purple-500 flex-shrink-0" />
                <div className="flex-1"><p className="text-xs font-bold text-purple-700">{s.pendingApprovals} Vendor Approvals</p><p className="text-[10px] text-purple-500">Awaiting review</p></div>
                <ArrowUpRight size={12} className="text-purple-400" />
              </Link>
            )}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--sattva-muted)]">
              <XCircle size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1"><p className="text-xs font-bold text-[var(--sattva-ink)]">{s.cancelRate || 0}% Cancel Rate</p><p className="text-[10px] text-gray-400">Last 7 days</p></div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ═══ REVENUE CHART + ORDER STATUS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard className="lg:col-span-2">
          <SectionHeader title="Revenue Trend" subtitle={`${period === '7d' ? 'Daily' : 'Period'} revenue & orders`}
            action={<button onClick={() => exportCSV(revenue, 'revenue')} className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)] flex items-center gap-1"><Download size={12} /> CSV</button>}
          />
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenue} margin={{ left: -10 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A3C34" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1A3C34" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C8A96E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#C8A96E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sattva-border)" />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={d => d?.slice(5)} />
              <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={fmtK} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="#1A3C34" strokeWidth={2.5} fill="url(#revGrad)" dot={{ r: 3, fill: '#1A3C34' }} />
              <Area yAxisId="ord" type="monotone" dataKey="orders" name="Orders" stroke="#C8A96E" strokeWidth={2} fill="url(#ordGrad)" dot={{ r: 3, fill: '#C8A96E' }} />
              <Legend iconType="circle" iconSize={8} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard>
          <SectionHeader title="Order Status" subtitle="Current distribution" />
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={38} paddingAngle={3}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-500">{d.name}</span>
                </div>
                <span className="font-bold text-[var(--sattva-ink)] tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ═══ HOURLY SALES + PAYMENT METHODS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard>
          <SectionHeader title="Today's Sales by Hour" subtitle="Live sales velocity" />
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sattva-border)" />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#9CA3AF' }} interval={2} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <Tooltip content={<CustomTooltip prefix="" />} />
                <Bar dataKey="orders" name="Orders" fill="#1A3C34" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">No orders yet today</div>
          )}
        </SectionCard>

        <SectionCard>
          <SectionHeader title="Payment Methods" subtitle="Last 7 days breakdown" />
          <div className="space-y-3">
            {paymentData.map((p, i) => {
              const pct = Math.round((p.value / totalPaymentOrders) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <CreditCard size={13} style={{ color: p.color }} />
                      <span className="text-xs font-semibold text-[var(--sattva-ink)]">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{p.value} orders</span>
                      <span className="text-xs font-bold text-[var(--sattva-forest)] tabular-nums">{fmtK(p.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[var(--sattva-muted)] rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.15 }}
                      className="h-full rounded-full" style={{ backgroundColor: p.color }} />
                  </div>
                  <p className="text-[10px] text-gray-400 text-right mt-0.5">{pct}%</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* ═══ MONTHLY REVENUE + CATEGORY REVENUE ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard>
          <SectionHeader title="Monthly Revenue (6M)" subtitle="Revenue & order volume trend"
            action={<button onClick={() => exportCSV(monthly, 'monthly-revenue')} className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)] flex items-center gap-1"><Download size={12} /> CSV</button>}
          />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sattva-border)" />
              <XAxis dataKey="_id" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={d => d?.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={fmtK} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#1A3C34" radius={[4, 4, 0, 0]} />
              <Legend iconType="circle" iconSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard>
          <SectionHeader title="Revenue by Category" subtitle="Category performance" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={s.categoryRevenue || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} paddingAngle={2}>
                {(s.categoryRevenue || []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [fmtK(v), 'Revenue']} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* ═══ TOP PRODUCTS + TOP CUSTOMERS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard>
          <SectionHeader title="Top Selling Products" subtitle="By revenue"
            action={<Link to="/admin/products" className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)]">View All →</Link>}
          />
          <div className="space-y-4">
            {(s.topProducts || []).map((p, i) => {
              const maxRev = s.topProducts[0]?.revenue || 1;
              const pct = Math.round((p.revenue / maxRev) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="w-6 h-6 bg-[var(--sattva-muted)] rounded-full flex items-center justify-center text-xs font-black text-[var(--sattva-forest)]">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold line-clamp-1 text-[var(--sattva-ink)]">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.sales} units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black tabular-nums text-[var(--sattva-forest)]">{fmtK(p.revenue)}</p>
                      {p.growth && <p className="text-[10px] text-green-500 font-bold">+{p.growth}%</p>}
                    </div>
                  </div>
                  <div className="h-1.5 bg-[var(--sattva-muted)] rounded-full overflow-hidden ml-9">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeader title="Top Customers" subtitle="By lifetime spend"
            action={<Link to="/admin/customers" className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)]">View All →</Link>}
          />
          <div className="space-y-3">
            {(s.topCustomers || []).map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--sattva-muted)] hover:bg-[var(--sattva-muted-deep)] transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}>
                  {i === 0 ? <Crown size={14} /> : c.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--sattva-ink)] truncate">{c.name}</p>
                  <p className="text-[10px] text-gray-400">{c.email} · {c.orders} orders</p>
                </div>
                <span className="text-sm font-black tabular-nums text-[var(--sattva-forest)]">{fmtK(c.totalSpent)}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ═══ RECENT ORDERS ═══ */}
      <SectionCard>
        <SectionHeader title="Recent Orders" subtitle="Latest transactions"
          action={<Link to="/admin/orders" className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)]">View All →</Link>}
        />
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-[color:var(--sattva-border)]">
                {['Order', 'Customer', 'Items', 'Amount', 'Payment', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-5 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(s.recentOrders || []).map(order => {
                const statusColor = STATUS_COLORS[order.orderStatus] || '#94A3B8';
                return (
                  <tr key={order.id} className="border-b border-[color:var(--sattva-border)] last:border-0 hover:bg-[var(--sattva-muted)] transition-colors">
                    <td className="px-5 py-3 text-xs font-mono text-gray-500">{order.invoiceId || order.id}</td>
                    <td className="px-5 py-3 text-xs font-semibold text-[var(--sattva-ink)]">{order.userName}</td>
                    <td className="px-5 py-3 text-xs text-gray-400">{order.items?.length || 0} items</td>
                    <td className="px-5 py-3 text-xs font-black tabular-nums text-[var(--sattva-ink)]">{fmt(order.totalAmount)}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[var(--sattva-muted)] text-gray-500">{order.paymentMethod || '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-bold rounded-full px-2.5 py-0.5 capitalize" style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
                        {(order.orderStatus || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};

export default AdminDashboard;
