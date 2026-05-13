import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, Clock, Smartphone, Mail, Shield, X } from 'lucide-react';
import { useAuth, normalizeRole } from '../../context/AuthContext';
import { toast } from 'sonner';
import Layout from '../../components/layout/Layout';
import BrandLogo from '../../components/brand/BrandLogo';

const inp = 'w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] text-[var(--sattva-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)] transition-shadow';

// ── Google sign-in button ──────────────────────────────────────────────
const GoogleButton = ({ onClick, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled}
    className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-semibold border border-[color:var(--sattva-border)] rounded-xl hover:bg-[var(--sattva-muted)] transition-colors disabled:opacity-50">
    <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
    Continue with Google
  </button>
);

// ── 2FA Verification modal ─────────────────────────────────────────────
const TwoFAModal = ({ email, password, onSuccess, onCancel }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWith2FA } = useAuth();

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length < 6) { toast.error('Enter a 6-digit code'); return; }
    setLoading(true);
    try {
      const userData = await loginWith2FA(email, password, code);
      onSuccess(userData);
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || 'Invalid 2FA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--sattva-surface)] rounded-2xl shadow-2xl border border-[color:var(--sattva-border)] w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-[var(--sattva-forest)]" />
            <h3 className="font-heading text-lg font-bold text-[var(--sattva-ink)]">Two-Factor Auth</h3>
          </div>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-[var(--sattva-muted)]"><X size={16} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Enter the 6-digit code from your authenticator app or a backup code.</p>
        <form onSubmit={handleVerify} className="space-y-4">
          <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))} autoFocus
            placeholder="000000" maxLength={8}
            className={`${inp} text-center text-xl font-mono tracking-[0.3em]`}
          />
          <button type="submit" disabled={loading} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</> : 'Verify & Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// ── Main Login Component ───────────────────────────────────────────────
const Login = () => {
  const [tab, setTab] = useState('email'); // email | mobile
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gateError, setGateError] = useState(null);
  const [show2FA, setShow2FA] = useState(false);
  const { login, loginWithGoogle, sendMobileOTP, verifyMobileOTP } = useAuth();
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

  const onLoginSuccess = (userData) => {
    toast.success('Welcome back!');
    navigate(redirect || roleLandingPath(userData?.role));
  };

  // ── Email/password login ──
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGateError(null);
    try {
      const res = await login(email, password);
      // Check if 2FA required — login() returns the response data
      if (res?.requires_2fa) {
        setShow2FA(true);
        return;
      }
      onLoginSuccess(res);
    } catch (err) {
      // Check for 2FA response in the error/response
      if (err?.response?.data?.requires_2fa) {
        setShow2FA(true);
        return;
      }
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

  // ── Mobile OTP ──
  const handleSendOTP = async () => {
    if (phone.length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return; }
    setLoading(true);
    try {
      const res = await sendMobileOTP(phone);
      setOtpSent(true);
      toast.success('OTP sent to your mobile');
      if (res?.dev_otp) setOtp(res.dev_otp); // Auto-fill in dev
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await verifyMobileOTP(phone, otp);
      onLoginSuccess(data.user);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  // ── Google OAuth ──
  const handleGoogleLogin = async () => {
    // Load Google Identity Services if not loaded
    if (!window.google?.accounts) {
      toast.error('Google Sign-In is not available. Please try again.');
      return;
    }
    window.google.accounts.id.prompt();
  };

  // Initialize Google Identity Services
  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      window.google?.accounts?.id?.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const userData = await loginWithGoogle(response.credential);
            onLoginSuccess(userData);
          } catch (err) {
            toast.error(err?.response?.data?.detail || 'Google login failed');
          }
        },
      });
    };
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPending = gateError?.code?.endsWith('_NOT_APPROVED');

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center py-12 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <BrandLogo centered size="lg" />
            </div>
            <h1 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)]">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your Dr MediScie account</p>
          </div>

          {/* Gate error banner */}
          {gateError && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} data-testid="login-gate-banner"
              className={`mb-5 rounded-xl border p-4 flex gap-3 ${isPending ? 'bg-amber-50/70 border-amber-200 text-amber-900' : 'bg-red-50/70 border-red-200 text-red-800'}`}>
              <div className="pt-0.5">{isPending ? <Clock size={18} /> : <AlertCircle size={18} />}</div>
              <div className="text-sm leading-relaxed">
                <p className="font-semibold">{gateError.message}</p>
                {gateError.details && <p className="opacity-80 mt-1">{gateError.details}</p>}
                <p className="opacity-60 text-xs mt-2">Error code: {gateError.code}</p>
              </div>
            </motion.div>
          )}

          <div className="card-sattva p-8">
            {/* Login method tabs */}
            <div className="flex gap-1 mb-6 bg-[var(--sattva-muted)] p-1 rounded-xl">
              {[
                { id: 'email', label: 'Email', icon: Mail },
                { id: 'mobile', label: 'Mobile', icon: Smartphone },
              ].map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setGateError(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                    tab === t.id
                      ? 'bg-[var(--sattva-surface)] text-[var(--sattva-forest)] shadow-sm'
                      : 'text-gray-500 hover:text-[var(--sattva-ink)]'
                  }`}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {tab === 'email' ? (
                <motion.form key="email" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                    <input data-testid="login-email-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="you@example.com" className={inp} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Password</label>
                      <Link to="/forgot-password" className="text-xs text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)] transition-colors">Forgot password?</Link>
                    </div>
                    <div className="relative">
                      <input data-testid="login-password-input" type={showPwd ? 'text' : 'password'} value={password}
                        onChange={e => setPassword(e.target.value)} required placeholder="Your password"
                        className={`${inp} pr-10`} />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button data-testid="login-submit-btn" type="submit" disabled={loading}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-2">
                    {loading ? <><span className="w-4 h-4 border-2 border-[rgba(250,248,245,0.4)] border-t-[var(--sattva-cream)] rounded-full animate-spin" />Signing in...</> : 'Sign In'}
                  </button>
                </motion.form>
              ) : (
                <motion.div key="mobile" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  {!otpSent ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mobile Number</label>
                        <div className="flex gap-2">
                          <span className="flex items-center px-3 text-sm font-semibold text-gray-500 border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-muted)]">+91</span>
                          <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="10-digit number" className={`flex-1 ${inp}`} />
                        </div>
                      </div>
                      <button onClick={handleSendOTP} disabled={loading || phone.length !== 10}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</> : 'Send OTP'}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                      <p className="text-sm text-gray-500">OTP sent to <strong>+91 {phone}</strong>
                        <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="text-[var(--sattva-forest)] text-xs ml-2 underline">Change</button>
                      </p>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Enter OTP</label>
                        <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="6-digit OTP" maxLength={6} autoFocus
                          className={`${inp} text-center text-lg font-mono tracking-[0.3em]`} />
                      </div>
                      <button type="submit" disabled={loading || otp.length < 6}
                        className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</> : 'Verify & Sign In'}
                      </button>
                      <button type="button" onClick={handleSendOTP} disabled={loading}
                        className="w-full text-xs text-[var(--sattva-forest)] font-semibold hover:text-[var(--sattva-gold)]">Resend OTP</button>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-[var(--sattva-border)]" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-[var(--sattva-border)]" />
            </div>

            {/* Google sign-in */}
            <GoogleButton onClick={handleGoogleLogin} disabled={loading} />
          </div>

          <div className="mt-4 text-center text-sm text-gray-600 space-y-1.5">
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="text-[var(--sattva-forest)] font-semibold hover:text-[var(--sattva-gold)] transition-colors">Create Account</Link>
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

      {/* 2FA Modal */}
      {show2FA && (
        <TwoFAModal email={email} password={password} onSuccess={onLoginSuccess} onCancel={() => setShow2FA(false)} />
      )}
    </Layout>
  );
};

export default Login;
