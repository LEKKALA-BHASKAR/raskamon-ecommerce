import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';
import { toast } from 'sonner';

const AdminBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', subtitle: '', image: '', link: '/products', position: 'home_hero', isActive: true, order: 0 });

  const fetchBanners = () => {
    setLoading(true);
    api.get('/admin/banners').then(r => setBanners(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBanners(); }, []);

  const openForm = (banner = null) => {
    setEditing(banner?.id || null);
    setForm(banner ? { ...banner } : { title: '', subtitle: '', image: '', link: '/products', position: 'home_hero', isActive: true, order: banners.length + 1 });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/admin/banners/${editing}`, form); toast.success('Banner updated'); }
      else { await api.post('/admin/banners', form); toast.success('Banner created'); }
      setShowForm(false);
      fetchBanners();
    } catch (err) { toast.error('Failed'); }
  };

  const deleteBanner = async (id) => {
    if (!confirm('Delete banner?')) return;
    await api.delete(`/admin/banners/${id}`);
    toast.success('Deleted');
    fetchBanners();
  };

  const toggleActive = async (banner) => {
    await api.put(`/admin/banners/${banner.id}`, { ...banner, isActive: !banner.isActive });
    fetchBanners();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-semibold">Banners</h2>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-2 py-2.5 px-5 text-sm"><Plus size={16} /> Add Banner</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 skeleton rounded-xl"/>)}</div>
      ) : (
        <div className="space-y-3">
          {banners.map(b => (
            <div key={b.id} className="card-sattva p-4 flex items-center gap-4">
              <div className="w-24 h-14 rounded-lg overflow-hidden bg-[var(--sattva-muted)] flex-shrink-0">
                <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{b.title}</p>
                {b.subtitle && <p className="text-xs text-gray-500 truncate">{b.subtitle}</p>}
                <p className="text-xs text-[var(--sattva-forest)] mt-0.5">Link: {b.link}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(b)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>{b.isActive ? 'Active' : 'Inactive'}</button>
                <button onClick={() => openForm(b)} className="p-1.5 rounded-lg hover:bg-[var(--sattva-muted)] text-[var(--sattva-forest)]"><Edit size={14} /></button>
                <button onClick={() => deleteBanner(b.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {banners.length === 0 && <div className="text-center py-12 text-gray-400">No banners yet</div>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--sattva-surface)] rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-base font-semibold mb-4">{editing ? 'Edit Banner' : 'New Banner'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[{k:'title',l:'Title',req:true},{k:'subtitle',l:'Subtitle'},{k:'image',l:'Image URL',req:true},{k:'link',l:'Link URL'}].map(f=>(
                <div key={f.k}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.l}</label>
                  <input type="text" value={form[f.k]} onChange={(e)=>setForm(p=>({...p,[f.k]:e.target.value}))} required={f.req}
                    className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg focus:outline-none" />
                </div>
              ))}
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e)=>setForm(p=>({...p,isActive:e.target.checked}))} />
                <span className="text-sm">Active</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-outlined py-2.5">Cancel</button>
                <button type="submit" className="flex-1 btn-primary py-2.5">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBanners;
