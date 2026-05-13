import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, Share2 } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'sonner';
import { useCart } from '../../context/CartContext';

function WishlistSkeleton() {
  return (
    <div className="card-sattva overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function AccountWishlist() {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState({});
  const { addToCart } = useCart();

  useEffect(() => {
    api.get('/users/me/wishlist')
      .then(r => setWishlist(r.data || []))
      .catch(() => toast.error('Failed to load wishlist'))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (productId) => {
    try {
      await api.delete(`/users/me/wishlist/${productId}`);
      setWishlist(w => w.filter(p => (p.id || p._id) !== productId));
      toast.success('Removed from wishlist');
    } catch { toast.error('Failed to remove'); }
  };

  const moveToCart = async (product) => {
    const id = product.id || product._id;
    if (product.stock === 0) { toast.error('Out of stock'); return; }
    setAdding(a => ({...a, [id]: true}));
    try {
      addToCart(id, 1);
      toast.success('Added to cart');
      await api.delete(`/users/me/wishlist/${id}`);
      setWishlist(w => w.filter(p => (p.id || p._id) !== id));
    } catch { toast.error('Failed to add to cart'); }
    finally { setAdding(a => ({...a, [id]: false})); }
  };

  const share = async (product) => {
    const url = `${window.location.origin}/products/${product.slug}`;
    if (navigator.share) {
      await navigator.share({ title: product.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-heading text-xl font-semibold text-[var(--sattva-ink)]">
          My Wishlist {wishlist.length > 0 && <span className="text-sm font-normal text-gray-400">({wishlist.length})</span>}
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <WishlistSkeleton key={i}/>)}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="card-sattva p-12 text-center">
          <Heart size={44} className="text-gray-200 mx-auto mb-4" />
          <p className="font-medium text-gray-500 mb-1">Your wishlist is empty</p>
          <p className="text-sm text-gray-400 mb-5">Save items you love and come back later</p>
          <Link to="/products" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 text-sm">
            Explore Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {wishlist.map(product => {
            const id = product.id || product._id;
            const price = product.discountPrice || product.price || 0;
            const originalPrice = product.mrp || product.price || 0;
            const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
            const outOfStock = product.stock === 0;

            return (
              <div key={id} className="card-sattva overflow-hidden group relative">
                {/* Image */}
                <Link to={`/products/${product.slug}`}>
                  <div className={`aspect-square overflow-hidden bg-[var(--sattva-muted)] relative ${outOfStock ? 'opacity-60' : ''}`}>
                    <img
                      src={product.images?.[0] || ''}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {discount >= 10 && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        -{discount}%
                      </span>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-white/90 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">Out of Stock</span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="p-3">
                  {product.brand && (
                    <p className="text-[10px] text-[var(--sattva-gold)] font-semibold uppercase tracking-wide mb-0.5">{product.brand}</p>
                  )}
                  <Link to={`/products/${product.slug}`}>
                    <p className="text-sm font-medium text-[var(--sattva-ink)] line-clamp-2 hover:text-[var(--sattva-forest)] transition-colors">
                      {product.name}
                    </p>
                  </Link>
                  <div className="flex items-baseline gap-2 mt-1.5 mb-3">
                    <span className="font-bold text-[var(--sattva-forest)]">₹{price.toLocaleString('en-IN')}</span>
                    {originalPrice > price && (
                      <span className="text-xs text-gray-400 line-through">₹{originalPrice.toLocaleString('en-IN')}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => moveToCart(product)}
                      disabled={outOfStock || adding[id]}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold bg-[var(--sattva-forest)] text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                      <ShoppingCart size={12}/>
                      {adding[id] ? 'Adding…' : outOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button
                      onClick={() => remove(id)}
                      className="p-2 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
                      title="Remove from wishlist"
                    >
                      <Trash2 size={13}/>
                    </button>
                    <button
                      onClick={() => share(product)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"
                      title="Share"
                    >
                      <Share2 size={13}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
