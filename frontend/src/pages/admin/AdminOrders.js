import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Search, Eye } from 'lucide-react';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['', 'placed', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, ...(status && { status }) });
      const res = await api.get(`/admin/orders?${params}`);
      setOrders(res.data.orders);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [page, status]);

  const updateStatus = async (orderId) => {
    if (!newStatus) return;
    setUpdatingStatus(orderId);
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus, note: statusNote });
      toast.success('Status updated');
      setSelected(null);
      setNewStatus('');
      setStatusNote('');
      fetchOrders();
    } catch { toast.error('Failed'); } finally { setUpdatingStatus(null); }
  };

  const getStatusClass = (s) => {
    const map = { placed: 'bg-blue-100 text-blue-700', confirmed: 'bg-amber-100 text-amber-700', shipped: 'bg-indigo-100 text-indigo-700', out_for_delivery: 'bg-orange-100 text-orange-700', delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };
    return map[s] || 'bg-gray-100 text-gray-600';
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold">Orders</h2>
          <p className="text-sm text-gray-500">{total} total orders</p>
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="text-sm border border-[color:var(--sattva-border)] px-3 py-2 rounded-lg bg-[var(--sattva-surface)] focus:outline-none">
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'All Status'}</option>)}
        </select>
      </div>

      <div className="card-sattva overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
            <tr>
              {['Order', 'Customer', 'Items', 'Total', 'Payment', 'Status', 'Date', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--sattva-border)]">
            {loading ? [...Array(8)].map((_,i) => <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-8 skeleton rounded" /></td></tr>) :
            orders.map(order => (
              <tr key={order.id} className="hover:bg-[var(--sattva-muted)] transition-colors">
                <td className="px-4 py-3"><p className="text-sm font-mono">{order.invoiceId}</p></td>
                <td className="px-4 py-3"><p className="text-sm">{order.userName}</p><p className="text-xs text-gray-400">{order.userEmail}</p></td>
                <td className="px-4 py-3 text-sm">{order.items?.length} items</td>
                <td className="px-4 py-3 text-sm font-semibold tabular-nums">₹{order.totalAmount?.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{order.paymentMethod === 'cod' ? 'COD' : order.paymentStatus}</span></td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusClass(order.orderStatus)}`}>{order.orderStatus?.replace('_',' ')}</span></td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { setSelected(order); setNewStatus(order.orderStatus); }} className="p-1.5 rounded-lg hover:bg-[var(--sattva-muted)] text-[var(--sattva-forest)]">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex gap-2 p-3 border-t border-[color:var(--sattva-border)] justify-end">
            <button disabled={page<=1} onClick={() => setPage(p=>p-1)} className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40">Prev</button>
            <span className="px-3 py-1.5 text-xs bg-[var(--sattva-forest)] text-[var(--sattva-cream)] rounded-lg">{page}/{pages}</span>
            <button disabled={page>=pages} onClick={() => setPage(p=>p+1)} className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-[var(--sattva-surface)] rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-base font-semibold">{selected.invoiceId}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div className="space-y-3 text-sm mb-4">
              <div><strong>Customer:</strong> {selected.userName} ({selected.userEmail})</div>
              <div><strong>Address:</strong> {selected.shippingAddress?.addressLine1}, {selected.shippingAddress?.city}, {selected.shippingAddress?.state}</div>
              <div><strong>Payment:</strong> {selected.paymentMethod} | {selected.paymentStatus}</div>
              <div><strong>Total:</strong> ₹{selected.totalAmount?.toLocaleString('en-IN')}</div>
            </div>

            <div className="space-y-2 mb-4">
              {selected.items?.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--sattva-muted)]"><img src={item.image} alt="" className="w-full h-full object-cover" /></div>
                  <div className="flex-1"><p className="text-xs font-medium">{item.name}</p><p className="text-xs text-gray-500">x{item.quantity}</p></div>
                  <span className="text-xs font-semibold">₹{(item.price*item.quantity)?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none">
                {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
              <input type="text" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} placeholder="Note (optional)"
                className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none" />
              <button onClick={() => updateStatus(selected.id)} disabled={updatingStatus === selected.id} className="w-full btn-primary py-2.5">
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOrders;
