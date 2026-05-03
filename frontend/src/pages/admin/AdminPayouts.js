import React, { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import { toast } from 'sonner';
import { Wallet, RefreshCcw, Plus, X } from 'lucide-react';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[color:var(--sattva-border)]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-[var(--sattva-ink)]">Initiate Payout</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--sattva-muted)]"><X size={16} /></button>
        </div>
        <div className="p-6">
          <div className="bg-[var(--sattva-muted)] rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-[var(--sattva-ink)]">{vendor.store_name}</p>
            <p className="text-xs text-gray-500">{vendor.email}</p>
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-gray-500">Available Balance:</span>
              <span className="font-bold text-green-700">{fmt(vendor.pending_balance)}</span>
            </div>
            {vendor.bank_details && (
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                {vendor.bank_details.bank_name} · {vendor.bank_details.ifsc_code} · A/C: {vendor.bank_details.account_number}
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required max={vendor.pending_balance} className="w-full pl-7 pr-4 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Payment Mode *</label>
              <select value={form.payment_mode} onChange={e => setForm(f => ({ ...f, payment_mode: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none bg-white">
                {['NEFT', 'RTGS', 'IMPS', 'UPI', 'CHEQUE'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Bank Reference / UTR Number *</label>
              <input type="text" value={form.reference_number} onChange={e => setForm(f => ({ ...f, reference_number: e.target.value }))} required className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" placeholder="UTR / Transaction reference" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" placeholder="Optional notes..." />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[var(--sattva-forest)] text-white rounded-xl font-semibold text-sm disabled:opacity-60">
                {loading ? 'Processing...' : 'Confirm Payout'}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2.5 border border-[color:var(--sattva-border)] rounded-xl text-sm">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default function AdminPayouts() {
  const [balances, setBalances] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState({});
  const [financialOverview, setFinancialOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('balances');
  const [selectedVendor, setSelectedVendor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, pout, fin] = await Promise.all([
        api.get('/vendor/ledger/admin/vendor-balances'),
        api.get('/vendor/ledger/admin/payouts'),
        api.get('/admin_users/financial-overview')
      ]);
      setBalances(bal.data.data);
      setSummary(bal.data.summary);
      setPayouts(pout.data.data);
      setFinancialOverview(fin.data.data);
    } catch {
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--sattva-ink)]">Payout Management</h1>
          <p className="text-sm text-gray-500">Manage vendor payouts and track platform financials</p>
        </div>
        <button onClick={load} className="p-2 border border-[color:var(--sattva-border)] rounded-xl hover:bg-[var(--sattva-muted)] text-gray-500">
          <RefreshCcw size={15} />
        </button>
      </div>

      {/* Financial Overview */}
      {financialOverview && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Total GMV', value: fmt(financialOverview.gmv), color: 'text-[var(--sattva-forest)]' },
            { label: 'Total Orders', value: financialOverview.total_orders, color: 'text-blue-600' },
            { label: 'Platform Commission', value: fmt(financialOverview.platform_commission), color: 'text-amber-700' },
            { label: 'Vendor Earned', value: fmt(financialOverview.vendor_total_earned), color: 'text-gray-700' },
            { label: 'Vendor Paid', value: fmt(financialOverview.vendor_total_paid), color: 'text-green-700' },
            { label: 'Total Payable', value: fmt(financialOverview.vendor_total_payable), color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[var(--sattva-surface)] rounded-xl border border-[color:var(--sattva-border)] p-4">
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { v: 'balances', label: `Vendor Balances (${summary.total_vendors || 0})` },
          { v: 'history', label: 'Payout History' }
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${tab === t.v ? 'bg-[var(--sattva-forest)] text-white' : 'border border-[color:var(--sattva-border)] hover:bg-[var(--sattva-muted)]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : tab === 'balances' ? (
          <table className="w-full text-sm">
            <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total Earned</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Paid Out</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Pending</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--sattva-border)]">
              {balances.map(v => (
                <tr key={v.vendor_id} className="hover:bg-[var(--sattva-muted)]/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[var(--sattva-ink)]">{v.store_name}</p>
                    <p className="text-xs text-gray-400">{v.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(v.total_earned)}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-semibold">{fmt(v.total_paid_out)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold ${v.pending_balance > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {fmt(v.pending_balance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <p>{v.bank_details?.bank_name}</p>
                    <p className="font-mono">{v.bank_details?.ifsc_code}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={v.pending_balance <= 0}
                      onClick={() => setSelectedVendor(v)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[var(--sattva-forest)] text-white text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-40 ml-auto"
                    >
                      <Plus size={12} /> Payout
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          payouts.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No payouts yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vendor</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">By</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--sattva-border)]">
                {payouts.map(p => (
                  <tr key={p.id} className="hover:bg-[var(--sattva-muted)]/40">
                    <td className="px-4 py-3 font-semibold text-[var(--sattva-ink)]">{p.vendor_name}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.payment_mode}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.reference_number}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.initiated_by_email}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {selectedVendor && (
        <PayoutModal vendor={selectedVendor} onClose={() => setSelectedVendor(null)} onSuccess={load} />
      )}
    </div>
  );
}
