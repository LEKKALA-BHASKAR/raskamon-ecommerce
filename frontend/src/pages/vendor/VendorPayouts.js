import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import { toast } from 'sonner';
import { Wallet, ArrowDownCircle, TrendingUp, RefreshCcw, AlertTriangle, Banknote, FileText } from 'lucide-react';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtK = v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}k` : fmt(v);

const StatusBadge = ({ status }) => {
  const cfg = {
    COMPLETED: { cls: 'bg-green-100 text-green-700', label: 'Completed' },
    PENDING: { cls: 'bg-amber-100 text-amber-700', label: 'Pending' },
    FAILED: { cls: 'bg-red-100 text-red-700', label: 'Failed' },
  }[status] || { cls: 'bg-gray-100 text-gray-600', label: status || '—' };
  return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${cfg.cls}`}>{cfg.label}</span>;
};

const SkeletonRow = ({ cols = 4 }) => (
  <tr>{[...Array(cols)].map((_, i) => <td key={i} className="px-4 py-3.5"><div className="h-3 bg-[var(--sattva-muted)] rounded animate-pulse w-20" /></td>)}</tr>
);

export default function VendorPayouts() {
  const [balance, setBalance] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('payouts');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.allSettled([
        api.get('/vendor/ledger/balance'),
        api.get('/vendor/ledger/payouts'),
        api.get('/vendor/ledger/transactions')
      ]);
      if (results[0].status === 'fulfilled') setBalance(results[0].value.data.data);
      if (results[1].status === 'fulfilled') setPayouts(results[1].value.data.data || []);
      if (results[2].status === 'fulfilled') setTransactions(results[2].value.data.data || []);
      if (results.every(r => r.status === 'rejected')) setError('Failed to load payout data. Please try again.');
    } catch {
      setError('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-[var(--sattva-ink)]">Payouts & Ledger</h1>
          <p className="text-xs text-gray-400 mt-0.5">Track your earnings, payouts, and transaction history</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-[color:var(--sattva-border)] rounded-lg hover:bg-[var(--sattva-muted)] transition-colors">
          <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={load} className="text-xs text-red-600 font-semibold underline">Retry</button>
        </div>
      )}

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: TrendingUp, label: 'Total Earned', value: fmtK(balance?.total_earned), sub: `Commission rate: ${balance?.commission_rate || 0}%`, color: '#1A3C34' },
          { icon: ArrowDownCircle, label: 'Paid Out', value: fmtK(balance?.total_paid_out), sub: `${balance?.transaction_count || 0} transactions`, color: '#3B82F6' },
          { icon: Wallet, label: 'Pending Balance', value: fmtK(balance?.pending_balance), sub: 'Contact admin to initiate payout', color: '#F59E0B' },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-5 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${color}15` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <p className="text-2xl font-black tabular-nums text-[var(--sattva-ink)]">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5 font-medium">{label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Notice */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-start gap-2">
        <Banknote size={14} className="flex-shrink-0 mt-0.5 text-blue-500" />
        <span>Payouts are processed manually by the admin. To request a payout, contact your account manager. All payments are held in the platform escrow until payout is initiated.</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { v: 'payouts', label: 'Payouts', count: payouts.length },
          { v: 'transactions', label: 'Transactions', count: transactions.length }
        ].map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
              tab === t.v
                ? 'bg-[var(--sattva-forest)] text-white'
                : 'border border-[color:var(--sattva-border)] text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)]'
            }`}>
            {t.label} <span className="ml-1 text-[10px] opacity-70">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] overflow-hidden">
        {loading ? (
          <table className="w-full text-sm"><tbody>{[...Array(4)].map((_, i) => <SkeletonRow key={i} cols={tab === 'payouts' ? 6 : 4} />)}</tbody></table>
        ) : tab === 'payouts' ? (
          payouts.length === 0 ? (
            <div className="p-16 text-center">
              <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-[var(--sattva-ink)]">No payouts yet</p>
              <p className="text-xs text-gray-400 mt-1">Payouts appear here when admin transfers funds to your bank account</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
                  <tr>
                    {['Payout ID', 'Amount', 'Mode', 'Reference', 'Status', 'Date'].map((h, i) => (
                      <th key={h} className={`${i === 1 ? 'text-right' : i === 4 ? 'text-center' : i === 5 ? 'text-right' : 'text-left'} px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--sattva-border)]">
                  {payouts.map((p, i) => (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-[var(--sattva-muted)] transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-gray-400">{p.id}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-green-600 tabular-nums">{fmt(p.amount)}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-[var(--sattva-ink)]">{p.payment_mode}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{p.reference_number}</td>
                      <td className="px-4 py-3.5 text-center"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3.5 text-right text-xs text-gray-400">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          transactions.length === 0 ? (
            <div className="p-16 text-center">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-[var(--sattva-ink)]">No transactions yet</p>
              <p className="text-xs text-gray-400 mt-1">Sales credits and payout debits will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
                  <tr>
                    {['Description', 'Type', 'Amount', 'Date'].map((h, i) => (
                      <th key={h} className={`${i === 1 ? 'text-center' : i >= 2 ? 'text-right' : 'text-left'} px-4 py-3 text-[10px] font-semibold text-gray-500 uppercase tracking-wider`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--sattva-border)]">
                  {transactions.map((t, i) => (
                    <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-[var(--sattva-muted)] transition-colors">
                      <td className="px-4 py-3.5 text-[var(--sattva-ink)]">{t.description}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${t.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 text-right font-bold tabular-nums ${t.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'CREDIT' ? '+' : '-'}{fmt(t.net_amount || t.amount)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs text-gray-400">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
