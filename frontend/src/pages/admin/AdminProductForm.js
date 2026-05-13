import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Plus, Upload, GripVertical, Image as ImageIcon } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'sonner';

const INITIAL = {
  name: '', description: '', price: '', discountPrice: '', stock: '',
  sku: '', category: '', subcategory: '', brand: '',
  tags: '', images: [], isFeatured: false, isActive: true,
  ingredients: '', howToUse: '',
  seoMeta: { title: '', description: '' }
};

const AdminProductForm = () => {
  const { id } = useParams();
  const isNew = id === 'new' || !id;
  const [form, setForm] = useState(INITIAL);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data));
    if (!isNew) {
      api.get(`/admin/products/${id}`).then(r => {
        const p = r.data;
        setForm({...p, tags: (p.tags || []).join(', '), price: p.price || '', discountPrice: p.discountPrice || ''});
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [id, isNew]);

  const handleChange = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const addImage = () => {
    if (!imageUrl.trim()) return;
    setForm(f => ({ ...f, images: [...(f.images || []), imageUrl.trim()] }));
    setImageUrl('');
  };

  const removeImage = (i) => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  const uploadFiles = useCallback(async (files) => {
    const MAX_BYTES = 5 * 1024 * 1024;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    const validFiles = Array.from(files).filter(f => {
      if (!ALLOWED.includes(f.type)) { toast.error(`${f.name}: unsupported type`); return false; }
      if (f.size > MAX_BYTES) { toast.error(`${f.name}: too large (max 5MB)`); return false; }
      return true;
    });
    if (!validFiles.length) return;
    setUploading(true);
    try {
      const sigRes = await api.get('/upload/signature');
      const { signature, timestamp, cloud_name, api_key, folder } = sigRes.data;
      const uploads = validFiles.map(async (file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('signature', signature);
        fd.append('timestamp', timestamp);
        fd.append('api_key', api_key);
        fd.append('folder', folder);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: fd });
        const data = await res.json();
        return data.secure_url || null;
      });
      const urls = (await Promise.all(uploads)).filter(Boolean);
      if (urls.length) {
        setForm(f => ({ ...f, images: [...(f.images || []), ...urls] }));
        toast.success(`${urls.length} image${urls.length > 1 ? 's' : ''} uploaded!`);
      }
    } catch {
      toast.error('Upload failed');
    } finally { setUploading(false); }
  }, []);

  const handleUpload = (e) => {
    const files = e.target.files;
    if (files?.length) uploadFiles(files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files?.length) uploadFiles(files);
  };

  const moveImage = (from, to) => {
    setForm(f => {
      const imgs = [...(f.images || [])];
      const [moved] = imgs.splice(from, 1);
      imgs.splice(to, 0, moved);
      return { ...f, images: imgs };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        discountPrice: parseFloat(form.discountPrice),
        stock: parseInt(form.stock),
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      };
      if (isNew) {
        await api.post('/admin/products', payload);
        toast.success('Product created!');
      } else {
        await api.put(`/admin/products/${id}`, payload);
        toast.success('Product updated!');
      }
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return <><div className="space-y-4">{[1,2,3].map(i=><div key={i} className="h-12 skeleton rounded-xl"/>)}</div></>;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="max-w-3xl w-full">
        <h2 className="font-heading text-xl font-semibold mb-6">{isNew ? 'Add New Product' : 'Edit Product'}</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="card-sattva p-6">
            <h3 className="font-semibold text-sm mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[{key:'name',label:'Product Name',required:true,full:true},{key:'brand',label:'Brand'},{key:'sku',label:'SKU'},{key:'price',label:'MRP (₹)',type:'number'},{key:'discountPrice',label:'Sale Price (₹)',type:'number'},{key:'stock',label:'Stock',type:'number'}].map(f => (
                <div key={f.key} className={f.full ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.label}{f.required && ' *'}</label>
                  <input
                    type={f.type || 'text'}
                    value={form[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    required={f.required}
                    className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category *</label>
                <select value={form.category} onChange={(e) => { handleChange('category', e.target.value); handleChange('subcategory', ''); }} required
                  className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none">
                  <option value="">Select category</option>
                  {categories.filter(c=>!c.parent).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              {(() => {
                const parentCat = categories.find(c => !c.parent && c.name === form.category);
                const subs = parentCat ? categories.filter(c => c.parent === parentCat.id) : [];
                if (!parentCat || subs.length === 0) return null;
                return (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sub-Category</label>
                    <select value={form.subcategory || ''} onChange={(e) => handleChange('subcategory', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none">
                      <option value="">— None —</option>
                      {subs.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tags (comma-separated)</label>
                <input type="text" value={form.tags} onChange={(e) => handleChange('tags', e.target.value)}
                  placeholder="skincare, serum, brightening"
                  className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => handleChange('isFeatured', e.target.checked)} />
                  <span className="text-sm font-medium">Featured Product</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => handleChange('isActive', e.target.checked)} />
                  <span className="text-sm font-medium">Active (Published)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card-sattva p-6">
            <h3 className="font-semibold text-sm mb-4">Description & Details</h3>
            <div className="space-y-3">
              {[{key:'description',label:'Description',rows:4},{key:'ingredients',label:'Ingredients',rows:3},{key:'howToUse',label:'How to Use',rows:3}].map(f=>(
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.label}</label>
                  <textarea value={form[f.key]} onChange={(e) => handleChange(f.key, e.target.value)} rows={f.rows}
                    className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none resize-none" />
                </div>
              ))}
            </div>
          </div>

          {/* Images */}
          <div className="card-sattva p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Product Images</h3>
              <span className="text-xs text-gray-400">{form.images?.length || 0} image{(form.images?.length || 0) !== 1 ? 's' : ''}</span>
            </div>

            {/* Drag & drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-6 mb-4 text-center transition-colors ${
                dragOver ? 'border-[var(--sattva-gold)] bg-[var(--sattva-gold)]/5' : 'border-[var(--sattva-border)] hover:border-[var(--sattva-forest)]'
              }`}
            >
              <ImageIcon size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500 mb-1">
                {uploading ? 'Uploading...' : 'Drag & drop images here, or'}
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--sattva-forest)] text-[var(--sattva-cream)] text-sm font-medium rounded-lg cursor-pointer hover:bg-[#152f28] transition-colors">
                <Upload size={14} /> Browse Files
                <input type="file" accept="image/avif,image/*" multiple onChange={handleUpload} className="hidden" />
              </label>
              <p className="text-[10px] text-gray-400 mt-2">JPG, PNG, WEBP, AVIF, GIF — Max 5MB each — Select multiple files</p>
              {uploading && (
                <div className="absolute inset-0 bg-white/70 rounded-xl flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[var(--sattva-forest)] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* URL input */}
            <div className="flex gap-2 mb-4">
              <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Or paste image URL..."
                className="flex-1 px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }}
              />
              <button type="button" onClick={addImage} className="px-4 py-2 bg-[var(--sattva-muted)] text-[var(--sattva-forest)] text-sm font-medium rounded-lg hover:bg-[var(--sattva-border)] transition-colors">
                <Plus size={14} />
              </button>
            </div>

            {/* Image grid with reordering */}
            {form.images?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {form.images.map((img, i) => (
                  <div
                    key={`${img}-${i}`}
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (dragIdx !== null && dragIdx !== i) moveImage(dragIdx, i); setDragIdx(null); }}
                    onDragEnd={() => setDragIdx(null)}
                    className={`group relative aspect-square rounded-xl overflow-hidden bg-[var(--sattva-muted)] border-2 transition-all cursor-grab active:cursor-grabbing ${
                      dragIdx === i ? 'border-[var(--sattva-gold)] opacity-50 scale-95' : 'border-transparent hover:border-[var(--sattva-forest)]'
                    }`}
                  >
                    <img src={img} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-[var(--sattva-gold)] text-[var(--sattva-forest-deep)] rounded">
                        Main
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                      <GripVertical size={14} className="text-white" />
                    </div>
                    <button type="button" onClick={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600">
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {form.images?.length > 1 && (
              <p className="text-[10px] text-gray-400 mt-2">Drag images to reorder. First image is the main product image.</p>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/admin/products')} className="flex-1 btn-outlined py-3">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-3">
              {saving ? 'Saving...' : isNew ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      {/* Product Preview Panel */}
      <div className="w-full lg:max-w-sm bg-white rounded-xl shadow p-6 h-fit sticky top-6">
        <h3 className="font-semibold text-lg mb-4">Product Preview</h3>
        <div className="flex flex-col items-center gap-3">
          <div className="w-40 h-40 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {form.images && form.images.length > 0 ? (
              <img src={form.images[0]} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400">No Image</span>
            )}
          </div>
          <div className="w-full text-center">
            <p className="font-bold text-lg line-clamp-1">{form.name || <span className='text-gray-400'>Product Name</span>}</p>
            <p className="text-sm text-gray-500 mb-1">{form.brand || <span className='text-gray-300'>Brand</span>}</p>
            <p className="text-xs text-gray-400 mb-2">{form.category || <span className='text-gray-200'>Category</span>}</p>
            <div className="flex justify-center items-baseline gap-2 mb-2">
              {form.discountPrice ? (
                <span className="text-xl font-semibold text-green-700">₹{form.discountPrice}</span>
              ) : (
                <span className="text-xl font-semibold text-gray-400">₹0</span>
              )}
              {form.price && form.price > form.discountPrice ? (
                <span className="text-sm line-through text-gray-400">₹{form.price}</span>
              ) : null}
            </div>
            <span className={`text-xs font-medium ${form.stock === '0' ? 'text-red-500' : form.stock <= 10 ? 'text-orange-500' : 'text-green-600'}`}>
              Stock: {form.stock || 0}
            </span>
            <div className="mt-2 text-xs text-gray-500 line-clamp-2 min-h-[2em]">{form.description || <span className='text-gray-300'>Description...</span>}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProductForm;
