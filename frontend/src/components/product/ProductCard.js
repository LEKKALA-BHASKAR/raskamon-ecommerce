import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Heart, ShoppingBag, Eye } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { toast } from 'sonner';

const StarRating = ({ rating, size = 12 }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star
        key={i}
        size={size}
        className={i <= Math.round(rating) ? 'star-filled fill-current' : 'star-empty'}
      />
    ))}
  </div>
);

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [wishlisted, setWishlisted] = React.useState(false);
  const [imgLoaded, setImgLoaded] = React.useState(false);

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!user) { toast.error('Please login to save to wishlist'); return; }
    try {
      if (wishlisted) {
        await api.delete(`/users/me/wishlist/${product.id}`);
        setWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        await api.post(`/users/me/wishlist/${product.id}`);
        setWishlisted(true);
        toast.success('Added to wishlist');
      }
    } catch {
      toast.error('Failed to update wishlist');
    }
  };

  const handleQuickAdd = (e) => {
    e.preventDefault();
    addToCart(product.id, 1);
  };

  const discount = product.price > product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  return (
    <motion.div
      data-testid="product-card"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group card-sattva overflow-hidden"
    >
      <Link to={`/products/${product.slug}`} className="block">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-[var(--sattva-muted)]">
          {!imgLoaded && <div className="absolute inset-0 skeleton" />}
          <img
            src={product.images?.[0] || 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&q=80'}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
            loading="lazy"
          />

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.isFeatured && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[var(--sattva-gold)] text-[var(--sattva-forest)]">Bestseller</span>
            )}
            {discount >= 10 && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[var(--sattva-forest)] text-[var(--sattva-cream)]">{discount}% off</span>
            )}
          </div>

          {/* Wishlist */}
          <button
            data-testid="product-card-wishlist-button"
            onClick={handleWishlist}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[var(--sattva-surface)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            aria-label="Add to wishlist"
          >
            <Heart
              size={14}
              className={wishlisted ? 'fill-red-500 text-red-500' : 'text-[var(--sattva-forest)]'}
            />
          </button>

          {/* Quick actions overlay */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <button
              data-testid="product-card-quick-add-button"
              onClick={handleQuickAdd}
              className="w-full py-2.5 bg-[var(--sattva-forest)] text-[var(--sattva-cream)] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#152f28] transition-colors"
            >
              <ShoppingBag size={13} />
              Add to Cart
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs text-[var(--sattva-gold)] font-medium uppercase tracking-wider mb-1">{product.brand}</p>
          <h3 className="font-heading text-sm font-medium text-[var(--sattva-ink)] leading-snug line-clamp-2">{product.name}</h3>

          {/* Rating */}
          {product.rating > 0 && (
            <div data-testid="product-card-rating" className="flex items-center gap-1.5 mt-1.5">
              <StarRating rating={product.rating} />
              <span className="text-[10px] text-gray-400">({product.reviewCount || 0})</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 mt-2">
            <span className="price-tag font-bold text-[var(--sattva-forest)] text-sm">₹{product.discountPrice?.toLocaleString('en-IN')}</span>
            {product.price > product.discountPrice && (
              <span className="price-tag text-xs text-gray-400 line-through">₹{product.price?.toLocaleString('en-IN')}</span>
            )}
          </div>

          {/* Stock */}
          {product.stock <= 10 && product.stock > 0 && (
            <p className="text-[10px] text-orange-600 font-medium mt-1">Only {product.stock} left</p>
          )}
          {product.stock === 0 && (
            <p className="text-[10px] text-red-500 font-medium mt-1">Out of stock</p>
          )}
        </div>
      </Link>
    </motion.div>
  );
};

export { StarRating };
export default ProductCard;
