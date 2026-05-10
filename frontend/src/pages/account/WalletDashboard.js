import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, ArrowUpRight, ArrowDownLeft, Clock, Gift, Users,
  Copy, Share2, CheckCircle, TrendingUp, RefreshCw, ChevronLeft, ChevronRight,
  Zap, Star, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TABS = ['Wallet', 'Transactions', 'Cashback', 'Referral'];

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE_ICONS = {
  cashback: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
  referral_bonus: { icon: Gift, color: 'text-purple-500', bg: 'bg-purple-50' },
  admin_credit: { icon: ArrowDownLeft, color: 'text-blue-500', bg: 'bg-blue-50' },
  admin_debit: { icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-50' },
  refund: { icon: RefreshCw, color: 'text-orange-500', bg: 'bg-orange-50' },
  promotional_reward: { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  order_redemption: { icon: Wallet, color: 'text-red-500', bg: 'bg-red-50' },
  reward_expiry: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-100' },
};

const STATUS_BADGE = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-gray-100 text-gray-500',
  reversed: 'bg-red-100 text-red-600',
};

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

// ── Tab: Wallet ─────────────────────────────────────────────────────────────

const WalletTab = ({ wallet, loading }) => {
  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-8 text-white"
        style={{ background: 'linear-gradient(135deg, var(--sattva-forest) 0%, #2d6a4f 100%)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Wallet Balance</p>
            {wallet?.isFrozen && (
              <span className="text-xs bg-red-400/80 text-white px-2 py-0.5 rounded-full ml-2">Frozen</span>
            )}
          </div>
        </div>
        <p className="text-5xl font-black tracking-tight mb-1">₹{fmt(wallet?.balance)}</p>
        <p className="text-sm opacity-70 mt-2">Available to use at checkout</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Lifetime Earned', value: wallet?.lifetimeEarned, color: 'text-green-600', icon: TrendingUp },
          { label: 'Total Spent', value: wallet?.lifetimeSpent, color: 'text-[var(--sattva-forest)]', icon: Wallet },
          { label: 'Expired', value: wallet?.expiredRewards, color: 'text-gray-400', icon: Clock },
          { label: 'Pending', value: wallet?.pendingRewards, color: 'text-yellow-600', icon: RefreshCw },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card-sattva p-4">
            <Icon size={18} className={`${color} mb-2`} />
            <p className={`text-lg font-bold ${color}`}>₹{fmt(value)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* How to use */}
      <div className="card-sattva p-5 bg-[var(--sattva-muted)]">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Zap size={16} className="text-[var(--sattva-gold)]" /> How to Use Wallet Balance
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
            Apply wallet balance during checkout to reduce your payment amount.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
            Maximum 50% of order value can be paid via wallet.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
            Cashback is credited within 24 hours of order confirmation.
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
            Wallet rewards expire in 365 days from the date of credit.
          </li>
        </ul>
      </div>
    </div>
  );
};

// ── Tab: Transactions ───────────────────────────────────────────────────────

const TransactionsTab = () => {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const LIMIT = 15;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/wallet/transactions?page=${p}&limit=${LIMIT}`);
      setTxns(res.data.transactions || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
      setPage(p);
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1); }, [load]);

  if (loading) return (
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  );

  if (!txns.length) return (
    <div className="text-center py-16">
      <Wallet size={40} className="mx-auto text-gray-300 mb-3" />
      <p className="text-gray-500">No transactions yet</p>
      <p className="text-xs text-gray-400 mt-1">Your wallet activity will appear here</p>
    </div>
  );

  return (
    <div>
      <p className="text-xs text-gray-400 mb-4">{total} transaction{total !== 1 ? 's' : ''}</p>
      <div className="space-y-2">
        {txns.map(txn => {
          const typeInfo = TYPE_ICONS[txn.type] || { icon: Wallet, color: 'text-gray-400', bg: 'bg-gray-100' };
          const Icon = typeInfo.icon;
          const isCredit = ['cashback', 'referral_bonus', 'admin_credit', 'refund', 'promotional_reward'].includes(txn.type);

          return (
            <motion.div
              key={txn.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-sattva p-4 flex items-center gap-4"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${typeInfo.bg}`}>
                <Icon size={18} className={typeInfo.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{txn.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[txn.status] || 'bg-gray-100 text-gray-500'}`}>
                    {txn.status}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  {txn.expiryDate && (
                    <span className="text-[10px] text-amber-500">
                      Expires {new Date(txn.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              <span className={`text-base font-bold tabular-nums flex-shrink-0 ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                {isCredit ? '+' : '-'}₹{fmt(txn.amount)}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => load(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40 hover:bg-[var(--sattva-muted)]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-600">Page {page} of {pages}</span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= pages}
            className="p-2 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40 hover:bg-[var(--sattva-muted)]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Tab: Cashback ───────────────────────────────────────────────────────────

const CashbackTab = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/wallet/cashback/preview?order_amount=1000');
        setSettings(res.data.settings);
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* How cashback works */}
      <div className="card-sattva p-6">
        <h3 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-[var(--sattva-forest)]" /> How Cashback Works
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Shop & Pay', desc: 'Place an order and complete payment online or via COD' },
            { step: '2', title: 'Earn Cashback', desc: 'Cashback is automatically credited to your wallet within 24 hours' },
            { step: '3', title: 'Redeem Anytime', desc: 'Use wallet balance on your next order at checkout' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center p-4 bg-[var(--sattva-muted)] rounded-xl">
              <div className="w-10 h-10 bg-[var(--sattva-forest)] text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold">
                {step}
              </div>
              <p className="font-semibold text-sm mb-1">{title}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Redemption settings */}
      {settings && (
        <div className="card-sattva p-5">
          <h3 className="font-semibold text-sm mb-3">Redemption Rules</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Max redemption per order</span>
              <span className="font-semibold">{settings.maxRedemptionPercent}% of order value</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Minimum redemption</span>
              <span className="font-semibold">₹{settings.minRedemptionAmount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Wallet redemption</span>
              <span className={`font-semibold ${settings.walletRedemptionEnabled ? 'text-green-600' : 'text-red-500'}`}>
                {settings.walletRedemptionEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Default cashback */}
      <div className="card-sattva p-5 border border-[var(--sattva-gold)]/40 bg-amber-50/40">
        <div className="flex items-center gap-3 mb-2">
          <Award size={20} className="text-[var(--sattva-gold)]" />
          <h3 className="font-semibold">Default Cashback</h3>
        </div>
        <p className="text-sm text-gray-600">
          Earn <strong>2% cashback</strong> on every order automatically. Special campaigns may offer higher cashback during promotional periods.
        </p>
      </div>
    </div>
  );
};

// ── Tab: Referral ───────────────────────────────────────────────────────────

const ReferralTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/wallet/referral');
        setData(res.data);
      } catch { toast.error('Failed to load referral data'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const copyCode = async () => {
    const code = data?.profile?.referralCode;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    const link = data?.profile?.referralLink;
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const shareWhatsApp = () => {
    const link = data?.profile?.referralLink;
    if (!link) return;
    const msg = encodeURIComponent(`Join Dr MediScie and get ₹50 off your first order! Use my referral link: ${link}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );

  const profile = data?.profile || {};
  const referrals = data?.referrals || [];

  return (
    <div className="space-y-6">
      {/* Referral code card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Gift size={22} />
          <h3 className="font-semibold text-lg">Your Referral Code</h3>
        </div>
        <div className="bg-white/20 rounded-xl p-4 flex items-center justify-between mb-4">
          <span className="text-2xl font-black tracking-widest">{profile.referralCode || '—'}</span>
          <button
            onClick={copyCode}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
          </button>
        </div>
        <p className="text-sm opacity-80 mb-4">
          Share this code with friends. They get <strong>₹50 off</strong> their first order, and you earn <strong>₹100</strong>!
        </p>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            <Copy size={14} /> Copy Link
          </button>
          <button
            onClick={shareWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500/80 hover:bg-green-500 rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            <Share2 size={14} /> WhatsApp
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Referred', value: profile.totalReferrals || 0, color: 'text-[var(--sattva-forest)]' },
          { label: 'Successful', value: profile.successfulReferrals || 0, color: 'text-green-600' },
          { label: 'Pending', value: profile.pendingReferrals || 0, color: 'text-yellow-600' },
          { label: 'Total Earned', value: `₹${fmt(profile.totalEarned)}`, color: 'text-purple-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-sattva p-4 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Referred users list */}
      {referrals.length > 0 ? (
        <div className="card-sattva">
          <div className="p-4 border-b border-[color:var(--sattva-border)]">
            <h3 className="font-semibold flex items-center gap-2">
              <Users size={16} /> Your Referrals ({referrals.length})
            </h3>
          </div>
          <div className="divide-y divide-[color:var(--sattva-border)]">
            {referrals.map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{r.refereeName || 'Anonymous'}</p>
                  <p className="text-xs text-gray-400">{r.refereeEmail} · {new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    r.status === 'rewarded' ? 'bg-green-100 text-green-700'
                    : r.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-600'
                  }`}>
                    {r.status}
                  </span>
                  {r.status === 'rewarded' && (
                    <p className="text-xs text-green-600 font-semibold mt-1">+₹{fmt(r.referrerBonus)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card-sattva p-8 text-center">
          <Users size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No referrals yet</p>
          <p className="text-xs text-gray-400 mt-1">Share your code to start earning rewards</p>
        </div>
      )}
    </div>
  );
};


// ── Main WalletDashboard ────────────────────────────────────────────────────

const WalletDashboard = () => {
  const [activeTab, setActiveTab] = useState('Wallet');
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const load = async () => {
      setWalletLoading(true);
      try {
        const res = await api.get('/wallet/');
        setWallet(res.data);
      } catch { toast.error('Failed to load wallet'); }
      finally { setWalletLoading(false); }
    };
    load();
  }, [user, navigate]);

  return (
    <Layout>
      <div className="container-sattva py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[var(--sattva-muted)] rounded-xl flex items-center justify-center">
              <Wallet size={20} className="text-[var(--sattva-forest)]" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-[var(--sattva-ink)]">Wallet & Rewards</h1>
              <p className="text-sm text-gray-500">Manage your cashback, referrals and rewards</p>
            </div>
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

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'Wallet' && <WalletTab wallet={wallet} loading={walletLoading} />}
              {activeTab === 'Transactions' && <TransactionsTab />}
              {activeTab === 'Cashback' && <CashbackTab />}
              {activeTab === 'Referral' && <ReferralTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
};

export default WalletDashboard;
