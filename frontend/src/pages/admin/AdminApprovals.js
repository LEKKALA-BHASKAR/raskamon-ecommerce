import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Eye, Clock, Users, Store, RefreshCcw, Building2 } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'sonner';

const STATUS_TABS = [
  { v: 'PENDING', label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { v: 'APPROVED', label: 'Approved', cls: 'bg-green-50 text-green-700 border-green-200' },
  { v: 'REJECTED', label: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
];

const StatusBadge = ({ status }) => {
  const tab = STATUS_TABS.find((t) => t.v === status);
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${tab?.cls || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status || '—'}
    </span>
  );
};

const Modal = ({ open, onClose, title, children, footer }) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="approval-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--sattva-border)]">
          <h3 className="font-heading text-base font-semibold text-[var(--sattva-ink)]">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--sattva-muted)] text-gray-400">
            <XCircle size={18} />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-3 border-t border-[color:var(--sattva-border)] bg-[var(--sattva-muted)]/50 flex gap-2 justify-end rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
};

const Row = ({ label, value, mono }) => (
  <div className="grid grid-cols-3 gap-3 text-sm py-1.5">
    <div className="text-gray-500 col-span-1">{label}</div>
    <div className={`col-span-2 ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</div>
  </div>
);

const B2BDetailContent = ({ u }) => {
  const b = u?.b2b_profile || {};
  const addr = b.business_address || {};
  const cp = b.contact_person || {};
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Account</p>
        <Row label="Name" value={u.name} />
        <Row label="Email" value={u.email} />
        <Row label="Phone" value={u.phone} />
        <Row label="User ID" value={u.id} mono />
        <Row label="Registered" value={u.created_at ? new Date(u.created_at).toLocaleString('en-IN') : '-'} />
      </div>
      <div>
        <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Company</p>
        <Row label="Company" value={b.company_name} />
        <Row label="GST" value={b.gst_number} mono />
        <Row label="PAN" value={b.pan_number} mono />
        <Row label="Business Type" value={b.business_type} />
        <Row label="Annual Turnover" value={b.annual_turnover ? `₹${Number(b.annual_turnover).toLocaleString('en-IN')}` : '-'} />
        <Row label="Years in Business" value={b.years_in_business} />
      </div>
      <div>
        <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Business Address</p>
        <Row label="Street" value={addr.street} />
        <Row label="City" value={addr.city} />
        <Row label="State" value={addr.state} />
        <Row label="Pincode" value={addr.pincode} />
      </div>
      <div>
        <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Contact Person</p>
        <Row label="Name" value={cp.name} />
        <Row label="Designation" value={cp.designation} />
        <Row label="Phone" value={cp.phone} />
        <Row label="Email" value={cp.email} />
      </div>
      {b.approval_status !== 'PENDING' && (
        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Decision</p>
          <Row label="Status" value={<StatusBadge status={b.approval_status} />} />
          {b.approval_note && <Row label="Note" value={b.approval_note} />}
          {b.rejection_reason && <Row label="Rejection Reason" value={b.rejection_reason} />}
        </div>
      )}
    </div>
  );
};

const VendorDetailContent = ({ u }) => {
  const v = u?.vendor_profile || {};
  const bd = v.bank_details || {};
  const ip = v.identity_proof || {};
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Account</p>
        <Row label="Name" value={u.name} />
        <Row label="Email" value={u.email} />
        <Row label="Phone" value={u.phone} />
        <Row label="Vendor ID" value={v.vendor_id} mono />
        <Row label="Registered" value={u.created_at ? new Date(u.created_at).toLocaleString('en-IN') : '-'} />
      </div>
      <div>
        <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Business</p>
        <Row label="Business Name" value={v.business_name} />
        <Row label="Store Name" value={v.store_name} />
        <Row label="Store Slug" value={v.store_slug} mono />
        <Row label="GSTIN" value={v.gstin} mono />
        <Row label="PAN" value={v.pan} mono />
        <Row label="Commission" value={v.commission_rate != null ? `${v.commission_rate}%` : '-'} />
      </div>
      <div>
        <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Bank Details</p>
        <Row label="Holder" value={bd.account_holder_name} />
        <Row label="Account" value={bd.account_number} mono />
        <Row label="IFSC" value={bd.ifsc_code} mono />
        <Row label="Bank" value={bd.bank_name} />
        <Row label="Branch" value={bd.branch} />
        <Row label="Type" value={bd.account_type} />
      </div>
      <div>
        <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Identity Proof</p>
        <Row label="Type" value={ip.type} />
        <Row label="Number" value={ip.number} mono />
      </div>
      {v.approval_status !== 'PENDING' && (
        <div>
          <p className="text-[11px] uppercase font-semibold text-gray-400 mb-1">Decision</p>
          <Row label="Status" value={<StatusBadge status={v.approval_status} />} />
          {v.approval_note && <Row label="Note" value={v.approval_note} />}
          {v.rejection_reason && <Row label="Rejection Reason" value={v.rejection_reason} />}
        </div>
      )}
    </div>
  );
};

const AdminApprovals = () => {
  const [tab, setTab] = useState('b2b'); // 'b2b' | 'vendor'
  const [status, setStatus] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page] = useState(1);

  // Detail / action modal state
  const [detail, setDetail] = useState(null); // user object
  const [action, setAction] = useState(null); // { type: 'approve'|'reject', item }
  const [actionNote, setActionNote] = useState('');
  const [acting, setActing] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'b2b' ? '/admin_users/b2b-users' : '/admin_users/vendors';
      const res = await api.get(`${endpoint}?status=${status}&page=${page}&limit=20`);
      setItems(res.data?.data || []);
      setTotal(res.data?.pagination?.total || 0);
    } catch (err) {
      const msg = err?.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : (msg?.message || 'Failed to load'));
    } finally {
      setLoading(false);
    }
  }, [tab, status, page]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openAction = (type, item) => {
    setAction({ type, item });
    setActionNote('');
  };

  const confirmAction = async () => {
    if (!action) return;
    const { type, item } = action;
    if (type === 'reject' && !actionNote.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    setActing(true);
    try {
      if (tab === 'b2b') {
        const url = `/admin_users/b2b-users/${item.id}/${type}`;
        const body = type === 'approve' ? { approval_note: actionNote || null } : { rejection_reason: actionNote };
        await api.post(url, body);
      } else {
        const vid = item?.vendor_profile?.vendor_id;
        const url = `/admin_users/vendors/${vid}/${type}`;
        const body = type === 'approve' ? { approval_note: actionNote || null } : { rejection_reason: actionNote };
        await api.post(url, body);
      }
      toast.success(`${tab === 'b2b' ? 'B2B user' : 'Vendor'} ${type === 'approve' ? 'approved' : 'rejected'}`);
      setAction(null);
      setActionNote('');
      fetchList();
    } catch (err) {
      const msg = err?.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : (msg?.message || 'Action failed'));
    } finally {
      setActing(false);
    }
  };

  const currentIcon = tab === 'b2b' ? Building2 : Store;
  const CurrentIcon = currentIcon;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold">User Approvals</h2>
          <p className="text-sm text-gray-500">{total} {status.toLowerCase()} {tab === 'b2b' ? 'B2B buyer' : 'vendor'}{total === 1 ? '' : 's'}</p>
        </div>
        <button onClick={fetchList} data-testid="approvals-refresh" className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-[color:var(--sattva-border)] hover:bg-[var(--sattva-muted)]">
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {/* Top tabs: B2B vs Vendor */}
      <div className="flex gap-2 mb-4" data-testid="approvals-type-tabs">
        {[
          { v: 'b2b', label: 'B2B Buyers', icon: Users },
          { v: 'vendor', label: 'Vendors', icon: Store },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.v;
          return (
            <button
              key={t.v}
              data-testid={`approvals-tab-${t.v}`}
              onClick={() => { setTab(t.v); setStatus('PENDING'); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                active
                  ? 'bg-[var(--sattva-forest)] text-[var(--sattva-cream)] border-[var(--sattva-forest)]'
                  : 'bg-[var(--sattva-surface)] text-[var(--sattva-ink)] border-[color:var(--sattva-border)] hover:bg-[var(--sattva-muted)]'
              }`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4">
        {STATUS_TABS.map((s) => (
          <button
            key={s.v}
            data-testid={`approvals-status-${s.v.toLowerCase()}`}
            onClick={() => setStatus(s.v)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
              status === s.v ? s.cls : 'bg-[var(--sattva-surface)] border-[color:var(--sattva-border)] text-gray-500 hover:bg-[var(--sattva-muted)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="card-sattva overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
            <tr>
              {(tab === 'b2b'
                ? ['Contact', 'Company', 'GST', 'Pincode', 'Submitted', 'Status', 'Actions']
                : ['Vendor', 'Store', 'GSTIN', 'Commission', 'Submitted', 'Status', 'Actions']).map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--sattva-border)]">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 skeleton rounded" /></td></tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <div className="inline-flex flex-col items-center gap-2 text-gray-400">
                    <div className="p-3 rounded-full bg-[var(--sattva-muted)]"><CurrentIcon size={22} /></div>
                    <p className="text-sm">No {status.toLowerCase()} {tab === 'b2b' ? 'B2B buyers' : 'vendors'} right now.</p>
                    <p className="text-xs">New submissions will appear here automatically.</p>
                  </div>
                </td>
              </tr>
            ) : items.map((u) => {
              const profile = tab === 'b2b' ? (u.b2b_profile || {}) : (u.vendor_profile || {});
              return (
                <tr key={u.id} className="hover:bg-[var(--sattva-muted)] transition-colors" data-testid={`approval-row-${u.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[var(--sattva-muted)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--sattva-forest)]">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-tight">{u.name}</p>
                        <p className="text-[11px] text-gray-400 leading-tight">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  {tab === 'b2b' ? (
                    <>
                      <td className="px-4 py-3 text-sm">
                        <p className="font-medium">{profile.company_name}</p>
                        <p className="text-[11px] text-gray-400">{profile.business_type || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{profile.gst_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{profile.business_address?.pincode || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm">
                        <p className="font-medium">{profile.store_name}</p>
                        <p className="text-[11px] text-gray-400">{profile.business_name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono">{profile.gstin}</td>
                      <td className="px-4 py-3 text-sm">{profile.commission_rate != null ? `${profile.commission_rate}%` : '—'}</td>
                    </>
                  )}
                  <td className="px-4 py-3 text-xs text-gray-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={profile.approval_status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        data-testid={`approval-view-${u.id}`}
                        onClick={() => setDetail(u)}
                        className="p-1.5 rounded-lg hover:bg-[var(--sattva-muted)] text-gray-500"
                        title="View details"
                      ><Eye size={14} /></button>
                      {profile.approval_status === 'PENDING' && (
                        <>
                          <button
                            data-testid={`approval-approve-${u.id}`}
                            onClick={() => openAction('approve', u)}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                            title="Approve"
                          ><CheckCircle2 size={14} /></button>
                          <button
                            data-testid={`approval-reject-${u.id}`}
                            onClick={() => openAction('reject', u)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                            title="Reject"
                          ><XCircle size={14} /></button>
                        </>
                      )}
                      {profile.approval_status === 'REJECTED' && (
                        <Clock size={14} className="text-gray-300" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={tab === 'b2b' ? 'B2B Buyer Details' : 'Vendor Details'}
        footer={
          <>
            <button onClick={() => setDetail(null)} className="btn-outlined px-4 py-2 text-sm">Close</button>
            {detail && (tab === 'b2b'
              ? detail?.b2b_profile?.approval_status === 'PENDING'
              : detail?.vendor_profile?.approval_status === 'PENDING'
            ) && (
              <>
                <button
                  data-testid="approval-modal-reject"
                  onClick={() => { openAction('reject', detail); setDetail(null); }}
                  className="px-4 py-2 text-sm rounded-xl border border-red-300 text-red-600 hover:bg-red-50"
                >Reject</button>
                <button
                  data-testid="approval-modal-approve"
                  onClick={() => { openAction('approve', detail); setDetail(null); }}
                  className="btn-primary px-4 py-2 text-sm"
                >Approve</button>
              </>
            )}
          </>
        }
      >
        {detail && (tab === 'b2b' ? <B2BDetailContent u={detail} /> : <VendorDetailContent u={detail} />)}
      </Modal>

      {/* Action modal (approve / reject confirmation) */}
      <Modal
        open={!!action}
        onClose={() => { setAction(null); setActionNote(''); }}
        title={`${action?.type === 'approve' ? 'Approve' : 'Reject'} ${tab === 'b2b' ? 'B2B Buyer' : 'Vendor'}`}
        footer={
          <>
            <button onClick={() => { setAction(null); setActionNote(''); }} className="btn-outlined px-4 py-2 text-sm">Cancel</button>
            <button
              data-testid="approval-confirm-btn"
              onClick={confirmAction}
              disabled={acting || (action?.type === 'reject' && !actionNote.trim())}
              className={`px-4 py-2 text-sm rounded-xl font-semibold ${
                action?.type === 'approve'
                  ? 'bg-[var(--sattva-forest)] text-[var(--sattva-cream)] hover:bg-[#152f28]'
                  : 'bg-red-600 text-white hover:bg-red-700'
              } disabled:opacity-50`}
            >
              {acting ? 'Processing...' : (action?.type === 'approve' ? 'Confirm Approve' : 'Confirm Reject')}
            </button>
          </>
        }
      >
        {action && (
          <div className="space-y-4">
            <div className="rounded-xl bg-[var(--sattva-muted)] p-4 text-sm">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Subject</p>
              <p className="font-medium">
                {tab === 'b2b'
                  ? `${action.item?.b2b_profile?.company_name} (${action.item?.email})`
                  : `${action.item?.vendor_profile?.store_name} (${action.item?.email})`}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {action.type === 'approve' ? 'Approval Note (optional)' : 'Rejection Reason'}
                {action.type === 'reject' && <span className="text-[var(--sattva-danger)]"> *</span>}
              </label>
              <textarea
                data-testid="approval-note-input"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
                placeholder={action.type === 'approve' ? 'Any remarks for internal records...' : 'Explain why this application is being rejected'}
              />
            </div>
            {action.type === 'approve' && (
              <p className="text-xs text-gray-500">Once approved, this user can immediately login and access the platform.</p>
            )}
            {action.type === 'reject' && (
              <p className="text-xs text-red-600">Once rejected, this user will see the reason when attempting to login.</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
};

export default AdminApprovals;
