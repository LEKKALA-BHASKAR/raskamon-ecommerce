import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import api from '../../utils/api';
import { toast } from 'sonner';
import Layout from '../../components/layout/Layout';
import { ShoppingCart, Package, ArrowLeft, Star, Building2, AlertTriangle } from 'lucide-react';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function B2BProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isB2B, isVendor, isAdmin } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  const hasAccess = isB2B || isVendor || isAdmin;
  const priceType = isVendor ? 'wholesale' : 'b2b_retail';

  useEffect(() => {
    if (!user || !hasAccess) { navigate('/login'); return; }
    api.get(`/b2b/products/${slug}`)
      .then(r => {
        setProduct(r.data.data);
        setQty(r.data.data.min_order_qty || 1);
      })
      .catch(() => { toast.error('Product not found'); navigate('/b2b/catalog'); })
      .finally(() => setLoading(false));
  }, [slug, user, hasAccess, navigate]);

  if (loading) return <Layout><div className="p-12 text-center text-gray-400">Loading product...</div></Layout>;
  if (!product) return null;

  const price = product.price || (priceType === 'wholesale' ? product.b2b_vendor_price : product.b2b_retail_price);

  const handleAddToCart = () => {
    if (qty < product.min_order_qty) {
      toast.error(`Minimum order quantity is ${product.min_order_qty}`);
      return;
    }
    addItem({ ...product, price, b2b_price: price, is_b2b: true, quantity: qty });
    toast.success(`Added ${qty} unit(s) to cart`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-[var(--sattva-muted)]">
        {/* B2B Banner */}
        <div className="bg-[var(--sattva-forest)] text-white py-3 px-8">
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-sm text-green-200">
            <Building2 size={13} />
            <span>B2B Marketplace · {isVendor ? 'Vendor Wholesale Pricing' : 'B2B Retail Pricing'}</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--sattva-ink)] mb-6">
            <ArrowLeft size={15} /> Back to Catalog
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Images */}
            <div className="space-y-3">
              <div className="aspect-square bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] overflow-hidden">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={64} className="text-gray-300" />
                  </div>
                )}
              </div>
              {product.images?.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.images.slice(1).map((url, i) => (
                    <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg border flex-shrink-0 cursor-pointer hover:border-[var(--sattva-forest)] transition-colors" />
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--sattva-forest)] bg-green-50 px-2 py-0.5 rounded-full">
                  B2B Only
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  {priceType === 'wholesale' ? 'Wholesale Price' : 'B2B Price'}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-[var(--sattva-ink)] mb-1">{product.name}</h1>
              {product.brand && <p className="text-sm text-gray-500 mb-1">by {product.brand}</p>}
              <p className="text-sm text-gray-400 mb-4">Vendor: {product.vendor_name}</p>

              {product.rating > 0 && (
                <div className="flex items-center gap-1 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={14} className={s <= Math.round(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
                  ))}
                  <span className="text-sm text-gray-500 ml-1">({product.reviewCount || 0} reviews)</span>
                </div>
              )}

              {/* Pricing */}
              <div className="bg-[var(--sattva-surface)] rounded-2xl border border-[color:var(--sattva-border)] p-5 mb-4">
                <p className="text-3xl font-bold text-[var(--sattva-forest)]">{fmt(price)}</p>
                {product.mrp > price && (
                  <p className="text-sm text-gray-400 line-through">{fmt(product.mrp)} MRP</p>
                )}
                {product.gst_rate > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    + {product.gst_rate}% GST = {fmt(price * (1 + product.gst_rate / 100))} incl. tax
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[color:var(--sattva-border)] text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Min. Order Qty</p>
                    <p className="font-semibold">{product.min_order_qty} units</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Stock Available</p>
                    <p className={`font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stock > 0 ? `${product.stock} units` : 'Out of Stock'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm font-semibold text-gray-600">Quantity:</label>
                <div className="flex items-center border border-[color:var(--sattva-border)] rounded-xl overflow-hidden">
                  <button onClick={() => setQty(q => Math.max(product.min_order_qty, q - 1))} className="px-3 py-2 hover:bg-[var(--sattva-muted)] font-bold">−</button>
                  <span className="px-4 py-2 font-semibold min-w-[50px] text-center">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="px-3 py-2 hover:bg-[var(--sattva-muted)] font-bold">+</button>
                </div>
                <span className="text-sm text-gray-500">= {fmt(price * qty)}</span>
              </div>

              {qty < product.min_order_qty && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-xl mb-3">
                  <AlertTriangle size={14} />
                  Minimum order: {product.min_order_qty} units
                </div>
              )}

              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--sattva-forest)] text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <ShoppingCart size={18} />
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>

              {/* Product Details */}
              <div className="mt-6 space-y-3">
                <h3 className="font-semibold text-[var(--sattva-ink)]">Product Details</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
                {product.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {product.tags.map(t => (
                      <span key={t} className="px-2.5 py-0.5 text-xs bg-[var(--sattva-muted)] text-gray-600 rounded-full">{t}</span>
                    ))}
                  </div>
                )}
                {product.sku && <p className="text-xs text-gray-400">SKU: {product.sku}</p>}
                {product.weight && <p className="text-xs text-gray-400">Weight: {product.weight} kg</p>}
              </div>

              {/* GST Invoice Note */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                GST-compliant invoice will be generated automatically with your order. Input tax credit (ITC) available for eligible businesses.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
