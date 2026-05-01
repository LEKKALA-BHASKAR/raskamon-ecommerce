import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../utils/api';
import Layout from '../components/layout/Layout';

export const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/blog').then(r => setPosts(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="container-sattva py-12">
        <div className="text-center mb-10">
          <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-widest mb-2">Wisdom & Rituals</p>
          <h1 className="font-heading text-3xl font-semibold text-[var(--sattva-ink)]">The Dr MediScie Journal</h1>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="aspect-[3/2] skeleton rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.map(post => (
              <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                <div className="aspect-video rounded-xl overflow-hidden mb-4">
                  <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="flex gap-2 mb-2">
                  {post.tags?.slice(0, 2).map(t => (
                    <span key={t} className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-[var(--sattva-muted)] text-[var(--sattva-forest)] rounded-full">{t}</span>
                  ))}
                </div>
                <h2 className="font-heading text-base font-semibold text-[var(--sattva-ink)] group-hover:text-[var(--sattva-forest)] transition-colors line-clamp-2">{post.title}</h2>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/blog/${slug}`).then(r => setPost(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <Layout><div className="container-sattva py-12"><div className="max-w-3xl mx-auto space-y-4">{[1,2,3,4].map(i=><div key={i} className="h-6 skeleton rounded-lg" />)}</div></div></Layout>;

  if (!post) return <Layout><div className="container-sattva py-12 text-center"><h1 className="font-heading text-2xl">Post not found</h1><Link to="/blog" className="btn-primary mt-4 inline-block px-6 py-2">Back to Blog</Link></div></Layout>;

  return (
    <Layout>
      <div className="container-sattva py-12">
        <div className="max-w-3xl mx-auto">
          <Link to="/blog" className="text-sm text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)] flex items-center gap-1 mb-6">
            ← Back to Journal
          </Link>
          {post.featuredImage && (
            <div className="aspect-video rounded-2xl overflow-hidden mb-8">
              <img src={post.featuredImage} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex gap-2 mb-4">
            {post.tags?.map(t => (
              <span key={t} className="px-2 py-0.5 text-[10px] font-semibold uppercase bg-[var(--sattva-muted)] text-[var(--sattva-forest)] rounded-full">{t}</span>
            ))}
          </div>
          <h1 className="font-heading text-3xl font-semibold text-[var(--sattva-ink)] mb-3">{post.title}</h1>
          <p className="text-gray-500 text-sm mb-8">By {post.author} • {new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          {/* Render as plain text to prevent XSS - consider using a markdown library for rich formatting */}
          <div className="prose prose-sm max-w-none text-[var(--sattva-ink)] whitespace-pre-wrap">{post.body}</div>
        </div>
      </div>
    </Layout>
  );
};
