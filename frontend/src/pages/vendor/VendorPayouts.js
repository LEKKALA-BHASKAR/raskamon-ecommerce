import React, { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import { toast } from 'sonner';
import { Wallet, ArrowDownCircle, TrendingUp, RefreshCcw } from 'lucide-react';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const StatusBadge = ({ status }) => {
  const cls = status === 'COMPLETED' ? 'bg-green-100 text-green-700' : status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${cls}`}>{status}</span>;
};

export default function VendorPayouts() {
  const [balance, setBalance] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('payouts');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bal, pout, txn] = await Promise.all([
        api.get('/vendor/ledger/balance'),
        api.get('/vendor/ledger/payouts'),
        api.get('/vendor/ledger/transactions')
      ]);
      setBalance(bal.data.data);
      setPayouts(pout.data.data);
      setTransactions(txn.data.data);
    } catch {
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--sattva-ink)]">Payouts & Ledger</h1>
        <button onClick={load} className="p-2 border border-[color:var(--sattva-border)] rounded-xl hover:bg-[var(--sattva-muted)] text-gray-500">
          <RefreshCcw size={15} />
        </button>
      </div>

      {/* Balance Cards */}
      {balance && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-5">
            <TrendingUp size={20} className="text-[var(--sattva-forest)] mb-2" />
            <p className="text-2xl font-bold text-[var(--sattva-ink)]">{fmt(balance.total_earned)}</p>
            <p className="text-sm text-gray-500">Total Earned</p>
            <p className="text-xs text-gray-400 mt-0.5">Commission rate: {balance.commission_rate}%</p>
          </div>
          <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-5">
            <ArrowDownCircle size={20} className="text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-[var(--sattva-ink)]">{fmt(balance.total_paid_out)}</p>
            <p className="text-sm text-gray-500">Paid Out</p>
            <p className="text-xs text-gray-400 mt-0.5">{balance.transaction_count} transactions</p>
          </div>
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
            <Wallet size={20} className="text-amber-600 mb-2" />
            <p className="text-2xl font-bold text-amber-700">{fmt(balance.pending_balance)}</p>
            <p className="text-sm text-amber-600 font-medium">Pending Balance</p>
            <p className="text-xs text-amber-500 mt-0.5">Contact admin to initiate payout</p>
          </div>
        </div>
      )}

      {/* Notice */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 mb-6">
        Payouts are processed manually by the admin. To request a payout, contact your account manager. All payments from B2B orders are held in the platform escrow until payout is initiated.
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {['payouts', 'transactions'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors capitalize ${tab === t ? 'bg-[var(--sattva-forest)] text-white' : 'border border-[color:var(--sattva-border)] hover:bg-[var(--sattva-muted)]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : tab === 'payouts' ? (
          payouts.length === 0 ? (
            <div className="p-12 text-center">
              <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No payouts yet</p>
              <p className="text-sm text-gray-400">Payouts appear here when admin transfers funds to your bank account</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Payout ID</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--sattva-border)]">
                {payouts.map(p => (
                  <tr key={p.id} className="hover:bg-[var(--sattva-muted)]/40">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.id}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">{fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.payment_mode}</td>
                    <td className="px-4 py-3 font-mono text-xs">{p.reference_number}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          transactions.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No transactions yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--sattva-border)]">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-[var(--sattva-muted)]/40">
                    <td className="px-4 py-3 text-gray-700">{t.description}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${t.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${t.type === 'CREDIT' ? 'text-green-700' : 'text-red-600'}`}>
                      {t.type === 'CREDIT' ? '+' : '-'}{fmt(t.net_amount || t.amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
