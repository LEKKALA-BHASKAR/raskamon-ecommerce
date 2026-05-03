import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { toast } from 'sonner';
import Layout from '../../components/layout/Layout';
import { Search, SlidersHorizontal, Package, ShoppingCart, Building2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '../../utils/mockData';

// Adapt mock products for B2B display
const toB2BProduct = (p) => ({
  ...p,
  b2b_retail_price: Math.round(p.discountPrice * 0.85),
  b2b_vendor_price: Math.round(p.discountPrice * 0.65),
  min_order_qty: 6,
  gst_rate: 12,
  vendor_name: 'Dr MediScie',
});

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const ProductCard = ({ product, priceType }) => {
  const { addItem } = useCart();
  const price = priceType === 'wholesale' ? product.b2b_vendor_price : product.b2b_retail_price;
  const navigate = useNavigate();

  const handleAddToCart = (e) => {
    e.preventDefault();
    addItem({ ...product, price, b2b_price: price, is_b2b: true });
    toast.success('Added to cart');
  };

  return (
    <Link to={`/b2b/products/${product.slug}`} className="group bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-[var(--sattva-muted)] overflow-hidden">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={32} className="text-gray-300" />
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{product.vendor_name}</p>
        <h3 className="font-semibold text-[var(--sattva-ink)] text-sm leading-tight mb-2 group-hover:text-[var(--sattva-forest)] transition-colors">
          {product.name}
        </h3>
        {product.brand && <p className="text-[11px] text-gray-400 mb-2">{product.brand}</p>}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-[var(--sattva-forest)]">{fmt(price)}</p>
            {product.mrp > price && (
              <p className="text-[11px] text-gray-400 line-through">{fmt(product.mrp)}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">MOQ: {product.min_order_qty}</p>
            <p className="text-[10px] text-gray-400">{product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>
          </div>
        </div>
        {product.gst_rate > 0 && (
          <p className="text-[10px] text-gray-400 mt-1">+ {product.gst_rate}% GST</p>
        )}
        <button
          onClick={handleAddToCart}
          disabled={product.stock === 0}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-[var(--sattva-forest)] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <ShoppingCart size={14} />
          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </Link>
  );
};

export default function B2BCatalog() {
  const { user, isB2B, isVendor, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [priceType, setPriceType] = useState('b2b_retail');

  const hasB2BAccess = isB2B || isVendor || isAdmin;

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!hasB2BAccess) { navigate('/'); toast.error('B2B access required'); return; }
    if (isVendor) setPriceType('wholesale');
  }, [user, hasB2BAccess, isVendor, navigate]);

  const load = useCallback(async () => {
    if (!hasB2BAccess) return;
    setLoading(true);
    try {
      const params = { page, limit: 20, sort };
      if (search) params.search = search;
      if (category) params.category = category;
      if (vendorFilter) params.vendor_id = vendorFilter;

      const [prodRes, catRes, vendRes] = await Promise.all([
        api.get('/b2b/products', { params }),
        api.get('/b2b/categories'),
        api.get('/b2b/vendors')
      ]);
      setProducts(prodRes.data.data);
      setPagination(prodRes.data.pagination);
      if (catRes.data.data) setCategories(catRes.data.data);
      if (vendRes.data.data) setVendors(vendRes.data.data);
    } catch (err) {
      if (err?.response?.status === 403) {
        // Show mock data even for non-B2B users (catalog preview)
      }
      // Fallback to mock data
      const mockB2B = MOCK_PRODUCTS.map(toB2BProduct);
      const filtered = category ? mockB2B.filter(p => p.category === category) : mockB2B;
      const searched = search ? filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : filtered;
      setProducts(searched);
      if (!categories.length) setCategories(MOCK_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, vendorFilter, sort, hasB2BAccess, navigate]);

  useEffect(() => { load(); }, [load]);

  if (!hasB2BAccess) return null;

  return (
    <Layout>
      <div className="min-h-screen bg-[var(--sattva-muted)]">
        {/* B2B Header Banner */}
        <div className="bg-[var(--sattva-forest)] text-white py-8 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-green-200 mb-2">
              <Building2 size={14} />
              <span>B2B Marketplace · {isVendor ? 'Vendor Wholesale Pricing' : 'Business Pricing'}</span>
            </div>
            <h1 className="text-2xl font-bold">B2B Product Catalog</h1>
            <p className="text-green-200 text-sm mt-1">
              {isVendor
                ? 'Wholesale prices — purchase from other vendors at trade rates'
                : 'Exclusive business pricing for approved B2B accounts only'}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Filters */}
          <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-4 mb-6 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
              />
            </div>
            <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-white">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.category} value={c.category}>{c.category} ({c.product_count})</option>)}
            </select>
            <select value={vendorFilter} onChange={e => { setVendorFilter(e.target.value); setPage(1); }} className="px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-white">
              <option value="">All Vendors</option>
              {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name} ({v.product_count})</option>)}
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)} className="px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-xl bg-white">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>

          {/* Price Type Badge */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {pagination.total !== undefined ? `${pagination.total} products` : ''}
            </p>
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${priceType === 'wholesale' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {priceType === 'wholesale' ? 'Vendor Wholesale Pricing' : 'B2B Retail Pricing'}
            </span>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] animate-pulse h-80" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No products found</h3>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p.id || p._id} product={p} priceType={priceType} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 border border-[color:var(--sattva-border)] rounded-xl text-sm disabled:opacity-40">
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.pages}</span>
              <button disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 border border-[color:var(--sattva-border)] rounded-xl text-sm disabled:opacity-40">
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
