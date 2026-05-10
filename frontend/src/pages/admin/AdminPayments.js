import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, RefreshCw, CreditCard, CheckCircle2,
  XCircle, Clock, ChevronLeft, ChevronRight, Eye, X,
} from 'lucide-react';
import api from '../../utils/api';

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  success:  { label: 'Success',  cls: 'bg-green-100 text-green-700',  icon: CheckCircle2 },
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700',  icon: Clock },
  failed:   { label: 'Failed',   cls: 'bg-red-100   text-red-700',    icon: XCircle },
  refunded: { label: 'Refunded', cls: 'bg-blue-100  text-blue-700',   icon: RefreshCw },
};

const GATEWAY_LABELS = { razorpay: 'Razorpay', phonepe: 'PhonePe', airpay: 'Airpay' };

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
};

function fmt(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtAmt(n) {
  if (n == null) return '—';
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

// ── Detail Modal ─────────────────────────────────────────────────────────────

const DetailModal = ({ txn, onClose }) => {
  if (!txn) return null;
  const rows = [
    ['Transaction ID',  txn.transaction_id || txn.id],
    ['Order ID',        txn.orderId],
    ['Invoice',         txn.orderInvoiceId],
    ['Customer',        txn.userName],
    ['Email',           txn.userEmail],
    ['Gateway',         GATEWAY_LABELS[txn.gatewayName] || txn.gatewayName],
    ['Gateway Txn ID',  txn.gatewayTransactionId || '—'],
    ['Gateway Order ID',txn.gatewayOrderId || '—'],
    ['Amount',          fmtAmt(txn.amount)],
    ['Currency',        txn.currency || 'INR'],
    ['Status',          <StatusBadge key="s" status={txn.paymentStatus} />],
    ['Order Status',    txn.orderStatus || '—'],
    ['Created At',      fmt(txn.createdAt)],
    ['Updated At',      fmt(txn.updatedAt)],
    ['IP Address',      txn.ipAddress || '—'],
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-heading text-lg font-bold text-gray-800">Transaction Detail</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-3">
              <span className="text-xs font-semibold text-gray-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
              <span className="text-sm text-gray-800 break-all">{value}</span>
            </div>
          ))}

          {txn.shippingAddress && (
            <div className="flex gap-3">
              <span className="text-xs font-semibold text-gray-400 w-36 flex-shrink-0 pt-0.5">Ship To</span>
              <span className="text-sm text-gray-800">
                {txn.shippingAddress.name}, {txn.shippingAddress.addressLine1}, {txn.shippingAddress.city}, {txn.shippingAddress.state} — {txn.shippingAddress.pincode}
              </span>
            </div>
          )}

          {txn.gatewayResponse && Object.keys(txn.gatewayResponse).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">Gateway Response</p>
              <pre className="text-[10px] bg-gray-50 rounded-lg p-3 overflow-x-auto text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(txn.gatewayResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const AdminPayments = () => {
  const [data, setData]         = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [gatewayFilter, setGatewayFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (statusFilter)  params.set('status',  statusFilter);
      if (gatewayFilter) params.set('gateway', gatewayFilter);
      if (search)        params.set('search',  search);
      const res = await api.get(`/payments/admin/transactions?${params}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, gatewayFilter, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const clearFilters = () => {
    setSearchInput(''); setSearch('');
    setStatusFilter(''); setGatewayFilter('');
    setPage(1);
  };

  // Summary stats
  const successCount = data.items.filter(t => t.paymentStatus === 'success').length;
  const failedCount  = data.items.filter(t => t.paymentStatus === 'failed').length;
  const successTotal = data.items
    .filter(t => t.paymentStatus === 'success')
    .reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[var(--sattva-ink)]">Payment History</h1>
          <p className="text-sm text-gray-500 mt-0.5">All gateway transactions — Razorpay, PhonePe, Airpay</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 btn-outlined px-4 py-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Transactions', value: data.total,     cls: 'text-[var(--sattva-ink)]', icon: CreditCard },
          { label: 'Successful',         value: successCount,   cls: 'text-green-600',            icon: CheckCircle2 },
          { label: 'Failed',             value: failedCount,    cls: 'text-red-600',              icon: XCircle },
          { label: 'Revenue (page)',      value: fmtAmt(successTotal), cls: 'text-[var(--sattva-forest)]', icon: CreditCard },
        ].map(({ label, value, cls, icon: Icon }) => (
          <div key={label} className="card-sattva p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <Icon size={16} className={cls} />
            </div>
            <p className={`text-xl font-bold ${cls}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card-sattva p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search by TXN ID, Order ID, User ID…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--sattva-forest)]"
              />
            </div>
            <button type="submit" className="btn-primary px-4 py-2 text-sm">Search</button>
          </form>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm border border-[color:var(--sattva-border)] rounded-lg focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Gateway filter */}
          <select
            value={gatewayFilter}
            onChange={e => { setGatewayFilter(e.target.value); setPage(1); }}
            className="py-2 px-3 text-sm border border-[color:var(--sattva-border)] rounded-lg focus:outline-none"
          >
            <option value="">All Gateways</option>
            <option value="razorpay">Razorpay</option>
            <option value="phonepe">PhonePe</option>
            <option value="airpay">Airpay</option>
          </select>

          {(search || statusFilter || gatewayFilter) && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition">
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="card-sattva p-8 text-center text-red-500">{error}</div>
      ) : (
        <div className="card-sattva overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--sattva-muted)] text-left">
                  {['Transaction ID', 'Order / Invoice', 'Customer', 'Gateway', 'Amount', 'Status', 'Date', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--sattva-border)]">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : data.items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  data.items.map(txn => (
                    <motion.tr
                      key={txn.transaction_id || txn.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-[var(--sattva-muted)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-600 truncate max-w-[120px] block">
                          {(txn.transaction_id || txn.id || '').slice(0, 16)}…
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs">{txn.orderInvoiceId || '—'}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[100px]">{txn.orderId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[120px]">{txn.userName || '—'}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{txn.userEmail || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold capitalize">{GATEWAY_LABELS[txn.gatewayName] || txn.gatewayName || '—'}</span>
                      </td>
                      <td className="px-4 py-3 font-bold tabular-nums text-[var(--sattva-forest)] whitespace-nowrap">
                        {fmtAmt(txn.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={txn.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {fmt(txn.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelected(txn)}
                          className="p-1.5 rounded-lg hover:bg-white transition text-gray-400 hover:text-[var(--sattva-forest)]"
                          title="View details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--sattva-border)]">
              <p className="text-xs text-gray-500">
                Page {page} of {data.pages} · {data.total} total
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40 hover:bg-[var(--sattva-muted)] transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  className="p-1.5 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40 hover:bg-[var(--sattva-muted)] transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail modal */}
      {selected && <DetailModal txn={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

export default AdminPayments;
