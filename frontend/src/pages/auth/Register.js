import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import Layout from '../../components/layout/Layout';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.phone);
      toast.success('Account created! Welcome to Sattva.');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const f = (key) => ({ value: form[key], onChange: (e) => setForm(p => ({...p, [key]: e.target.value})) });

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center py-12 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_ecom-dashboard-pro-1/artifacts/hnj1kpk1_image.png" 
              alt="Dr MediScie Logo" 
              className="h-16 w-auto mx-auto mb-4"
            />
            <h1 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)]">Create your account</h1>
            <p className="text-gray-500 text-sm mt-1">Join thousands who trust Dr MediScie for wellness</p>
          </div>

          <div className="card-sattva p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {[{ key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name' }, { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' }, { key: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: '10-digit mobile' }].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{field.label}</label>
                  <input type={field.type} {...f(field.key)} placeholder={field.placeholder}
                    className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
                  />
                </div>
              ))}
              {['password', 'confirm'].map((key) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{key === 'password' ? 'Password' : 'Confirm Password'}</label>
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} {...f(key)} placeholder={key === 'password' ? 'Min 6 characters' : 'Repeat password'}
                      className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)] pr-10"
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={loading} className="w-full btn-primary py-3 mt-2">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </div>

          <p className="text-center mt-4 text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-[var(--sattva-forest)] font-semibold hover:text-[var(--sattva-gold)] transition-colors">Sign In</Link>
          </p>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Register;
