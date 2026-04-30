import React, { useEffect, useState, useCallback } from 'react';
import { Check, X, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'sonner';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchReviews = useCallback(() => {
    setLoading(true);
    const params = filter !== '' ? `?approved=${filter}` : '';
    api.get(`/admin/reviews${params}`).then(r => setReviews(r.data.reviews)).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const approve = async (id, val) => {
    await api.put(`/admin/reviews/${id}/approve?approved=${val}`);
    toast.success(val ? 'Approved' : 'Rejected');
    fetchReviews();
  };

  const deleteReview = async (id) => {
    if (!confirm('Delete review?')) return;
    await api.delete(`/admin/reviews/${id}`);
    toast.success('Deleted');
    fetchReviews();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-semibold">Reviews</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="text-sm border px-3 py-2 rounded-lg focus:outline-none">
          <option value="">All</option>
          <option value="true">Approved</option>
          <option value="false">Pending</option>
        </select>
      </div>
      <div className="space-y-3">
        {loading ? [...Array(5)].map((_,i)=><div key={i} className="h-20 skeleton rounded-xl"/>) :
        reviews.length === 0 ? <div className="text-center py-12 text-gray-400">No reviews found</div> :
        reviews.map(r => (
          <div key={r.id} className="card-sattva p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-semibold text-sm">{r.userName}</p>
                  <div className="flex">{[1,2,3,4,5].map(i=><span key={i} className={`text-sm ${i<=r.rating?'text-[var(--sattva-gold)]':'text-gray-200'}`}>★</span>)}</div>
                  {r.verified && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Verified</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.isApproved?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{r.isApproved?'Approved':'Pending'}</span>
                </div>
                <p className="font-medium text-sm">{r.title}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{r.body}</p>
              </div>
              <div className="flex gap-2 ml-3">
                {!r.isApproved && <button onClick={() => approve(r.id, true)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><Check size={14} /></button>}
                {r.isApproved && <button onClick={() => approve(r.id, false)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><X size={14} /></button>}
                <button onClick={() => deleteReview(r.id)} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default AdminReviews;
