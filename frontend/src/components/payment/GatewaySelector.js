import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const GATEWAYS = [
  {
    id: 'razorpay',
    label: 'Razorpay',
    tagline: 'Cards, UPI, Net Banking, Wallets',
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="8" fill="#072654" />
        <path d="M10 28L20 8l10 20H10z" fill="#3395FF" opacity="0.9" />
        <path d="M14 28l6-12 6 12H14z" fill="#fff" opacity="0.85" />
      </svg>
    ),
    badge: 'Most Popular',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'phonepe',
    label: 'PhonePe',
    tagline: 'UPI, PhonePe Wallet, Net Banking',
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="8" fill="#5F259F" />
        <text x="8" y="27" fontSize="18" fontWeight="bold" fill="white">Pe</text>
      </svg>
    ),
    badge: 'Fast UPI',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'airpay',
    label: 'Airpay',
    tagline: 'Debit / Credit Cards, Net Banking',
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="8" fill="#00AEEF" />
        <path d="M8 28 Q20 10 32 28" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="20" cy="22" r="3" fill="white" />
      </svg>
    ),
    badge: 'Secure',
    badgeColor: 'bg-cyan-100 text-cyan-700',
  },
  {
    id: 'cod',
    label: 'Cash on Delivery',
    tagline: 'Pay when your order arrives',
    logo: (
      <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none">
        <rect width="40" height="40" rx="8" fill="#16a34a" />
        <text x="9" y="27" fontSize="17" fontWeight="bold" fill="white">₹</text>
      </svg>
    ),
    badge: null,
    badgeColor: '',
  },
];

const GatewaySelector = ({ selected, onChange }) => (
  <div className="space-y-3">
    {GATEWAYS.map((gw) => {
      const active = selected === gw.id;
      return (
        <motion.button
          key={gw.id}
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => onChange(gw.id)}
          className={`w-full flex items-center gap-4 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
            active
              ? 'border-[var(--sattva-forest)] bg-green-50 shadow-sm'
              : 'border-[color:var(--sattva-border)] bg-white hover:border-gray-300'
          }`}
        >
          {/* Gateway logo */}
          <div className="flex-shrink-0">{gw.logo}</div>

          {/* Label + tagline */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[var(--sattva-ink)]">{gw.label}</span>
              {gw.badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gw.badgeColor}`}>
                  {gw.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{gw.tagline}</p>
          </div>

          {/* Selection indicator */}
          <div className="flex-shrink-0">
            {active ? (
              <CheckCircle2 size={20} className="text-[var(--sattva-forest)]" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
          </div>
        </motion.button>
      );
    })}
  </div>
);

export default GatewaySelector;
