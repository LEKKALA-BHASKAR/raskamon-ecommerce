import React, { useState } from 'react';
import { toast } from 'sonner';

const AdminSettings = () => {
  const [form, setForm] = useState({
    storeName: 'Dr MediScie',
    storeEmail: 'hello@sattva.in',
    storePhone: '+91 98765 43210',
    gstNumber: '27AABCS1429B1Z',
    currency: 'INR',
    freeShippingAbove: 499,
    shippingCharge: 79,
    loyaltyPointsPerRupee: 0.01,
    minLoyaltyRedemption: 100,
    whatsappNumber: '919876543210',
  });

  const handleSave = (e) => {
    e.preventDefault();
    toast.success('Settings saved successfully!');
  };

  return (
    <>
      <h2 className="font-heading text-xl font-semibold mb-6">Store Settings</h2>
      <div className="max-w-2xl space-y-6">
        <form onSubmit={handleSave}>
          {/* Store Info */}
          <div className="card-sattva p-6 mb-4">
            <h3 className="font-semibold text-sm mb-4">Store Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {k:'storeName',l:'Store Name'},
                {k:'storeEmail',l:'Support Email',type:'email'},
                {k:'storePhone',l:'Phone Number'},
                {k:'gstNumber',l:'GST Number'},
                {k:'whatsappNumber',l:'WhatsApp Number'},
              ].map(f=>(
                <div key={f.k}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.l}</label>
                  <input type={f.type||'text'} value={form[f.k]} onChange={(e)=>setForm(p=>({...p,[f.k]:e.target.value}))}
                    className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]" />
                </div>
              ))}
            </div>
          </div>

          {/* Shipping */}
          <div className="card-sattva p-6 mb-4">
            <h3 className="font-semibold text-sm mb-4">Shipping Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Free Shipping Above (₹)</label>
                <input type="number" value={form.freeShippingAbove} onChange={(e)=>setForm(p=>({...p,freeShippingAbove:e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Standard Shipping (₹)</label>
                <input type="number" value={form.shippingCharge} onChange={(e)=>setForm(p=>({...p,shippingCharge:e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Loyalty */}
          <div className="card-sattva p-6 mb-4">
            <h3 className="font-semibold text-sm mb-4">Loyalty Points</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Points per ₹</label>
                <input type="number" step="0.01" value={form.loyaltyPointsPerRupee} onChange={(e)=>setForm(p=>({...p,loyaltyPointsPerRupee:e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Min Redemption (pts)</label>
                <input type="number" value={form.minLoyaltyRedemption} onChange={(e)=>setForm(p=>({...p,minLoyaltyRedemption:e.target.value}))}
                  className="w-full px-3 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none" />
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3">Save Settings</button>
        </form>
      </div>
    </>
  );
};

export default AdminSettings;
