import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Truck, Home, Download } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/layout/Layout';

const OrderSuccess = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/orders/${orderId}`).then(r => setOrder(r.data)).catch(() => {});
  }, [orderId]);

  return (
    <Layout>
      <div className="container-sattva py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg mx-auto text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="font-heading text-3xl font-semibold text-[var(--sattva-ink)] mb-2">Order Placed!</h1>
          <p className="text-gray-500 text-sm mb-6">
            {order?.paymentMethod === 'cod'
              ? 'Your order has been placed successfully. Pay when delivered.'
              : 'Payment received. Your order is confirmed!'}
          </p>

          {order && (
            <div className="card-sattva p-6 text-left mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-500">Order ID</p>
                  <p className="font-semibold text-sm">{order.invoiceId}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-bold text-[var(--sattva-forest)] tabular-nums">₹{order.totalAmount?.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium capitalize">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-500">Status</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full capitalize">{order.orderStatus}</span>
              </div>

              {/* Shipping */}
              <div className="mt-4 p-3 bg-[var(--sattva-muted)] rounded-lg">
                <p className="text-xs font-medium text-[var(--sattva-forest)] mb-1 flex items-center gap-1"><Truck size={12} /> Delivering to</p>
                <p className="text-xs text-gray-600">{order.shippingAddress?.addressLine1}, {order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
              </div>

              {/* Order Timeline */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Order Timeline</p>
                <div className="space-y-2">
                  {order.timeline?.map((t, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[var(--sattva-gold)] rounded-full mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium capitalize">{t.status.replace('_', ' ')}</p>
                        <p className="text-[10px] text-gray-400">{new Date(t.timestamp).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/account/orders" className="flex-1 btn-outlined py-3 flex items-center justify-center gap-2">
              <Package size={16} /> Track Orders
            </Link>
            <Link to="/products" className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
              <Home size={16} /> Continue Shopping
            </Link>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default OrderSuccess;
