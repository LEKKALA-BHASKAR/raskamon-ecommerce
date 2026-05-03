import React, { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import { toast } from 'sonner';
import { Package, CheckCircle2, XCircle, RefreshCcw } from 'lucide-react';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STATUS_STYLES = {
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
};

export default function AdminVendorProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [rejecting, setRejecting] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.approval_status = statusFilter;
      const r = await api.get('/admin_users/vendor-products', { params });
      setProducts(r.data.data);
      setPagination(r.data.pagination);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    try {
      await api.post(`/admin_users/vendor-products/${id}/approve`);
      toast.success('Product approved and live in B2B catalog');
      load();
    } catch { toast.error('Failed to approve product'); }
  };

  const reject = async (id) => {
    if (!rejectReason.trim()) { toast.error('Rejection reason required'); return; }
    try {
      await api.post(`/admin_users/vendor-products/${id}/reject?rejection_reason=${encodeURIComponent(rejectReason)}`);
      toast.success('Product rejected');
      setRejecting(null);
      setRejectReason('');
      load();
    } catch { toast.error('Failed to reject product'); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--sattva-ink)]">Vendor Product Moderation</h1>
          <p className="text-sm text-gray-500">Review and approve vendor product listings for B2B catalog</p>
        </div>
        <div className="flex gap-3">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-white">
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button onClick={load} className="p-2 border border-[color:var(--sattva-border)] rounded-xl hover:bg-[var(--sattva-muted)] text-gray-500">
            <RefreshCcw size={15} />
          </button>
        </div>
      </div>

      <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No products to moderate</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">B2B Retail</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor Price</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--sattva-border)]">
              {products.map(p => (
                <React.Fragment key={p.id}>
                  <tr className="hover:bg-[var(--sattva-muted)]/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded-lg border" />
                        ) : (
                          <div className="w-10 h-10 bg-[var(--sattva-muted)] rounded-lg flex items-center justify-center">
                            <Package size={14} className="text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[var(--sattva-ink)]">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.vendor_name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(p.b2b_retail_price)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{fmt(p.b2b_vendor_price)}</td>
                    <td className="px-4 py-3 text-center font-semibold">{p.stock}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${STATUS_STYLES[p.approval_status] || 'bg-gray-100 text-gray-600'}`}>
                        {p.approval_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {p.approval_status !== 'APPROVED' && (
                          <button onClick={() => approve(p.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:opacity-90">
                            <CheckCircle2 size={12} /> Approve
                          </button>
                        )}
                        {p.approval_status !== 'REJECTED' && (
                          <button onClick={() => setRejecting(p.id)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg hover:opacity-90">
                            <XCircle size={12} /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {rejecting === p.id && (
                    <tr>
                      <td colSpan={7} className="px-4 pb-3 bg-red-50">
                        <div className="flex items-center gap-3">
                          <input
                            autoFocus
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Rejection reason (required)"
                            className="flex-1 px-3 py-2 text-sm border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                          />
                          <button onClick={() => reject(p.id)} className="px-3 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:opacity-90">
                            Confirm
                          </button>
                          <button onClick={() => { setRejecting(null); setRejectReason(''); }} className="px-3 py-2 border border-gray-300 text-sm rounded-xl hover:bg-gray-50">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--sattva-border)]">
            <p className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages} · {pagination.total} products</p>
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
