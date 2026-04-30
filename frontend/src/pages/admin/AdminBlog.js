import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'sonner';

const AdminBlog = () => {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', excerpt: '', featuredImage: '', tags: '', isPublished: false });

  const fetchPosts = () => {
    setLoading(true);
    api.get(`/admin/blog?page=${page}`).then(r => { setPosts(r.data.posts); setTotal(r.data.total); }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPosts(); }, [page]);

  const openForm = (post = null) => {
    setEditing(post?.id || null);
    setForm(post ? { ...post, tags: (post.tags||[]).join(', ') } : { title: '', body: '', excerpt: '', featuredImage: '', tags: '', isPublished: false });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, tags: form.tags ? form.tags.split(',').map(t=>t.trim()) : [] };
      if (editing) { await api.put(`/admin/blog/${editing}`, payload); toast.success('Post updated'); }
      else { await api.post('/admin/blog', payload); toast.success('Post created'); }
      setShowForm(false);
      fetchPosts();
    } catch { toast.error('Failed'); }
  };

  const deletePost = async (id) => {
    if (!confirm('Delete post?')) return;
    await api.delete(`/admin/blog/${id}`);
    toast.success('Deleted');
    fetchPosts();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-xl font-semibold">Blog ({total})</h2>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-2 py-2.5 px-5 text-sm"><Plus size={16} /> New Post</button>
      </div>

      <div className="space-y-3">
        {loading ? [...Array(3)].map((_,i)=><div key={i} className="h-24 skeleton rounded-xl"/>) :
        posts.length === 0 ? <div className="text-center py-12 text-gray-400">No posts yet</div> :
        posts.map(post => (
          <div key={post.id} className="card-sattva p-4 flex items-center gap-4">
            {post.featuredImage && <div className="w-16 h-16 rounded-lg overflow-hidden"><img src={post.featuredImage} alt="" className="w-full h-full object-cover" /></div>}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{post.title}</p>
              <p className="text-xs text-gray-500 truncate">{post.excerpt}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${post.isPublished?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{post.isPublished?'Published':'Draft'}</span>
                <span className="text-[10px] text-gray-400">{new Date(post.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openForm(post)} className="p-1.5 rounded-lg hover:bg-[var(--sattva-muted)] text-[var(--sattva-forest)]"><Edit size={14} /></button>
              <button onClick={() => deletePost(post.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowForm(false)}>
          <div className="bg-[var(--sattva-surface)] rounded-2xl p-6 max-w-2xl w-full my-8" onClick={e=>e.stopPropagation()}>
            <h3 className="font-heading text-base font-semibold mb-4">{editing ? 'Edit Post' : 'New Post'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[{k:'title',l:'Title',req:true},{k:'excerpt',l:'Excerpt'},{k:'featuredImage',l:'Featured Image URL'},{k:'tags',l:'Tags (comma-separated)'}].map(f=>(
                <div key={f.k}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{f.l}</label>
                  <input type="text" value={form[f.k]} onChange={(e)=>setForm(p=>({...p,[f.k]:e.target.value}))} required={f.req}
                    className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Content (HTML)</label>
                <textarea value={form.body} onChange={(e)=>setForm(p=>({...p,body:e.target.value}))} rows={8}
                  className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg focus:outline-none font-mono resize-none" />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isPublished} onChange={(e)=>setForm(p=>({...p,isPublished:e.target.checked}))} />
                <span className="text-sm">Publish immediately</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-outlined py-2.5">Cancel</button>
                <button type="submit" className="flex-1 btn-primary py-2.5">{editing?'Update':'Publish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminBlog;
