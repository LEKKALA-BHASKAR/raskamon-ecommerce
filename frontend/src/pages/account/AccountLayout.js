import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Package, Heart, MapPin, User, LogOut, Wallet, Bell, ChevronRight, Shield } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { icon: Package, label: 'My Orders',       path: '/account/orders' },
  { icon: Wallet,  label: 'Wallet & Rewards', path: '/account/wallet' },
  { icon: Heart,   label: 'Wishlist',          path: '/account/wishlist' },
  { icon: MapPin,  label: 'Addresses',         path: '/account/addresses' },
  { icon: User,    label: 'Profile',           path: '/account/profile' },
  { icon: Shield,  label: 'Security',          path: '/account/security' },
];

export default function AccountLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) { navigate('/login'); return null; }

  const initials = (user.name || user.email || 'U').charAt(0).toUpperCase();

  return (
    <Layout>
      <div className="container-sattva py-6 md:py-10">
        <div className="flex flex-col md:flex-row gap-6">

          {/* ── Sidebar ── */}
          <aside className="w-full md:w-64 flex-shrink-0">
            {/* User card */}
            <div className="card-sattva p-5 mb-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[var(--sattva-forest)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold text-[var(--sattva-gold)]">{initials}</span>
                }
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--sattva-ink)] truncate">{user.name || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <p className="text-xs text-[var(--sattva-gold)] font-medium mt-0.5">
                  {user.loyaltyPoints || 0} pts
                </p>
              </div>
            </div>

            {/* Nav links */}
            <nav className="card-sattva overflow-hidden">
              {NAV.map(({ icon: Icon, label, path }) => {
                const active = location.pathname.startsWith(path);
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-3 px-4 py-3.5 text-sm transition-colors border-b border-[color:var(--sattva-border)] last:border-0 ${
                      active
                        ? 'bg-[var(--sattva-forest)]/8 text-[var(--sattva-forest)] font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-[var(--sattva-ink)]'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-[var(--sattva-forest)]' : 'text-gray-400'} />
                    <span className="flex-1">{label}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </Link>
                );
              })}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </nav>
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </Layout>
  );
}
