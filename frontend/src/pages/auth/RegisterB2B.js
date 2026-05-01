import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Briefcase, MapPin, UserCircle2, Sparkles, CheckCircle2 } from 'lucide-react';
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

const businessTypes = [
  { v: '', label: 'Select business type (optional)' },
  { v: 'DISTRIBUTOR', label: 'Distributor' },
  { v: 'RETAILER', label: 'Retailer' },
  { v: 'WHOLESALER', label: 'Wholesaler' },
  { v: 'MANUFACTURER', label: 'Manufacturer' },
  { v: 'OTHER', label: 'Other' },
];

const RegisterB2B = () => {
  const navigate = useNavigate();
  const { registerB2B } = useAuth();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(null); // submitted payload summary

  const [form, setForm] = useState({
    // Account
    name: '', email: '', phone: '', password: '', confirm: '',
    // Company
    company_name: '', gst_number: '', pan_number: '', business_type: '',
    annual_turnover: '', years_in_business: '',
    // Address
    business_street: '', business_city: '', business_state: '', business_pincode: '',
    // Contact
    contact_name: '', contact_designation: '', contact_phone: '', contact_email: '',
  });

  const f = (key) => ({
    value: form[key],
    onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  const validate = () => {
    const required = [
      'name', 'email', 'phone', 'password', 'confirm',
      'company_name', 'gst_number', 'pan_number',
      'business_street', 'business_city', 'business_state', 'business_pincode',
      'contact_name', 'contact_designation', 'contact_phone', 'contact_email',
    ];
    for (const k of required) {
      if (!form[k] || !String(form[k]).trim()) {
        toast.error(`Please fill: ${k.replace(/_/g, ' ')}`);
        return false;
      }
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return false;
    }
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
        company_name: form.company_name,
        gst_number: form.gst_number.toUpperCase(),
        pan_number: form.pan_number.toUpperCase(),
        business_street: form.business_street,
        business_city: form.business_city,
        business_state: form.business_state,
        business_pincode: form.business_pincode,
        contact_name: form.contact_name,
        contact_designation: form.contact_designation,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        business_type: form.business_type || null,
        annual_turnover: form.annual_turnover ? Number(form.annual_turnover) : null,
        years_in_business: form.years_in_business ? Number(form.years_in_business) : null,
      };
      const data = await registerB2B(payload);
      setSubmitted(data);
      toast.success('Registration submitted! Awaiting admin approval.');
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
            <div className="card-sattva p-8 text-center" data-testid="b2b-registration-success">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 text-amber-600 mb-4">
                <Sparkles size={26} />
              </div>
              <h2 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)] mb-2">Registration submitted</h2>
              <p className="text-sm text-gray-600 mb-5">
                Thanks, <span className="font-semibold">{submitted.company_name}</span>. Your B2B application is now in the admin's queue for review.
              </p>
              <div className="rounded-xl bg-[var(--sattva-muted)] p-4 text-left text-sm space-y-2 mb-6">
                <div className="flex items-start gap-2"><CheckCircle2 size={16} className="text-[var(--sattva-forest)] mt-0.5" /><span>Our team verifies your <strong>GST</strong> & <strong>PAN</strong> details.</span></div>
                <div className="flex items-start gap-2"><CheckCircle2 size={16} className="text-[var(--sattva-forest)] mt-0.5" /><span>You'll receive access once approved. You can sign in now to check status.</span></div>
                <div className="flex items-start gap-2"><CheckCircle2 size={16} className="text-[var(--sattva-forest)] mt-0.5" /><span>Upload supporting business documents after approval.</span></div>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => navigate('/login')} className="btn-primary px-6 py-2.5" data-testid="b2b-success-goto-login">Go to Sign In</button>
                <button onClick={() => navigate('/')} className="btn-outlined px-6 py-2.5">Browse Store</button>
              </div>
              <p className="text-xs text-gray-400 mt-4">Reference ID: {submitted.user_id}</p>
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
            <h1 className="font-heading text-2xl font-semibold text-[var(--sattva-ink)]">Business Buyer Registration</h1>
            <p className="text-sm text-gray-500 mt-1">Unlock wholesale pricing and bulk ordering. Approval usually within 24–48 hours.</p>
          </div>

          <RoleSwitcher active="b2b" />

          <form onSubmit={handleSubmit} className="space-y-5" data-testid="b2b-register-form">
            {/* Account */}
            <div className="card-sattva p-6">
              <SectionHeader icon={UserCircle2} title="Account" subtitle="Your login credentials" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name" required><input data-testid="b2b-name" type="text" {...f('name')} className={inputCls} placeholder="Rahul Gupta" /></Field>
                <Field label="Phone" required><input data-testid="b2b-phone" type="tel" {...f('phone')} className={inputCls} placeholder="10-digit mobile" /></Field>
                <Field label="Email" required className="md:col-span-2"><input data-testid="b2b-email" type="email" {...f('email')} className={inputCls} placeholder="you@company.com" /></Field>
                <Field label="Password" required>
                  <div className="relative">
                    <input data-testid="b2b-password" type={showPwd ? 'text' : 'password'} {...f('password')} className={`${inputCls} pr-10`} placeholder="Min 6 characters" />
                    <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </Field>
                <Field label="Confirm Password" required><input data-testid="b2b-confirm" type={showPwd ? 'text' : 'password'} {...f('confirm')} className={inputCls} placeholder="Repeat password" /></Field>
              </div>
            </div>

            {/* Company */}
            <div className="card-sattva p-6">
              <SectionHeader icon={Briefcase} title="Company Information" subtitle="Business identification & tax details" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Company Name" required className="md:col-span-2"><input data-testid="b2b-company-name" {...f('company_name')} className={inputCls} placeholder="Acme Enterprises Pvt Ltd" /></Field>
                <Field label="GST Number" required hint="15-character GST identifier">
                  <input data-testid="b2b-gst" {...f('gst_number')} className={`${inputCls} uppercase tracking-wider`} placeholder="27AABCU9603R1ZX" maxLength={15} />
                </Field>
                <Field label="PAN Number" required hint="10-character PAN">
                  <input data-testid="b2b-pan" {...f('pan_number')} className={`${inputCls} uppercase tracking-wider`} placeholder="AABCU9603R" maxLength={10} />
                </Field>
                <Field label="Business Type">
                  <select data-testid="b2b-business-type" {...f('business_type')} className={inputCls}>
                    {businessTypes.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Annual Turnover (₹)" hint="Optional"><input data-testid="b2b-turnover" type="number" {...f('annual_turnover')} className={inputCls} placeholder="e.g. 5000000" /></Field>
                  <Field label="Years in Business" hint="Optional"><input data-testid="b2b-years" type="number" {...f('years_in_business')} className={inputCls} placeholder="e.g. 5" /></Field>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="card-sattva p-6">
              <SectionHeader icon={MapPin} title="Registered Business Address" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Street Address" required className="md:col-span-2"><input data-testid="b2b-street" {...f('business_street')} className={inputCls} placeholder="12 MG Road, Suite 4" /></Field>
                <Field label="City" required><input data-testid="b2b-city" {...f('business_city')} className={inputCls} placeholder="Pune" /></Field>
                <Field label="State" required><input data-testid="b2b-state" {...f('business_state')} className={inputCls} placeholder="Maharashtra" /></Field>
                <Field label="Pincode" required><input data-testid="b2b-pincode" {...f('business_pincode')} className={inputCls} placeholder="411001" maxLength={6} /></Field>
              </div>
            </div>

            {/* Contact Person */}
            <div className="card-sattva p-6">
              <SectionHeader icon={UserCircle2} title="Primary Contact Person" subtitle="Who should we reach out to?" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Contact Name" required><input data-testid="b2b-contact-name" {...f('contact_name')} className={inputCls} placeholder="Rahul Gupta" /></Field>
                <Field label="Designation" required><input data-testid="b2b-contact-designation" {...f('contact_designation')} className={inputCls} placeholder="Director" /></Field>
                <Field label="Contact Phone" required><input data-testid="b2b-contact-phone" type="tel" {...f('contact_phone')} className={inputCls} placeholder="10-digit mobile" /></Field>
                <Field label="Contact Email" required><input data-testid="b2b-contact-email" type="email" {...f('contact_email')} className={inputCls} placeholder="contact@company.com" /></Field>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <p className="text-xs text-gray-500">
                By submitting, you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
              </p>
              <button
                data-testid="b2b-submit"
                type="submit"
                disabled={loading}
                className="btn-primary px-8 py-3 min-w-[200px]"
              >
                {loading ? 'Submitting...' : 'Submit for Approval'}
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

export default RegisterB2B;
