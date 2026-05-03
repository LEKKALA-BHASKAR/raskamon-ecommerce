import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, RefreshCcw, AlertTriangle } from 'lucide-react';

const STATUS_STYLES = {
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
};

const Badge = ({ status }) => (
  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
    {status}
  </span>
);

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function VendorProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.approval_status = statusFilter;
      const r = await api.get('/vendor/products', { params });
      setProducts(r.data.data);
      setPagination(r.data.pagination);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone easily.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/vendor/products/${id}`);
      toast.success('Product deleted');
      load();
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--sattva-ink)]">My Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">All vendor products are B2B-only and require admin approval</p>
        </div>
        <Link
          to="/vendor/products/new"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--sattva-forest)] text-white rounded-xl text-sm font-semibold hover:opacity-90"
        >
          <Plus size={16} />
          Add Product
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none bg-white"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button onClick={load} className="p-2 border border-[color:var(--sattva-border)] rounded-xl hover:bg-[var(--sattva-muted)] text-gray-500">
          <RefreshCcw size={15} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No products yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your first product to get started</p>
            <Link to="/vendor/products/new" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[var(--sattva-forest)] text-white rounded-xl text-sm font-semibold">
              <Plus size={15} /> Add Product
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">B2B Retail</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor Price</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--sattva-border)]">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-[var(--sattva-muted)]/40 transition-colors">
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
                        <p className="font-medium text-[var(--sattva-ink)]">{p.name}</p>
                        <p className="text-[11px] text-gray-400 font-mono">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.category}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--sattva-ink)]">{fmt(p.b2b_retail_price)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{fmt(p.b2b_vendor_price)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${p.stock <= (p.low_stock_threshold || 10) ? 'text-red-600' : 'text-green-600'}`}>
                      {p.stock}
                    </span>
                    {p.stock <= (p.low_stock_threshold || 10) && (
                      <AlertTriangle size={12} className="inline ml-1 text-red-500" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={p.approval_status} />
                    {p.rejection_reason && (
                      <p className="text-[10px] text-red-500 mt-0.5 max-w-[100px] truncate" title={p.rejection_reason}>
                        {p.rejection_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/vendor/products/edit/${p.id}`}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={deleting === p.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--sattva-border)]">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.pages} · {pagination.total} products
            </p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">
                Previous
              </button>
              <button disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
