import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';
import { useAuth, normalizeRole } from '../../context/AuthContext';
import { toast } from 'sonner';
import Layout from '../../components/layout/Layout';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gateError, setGateError] = useState(null); // { code, message, details }
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || null;

  const roleLandingPath = (role) => {
    const canonical = normalizeRole(role);
    if (canonical === 'ADMIN' || canonical === 'SUB_ADMIN') return '/admin';
    if (canonical === 'VENDOR') return '/vendor/dashboard';
    if (canonical === 'B2B_BUYER') return '/b2b/dashboard';
    return '/';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGateError(null);
    try {
      const userData = await login(email, password);
      toast.success('Welcome back!');
      navigate(redirect || roleLandingPath(userData?.role));
    } catch (err) {
      const gateCodes = ['B2B_NOT_APPROVED', 'B2B_REJECTED', 'VENDOR_NOT_APPROVED', 'VENDOR_REJECTED', 'ACCOUNT_INACTIVE'];
      if (err?.code && gateCodes.includes(err.code)) {
        setGateError({ code: err.code, message: err.message, details: err.details });
      } else {
        const msg = err?.code ? err.message : (err?.response?.data?.detail || err?.message || 'Login failed');
        toast.error(typeof msg === 'string' ? msg : 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const isPending = gateError?.code?.endsWith('_NOT_APPROVED');

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <img
              src="https://customer-assets.emergentagent.com/job_ecom-dashboard-pro-1/artifacts/hnj1kpk1_image.png"
              alt="Dr MediScie Logo"
              className="h-16 w-auto mx-auto mb-4"
            />
            <h1 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)]">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your Dr MediScie account</p>
          </div>

          {gateError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              data-testid="login-gate-banner"
              className={`mb-5 rounded-xl border p-4 flex gap-3 ${
                isPending
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : 'bg-red-50/70 border-red-200 text-red-800'
              }`}
            >
              <div className="pt-0.5">
                {isPending ? <Clock size={18} /> : <AlertCircle size={18} />}
              </div>
              <div className="text-sm leading-relaxed">
                <p className="font-semibold">{gateError.message}</p>
                {gateError.details && (
                  <p className="opacity-80 mt-1">{gateError.details}</p>
                )}
                <p className="opacity-60 text-xs mt-2">Error code: {gateError.code}</p>
              </div>
            </motion.div>
          )}

          <div className="card-sattva p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input
                  data-testid="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)] transition-shadow"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                  <Link to="/forgot-password" className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)] transition-colors">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input
                    data-testid="login-password-input"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Your password"
                    className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)] transition-shadow pr-10"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                data-testid="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-[rgba(250,248,245,0.4)] border-t-[var(--sattva-cream)] rounded-full animate-spin" />Signing in...</>
                ) : 'Sign In'}
              </button>

              <p className="text-xs text-center text-gray-400">Admin: admin@sattva.in / admin@1234</p>
            </form>
          </div>

          <div className="mt-4 text-center text-sm text-gray-600 space-y-1.5">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="text-[var(--sattva-forest)] font-semibold hover:text-[var(--sattva-gold)] transition-colors">
                Create Account
              </Link>
            </p>
            <p className="text-xs text-gray-500">
              Business buyer?{' '}
              <Link to="/register/b2b" className="text-[var(--sattva-forest)] font-semibold">Register as B2B</Link>
              <span className="mx-1">·</span>
              Seller?{' '}
              <Link to="/register/vendor" className="text-[var(--sattva-forest)] font-semibold">Register as Vendor</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Login;
