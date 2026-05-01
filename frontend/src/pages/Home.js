import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles, Leaf, Shield, Star } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/layout/Layout';
import ProductCard from '../components/product/ProductCard';

// Hero Banner Slider
const HeroBanner = ({ banners }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setCurrent(c => (c + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return <div className="h-[420px] md:h-[520px] skeleton rounded-none" />;
  }

  return (
    <div data-testid="home-hero" className="relative overflow-hidden" style={{ height: 'clamp(300px, 55vw, 560px)' }}>
      <AnimatePresence mode="wait">
        {banners.map((banner, idx) => idx === current && (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0"
          >
            <img
              src={banner.image}
              alt={banner.title}
              className="w-full h-full object-cover"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(26,60,52,0.75)] via-[rgba(26,60,52,0.4)] to-transparent" />
            {/* Content */}
            <div className="absolute inset-0 flex items-center">
              <div className="container-sattva">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="max-w-xl"
                >
                  <p className="text-[#A3E635] text-xs font-semibold uppercase tracking-[0.2em] mb-3">Trusted Ayurveda-Backed Wellness</p>
                  <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight mb-4">
                    {banner.title}
                  </h1>
                  {banner.subtitle && (
                    <p className="text-[rgba(255,255,255,0.8)] text-sm sm:text-base leading-relaxed mb-6">{banner.subtitle}</p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Link to={banner.link || '/products'} data-testid="home-hero-primary-cta">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        className="px-6 py-3 bg-[#A3E635] text-[#1A3C34] font-semibold text-sm rounded-lg hover:bg-[#84CC16] transition-colors flex items-center gap-2"
                      >
                        Shop Now <ArrowRight size={16} />
                      </motion.button>
                    </Link>
                    <Link to="/about">
                      <button className="px-6 py-3 border border-white text-white font-semibold text-sm rounded-lg hover:bg-[rgba(255,255,255,0.15)] transition-colors">
                        Our Story
                      </button>
                    </Link>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Prev/Next */}
      {banners.length > 1 && (
        <>
          <button
            data-testid="home-hero-prev"
            onClick={() => setCurrent(c => (c - 1 + banners.length) % banners.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[rgba(255,255,255,0.2)] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.35)] transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            data-testid="home-hero-next"
            onClick={() => setCurrent(c => (c + 1) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[rgba(255,255,255,0.2)] backdrop-blur-sm border border-[rgba(255,255,255,0.3)] flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.35)] transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-[var(--sattva-gold)] w-6' : 'bg-[rgba(255,255,255,0.5)]'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Features Strip
const FeaturesStrip = () => (
  <div className="bg-[var(--sattva-forest)] text-[var(--sattva-cream)]">
    <div className="container-sattva py-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Leaf, text: '100% Natural Ingredients' },
          { icon: Shield, text: 'Dermatologist Tested' },
          { icon: Sparkles, text: 'Cruelty-Free & Vegan' },
          { icon: Star, text: '50,000+ Happy Customers' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 justify-center">
            <Icon size={14} className="text-[var(--sattva-gold)] flex-shrink-0" />
            <span className="text-xs font-medium">{text}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Category Grid
const CategoryGrid = ({ categories }) => {
  const navigate = useNavigate();
  if (!categories.length) return null;
  return (
    <section className="section-padding bg-sattva-paper">
      <div className="container-sattva">
        <div className="text-center mb-10">
          <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-2">Shop by Category</p>
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-[var(--sattva-ink)]">Explore Our Rituals</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.slice(0, 5).map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              onClick={() => navigate(`/products?category=${encodeURIComponent(cat.name)}`)}
              className="group cursor-pointer"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-[var(--sattva-muted)] mb-3">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[rgba(26,60,52,0.5)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-center font-heading text-sm font-medium text-[var(--sattva-ink)] group-hover:text-[var(--sattva-forest)] transition-colors">{cat.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Product Section
const ProductSection = ({ title, subtitle, products, link }) => {
  if (!products.length) return null;
  return (
    <section className="section-padding">
      <div className="container-sattva">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-1">{subtitle}</p>
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-[var(--sattva-ink)]">{title}</h2>
          </div>
          <Link to={link} className="text-[var(--sattva-forest)] text-sm font-medium hover:text-[var(--sattva-gold)] transition-colors flex items-center gap-1">
            View All <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

// Testimonials
const testimonials = [
  { name: 'Priya Sharma', city: 'Mumbai', rating: 5, text: 'The Kumkumadi Serum has transformed my skin completely. After 4 weeks of use, my dark spots are visibly lighter and skin has a natural glow!' },
  { name: 'Ananya Gupta', city: 'Bengaluru', rating: 5, text: 'I switched to Sattva\'s hair oil 3 months ago and the difference is remarkable. Minimal hair fall and so much more volume. Truly Ayurvedic magic!' },
  { name: 'Rohit Patel', city: 'Ahmedabad', rating: 5, text: 'The Ashwagandha supplement has genuinely helped with my stress levels. Sleep has improved drastically. Quality is unmatched at this price.' },
];

const Testimonials = () => (
  <section className="section-padding bg-[var(--sattva-forest)]">
    <div className="container-sattva">
      <div className="text-center mb-10">
        <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-2">Testimonials</p>
        <h2 className="font-heading text-2xl md:text-3xl font-semibold text-[var(--sattva-cream)]">What Our Customers Say</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-[rgba(250,248,245,0.08)] border border-[rgba(200,169,110,0.2)] rounded-2xl p-6"
          >
            <div className="flex items-center gap-0.5 mb-4">
              {[...Array(t.rating)].map((_, j) => (
                <Star key={j} size={14} className="text-[var(--sattva-gold)] fill-current" />
              ))}
            </div>
            <p className="text-[rgba(250,248,245,0.85)] text-sm leading-relaxed mb-4">"{t.text}"</p>
            <div>
              <p className="font-semibold text-[var(--sattva-cream)] text-sm">{t.name}</p>
              <p className="text-[rgba(250,248,245,0.5)] text-xs">{t.city}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

// Blog Preview
const BlogPreview = ({ posts }) => {
  if (!posts.length) return null;
  return (
    <section className="section-padding bg-sattva-paper">
      <div className="container-sattva">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-[0.2em] mb-1">Wisdom & Rituals</p>
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-[var(--sattva-ink)]">From the Journal</h2>
          </div>
          <Link to="/blog" className="text-[var(--sattva-forest)] text-sm font-medium hover:text-[var(--sattva-gold)] transition-colors flex items-center gap-1">
            All Articles <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.slice(0, 3).map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link to={`/blog/${post.slug}`} className="group block">
                <div className="aspect-video rounded-xl overflow-hidden bg-[var(--sattva-muted)] mb-4">
                  <img
                    src={post.featuredImage || 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80'}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex gap-2 mb-2">
                  {post.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-[var(--sattva-muted)] text-[var(--sattva-forest)]">{tag}</span>
                  ))}
                </div>
                <h3 className="font-heading text-base font-semibold text-[var(--sattva-ink)] group-hover:text-[var(--sattva-forest)] transition-colors line-clamp-2">{post.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Main Home Page
const Home = () => {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [bRes, cRes, fRes, nRes, bpRes] = await Promise.all([
          api.get('/banners'),
          api.get('/categories'),
          api.get('/products/featured?limit=8'),
          api.get('/products/new-arrivals?limit=4'),
          api.get('/blog?limit=3'),
        ]);
        setBanners(bRes.data);
        setCategories(cRes.data);
        setFeatured(fRes.data);
        setNewArrivals(nRes.data);
        setBlogPosts(bpRes.data);
      } catch (err) {
        console.error('Home fetch error:', err);
      }
    };
    fetchAll();
  }, []);

  return (
    <Layout>
      <HeroBanner banners={banners} />
      <FeaturesStrip />
      <CategoryGrid categories={categories} />
      <ProductSection
        title="Bestsellers"
        subtitle="Most Loved"
        products={featured}
        link="/products?featured=true"
      />
      <Testimonials />
      <ProductSection
        title="New Arrivals"
        subtitle="Fresh Rituals"
        products={newArrivals}
        link="/products?sort=newest"
      />
      <BlogPreview posts={blogPosts} />
    </Layout>
  );
};

export default Home;
