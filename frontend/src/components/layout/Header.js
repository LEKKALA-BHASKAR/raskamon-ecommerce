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

const MEGA_MENU = [
  // Removed 'B2B & Partners' section
];

const FALLBACK_SIMPLE_LINKS = [
  { label: 'Blog', href: '/blog' },
  { label: 'About Us', href: '/about' },
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
          <motion.div
            animate={{ height: scrolled ? '60px' : '72px' }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-8"
          >
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center">
              <BrandLogo size={scrolled ? 'sm' : 'md'} />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-0.5 flex-1">
              {/* Home link */}
              <Link to="/" className="px-3 py-2 text-sm font-semibold text-[var(--sattva-ink)] hover:text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)] rounded-lg transition-colors flex-shrink-0">
                Home
              </Link>

              {/* Category dropdowns */}
              {TOP_CATEGORIES.map((cat) => (
                <div
                  key={cat.label}
                  className="relative flex-shrink-0"
                  onMouseEnter={() => handleMenuEnter(cat.label)}
                  onMouseLeave={handleMenuLeave}
                >
                  <Link
                    to={cat.href}
                    className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold transition-colors rounded-lg whitespace-nowrap ${
                      openMenu === cat.label
                        ? 'text-[var(--sattva-forest)] bg-[var(--sattva-muted)]'
                        : 'text-[var(--sattva-ink)] hover:text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)]'
                    }`}
                  >
                    {cat.label}
                    <ChevronDown size={12} className={`transition-transform duration-200 ${openMenu === cat.label ? 'rotate-180' : ''}`} />
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

              {/* Mega menus */}
              {MEGA_MENU.map((menu) => (
                <div
                  key={menu.label}
                  className="relative flex-shrink-0"
                  onMouseEnter={() => handleMenuEnter(menu.label)}
                  onMouseLeave={handleMenuLeave}
                >
                  <button className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold transition-colors rounded-lg ${
                    openMenu === menu.label
                      ? 'text-[var(--sattva-forest)] bg-[var(--sattva-muted)]'
                      : 'text-[var(--sattva-ink)] hover:text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)]'
                  }`}>
                    {menu.label}
                    <ChevronDown size={12} className={`transition-transform duration-200 ${openMenu === menu.label ? 'rotate-180' : ''}`} />
                  </button>
                  <MegaMenuDropdown menu={menu} visible={openMenu === menu.label} />
                </div>
              ))}

              {/* Simple links */}
              {SimpleNavLinks.map(link => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="px-3 py-2 text-sm font-semibold text-[var(--sattva-ink)] hover:text-[var(--sattva-forest)] hover:bg-[var(--sattva-muted)] rounded-lg transition-colors flex-shrink-0 whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}

              {/* B2B/Vendor quick links if logged in */}
              {isB2B && (
                <Link to="/b2b/catalog" className="ml-1 px-3 py-1.5 text-xs font-bold text-[var(--sattva-forest)] bg-green-50 border border-green-200 rounded-full hover:bg-green-100 transition-colors">
                  B2B Catalog
                </Link>
              )}
              {isVendor && (
                <Link to="/vendor/dashboard" className="ml-1 px-3 py-1.5 text-xs font-bold text-[var(--sattva-forest)] bg-amber-50 border border-amber-200 rounded-full hover:bg-amber-100 transition-colors">
                  Vendor Portal
                </Link>
              )}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-0.5 ml-auto">
              {/* Search */}
              <motion.button
                data-testid="header-search-button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setSearchOpen(true)}
                className="p-2.5 rounded-xl hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)]"
                aria-label="Search"
              >
                <Search size={19} strokeWidth={2} />
              </motion.button>

              {/* Wishlist */}
              {user && (
                <Link to="/account">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    className="hidden sm:flex p-2.5 rounded-xl hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)]"
                    aria-label="Wishlist"
                  >
                    <Heart size={19} strokeWidth={2} />
                  </motion.button>
                </Link>
              )}

              {/* Account dropdown */}
              <div className="relative group">
                <motion.button
                  data-testid="header-account-button"
                  whileTap={{ scale: 0.92 }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)]"
                >
                  {user ? (
                    <div className="w-7 h-7 rounded-full bg-[var(--sattva-forest)] text-[var(--sattva-cream)] flex items-center justify-center text-xs font-bold">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                  ) : (
                    <User size={19} strokeWidth={2} />
                  )}
                  {user && <span className="hidden sm:block text-xs font-semibold max-w-[70px] truncate">{user.name?.split(' ')[0]}</span>}
                </motion.button>

                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--sattva-surface)] border border-[color:var(--sattva-border)] rounded-2xl shadow-[var(--shadow-lg)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                  {user ? (
                    <>
                      <div className="px-4 py-3 border-b border-[color:var(--sattva-border)] bg-[var(--sattva-muted)]">
                        <p className="text-sm font-bold text-[var(--sattva-ink)] truncate">{user.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-[var(--sattva-forest)] text-[var(--sattva-cream)]">
                          {canonicalRole.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="py-1.5">
                        <Link to="/account" className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition-colors">
                          <Package size={14} /> My Account
                        </Link>
                        {isAdmin && (
                          <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--sattva-forest)] font-semibold hover:bg-green-50 transition-colors">
                            <LayoutDashboard size={14} /> Admin Panel
                          </Link>
                        )}
                        {isVendor && (
                          <Link to="/vendor/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-amber-700 font-semibold hover:bg-amber-50 transition-colors">
                            <Store size={14} /> Vendor Portal
                          </Link>
                        )}
                        {isB2B && (
                          <Link to="/b2b/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-blue-700 font-semibold hover:bg-blue-50 transition-colors">
                            <Building2 size={14} /> B2B Dashboard
                          </Link>
                        )}
                        <button
                          onClick={() => { logout(); navigate('/'); }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={14} /> Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-2">
                      <Link to="/login" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] transition-colors">
                        <User size={14} /> Sign In
                      </Link>
                      <Link to="/register" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--sattva-forest)] hover:bg-green-50 transition-colors">
                        <Sparkles size={14} /> Create Account
                      </Link>
                      <div className="mx-3 my-2 pt-2 border-t border-[color:var(--sattva-border)]">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Business</p>
                        <Link to="/register/b2b" className="flex items-center gap-2 px-1 py-1.5 text-xs text-blue-700 hover:text-blue-900 font-medium transition-colors">
                          <Building2 size={12} /> B2B Registration
                        </Link>
                        <Link to="/register/vendor" className="flex items-center gap-2 px-1 py-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors">
                          <Store size={12} /> Vendor Registration
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cart */}
              <motion.button
                data-testid="header-cart-button"
                whileTap={{ scale: 0.92 }}
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-[var(--sattva-muted)] transition-colors text-[var(--sattva-ink)]"
                aria-label="Cart"
              >
                <ShoppingBag size={19} strokeWidth={2} />
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-[var(--sattva-forest)] text-[var(--sattva-cream)] text-[9px] font-black rounded-full flex items-center justify-center"
                  >
                    {itemCount > 9 ? '9+' : itemCount}
                  </motion.span>
                )}
              </motion.button>

              {/* Mobile hamburger */}
              <button
                className="lg:hidden p-2.5 rounded-xl hover:bg-[var(--sattva-muted)] transition-colors ml-1"
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
          </motion.div>
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
                {[{ l: '📝 Blog', h: '/blog' }, { l: 'ℹ️ About Us', h: '/about' }, { l: '📞 Contact', h: '/contact' }].map(({ l, h }) => (
                  <Link key={l} to={h} className="block px-3 py-2.5 text-sm font-semibold text-[var(--sattva-ink)] hover:bg-[var(--sattva-muted)] rounded-xl transition-colors">{l}</Link>
                ))}
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
