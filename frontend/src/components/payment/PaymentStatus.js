/**
 * PaymentStatus — full-page success / failure / processing screens.
 *
 * Props:
 *   status     — "processing" | "success" | "failed"
 *   orderId    — internal order ID
 *   amount     — display amount (number)
 *   gateway    — "razorpay" | "phonepe" | "airpay"
 *   errorMsg   — shown on failure
 *   onRetry()  — called when user clicks "Try Again"
 */
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, RotateCcw, ShoppingBag, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const GATEWAY_LABELS = {
  razorpay: 'Razorpay',
  phonepe:  'PhonePe',
  airpay:   'Airpay',
  cod:      'Cash on Delivery',
};

export const ProcessingScreen = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
    >
      <Loader2 size={48} className="text-[var(--sattva-forest)]" />
    </motion.div>
    <div className="text-center">
      <h2 className="font-heading text-xl font-semibold text-[var(--sattva-ink)] mb-1">
        Processing Payment
      </h2>
      <p className="text-sm text-gray-500">Please wait — do not refresh or close this page.</p>
    </div>
  </div>
);

export const SuccessScreen = ({ orderId, amount, gateway }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <CheckCircle2 size={72} className="text-[var(--sattva-forest)]" />
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="space-y-2"
    >
      <h2 className="font-heading text-2xl font-bold text-[var(--sattva-ink)]">
        Payment Successful!
      </h2>
      {amount && (
        <p className="text-3xl font-black text-[var(--sattva-forest)]">
          ₹{Number(amount).toLocaleString('en-IN')}
        </p>
      )}
      {gateway && (
        <p className="text-sm text-gray-500">
          Paid via <span className="font-semibold">{GATEWAY_LABELS[gateway] || gateway}</span>
        </p>
      )}
      {orderId && (
        <p className="text-xs text-gray-400 mt-1">Order ID: {orderId}</p>
      )}
    </motion.div>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.45 }}
      className="flex gap-3 flex-wrap justify-center"
    >
      {orderId && (
        <Link
          to={`/order-success/${orderId}`}
          className="flex items-center gap-2 btn-primary px-6 py-2.5"
        >
          <ShoppingBag size={16} /> View Order
        </Link>
      )}
      <Link to="/" className="flex items-center gap-2 btn-outlined px-6 py-2.5">
        <Home size={16} /> Continue Shopping
      </Link>
    </motion.div>
  </div>
);

export const FailureScreen = ({ errorMsg, onRetry }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4 text-center">
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <XCircle size={72} className="text-red-500" />
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="space-y-2"
    >
      <h2 className="font-heading text-2xl font-bold text-[var(--sattva-ink)]">
        Payment Failed
      </h2>
      <p className="text-sm text-gray-500 max-w-sm">
        {errorMsg || 'Your payment could not be processed. No amount has been deducted.'}
      </p>
    </motion.div>

    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
      className="flex gap-3 flex-wrap justify-center"
    >
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 btn-primary px-6 py-2.5"
        >
          <RotateCcw size={16} /> Try Again
        </button>
      )}
      <Link to="/" className="flex items-center gap-2 btn-outlined px-6 py-2.5">
        <Home size={16} /> Back to Home
      </Link>
    </motion.div>
  </div>
);

const PaymentStatus = ({ status, orderId, amount, gateway, errorMsg, onRetry }) => {
  if (status === 'processing') return <ProcessingScreen />;
  if (status === 'success')    return <SuccessScreen orderId={orderId} amount={amount} gateway={gateway} />;
  if (status === 'failed')     return <FailureScreen errorMsg={errorMsg} onRetry={onRetry} />;
  return null;
};

export default PaymentStatus;
