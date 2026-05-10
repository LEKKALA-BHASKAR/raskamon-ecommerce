import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, TrendingUp, Users, Settings, Gift, CreditCard,
  Plus, Edit2, Trash2, CheckCircle, XCircle, Search,
  ChevronLeft, ChevronRight, RefreshCw, ArrowUpRight, ArrowDownLeft,
  ToggleLeft, ToggleRight, Eye, X, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';

const TABS = ['Overview', 'Wallets', 'Transactions', 'Campaigns', 'Referrals', 'Settings'];

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const Badge = ({ status }) => {
  const map = {
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    expired: 'bg-gray-100 text-gray-500',
    reversed: 'bg-red-100 text-red-600',
    rewarded: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-600',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
};

// ── Overview ────────────────────────────────────────────────────────────────

const OverviewTab = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/wallet/analytics');
        setAnalytics(res.data);
      } catch { toast.error('Failed to load analytics'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );

  const stats = [
    { label: 'Total Wallet Liability', value: `₹${fmt(analytics?.totalBalance)}`, icon: Wallet, color: 'text-[var(--sattva-forest)]', bg: 'bg-green-50' },
    { label: 'Total Distributed', value: `₹${fmt(analytics?.totalDistributed)}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Campaigns', value: analytics?.activeCampaigns || 0, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Total Wallets', value: analytics?.walletCount || 0, icon: Users, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card-sattva p-5">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-sattva p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp size={16} /> Transaction Summary</h3>
          <div className="space-y-3">
            {[
              { label: 'Cashback Transactions', value: analytics?.totalCashbackTransactions || 0 },
              { label: 'Referral Bonus Transactions', value: analytics?.totalReferralTransactions || 0 },
              { label: 'Frozen Wallets', value: analytics?.frozenCount || 0 },
              { label: 'Total Spent by Users', value: `₹${fmt(analytics?.totalSpent)}` },
              { label: 'Total Expired Rewards', value: `₹${fmt(analytics?.totalExpired)}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-sattva p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Users size={16} /> Top Wallets by Balance</h3>
          <div className="space-y-2">
            {(analytics?.topWallets || []).slice(0, 6).map((w, i) => (
              <div key={w.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                  <div>
                    <p className="text-sm font-medium">{w.userName || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{w.userEmail}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-[var(--sattva-forest)]">₹{fmt(w.balance)}</span>
              </div>
            ))}
            {!analytics?.topWallets?.length && (
              <p className="text-sm text-gray-400 text-center py-4">No wallet data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Wallets Tab ─────────────────────────────────────────────────────────────

const WalletDetailModal = ({ userId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creditAmount, setCreditAmount] = useState('');
  const [debitAmount, setDebitAmount] = useState('');
  const [description, setDescription] = useState('');
  const [actionType, setActionType] = useState(null); // 'credit' | 'debit'

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/admin/wallet/wallet/${userId}`);
        setData(res.data);
      } catch { toast.error('Failed to load wallet'); }
      finally { setLoading(false); }
    };
    load();
  }, [userId]);

  const handleCredit = async () => {
    if (!creditAmount || !description) { toast.error('Fill all fields'); return; }
    try {
      await api.post('/admin/wallet/credit', { user_id: userId, amount: parseFloat(creditAmount), description });
      toast.success('Wallet credited!');
      setCreditAmount(''); setDescription(''); setActionType(null);
      const res = await api.get(`/admin/wallet/wallet/${userId}`);
      setData(res.data);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleDebit = async () => {
    if (!debitAmount || !description) { toast.error('Fill all fields'); return; }
    try {
      await api.post('/admin/wallet/debit', { user_id: userId, amount: parseFloat(debitAmount), description });
      toast.success('Wallet debited!');
      setDebitAmount(''); setDescription(''); setActionType(null);
      const res = await api.get(`/admin/wallet/wallet/${userId}`);
      setData(res.data);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleFreeze = async (freeze) => {
    try {
      await api.post('/admin/wallet/freeze', { user_id: userId, freeze });
      toast.success(freeze ? 'Wallet frozen' : 'Wallet unfrozen');
      const res = await api.get(`/admin/wallet/wallet/${userId}`);
      setData(res.data);
    } catch (err) { toast.error('Failed'); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[color:var(--sattva-border)] flex items-center justify-between">
          <h3 className="font-semibold text-lg">Wallet Detail</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="p-6 space-y-3"><Skeleton className="h-20" /><Skeleton className="h-40" /></div>
        ) : (
          <div className="p-5 space-y-4">
            {/* User info */}
            <div className="bg-[var(--sattva-muted)] rounded-xl p-4">
              <p className="font-semibold">{data?.user?.name}</p>
              <p className="text-sm text-gray-500">{data?.user?.email}</p>
              <p className="text-2xl font-black text-[var(--sattva-forest)] mt-2">₹{fmt(data?.wallet?.balance)}</p>
              {data?.wallet?.isFrozen && <Badge status="frozen" />}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={() => setActionType('credit')} className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-semibold text-green-600 border border-green-200 rounded-xl hover:bg-green-50">
                <ArrowDownLeft size={14} /> Credit
              </button>
              <button onClick={() => setActionType('debit')} className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50">
                <ArrowUpRight size={14} /> Debit
              </button>
              <button
                onClick={() => handleFreeze(!data?.wallet?.isFrozen)}
                className="flex-1 flex items-center justify-center gap-1 py-2 text-sm font-semibold border border-[color:var(--sattva-border)] rounded-xl hover:bg-gray-50"
              >
                {data?.wallet?.isFrozen ? <ToggleRight size={14} className="text-green-600" /> : <ToggleLeft size={14} className="text-red-500" />}
                {data?.wallet?.isFrozen ? 'Unfreeze' : 'Freeze'}
              </button>
            </div>

            {actionType && (
              <div className="p-4 border border-[color:var(--sattva-border)] rounded-xl space-y-2">
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={actionType === 'credit' ? creditAmount : debitAmount}
                  onChange={e => actionType === 'credit' ? setCreditAmount(e.target.value) : setDebitAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg"
                />
                <div className="flex gap-2">
                  <button onClick={actionType === 'credit' ? handleCredit : handleDebit} className="flex-1 btn-primary py-2 text-sm">
                    Confirm {actionType}
                  </button>
                  <button onClick={() => setActionType(null)} className="btn-outlined py-2 px-4 text-sm">Cancel</button>
                </div>
              </div>
            )}

            {/* Recent transactions */}
            <div>
              <h4 className="font-semibold text-sm mb-2">Recent Transactions</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(data?.transactions?.transactions || []).map(txn => (
                  <div key={txn.id} className="flex justify-between items-center text-sm py-1.5 border-b border-[color:var(--sattva-border)]">
                    <div>
                      <p className="font-medium text-xs">{txn.description}</p>
                      <p className="text-[10px] text-gray-400">{new Date(txn.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className={`font-bold ${['cashback','referral_bonus','admin_credit','refund'].includes(txn.type) ? 'text-green-600' : 'text-red-500'}`}>
                      {['cashback','referral_bonus','admin_credit','refund'].includes(txn.type) ? '+' : '-'}₹{fmt(txn.amount)}
                    </span>
                  </div>
                ))}
                {!data?.transactions?.transactions?.length && (
                  <p className="text-xs text-gray-400 text-center py-4">No transactions</p>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const WalletsTab = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const LIMIT = 15;

  const load = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/wallet/wallets?page=${p}&limit=${LIMIT}&search=${q}`);
      setWallets(res.data.wallets || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
      setPage(p);
    } catch { toast.error('Failed to load wallets'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1, ''); }, [load]);

  return (
    <div>
      {selectedUserId && (
        <WalletDetailModal userId={selectedUserId} onClose={() => { setSelectedUserId(null); load(page, search); }} />
      )}

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(1, search)}
            placeholder="Search by user ID..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)]"
          />
        </div>
        <button onClick={() => load(1, search)} className="btn-outlined px-4 py-2 text-sm">Search</button>
      </div>

      <p className="text-xs text-gray-400 mb-3">{total} wallets</p>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <div className="card-sattva overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--sattva-muted)] text-xs font-semibold text-gray-500 uppercase">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-right px-4 py-3">Balance</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Earned</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--sattva-border)]">
              {wallets.map(w => (
                <tr key={w.id} className="hover:bg-[var(--sattva-muted)]/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{w.userName || '—'}</p>
                    <p className="text-xs text-gray-400">{w.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[var(--sattva-forest)]">₹{fmt(w.balance)}</td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">₹{fmt(w.lifetimeEarned)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge status={w.isFrozen ? 'frozen' : 'active'} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedUserId(w.userId)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-[var(--sattva-forest)]"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!wallets.length && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No wallets found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => load(page - 1, search)} disabled={page <= 1} className="p-2 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          <button onClick={() => load(page + 1, search)} disabled={page >= pages} className="p-2 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Transactions Tab ─────────────────────────────────────────────────────────

const TransactionsTab = () => {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', type: '', search: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async (p = 1, f = filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (f.status) params.set('status', f.status);
      if (f.type) params.set('type', f.type);
      if (f.search) params.set('search', f.search);
      const res = await api.get(`/admin/wallet/transactions?${params}`);
      setTxns(res.data.transactions || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
      setPage(p);
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { load(1, filters); }, []); // eslint-disable-line

  const isCredit = (type) => ['cashback', 'referral_bonus', 'admin_credit', 'refund', 'promotional_reward'].includes(type);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="text-sm border border-[color:var(--sattva-border)] rounded-xl px-3 py-2 bg-white">
          <option value="">All Status</option>
          {['completed','pending','expired','reversed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))} className="text-sm border border-[color:var(--sattva-border)] rounded-xl px-3 py-2 bg-white">
          <option value="">All Types</option>
          {['cashback','referral_bonus','admin_credit','admin_debit','refund','promotional_reward','order_redemption','reward_expiry'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={e => setFilters(f => ({...f, search: e.target.value}))}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl"
          />
        </div>
        <button onClick={() => load(1, filters)} className="btn-primary px-4 py-2 text-sm">Filter</button>
      </div>

      <p className="text-xs text-gray-400 mb-3">{total} transactions</p>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <div className="card-sattva overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--sattva-muted)] text-xs font-semibold text-gray-500 uppercase">
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Description</th>
                <th className="text-center px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3 hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--sattva-border)]">
              {txns.map(txn => (
                <tr key={txn.id} className="hover:bg-[var(--sattva-muted)]/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-xs">{txn.userName || '—'}</p>
                    <p className="text-[10px] text-gray-400">{txn.userEmail}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-gray-600 truncate max-w-[180px]">{txn.description}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs bg-[var(--sattva-muted)] px-2 py-0.5 rounded-full">{txn.type?.replace('_', ' ')}</span>
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${isCredit(txn.type) ? 'text-green-600' : 'text-red-500'}`}>
                    {isCredit(txn.type) ? '+' : '-'}₹{fmt(txn.amount)}
                  </td>
                  <td className="px-4 py-3 text-center"><Badge status={txn.status} /></td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400 hidden lg:table-cell">
                    {new Date(txn.createdAt).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
              {!txns.length && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No transactions found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => load(page - 1, filters)} disabled={page <= 1} className="p-2 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          <button onClick={() => load(page + 1, filters)} disabled={page >= pages} className="p-2 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Campaigns Tab ────────────────────────────────────────────────────────────

const CampaignModal = ({ campaign, onClose, onSaved }) => {
  const isEdit = !!campaign?.id;
  const [form, setForm] = useState(campaign || {
    name: '', type: 'percentage', value: 2, minOrderAmount: 0,
    maxCashback: '', applicableTo: 'all', isActive: true,
    startsAt: '', endsAt: '', paymentMethods: [], categoryIds: [], productIds: [], userTiers: [],
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name || !form.value) { toast.error('Fill required fields'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: parseFloat(form.value),
        minOrderAmount: parseFloat(form.minOrderAmount || 0),
        maxCashback: form.maxCashback ? parseFloat(form.maxCashback) : null,
      };
      if (isEdit) {
        await api.put(`/admin/wallet/campaigns/${campaign.id}`, payload);
        toast.success('Campaign updated!');
      } else {
        await api.post('/admin/wallet/campaigns', payload);
        toast.success('Campaign created!');
      }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const f = (key) => ({ value: form[key] ?? '', onChange: e => setForm(p => ({...p, [key]: e.target.value})) });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[color:var(--sattva-border)] flex justify-between items-center">
          <h3 className="font-semibold">{isEdit ? 'Edit Campaign' : 'New Campaign'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={14} /></button>
        </div>
        <div className="p-5 space-y-3">
          {[
            { key: 'name', label: 'Campaign Name *', type: 'text' },
            { key: 'value', label: `${form.type === 'percentage' ? 'Cashback %' : 'Flat Amount (₹)'} *`, type: 'number' },
            { key: 'minOrderAmount', label: 'Min Order Amount (₹)', type: 'number' },
            { key: 'maxCashback', label: 'Max Cashback Cap (₹)', type: 'number' },
          ].map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
              <input type={type} {...f(key)} className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Type</label>
            <select {...f('type')} className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-white">
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount (₹)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Applicable To</label>
            <select {...f('applicableTo')} className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-white">
              {['all', 'first_order', 'category', 'product'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Starts At</label>
              <input type="datetime-local" {...f('startsAt')} className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ends At</label>
              <input type="datetime-local" {...f('endsAt')} className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({...p, isActive: e.target.checked}))} className="rounded" />
            <label className="text-sm font-medium">Active</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary py-2.5 text-sm">
              {saving ? 'Saving...' : isEdit ? 'Update Campaign' : 'Create Campaign'}
            </button>
            <button onClick={onClose} className="btn-outlined px-4 py-2.5 text-sm">Cancel</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const CampaignsTab = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | campaign object

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/wallet/campaigns');
      setCampaigns(res.data.campaigns || []);
    } catch { toast.error('Failed to load campaigns'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await api.delete(`/admin/wallet/campaigns/${id}`);
      toast.success('Campaign deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (c) => {
    try {
      await api.put(`/admin/wallet/campaigns/${c.id}`, { ...c, isActive: !c.isActive });
      toast.success(c.isActive ? 'Campaign deactivated' : 'Campaign activated');
      load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      {modal && (
        <CampaignModal
          campaign={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setModal('new')} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16">
          <Award size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No campaigns yet</p>
          <button onClick={() => setModal('new')} className="mt-3 btn-primary px-4 py-2 text-sm">Create First Campaign</button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="card-sattva p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold">{c.name}</p>
                  <Badge status={c.isActive ? 'active' : 'inactive'} />
                </div>
                <p className="text-sm text-gray-500">
                  {c.type === 'percentage' ? `${c.value}% cashback` : `₹${c.value} flat cashback`}
                  {c.minOrderAmount > 0 && ` · Min order ₹${c.minOrderAmount}`}
                  {c.maxCashback && ` · Max ₹${c.maxCashback}`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Applies to: {c.applicableTo} ·
                  {c.endsAt ? ` Ends ${new Date(c.endsAt).toLocaleDateString('en-IN')}` : ' No expiry'}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => handleToggle(c)} className="p-2 hover:bg-gray-100 rounded-lg">
                  {c.isActive ? <ToggleRight size={16} className="text-green-600" /> : <ToggleLeft size={16} className="text-gray-400" />}
                </button>
                <button onClick={() => setModal(c)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Referrals Tab ────────────────────────────────────────────────────────────

const ReferralsTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async (p = 1, s = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: LIMIT });
      if (s) params.set('status', s);
      const res = await api.get(`/admin/wallet/referrals?${params}`);
      setData(res.data);
      setPage(p);
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(1, ''); }, []); // eslint-disable-line

  const stats = data?.stats || {};

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.totalReferrals || 0, color: 'text-gray-700' },
          { label: 'Successful', value: stats.successfulReferrals || 0, color: 'text-green-600' },
          { label: 'Pending', value: stats.pendingReferrals || 0, color: 'text-yellow-600' },
          { label: 'Failed', value: stats.failedReferrals || 0, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-sattva p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); load(1, e.target.value); }} className="text-sm border border-[color:var(--sattva-border)] rounded-xl px-3 py-2 bg-white">
          <option value="">All Status</option>
          {['pending','rewarded','failed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
      ) : (
        <div className="card-sattva overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--sattva-muted)] text-xs font-semibold text-gray-500 uppercase">
                <th className="text-left px-4 py-3">Referrer</th>
                <th className="text-left px-4 py-3">Referee</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Bonus</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--sattva-border)]">
              {(data?.referrals || []).map(r => (
                <tr key={r.id} className="hover:bg-[var(--sattva-muted)]/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-xs">{r.referrerName || '—'}</p>
                    <p className="text-[10px] text-gray-400">{r.referrerEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-xs">{r.refereeName || '—'}</p>
                    <p className="text-[10px] text-gray-400">{r.refereeEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-center"><Badge status={r.status} /></td>
                  <td className="px-4 py-3 text-right text-xs">
                    <span className="text-green-600">+₹{r.referrerBonus}</span>
                    <span className="text-gray-300 mx-1">/</span>
                    <span className="text-purple-600">+₹{r.refereeBonus}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400 hidden md:table-cell">
                    {new Date(r.createdAt).toLocaleDateString('en-IN')}
                  </td>
                </tr>
              ))}
              {!data?.referrals?.length && (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No referrals found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(data?.pages || 1) > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => load(page - 1)} disabled={page <= 1} className="p-2 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm">{page} / {data?.pages}</span>
          <button onClick={() => load(page + 1)} disabled={page >= (data?.pages || 1)} className="p-2 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Settings Tab ─────────────────────────────────────────────────────────────

const SettingsTab = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/admin/wallet/settings');
        setSettings(res.data);
      } catch { toast.error('Failed to load settings'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/admin/wallet/settings', settings);
      setSettings(res.data);
      toast.success('Settings saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  const numberField = (key, label, suffix = '') => (
    <div key={key}>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          step="0.01"
          value={settings[key] ?? ''}
          onChange={e => setSettings(s => ({...s, [key]: parseFloat(e.target.value)}))}
          className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl"
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>}
      </div>
    </div>
  );

  const toggleField = (key, label) => (
    <div key={key} className="flex items-center justify-between p-4 border border-[color:var(--sattva-border)] rounded-xl">
      <div>
        <p className="font-medium text-sm">{label}</p>
      </div>
      <button
        onClick={() => setSettings(s => ({...s, [key]: !s[key]}))}
        className={`relative w-12 h-6 rounded-full transition-colors ${settings[key] ? 'bg-[var(--sattva-forest)]' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[key] ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <div className="card-sattva p-5 space-y-4">
        <h3 className="font-semibold mb-2">Feature Toggles</h3>
        {[
          ['cashbackEnabled', 'Enable Cashback'],
          ['referralEnabled', 'Enable Referral Program'],
          ['walletRedemptionEnabled', 'Enable Wallet Redemption at Checkout'],
        ].map(([key, label]) => toggleField(key, label))}
      </div>

      <div className="card-sattva p-5 space-y-4">
        <h3 className="font-semibold mb-2">Cashback Settings</h3>
        {numberField('defaultCashbackPercent', 'Default Cashback %', '%')}
        {numberField('cashbackExpiryDays', 'Cashback Expiry (days)', 'days')}
      </div>

      <div className="card-sattva p-5 space-y-4">
        <h3 className="font-semibold mb-2">Referral Bonuses</h3>
        {numberField('referrerBonus', 'Referrer Bonus (₹)', '₹')}
        {numberField('refereeBonus', 'Referee Welcome Bonus (₹)', '₹')}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Referral Condition</label>
          <select
            value={settings.referralCondition || 'first_order'}
            onChange={e => setSettings(s => ({...s, referralCondition: e.target.value}))}
            className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-white"
          >
            <option value="first_order">First Paid Order</option>
            <option value="any_order">Any Paid Order</option>
          </select>
        </div>
      </div>

      <div className="card-sattva p-5 space-y-4">
        <h3 className="font-semibold mb-2">Wallet Redemption Limits</h3>
        {numberField('maxRedemptionPercent', 'Max Redemption % of Order', '%')}
        {numberField('minRedemptionAmount', 'Min Redemption Amount (₹)', '₹')}
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-3">
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};

// ── Main AdminWallet ─────────────────────────────────────────────────────────

const AdminWallet = () => {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-[var(--sattva-ink)]">Wallet & Rewards</h1>
        <p className="text-sm text-gray-500 mt-1">Manage cashback, referrals, campaigns and wallet transactions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--sattva-muted)] p-1 rounded-xl mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-white shadow text-[var(--sattva-forest)]'
                : 'text-gray-500 hover:text-[var(--sattva-ink)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'Overview' && <OverviewTab />}
          {activeTab === 'Wallets' && <WalletsTab />}
          {activeTab === 'Transactions' && <TransactionsTab />}
          {activeTab === 'Campaigns' && <CampaignsTab />}
          {activeTab === 'Referrals' && <ReferralsTab />}
          {activeTab === 'Settings' && <SettingsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminWallet;
