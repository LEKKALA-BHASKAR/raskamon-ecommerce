import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, ShoppingBag } from 'lucide-react';

const PERIODS = [
  { v: '7d', label: '7 Days' },
  { v: '30d', label: '30 Days' },
  { v: '90d', label: '90 Days' },
  { v: '1y', label: '1 Year' },
];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function VendorAnalytics() {
  const [period, setPeriod] = useState('30d');
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/vendor/analytics/sales?period=${period}`),
      api.get('/vendor/analytics/top-products?limit=10')
    ]).then(([sales, top]) => {
      setChartData(sales.data.data);
      setTopProducts(top.data.data);
    }).catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--sattva-ink)]">Analytics</h1>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button
              key={p.v}
              onClick={() => setPeriod(p.v)}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${period === p.v ? 'bg-[var(--sattva-forest)] text-white' : 'border border-[color:var(--sattva-border)] hover:bg-[var(--sattva-muted)]'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-[var(--sattva-forest)]" />
          <h2 className="font-semibold text-[var(--sattva-ink)]">Revenue Over Time</h2>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Loading chart...</div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">No sales data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="var(--sattva-forest)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top Products */}
      <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package size={18} className="text-[var(--sattva-forest)]" />
          <h2 className="font-semibold text-[var(--sattva-ink)]">Top Products by Revenue</h2>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-gray-400 text-sm">No sales data yet</p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p._id} className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--sattva-muted)] text-xs font-bold text-gray-500">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--sattva-ink)] truncate">{p.product_name}</p>
                  <p className="text-xs text-gray-400">{p.total_units} units · {p.order_count} orders</p>
                </div>
                <p className="text-sm font-bold text-[var(--sattva-forest)]">{fmt(p.total_revenue)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
