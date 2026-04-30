import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';
import { toast } from 'sonner';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', image: '', order: 0, isActive: true, parent: null });

  const fetchCategories = () => {
    setLoading(true);
    api.get('/admin/categories').then(r => setCategories(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const openForm = (cat = null) => {
    setEditing(cat?.id || null);
    setForm(cat ? { ...cat } : { name: '', image: '', order: categories.length + 1, isActive: true, parent: null });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await api.put(`/admin/categories/${editing}`, form); toast.success('Category updated'); }
      else { await api.post('/admin/categories', form); toast.success('Category created'); }
      setShowForm(false);
      fetchCategories();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const deleteCat = async (id) => {
    if (!confirm('Delete category?')) return;
    await api.delete(`/admin/categories/${id}`);
    toast.success('Deleted');
    fetchCategories();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-semibold">Categories</h2>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-2 py-2.5 px-5 text-sm"><Plus size={16} /> Add Category</button>
      </div>

      <div className="card-sattva overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
            <tr>
              {['Category', 'Slug', 'Order', 'Status', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--sattva-border)]">
            {loading ? [...Array(5)].map((_,i)=><tr key={i}><td colSpan={5}><div className="h-12 skeleton m-3 rounded" /></td></tr>) :
            categories.map(cat => (
              <tr key={cat.id} className="hover:bg-[var(--sattva-muted)]">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--sattva-muted)]">
                      <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-medium text-sm">{cat.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{cat.slug}</td>
                <td className="px-4 py-3 text-sm">{cat.order}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {cat.isActive ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openForm(cat)} className="p-1.5 rounded-lg hover:bg-[var(--sattva-muted)] text-[var(--sattva-forest)]"><Edit size={14} /></button>
                    <button onClick={() => deleteCat(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--sattva-surface)] rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-base font-semibold mb-4">{editing ? 'Edit Category' : 'New Category'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[{k:'name',l:'Name',req:true},{k:'image',l:'Image URL'},{k:'order',l:'Order',type:'number'}].map(f=>(
                <div key={f.k}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.l}</label>
                  <input type={f.type||'text'} value={form[f.k]} onChange={(e)=>setForm(p=>({...p,[f.k]:e.target.value}))} required={f.req}
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

export default AdminCategories;
