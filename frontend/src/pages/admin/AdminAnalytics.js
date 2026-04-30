import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';

const AdminAnalytics = () => {
  const [period, setPeriod] = useState('30d');
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/analytics/revenue?period=${period}`)
      .then(r => setRevenue(r.data))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-semibold">Analytics</h2>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}
          className="text-sm border px-3 py-2 rounded-lg">
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="365d">Last 365 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="card-sattva p-6">
          <h3 className="font-heading text-base font-semibold mb-4">Revenue Trend</h3>
          {loading ? <div className="h-64 skeleton rounded-xl" /> : revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenue}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1A3C34" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1A3C34" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#1A3C34" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-gray-400">No revenue data</div>}
        </div>

        <div className="card-sattva p-6">
          <h3 className="font-heading text-base font-semibold mb-4">Orders per Day</h3>
          {loading ? <div className="h-64 skeleton rounded-xl" /> : revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenue}>
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={d => d?.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'Orders']} />
                <Bar dataKey="orders" fill="#C8A96E" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-gray-400">No order data</div>}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
