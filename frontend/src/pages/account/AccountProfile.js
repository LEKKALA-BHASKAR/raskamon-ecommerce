import React, { useState, useRef } from 'react';
import { User, Camera, Eye, EyeOff, Shield, Gift, Copy, Check, LogOut } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const inp = 'w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--sattva-forest)] bg-white disabled:bg-gray-50 disabled:text-gray-400';

export default function AccountProfile() {
  const { user, setUser, logout } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    dateOfBirth: user?.dateOfBirth || '',
  });
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState({ old: false, new: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErrors, setPwErrors] = useState({});

  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({...f, [k]: v}));

  // ── Profile save ──────────────────────────────────────────────────────

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const r = await api.put('/users/me', form);
      setUser(r.data);
      toast.success('Profile updated successfully');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update profile');
    } finally { setSaving(false); }
  };

  // ── Avatar upload ─────────────────────────────────────────────────────

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = r.data?.url || r.data?.secure_url;
      const res = await api.put('/users/me', { avatar: url });
      setUser(res.data);
      toast.success('Profile photo updated');
    } catch { toast.error('Failed to upload image'); }
  };

  // ── Password change ───────────────────────────────────────────────────

  const validatePw = () => {
    const e = {};
    if (!pwForm.old_password) e.old_password = 'Enter current password';
    if (pwForm.new_password.length < 8) e.new_password = 'Min 8 characters';
    if (pwForm.new_password !== pwForm.confirm) e.confirm = 'Passwords do not match';
    setPwErrors(e);
    return Object.keys(e).length === 0;
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!validatePw()) return;
    setPwSaving(true);
    try {
      await api.post('/users/me/change-password', {
        old_password: pwForm.old_password,
        new_password: pwForm.new_password,
      });
      toast.success('Password changed successfully');
      setPwForm({ old_password: '', new_password: '', confirm: '' });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to change password');
    } finally { setPwSaving(false); }
  };

  // ── Referral copy ─────────────────────────────────────────────────────

  const copyReferral = async () => {
    const code = user?.referralCode || user?.id?.slice(-8).toUpperCase();
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="space-y-5">
      <h2 className="font-heading text-xl font-semibold text-[var(--sattva-ink)]">Profile Settings</h2>

      {/* Avatar + basic info */}
      <div className="card-sattva p-5">
        <div className="flex items-start gap-5 mb-5 flex-wrap">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--sattva-forest)] flex items-center justify-center">
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover"/>
                : <span className="text-3xl font-bold text-[var(--sattva-gold)]">{initials}</span>
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--sattva-forest)] flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
            >
              <Camera size={13} className="text-white"/>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden"/>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--sattva-ink)]">{user?.name}</h3>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-[var(--sattva-gold)] font-medium mt-0.5">
              ✦ {user?.loyaltyPoints || 0} Loyalty Points
            </p>
          </div>
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Full Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inp} placeholder="Your full name"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Email</label>
              <input value={user?.email || ''} disabled className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Mobile Number</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g,'').slice(0,10))}
                className={inp} placeholder="10-digit mobile" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Gender</label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inp}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Date of Birth</label>
              <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)}
                className={inp} max={new Date().toISOString().slice(0,10)} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card-sattva p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-[var(--sattva-forest)]"/>
          <h3 className="font-semibold text-[var(--sattva-ink)]">Change Password</h3>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          {[
            { key: 'old_password', label: 'Current Password', sw: 'old' },
            { key: 'new_password', label: 'New Password',     sw: 'new' },
            { key: 'confirm',      label: 'Confirm Password', sw: 'confirm' },
          ].map(({ key, label, sw }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={showPw[sw] ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={e => {
                    setPwForm(f => ({...f, [key]: e.target.value}));
                    if (pwErrors[key]) setPwErrors(p => ({...p, [key]: undefined}));
                  }}
                  className={`${inp} pr-10 ${pwErrors[key] ? 'border-red-300' : ''}`}
                  placeholder={label}
                  autoComplete="new-password"
                />
                <button type="button"
                  onClick={() => setShowPw(p => ({...p, [sw]: !p[sw]}))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw[sw] ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              {pwErrors[key] && <p className="text-xs text-red-500 mt-1">{pwErrors[key]}</p>}
            </div>
          ))}
          <button type="submit" disabled={pwSaving}
            className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
            {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Referral code */}
      {(user?.referralCode || user?.id) && (
        <div className="card-sattva p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={16} className="text-[var(--sattva-gold)]"/>
            <h3 className="font-semibold text-[var(--sattva-ink)]">Referral Code</h3>
          </div>
          <p className="text-sm text-gray-500 mb-3">Share your code and earn wallet credits when friends sign up.</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-lg font-bold tracking-widest text-[var(--sattva-forest)] bg-[var(--sattva-forest)]/5 border border-[var(--sattva-forest)]/20 px-4 py-3 rounded-xl">
              {user?.referralCode || user?.id?.slice(-8).toUpperCase()}
            </div>
            <button onClick={copyReferral}
              className="flex items-center gap-2 px-4 py-3 text-sm font-semibold bg-[var(--sattva-forest)] text-white rounded-xl hover:opacity-90">
              {copied ? <><Check size={14}/> Copied</> : <><Copy size={14}/> Copy</>}
            </button>
          </div>
        </div>
      )}

      {/* Sign out */}
      <div className="card-sattva p-5">
        <h3 className="font-semibold text-[var(--sattva-ink)] mb-3">Account Actions</h3>
        <button onClick={logout}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors">
          <LogOut size={14}/> Sign Out
        </button>
      </div>
    </div>
  );
}
