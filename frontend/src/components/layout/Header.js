import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ShoppingBag, User, Menu, X, Heart, ChevronDown,
  Leaf, Shield, Sparkles, Store, Building2, LayoutDashboard,
  LogOut, Settings, Package, ArrowRight, Phone, Mail
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import CartDrawer from '../cart/CartDrawer';
import SearchModal from '../ui/SearchModal';
import BrandLogo from '../brand/BrandLogo';
import { useSiteNav } from '../../utils/useSiteNav';
import ThemeToggle from '../ui/ThemeToggle';

const FALLBACK_ANNOUNCEMENTS = [
  '🌿 Free delivery on orders above ₹499 — Across India',
  '✨ Use code WELLNESS15 for 15% off on your first order',
  '🏆 100% Authentic Ayurvedic formulations — GMP Certified',
  '📦 Express delivery in 2-4 business days',
  '🌱 Cruelty-free · Paraben-free · Made in India',
];

// Fallback only — real categories come from /api/site/nav (driven by admin)
const FALLBACK_TOP_CATEGORIES = [
  {
    label: "Men's Health",
    href: "/products?category=Men%27s+Health",
    icon: '💪',
    sub: [
      { label: 'Testosterone Support', href: "/products?category=Men%27s+Health&tags=testosterone" },
      { label: 'Sexual Wellness', href: "/products?category=Men%27s+Health&tags=sexual-wellness" },
      { label: 'Hair Loss & Regrowth', href: "/products?category=Men%27s+Health&tags=hair-growth" },
      { label: 'Beard & Grooming', href: "/products?category=Men%27s+Health&tags=grooming" },
      { label: 'Prostate Health', href: "/products?category=Men%27s+Health&tags=prostate" },
    ]
  },
  {
    label: "Women's Health",
    href: "/products?category=Women%27s+Health",
    icon: '🌸',
    sub: [
      { label: 'Hormonal Balance', href: "/products?category=Women%27s+Health&tags=hormones" },
      { label: 'PCOS & Period Care', href: "/products?category=Women%27s+Health&tags=pcos" },
      { label: 'Pregnancy & Nursing', href: "/products?category=Women%27s+Health&tags=pregnancy" },
      { label: 'Menopause Support', href: "/products?category=Women%27s+Health&tags=menopause" },
      { label: 'Skin & Hair (Women)', href: "/products?category=Women%27s+Health&tags=beauty" },
    ]
  },
  {
    label: 'Fitness & Performance',
    href: '/products?category=Fitness',
    icon: '🏋️',
    sub: [
      { label: 'Pre-Workout', href: '/products?category=Fitness&tags=pre-workout' },
      { label: 'Protein & Mass Gain', href: '/products?category=Fitness&tags=protein' },
      { label: 'Recovery & Joint Care', href: '/products?category=Fitness&tags=recovery' },
      { label: 'Weight Management', href: '/products?category=Fitness&tags=weight-loss' },
      { label: 'Energy & Stamina', href: '/products?category=Fitness&tags=energy' },
    ]
  },
  {
    label: 'Immunity & Detox',
    href: '/products?category=Immunity',
    icon: '🛡️',
    sub: [
      { label: 'Immunity Boosters', href: '/products?category=Immunity&tags=immunity' },
      { label: 'Liver Detox', href: '/products?category=Immunity&tags=liver' },
      { label: 'Gut & Digestion', href: '/products?category=Immunity&tags=digestive' },
      { label: 'Stress & Sleep', href: '/products?category=Immunity&tags=stress-relief' },
      { label: 'Antioxidants', href: '/products?category=Immunity&tags=antioxidant' },
    ]
  },
  {
    label: 'Combos & Kits',
    href: '/products?category=Combos',
    icon: '🎁',
    sub: [
      { label: 'Hair Care Kits', href: '/products?category=Combos&tags=hair-kit' },
      { label: 'Skin Care Kits', href: '/products?category=Combos&tags=skin-kit' },
      { label: 'Wellness Packs', href: '/products?category=Combos&tags=wellness-pack' },
      { label: 'Gift Sets', href: '/products?category=Combos&tags=gift' },
      { label: 'Starter Kits', href: '/products?category=Combos&tags=starter' },
    ]
  },
];

const FALLBACK_SIMPLE_LINKS = [
  { label: 'Customer Care', href: '/contact' },
  { label: 'B2B Buyer', href: '/register/b2b' },
];

const MEGA_MENU = [
  // Removed 'B2B & Partners' section
];



const AnnouncementBar = ({ announcements }) => {
  const list = (announcements && announcements.length) ? announcements : FALLBACK_ANNOUNCEMENTS;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (list.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % list.length), 3500);
    return () => clearInterval(t);
  }, [list.length]);
  return (
    <div className="announcement-bar overflow-hidden relative" style={{ height: '34px' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center justify-center text-xs font-medium tracking-wide"
        >
          {list[idx]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const MegaMenuDropdown = ({ menu, visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[680px] bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl shadow-[var(--shadow-lg)] z-50 overflow-hidden"
      >
        <div className="flex">
          {/* Columns */}
          <div className={`flex-1 grid p-6 gap-6 ${menu.columns.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {menu.columns.map((col, ci) => (
              <div key={ci}>
                <p className="eyebrow text-[var(--sattva-gold-deep)] mb-3">{col.title}</p>
                <ul className="space-y-1">
                  {col.items.map((item, ii) => (
                    <li key={ii}>
                      <Link
                        to={item.href}
                        className="flex items-center gap-2 py-1.5 text-sm text-gray-600 hover:text-[var(--sattva-forest)] font-medium transition-colors group"
                      >
                        <span className="text-[var(--sattva-gold)] text-[10px]">{item.icon}</span>
                        <span className="hover-underline">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {/* Featured promo */}
          {menu.featured && (
            <div className="w-52 bg-[var(--sattva-muted)] p-5 flex flex-col justify-between border-l border-[color:var(--sattva-border)]">
              <div>
                {menu.featured.badge && (
                  <span className="badge-new inline-block mb-2">{menu.featured.badge}</span>
                )}
                <h4 className="font-heading text-base font-semibold text-[var(--sattva-ink)] leading-snug mb-1">
                  {menu.featured.label}
                </h4>
                <p className="text-xs text-gray-500">{menu.featured.subtitle}</p>
              </div>
              <Link
                to={menu.featured.href}
                className="mt-4 flex items-center gap-1 text-xs font-bold text-[var(--sattva-forest)] hover:gap-2 transition-all"
              >
                Shop Now <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [openAccountMenu, setOpenAccountMenu] = useState(false);
  const accountCloseTimer = useRef(null);
  const { user, logout, isAdmin, isVendor, isB2B } = useAuth();
  const { itemCount, setCartOpen } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const closeTimer = useRef(null);
  const nav = useSiteNav();
  const TOP_CATEGORIES = (nav.categories && nav.categories.length) ? nav.categories : FALLBACK_TOP_CATEGORIES;
  const SimpleNavLinks = (nav.simpleLinks && nav.simpleLinks.length) ? nav.simpleLinks : FALLBACK_SIMPLE_LINKS;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); setOpenMenu(null); }, [location.pathname]);

  const handleMenuEnter = (label) => {
    clearTimeout(closeTimer.current);
    setOpenMenu(label);
  };
  const handleMenuLeave = () => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 120);
  };

  const handleAccountEnter = () => {
    clearTimeout(accountCloseTimer.current);
    setOpenAccountMenu(true);
  };
  const handleAccountLeave = () => {
    accountCloseTimer.current = setTimeout(() => setOpenAccountMenu(false), 120);
  };

  const canonicalRole = user ? (user.role?.toUpperCase?.() || '') : '';

  return (
    <>
      <AnnouncementBar announcements={nav.announcements} />

      <motion.header
        data-testid="site-header"
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'header-blur border-b border-[color:var(--sattva-border)] shadow-[var(--shadow-sm)]'
            : 'bg-[var(--sattva-cream)] border-b border-[color:var(--sattva-border)]'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">

          <div className="flex items-stretch">

            {/* Left side: Logo spanning both rows */}
            <div className="hidden lg:flex items-center flex-shrink-0 pr-6">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <BrandLogo size="xl" />
              </Link>
            </div>

            {/* Right side: stacked rows */}
            <div className="flex-1">

          {/* ── Primary row ── */}
          <div className="relative flex items-center justify-between h-[56px] lg:h-[60px]">

            {/* Mobile Logo */}
            <div className="flex lg:hidden items-center">
              <Link to="/" className="flex-shrink-0 flex items-center">
                <BrandLogo size="lg" />
              </Link>
            </div>

            {/* Search bar — centered on desktop */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden lg:flex items-center gap-2 w-[240px] xl:w-[340px] rounded-full border border-[color:var(--sattva-border)] bg-[var(--sattva-surface)] px-2.5 py-1.5 text-left shadow-sm hover:border-[var(--sattva-forest)] transition"
            >
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-400 truncate">Search products…</span>
            </button>

            {/* Right side: Action buttons */}
            <div className="hidden lg:flex items-center gap-1.5 flex-shrink-0">
              <ThemeToggle />
              <Link
                to="/account"
                className="flex items-center gap-1 rounded-full border border-[color:var(--sattva-border)] bg-[var(--sattva-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition"
              >
                <Heart size={13} /> Wishlist
              </Link>

              <div
                className="relative"
                onMouseEnter={handleAccountEnter}
                onMouseLeave={handleAccountLeave}
              >
                <button
                  onClick={() => navigate(user ? '/account' : '/login')}
                  className="flex items-center gap-1 rounded-full border border-[color:var(--sattva-border)] bg-[var(--sattva-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition"
                >
                  <User size={13} /> Account
                </button>
                <AnimatePresence>
                  {openAccountMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-[220px] bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl shadow-[var(--shadow-lg)] z-50 overflow-hidden"
                    >
                      <div className="py-2">
                        {!user ? (
                          <>
                            <Link
                              to="/login"
                              className="block px-3 py-2 text-sm font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition-colors"
                            >
                              Sign In
                            </Link>
                            <Link
                              to="/register"
                              className="block px-3 py-2 text-sm font-semibold text-[var(--sattva-forest)] hover:bg-green-50 transition-colors"
                            >
                              Create Account
                            </Link>
                            <Link
                              to="/register/b2b"
                              className="block px-3 py-2 text-sm font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition-colors"
                            >
                              Business
                            </Link>
                            <Link
                              to="/register/b2b"
                              className="block px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                            >
                              B2B Registration
                            </Link>
                            <Link
                              to="/register/vendor"
                              className="block px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                            >
                              Vendor Registration
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              to="/account"
                              className="block px-3 py-2 text-sm font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition-colors"
                            >
                              My Account
                            </Link>
                            <Link
                              to="/orders"
                              className="block px-3 py-2 text-sm font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition-colors"
                            >
                              Orders
                            </Link>
                            {isVendor && (
                              <Link
                                to="/vendor/dashboard"
                                className="block px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
                              >
                                Vendor Portal
                              </Link>
                            )}
                            {isB2B && (
                              <Link
                                to="/b2b/catalog"
                                className="block px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                              >
                                B2B Catalog
                              </Link>
                            )}
                            <button
                              onClick={() => { logout(); navigate('/'); }}
                              className="w-full text-left px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Sign Out
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-1 rounded-full border border-[color:var(--sattva-border)] bg-[var(--sattva-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition"
              >
                <ShoppingBag size={13} /> Cart
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--sattva-forest)] px-1 text-[9px] font-black text-[var(--sattva-cream)]"
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </motion.span>
                )}
              </motion.button>
            </div>

            {/* Mobile icon buttons */}
            <div className="flex lg:hidden items-center gap-0.5 flex-shrink-0">
              <ThemeToggle className="mr-0.5" />
              <motion.button
                data-testid="header-search-button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-xl hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)]"
                aria-label="Search"
              >
                <Search size={19} strokeWidth={2} />
              </motion.button>

              {user && (
                <Link to="/account">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    className="p-2 rounded-xl hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)]"
                    aria-label="Wishlist"
                  >
                    <Heart size={19} strokeWidth={2} />
                  </motion.button>
                </Link>
              )}

              <Link to={user ? '/account' : '/login'}>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  className="p-2 rounded-xl hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)]"
                  aria-label="Account"
                >
                  <User size={19} strokeWidth={2} />
                </motion.button>
              </Link>

              <motion.button
                data-testid="header-cart-button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setCartOpen(true)}
                className="relative p-2 rounded-xl hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)]"
                aria-label="Cart"
              >
                <ShoppingBag size={19} strokeWidth={2} />
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0.5 right-0.5 w-[16px] h-[16px] bg-[var(--sattva-forest)] text-[var(--sattva-cream)] text-[8px] font-black rounded-full flex items-center justify-center"
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </motion.span>
                )}
              </motion.button>

              <button
                className="p-2 rounded-xl hover:bg-[var(--sattva-muted)] transition-colors ml-0.5"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                <AnimatePresence mode="wait">
                  {mobileOpen
                    ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X size={20} /></motion.div>
                    : <motion.div key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu size={20} /></motion.div>
                  }
                </AnimatePresence>
              </button>
            </div>
          </div>

          {/* ── Desktop nav row ── */}
          <div className="hidden lg:flex items-center border-t border-[color:var(--sattva-border)]">
            <nav className="flex items-center gap-0 whitespace-nowrap py-0.5">
              <Link to="/" className="px-2 py-1.5 text-xs font-semibold text-[var(--sattva-ink)] hover:text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)] rounded-lg transition-colors flex-shrink-0">
                Home
              </Link>

              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => handleMenuEnter('Shop By Category')}
                onMouseLeave={handleMenuLeave}
              >
                <button
                  className={`flex items-center gap-1 px-2 py-1.5 text-xs font-semibold transition-colors rounded-lg ${
                    openMenu === 'Shop By Category'
                      ? 'text-[var(--sattva-forest)] bg-[var(--sattva-muted)]'
                      : 'text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)]'
                  }`}
                >
                  Shop By Category
                  <ChevronDown size={10} className={`transition-transform duration-200 ${openMenu === 'Shop By Category' ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openMenu === 'Shop By Category' && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className="absolute top-full left-0 mt-1 w-[360px] bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl shadow-[var(--shadow-lg)] z-50 overflow-hidden py-4"
                    >
                      <div className="grid grid-cols-2 gap-2 px-4">
                        {TOP_CATEGORIES.map((cat) => (
                          <Link
                            key={cat.label}
                            to={cat.href}
                            className="block rounded-xl px-3 py-2 text-sm text-gray-600 hover:text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)] transition-colors"
                          >
                            {cat.label}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {TOP_CATEGORIES.map((cat) => (
                <div
                  key={cat.label}
                  className="relative flex-shrink-0"
                  onMouseEnter={() => handleMenuEnter(cat.label)}
                  onMouseLeave={handleMenuLeave}
                >
                  <Link
                    to={cat.href}
                    className={`flex items-center gap-1 px-2 py-1.5 text-xs font-semibold transition-colors rounded-lg whitespace-nowrap ${
                      openMenu === cat.label
                        ? 'text-[var(--sattva-forest)] bg-[var(--sattva-muted)]'
                        : 'text-[var(--sattva-ink)] hover:text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)]'
                    }`}
                  >
                    {cat.label}
                    <ChevronDown size={10} className={`transition-transform duration-200 ${openMenu === cat.label ? 'rotate-180' : ''}`} />
                  </Link>
                  <AnimatePresence>
                    {openMenu === cat.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        className="absolute top-full left-0 mt-1 w-56 bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl shadow-[var(--shadow-lg)] z-50 overflow-hidden py-2"
                      >
                        <div className="px-3 py-2 border-b border-[color:var(--sattva-border)] mb-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--sattva-gold-deep)]">{cat.label}</p>
                        </div>
                        {cat.sub.map((sub) => (
                          <Link
                            key={sub.label}
                            to={sub.href}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)] font-medium transition-colors"
                          >
                            <span className="w-1 h-1 rounded-full bg-[var(--sattva-gold)] flex-shrink-0" />
                            {sub.label}
                          </Link>
                        ))}
                        <div className="px-4 pt-2 pb-1 border-t border-[color:var(--sattva-border)] mt-1">
                          <Link to={cat.href} className="text-xs font-bold text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)] flex items-center gap-1">
                            View All <ArrowRight size={11} />
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {SimpleNavLinks.map(link => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="px-2 py-1.5 text-xs font-semibold text-[var(--sattva-ink)] hover:text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)] rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

            </div>{/* end right side stacked rows */}
          </div>{/* end flex items-stretch */}
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
              <div className="px-4 py-4 space-y-1 max-h-[75vh] overflow-y-auto">
                <Link to="/" className="block px-3 py-2.5 text-sm font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] rounded-xl transition-colors">🏠 Home</Link>
                <div className="border-t border-[color:var(--sattva-border)] my-2" />
                <p className="eyebrow text-gray-400 px-3 py-2">Categories</p>
                {TOP_CATEGORIES.map(cat => (
                  <Link key={cat.label} to={cat.href}
                    className="block px-3 py-2.5 text-sm font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] rounded-xl transition-colors">
                    {cat.icon} {cat.label}
                  </Link>
                ))}
                <div className="border-t border-[color:var(--sattva-border)] my-2" />
                <p className="eyebrow text-gray-400 px-3 py-2">More</p>
                <div className="border-t border-[color:var(--sattva-border)] my-3" />
                {user ? (
                  <>
                    <Link to="/account" className="block px-3 py-2.5 text-sm font-semibold text-[var(--sattva-forest)] hover:bg-green-50 rounded-xl transition-colors">My Account</Link>
                    {isAdmin && <Link to="/admin" className="block px-3 py-2.5 text-sm font-semibold text-[var(--sattva-forest)] hover:bg-green-50 rounded-xl transition-colors">Admin Panel</Link>}
                    {isVendor && <Link to="/vendor/dashboard" className="block px-3 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors">Vendor Portal</Link>}
                    {isB2B && <Link to="/b2b/catalog" className="block px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 rounded-xl transition-colors">B2B Catalog</Link>}
                    <button onClick={() => { logout(); navigate('/'); }} className="w-full text-left px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors">Sign Out</button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block px-3 py-2.5 text-sm font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] rounded-xl transition-colors">Sign In</Link>
                    <Link to="/register" className="block px-3 py-2.5 text-sm font-semibold text-[var(--sattva-forest)] hover:bg-green-50 rounded-xl transition-colors">Create Account</Link>
                    <Link to="/register/b2b" className="block px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 rounded-xl transition-colors">B2B Registration</Link>
                    <Link to="/register/vendor" className="block px-3 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors">Vendor Registration</Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <CartDrawer />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Header;