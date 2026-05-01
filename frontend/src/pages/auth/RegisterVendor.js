import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Store, Landmark, ShieldCheck, UserCircle2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import Layout from '../../components/layout/Layout';
import { RoleSwitcher } from './Register';

const SectionHeader = ({ icon: Icon, title, subtitle }) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="mt-0.5 p-2 rounded-lg bg-[var(--sattva-muted)] text-[var(--sattva-forest)]">
      <Icon size={16} />
    </div>
    <div>
      <h3 className="font-heading text-sm font-semibold text-[var(--sattva-ink)]">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

const Field = ({ label, required, children, className = '', hint }) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {label} {required && <span className="text-[var(--sattva-danger)]">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

const inputCls = "w-full px-4 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)] transition-shadow";

const RegisterVendor = () => {
  const navigate = useNavigate();
  const { registerVendor } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const [form, setForm] = useState({
    // Account
    name: '', email: '', phone: '', password: '', confirm: '',
    // Business
    business_name: '', store_name: '', gstin: '', pan: '',
    // Bank
    account_holder_name: '', account_number: '', confirm_account_number: '',
    ifsc_code: '', bank_name: '', branch: '', account_type: 'CURRENT',
    // Identity
    identity_type: 'PAN', identity_number: '',
  });

  const f = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  const validate = () => {
    const required = [
      'name', 'email', 'phone', 'password', 'confirm',
      'business_name', 'store_name', 'gstin', 'pan',
      'account_holder_name', 'account_number', 'confirm_account_number',
      'ifsc_code', 'bank_name', 'branch', 'account_type',
      'identity_type', 'identity_number',
    ];
    for (const k of required) {
      if (!form[k] || !String(form[k]).trim()) {
        toast.error(`Please fill: ${k.replace(/_/g, ' ')}`);
        return false;
      }
    }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return false; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return false; }
    if (form.account_number !== form.confirm_account_number) { toast.error('Bank account numbers do not match'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        business_name: form.business_name,
        store_name: form.store_name,
        gstin: form.gstin.toUpperCase(),
        pan: form.pan.toUpperCase(),
        account_holder_name: form.account_holder_name,
        account_number: form.account_number,
        ifsc_code: form.ifsc_code.toUpperCase(),
        bank_name: form.bank_name,
        branch: form.branch,
        account_type: form.account_type,
        identity_type: form.identity_type,
        identity_number: form.identity_number.toUpperCase(),
      };
      const data = await registerVendor(payload);
      setSubmitted(data);
      toast.success('Vendor registration submitted! Awaiting admin approval.');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === 'object' ? (detail?.message || 'Registration failed') : (detail || 'Registration failed');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <Layout noFooter>
        <div className="min-h-[calc(100vh-72px)] flex items-center justify-center py-12 px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
            <div className="card-sattva p-8 text-center" data-testid="vendor-registration-success">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 text-amber-600 mb-4">
                <Sparkles size={26} />
              </div>
              <h2 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)] mb-2">Application submitted</h2>
              <p className="text-sm text-gray-600 mb-5">
                Welcome to Dr MediScie Marketplace, <span className="font-semibold">{submitted.store_name}</span>. Your vendor application is with our admin team for review.
              </p>
              <div className="rounded-xl bg-[var(--sattva-muted)] p-4 text-left text-sm space-y-2 mb-6">
                <div className="flex items-start gap-2"><CheckCircle2 size={16} className="text-[var(--sattva-forest)] mt-0.5" /><span>We verify your <strong>GSTIN</strong>, <strong>PAN</strong>, and bank details.</span></div>
                <div className="flex items-start gap-2"><CheckCircle2 size={16} className="text-[var(--sattva-forest)] mt-0.5" /><span>Once approved, you can manage your products and view analytics.</span></div>
                <div className="flex items-start gap-2"><CheckCircle2 size={16} className="text-[var(--sattva-forest)] mt-0.5" /><span>All payments are processed by Dr MediScie; payouts settled by admin.</span></div>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => navigate('/login')} className="btn-primary px-6 py-2.5" data-testid="vendor-success-goto-login">Go to Sign In</button>
                <button onClick={() => navigate('/')} className="btn-outlined px-6 py-2.5">Browse Store</button>
              </div>
              <p className="text-xs text-gray-400 mt-4">Vendor ID: <span className="font-mono">{submitted.vendor_id}</span> · Store: {submitted.store_slug}</p>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout noFooter>
      <div className="min-h-[calc(100vh-72px)] flex items-center justify-center py-12 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
          <div className="text-center mb-6">
            <img src="https://customer-assets.emergentagent.com/job_ecom-dashboard-pro-1/artifacts/hnj1kpk1_image.png" alt="Dr MediScie" className="h-14 w-auto mx-auto mb-3" />
            <h1 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)]">Become a Vendor</h1>
            <p className="text-sm text-gray-500 mt-1">Sell on Dr MediScie — reach approved B2B buyers across India. Approval in 2–5 business days.</p>
          </div>

          <RoleSwitcher active="vendor" />

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="vendor-register-form">
            {/* Account */}
            <div className="card-sattva p-6">
              <SectionHeader icon={UserCircle2} title="Account" subtitle="Your login credentials" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name" required><input data-testid="vendor-name" {...f('name')} className={inputCls} placeholder="Priya Sharma" /></Field>
                <Field label="Phone" required><input data-testid="vendor-phone" type="tel" {...f('phone')} className={inputCls} placeholder="10-digit mobile" /></Field>
                <Field label="Email" required className="md:col-span-2"><input data-testid="vendor-email" type="email" {...f('email')} className={inputCls} placeholder="you@brand.com" /></Field>
                <Field label="Password" required>
                  <div className="relative">
                    <input data-testid="vendor-password" type={showPwd ? 'text' : 'password'} {...f('password')} className={`${inputCls} pr-10`} placeholder="Min 6 characters" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </Field>
                <Field label="Confirm Password" required><input data-testid="vendor-confirm" type={showPwd ? 'text' : 'password'} {...f('confirm')} className={inputCls} placeholder="Repeat password" /></Field>
              </div>
            </div>

            {/* Business */}
            <div className="card-sattva p-6">
              <SectionHeader icon={Store} title="Business & Store" subtitle="Storefront identity & tax info" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Registered Business Name" required><input data-testid="vendor-business-name" {...f('business_name')} className={inputCls} placeholder="Ayur Naturals Pvt Ltd" /></Field>
                <Field label="Store Name" required hint="Shown to customers"><input data-testid="vendor-store-name" {...f('store_name')} className={inputCls} placeholder="Ayur Naturals" /></Field>
                <Field label="GSTIN" required hint="15-character GSTIN"><input data-testid="vendor-gstin" {...f('gstin')} className={`${inputCls} uppercase tracking-wider`} placeholder="29AAACA1234B1Z7" maxLength={15} /></Field>
                <Field label="PAN" required hint="10-character PAN"><input data-testid="vendor-pan" {...f('pan')} className={`${inputCls} uppercase tracking-wider`} placeholder="AAACA1234B" maxLength={10} /></Field>
              </div>
            </div>

            {/* Bank */}
            <div className="card-sattva p-6">
              <SectionHeader icon={Landmark} title="Bank Details" subtitle="Used exclusively for vendor payouts by admin" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Account Holder Name" required className="md:col-span-2"><input data-testid="vendor-acc-holder" {...f('account_holder_name')} className={inputCls} placeholder="Matches bank records" /></Field>
                <Field label="Account Number" required><input data-testid="vendor-acc-number" type="text" inputMode="numeric" {...f('account_number')} className={inputCls} placeholder="e.g. 123456789012" /></Field>
                <Field label="Confirm Account Number" required><input data-testid="vendor-acc-number-confirm" type="text" inputMode="numeric" {...f('confirm_account_number')} className={inputCls} placeholder="Re-enter account number" /></Field>
                <Field label="IFSC Code" required><input data-testid="vendor-ifsc" {...f('ifsc_code')} className={`${inputCls} uppercase tracking-wider`} placeholder="HDFC0000123" maxLength={11} /></Field>
                <Field label="Account Type" required>
                  <select data-testid="vendor-acc-type" {...f('account_type')} className={inputCls}>
                    <option value="CURRENT">Current</option>
                    <option value="SAVINGS">Savings</option>
                  </select>
                </Field>
                <Field label="Bank Name" required><input data-testid="vendor-bank-name" {...f('bank_name')} className={inputCls} placeholder="HDFC Bank" /></Field>
                <Field label="Branch" required><input data-testid="vendor-branch" {...f('branch')} className={inputCls} placeholder="Koramangala" /></Field>
              </div>
            </div>

            {/* Identity */}
            <div className="card-sattva p-6">
              <SectionHeader icon={ShieldCheck} title="Identity Proof" subtitle="Used for KYC verification" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Document Type" required>
                  <select data-testid="vendor-id-type" {...f('identity_type')} className={inputCls}>
                    <option value="PAN">PAN Card</option>
                    <option value="AADHAAR">Aadhaar</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                  </select>
                </Field>
                <Field label="Document Number" required><input data-testid="vendor-id-number" {...f('identity_number')} className={`${inputCls} uppercase tracking-wider`} placeholder="As on document" /></Field>
                <Field label="Document Upload" className="md:col-span-2" hint="Secure uploads will be available after admin approval.">
                  <div className="w-full px-4 py-3 text-xs text-gray-400 border border-dashed border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-muted)]/50">
                    Available after approval
                  </div>
                </Field>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <p className="text-xs text-gray-500">By submitting, you agree to our vendor agreement, Terms and Privacy Policy.</p>
              <button
                data-testid="vendor-submit"
                type="submit"
                disabled={loading}
                className="btn-primary px-8 py-3 min-w-[220px]"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>

          <p className="text-center mt-6 text-sm text-gray-600">
            Already registered?{' '}
            <Link to="/login" className="text-[var(--sattva-forest)] font-semibold hover:text-[var(--sattva-gold)] transition-colors">Sign In</Link>
          </p>
        </motion.div>
      </div>
    </Layout>
  );
};

export default RegisterVendor;
