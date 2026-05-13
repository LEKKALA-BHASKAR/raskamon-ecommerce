import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { TrackingProvider } from '@/context/TrackingContext';
import ConsentBanner from '@/components/retargeting/ConsentBanner';
import AbandonedCartPopup from '@/components/retargeting/AbandonedCartPopup';
import AdminRetargeting from '@/pages/admin/AdminRetargeting';
import SplashScreen from '@/components/ui/SplashScreen';
import ScrollToTop from '@/components/ui/ScrollToTop';

// Pages
import Home from '@/pages/Home';
import ProductListing from '@/pages/ProductListing';
import ProductDetail from '@/pages/ProductDetail';
import Checkout from '@/pages/Checkout';
import OrderSuccess from '@/pages/OrderSuccess';
import PaymentCallback from '@/pages/PaymentCallback';
import SearchResults from '@/pages/SearchResults';
import { Blog, BlogPost } from '@/pages/Blog';
import { About, Contact, FAQ, Privacy, Terms, Shipping } from '@/pages/StaticPages';
import AccountLayout from '@/pages/account/AccountLayout';
import AccountOrders from '@/pages/account/AccountOrders';
import AccountWishlist from '@/pages/account/AccountWishlist';
import AccountAddresses from '@/pages/account/AccountAddresses';
import AccountProfile from '@/pages/account/AccountProfile';
import AccountSecurity from '@/pages/account/AccountSecurity';

// Auth Pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import RegisterB2B from '@/pages/auth/RegisterB2B';
import RegisterVendor from '@/pages/auth/RegisterVendor';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// Admin Pages
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminApprovals from '@/pages/admin/AdminApprovals';
import AdminProducts from '@/pages/admin/AdminProducts';
import AdminProductForm from '@/pages/admin/AdminProductForm';
import AdminOrders from '@/pages/admin/AdminOrders';
import AdminCustomers from '@/pages/admin/AdminCustomers';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminCoupons from '@/pages/admin/AdminCoupons';
import AdminBanners from '@/pages/admin/AdminBanners';
import AdminReviews from '@/pages/admin/AdminReviews';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminBlog from '@/pages/admin/AdminBlog';
import AdminSettings from '@/pages/admin/AdminSettings';
import AdminPayouts from '@/pages/admin/AdminPayouts';
import AdminPayments from '@/pages/admin/AdminPayments';
import AdminVendorProducts from '@/pages/admin/AdminVendorProducts';
import AdminSocialVideos from '@/pages/admin/AdminSocialVideos';
import AdminSocialFeed from '@/pages/admin/AdminSocialFeed';
import AdminHomeContent from '@/pages/admin/AdminHomeContent';
import AdminNavigation from '@/pages/admin/AdminNavigation';
import AdminWallet from '@/pages/admin/AdminWallet';
import WalletDashboard from '@/pages/account/WalletDashboard';

// Vendor Portal Pages
import VendorLayout from '@/pages/vendor/VendorLayout';
import VendorDashboard from '@/pages/vendor/VendorDashboard';
import VendorProducts from '@/pages/vendor/VendorProducts';
import VendorProductForm from '@/pages/vendor/VendorProductForm';
import VendorOrders from '@/pages/vendor/VendorOrders';
import VendorAnalytics from '@/pages/vendor/VendorAnalytics';
import VendorPayouts from '@/pages/vendor/VendorPayouts';

// B2B Pages
import B2BCatalog from '@/pages/b2b/B2BCatalog';
import B2BDashboard from '@/pages/b2b/B2BDashboard';
import B2BProductDetail from '@/pages/b2b/B2BProductDetail';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <ScrollToTop />
          <TrackingProvider>
          <ConsentBanner />
          <AbandonedCartPopup />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<ProductListing />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/category/:categorySlug" element={<ProductListing />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/returns" element={<Shipping />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/b2b" element={<RegisterB2B />} />
            <Route path="/register/vendor" element={<RegisterVendor />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Protected User Routes — Account */}
            <Route path="/account" element={<AccountLayout />}>
              <Route index element={<Navigate to="/account/orders" replace />} />
              <Route path="orders" element={<AccountOrders />} />
              <Route path="wishlist" element={<AccountWishlist />} />
              <Route path="addresses" element={<AccountAddresses />} />
              <Route path="profile" element={<AccountProfile />} />
              <Route path="security" element={<AccountSecurity />} />
            </Route>
            {/* Wallet has its own Layout wrapper so stays standalone */}
            <Route path="/account/wallet" element={<WalletDashboard />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/payment/callback" element={<PaymentCallback />} />
            <Route path="/order-success/:orderId" element={<OrderSuccess />} />

            {/* ====== B2B MARKETPLACE ====== */}
            <Route path="/b2b/catalog" element={<B2BCatalog />} />
            <Route path="/b2b/dashboard" element={<B2BDashboard />} />
            <Route path="/b2b/products/:slug" element={<B2BProductDetail />} />

            {/* ====== VENDOR PORTAL ====== */}
            <Route path="/vendor" element={<VendorLayout />}>
              <Route index element={<Navigate to="/vendor/dashboard" replace />} />
              <Route path="dashboard" element={<VendorDashboard />} />
              <Route path="products" element={<VendorProducts />} />
              <Route path="products/new" element={<VendorProductForm />} />
              <Route path="products/edit/:id" element={<VendorProductForm />} />
              <Route path="orders" element={<VendorOrders />} />
              <Route path="analytics" element={<VendorAnalytics />} />
              <Route path="payouts" element={<VendorPayouts />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="approvals" element={<AdminApprovals />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/new" element={<AdminProductForm />} />
              <Route path="products/edit/:id" element={<AdminProductForm />} />
              <Route path="vendor-products" element={<AdminVendorProducts />} />
              <Route path="payouts" element={<AdminPayouts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="banners" element={<AdminBanners />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="blog" element={<AdminBlog />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="social-videos" element={<AdminSocialVideos />} />
              <Route path="social-feed" element={<AdminSocialFeed />} />
              <Route path="home-content" element={<AdminHomeContent />} />
              <Route path="navigation" element={<AdminNavigation />} />
              <Route path="wallet" element={<AdminWallet />} />
              <Route path="retargeting" element={<AdminRetargeting />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
          </TrackingProvider>
        </BrowserRouter>
      </CartProvider>
      <SplashScreen visible={showSplash} />
    </AuthProvider>
  );
}

export default App;
