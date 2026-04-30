import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import Layout from '../../components/layout/Layout';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate(redirect);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-[var(--sattva-forest)] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-[var(--sattva-gold)] font-bold text-lg">S</span>
            </div>
            <h1 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)]">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to your Sattva account</p>
          </div>

          <div className="card-sattva p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input
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
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-[rgba(250,248,245,0.4)] border-t-[var(--sattva-cream)] rounded-full animate-spin" />Signing in...</>
                ) : 'Sign In'}
              </button>

              {/* Admin hint */}
              <p className="text-xs text-center text-gray-400">Admin: admin@sattva.in / Admin@1234</p>
            </form>
          </div>

          <p className="text-center mt-4 text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-[var(--sattva-forest)] font-semibold hover:text-[var(--sattva-gold)] transition-colors">Create Account</Link>
          </p>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Login;
