import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, Play, Eye, EyeOff, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';
import { broadcastSiteContentChange } from '../../utils/siteContent';

const PLATFORMS = ['youtube', 'instagram', 'facebook'];
const TYPES = ['video', 'reel', 'short'];

const PLATFORM_COLORS = {
  youtube: { bg: '#FF0000', text: 'YouTube', icon: '▶' },
  instagram: { bg: '#E1306C', text: 'Instagram', icon: '📸' },
  facebook: { bg: '#1877F2', text: 'Facebook', icon: '📘' },
};

const defaultForm = {
  platform: 'youtube',
  type: 'video',
  title: '',
  embedUrl: '',
  thumbnail: '',
  views: '',
  duration: '',
  channel: '',
  isActive: true,
};

const VideoPreview = ({ video }) => {
  const [playing, setPlaying] = useState(false);
  const p = PLATFORM_COLORS[video.platform] || PLATFORM_COLORS.youtube;
  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
      {playing && video.embedUrl ? (
        <iframe src={video.embedUrl} className="w-full h-full" frameBorder="0" allowFullScreen title={video.title} />
      ) : (
        <>
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <Play size={32} className="text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <button
              onClick={() => setPlaying(true)}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: p.bg }}
            >
              <Play size={18} fill="white" className="ml-0.5" />
            </button>
          </div>
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ backgroundColor: p.bg }}>
            {p.text}
          </div>
          {video.duration && (
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded">
              {video.duration}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default function AdminSocialVideos() {
  const [videos, setVideos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  const reload = () => api.get('/admin/social-videos').then(r => setVideos(r.data || [])).catch(() => {});

  useEffect(() => { reload(); }, []);

  const openAdd = () => { setForm(defaultForm); setEditing(null); setShowForm(true); };
  const openEdit = (v) => { setForm({ ...v }); setEditing(v.id); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.title || !form.embedUrl) { toast.error('Title and Embed URL are required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/social-videos/${editing}`, form);
        toast.success('Video updated');
      } else {
        await api.post('/admin/social-videos', form);
        toast.success('Video added');
      }
      await reload();
      await broadcastSiteContentChange();
      closeForm();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this video?')) return;
    try {
      await api.delete(`/admin/social-videos/${id}`);
      await reload();
      await broadcastSiteContentChange();
      toast.success('Removed');
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const toggleActive = async (id) => {
    const v = videos.find(x => x.id === id);
    if (!v) return;
    try {
      await api.put(`/admin/social-videos/${id}`, { ...v, isActive: !v.isActive });
      await reload();
      await broadcastSiteContentChange();
      toast.success('Visibility updated');
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-[var(--sattva-ink)]">Social Media Videos</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage YouTube, Instagram Reels & Facebook videos shown on the home page</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--sattva-forest)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Add Video
        </button>
      </div>

      {/* Info banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
        <strong>How to get embed URLs:</strong>
        {' '}For YouTube: click Share → Embed → copy the src URL.
        For Instagram/Facebook: paste the video/reel URL — we'll convert it.
        Videos with autoplay will mute by default per browser policy.
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{editing ? 'Edit Video' : 'Add New Video'}</h3>
              <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Preview */}
              {form.embedUrl && (
                <VideoPreview video={form} />
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Platform</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]">
                    {PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]">
                    {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Ashwagandha: The Complete Guide"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Embed URL * <span className="text-gray-400 font-normal normal-case">(YouTube embed src, e.g. https://www.youtube.com/embed/VIDEO_ID)</span></label>
                <input value={form.embedUrl} onChange={e => setForm(f => ({ ...f, embedUrl: e.target.value }))}
                  placeholder="https://www.youtube.com/embed/VIDEO_ID?autoplay=1&mute=1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Thumbnail URL</label>
                <input value={form.thumbnail} onChange={e => setForm(f => ({ ...f, thumbnail: e.target.value }))}
                  placeholder="https://... (leave blank for auto YouTube thumbnail)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Views</label>
                  <input value={form.views} onChange={e => setForm(f => ({ ...f, views: e.target.value }))}
                    placeholder="1.2M views"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Duration</label>
                  <input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="8:24"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Channel</label>
                  <input value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                    placeholder="@drmediscie"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded accent-[var(--sattva-forest)]" />
                <span className="text-sm font-medium text-gray-700">Show on homepage</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeForm} className="px-4 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[var(--sattva-forest)] text-white rounded-xl hover:opacity-90 disabled:opacity-60">
                <Save size={14} /> {saving ? 'Saving...' : editing ? 'Update Video' : 'Add Video'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {videos.map(video => {
          const p = PLATFORM_COLORS[video.platform] || PLATFORM_COLORS.youtube;
          return (
            <div key={video.id} className={`card-sattva overflow-hidden transition-opacity ${video.isActive ? '' : 'opacity-50'}`}>
              <VideoPreview video={video} />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 text-[10px] font-bold text-white rounded-full" style={{ backgroundColor: p.bg }}>
                    {p.text}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{video.type}</span>
                  {!video.isActive && <span className="text-[10px] font-bold text-red-500 uppercase">Hidden</span>}
                </div>
                <h4 className="font-semibold text-[var(--sattva-ink)] text-sm leading-snug line-clamp-2 mb-1">{video.title}</h4>
                <p className="text-xs text-gray-400">{video.channel} · {video.views}</p>
              </div>
              <div className="px-4 pb-4 flex items-center gap-2">
                <button
                  onClick={() => toggleActive(video.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    video.isActive ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {video.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                  {video.isActive ? 'Visible' : 'Hidden'}
                </button>
                <button
                  onClick={() => openEdit(video)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(video.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors ml-auto"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-16">
          <Play size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No videos added yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Add YouTube, Instagram or Facebook videos to show on the homepage</p>
          <button onClick={openAdd} className="px-5 py-2.5 bg-[var(--sattva-forest)] text-white rounded-xl text-sm font-semibold hover:opacity-90">
            + Add First Video
          </button>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

