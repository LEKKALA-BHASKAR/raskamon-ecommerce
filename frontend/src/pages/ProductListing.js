import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, Grid, List } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/layout/Layout';
import ProductCard from '../components/product/ProductCard';
import { Slider } from '../components/ui/slider';
import { Checkbox } from '../components/ui/checkbox';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '../utils/mockData';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

const RATINGS = [5, 4, 3, 2, 1];

const ProductListing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const category = searchParams.get('category') || '';
  const subcategory = searchParams.get('subcategory') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');
  const minPrice = parseInt(searchParams.get('min_price') || '0');
  const maxPrice = parseInt(searchParams.get('max_price') || '5000');
  const brandFilter = searchParams.get('brand') || '';
  const ratingFilter = parseFloat(searchParams.get('min_rating') || '0');

  useEffect(() => {
    api.get('/categories').then(r => { if (r.data?.length) setCategories(r.data); }).catch(() => setCategories(MOCK_CATEGORIES));
    api.get('/products/brands').then(r => setBrands(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page, limit: 12, sort,
          ...(category && { category }),
          ...(subcategory && { subcategory }),
          ...(brandFilter && { brand: brandFilter }),
          ...(minPrice > 0 && { min_price: minPrice }),
          ...(maxPrice < 5000 && { max_price: maxPrice }),
          ...(ratingFilter > 0 && { min_rating: ratingFilter }),
        });
        const res = await api.get(`/products?${params}`);
        if (res.data.products?.length) {
          setProducts(res.data.products);
          setTotal(res.data.total);
          setPages(res.data.pages);
        } else {
          throw new Error('empty');
        }
      } catch {
        // Use mock data filtered by params
        let filtered = MOCK_PRODUCTS;
        if (category) filtered = filtered.filter(p => p.category === category);
        if (subcategory) filtered = filtered.filter(p => p.subcategory === subcategory);
        if (brandFilter) filtered = filtered.filter(p => p.brand === brandFilter);
        if (ratingFilter > 0) filtered = filtered.filter(p => p.rating >= ratingFilter);
        setProducts(filtered);
        setTotal(filtered.length);
        setPages(1);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [category, subcategory, sort, page, minPrice, maxPrice, brandFilter, ratingFilter]);

  const setParam = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    setSearchParams(p);
  };

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h4 className="font-semibold text-sm text-[var(--sattva-ink)] mb-3">Category</h4>
        <div className="space-y-2">
          <button onClick={() => {
            const p = new URLSearchParams(searchParams);
            p.delete('category'); p.delete('subcategory'); p.delete('page');
            setSearchParams(p);
          }} className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${!category ? 'bg-[var(--sattva-forest)] text-[var(--sattva-cream)]' : 'hover:bg-[var(--sattva-muted)] text-[var(--sattva-ink)]'}`}>
            All Categories
          </button>
          {categories.filter(c => !c.parent).map(cat => {
            const subs = categories.filter(c => c.parent === cat.id);
            const active = category === cat.name;
            return (
              <div key={cat.id}>
                <button
                  onClick={() => {
                    const p = new URLSearchParams(searchParams);
                    p.set('category', cat.name);
                    p.delete('subcategory');
                    p.delete('page');
                    setSearchParams(p);
                  }}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                    active ? 'bg-[var(--sattva-forest)] text-[var(--sattva-cream)]' : 'hover:bg-[var(--sattva-muted)] text-[var(--sattva-ink)]'
                  }`}
                >
                  {cat.name}
                </button>
                {active && subs.length > 0 && (
                  <div className="mt-1 ml-3 pl-2 border-l border-[color:var(--sattva-border)] space-y-1">
                    <button
                      onClick={() => setParam('subcategory', '')}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${!subcategory ? 'text-[var(--sattva-forest)] font-semibold' : 'text-gray-500 hover:text-[var(--sattva-forest)]'}`}
                    >
                      All {cat.name}
                    </button>
                    {subs.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setParam('subcategory', sub.name)}
                        className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                          subcategory === sub.name ? 'text-[var(--sattva-forest)] font-semibold' : 'text-gray-500 hover:text-[var(--sattva-forest)]'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-semibold text-sm text-[var(--sattva-ink)] mb-3">Price Range</h4>
        <Slider
          min={0} max={5000} step={100}
          defaultValue={[minPrice, maxPrice]}
          onValueCommit={([min, max]) => {
            const p = new URLSearchParams(searchParams);
            if (min > 0) p.set('min_price', min); else p.delete('min_price');
            if (max < 5000) p.set('max_price', max); else p.delete('max_price');
            setSearchParams(p);
          }}
          className="mt-2"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>₹{minPrice}</span>
          <span>₹{maxPrice}</span>
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-[var(--sattva-ink)] mb-3">Brand</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {brands.map(brand => (
              <label key={brand} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={brandFilter === brand}
                  onCheckedChange={(c) => setParam('brand', c ? brand : '')}
                />
                <span className="text-sm text-[var(--sattva-ink)]">{brand}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Rating */}
      <div>
        <h4 className="font-semibold text-sm text-[var(--sattva-ink)] mb-3">Min Rating</h4>
        <div className="space-y-2">
          {[0, ...RATINGS].map(r => (
            <button
              key={r}
              onClick={() => setParam('min_rating', r > 0 ? r : '')}
              className={`flex items-center gap-2 w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                ratingFilter === r ? 'text-[var(--sattva-forest)] font-semibold' : 'text-gray-600 hover:text-[var(--sattva-forest)]'
              }`}
            >
              {r === 0 ? 'All Ratings' : `${r}★ & above`}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setSearchParams({})}
        className="w-full py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        Clear All Filters
      </button>
    </div>
  );

  return (
    <Layout>
      <div className="container-sattva py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link to="/" className="hover:text-[var(--sattva-forest)]">Home</Link>
          <span>/</span>
          <span className="text-[var(--sattva-ink)] font-medium">{subcategory || category || 'All Products'}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold text-[var(--sattva-ink)]">
              {subcategory || category || 'All Products'}
            </h1>
            {subcategory && category && (
              <p className="text-xs text-gray-400">in {category}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">{total} products found</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Sort */}
            <select
              data-testid="plp-sort-select"
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="text-sm border border-[color:var(--sattva-border)] bg-[var(--sattva-surface)] rounded-lg px-3 py-2 text-[var(--sattva-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* Mobile filter toggle */}
            <button
              data-testid="plp-open-filters-button"
              onClick={() => setFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 text-sm border border-[color:var(--sattva-border)] px-3 py-2 rounded-lg hover:bg-[var(--sattva-muted)] transition-colors"
            >
              <SlidersHorizontal size={16} /> Filters
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="card-sattva p-5 sticky top-24">
              <h3 className="font-heading text-base font-semibold text-[var(--sattva-ink)] mb-4">Filters</h3>
              <FilterPanel />
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] skeleton rounded-xl" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-heading text-xl text-[var(--sattva-ink)]">No products found</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
                <button onClick={() => setSearchParams({})} className="mt-4 btn-outlined text-sm px-6 py-2">
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>

                {/* Pagination */}
                {pages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      disabled={page <= 1}
                      onClick={() => setParam('page', page - 1)}
                      className="px-4 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg hover:bg-[var(--sattva-muted)] disabled:opacity-40 transition-colors"
                    >
                      Previous
                    </button>
                    {[...Array(Math.min(pages, 5))].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setParam('page', i + 1)}
                        className={`w-9 h-9 text-sm rounded-lg transition-colors ${
                          page === i + 1
                            ? 'bg-[var(--sattva-forest)] text-[var(--sattva-cream)]'
                            : 'border border-[color:var(--sattva-border)] hover:bg-[var(--sattva-muted)]'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      disabled={page >= pages}
                      onClick={() => setParam('page', page + 1)}
                      className="px-4 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg hover:bg-[var(--sattva-muted)] disabled:opacity-40 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setFilterOpen(false)} />
          <motion.div
            data-testid="plp-filters-sheet"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            className="w-80 bg-[var(--sattva-surface)] h-full overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-lg font-semibold">Filters</h3>
              <button onClick={() => setFilterOpen(false)}><X size={20} /></button>
            </div>
            <FilterPanel />
            <button
              data-testid="plp-apply-filters-button"
              onClick={() => setFilterOpen(false)}
              className="w-full mt-6 btn-primary py-3"
            >
              Apply Filters
            </button>
          </motion.div>
        </div>
      )}
    </Layout>
  );
};

export default ProductListing;
