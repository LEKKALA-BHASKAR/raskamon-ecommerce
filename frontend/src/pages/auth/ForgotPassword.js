import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../utils/api';
import { toast } from 'sonner';
import Layout from '../../components/layout/Layout';

const ForgotPassword = () => {
  const [step, setStep] = useState('email'); // email | otp | reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setDevOtp(res.data.dev_otp || ''); // Dev only
      setStep('otp');
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error sending OTP');
    } finally { setLoading(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, new_password: newPassword });
      toast.success('Password reset! You can now login.');
      setStep('done');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error resetting password');
    } finally { setLoading(false); }
  };

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center py-12 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-heading text-2xl font-semibold">Reset Password</h1>
            <p className="text-gray-500 text-sm mt-1">We'll send an OTP to your registered email</p>
          </div>

          <div className="card-sattva p-8">
            {step === 'done' ? (
              <div className="text-center">
                <p className="text-green-600 font-medium mb-4">Password reset successfully!</p>
                <Link to="/login" className="btn-primary px-8 py-3 inline-block">Sign In</Link>
              </div>
            ) : step === 'email' ? (
              <form onSubmit={sendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com"
                    className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={resetPassword} className="space-y-4">
                {devOtp && <p className="text-xs bg-amber-50 text-amber-700 p-2 rounded-lg">Dev OTP: <strong>{devOtp}</strong></p>}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">OTP</label>
                  <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} required placeholder="6-digit OTP"
                    className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Min 6 characters"
                    className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
                  />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}
          </div>

          <p className="text-center mt-4 text-sm">
            <Link to="/login" className="text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)]">Back to Login</Link>
          </p>
        </motion.div>
      </div>
    </Layout>
  );
};

export default ForgotPassword;
