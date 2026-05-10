import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Info, CheckCircle } from 'lucide-react';
import api from '../../utils/api';

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * WalletRedemption — checkout component
 * Props:
 *   orderTotal: number — current order total (before wallet deduction)
 *   onRedemptionChange: (amount: number) => void
 */
const WalletRedemption = ({ orderTotal, onRedemptionChange }) => {
  const [wallet, setWallet] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redemptionInput, setRedemptionInput] = useState('');
  const [applied, setApplied] = useState(false);
  const [estimatedCashback, setEstimatedCashback] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [walletRes, previewRes] = await Promise.all([
          api.get('/wallet/'),
          api.get(`/wallet/cashback/preview?order_amount=${orderTotal}`),
        ]);
        setWallet(walletRes.data);
        setSettings(previewRes.data.settings);
        setEstimatedCashback(previewRes.data.estimatedCashback || 0);
      } catch {
        // Silent fail — wallet section just won't show
      } finally {
        setLoading(false);
      }
    };
    if (orderTotal > 0) load();
  }, [orderTotal]);

  const walletBalance = wallet?.balance || 0;
  const maxRedemptionPct = settings?.maxRedemptionPercent || 50;
  const minRedemption = settings?.minRedemptionAmount || 10;
  const maxAllowed = Math.min(walletBalance, (orderTotal * maxRedemptionPct) / 100);
  const walletEnabled = settings?.walletRedemptionEnabled !== false;

  const handleApply = () => {
    const amt = parseFloat(redemptionInput);
    if (isNaN(amt) || amt <= 0) return;
    if (amt < minRedemption) return;
    if (amt > maxAllowed) return;
    const rounded = Math.round(amt * 100) / 100;
    setApplied(true);
    onRedemptionChange(rounded);
  };

  const handleRemove = () => {
    setApplied(false);
    setRedemptionInput('');
    onRedemptionChange(0);
  };

  const handleSetMax = () => {
    const maxStr = maxAllowed.toFixed(2);
    setRedemptionInput(maxStr);
  };

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-[color:var(--sattva-border)] bg-[var(--sattva-muted)] animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-1/3 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    );
  }

  if (!wallet || walletBalance < minRedemption || !walletEnabled) {
    // Show cashback preview only
    if (estimatedCashback > 0) {
      return (
        <div className="p-4 rounded-xl border border-green-200 bg-green-50">
          <div className="flex items-center gap-2 text-green-700">
            <TrendingUp size={16} />
            <p className="text-sm font-semibold">
              You'll earn ₹{fmt(estimatedCashback)} cashback on this order
            </p>
          </div>
          <p className="text-xs text-green-600 mt-1 ml-6">
            Cashback will be credited to your wallet after order confirmation.
          </p>
        </div>
      );
    }
    return null;
  }

  const redemptionAmt = applied ? parseFloat(redemptionInput) || 0 : 0;
  const finalAmount = orderTotal - redemptionAmt;

  return (
    <div className="rounded-xl border border-[color:var(--sattva-border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--sattva-muted)]">
        <div className="flex items-center gap-2">
          <Wallet size={16} className="text-[var(--sattva-forest)]" />
          <span className="text-sm font-semibold text-[var(--sattva-ink)]">Wallet Balance</span>
        </div>
        <span className="text-sm font-bold text-[var(--sattva-forest)]">₹{fmt(walletBalance)}</span>
      </div>

      <div className="p-4 space-y-3">
        {!applied ? (
          <>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info size={12} />
              Max redeemable: ₹{fmt(maxAllowed)} ({maxRedemptionPct}% of order)
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  value={redemptionInput}
                  onChange={e => setRedemptionInput(e.target.value)}
                  placeholder={`Min ₹${minRedemption}`}
                  min={minRedemption}
                  max={maxAllowed}
                  step="1"
                  className="w-full pl-7 pr-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-forest)]"
                />
              </div>
              <button
                type="button"
                onClick={handleSetMax}
                className="px-3 py-2.5 text-xs font-semibold border border-[color:var(--sattva-border)] rounded-xl hover:bg-[var(--sattva-muted)] transition-colors"
              >
                Max
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={
                  !redemptionInput ||
                  parseFloat(redemptionInput) < minRedemption ||
                  parseFloat(redemptionInput) > maxAllowed
                }
                className="px-4 py-2.5 btn-primary text-sm disabled:opacity-50"
              >
                Apply
              </button>
            </div>
            {parseFloat(redemptionInput) > maxAllowed && redemptionInput && (
              <p className="text-xs text-red-500">Maximum allowed: ₹{fmt(maxAllowed)}</p>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle size={16} />
              <div>
                <p className="text-sm font-semibold">₹{fmt(redemptionAmt)} wallet balance applied</p>
                <p className="text-xs text-green-600">Final amount: ₹{fmt(finalAmount)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="text-xs text-red-500 hover:underline font-semibold"
            >
              Remove
            </button>
          </div>
        )}

        {/* Cashback preview */}
        {estimatedCashback > 0 && (
          <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
            <TrendingUp size={12} />
            You'll earn ₹{fmt(estimatedCashback)} cashback after this order
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletRedemption;
