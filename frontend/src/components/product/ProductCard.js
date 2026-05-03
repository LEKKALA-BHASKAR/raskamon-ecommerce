import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Heart, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { toast } from 'sonner';

export const StarRating = ({ rating, size = 11, showCount, count }) => (
  <div className="flex items-center gap-1">
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'text-[var(--sattva-gold)]' : 'text-[var(--sattva-border)]'}
          strokeWidth={0}
          fill={i <= Math.round(rating) ? 'var(--sattva-gold)' : 'var(--sattva-border)'}
        />
      ))}
    </div>
    {showCount && count > 0 && (
      <span className="text-[10px] text-gray-400 font-medium ml-0.5">({count})</span>
    )}
  </div>
);

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [hovering, setHovering] = useState(false);

  const price = product.discountPrice || product.price;
  const originalPrice = product.mrp || product.price;
  const discount = originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { toast.error('Please sign in to save items'); return; }
    const newState = !wishlisted;
    setWishlisted(newState);
    try {
      if (newState) {
        await api.post(`/users/me/wishlist/${product.id || product._id}`);
        toast.success('Saved to wishlist ♥');
      } else {
        await api.delete(`/users/me/wishlist/${product.id || product._id}`);
        toast.success('Removed from wishlist');
      }
    } catch {
      setWishlisted(!newState);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock === 0) return;
    setAdding(true);
    try {
      addToCart(product.id || product._id, 1);
      toast.success(`Added to cart`);
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setTimeout(() => setAdding(false), 800);
    }
  };

  return (
    <motion.div
      data-testid="product-card"
      className="product-card group"
      onHoverStart={() => setHovering(true)}
      onHoverEnd={() => setHovering(false)}
    >
      <Link to={`/products/${product.slug}`} className="block">
        {/* Image */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '4/5' }}>
          {!imgLoaded && <div className="absolute inset-0 skeleton" />}

          <img
            src={product.images?.[0] || 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&q=80'}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-700 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ transform: hovering ? 'scale(1.07)' : 'scale(1)' }}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
          />

          {/* Hover gradient */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-[rgba(15,36,32,0.4)] via-transparent to-transparent transition-opacity duration-300"
            style={{ opacity: hovering ? 1 : 0 }}
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.isFeatured && <span className="badge-bestseller">Bestseller</span>}
            {discount >= 10 && <span className="badge-off">{discount}% off</span>}
          </div>

          {/* Wishlist */}
          <button
            data-testid="product-card-wishlist-button"
            onClick={handleWishlist}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md transition-all duration-200"
            style={{ opacity: hovering ? 1 : 0, transform: hovering ? 'scale(1)' : 'scale(0.8)' }}
            aria-label="Wishlist"
          >
            <Heart
              size={15}
              strokeWidth={2}
              className={wishlisted ? 'fill-red-500 text-red-500' : 'text-[var(--sattva-ink)]'}
            />
          </button>

          {/* Low stock */}
          {product.stock > 0 && product.stock <= 5 && (
            <div className="absolute bottom-14 left-0 right-0 mx-3">
              <div className="bg-orange-500/90 text-white text-[9px] font-bold uppercase tracking-wide px-3 py-1 rounded-full text-center">
                Only {product.stock} left
              </div>
            </div>
          )}

          {/* Quick Add */}
          <AnimatePresence>
            {hovering && product.stock > 0 && (
              <motion.button
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={handleQuickAdd}
                data-testid="product-card-quick-add-button"
                disabled={adding}
                className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 py-3.5 font-semibold text-xs tracking-wide"
                style={{
                  background: adding ? 'rgba(31,107,87,1)' : 'rgba(26,60,52,0.96)',
                  color: 'var(--sattva-cream)',
                }}
              >
                <ShoppingBag size={13} strokeWidth={2.5} />
                {adding ? 'Adding...' : 'Add to Cart'}
              </motion.button>
            )}
          </AnimatePresence>

          {/* OOS overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-[var(--sattva-cream)]/55 flex items-center justify-center">
              <span className="bg-white text-gray-500 text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full border border-gray-200">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          {product.brand && (
            <p className="eyebrow text-[var(--sattva-gold-deep)] mb-1.5">{product.brand}</p>
          )}

          <h3 className="font-heading-serif text-[0.875rem] font-semibold text-[var(--sattva-ink)] leading-snug line-clamp-2 mb-2 group-hover:text-[var(--sattva-forest)] transition-colors duration-200">
            {product.name}
          </h3>

          {product.rating > 0 && (
            <div className="mb-2.5" data-testid="product-card-rating">
              <StarRating rating={product.rating} showCount count={product.reviewCount} />
            </div>
          )}

          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="price-tag text-base font-black text-[var(--sattva-forest)]">
                ₹{price?.toLocaleString('en-IN')}
              </span>
              {originalPrice > price && (
                <span className="price-tag text-xs text-gray-400 line-through">
                  ₹{originalPrice?.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            {discount >= 10 && (
              <span className="text-[10px] font-bold text-[var(--sattva-terracotta)]">Save {discount}%</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
