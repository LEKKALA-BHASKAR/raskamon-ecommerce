import React, { useEffect, useState } from 'react';
import { Search, UserX, UserCheck } from 'lucide-react';
import api from '../../utils/api';
import AdminLayout from './AdminLayout';
import { toast } from 'sonner';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15, ...(search && { search }) });
      const res = await api.get(`/admin/customers?${params}`);
      setCustomers(res.data.customers);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, [page, search]);

  const toggleBlock = async (id, blocked) => {
    try {
      await api.put(`/admin/customers/${id}/block?blocked=${!blocked}`);
      toast.success(`Customer ${blocked ? 'unblocked' : 'blocked'}`);
      fetchCustomers();
    } catch { toast.error('Failed'); }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold">Customers</h2>
          <p className="text-sm text-gray-500">{total} customers</p>
        </div>
      </div>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Search customers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-[var(--sattva-surface)] focus:outline-none" />
      </div>
      <div className="card-sattva overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--sattva-muted)] border-b border-[color:var(--sattva-border)]">
            <tr>
              {['Customer', 'Email', 'Phone', 'Orders', 'Loyalty Points', 'Joined', 'Status', ''].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--sattva-border)]">
            {loading ? [...Array(8)].map((_,i) => <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-8 skeleton rounded" /></td></tr>) :
            customers.map(c => (
              <tr key={c.id} className="hover:bg-[var(--sattva-muted)] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[var(--sattva-muted)] rounded-full flex items-center justify-center text-xs font-bold text-[var(--sattva-forest)]">{c.name?.charAt(0).toUpperCase()}</div>
                    <span className="text-sm font-medium">{c.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{c.phone || '-'}</td>
                <td className="px-4 py-3 text-sm text-center">{(c.wishlist?.length || 0)}</td>
                <td className="px-4 py-3 text-sm text-[var(--sattva-gold)] font-medium">{c.loyaltyPoints || 0} pts</td>
                <td className="px-4 py-3 text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${c.isBlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {c.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleBlock(c.id, c.isBlocked)} className={`p-1.5 rounded-lg transition-colors ${c.isBlocked ? 'hover:bg-green-50 text-green-600' : 'hover:bg-red-50 text-red-400'}`}>
                    {c.isBlocked ? <UserCheck size={14} /> : <UserX size={14} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="flex gap-2 p-3 border-t justify-end">
            <button disabled={page<=1} onClick={() => setPage(p=>p-1)} className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40">Prev</button>
            <span className="px-3 py-1.5 text-xs bg-[var(--sattva-forest)] text-[var(--sattva-cream)] rounded-lg">{page}/{pages}</span>
            <button disabled={page>=pages} onClick={() => setPage(p=>p+1)} className="px-3 py-1.5 text-xs border rounded-lg disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCustomers;
