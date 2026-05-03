import React, { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import { toast } from 'sonner';
import { ShoppingBag, RefreshCcw } from 'lucide-react';

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const r = await api.get('/vendor/analytics/orders', { params });
      setOrders(r.data.data);
      setPagination(r.data.pagination);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sattva-ink)]">My Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">Orders containing your products only</p>
        </div>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none bg-white"
          >
            <option value="">All Status</option>
            {Object.keys(STATUS_STYLES).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={load} className="p-2 border border-[color:var(--sattva-border)] rounded-xl hover:bg-[var(--sattva-muted)] text-gray-500">
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No orders yet</p>
            <p className="text-sm text-gray-400">Orders will appear here once customers purchase your products</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Items</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--sattva-border)]">
              {orders.map(o => {
                const myRevenue = (o.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
                return (
                  <tr key={o.id || o._id} className="hover:bg-[var(--sattva-muted)]/40">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{(o.id || o._id)?.slice(-8)}</td>
                    <td className="px-4 py-3 text-[var(--sattva-ink)]">{o.userName || 'Customer'}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {(o.items || []).slice(0, 2).map((item, i) => (
                          <p key={i} className="text-xs text-gray-600">{item.name} × {item.quantity}</p>
                        ))}
                        {(o.items || []).length > 2 && <p className="text-[10px] text-gray-400">+{o.items.length - 2} more</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(myRevenue)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--sattva-border)]">
            <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Previous</button>
              <button disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
