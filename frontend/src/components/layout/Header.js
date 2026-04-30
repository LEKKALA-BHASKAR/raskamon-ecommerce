import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, User, Menu, X, Heart, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import CartDrawer from '../cart/CartDrawer';
import SearchModal from '../ui/SearchModal';

const navLinks = [
  { label: 'Skincare', href: '/products?category=Skincare' },
  { label: 'Hair Care', href: '/products?category=Hair+Care' },
  { label: 'Wellness', href: '/products?category=Wellness' },
  { label: 'Body Care', href: '/products?category=Body+Care' },
  { label: 'Aromatherapy', href: '/products?category=Aromatherapy' },
  { label: 'Blog', href: '/blog' },
];

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, logout } = useAuth();
  const { itemCount, cartOpen, setCartOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      <motion.header
        data-testid="site-header"
        className={`sticky top-0 z-50 bg-[var(--sattva-cream)] transition-shadow duration-300 ${
          scrolled ? 'shadow-[var(--shadow-sm)] border-b border-[color:var(--sattva-border)]' : 'border-b border-[color:var(--sattva-border)]'
        }`}
        animate={{ height: scrolled ? '60px' : '72px' }}
        transition={{ duration: 0.2 }}
      >
        {/* Top utility bar */}
        <div className="hidden md:flex items-center justify-center bg-[var(--sattva-forest)] text-[var(--sattva-cream)] text-xs py-1.5 px-4 gap-6">
          <span>🌿 Free shipping on orders ₹499+</span>
          <span>•</span>
          <span>100% Natural & Cruelty-Free</span>
          <span>•</span>
          <span>Use code SATTVA10 for 10% off</span>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-[var(--sattva-forest)] rounded-full flex items-center justify-center">
                <span className="text-[var(--sattva-gold)] text-xs font-bold">S</span>
              </div>
              <span className="font-heading text-xl font-semibold text-[var(--sattva-forest)] tracking-tight">Sattva</span>
            </motion.div>
          </Link>

          {/* Desktop Nav - Moved 20% higher */}
          <nav data-testid="header-navigation-menu" className="hidden lg:flex items-center gap-1" style={{ transform: 'translateY(-20%)' }}>
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="relative px-3 py-2 text-sm font-medium text-[var(--sattva-ink)] hover:text-[var(--sattva-forest)] transition-colors group"
              >
                {link.label}
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-[var(--sattva-gold)] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <motion.button
              data-testid="header-search-button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)]"
              aria-label="Search"
            >
              <Search size={20} />
            </motion.button>

            {/* Wishlist - Fixed to navigate to account page */}
            {user && (
              <Link to="/account">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="hidden sm:flex p-2 rounded-lg hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)]"
                  aria-label="Wishlist"
                >
                  <Heart size={20} />
                </motion.button>
              </Link>
            )}

            {/* Account */}
            <div className="relative group">
              <motion.button
                data-testid="header-account-button"
                whileTap={{ scale: 0.95 }}
                className="p-2 rounded-lg hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)] flex items-center gap-1"
                aria-label="Account"
              >
                <User size={20} />
                {user && <span className="hidden sm:block text-xs font-medium max-w-[80px] truncate">{user.name?.split(' ')[0]}</span>}
              </motion.button>
              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-xl shadow-[var(--shadow-md)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                {user ? (
                  <div className="py-2">
                    <div className="px-4 py-2 border-b border-[color:var(--sattva-border)]">
                      <p className="text-sm font-semibold text-[var(--sattva-ink)] truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Link to="/account" className="block px-4 py-2 text-sm text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition-colors">My Account</Link>
                    <Link to="/account/orders" className="block px-4 py-2 text-sm text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition-colors">My Orders</Link>
                    {(user.role === 'admin' || user.role === 'manager') && (
                      <Link to="/admin" className="block px-4 py-2 text-sm text-[var(--sattva-forest)] font-medium hover:bg-[var(--sattva-muted)] transition-colors">Admin Panel</Link>
                    )}
                    <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">Logout</button>
                  </div>
                ) : (
                  <div className="py-2">
                    <Link to="/login" className="block px-4 py-2 text-sm text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition-colors">Login</Link>
                    <Link to="/register" className="block px-4 py-2 text-sm font-medium text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)] transition-colors">Create Account</Link>
                  </div>
                )}
              </div>
            </div>

            {/* Cart */}
            <motion.button
              data-testid="header-cart-button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setCartOpen(true)}
              className="relative p-2 rounded-lg hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)]"
              aria-label="Cart"
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--sattva-forest)] text-[var(--sattva-cream)] text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </motion.button>

            {/* Mobile menu */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--sattva-muted)] transition-colors ml-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-[var(--sattva-cream)] border-t border-[color:var(--sattva-border)] overflow-hidden"
            >
              <div className="container-sattva py-4 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    className="px-4 py-3 text-sm font-medium text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] rounded-lg transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-[color:var(--sattva-border)] my-2" />
                {user ? (
                  <>
                    <Link to="/account" className="px-4 py-3 text-sm font-medium text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)] rounded-lg transition-colors">My Account</Link>
                    <button onClick={logout} className="text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="px-4 py-3 text-sm font-medium text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] rounded-lg transition-colors">Login</Link>
                    <Link to="/register" className="px-4 py-3 text-sm font-medium text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)] rounded-lg transition-colors">Create Account</Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Search Modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Header;
