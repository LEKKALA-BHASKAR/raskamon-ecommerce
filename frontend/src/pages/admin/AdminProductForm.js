import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Plus, Upload } from 'lucide-react';
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

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const sigRes = await api.get('/upload/signature');
      const { signature, timestamp, cloud_name, api_key, folder } = sigRes.data;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('signature', signature);
      fd.append('timestamp', timestamp);
      fd.append('api_key', api_key);
      fd.append('folder', folder);
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: fd });
      const data = await uploadRes.json();
      if (data.secure_url) {
        setForm(f => ({ ...f, images: [...(f.images || []), data.secure_url] }));
        toast.success('Image uploaded!');
      }
    } catch {
      toast.error('Upload failed');
    }
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
    <>
      <div className="max-w-3xl">
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
                <select value={form.category} onChange={(e) => handleChange('category', e.target.value)} required
                  className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none">
                  <option value="">Select category</option>
                  {categories.filter(c=>!c.parent).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

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
            <h3 className="font-semibold text-sm mb-4">Product Images</h3>
            <div className="flex gap-2 mb-4">
              <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Enter image URL"
                className="flex-1 px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none"
              />
              <button type="button" onClick={addImage} className="px-4 py-2.5 bg-[var(--sattva-muted)] text-[var(--sattva-forest)] text-sm font-medium rounded-xl hover:bg-[var(--sattva-border)] transition-colors">
                Add URL
              </button>
              <label className="px-4 py-2.5 bg-[var(--sattva-forest)] text-[var(--sattva-cream)] text-sm font-medium rounded-xl cursor-pointer hover:bg-[#152f28] transition-colors flex items-center gap-2">
                <Upload size={14} /> Upload
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              {form.images?.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-[var(--sattva-muted)]">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/admin/products')} className="flex-1 btn-outlined py-3">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-3">
              {saving ? 'Saving...' : isNew ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AdminProductForm;
