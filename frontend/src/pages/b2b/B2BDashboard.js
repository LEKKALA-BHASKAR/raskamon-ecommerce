import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Layout from '../../components/layout/Layout';
import {
  ShoppingBag, Store, Building2, Download,
  TrendingUp, Wallet, CheckCircle2, MessageSquare,
  CreditCard
} from 'lucide-react';
import { MOCK_B2B_STATS } from '../../utils/mockData';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtK = v => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`;

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const RFQ_STATUS = {
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
  negotiating: { label: 'Negotiating', cls: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
};

const StatCard = ({ icon: Icon, label, value, sub, color = '#1A3C34', badge }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
      {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>{badge}</span>}
    </div>
    <p className="text-xl font-black text-gray-900 tracking-tight">{value}</p>
    <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

export default function B2BDashboard() {
  const { user, isB2B } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(MOCK_B2B_STATS);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    // Try real API, fall back to mock
    api.get('/orders', { params: { limit: 10 } })
      .then(r => {
        const orders = r.data?.orders || r.data || [];
        if (orders.length) setData(prev => ({ ...prev, recentOrders: orders }));
      })
      .catch(() => {});
  }, [user, navigate]);

  const creditPct = Math.round((data.company.credit_used / data.company.credit_limit) * 100);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'orders', label: 'Orders' },
    { key: 'rfq', label: 'RFQ & Pricing' },
    { key: 'credit', label: 'Credit & Payments' },
  ];

  return (
    <Layout>
      <div className="min-h-screen" style={{ background: '#F0F4FF' }}>
        {/* Header Banner */}
        <div style={{ background: 'linear-gradient(135deg, #1E3A5F, #0c1e35)' }} className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #3B82F6, transparent)' }} />
          <div className="max-w-6xl mx-auto px-6 py-8 relative">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={16} className="text-blue-300" />
                  <span className="text-blue-300 text-xs font-semibold">B2B ENTERPRISE ACCOUNT</span>
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full" style={{ background: 'linear-gradient(90deg, #F59E0B, #EF4444)', color: 'white' }}>
                    {data.company.tier} Partner
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">{data.company.name}</h1>
                <p className="text-blue-300 text-sm">GST: {data.company.gst} · {user?.email || 'buy@business.com'}</p>
              </div>
              <div className="flex gap-3">
                <Link to="/b2b/catalog">
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-[#1E3A5F]" style={{ background: '#A3E635' }}>
                    <Store size={15} /> Browse Catalog
                  </button>
                </Link>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white border border-white/20 hover:bg-white/10 transition-colors">
                  <Download size={15} /> Export Report
                </button>
              </div>
            </div>

            {/* Credit Bar */}
            <div className="mt-6 bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-semibold flex items-center gap-2"><CreditCard size={14} /> Credit Line</span>
                <span className="text-white text-sm font-bold">{fmt(data.company.credit_available)} available</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${creditPct}%`, background: creditPct > 80 ? '#EF4444' : '#A3E635' }} />
              </div>
              <div className="flex justify-between text-xs text-blue-200 mt-1.5">
                <span>Used: {fmt(data.company.credit_used)}</span>
                <span>Limit: {fmt(data.company.credit_limit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex gap-0">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`px-5 py-4 text-sm font-semibold border-b-2 transition-colors ${
                    activeTab === t.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={ShoppingBag} label="Total Orders" value={data.orders.total} sub={`${data.orders.this_month} this month`} color="#1E3A5F" />
                <StatCard icon={TrendingUp} label="Total Spend" value={fmtK(data.orders.total_value)} sub="Lifetime" color="#3B82F6" />
                <StatCard icon={Wallet} label="Total Savings" value={fmtK(data.savings.total)} badge={`${data.savings.percentage}% off`} color="#10B981" />
                <StatCard icon={MessageSquare} label="Active RFQs" value={data.rfq.active} sub={`${data.rfq.total} total`} color="#8B5CF6" />
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Recent Orders</h3>
                  <button onClick={() => setActiveTab('orders')} className="text-sm text-blue-600 font-medium hover:underline">View All</button>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Products</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.recentOrders.map(o => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="font-mono text-xs text-gray-400">#{o.id}</p>
                          <p className="text-xs text-gray-500">{o.date}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700 max-w-[200px] truncate">{o.products}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-gray-900">{fmt(o.amount)}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {o.invoice ? (
                            <button className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 ml-auto">
                              <Download size={11} /> {o.invoice}
                            </button>
                          ) : <span className="text-xs text-gray-400">Pending</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tier Pricing */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Your Tier Pricing</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Pricing tiers based on your Gold Partner status</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Retail MRP</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-blue-600 uppercase">Tier 1</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-blue-700 uppercase">Tier 2</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-blue-800 uppercase">Tier 3</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">MOQ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.tierPricing.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">{p.product}</td>
                          <td className="px-4 py-3 text-center text-gray-500 line-through text-xs">₹{p.retail}</td>
                          <td className="px-4 py-3 text-center text-blue-600 font-semibold text-xs">{p.tier1}</td>
                          <td className="px-4 py-3 text-center text-blue-700 font-semibold text-xs">{p.tier2}</td>
                          <td className="px-4 py-3 text-center text-blue-800 font-bold text-xs">{p.tier3}</td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500">{p.moq} units</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* RFQ & PRICING TAB */}
          {activeTab === 'rfq' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">Request for Quote (RFQ)</h2>
                  <p className="text-sm text-gray-500">Negotiate custom pricing for large orders</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white" style={{ background: 'linear-gradient(90deg, #3B82F6, #6366F1)' }}>
                  + New RFQ Request
                </button>
              </div>

              <div className="grid gap-4">
                {data.rfqList.map(rfq => {
                  const st = RFQ_STATUS[rfq.status] || RFQ_STATUS.pending;
                  const savingPct = Math.round(((rfq.currentPrice - rfq.requestedPrice) / rfq.currentPrice) * 100);
                  return (
                    <div key={rfq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 mb-1">{rfq.product}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>Current price: <strong className="text-gray-700">{fmt(rfq.currentPrice)}</strong></span>
                            <span>→</span>
                            <span>Requested: <strong className="text-blue-600">{fmt(rfq.requestedPrice)}</strong></span>
                            <span className="text-green-600 font-bold">Save {savingPct}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${st.cls}`}>{st.label}</span>
                          <span className="text-xs text-gray-400">Expires: {rfq.expires}</span>
                        </div>
                      </div>
                      {rfq.status === 'approved' && (
                        <div className="mt-4 p-3 bg-green-50 rounded-xl flex items-center gap-2 text-green-700 text-sm font-medium">
                          <CheckCircle2 size={15} /> Your requested price has been approved! Add to cart at {fmt(rfq.requestedPrice)}
                        </div>
                      )}
                      {rfq.status === 'negotiating' && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-xl flex items-center gap-2 text-blue-700 text-sm font-medium">
                          <MessageSquare size={15} /> Counter-offer received. Our team will contact you within 24 hours.
                        </div>
                      )}
                      <div className="mt-4 flex gap-2">
                        <button className="px-4 py-2 text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors">View Details</button>
                        {rfq.status === 'approved' && (
                          <button className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:opacity-90 transition-opacity">Add to Cart</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CREDIT TAB */}
          {activeTab === 'credit' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-6">Credit Account Summary</h3>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { label: 'Credit Limit', value: fmt(data.company.credit_limit), color: '#1E3A5F' },
                      { label: 'Used', value: fmt(data.company.credit_used), color: '#EF4444' },
                      { label: 'Available', value: fmt(data.company.credit_available), color: '#10B981' },
                    ].map(item => (
                      <div key={item.label} className="text-center p-4 rounded-xl" style={{ background: `${item.color}08` }}>
                        <p className="text-xl font-black" style={{ color: item.color }}>{item.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>Credit utilization</span>
                      <span className="font-bold" style={{ color: creditPct > 80 ? '#EF4444' : '#10B981' }}>{creditPct}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${creditPct}%`, background: creditPct > 80 ? '#EF4444' : 'linear-gradient(90deg, #10B981, #059669)' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    {[
                      { term: 'Net 15', desc: 'Pay within 15 days', available: true },
                      { term: 'Net 30', desc: 'Pay within 30 days', available: true },
                      { term: 'Net 60', desc: 'Pay within 60 days', available: data.company.tier === 'Gold' || data.company.tier === 'Platinum' },
                    ].map(t => (
                      <div key={t.term} className={`p-3 rounded-xl border ${t.available ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-50'}`}>
                        <p className="font-bold text-gray-900">{t.term}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                        {t.available && <CheckCircle2 size={13} className="text-green-500 mt-1" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Payment Methods</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Bank Transfer / NEFT', icon: '🏦', active: true },
                      { label: 'UPI / QR Code', icon: '📱', active: true },
                      { label: 'Credit Line (Net)', icon: '💳', active: true },
                      { label: 'Cheque', icon: '📋', active: false },
                    ].map(m => (
                      <div key={m.label} className={`flex items-center gap-3 p-3 rounded-xl border ${m.active ? 'border-blue-100 bg-blue-50' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                        <span className="text-lg">{m.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{m.label}</span>
                        {m.active && <CheckCircle2 size={14} className="text-blue-500 ml-auto" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">All Orders</h3>
                <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Download size={12} /> Export CSV
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Order ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Products</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentOrders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-mono text-xs text-gray-500">#{o.id}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{o.date}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate">{o.products}</td>
                      <td className="px-4 py-4 text-right font-bold text-gray-900">{fmt(o.amount)}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${STATUS_STYLES[o.status]}`}>{o.status}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {o.invoice ? (
                          <button className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 ml-auto">
                            <Download size={11} /> {o.invoice}
                          </button>
                        ) : <span className="text-xs text-gray-400">Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
