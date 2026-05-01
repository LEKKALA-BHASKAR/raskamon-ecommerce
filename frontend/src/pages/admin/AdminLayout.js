import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Tag, Image, MessageSquare, BarChart2, FileText, Settings, LogOut, Menu, ChevronRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: ShieldCheck, label: 'Approvals', path: '/admin/approvals' },
  { icon: Package, label: 'Products', path: '/admin/products' },
  { icon: FolderTree, label: 'Categories', path: '/admin/categories' },
  { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
  { icon: Users, label: 'Customers', path: '/admin/customers' },
  { icon: Tag, label: 'Coupons', path: '/admin/coupons' },
  { icon: Image, label: 'Banners', path: '/admin/banners' },
  { icon: MessageSquare, label: 'Reviews', path: '/admin/reviews' },
  { icon: BarChart2, label: 'Analytics', path: '/admin/analytics' },
  { icon: FileText, label: 'Blog', path: '/admin/blog' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/admin') return location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-[#F7F6F3] overflow-hidden">
      <aside
        data-testid="admin-sidebar"
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-[var(--sattva-surface)] border-r border-[color:var(--sattva-border)] flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 p-5 border-b border-[color:var(--sattva-border)]">
          <img
            src="https://customer-assets.emergentagent.com/job_ecom-dashboard-pro-1/artifacts/hnj1kpk1_image.png"
            alt="Dr MediScie Logo"
            className="h-10 w-auto"
          />
          <div>
            <p className="font-heading text-sm font-semibold text-[#2DD4BF]">Dr MediScie</p>
            <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-0.5">
            {navItems.map(({ icon: Icon, label, path }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setSidebarOpen(false)}
                data-testid={`admin-nav-${label.toLowerCase()}`}
                className={`admin-nav-item ${isActive(path) ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{label}</span>
                {isActive(path) && <ChevronRight size={14} className="ml-auto opacity-60" />}
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-[color:var(--sattva-border)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-[var(--sattva-muted)] rounded-full flex items-center justify-center">
              <span className="text-[var(--sattva-forest)] text-xs font-bold">{user?.name?.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/" className="flex-1 text-xs text-center py-1.5 border border-[color:var(--sattva-border)] rounded-lg hover:bg-[var(--sattva-muted)] transition-colors">View Store</Link>
            <button
              data-testid="admin-logout-btn"
              onClick={logout}
              className="flex-1 text-xs text-center py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-[var(--sattva-surface)] border-b border-[color:var(--sattva-border)] flex items-center px-4 gap-3">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--sattva-muted)]"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <h1 className="font-heading text-base font-semibold text-[var(--sattva-ink)]">
            {navItems.find((n) => isActive(n.path))?.label || 'Admin'}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
