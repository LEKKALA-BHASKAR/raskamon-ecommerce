import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Search, ChevronRight, X, RotateCcw, ShoppingBag,
  Truck, CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw,
  ArrowLeft, Download, MapPin, CreditCard,
} from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'sonner';
import { useCart } from '../../context/CartContext';

// ── Status config ─────────────────────────────────────────────────────────

const STATUS = {
  placed:           { label: 'Order Placed',      color: 'bg-blue-100 text-blue-700',    icon: Clock,         dot: 'bg-blue-500' },
  confirmed:        { label: 'Confirmed',          color: 'bg-indigo-100 text-indigo-700', icon: CheckCircle2,  dot: 'bg-indigo-500' },
  packed:           { label: 'Packed',             color: 'bg-purple-100 text-purple-700', icon: Package,       dot: 'bg-purple-500' },
  shipped:          { label: 'Shipped',            color: 'bg-amber-100 text-amber-700',   icon: Truck,         dot: 'bg-amber-500' },
  out_for_delivery: { label: 'Out for Delivery',   color: 'bg-orange-100 text-orange-700', icon: Truck,         dot: 'bg-orange-500' },
  delivered:        { label: 'Delivered',          color: 'bg-green-100 text-green-700',  icon: CheckCircle2,  dot: 'bg-green-500' },
  cancelled:        { label: 'Cancelled',          color: 'bg-red-100 text-red-700',      icon: XCircle,       dot: 'bg-red-500' },
  return_requested: { label: 'Return Requested',   color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle,  dot: 'bg-yellow-500' },
  returned:         { label: 'Returned',           color: 'bg-gray-100 text-gray-600',    icon: RefreshCw,     dot: 'bg-gray-400' },
  refunded:         { label: 'Refunded',           color: 'bg-teal-100 text-teal-700',    icon: CheckCircle2,  dot: 'bg-teal-500' },
};

const TIMELINE_STEPS = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const FILTERS = ['all', 'placed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'return_requested'];

// ── Skeleton ─────────────────────────────────────────────────────────────

function OrderSkeleton() {
  return (
    <div className="card-sattva p-5 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-100 rounded" />
        </div>
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
      </div>
      <div className="flex gap-2 mb-4">
        {[1,2,3].map(i => <div key={i} className="w-12 h-12 rounded-lg bg-gray-200" />)}
      </div>
      <div className="h-3 w-full bg-gray-100 rounded" />
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.placed;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Order timeline ────────────────────────────────────────────────────────

function OrderTimeline({ order }) {
  const currentIdx = TIMELINE_STEPS.indexOf(order.orderStatus);
  const isCancelled = order.orderStatus === 'cancelled' || order.orderStatus?.includes('return');
  return (
    <div className="relative mt-2">
      {/* Mobile: vertical */}
      <div className="flex flex-col gap-0 sm:hidden">
        {(order.timeline || []).map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full mt-1 ${
                isCancelled && step.status === 'cancelled' ? 'bg-red-500' : 'bg-[var(--sattva-forest)]'
              }`} />
              {i < (order.timeline?.length || 0) - 1 && <div className="w-0.5 h-8 bg-gray-200" />}
            </div>
            <div className="pb-4">
              <p className="text-xs font-semibold capitalize text-gray-700">{step.status?.replace(/_/g,' ')}</p>
              <p className="text-[10px] text-gray-400">{step.note}</p>
              <p className="text-[10px] text-gray-400">{new Date(step.timestamp).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'})}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: horizontal dots */}
      <div className="hidden sm:flex items-center gap-0">
        {TIMELINE_STEPS.map((step, i) => {
          const done = !isCancelled && i <= currentIdx;
          const active = !isCancelled && i === currentIdx;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full transition-all ${
                  active ? 'ring-2 ring-[var(--sattva-forest)]/30 bg-[var(--sattva-forest)]' :
                  done ? 'bg-[var(--sattva-forest)]' : 'bg-gray-200'
                }`} />
                <span className="text-[9px] mt-1 text-gray-400 whitespace-nowrap capitalize">
                  {step.replace(/_/g,' ')}
                </span>
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 -mt-3 ${done && i < currentIdx ? 'bg-[var(--sattva-forest)]' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── Order detail modal ────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose, onCancelled, onReturnRequested }) {
  const [returnForm, setReturnForm] = useState({ open: false, reason: '', refundMethod: 'wallet' });
  const [loading, setLoading] = useState('');

  const canCancel = ['placed', 'confirmed'].includes(order.orderStatus);
  const canReturn = order.orderStatus === 'delivered' && !order.returnRequest;

  const handleCancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setLoading('cancel');
    try {
      const r = await api.post(`/orders/${order.id}/cancel`);
      toast.success('Order cancelled' + (r.data.refundStatus === 'refunded' ? ' · Refund credited to wallet' : ''));
      onCancelled(order.id);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to cancel');
    } finally { setLoading(''); }
  };

  const handleReturn = async () => {
    if (!returnForm.reason.trim()) { toast.error('Please provide a reason'); return; }
    setLoading('return');
    try {
      await api.post(`/orders/${order.id}/return`, { reason: returnForm.reason, refundMethod: returnForm.refundMethod });
      toast.success('Return request submitted');
      onReturnRequested(order.id);
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to submit return');
    } finally { setLoading(''); }
  };

  const handleReorder = async () => {
    setLoading('reorder');
    try {
      const r = await api.post(`/orders/${order.id}/reorder`);
      toast.success(r.data.message);
      if (r.data.unavailable?.length) toast.warning(`Unavailable: ${r.data.unavailable.join(', ')}`);
    } catch (e) {
      toast.error('Failed to reorder');
    } finally { setLoading(''); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[var(--sattva-ink)]">#{order.invoiceId}</h3>
            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={order.orderStatus} />
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Timeline */}
          <div className="card-sattva p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Order Progress</h4>
            <OrderTimeline order={order} />
          </div>

          {/* Items */}
          <div className="card-sattva p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Items ({order.items?.length})</h4>
            <div className="space-y-3">
              {order.items?.map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={item.image || ''} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--sattva-ink)] line-clamp-1">{item.name}</p>
                    {item.variant && Object.keys(item.variant).length > 0 && (
                      <p className="text-xs text-gray-400">{Object.entries(item.variant).map(([k,v])=>`${k}: ${v}`).join(', ')}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--sattva-forest)] flex-shrink-0">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Price breakdown */}
          <div className="card-sattva p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Price Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{order.subtotal?.toLocaleString('en-IN')}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{order.discount?.toLocaleString('en-IN')}</span></div>}
              {order.shippingCharge > 0 && <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>₹{order.shippingCharge}</span></div>}
              {order.walletRedemption > 0 && <div className="flex justify-between text-purple-600"><span>Wallet Used</span><span>-₹{order.walletRedemption?.toLocaleString('en-IN')}</span></div>}
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100">
                <span>Total Paid</span>
                <span className="text-[var(--sattva-forest)]">₹{order.totalAmount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          {order.shippingAddress && (
            <div className="card-sattva p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><MapPin size={12}/>Delivery Address</h4>
              <p className="text-sm font-medium">{order.shippingAddress.name} · {order.shippingAddress.phone}</p>
              <p className="text-sm text-gray-500">{order.shippingAddress.addressLine1}{order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}</p>
              <p className="text-sm text-gray-500">{order.shippingAddress.city}, {order.shippingAddress.state} – {order.shippingAddress.pincode}</p>
            </div>
          )}

          {/* Payment */}
          <div className="card-sattva p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1.5"><CreditCard size={12}/>Payment</h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 capitalize">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
              <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                order.paymentStatus === 'cod'  ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {order.paymentStatus === 'cod' ? 'Pay on Delivery' : order.paymentStatus}
              </span>
            </div>
            {order.refundStatus && (
              <div className="mt-2 text-xs text-purple-700 bg-purple-50 rounded-lg p-2">
                Refund status: <strong>{order.refundStatus}</strong>
              </div>
            )}
          </div>

          {/* Tracking */}
          {order.trackingNumber && (
            <div className="card-sattva p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Tracking</p>
              <p className="text-sm font-mono font-medium text-[var(--sattva-forest)]">{order.trackingNumber}</p>
            </div>
          )}

          {/* Return request info */}
          {order.returnRequest && (
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-xs font-semibold text-yellow-700 uppercase mb-1">Return Request</p>
              <p className="text-sm text-yellow-800">{order.returnRequest.reason}</p>
              <p className="text-xs text-yellow-600 mt-1">Status: <strong>{order.returnRequest.status}</strong></p>
            </div>
          )}

          {/* Return form */}
          {returnForm.open && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3">
              <p className="text-sm font-semibold">Return Request</p>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Reason for return *</label>
                <textarea
                  rows={3}
                  value={returnForm.reason}
                  onChange={e => setReturnForm(p => ({...p, reason: e.target.value}))}
                  placeholder="Please describe the reason..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[var(--sattva-forest)] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Refund method</label>
                <select
                  value={returnForm.refundMethod}
                  onChange={e => setReturnForm(p => ({...p, refundMethod: e.target.value}))}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none"
                >
                  <option value="wallet">Wallet Credit (instant)</option>
                  <option value="original">Original Payment Method (5-7 days)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleReturn} disabled={loading === 'return'}
                  className="flex-1 py-2 text-sm font-semibold bg-[var(--sattva-forest)] text-white rounded-xl disabled:opacity-50">
                  {loading === 'return' ? 'Submitting…' : 'Submit Return'}
                </button>
                <button onClick={() => setReturnForm(p=>({...p, open:false}))}
                  className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {canCancel && (
              <button onClick={handleCancel} disabled={loading === 'cancel'}
                className="flex-1 py-2.5 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50">
                {loading === 'cancel' ? 'Cancelling…' : 'Cancel Order'}
              </button>
            )}
            {canReturn && !returnForm.open && (
              <button onClick={() => setReturnForm(p=>({...p, open:true}))}
                className="flex-1 py-2.5 text-sm font-semibold text-amber-700 border border-amber-200 rounded-xl hover:bg-amber-50">
                Return / Refund
              </button>
            )}
            <button onClick={handleReorder} disabled={loading === 'reorder'}
              className="flex-1 py-2.5 text-sm font-semibold bg-[var(--sattva-forest)] text-white rounded-xl hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50">
              <RotateCcw size={14} />
              {loading === 'reorder' ? 'Adding…' : 'Reorder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function AccountOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 8 });
      if (filter !== 'all') params.set('status', filter);
      if (search) params.set('search', search);
      const r = await api.get(`/orders/?${params}`);
      setOrders(r.data.orders || []);
      setTotalPages(r.data.pages || 1);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [page, filter, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleCancelled = (id) => setOrders(o => o.map(x => x.id === id ? {...x, orderStatus:'cancelled'} : x));
  const handleReturnRequested = (id) => setOrders(o => o.map(x => x.id === id ? {...x, orderStatus:'return_requested'} : x));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading text-xl font-semibold text-[var(--sattva-ink)]">My Orders</h2>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search by order ID…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--sattva-forest)]"
        />
      </form>

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-[var(--sattva-forest)] text-white'
                : 'bg-white border border-[color:var(--sattva-border)] text-gray-600 hover:border-[var(--sattva-forest)]'
            }`}
          >
            {f === 'all' ? 'All Orders' : f.replace(/_/g,' ')}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <OrderSkeleton key={i}/>)}</div>
      ) : orders.length === 0 ? (
        <div className="card-sattva p-12 text-center">
          <Package size={44} className="text-gray-200 mx-auto mb-4" />
          <p className="font-medium text-gray-500 mb-1">No orders found</p>
          <p className="text-sm text-gray-400 mb-5">
            {filter !== 'all' ? `No ${filter.replace(/_/g,' ')} orders` : "You haven't placed any orders yet"}
          </p>
          <Link to="/products" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm">
            <ShoppingBag size={14}/> Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="card-sattva p-5 hover:shadow-md transition-shadow">
              {/* Top row */}
              <div className="flex items-start justify-between mb-3 gap-3">
                <div>
                  <p className="font-semibold text-sm text-[var(--sattva-ink)]">#{order.invoiceId}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                    {' · '}{order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <StatusBadge status={order.orderStatus} />
              </div>

              {/* Item thumbnails */}
              <div className="flex gap-2 mb-3">
                {order.items?.slice(0,4).map((item, i) => (
                  <div key={i} className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={item.image || ''} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ))}
                {order.items?.length > 4 && (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-medium">
                    +{order.items.length - 4}
                  </div>
                )}
              </div>

              {/* Progress bar (non-cancelled) */}
              {!['cancelled','return_requested','returned','refunded'].includes(order.orderStatus) && (
                <OrderTimeline order={order} />
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[color:var(--sattva-border)]">
                <span className="font-bold text-[var(--sattva-forest)]">
                  ₹{order.totalAmount?.toLocaleString('en-IN')}
                </span>
                <button
                  onClick={() => setSelected(order)}
                  className="flex items-center gap-1 text-xs font-semibold text-[var(--sattva-forest)] hover:underline"
                >
                  View Details <ChevronRight size={13}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button disabled={page === 1} onClick={() => setPage(p=>p-1)}
            className="px-4 py-2 text-sm border rounded-xl disabled:opacity-40 hover:bg-gray-50">←</button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p=>p+1)}
            className="px-4 py-2 text-sm border rounded-xl disabled:opacity-40 hover:bg-gray-50">→</button>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
          onCancelled={handleCancelled}
          onReturnRequested={handleReturnRequested}
        />
      )}
    </div>
  );
}
