import React, { useEffect, useState, useCallback } from 'react';
import { Settings, RefreshCw, Trash2, Eye, EyeOff, Youtube, Instagram, Facebook, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';

const PLATFORMS = ['youtube', 'instagram', 'facebook'];

const PLATFORM_META = {
  youtube: {
    label: 'YouTube',
    color: '#FF0000',
    icon: Youtube,
    fields: [
      { key: 'youtube_api_key', label: 'YouTube Data API v3 Key', placeholder: 'AIza...', type: 'password' },
      { key: 'youtube_channel_id', label: 'Channel ID', placeholder: 'UCxxxxxx...' },
      { key: 'youtube_max_results', label: 'Max Videos to Fetch', placeholder: '9', type: 'number' },
    ],
    helpUrl: 'https://console.cloud.google.com/apis/credentials',
    helpText: 'Enable "YouTube Data API v3" in Google Cloud Console and create an API key.',
  },
  instagram: {
    label: 'Instagram',
    color: '#E1306C',
    icon: Instagram,
    fields: [
      { key: 'instagram_access_token', label: 'Instagram Graph API Access Token', placeholder: 'EAABs...', type: 'password', note: 'Requires Instagram Professional / Business account' },
      { key: 'instagram_user_id', label: 'Instagram User ID (numeric)', placeholder: '17841400...' },
      { key: 'instagram_max_results', label: 'Max Posts to Fetch', placeholder: '9', type: 'number' },
      { key: 'rapidapi_key', label: 'RapidAPI Key (fallback)', placeholder: 'xxx...', type: 'password', note: 'Used if Graph API creds are not set' },
      { key: 'instagram_username', label: 'Instagram Username (for RapidAPI)', placeholder: '@drmediscie' },
    ],
    helpUrl: 'https://developers.facebook.com/docs/instagram-api/getting-started',
    helpText: 'Use Instagram Graph API (Professional account) or RapidAPI as fallback.',
  },
  facebook: {
    label: 'Facebook',
    color: '#1877F2',
    icon: Facebook,
    fields: [
      { key: 'facebook_access_token', label: 'Page Access Token (Graph API)', placeholder: 'EAABs...', type: 'password', note: 'Requires pages_read_engagement permission' },
      { key: 'facebook_page_id', label: 'Page ID (Graph API)', placeholder: '123456789' },
      { key: 'facebook_max_results', label: 'Max Posts to Fetch', placeholder: '9', type: 'number' },
      { key: 'facebook_rapidapi_key', label: 'RapidAPI Key (fallback)', placeholder: 'xxx...', type: 'password', note: 'Used if Graph API creds are not set' },
      { key: 'facebook_username', label: 'Facebook Page Username (for RapidAPI)', placeholder: 'drmediscie' },
    ],
    helpUrl: 'https://developers.facebook.com/tools/explorer/',
    helpText: 'Use Graph API Explorer for Page Token, or RapidAPI "facebook-scraper3" as a no-auth fallback.',
  },
};

const StatusBadge = ({ status }) => {
  if (!status) return null;
  const map = {
    ok: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Synced' },
    error: { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Error' },
    skipped: { icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50', label: 'Skipped' },
  };
  const m = map[status] || map.skipped;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${m.color}`}>
      <Icon size={10} /> {m.label}
    </span>
  );
};

const FeedCard = ({ item, onToggle, onDelete }) => {
  const meta = PLATFORM_META[item.platform] || PLATFORM_META.youtube;
  const date = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <div className={`bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm transition-opacity ${item.isActive ? '' : 'opacity-50'}`}>
      <a href={item.redirectUrl} target="_blank" rel="noopener noreferrer" className="block relative" style={{ aspectRatio: '16/9', background: '#f3f4f6' }}>
        {item.thumbnail ? (
          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">▶</div>
        )}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 text-[10px] font-bold text-white rounded" style={{ backgroundColor: meta.color }}>
            {meta.label}
          </span>
        </div>
        {item.type && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-black/60 text-white rounded uppercase">
              {item.type}
            </span>
          </div>
        )}
      </a>
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">{item.title || '(no title)'}</p>
        {date && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-2"><Clock size={10} /> {date}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => onToggle(item)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              item.isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {item.isActive ? <Eye size={11} /> : <EyeOff size={11} />}
            {item.isActive ? 'Visible' : 'Hidden'}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminSocialFeed() {
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState({});
  const [forms, setForms] = useState({});
  const [feed, setFeed] = useState([]);
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [syncing, setSyncing] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(null);

  const loadAccounts = useCallback(() =>
    api.get('/admin/social-accounts').then(r => {
      setAccounts(r.data || {});
      setForms(r.data || {});
    }).catch(() => {}), []);

  const loadFeed = useCallback(() =>
    api.get('/admin/social-feed').then(r => setFeed(r.data || [])).catch(() => {}), []);

  useEffect(() => {
    loadAccounts();
    loadFeed();
  }, [loadAccounts, loadFeed]);

  const handleFormChange = (platform, key, value) => {
    setForms(f => ({ ...f, [platform]: { ...(f[platform] || {}), [key]: value } }));
  };

  const handleSavePlatform = async (platform) => {
    setSavingPlatform(platform);
    try {
      await api.put(`/admin/social-accounts/${platform}`, forms[platform] || {});
      toast.success(`${PLATFORM_META[platform].label} settings saved`);
      await loadAccounts();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSavingPlatform(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await api.post('/admin/social-accounts/sync');
      const results = r.data || {};
      const messages = Object.entries(results).map(([p, res]) => `${p}: ${res.status} (${res.upserted ?? 0} new)`);
      toast.success(`Sync complete — ${messages.join(', ')}`);
      await loadFeed();
      await loadAccounts();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggle = async (item) => {
    try {
      await api.patch(`/admin/social-feed/${item.id}`, { isActive: !item.isActive });
      setFeed(f => f.map(x => x.id === item.id ? { ...x, isActive: !x.isActive } : x));
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this post from the feed?')) return;
    try {
      await api.delete(`/admin/social-feed/${id}`);
      setFeed(f => f.filter(x => x.id !== id));
      toast.success('Removed');
    } catch {
      toast.error('Delete failed');
    }
  };

  const displayFeed = filterPlatform === 'all' ? feed : feed.filter(x => x.platform === filterPlatform);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-[var(--sattva-ink)]">Social Media Feed</h2>
          <p className="text-sm text-gray-400 mt-0.5">Auto-fetch posts from YouTube, Instagram & Facebook · syncs every 24 hours</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--sattva-forest)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'accounts', label: 'Account Settings', icon: Settings },
          { key: 'feed', label: `Fetched Content (${feed.length})`, icon: RefreshCw },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === key ? 'bg-white text-[var(--sattva-ink)] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Account Settings Tab ── */}
      {tab === 'accounts' && (
        <div className="space-y-6">
          {PLATFORMS.map(platform => {
            const meta = PLATFORM_META[platform];
            const Icon = meta.icon;
            const acc = accounts[platform] || {};
            const formData = forms[platform] || {};
            const isSaving = savingPlatform === platform;

            return (
              <div key={platform} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Platform header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50" style={{ borderLeftWidth: 4, borderLeftColor: meta.color }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: meta.color + '15' }}>
                      <Icon size={18} style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{meta.label}</p>
                      {acc.lastSyncAt && (
                        <p className="text-[11px] text-gray-400">
                          Last sync: {new Date(acc.lastSyncAt).toLocaleString('en-IN')}
                          {' '}<StatusBadge status={acc.lastSyncStatus} />
                          {acc.lastSyncCount != null && ` · ${acc.lastSyncCount} new`}
                        </p>
                      )}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-sm text-gray-500">Enabled</span>
                    <div
                      onClick={() => handleFormChange(platform, 'enabled', !formData.enabled)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${formData.enabled ? 'bg-[var(--sattva-forest)]' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${formData.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                </div>

                {/* Fields */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {meta.fields.map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                        {field.label}
                        {field.note && <span className="ml-1 text-[10px] text-blue-500 normal-case font-normal">({field.note})</span>}
                      </label>
                      <input
                        type={field.type || 'text'}
                        value={formData[field.key] || ''}
                        onChange={e => handleFormChange(platform, field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]"
                      />
                    </div>
                  ))}
                </div>

                {/* Help + Save */}
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <a href={meta.helpUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                    {meta.helpText}
                  </a>
                  <button
                    onClick={() => handleSavePlatform(platform)}
                    disabled={isSaving}
                    className="px-4 py-2 bg-[var(--sattva-forest)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Info box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            <strong>How sync works:</strong> After saving credentials, click <strong>Sync Now</strong> to fetch immediately.
            The system also syncs automatically every <strong>24 hours</strong>. Fetched content is stored in your database and
            displayed on the homepage under "Watch & Learn". Each item shows thumbnail, caption, publish date, and links back to the original post.
          </div>
        </div>
      )}

      {/* ── Feed Content Tab ── */}
      {tab === 'feed' && (
        <>
          {/* Platform filter */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {['all', ...PLATFORMS].map(p => (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                  filterPlatform === p ? 'bg-[var(--sattva-forest)] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p === 'all' ? `All (${feed.length})` : `${p} (${feed.filter(x => x.platform === p).length})`}
              </button>
            ))}
          </div>

          {displayFeed.length === 0 ? (
            <div className="text-center py-16">
              <RefreshCw size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No posts fetched yet</p>
              <p className="text-gray-400 text-sm mt-1 mb-5">Configure account credentials and click "Sync Now" to fetch content.</p>
              <button onClick={handleSync} disabled={syncing} className="px-5 py-2.5 bg-[var(--sattva-forest)] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60">
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayFeed.map(item => (
                <FeedCard key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
