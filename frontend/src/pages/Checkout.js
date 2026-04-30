import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ChevronRight, MapPin, CreditCard, ShoppingBag, Tag } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/layout/Layout';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const STEPS = ['Address', 'Payment', 'Review'];

const Checkout = () => {
  const [step, setStep] = useState(0);
  const [address, setAddress] = useState({ name: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const { cart, cartId, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login?redirect=/checkout'); return; }
    if (cart.items?.length === 0) { navigate('/products'); return; }
    api.get('/users/me/addresses').then(r => {
      setSavedAddresses(r.data || []);
      const def = r.data?.find(a => a.isDefault);
      if (def) setAddress(def);
    }).catch(() => {});
  }, [user, cart]);

  const subtotal = cart.total || 0;
  const shippingCharge = subtotal >= 499 ? 0 : 79;
  const discount = couponData?.discount || 0;
  const total = subtotal - discount + shippingCharge;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post('/coupons/validate', { code: couponCode, cart_total: subtotal });
      setCouponData(res.data);
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid coupon');
      setCouponData(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const validateAddress = () => {
    const required = ['name', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
    return required.every(f => address[f]?.trim());
  };

  const placeOrder = async () => {
    if (!validateAddress()) { toast.error('Please fill all address fields'); return; }
    setPlacing(true);
    try {
      const orderData = {
        items: cart.items.map(i => ({ productId: i.productId, quantity: i.quantity, variant: i.variant })),
        shippingAddress: address,
        paymentMethod,
        couponCode: couponData?.code || null,
        cartId
      };
      const orderRes = await api.post('/orders/', orderData);
      const order = orderRes.data;

      if (paymentMethod === 'cod') {
        await clearCart();
        navigate(`/order-success/${order.id}`);
      } else {
        // Razorpay flow
        const payRes = await api.post('/payments/create-order', { order_id: order.id });
        const { razorpay_order_id, amount, key_id } = payRes.data;

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        document.body.appendChild(script);
        script.onload = () => {
          const rzp = new window.Razorpay({
            key: key_id,
            amount,
            currency: 'INR',
            order_id: razorpay_order_id,
            name: 'Sattva',
            description: `Order #${order.invoiceId}`,
            prefill: { name: user.name, email: user.email, contact: user.phone || '' },
            theme: { color: '#1A3C34' },
            handler: async (response) => {
              try {
                await api.post('/payments/verify', {
                  order_id: order.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                });
                await clearCart();
                navigate(`/order-success/${order.id}`);
              } catch {
                toast.error('Payment verification failed');
              }
            },
            modal: { ondismiss: () => toast.info('Payment cancelled') }
          });
          rzp.open();
        };
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Layout>
      <div className="container-sattva py-8">
        <h1 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)] mb-6">Checkout</h1>

        {/* Stepper */}
        <div data-testid="checkout-stepper" className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step ? 'bg-[var(--sattva-forest)] text-[var(--sattva-cream)]'
                  : i === step ? 'bg-[var(--sattva-gold)] text-[var(--sattva-forest)]'
                  : 'bg-[var(--sattva-muted)] text-gray-400'
                }`}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${
                  i === step ? 'text-[var(--sattva-ink)]' : 'text-gray-400'
                }`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 ${
                  i < step ? 'bg-[var(--sattva-forest)]' : 'bg-[var(--sattva-border)]'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === 0 && (
              <motion.div
                data-testid="checkout-address-form"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                className="card-sattva p-6"
              >
                <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin size={18} className="text-[var(--sattva-forest)]" /> Delivery Address
                </h2>

                {savedAddresses.length > 0 && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm font-medium text-gray-500">Saved Addresses</p>
                    {savedAddresses.map(a => (
                      <label key={a.id} className="flex items-start gap-3 p-3 border border-[color:var(--sattva-border)] rounded-lg cursor-pointer hover:border-[var(--sattva-gold)] transition-colors">
                        <input type="radio" name="saved" onChange={() => setAddress(a)} className="mt-1" />
                        <div>
                          <p className="text-sm font-medium">{a.name} | {a.phone}</p>
                          <p className="text-xs text-gray-500">{a.addressLine1}, {a.city}, {a.state} - {a.pincode}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'name', label: 'Full Name', placeholder: 'Your full name' },
                    { key: 'phone', label: 'Phone', placeholder: '10-digit mobile number' },
                    { key: 'addressLine1', label: 'Address Line 1', placeholder: 'House/flat no, Building', full: true },
                    { key: 'addressLine2', label: 'Address Line 2 (optional)', placeholder: 'Street, Locality', full: true },
                    { key: 'city', label: 'City', placeholder: 'City' },
                    { key: 'state', label: 'State', placeholder: 'State' },
                    { key: 'pincode', label: 'Pincode', placeholder: '6-digit pincode' },
                  ].map(({ key, label, placeholder, full }) => (
                    <div key={key} className={full ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                      <input
                        type="text"
                        value={address[key]}
                        onChange={(e) => setAddress(a => ({...a, [key]: e.target.value}))}
                        placeholder={placeholder}
                        className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-lg bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { if (validateAddress()) setStep(1); else toast.error('Fill all required fields'); }}
                  className="mt-6 btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  Continue to Payment <ChevronRight size={16} />
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                data-testid="checkout-payment-form"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                className="card-sattva p-6"
              >
                <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-[var(--sattva-forest)]" /> Payment Method
                </h2>

                <div className="space-y-3 mb-6">
                  {[
                    { value: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive your order', badge: '+₹29 COD charge' },
                    { value: 'razorpay', label: 'Online Payment', desc: 'Cards, UPI, Netbanking, Wallets via Razorpay', badge: 'Secure' },
                  ].map(opt => (
                    <label key={opt.value} className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                      paymentMethod === opt.value ? 'border-[var(--sattva-forest)] bg-[rgba(26,60,52,0.03)]' : 'border-[color:var(--sattva-border)]'
                    }`}>
                      <input
                        type="radio"
                        value={opt.value}
                        checked={paymentMethod === opt.value}
                        onChange={() => setPaymentMethod(opt.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{opt.label}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-[var(--sattva-muted)] text-[var(--sattva-forest)] rounded-full font-medium">{opt.badge}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Coupon */}
                <div className="p-4 bg-[var(--sattva-muted)] rounded-xl mb-4">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Tag size={14} /> Apply Coupon
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg bg-[var(--sattva-surface)] focus:outline-none"
                    />
                    <button
                      onClick={applyCoupon}
                      disabled={couponLoading}
                      className="px-4 py-2 btn-outlined text-sm"
                    >
                      Apply
                    </button>
                  </div>
                  {couponData && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <Check size={12} /> {couponData.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Try: SATTVA10, WELCOME15, FLAT200</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="flex-1 btn-outlined py-3">Back</button>
                  <button onClick={() => setStep(2)} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                    Review Order <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                className="card-sattva p-6"
              >
                <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-[var(--sattva-forest)]" /> Review Order
                </h2>

                {/* Address Summary */}
                <div className="p-4 bg-[var(--sattva-muted)] rounded-xl mb-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Delivering To</p>
                  <p className="text-sm font-medium">{address.name} | {address.phone}</p>
                  <p className="text-xs text-gray-500">{address.addressLine1}, {address.city}, {address.state} - {address.pincode}</p>
                </div>

                {/* Items */}
                <div className="space-y-3 mb-4">
                  {cart.items?.map(item => (
                    <div key={item.productId} className="flex gap-3">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--sattva-muted)] flex-shrink-0">
                        <img src={item.product?.images?.[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium line-clamp-1">{item.product?.name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">₹{((item.product?.discountPrice || 0) * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 btn-outlined py-3">Back</button>
                  <button
                    data-testid="checkout-place-order-button"
                    onClick={placeOrder}
                    disabled={placing}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    {placing ? 'Placing...' : paymentMethod === 'cod' ? 'Place Order' : 'Pay Now'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card-sattva p-6 sticky top-24">
              <h3 className="font-heading text-base font-semibold mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
                {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{discount.toFixed(0)}</span></div>}
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className={shippingCharge === 0 ? 'text-green-600' : ''}>{shippingCharge === 0 ? 'FREE' : `₹${shippingCharge}`}</span>
                </div>
                <div className="border-t border-[color:var(--sattva-border)] my-2 pt-2 flex justify-between font-bold">
                  <span>Total</span><span className="text-[var(--sattva-forest)]">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
              {cart.items?.map(item => (
                <div key={item.productId} className="flex gap-2 py-2 border-t border-[color:var(--sattva-border)] first:border-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--sattva-muted)] flex-shrink-0">
                    <img src={item.product?.images?.[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.product?.name}</p>
                    <p className="text-xs text-gray-500">x{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Checkout;
