import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'sonner';

const COUPON_TYPES = ['flat', 'percentage', 'free_shipping'];

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', type: 'percentage', value: '', minOrder: 0, maxDiscount: '', maxUses: '', expiresAt: '', isActive: true, description: '' });

  const fetchCoupons = async () => {
    setLoading(true);
    api.get('/admin/coupons').then(r => setCoupons(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openForm = (coupon = null) => {
    if (coupon) {
      setEditing(coupon.id);
      setForm({ ...coupon, value: coupon.value, expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0,16) : '' });
    } else {
      setEditing(null);
      setForm({ code: '', type: 'percentage', value: '', minOrder: 0, maxDiscount: '', maxUses: '', expiresAt: '', isActive: true, description: '' });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, value: parseFloat(form.value), minOrder: parseFloat(form.minOrder || 0), maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null, maxUses: form.maxUses ? parseInt(form.maxUses) : null };
      if (editing) { await api.put(`/admin/coupons/${editing}`, payload); toast.success('Coupon updated'); }
      else { await api.post('/admin/coupons', payload); toast.success('Coupon created'); }
      setShowForm(false);
      fetchCoupons();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const deleteCoupon = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    await api.delete(`/admin/coupons/${id}`);
    toast.success('Deleted');
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-semibold">Coupons</h2>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-2 py-2.5 px-5 text-sm"><Plus size={16} /> Create Coupon</button>
      </div>

      <div className="card-sattva overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
            <tr>
              {['Code','Type','Value','Min Order','Used/Max','Expires','Status',''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--sattva-border)]">
            {loading ? [...Array(4)].map((_,i) => <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-8 skeleton rounded" /></td></tr>) :
            coupons.map(c => (
              <tr key={c.id} className="hover:bg-[var(--sattva-muted)]">
                <td className="px-4 py-3 font-mono font-bold text-sm text-[var(--sattva-forest)]">{c.code}</td>
                <td className="px-4 py-3 text-sm capitalize">{c.type.replace('_',' ')}</td>
                <td className="px-4 py-3 text-sm">{c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}</td>
                <td className="px-4 py-3 text-sm">₹{c.minOrder}</td>
                <td className="px-4 py-3 text-sm">{c.usedBy?.length || 0}{c.maxUses ? `/${c.maxUses}` : '/∞'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN') : 'No expiry'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{c.isActive ? 'Active' : 'Off'}</span></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openForm(c)} className="p-1.5 rounded-lg hover:bg-[var(--sattva-muted)] text-[var(--sattva-forest)]"><Edit size={14} /></button>
                    <button onClick={() => deleteCoupon(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--sattva-surface)] rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading text-base font-semibold mb-4">{editing ? 'Edit Coupon' : 'Create Coupon'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[{k:'code',l:'Code',req:true},{k:'description',l:'Description'},{k:'minOrder',l:'Min Order (₹)',type:'number'},{k:'maxDiscount',l:'Max Discount (₹)',type:'number'},{k:'maxUses',l:'Max Uses',type:'number'}].map(f=>(
                <div key={f.k}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.l}</label>
                  <input type={f.type||'text'} value={form[f.k]} onChange={(e)=>setForm(p=>({...p,[f.k]:e.target.value}))} required={f.req}
                    className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg focus:outline-none" />
                </div>
              ))}
              <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Type</label>
                <select value={form.type} onChange={(e)=>setForm(p=>({...p,type:e.target.value}))} className="w-full px-3 py-2 text-sm border rounded-lg">
                  {COUPON_TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Value ({form.type==='percentage'?'%':'₹'})</label>
                <input type="number" value={form.value} onChange={(e)=>setForm(p=>({...p,value:e.target.value}))} required className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none" />
              </div>
              <div><label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Expires At</label>
                <input type="datetime-local" value={form.expiresAt} onChange={(e)=>setForm(p=>({...p,expiresAt:e.target.value}))} className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
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
    </>
  );
};

export default AdminCoupons;
