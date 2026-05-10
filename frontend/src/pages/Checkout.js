import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useTracking from '../hooks/useTracking';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, ChevronRight, MapPin, CreditCard, ShoppingBag, Tag,
  CheckCircle2, XCircle, Loader2, RotateCcw, Home, ArrowLeft,
} from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/layout/Layout';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import RazorpayCheckout from '../components/payment/RazorpayCheckout';
import WalletRedemption from '../components/checkout/WalletRedemption';

const STEPS = ['Address', 'Payment', 'Review'];

// ── Payment method options ──────────────────────────────────────────────────
const PAYMENT_OPTIONS = [
  {
    value: 'razorpay',
    label: 'Pay Online',
    desc: 'Cards, UPI, Net Banking, Wallets — powered by Razorpay',
    badge: 'Recommended',
    badgeClass: 'bg-green-100 text-green-700',
    icon: '💳',
  },
  {
    value: 'cod',
    label: 'Cash on Delivery',
    desc: 'Pay when your order arrives at your door',
    badge: '+₹29 COD fee',
    badgeClass: 'bg-amber-100 text-amber-700',
    icon: '💰',
  },
];

// ── Tiny sub-components ─────────────────────────────────────────────────────

const Stepper = ({ step }) => (
  <div className="flex items-center mb-8">
    {STEPS.map((s, i) => (
      <React.Fragment key={s}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            i < step  ? 'bg-[var(--sattva-forest)] text-white'
            : i === step ? 'bg-[var(--sattva-gold)] text-[var(--sattva-forest)]'
            : 'bg-[var(--sattva-muted)] text-gray-400'
          }`}>
            {i < step ? <Check size={14} /> : i + 1}
          </div>
          <span className={`text-sm font-medium hidden sm:block ${i === step ? 'text-[var(--sattva-ink)]' : 'text-gray-400'}`}>
            {s}
          </span>
        </div>
        {i < STEPS.length - 1 && (
          <div className={`flex-1 h-0.5 mx-3 transition-colors ${i < step ? 'bg-[var(--sattva-forest)]' : 'bg-[var(--sattva-border)]'}`} />
        )}
      </React.Fragment>
    ))}
  </div>
);

const ProcessingOverlay = () => (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-xs w-full mx-4">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
        <Loader2 size={40} className="text-[var(--sattva-forest)]" />
      </motion.div>
      <div className="text-center">
        <p className="font-semibold text-[var(--sattva-ink)]">Processing Payment</p>
        <p className="text-xs text-gray-500 mt-1">Please do not close this tab</p>
      </div>
    </div>
  </div>
);

const SuccessScreen = ({ orderId, amount, onViewOrder }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
      <CheckCircle2 size={80} className="text-[var(--sattva-forest)]" />
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <h2 className="font-heading text-2xl font-bold text-[var(--sattva-ink)] mb-1">Payment Successful!</h2>
      {amount && <p className="text-3xl font-black text-[var(--sattva-forest)]">₹{Number(amount).toLocaleString('en-IN')}</p>}
      <p className="text-sm text-gray-500 mt-2">Your order has been confirmed and will be shipped soon.</p>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex gap-3 flex-wrap justify-center">
      <button onClick={onViewOrder} className="btn-primary px-6 py-2.5 flex items-center gap-2">
        <ShoppingBag size={16} /> View Order
      </button>
      <Link to="/" className="btn-outlined px-6 py-2.5 flex items-center gap-2">
        <Home size={16} /> Continue Shopping
      </Link>
    </motion.div>
  </div>
);

const FailureScreen = ({ errorMsg, onRetry }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
      <XCircle size={80} className="text-red-500" />
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <h2 className="font-heading text-2xl font-bold text-[var(--sattva-ink)] mb-1">Payment Failed</h2>
      <p className="text-sm text-gray-500 max-w-sm">
        {errorMsg || 'Your payment could not be completed. No amount has been deducted from your account.'}
      </p>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="flex gap-3 flex-wrap justify-center">
      <button onClick={onRetry} className="btn-primary px-6 py-2.5 flex items-center gap-2">
        <RotateCcw size={16} /> Try Again
      </button>
      <Link to="/" className="btn-outlined px-6 py-2.5 flex items-center gap-2">
        <Home size={16} /> Back to Home
      </Link>
    </motion.div>
  </div>
);

// ── Main Checkout component ──────────────────────────────────────────────────

const Checkout = () => {
  const [step, setStep]             = useState(0);
  const [address, setAddress]       = useState({ name: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' });
  const [savedAddresses, setSaved]  = useState([]);
  const [paymentMethod, setMethod]  = useState('razorpay');
  const [couponCode, setCoupon]     = useState('');
  const [couponData, setCouponData] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [walletRedemption, setWalletRedemption] = useState(0);

  // Order flow state
  const [placing, setPlacing]       = useState(false);
  const [razorpayData, setRzData]   = useState(null);   // from /payments/initiate
  const [currentOrderId, setOrdId]  = useState('');

  // Result screens
  const [screen, setScreen]         = useState('checkout'); // checkout | processing | success | failed
  const [paidAmount, setPaidAmt]    = useState(null);
  const [errorMsg, setErrorMsg]     = useState('');

  const { cart, cartId, clearCart } = useCart();
  const { user }                    = useAuth();
  const navigate                    = useNavigate();
  const { trackBeginCheckout, trackPurchase } = useTracking();

  useEffect(() => {
    if (!user) { navigate('/login?redirect=/checkout'); return; }
    if (!cart.items?.length) { navigate('/products'); return; }
    api.get('/users/me/addresses').then(r => {
      const list = r.data || [];
      setSaved(list);
      const def = list.find(a => a.isDefault);
      if (def) setAddress(def);
    }).catch(() => {});
  }, [user, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal        = cart.total || 0;
  const shippingCharge  = subtotal >= 499 ? 0 : 79;
  const discount        = couponData?.discount || 0;
  const totalBeforeWallet = subtotal - discount + shippingCharge;
  const total           = Math.max(0, totalBeforeWallet - walletRedemption);

  const validateAddress = () =>
    ['name', 'phone', 'addressLine1', 'city', 'state', 'pincode'].every(f => address[f]?.trim());

  // ── Coupon ─────────────────────────────────────────────────────────────
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post('/coupons/validate', { code: couponCode, cart_total: subtotal });
      setCouponData(res.data);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid coupon code');
      setCouponData(null);
    } finally { setCouponLoading(false); }
  };

  // ── Place order ────────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (!validateAddress()) { toast.error('Please fill all required address fields'); return; }
    setPlacing(true);
    try {
      const orderRes = await api.post('/orders/', {
        items: cart.items.map(i => ({ productId: i.productId, quantity: i.quantity, variant: i.variant })),
        shippingAddress: address,
        paymentMethod,
        couponCode: couponData?.code || null,
        cartId,
        walletRedemption: walletRedemption || 0,
      });
      const order = orderRes.data;
      setOrdId(order.id);
      setPaidAmt(total);

      if (paymentMethod === 'cod') {
        await clearCart();
        trackPurchase(order.id, total, cart.items);
        await api.post(`/retargeting/track-conversion/${user._id || user.id}?order_id=${order.id}`).catch(() => {});
        navigate(`/order-success/${order.id}`);
        return;
      }

      // Razorpay — get initiate data then show modal
      setScreen('processing');
      const payRes = await api.post('/payments/initiate', { order_id: order.id, gateway: 'razorpay' });
      setRzData(payRes.data);
      // Screen stays 'processing' while Razorpay SDK loads — modal will open
    } catch (err) {
      setScreen('checkout');
      toast.error(err.response?.data?.detail || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  // ── Razorpay callbacks ──────────────────────────────────────────────────
  const handleRzSuccess = async (verifyResult) => {
    setRzData(null);
    await clearCart();
    trackPurchase(currentOrderId, paidAmount, cart.items);
    await api.post(`/retargeting/track-conversion/${user._id || user.id}?order_id=${currentOrderId}`).catch(() => {});
    setScreen('success');
  };

  const handleRzCancel = () => {
    setRzData(null);
    setScreen('checkout');
    toast.info('Payment cancelled. Your order is saved — you can retry.');
  };

  const handleRzError = (err) => {
    setRzData(null);
    const msg = err?.response?.data?.detail || err?.message || 'Payment failed';
    setErrorMsg(msg);
    setScreen('failed');
  };

  const handleRetry = () => {
    setScreen('checkout');
    setRzData(null);
    setErrorMsg('');
    setStep(2); // back to review step
  };

  const handleViewOrder = () => navigate(`/order-success/${currentOrderId}`);

  // ── Result screens ─────────────────────────────────────────────────────
  if (screen === 'success') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16">
          <SuccessScreen orderId={currentOrderId} amount={paidAmount} onViewOrder={handleViewOrder} />
        </div>
      </Layout>
    );
  }

  if (screen === 'failed') {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 py-16">
          <FailureScreen errorMsg={errorMsg} onRetry={handleRetry} />
        </div>
      </Layout>
    );
  }

  // ── Main checkout UI ───────────────────────────────────────────────────
  return (
    <Layout>
      {/* Processing overlay — shown while Razorpay SDK loads */}
      {screen === 'processing' && <ProcessingOverlay />}

      {/* Razorpay modal trigger (invisible) */}
      {razorpayData && (
        <RazorpayCheckout
          paymentData={razorpayData}
          user={{ name: user?.name, email: user?.email, phone: user?.phone || address.phone }}
          onSuccess={handleRzSuccess}
          onCancel={handleRzCancel}
          onError={handleRzError}
        />
      )}

      <div className="container-sattva py-8">
        <h1 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)] mb-6">Checkout</h1>

        <Stepper step={step} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Steps ──────────────────────────────────────────────────── */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">

              {/* Step 0 — Address */}
              {step === 0 && (
                <motion.div
                  key="address"
                  data-testid="checkout-address-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="card-sattva p-6"
                >
                  <h2 className="font-heading text-lg font-semibold mb-5 flex items-center gap-2">
                    <MapPin size={18} className="text-[var(--sattva-forest)]" /> Delivery Address
                  </h2>

                  {savedAddresses.length > 0 && (
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Saved Addresses</p>
                      <div className="space-y-2">
                        {savedAddresses.map(a => (
                          <label key={a.id} className="flex items-start gap-3 p-3 border border-[color:var(--sattva-border)] rounded-xl cursor-pointer hover:border-[var(--sattva-forest)] transition-colors">
                            <input type="radio" name="saved-addr" onChange={() => setAddress(a)} className="mt-0.5" />
                            <div>
                              <p className="text-sm font-semibold">{a.name} · {a.phone}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{a.addressLine1}, {a.city}, {a.state} — {a.pincode}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-3 mb-3">— or enter a new address —</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'name',         label: 'Full Name *',              placeholder: 'Your full name',      full: false },
                      { key: 'phone',        label: 'Phone Number *',           placeholder: '10-digit mobile',     full: false },
                      { key: 'addressLine1', label: 'Address Line 1 *',         placeholder: 'House/flat, Building',full: true  },
                      { key: 'addressLine2', label: 'Address Line 2 (optional)',placeholder: 'Street, Locality',    full: true  },
                      { key: 'city',         label: 'City *',                   placeholder: 'City',                full: false },
                      { key: 'state',        label: 'State *',                  placeholder: 'State',               full: false },
                      { key: 'pincode',      label: 'Pincode *',                placeholder: '6-digit pincode',     full: false },
                    ].map(({ key, label, placeholder, full }) => (
                      <div key={key} className={full ? 'sm:col-span-2' : ''}>
                        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                        <input
                          type="text"
                          value={address[key]}
                          onChange={e => setAddress(a => ({ ...a, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-forest)] transition"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => { if (validateAddress()) setStep(1); else toast.error('Please fill all required fields'); }}
                    className="mt-6 btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    Continue to Payment <ChevronRight size={16} />
                  </button>
                </motion.div>
              )}

              {/* Step 1 — Payment Method */}
              {step === 1 && (
                <motion.div
                  key="payment"
                  data-testid="checkout-payment-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="card-sattva p-6"
                >
                  <h2 className="font-heading text-lg font-semibold mb-5 flex items-center gap-2">
                    <CreditCard size={18} className="text-[var(--sattva-forest)]" /> Payment Method
                  </h2>

                  <div className="space-y-3 mb-6">
                    {PAYMENT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMethod(opt.value)}
                        className={`w-full flex items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                          paymentMethod === opt.value
                            ? 'border-[var(--sattva-forest)] bg-green-50'
                            : 'border-[color:var(--sattva-border)] hover:border-gray-300'
                        }`}
                      >
                        <span className="text-2xl flex-shrink-0">{opt.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-[var(--sattva-ink)]">{opt.label}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${opt.badgeClass}`}>{opt.badge}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {paymentMethod === opt.value
                            ? <CheckCircle2 size={20} className="text-[var(--sattva-forest)]" />
                            : <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                          }
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Coupon */}
                  <div className="p-4 bg-[var(--sattva-muted)] rounded-xl mb-6">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Tag size={14} /> Apply Coupon
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={e => setCoupon(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg bg-[var(--sattva-surface)] focus:outline-none"
                      />
                      <button onClick={applyCoupon} disabled={couponLoading} className="px-4 py-2 btn-outlined text-sm">
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponData && (
                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                        <Check size={12} /> {couponData.message} — saved ₹{couponData.discount?.toFixed(0)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">Try: SATTVA10 · WELCOME15 · FLAT200</p>
                  </div>

                  {/* Wallet Redemption */}
                  <WalletRedemption
                    orderTotal={totalBeforeWallet}
                    onRedemptionChange={setWalletRedemption}
                  />

                  <div className="flex gap-3">
                    <button onClick={() => setStep(0)} className="flex-1 btn-outlined py-3 flex items-center justify-center gap-2">
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button onClick={() => { setStep(2); trackBeginCheckout(cart.items, total); }} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                      Review Order <ChevronRight size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2 — Review & Place */}
              {step === 2 && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="card-sattva p-6"
                >
                  <h2 className="font-heading text-lg font-semibold mb-5 flex items-center gap-2">
                    <ShoppingBag size={18} className="text-[var(--sattva-forest)]" /> Review Your Order
                  </h2>

                  {/* Address */}
                  <div className="p-4 bg-[var(--sattva-muted)] rounded-xl mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Delivering To</p>
                      <button onClick={() => setStep(0)} className="text-xs text-[var(--sattva-forest)] font-semibold hover:underline">Edit</button>
                    </div>
                    <p className="text-sm font-semibold">{address.name} · {address.phone}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}, {address.city}, {address.state} — {address.pincode}</p>
                  </div>

                  {/* Payment method */}
                  <div className="p-4 bg-[var(--sattva-muted)] rounded-xl mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Payment</p>
                      <button onClick={() => setStep(1)} className="text-xs text-[var(--sattva-forest)] font-semibold hover:underline">Edit</button>
                    </div>
                    <p className="text-sm font-semibold">{PAYMENT_OPTIONS.find(o => o.value === paymentMethod)?.label}</p>
                    {couponData && <p className="text-xs text-green-600 mt-0.5">Coupon {couponData.code} applied — ₹{couponData.discount?.toFixed(0)} off</p>}
                  </div>

                  {/* Items */}
                  <div className="space-y-3 mb-6">
                    {cart.items?.map(item => (
                      <div key={item.productId} className="flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-[var(--sattva-muted)] flex-shrink-0">
                          <img src={item.product?.images?.[0]} alt={item.product?.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold line-clamp-1">{item.product?.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <span className="text-sm font-bold tabular-nums flex-shrink-0">
                          ₹{((item.product?.discountPrice || 0) * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 btn-outlined py-3 flex items-center justify-center gap-2">
                      <ArrowLeft size={15} /> Back
                    </button>
                    <button
                      data-testid="checkout-place-order-button"
                      onClick={placeOrder}
                      disabled={placing}
                      className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {placing
                        ? <><Loader2 size={16} className="animate-spin" /> Placing...</>
                        : paymentMethod === 'cod'
                          ? 'Place Order'
                          : `Pay ₹${total.toLocaleString('en-IN')}`
                      }
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-400 text-center mt-3">
                    🔒 Your payment is secured by 256-bit SSL encryption
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* ── Order Summary sidebar ──────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="card-sattva p-5 sticky top-24">
              <h3 className="font-heading text-base font-semibold mb-4">Order Summary</h3>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({cart.items?.length} items)</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Coupon Discount</span>
                    <span>−₹{discount.toFixed(0)}</span>
                  </div>
                )}
                {walletRedemption > 0 && (
                  <div className="flex justify-between text-purple-600 font-medium">
                    <span>Wallet Balance</span>
                    <span>−₹{walletRedemption.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery</span>
                  <span className={shippingCharge === 0 ? 'text-green-600 font-medium' : ''}>
                    {shippingCharge === 0 ? 'FREE' : `₹${shippingCharge}`}
                  </span>
                </div>
                <div className="border-t border-[color:var(--sattva-border)] pt-2 mt-2 flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-[var(--sattva-forest)]">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="divide-y divide-[color:var(--sattva-border)]">
                {cart.items?.map(item => (
                  <div key={item.productId} className="flex gap-3 py-2.5">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--sattva-muted)] flex-shrink-0">
                      <img src={item.product?.images?.[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.product?.name}</p>
                      <p className="text-xs text-gray-500">×{item.quantity} · ₹{(item.product?.discountPrice || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>

              {subtotal < 499 && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2.5 mt-3 text-center">
                  Add ₹{(499 - subtotal).toFixed(0)} more for FREE delivery
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
