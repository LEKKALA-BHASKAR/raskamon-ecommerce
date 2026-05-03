import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Edit, Trash2, ChevronRight, FolderTree, Folder } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'sonner';

const EMPTY_FORM = { name: '', image: '', order: 0, isActive: true, parent: null };

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState({});

  const fetchCategories = () => {
    setLoading(true);
    api.get('/admin/categories')
      .then(r => setCategories(r.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  // Build parent → children index
  const { parents, childrenByParent } = useMemo(() => {
    const parents = categories.filter(c => !c.parent);
    const childrenByParent = {};
    for (const c of categories) {
      if (c.parent) {
        if (!childrenByParent[c.parent]) childrenByParent[c.parent] = [];
        childrenByParent[c.parent].push(c);
      }
    }
    return { parents, childrenByParent };
  }, [categories]);

  const openForm = (cat = null, presetParent = null) => {
    setEditing(cat?.id || null);
    if (cat) {
      setForm({
        name: cat.name || '',
        image: cat.image || '',
        order: cat.order ?? 0,
        isActive: cat.isActive !== false,
        parent: cat.parent || null,
      });
    } else {
      setForm({ ...EMPTY_FORM, parent: presetParent, order: categories.length + 1 });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        image: form.image || null,
        order: parseInt(form.order) || 0,
        isActive: !!form.isActive,
        parent: form.parent || null,
      };
      if (editing) {
        await api.put(`/admin/categories/${editing}`, payload);
        toast.success('Category updated');
      } else {
        await api.post('/admin/categories', payload);
        toast.success('Category created');
      }
      setShowForm(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const deleteCat = async (cat) => {
    const childCount = (childrenByParent[cat.id] || []).length;
    const msg = childCount > 0
      ? `Delete "${cat.name}" and its ${childCount} sub-categor${childCount === 1 ? 'y' : 'ies'}?`
      : `Delete "${cat.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      // Delete children first
      for (const child of (childrenByParent[cat.id] || [])) {
        await api.delete(`/admin/categories/${child.id}`);
      }
      await api.delete(`/admin/categories/${cat.id}`);
      toast.success('Deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    }
  };

  const toggleExpand = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const renderRow = (cat, isChild = false) => {
    const kids = childrenByParent[cat.id] || [];
    const isOpen = expanded[cat.id] !== false; // default open
    return (
      <React.Fragment key={cat.id}>
        <tr className="hover:bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
          <td className="px-4 py-3">
            <div className={`flex items-center gap-3 ${isChild ? 'pl-8' : ''}`}>
              {!isChild && kids.length > 0 ? (
                <button onClick={() => toggleExpand(cat.id)} className="p-0.5 rounded hover:bg-gray-200">
                  <ChevronRight size={14} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
              ) : (
                <span className="w-[18px]" />
              )}
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-[var(--sattva-muted)] flex items-center justify-center flex-shrink-0">
                {cat.image
                  ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                  : (isChild ? <Folder size={14} className="text-gray-400" /> : <FolderTree size={14} className="text-gray-400" />)}
              </div>
              <div>
                <p className="font-medium text-sm text-[var(--sattva-ink)]">{cat.name}</p>
                {!isChild && kids.length > 0 && (
                  <p className="text-[10px] text-gray-400">{kids.length} sub-categor{kids.length === 1 ? 'y' : 'ies'}</p>
                )}
                {isChild && <p className="text-[10px] text-gray-400">sub-category</p>}
              </div>
            </div>
          </td>
          <td className="px-4 py-3 text-sm text-gray-500">{cat.slug}</td>
          <td className="px-4 py-3 text-sm">{cat.order}</td>
          <td className="px-4 py-3">
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${cat.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {cat.isActive !== false ? 'Active' : 'Hidden'}
            </span>
          </td>
          <td className="px-4 py-3">
            <div className="flex gap-1 justify-end">
              {!isChild && (
                <button
                  onClick={() => openForm(null, cat.id)}
                  title="Add sub-category"
                  className="px-2 py-1 rounded-lg hover:bg-[var(--sattva-muted)] text-[var(--sattva-forest)] text-xs font-semibold flex items-center gap-1"
                >
                  <Plus size={12} /> Sub
                </button>
              )}
              <button onClick={() => openForm(cat)} className="p-1.5 rounded-lg hover:bg-[var(--sattva-muted)] text-[var(--sattva-forest)]"><Edit size={14} /></button>
              <button onClick={() => deleteCat(cat)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
            </div>
          </td>
        </tr>
        {!isChild && isOpen && kids.map(child => renderRow(child, true))}
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold">Categories</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage top-level categories and their sub-categories</p>
        </div>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-2 py-2.5 px-5 text-sm">
          <Plus size={16} /> Add Category
        </button>
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
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => <tr key={i}><td colSpan={5}><div className="h-12 skeleton m-3 rounded" /></td></tr>)
            ) : parents.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">No categories yet. Click "Add Category" to create your first one.</td></tr>
            ) : (
              parents.map(cat => renderRow(cat, false))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--sattva-surface)] rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-base font-semibold mb-4">
              {editing ? 'Edit Category' : (form.parent ? 'New Sub-Category' : 'New Category')}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Parent Category</label>
                <select
                  value={form.parent || ''}
                  onChange={(e) => setForm(p => ({ ...p, parent: e.target.value || null }))}
                  className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg bg-[var(--sattva-surface)] focus:outline-none"
                >
                  <option value="">— None (top-level category) —</option>
                  {parents
                    .filter(p => !editing || p.id !== editing)
                    .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Leave as "None" for a main category, or pick a parent to create a sub-category.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Image URL</label>
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm(p => ({ ...p, image: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm(p => ({ ...p, order: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />
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
    </>
  );
};

export default AdminCategories;
