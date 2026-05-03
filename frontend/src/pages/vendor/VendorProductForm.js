import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'sonner';
import { Package, ArrowLeft, Upload, X, Info } from 'lucide-react';

const Field = ({ label, required, children, hint }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

const inputCls = "w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)] bg-white";

const CATEGORIES = ['Healthcare', 'Wellness', 'Nutraceuticals', 'Ayurveda', 'Personal Care', 'Medical Equipment', 'Other'];
const GST_RATES = [0, 5, 12, 18, 28];

export default function VendorProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', category: '', subcategory: '', brand: '', sku: '',
    b2b_retail_price: '', b2b_vendor_price: '', mrp: '',
    stock: '', low_stock_threshold: 10, min_order_qty: 1,
    gst_rate: 18, weight: '', tags: '', images: []
  });

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/vendor/products/${id}`)
        .then(r => {
          const p = r.data.data;
          setForm({
            name: p.name || '', description: p.description || '',
            category: p.category || '', subcategory: p.subcategory || '',
            brand: p.brand || '', sku: p.sku || '',
            b2b_retail_price: p.b2b_retail_price || '', b2b_vendor_price: p.b2b_vendor_price || '',
            mrp: p.mrp || '', stock: p.stock ?? '', low_stock_threshold: p.low_stock_threshold ?? 10,
            min_order_qty: p.min_order_qty ?? 1, gst_rate: p.gst_rate ?? 18,
            weight: p.weight || '', tags: (p.tags || []).join(', '), images: p.images || []
          });
        })
        .catch(() => toast.error('Failed to load product'))
        .finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!ALLOWED.includes(file.type)) {
      toast.error('Unsupported file type. Use JPG/PNG/WEBP/AVIF/GIF');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('File too large. Max 5MB');
      return;
    }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = r.data.secure_url || r.data.url;
      setForm(prev => ({ ...prev, images: [...prev.images, url] }));
      toast.success('Image uploaded');
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (idx) => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const retail = parseFloat(form.b2b_retail_price);
    const vendor = parseFloat(form.b2b_vendor_price);
    if (isNaN(retail) || isNaN(vendor)) { toast.error('Enter valid prices'); return; }
    if (vendor >= retail) { toast.error('Vendor wholesale price must be less than B2B retail price'); return; }

    const payload = {
      ...form,
      b2b_retail_price: retail,
      b2b_vendor_price: vendor,
      mrp: parseFloat(form.mrp) || retail,
      stock: parseInt(form.stock) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
      min_order_qty: parseInt(form.min_order_qty) || 1,
      gst_rate: parseFloat(form.gst_rate) || 18,
      weight: parseFloat(form.weight) || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/vendor/products/${id}`, payload);
        toast.success('Product updated and re-submitted for approval');
      } else {
        await api.post('/vendor/products', payload);
        toast.success('Product submitted for admin approval!');
      }
      navigate('/vendor/products');
    } catch (err) {
      const msg = err?.response?.data?.detail?.message || err?.response?.data?.detail || 'Save failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/vendor/products')} className="p-2 rounded-xl hover:bg-[var(--sattva-muted)]">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-[var(--sattva-ink)]">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
          <p className="text-sm text-gray-500">All products are B2B-only and require admin approval before going live</p>
        </div>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl mb-6 text-sm text-blue-800">
        <Info size={15} className="mt-0.5 shrink-0" />
        <span>Products are visible only to approved B2B buyers and vendors after admin approval. Set two prices: one for B2B buyers, one for other vendors (wholesale).</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-6">
          <h2 className="font-semibold text-[var(--sattva-ink)] mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Product Name" required className="col-span-2">
              <input value={form.name} onChange={e => set('name', e.target.value)} required className={inputCls} placeholder="e.g. Ashwagandha Extract 500mg" />
            </Field>
            <Field label="Category" required>
              <select value={form.category} onChange={e => set('category', e.target.value)} required className={inputCls}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Subcategory">
              <input value={form.subcategory} onChange={e => set('subcategory', e.target.value)} className={inputCls} placeholder="Optional" />
            </Field>
            <Field label="Brand">
              <input value={form.brand} onChange={e => set('brand', e.target.value)} className={inputCls} placeholder="Leave blank to use store name" />
            </Field>
            <Field label="SKU">
              <input value={form.sku} onChange={e => set('sku', e.target.value)} className={inputCls} placeholder="Optional — auto-generated if empty" />
            </Field>
            <Field label="Description" required className="col-span-2">
              <textarea value={form.description} onChange={e => set('description', e.target.value)} required rows={4} className={inputCls} placeholder="Detailed product description..." />
            </Field>
            <Field label="Tags" className="col-span-2">
              <input value={form.tags} onChange={e => set('tags', e.target.value)} className={inputCls} placeholder="ayurveda, herbal, supplement (comma separated)" />
            </Field>
          </div>
        </div>

        {/* Dual Pricing */}
        <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-6">
          <h2 className="font-semibold text-[var(--sattva-ink)] mb-1">Dual Pricing</h2>
          <p className="text-xs text-gray-500 mb-4">These prices are completely isolated — each B2B account type sees only their applicable price</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="MRP" hint="Maximum retail price">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input type="number" value={form.mrp} onChange={e => set('mrp', e.target.value)} className={`${inputCls} pl-7`} placeholder="0.00" />
              </div>
            </Field>
            <Field label="B2B Retail Price" required hint="Shown to approved B2B buyers">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input type="number" value={form.b2b_retail_price} onChange={e => set('b2b_retail_price', e.target.value)} required className={`${inputCls} pl-7 border-green-300 focus:ring-green-400`} placeholder="0.00" />
              </div>
            </Field>
            <Field label="Vendor/Wholesale Price" required hint="Shown when other vendors buy from you">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input type="number" value={form.b2b_vendor_price} onChange={e => set('b2b_vendor_price', e.target.value)} required className={`${inputCls} pl-7 border-amber-300 focus:ring-amber-400`} placeholder="0.00" />
              </div>
            </Field>
          </div>
          {form.b2b_retail_price && form.b2b_vendor_price && (
            <div className={`mt-3 p-2 rounded-lg text-xs font-medium ${parseFloat(form.b2b_vendor_price) < parseFloat(form.b2b_retail_price) ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {parseFloat(form.b2b_vendor_price) < parseFloat(form.b2b_retail_price)
                ? `✓ Margin: ₹${(parseFloat(form.b2b_retail_price) - parseFloat(form.b2b_vendor_price)).toFixed(2)} (${((1 - parseFloat(form.b2b_vendor_price) / parseFloat(form.b2b_retail_price)) * 100).toFixed(0)}% discount for other vendors)`
                : '✗ Vendor price must be less than B2B retail price'}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Field label="GST Rate (%)">
              <select value={form.gst_rate} onChange={e => set('gst_rate', e.target.value)} className={inputCls}>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </Field>
            <Field label="Minimum Order Quantity">
              <input type="number" value={form.min_order_qty} onChange={e => set('min_order_qty', e.target.value)} className={inputCls} min="1" />
            </Field>
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-6">
          <h2 className="font-semibold text-[var(--sattva-ink)] mb-4">Inventory</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Current Stock" required>
              <input type="number" value={form.stock} onChange={e => set('stock', e.target.value)} required className={inputCls} min="0" placeholder="0" />
            </Field>
            <Field label="Low Stock Alert At">
              <input type="number" value={form.low_stock_threshold} onChange={e => set('low_stock_threshold', e.target.value)} className={inputCls} min="0" />
            </Field>
            <Field label="Weight (kg)">
              <input type="number" value={form.weight} onChange={e => set('weight', e.target.value)} className={inputCls} step="0.01" placeholder="Optional" />
            </Field>
          </div>
        </div>

        {/* Images */}
        <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-6">
          <h2 className="font-semibold text-[var(--sattva-ink)] mb-4">Product Images</h2>
          <div className="flex flex-wrap gap-3 mb-3">
            {form.images.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt="" className="w-24 h-24 object-cover rounded-xl border" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-[color:var(--sattva-border)] rounded-xl cursor-pointer hover:bg-[var(--sattva-muted)] transition-colors">
              {uploadingImage ? (
                <div className="text-xs text-gray-400">Uploading...</div>
              ) : (
                <>
                  <Upload size={18} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400 mt-1">Upload</span>
                </>
              )}
              <input type="file" accept="image/avif,image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
            </label>
          </div>
          <p className="text-[11px] text-gray-400">Upload up to 8 images. First image is the thumbnail.</p>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[var(--sattva-forest)] text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-60">
            {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Submit for Approval'}
          </button>
          <button type="button" onClick={() => navigate('/vendor/products')} className="px-6 py-2.5 border border-[color:var(--sattva-border)] rounded-xl font-semibold text-sm hover:bg-[var(--sattva-muted)]">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
