import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { User, Package, Heart, MapPin, Settings, LogOut, ChevronRight, Star, Bell } from 'lucide-react';
import api from '../../utils/api';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { StarRating } from '../../components/product/ProductCard';

const navItems = [
  { icon: Package, label: 'My Orders', path: '/account/orders' },
  { icon: Heart, label: 'Wishlist', path: '/account/wishlist' },
  { icon: MapPin, label: 'Addresses', path: '/account/addresses' },
  { icon: Bell, label: 'Notifications', path: '/account/notifications' },
  { icon: User, label: 'Profile', path: '/account/profile' },
];

const AccountDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' });
  const { user, setUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setProfileForm({ name: user.name || '', phone: user.phone || '' });
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [oRes, wRes, aRes] = await Promise.all([
        api.get('/orders/?limit=20'),
        api.get('/users/me/wishlist'),
        api.get('/users/me/addresses'),
      ]);
      setOrders(oRes.data.orders || []);
      setWishlist(wRes.data || []);
      setAddresses(aRes.data || []);
    } catch {}
  };

  const saveProfile = async () => {
    try {
      const res = await api.put('/users/me', profileForm);
      setUser(res.data);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
  };

  const removeFromWishlist = async (productId) => {
    await api.delete(`/users/me/wishlist/${productId}`);
    setWishlist(w => w.filter(p => p.id !== productId));
    toast.success('Removed from wishlist');
  };

  const getStatusColor = (status) => {
    const map = { placed: 'status-placed', confirmed: 'status-confirmed', shipped: 'status-shipped', out_for_delivery: 'status-out_for_delivery', delivered: 'status-delivered', cancelled: 'status-cancelled' };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  const TIMELINE_STEPS = ['placed', 'confirmed', 'shipped', 'out_for_delivery', 'delivered'];

  const tabs = [
    { key: 'orders', label: 'Orders', icon: Package },
    { key: 'wishlist', label: 'Wishlist', icon: Heart },
    { key: 'addresses', label: 'Addresses', icon: MapPin },
    { key: 'profile', label: 'Profile', icon: User },
  ];

  if (!user) return null;

  return (
    <Layout>
      <div className="container-sattva py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[var(--sattva-forest)] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="font-heading text-xl text-[var(--sattva-gold)] font-bold">{user.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)]">{user.name}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-[var(--sattva-gold)] font-medium">♥ {user.loyaltyPoints || 0} Loyalty Points</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 border-b border-[color:var(--sattva-border)] overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === key
                  ? 'border-[var(--sattva-forest)] text-[var(--sattva-forest)]'
                  : 'border-transparent text-gray-500 hover:text-[var(--sattva-ink)]'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div data-testid="account-orders-tab" className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <Package size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No orders yet</p>
                <Link to="/products" className="mt-4 btn-primary inline-block px-6 py-2">Start Shopping</Link>
              </div>
            ) : orders.map(order => (
              <div key={order.id} className="card-sattva p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm text-[var(--sattva-ink)]">#{order.invoiceId}</p>
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full capitalize ${getStatusColor(order.orderStatus)}`}>
                    {order.orderStatus?.replace('_', ' ')}
                  </span>
                </div>

                {/* Order items preview */}
                <div className="flex gap-2 mb-3">
                  {order.items?.slice(0, 3).map((item, i) => (
                    <div key={i} className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--sattva-muted)] flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {order.items?.length > 3 && (
                    <div className="w-12 h-12 rounded-lg bg-[var(--sattva-muted)] flex items-center justify-center text-xs font-medium text-gray-500">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="flex items-center gap-1 mb-3">
                  {TIMELINE_STEPS.map((step, i) => {
                    const statusIdx = TIMELINE_STEPS.indexOf(order.orderStatus);
                    const isDone = i <= statusIdx && order.orderStatus !== 'cancelled';
                    return (
                      <React.Fragment key={step}>
                        <div className={`w-2 h-2 rounded-full transition-colors ${
                          isDone ? 'bg-[var(--sattva-forest)]' : 'bg-gray-200'
                        }`} title={step.replace('_', ' ')} />
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 ${
                            i < statusIdx && order.orderStatus !== 'cancelled' ? 'bg-[var(--sattva-forest)]' : 'bg-gray-200'
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm tabular-nums text-[var(--sattva-forest)]">₹{order.totalAmount?.toLocaleString('en-IN')}</p>
                  <div className="flex gap-2">
                    {['placed', 'confirmed'].includes(order.orderStatus) && (
                      <button
                        onClick={async () => {
                          await api.post(`/orders/${order.id}/cancel`);
                          toast.success('Order cancelled');
                          fetchData();
                        }}
                        className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Wishlist Tab */}
        {activeTab === 'wishlist' && (
          <div>
            {wishlist.length === 0 ? (
              <div className="text-center py-12">
                <Heart size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Your wishlist is empty</p>
                <Link to="/products" className="mt-4 btn-primary inline-block px-6 py-2">Explore Products</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {wishlist.map(product => (
                  <div key={product.id} className="card-sattva overflow-hidden group">
                    <Link to={`/products/${product.slug}`}>
                      <div className="aspect-square overflow-hidden bg-[var(--sattva-muted)]">
                        <img src={product.images?.[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    </Link>
                    <div className="p-3">
                      <p className="text-xs text-[var(--sattva-gold)] font-medium">{product.brand}</p>
                      <Link to={`/products/${product.slug}`}>
                        <p className="text-sm font-medium text-[var(--sattva-ink)] line-clamp-2">{product.name}</p>
                      </Link>
                      <p className="font-bold text-sm text-[var(--sattva-forest)] mt-1">₹{product.discountPrice?.toLocaleString('en-IN')}</p>
                      <button onClick={() => removeFromWishlist(product.id)} className="text-xs text-red-500 mt-2 hover:underline">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <div className="space-y-4">
            {addresses.map(addr => (
              <div key={addr.id} className="card-sattva p-4">
                {addr.isDefault && <span className="text-[10px] bg-[var(--sattva-forest)] text-[var(--sattva-cream)] px-2 py-0.5 rounded-full mb-2 inline-block">Default</span>}
                <p className="font-semibold text-sm">{addr.name} | {addr.phone}</p>
                <p className="text-sm text-gray-600">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                <button
                  onClick={async () => {
                    await api.delete(`/users/me/addresses/${addr.id}`);
                    setAddresses(a => a.filter(x => x.id !== addr.id));
                    toast.success('Address deleted');
                  }}
                  className="text-xs text-red-500 mt-2 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
            {addresses.length === 0 && (
              <p className="text-center text-gray-500 py-8">No saved addresses</p>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="card-sattva p-6 max-w-md">
            <h3 className="font-heading text-lg font-semibold mb-4">Edit Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name</label>
                <input value={profileForm.name} onChange={(e) => setProfileForm(p => ({...p, name: e.target.value}))}
                  className="w-full px-4 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                <input value={user.email} disabled className="w-full px-4 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-muted)] text-gray-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Phone</label>
                <input value={profileForm.phone} onChange={(e) => setProfileForm(p => ({...p, phone: e.target.value}))}
                  className="w-full px-4 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" />
              </div>
              <button onClick={saveProfile} className="btn-primary w-full py-2.5">Save Changes</button>
              <button onClick={logout} className="w-full py-2.5 text-sm text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AccountDashboard;
