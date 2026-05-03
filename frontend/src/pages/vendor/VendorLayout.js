import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Package, BarChart3, Wallet, LogOut, Store, ShoppingBag, ChevronRight
} from 'lucide-react';

const nav = [
  { to: '/vendor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/vendor/products', icon: Package, label: 'Products' },
  { to: '/vendor/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/vendor/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/vendor/payouts', icon: Wallet, label: 'Payouts' },
];

export default function VendorLayout() {
  const { user, logout, isVendor } = useAuth();
  const navigate = useNavigate();

  if (!user || !isVendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--sattva-muted)]">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md">
          <Store size={48} className="mx-auto text-[var(--sattva-forest)] mb-4" />
          <h2 className="text-xl font-bold mb-2">Vendor Access Required</h2>
          <p className="text-gray-500 mb-4">Please log in with an approved vendor account to access this portal.</p>
          <button onClick={() => navigate('/login')} className="px-6 py-2 bg-[var(--sattva-forest)] text-white rounded-xl font-semibold">
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--sattva-muted)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--sattva-surface)] border-r border-[color:var(--sattva-border)] flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-[color:var(--sattva-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--sattva-forest)] rounded-lg flex items-center justify-center">
              <Store size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--sattva-forest)] uppercase tracking-widest">Vendor Portal</p>
              <p className="text-[11px] text-gray-400 truncate max-w-[140px]">{user?.store_name || user?.name}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--sattva-forest)] text-white'
                    : 'text-gray-600 hover:bg-[var(--sattva-muted)] hover:text-[var(--sattva-ink)]'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-[color:var(--sattva-border)] pt-3">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-semibold text-gray-700 truncate">{user?.name}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
