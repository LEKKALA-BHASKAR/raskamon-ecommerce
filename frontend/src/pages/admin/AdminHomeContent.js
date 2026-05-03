import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Save, X, Eye, EyeOff, ArrowUp, ArrowDown, Star, RotateCcw, Image as ImageIcon, Zap, MessageSquare, Sparkles, ShoppingBag, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSiteContent,
  saveHeroSlides,
  saveFlashSale,
  saveCurated,
  listTestimonialsAdmin,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  broadcastSiteContentChange,
} from '../../utils/siteContent';
import api from '../../utils/api';
import { MOCK_PRODUCTS } from '../../utils/mockData';

const TABS = [
  { id: 'hero', label: 'Hero Slides', icon: Sparkles },
  { id: 'bestsellers', label: 'Bestsellers', icon: ShoppingBag },
  { id: 'flash', label: 'Flash Sale', icon: Zap },
  { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
  { id: 'newarrivals', label: 'New Arrivals', icon: Package },
];

// ---------- Hero Slides ----------
const HeroEditor = ({ slides = [], onChange }) => {
  const update = (idx, patch) => onChange(slides.map((s, i) => i === idx ? { ...s, ...patch } : s));
  const remove = (idx) => onChange(slides.filter((_, i) => i !== idx));
  const move = (idx, dir) => {
    const next = [...slides];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  const add = () => onChange([...slides, {
    id: Date.now(),
    badge: 'New Collection',
    title: 'New Slide Title',
    subtitle: 'Add a compelling subtitle here.',
    primaryCtaLabel: 'Shop Now',
    primaryCtaLink: '/products',
    secondaryCtaLabel: 'Learn More',
    secondaryCtaLink: '/about',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=700&q=80',
    accent: '#A3E635',
    isActive: true,
  }]);

  const [uploads, setUploads] = useState({});

  const dragIndexRef = React.useRef(null);

  const handleDragStart = (e, idx) => {
    dragIndexRef.current = idx;
    try { e.dataTransfer.setData('text/plain', String(idx)); } catch (err) {}
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, idx) => {
    e.preventDefault();
    const from = (dragIndexRef.current !== null && dragIndexRef.current !== undefined)
      ? dragIndexRef.current
      : parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (isNaN(from)) return;
    if (from === idx) { dragIndexRef.current = null; return; }
    const next = [...slides];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    onChange(next);
    dragIndexRef.current = null;
  };

  const handleDragEnd = () => { dragIndexRef.current = null; };

  const handleUpload = async (e, idx) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const idKey = slides[idx]?.id ?? idx;
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!ALLOWED.includes(file.type)) {
      toast.error('Unsupported file type. Use JPG/PNG/WebP/GIF');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('File too large. Max 3MB');
      return;
    }

    try {
      const sigRes = await api.get('/upload/signature');
      const { signature, timestamp, cloud_name, api_key, folder } = sigRes.data;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('signature', signature);
      fd.append('timestamp', timestamp);
      fd.append('api_key', api_key);
      fd.append('folder', folder);

      setUploads(u => ({ ...u, [idKey]: { uploading: true, progress: 0 } }));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, true);
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const p = Math.round((evt.loaded / evt.total) * 100);
          setUploads(u => ({ ...u, [idKey]: { uploading: true, progress: p } }));
        }
      };
      xhr.onload = () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText);
            if (data && data.secure_url) {
              update(idx, { image: data.secure_url });
              toast.success('Image uploaded!');
            } else {
              toast.error('Upload failed');
            }
          } else {
            toast.error('Upload failed');
          }
        } catch (err) {
          toast.error('Upload failed');
        } finally {
          setUploads(u => ({ ...u, [idKey]: { uploading: false, progress: 0 } }));
        }
      };
      xhr.onerror = () => {
        toast.error('Upload failed');
        setUploads(u => ({ ...u, [idKey]: { uploading: false, progress: 0 } }));
      };
      xhr.send(fd);
    } catch (err) {
      toast.error('Upload failed');
      setUploads(u => ({ ...u, [idKey]: { uploading: false, progress: 0 } }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{slides.length} slide(s) · shown on homepage hero (auto-rotates every 6s)</p>
        <button onClick={add} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--sattva-forest)] text-white text-sm font-semibold hover:opacity-90"><Plus size={14} /> Add Slide</button>
      </div>
      {slides.map((s, idx) => {
        const idKey = s.id || idx;
        return (
          <div
            key={idKey}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={`bg-white rounded-2xl border p-5 ${s.isActive === false ? 'opacity-60' : ''} cursor-grab`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: `${s.accent}22`, color: s.accent }}>Slide #{idx + 1}</span>
                {s.isActive === false && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600">Hidden</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ArrowUp size={14} /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === slides.length - 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ArrowDown size={14} /></button>
                <button onClick={() => update(idx, { isActive: !(s.isActive !== false) })} className="p-2 rounded-lg hover:bg-gray-100">{s.isActive !== false ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                <button onClick={() => remove(idx)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Field label="Badge" value={s.badge} onChange={v => update(idx, { badge: v })} />
                  <Field label="Title (use \\n for line break)" value={s.title} onChange={v => update(idx, { title: v })} multiline />
                <Field label="Subtitle" value={s.subtitle} onChange={v => update(idx, { subtitle: v })} multiline />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Primary CTA Label" value={s.primaryCtaLabel} onChange={v => update(idx, { primaryCtaLabel: v })} />
                  <Field label="Primary CTA Link" value={s.primaryCtaLink} onChange={v => update(idx, { primaryCtaLink: v })} />
                  <Field label="Secondary CTA Label" value={s.secondaryCtaLabel} onChange={v => update(idx, { secondaryCtaLabel: v })} />
                  <Field label="Secondary CTA Link" value={s.secondaryCtaLink} onChange={v => update(idx, { secondaryCtaLink: v })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Accent Color (hex)" value={s.accent} onChange={v => update(idx, { accent: v })} />
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Color Picker</label>
                    <input type="color" value={s.accent || '#A3E635'} onChange={e => update(idx, { accent: e.target.value })} className="w-full h-11 rounded-xl border border-gray-200 cursor-pointer" />
                  </div>
                </div>
              </div>
              <div>
                <Field label="Image URL" value={s.image} onChange={v => update(idx, { image: v })} />
                <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200" style={{ aspectRatio: '4/5', maxHeight: 320 }}>
                  {s.image ? <img src={s.image} alt={s.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400"><ImageIcon size={32} /></div>}
                </div>
                <div className="flex gap-2 mt-3 items-center">
                  <label className="px-4 py-2 rounded-xl bg-[var(--sattva-muted)] text-[var(--sattva-forest)] text-sm font-medium cursor-pointer flex items-center gap-2">
                    <ImageIcon size={14} /> {uploads[idKey]?.uploading ? 'Uploading...' : 'Upload'}
                                  <input type="file" accept="image/avif,image/*" className="hidden" onChange={e => handleUpload(e, idx)} disabled={uploads[idKey]?.uploading} />
                  </label>
                  <button type="button" onClick={() => update(idx, { image: '' })} className="px-4 py-2 rounded-xl border border-gray-200 text-sm">Remove</button>
                </div>
                {uploads[idKey]?.uploading && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div style={{ width: `${uploads[idKey].progress}%` }} className="h-2 bg-[var(--sattva-forest)] rounded-full" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{uploads[idKey].progress}%</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- Product Picker (Bestsellers / New Arrivals / Flash Sale) ----------
const ProductPicker = ({ selectedIds = [], onChange, products, max }) => {
  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      if (max && selectedIds.length >= max) {
        toast.error(`Max ${max} products allowed`);
        return;
      }
      onChange([...selectedIds, id]);
    }
  };
  const move = (id, dir) => {
    const idx = selectedIds.indexOf(id);
    const next = [...selectedIds];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  const [search, setSearch] = useState('');
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Selected */}
      <div className="bg-white rounded-2xl border p-5">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Star size={14} className="text-[var(--sattva-gold)]" /> Selected ({selectedIds.length}{max ? `/${max}` : ''}) <span className="text-xs text-gray-400 font-normal">— displayed in this order</span>
        </h4>
        {selectedIds.length === 0 && <p className="text-sm text-gray-400 italic">No products selected. Click products from the right to add.</p>}
        <div className="space-y-2">
          {selectedIds.map((id, i) => {
            const p = products.find(x => x.id === id || x._id === id);
            if (!p) return null;
            return (
              <div key={id} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 hover:bg-gray-100">
                <span className="w-6 text-center text-xs font-bold text-gray-400">{i + 1}</span>
                <img src={p.images?.[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">₹{p.discountPrice} · {p.category}</p>
                </div>
                <button onClick={() => move(id, -1)} disabled={i === 0} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30"><ArrowUp size={12} /></button>
                <button onClick={() => move(id, 1)} disabled={i === selectedIds.length - 1} className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30"><ArrowDown size={12} /></button>
                <button onClick={() => toggle(id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><X size={12} /></button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Available */}
      <div className="bg-white rounded-2xl border p-5">
        <h4 className="font-semibold text-sm mb-3">Available Products</h4>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full mb-3 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--sattva-forest)]"
        />
        <div className="space-y-1 max-h-[480px] overflow-y-auto">
          {filtered.map(p => {
            const id = p.id || p._id;
            const sel = selectedIds.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${sel ? 'bg-[var(--sattva-forest)]/10 border border-[var(--sattva-forest)]/30' : 'hover:bg-gray-50'}`}
              >
                <img src={p.images?.[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">₹{p.discountPrice} · {p.category}</p>
                </div>
                {sel ? <span className="text-xs font-bold text-[var(--sattva-forest)]">✓ Added</span> : <Plus size={14} className="text-gray-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ---------- Flash Sale Editor ----------
const FlashSaleEditor = ({ config = {}, products, onChange }) => {
  const setField = (k, v) => onChange({ ...config, [k]: v });
  const dt = config.endsAt ? new Date(config.endsAt) : new Date(Date.now() + 8 * 3600000);
  const dtLocal = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Section Title" value={config.title} onChange={v => setField('title', v)} />
          <Field label="Subtitle" value={config.subtitle} onChange={v => setField('subtitle', v)} />
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Sale Ends At</label>
            <input
              type="datetime-local"
              value={dtLocal}
              onChange={e => setField('endsAt', new Date(e.target.value).getTime())}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-6">
            <input type="checkbox" checked={config.enabled !== false} onChange={e => setField('enabled', e.target.checked)} className="w-4 h-4 accent-[var(--sattva-forest)]" />
            <span className="text-sm font-medium">Show Flash Sale section on homepage</span>
          </label>
        </div>
      </div>
      <ProductPicker
        selectedIds={config.productIds || []}
        onChange={ids => setField('productIds', ids)}
        products={products}
        max={4}
      />
    </div>
  );
};

// ---------- Testimonials Editor ----------
const TestimonialsEditor = ({ items = [], onChange }) => {
  const update = (idx, patch) => onChange(items.map((t, i) => i === idx ? { ...t, ...patch } : t));
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, { id: `t${Date.now()}`, name: 'Customer Name', city: 'City', rating: 5, text: 'Great product!', isActive: true }]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{items.length} testimonial(s) · shown on homepage</p>
        <button onClick={add} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--sattva-forest)] text-white text-sm font-semibold hover:opacity-90"><Plus size={14} /> Add Testimonial</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((t, idx) => (
          <div key={t.id || idx} className={`bg-white rounded-2xl border p-5 ${t.isActive === false ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
              <div className="flex gap-1">
                <button onClick={() => update(idx, { isActive: !(t.isActive !== false) })} className="p-1.5 rounded-lg hover:bg-gray-100">{t.isActive !== false ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                <button onClick={() => remove(idx)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Field label="Name" value={t.name} onChange={v => update(idx, { name: v })} />
              <Field label="City" value={t.city} onChange={v => update(idx, { city: v })} />
            </div>
            <div className="mb-3">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => update(idx, { rating: n })}>
                    <Star size={20} className={n <= t.rating ? 'text-[var(--sattva-gold)] fill-current' : 'text-gray-300'} />
                  </button>
                ))}
              </div>
            </div>
            <Field label="Testimonial Text" value={t.text} onChange={v => update(idx, { text: v })} multiline rows={4} />
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------- Reusable Field ----------
const Field = ({ label, value = '', onChange, multiline, rows = 2 }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">{label}</label>
    {multiline ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)] resize-none" />
    ) : (
      <input value={value} onChange={e => onChange(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--sattva-forest)]" />
    )}
  </div>
);

// ---------- Main Page ----------
export default function AdminHomeContent() {
  const content = useSiteContent();
  const [active, setActive] = useState('hero');
  const [draft, setDraft] = useState(content);
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => { setDraft(content); }, [content.heroSlides, content.testimonials, content.flashSale, content.bestsellerIds, content.newArrivalIds]); // eslint-disable-line

  React.useEffect(() => {
    api.get('/products?limit=200').then(r => { if (r.data?.length) setProducts(r.data); }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      // Hero slides — replace full list
      await saveHeroSlides(draft.heroSlides || []);
      // Flash sale — replace config
      await saveFlashSale(draft.flashSale || {});
      // Curated lists
      await saveCurated('bestsellers', draft.bestsellerIds || []);
      await saveCurated('new-arrivals', draft.newArrivalIds || []);
      // Testimonials — diff against server
      const serverTestimonials = await listTestimonialsAdmin();
      const serverById = new Map(serverTestimonials.map(t => [t.id, t]));
      const draftTestimonials = draft.testimonials || [];
      const draftIds = new Set(draftTestimonials.map(t => t.id).filter(id => id && id.startsWith('t_')));

      // Deletes: on server but not in draft
      for (const t of serverTestimonials) {
        if (!draftIds.has(t.id)) await deleteTestimonial(t.id);
      }
      // Creates / Updates
      for (let i = 0; i < draftTestimonials.length; i++) {
        const t = { ...draftTestimonials[i], order: i };
        const payload = { name: t.name, city: t.city, rating: t.rating, text: t.text, avatar: t.avatar, isActive: t.isActive !== false, order: i };
        if (t.id && t.id.startsWith('t_') && serverById.has(t.id)) {
          await updateTestimonial(t.id, payload);
        } else {
          await createTestimonial(payload);
        }
      }
      await broadcastSiteContentChange();
      setSavedAt(Date.now());
      toast.success('Changes saved — live on homepage');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!window.confirm('Discard unsaved changes and reload from server?')) return;
    setDraft(content);
    toast.success('Draft reset');
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(content);

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold text-[var(--sattva-ink)]">Home Page Content</h2>
          <p className="text-sm text-gray-400 mt-0.5">Manage hero slides, bestsellers, flash sale, testimonials & new arrivals — all live on homepage</p>
        </div>
        <div className="flex items-center gap-3">
          {savedAt && !dirty && <span className="text-xs text-green-600 font-semibold">✓ Saved</span>}
          {dirty && <span className="text-xs text-amber-600 font-semibold">● Unsaved changes</span>}
          <button onClick={reset} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50"><RotateCcw size={14} /> Reset</button>
          <button onClick={save} disabled={!dirty || saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--sattva-forest)] text-white hover:opacity-90 disabled:opacity-50"><Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${active === t.id ? 'border-[var(--sattva-forest)] text-[var(--sattva-forest)]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {active === 'hero' && <HeroEditor slides={draft.heroSlides} onChange={v => setDraft({ ...draft, heroSlides: v })} />}
        {active === 'bestsellers' && (
          <ProductPicker
            selectedIds={draft.bestsellerIds || []}
            onChange={ids => setDraft({ ...draft, bestsellerIds: ids })}
            products={products}
            max={8}
          />
        )}
        {active === 'flash' && <FlashSaleEditor config={draft.flashSale} products={products} onChange={v => setDraft({ ...draft, flashSale: v })} />}
        {active === 'testimonials' && <TestimonialsEditor items={draft.testimonials} onChange={v => setDraft({ ...draft, testimonials: v })} />}
        {active === 'newarrivals' && (
          <ProductPicker
            selectedIds={draft.newArrivalIds || []}
            onChange={ids => setDraft({ ...draft, newArrivalIds: ids })}
            products={products}
            max={4}
          />
        )}
      </motion.div>
    </>
  );
}
