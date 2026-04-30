import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Users, Package, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';
import { Link } from 'react-router-dom';

const STATUS_COLORS = { placed: '#3B82F6', confirmed: '#F59E0B', shipped: '#8B5CF6', out_for_delivery: '#F97316', delivered: '#10B981', cancelled: '#EF4444' };

const KPICard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="card-sattva p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <ArrowUpRight size={14} className="text-green-500" />
    </div>
    <p className="font-bold text-2xl tabular-nums text-[var(--sattva-ink)]">{value}</p>
    <p className="text-sm text-gray-500 mt-1">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/dashboard/stats'),
      api.get('/admin/analytics/revenue?period=7d'),
    ]).then(([s, r]) => {
      setStats(s.data);
      setRevenue(r.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <AdminLayout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => <div key={i} className="h-28 skeleton rounded-xl" />)}
      </div>
      <div className="h-64 skeleton rounded-xl" />
    </AdminLayout>
  );

  const pieData = (stats?.ordersByStatus || []).map(s => ({ name: s._id, value: s.count, color: STATUS_COLORS[s._id] || '#94A3B8' }));

  return (
    <AdminLayout>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard icon={TrendingUp} label="Total Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`} color="#1A3C34" />
        <KPICard icon={ShoppingCart} label="Orders Today" value={stats?.ordersToday || 0} sub={`${stats?.pendingOrders || 0} pending`} color="#C8A96E" />
        <KPICard icon={Users} label="Customers" value={stats?.totalCustomers || 0} color="#3B82F6" />
        <KPICard icon={Package} label="Active Products" value={stats?.totalProducts || 0} sub={`${stats?.lowStock || 0} low stock`} color="#8B5CF6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 card-sattva p-5">
          <h3 className="font-heading text-base font-semibold mb-4">Revenue (Last 7 Days)</h3>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A3C34" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1A3C34" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} labelFormatter={l => `Date: ${l}`} />
                <Area type="monotone" dataKey="revenue" stroke="#1A3C34" strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
          )}
        </div>

        {/* Orders Pie */}
        <div className="card-sattva p-5">
          <h3 className="font-heading text-base font-semibold mb-4">Orders by Status</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No orders yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="card-sattva p-5">
          <h3 className="font-heading text-base font-semibold mb-4">Top Selling Products</h3>
          {(stats?.topProducts || []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {(stats?.topProducts || []).map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-[var(--sattva-muted)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--sattva-forest)]">{i+1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.sales} units</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-[var(--sattva-forest)]">₹{p.revenue?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="card-sattva p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-base font-semibold">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)]">View All</Link>
          </div>
          {(stats?.recentOrders || []).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {(stats?.recentOrders || []).map(order => (
                <div key={order.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{order.userName}</p>
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full capitalize ${order.orderStatus === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {order.orderStatus}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">₹{order.totalAmount?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(stats?.lowStock > 0 || stats?.outOfStock > 0) && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>{stats.outOfStock}</strong> products out of stock and <strong>{stats.lowStock}</strong> products have low stock. <Link to="/admin/products" className="underline">Manage Inventory</Link>
          </p>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
