import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import { toast } from 'sonner';
import {
  Wallet, RefreshCcw, Plus, X, TrendingUp, ArrowDownCircle,
  IndianRupee, Building2, ShoppingCart, AlertTriangle,
  CheckCircle2, Search, Download, CreditCard, Banknote
} from 'lucide-react';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtK = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : fmt(v);

const MODE_COLORS = { NEFT: '#3B82F6', RTGS: '#8B5CF6', IMPS: '#10B981', UPI: '#F59E0B', CHEQUE: '#6B7280' };

const PayoutStatusBadge = ({ status }) => {
  const cfg = {
    COMPLETED: { cls: 'bg-green-100 text-green-700', label: 'Completed' },
    PENDING: { cls: 'bg-amber-100 text-amber-700', label: 'Pending' },
    FAILED: { cls: 'bg-red-100 text-red-700', label: 'Failed' },
  }[status] || { cls: 'bg-gray-100 text-gray-600', label: status || '—' };
  return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${cfg.cls}`}>{cfg.label}</span>;
};

const SkeletonRow = ({ cols = 6 }) => (
  <tr>
    {[...Array(cols)].map((_, i) => (
      <td key={i} className="px-4 py-3.5"><div className="h-3 bg-[var(--sattva-muted)] rounded animate-pulse w-20" /></td>
    ))}
  </tr>
);

const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="p-16 text-center">
    <Icon size={40} className="mx-auto text-gray-300 mb-3" />
    <p className="text-sm font-semibold text-[var(--sattva-ink)]">{title}</p>
    <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
  </div>
);

const exportCSV = (data, filename) => {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
};

// ── Payout Modal ──────────────────────────────────────────────────────────

const PayoutModal = ({ vendor, onClose, onSuccess }) => {
  const [form, setForm] = useState({ amount: '', reference_number: '', payment_mode: 'NEFT', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.reference_number) { toast.error('Amount and reference number required'); return; }
    if (parseFloat(form.amount) > vendor.pending_balance) { toast.error('Amount exceeds available balance'); return; }
    setLoading(true);
    try {
      await api.post('/vendor/ledger/admin/payouts', {
        vendor_id: vendor.vendor_id,
        amount: parseFloat(form.amount),
        reference_number: form.reference_number,
        payment_mode: form.payment_mode,
        notes: form.notes
      });
      toast.success(`Payout of ${fmt(form.amount)} initiated for ${vendor.store_name}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail?.message || 'Payout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg bg-[var(--sattva-surface)] rounded-2xl shadow-2xl border border-[color:var(--sattva-border)]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--sattva-border)]">
          <div className="flex items-center gap-2">
            <Banknote size={18} className="text-[var(--sattva-forest)]" />
            <h3 className="font-bold text-[var(--sattva-ink)]">Initiate Payout</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--sattva-muted)] transition-colors"><X size={16} /></button>
        </div>
        <div className="p-6">
          <div className="bg-[var(--sattva-muted)] rounded-xl p-4 mb-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 bg-[var(--sattva-forest)] rounded-full flex items-center justify-center text-white text-xs font-bold">
                {vendor.store_name?.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--sattva-ink)]">{vendor.store_name}</p>
                <p className="text-xs text-gray-500">{vendor.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[color:var(--sattva-border)] text-sm">
              <span className="text-gray-500">Available Balance</span>
              <span className="font-bold text-green-600 text-lg">{fmt(vendor.pending_balance)}</span>
            </div>
            {vendor.bank_details?.bank_name && (
              <div className="mt-2 pt-2 border-t border-[color:var(--sattva-border)] text-xs text-gray-500 flex items-center gap-1.5">
                <Building2 size={12} className="flex-shrink-0" />
                {vendor.bank_details.bank_name} · {vendor.bank_details.ifsc_code} · A/C: {vendor.bank_details.account_number}
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                <input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required max={vendor.pending_balance}
                  className="w-full pl-7 pr-4 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] text-[var(--sattva-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" placeholder="0.00" />
              </div>
              {form.amount && parseFloat(form.amount) > 0 && (
                <p className="text-[10px] text-gray-400 mt-1">Remaining after payout: {fmt(vendor.pending_balance - parseFloat(form.amount || 0))}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payment Mode *</label>
              <select value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] text-[var(--sattva-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]">
                {['NEFT', 'RTGS', 'IMPS', 'UPI', 'CHEQUE'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bank Reference / UTR Number *</label>
              <input type="text" value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} required
                className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] text-[var(--sattva-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" placeholder="UTR / Transaction reference" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] text-[var(--sattva-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" placeholder="Optional notes..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--sattva-forest)] text-white rounded-xl font-semibold text-sm disabled:opacity-60 hover:opacity-90 transition-opacity">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle2 size={14} /> Confirm Payout</>
                )}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2.5 border border-[color:var(--sattva-border)] rounded-xl text-sm text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────

export default function AdminPayouts() {
  const [balances, setBalances] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState({});
  const [financialOverview, setFinancialOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('balances');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        api.get('/vendor/ledger/admin/vendor-balances'),
        api.get('/vendor/ledger/admin/payouts'),
        api.get('/admin_users/financial-overview')
      ]);
      if (results[0].status === 'fulfilled') {
        setBalances(results[0].value.data.data || []);
        setSummary(results[0].value.data.summary || {});
      }
      if (results[1].status === 'fulfilled') {
        setPayouts(results[1].value.data.data || []);
      }
      if (results[2].status === 'fulfilled') {
        setFinancialOverview(results[2].value.data.data || null);
      }
      const allFailed = results.every(r => r.status === 'rejected');
      if (allFailed) setError('Failed to load payout data. Please check your connection and try again.');
    } catch {
      setError('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredBalances = balances.filter(v => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (v.store_name || '').toLowerCase().includes(q) || (v.email || '').toLowerCase().includes(q);
  });

  const filteredPayouts = payouts.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (p.vendor_name || '').toLowerCase().includes(q) || (p.reference_number || '').toLowerCase().includes(q);
  });

  const fin = financialOverview || {};
  const totalPayable = summary.total_payable || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--sattva-ink)]">Payout Management</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage vendor payouts and track platform financials</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCSV(tab === 'balances' ? balances : payouts, tab === 'balances' ? 'vendor-balances' : 'payout-history')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[var(--sattva-forest)] text-white rounded-lg hover:opacity-90 transition-opacity">
            <Download size={13} /> Export
          </button>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[color:var(--sattva-border)] rounded-lg hover:bg-[var(--sattva-muted)] transition-colors">
            <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={load} className="text-xs text-red-600 font-semibold underline">Retry</button>
        </div>
      )}

      {/* Financial Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { icon: IndianRupee, label: 'Total GMV', value: fmtK(fin.gmv), color: '#1A3C34' },
          { icon: ShoppingCart, label: 'Total Orders', value: (fin.total_orders || 0).toLocaleString('en-IN'), color: '#3B82F6' },
          { icon: Building2, label: 'Platform Commission', value: fmtK(fin.platform_commission), color: '#C8A96E' },
          { icon: TrendingUp, label: 'Vendor Earned', value: fmtK(fin.vendor_total_earned), color: '#8B5CF6' },
          { icon: ArrowDownCircle, label: 'Vendor Paid', value: fmtK(fin.vendor_total_paid), color: '#10B981' },
          { icon: Wallet, label: 'Total Payable', value: fmtK(fin.vendor_total_payable || totalPayable), color: totalPayable > 0 ? '#EF4444' : '#6B7280' },
        ].map(({ icon: Icon, label, value, color }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--sattva-surface)] rounded-xl border border-[color:var(--sattva-border)] p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <p className="text-lg font-black tabular-nums text-[var(--sattva-ink)]">{value}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          {[
            { v: 'balances', label: `Vendor Balances`, count: balances.length },
            { v: 'history', label: 'Payout History', count: payouts.length }
          ].map(t => (
            <button key={t.v} onClick={() => { setTab(t.v); setSearchQuery(''); }}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                tab === t.v
                  ? 'bg-[var(--sattva-forest)] text-white'
                  : 'border border-[color:var(--sattva-border)] text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)]'
              }`}>
              {t.label} <span className="ml-1 text-[10px] opacity-70">({t.count})</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={tab === 'balances' ? 'Search vendors...' : 'Search payouts...'}
            className="pl-9 pr-3 py-2 text-xs border border-[color:var(--sattva-border)] rounded-lg bg-[var(--sattva-surface)] text-[var(--sattva-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)] w-56"
          />
        </div>
      </div>

      {/* Content Table */}
      <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] overflow-hidden">
        {loading ? (
          <table className="w-full text-sm">
            <tbody>{[...Array(5)].map((_, i) => <SkeletonRow key={i} cols={tab === 'balances' ? 6 : 6} />)}</tbody>
          </table>
        ) : tab === 'balances' ? (
          filteredBalances.length === 0 ? (
            <EmptyState icon={Wallet} title="No vendor balances" subtitle="Vendor balances will appear here once orders are fulfilled and ledger entries are created." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
                  <tr>
                    {['Vendor', 'Total Earned', 'Paid Out', 'Pending Balance', 'Bank Details', 'Action'].map((h, i) => (
                      <th key={h} className={`${i === 0 || i === 4 ? 'text-left' : i === 5 ? 'text-center' : 'text-right'} px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--sattva-border)]">
                  {filteredBalances.map((v, i) => (
                    <motion.tr key={v.vendor_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-[var(--sattva-muted)] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--sattva-forest)] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {v.store_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-[var(--sattva-ink)] text-sm">{v.store_name || 'Unknown'}</p>
                            <p className="text-[10px] text-gray-400">{v.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-[var(--sattva-ink)] tabular-nums">{fmt(v.total_earned)}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-green-600 tabular-nums">{fmt(v.total_paid_out)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`font-bold tabular-nums ${v.pending_balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {fmt(v.pending_balance)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {v.bank_details?.bank_name ? (
                          <div className="text-xs text-gray-500">
                            <p className="font-medium">{v.bank_details.bank_name}</p>
                            <p className="font-mono text-[10px]">{v.bank_details.ifsc_code} · {v.bank_details.account_number}</p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Not provided</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          disabled={v.pending_balance <= 0}
                          onClick={() => setSelectedVendor(v)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--sattva-forest)] text-white text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-30 transition-opacity"
                        >
                          <Banknote size={12} /> Pay
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredPayouts.length === 0 ? (
            <EmptyState icon={ArrowDownCircle} title="No payouts yet" subtitle="Payouts will appear here once you initiate them from the Vendor Balances tab." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
                  <tr>
                    {['Vendor', 'Amount', 'Mode', 'Reference / UTR', 'Initiated By', 'Status', 'Date'].map((h, i) => (
                      <th key={h} className={`${i === 1 ? 'text-right' : 'text-left'} px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--sattva-border)]">
                  {filteredPayouts.map((p, i) => (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-[var(--sattva-muted)] transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[var(--sattva-ink)]">{p.vendor_name || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-green-600 tabular-nums">{fmt(p.amount)}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: MODE_COLORS[p.payment_mode] || '#6B7280' }} />
                          {p.payment_mode}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{p.reference_number}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{p.initiated_by_email || '—'}</td>
                      <td className="px-4 py-3.5"><PayoutStatusBadge status={p.status} /></td>
                      <td className="px-4 py-3.5 text-xs text-gray-400">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Summary bar */}
      {!loading && tab === 'balances' && balances.length > 0 && (
        <div className="bg-[var(--sattva-muted)] rounded-xl p-4 flex flex-wrap items-center gap-6 text-sm">
          <span className="text-gray-500 font-medium">Summary:</span>
          <span className="font-bold text-[var(--sattva-ink)]">{balances.length} vendor{balances.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-500">·</span>
          <span className="font-bold text-red-600">{fmt(totalPayable)} total payable</span>
          <span className="text-gray-500">·</span>
          <span className="font-bold text-green-600">{fmt(balances.reduce((s, v) => s + (v.total_paid_out || 0), 0))} total paid</span>
        </div>
      )}

      {selectedVendor && (
        <PayoutModal vendor={selectedVendor} onClose={() => setSelectedVendor(null)} onSuccess={load} />
      )}
    </div>
  );
}
