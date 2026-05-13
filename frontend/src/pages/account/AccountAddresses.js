import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Check, Home, Briefcase, MoreHorizontal, X } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'sonner';

const ADDRESS_TYPES = [
  { value: 'home',  label: 'Home',  icon: Home },
  { value: 'work',  label: 'Work',  icon: Briefcase },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
];

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
  'Chandigarh','Puducherry','Lakshadweep','Andaman & Nicobar Islands','Dadra & Nagar Haveli',
];

const EMPTY_FORM = {
  name: '', phone: '', addressLine1: '', addressLine2: '',
  city: '', state: '', pincode: '', addressType: 'home', isDefault: false,
};

function AddressForm({ initial = EMPTY_FORM, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g,''))) e.phone = 'Enter valid 10-digit phone';
    if (!form.addressLine1.trim()) e.addressLine1 = 'Address line 1 is required';
    if (!form.city.trim()) e.city = 'City is required';
    if (!form.state) e.state = 'State is required';
    if (!/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter valid 6-digit PIN';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const set = (k, v) => {
    setForm(f => ({...f, [k]: v}));
    if (errors[k]) setErrors(e => ({...e, [k]: undefined}));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSave(form);
  };

  const inp = 'w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-1 focus:ring-[var(--sattva-forest)] bg-white';
  const err = 'border-red-300 focus:ring-red-400';
  const ok  = 'border-[color:var(--sattva-border)]';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Address type toggle */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Address Type</label>
        <div className="flex gap-2">
          {ADDRESS_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('addressType', value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl border transition-all ${
                form.addressType === value
                  ? 'bg-[var(--sattva-forest)] text-white border-[var(--sattva-forest)]'
                  : 'border-[color:var(--sattva-border)] text-gray-600 hover:border-[var(--sattva-forest)]'
              }`}
            >
              <Icon size={13}/> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Full Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className={`${inp} ${errors.name ? err : ok}`} placeholder="Recipient name" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Mobile Number *</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)}
            className={`${inp} ${errors.phone ? err : ok}`} placeholder="10-digit mobile" maxLength={10} />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Address Line 1 *</label>
        <input value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)}
          className={`${inp} ${errors.addressLine1 ? err : ok}`} placeholder="Flat / House No., Building, Street" />
        {errors.addressLine1 && <p className="text-xs text-red-500 mt-1">{errors.addressLine1}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Address Line 2</label>
        <input value={form.addressLine2} onChange={e => set('addressLine2', e.target.value)}
          className={`${inp} ${ok}`} placeholder="Area, Colony, Landmark (optional)" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">City *</label>
          <input value={form.city} onChange={e => set('city', e.target.value)}
            className={`${inp} ${errors.city ? err : ok}`} placeholder="City" />
          {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">State *</label>
          <select value={form.state} onChange={e => set('state', e.target.value)}
            className={`${inp} ${errors.state ? err : ok}`}>
            <option value="">Select</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">PIN Code *</label>
          <input value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g,'').slice(0,6))}
            className={`${inp} ${errors.pincode ? err : ok}`} placeholder="6-digit PIN" maxLength={6} />
          {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={form.isDefault} onChange={e => set('isDefault', e.target.checked)}
          className="w-4 h-4 accent-[var(--sattva-forest)] rounded" />
        <span className="text-sm text-gray-600">Set as default delivery address</span>
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 text-sm font-semibold bg-[var(--sattva-forest)] text-white rounded-xl hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Address'}
        </button>
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 text-sm text-gray-500 border border-[color:var(--sattva-border)] rounded-xl hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AccountAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // null | 'add' | { editing: address }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/users/me/addresses')
      .then(r => setAddresses(r.data || []))
      .catch(() => toast.error('Failed to load addresses'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (mode?.editing) {
        const updated = await api.put(`/users/me/addresses/${mode.editing.id}`, form);
        setAddresses(a => a.map(x => x.id === mode.editing.id ? updated.data : x));
        toast.success('Address updated');
      } else {
        const created = await api.post('/users/me/addresses', form);
        if (form.isDefault) {
          setAddresses(a => a.map(x => ({...x, isDefault: false})));
        }
        setAddresses(a => [...a, created.data]);
        toast.success('Address added');
      }
      setMode(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save address');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await api.delete(`/users/me/addresses/${id}`);
      setAddresses(a => {
        const filtered = a.filter(x => x.id !== id);
        if (filtered.length && !filtered.some(x => x.isDefault)) filtered[0].isDefault = true;
        return filtered;
      });
      toast.success('Address deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const setDefault = async (id) => {
    try {
      await api.post(`/users/me/addresses/${id}/set-default`);
      setAddresses(a => a.map(x => ({...x, isDefault: x.id === id})));
      toast.success('Default address updated');
    } catch { toast.error('Failed to update'); }
  };

  const typeIcon = (type) => {
    const cfg = ADDRESS_TYPES.find(t => t.value === type) || ADDRESS_TYPES[0];
    const Icon = cfg.icon;
    return <Icon size={13}/>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading text-xl font-semibold text-[var(--sattva-ink)]">Saved Addresses</h2>
        {!mode && (
          <button onClick={() => setMode('add')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[var(--sattva-forest)] text-white rounded-xl hover:opacity-90">
            <Plus size={14}/> Add Address
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {mode && (
        <div className="card-sattva p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--sattva-ink)]">
              {mode === 'add' ? 'Add New Address' : 'Edit Address'}
            </h3>
            <button onClick={() => setMode(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X size={16} className="text-gray-500"/>
            </button>
          </div>
          <AddressForm
            initial={mode?.editing ? mode.editing : EMPTY_FORM}
            onSave={handleSave}
            onClose={() => setMode(null)}
            saving={saving}
          />
        </div>
      )}

      {/* Address cards */}
      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => (
            <div key={i} className="card-sattva p-5 animate-pulse space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-full bg-gray-100 rounded" />
              <div className="h-3 w-2/3 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : addresses.length === 0 && !mode ? (
        <div className="card-sattva p-12 text-center">
          <MapPin size={44} className="text-gray-200 mx-auto mb-4"/>
          <p className="font-medium text-gray-500 mb-1">No saved addresses</p>
          <p className="text-sm text-gray-400 mb-5">Add an address for faster checkout</p>
          <button onClick={() => setMode('add')}
            className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm">
            <Plus size={14}/> Add Address
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(addr => (
            <div key={addr.id} className={`card-sattva p-4 transition-all ${addr.isDefault ? 'ring-1 ring-[var(--sattva-forest)]' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--sattva-forest)]/10 flex items-center justify-center flex-shrink-0 text-[var(--sattva-forest)]">
                  {typeIcon(addr.addressType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-sm text-[var(--sattva-ink)]">{addr.name}</span>
                    <span className="text-xs text-gray-400 capitalize border border-gray-200 px-2 py-0.5 rounded-full">{addr.addressType || 'home'}</span>
                    {addr.isDefault && (
                      <span className="text-xs bg-[var(--sattva-forest)] text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={10}/> Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{addr.phone}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                  </p>
                  <p className="text-sm text-gray-600">{addr.city}, {addr.state} – {addr.pincode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[color:var(--sattva-border)]">
                {!addr.isDefault && (
                  <button onClick={() => setDefault(addr.id)}
                    className="text-xs text-[var(--sattva-forest)] font-semibold hover:underline">
                    Set as Default
                  </button>
                )}
                <button onClick={() => setMode({ editing: addr })}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-[var(--sattva-ink)] ml-auto">
                  <Edit2 size={12}/> Edit
                </button>
                <button onClick={() => handleDelete(addr.id)}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
                  <Trash2 size={12}/> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
