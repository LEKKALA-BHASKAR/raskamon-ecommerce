import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Smartphone, Monitor, Globe, Clock, AlertTriangle, CheckCircle,
  X, RefreshCw, Trash2, Copy, Check, LogOut, ChevronDown, ChevronUp,
  Key, QrCode, History,
} from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

const inp = 'w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--sattva-forest)] bg-[var(--sattva-surface)] text-[var(--sattva-ink)]';

// ── Skeleton ──────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-[var(--sattva-muted)] rounded-lg ${className}`} />
);

// ── Device icon helper ────────────────────────────────────────────────
const DeviceIcon = ({ type }) => {
  if (type === 'Mobile') return <Smartphone size={16} className="text-blue-500" />;
  return <Monitor size={16} className="text-gray-500" />;
};

// ── Status badge ──────────────────────────────────────────────────────
const StatusBadge = ({ success }) => (
  success
    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full"><CheckCircle size={10} />Success</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"><AlertTriangle size={10} />Failed</span>
);

// ── Format relative time ──────────────────────────────────────────────
const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ════════════════════════════════════════════════════════════════════════
//  2FA SETUP SECTION
// ════════════════════════════════════════════════════════════════════════
const TwoFactorSection = () => {
  const [status, setStatus] = useState(null); // null = loading
  const [setupData, setSetupData] = useState(null); // { secret, qr_uri }
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await api.get('/auth/enhanced/2fa/status');
      setStatus(res.data?.data);
    } catch { setStatus({ enabled: false }); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const startSetup = async () => {
    setLoading(true);
    try {
      const res = await api.post('/auth/enhanced/2fa/setup');
      setSetupData(res.data?.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to start 2FA setup');
    } finally { setLoading(false); }
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    if (verifyCode.length < 6) { toast.error('Enter a 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/enhanced/2fa/verify-setup', { code: verifyCode });
      setBackupCodes(res.data?.data?.backup_codes || []);
      setSetupData(null);
      setVerifyCode('');
      await fetchStatus();
      toast.success('2FA enabled successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid code');
    } finally { setLoading(false); }
  };

  const disable2FA = async (e) => {
    e.preventDefault();
    if (disableCode.length < 6) { toast.error('Enter a 6-digit code'); return; }
    setLoading(true);
    try {
      await api.post('/auth/enhanced/2fa/disable', { code: disableCode });
      setShowDisable(false);
      setDisableCode('');
      setBackupCodes(null);
      await fetchStatus();
      toast.success('2FA disabled');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Invalid code');
    } finally { setLoading(false); }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === null) return <div className="card-sattva p-5"><Skeleton className="h-20 w-full" /></div>;

  return (
    <div className="card-sattva p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={16} className="text-[var(--sattva-forest)]" />
        <h3 className="font-semibold text-[var(--sattva-ink)]">Two-Factor Authentication</h3>
        {status.enabled && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
            <CheckCircle size={12} /> Enabled
          </span>
        )}
      </div>

      {!status.enabled && !setupData && !backupCodes && (
        <div>
          <p className="text-sm text-gray-500 mb-4">Add an extra layer of security to your account. You'll need an authenticator app like Google Authenticator or Authy.</p>
          <button onClick={startSetup} disabled={loading}
            className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
            Enable 2FA
          </button>
        </div>
      )}

      {/* Setup flow — show QR + secret */}
      {setupData && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Scan this QR code with your authenticator app, or enter the secret manually.</p>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="bg-white p-3 rounded-xl border border-[color:var(--sattva-border)] flex-shrink-0">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setupData.qr_uri)}`}
                alt="2FA QR Code" className="w-[180px] h-[180px]" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Secret Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono bg-[var(--sattva-muted)] px-3 py-2 rounded-lg break-all text-[var(--sattva-ink)]">
                    {setupData.secret}
                  </code>
                  <button onClick={copySecret} className="p-2 rounded-lg hover:bg-[var(--sattva-muted)] text-gray-400 hover:text-[var(--sattva-ink)]">
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <form onSubmit={confirmSetup} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Verification Code</label>
                  <input type="text" value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code" maxLength={6} className={`${inp} font-mono tracking-widest`} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading || verifyCode.length < 6}
                    className="btn-primary px-5 py-2 text-sm disabled:opacity-50">
                    {loading ? 'Verifying...' : 'Verify & Enable'}
                  </button>
                  <button type="button" onClick={() => setSetupData(null)}
                    className="px-4 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl hover:bg-[var(--sattva-muted)]">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Backup codes display (shown after successful setup) */}
      {backupCodes && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Save your backup codes</span>
          </div>
          <p className="text-xs text-amber-700 mb-3">Store these codes safely. Each code can be used once if you lose access to your authenticator app.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {backupCodes.map((code, i) => (
              <code key={i} className="text-xs font-mono bg-white px-2 py-1.5 rounded border border-amber-200 text-center text-amber-900">{code}</code>
            ))}
          </div>
          <button onClick={() => { navigator.clipboard.writeText(backupCodes.join('\n')); toast.success('Backup codes copied'); }}
            className="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1">
            <Copy size={12} /> Copy all codes
          </button>
        </div>
      )}

      {/* Disable 2FA */}
      {status.enabled && !setupData && (
        <div className="mt-4">
          {!showDisable ? (
            <button onClick={() => setShowDisable(true)}
              className="text-sm text-red-500 font-semibold hover:text-red-700 flex items-center gap-1">
              <X size={14} /> Disable 2FA
            </button>
          ) : (
            <form onSubmit={disable2FA} className="p-4 border border-red-200 rounded-xl bg-red-50/50 space-y-3">
              <p className="text-sm text-red-700 font-medium">Enter your authenticator code to disable 2FA</p>
              <input type="text" value={disableCode} onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code" maxLength={6} className={`${inp} font-mono tracking-widest`} />
              <div className="flex gap-2">
                <button type="submit" disabled={loading || disableCode.length < 6}
                  className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50">
                  {loading ? 'Disabling...' : 'Confirm Disable'}
                </button>
                <button type="button" onClick={() => { setShowDisable(false); setDisableCode(''); }}
                  className="px-4 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl hover:bg-[var(--sattva-muted)]">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════════════════
//  ACTIVE SESSIONS
// ════════════════════════════════════════════════════════════════════════
const ActiveSessions = () => {
  const [sessions, setSessions] = useState(null);
  const [revoking, setRevoking] = useState(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get('/auth/enhanced/sessions');
      setSessions(res.data?.data || []);
    } catch { setSessions([]); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const revokeSession = async (sessionId) => {
    setRevoking(sessionId);
    try {
      await api.delete(`/auth/enhanced/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session revoked');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to revoke session');
    } finally { setRevoking(null); }
  };

  const revokeAll = async () => {
    setRevoking('all');
    try {
      await api.post('/auth/enhanced/sessions/revoke-all');
      setSessions([]);
      toast.success('All sessions revoked. You may need to re-login on other devices.');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to revoke sessions');
    } finally { setRevoking(null); }
  };

  if (sessions === null) return <div className="card-sattva p-5"><Skeleton className="h-32 w-full" /></div>;

  return (
    <div className="card-sattva p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Monitor size={16} className="text-[var(--sattva-forest)]" />
          <h3 className="font-semibold text-[var(--sattva-ink)]">Active Sessions</h3>
          <span className="text-xs text-gray-400 bg-[var(--sattva-muted)] px-2 py-0.5 rounded-full">{sessions.length}</span>
        </div>
        {sessions.length > 1 && (
          <button onClick={revokeAll} disabled={revoking === 'all'}
            className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 disabled:opacity-50">
            <LogOut size={12} /> Sign out all
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No active sessions found</p>
      ) : (
        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-[color:var(--sattva-border)] bg-[var(--sattva-surface)] hover:shadow-sm transition-shadow">
              <DeviceIcon type={s.device_type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--sattva-ink)]">{s.browser} on {s.os}</p>
                <p className="text-xs text-gray-400 flex items-center gap-2">
                  <Globe size={10} /> {s.ip_address} · <Clock size={10} /> {timeAgo(s.last_active_at)}
                </p>
              </div>
              <button onClick={() => revokeSession(s.id)} disabled={revoking === s.id}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50">
                {revoking === s.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════════════════
//  LOGIN HISTORY
// ════════════════════════════════════════════════════════════════════════
const LoginHistory = () => {
  const [items, setItems] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, pages: 1 });

  const fetchHistory = useCallback(async (p = 1) => {
    try {
      const res = await api.get(`/auth/enhanced/login-history?page=${p}&limit=10`);
      const data = res.data?.data || {};
      setItems(data.items || []);
      setMeta({ total: data.total || 0, pages: data.pages || 1 });
      setPage(p);
    } catch { setItems([]); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  if (items === null) return <div className="card-sattva p-5"><Skeleton className="h-32 w-full" /></div>;

  const methodLabel = (m) => {
    const map = { email_password: 'Email/Password', mobile_otp: 'Mobile OTP', google_oauth: 'Google', email_password_2fa: 'Email + 2FA' };
    return map[m] || m || 'Unknown';
  };

  return (
    <div className="card-sattva p-5">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History size={16} className="text-[var(--sattva-forest)]" />
          <h3 className="font-semibold text-[var(--sattva-ink)]">Login History</h3>
          <span className="text-xs text-gray-400 bg-[var(--sattva-muted)] px-2 py-0.5 rounded-full">{meta.total}</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {expanded && (
        <>
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No login history</p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, i) => (
                <div key={item.id || i} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-[var(--sattva-muted)] transition-colors">
                  <StatusBadge success={item.success} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--sattva-ink)]">
                      <span className="font-medium">{methodLabel(item.method)}</span>
                      <span className="text-gray-400 mx-1">·</span>
                      <span className="text-gray-500">{item.browser} on {item.os}</span>
                    </p>
                    <p className="text-xs text-gray-400">{item.ip_address} · {timeAgo(item.created_at)}</p>
                  </div>
                  <DeviceIcon type={item.device_type} />
                </div>
              ))}
            </div>
          )}

          {meta.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-[color:var(--sattva-border)]">
              <button onClick={() => fetchHistory(page - 1)} disabled={page <= 1}
                className="text-xs px-3 py-1.5 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40 hover:bg-[var(--sattva-muted)]">Prev</button>
              <span className="text-xs text-gray-500">Page {page} of {meta.pages}</span>
              <button onClick={() => fetchHistory(page + 1)} disabled={page >= meta.pages}
                className="text-xs px-3 py-1.5 rounded-lg border border-[color:var(--sattva-border)] disabled:opacity-40 hover:bg-[var(--sattva-muted)]">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════════════════
//  ACCOUNT ACTIVITY
// ════════════════════════════════════════════════════════════════════════
const AccountActivity = () => {
  const [activities, setActivities] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/auth/enhanced/account-activity?limit=15');
        setActivities(res.data?.data?.items || []);
      } catch { setActivities([]); }
    })();
  }, []);

  if (activities === null) return <div className="card-sattva p-5"><Skeleton className="h-20 w-full" /></div>;

  const severityColor = (s) => {
    if (s === 'warning' || s === 'WARNING') return 'text-amber-600';
    if (s === 'critical' || s === 'CRITICAL') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="card-sattva p-5">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-[var(--sattva-forest)]" />
          <h3 className="font-semibold text-[var(--sattva-ink)]">Account Activity</h3>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {expanded && (
        activities.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-[var(--sattva-muted)]">
                <div className={`mt-0.5 ${severityColor(a.severity)}`}>
                  {a.severity === 'warning' || a.severity === 'WARNING'
                    ? <AlertTriangle size={14} />
                    : <CheckCircle size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--sattva-ink)]">{a.title}</p>
                  {a.details && <p className="text-xs text-gray-500 mt-0.5">{a.details}</p>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(a.timestamp)}</span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};


// ════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ════════════════════════════════════════════════════════════════════════
export default function AccountSecurity() {
  return (
    <div className="space-y-5">
      <h2 className="font-heading text-xl font-semibold text-[var(--sattva-ink)]">Security & Privacy</h2>
      <TwoFactorSection />
      <ActiveSessions />
      <LoginHistory />
      <AccountActivity />
    </div>
  );
}
