import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Heart, ShoppingBag, Share2, ChevronLeft, ChevronRight, Check, Minus, Plus, Truck, Shield, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import Layout from '../components/layout/Layout';
import ProductCard from '../components/product/ProductCard';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const StarRating = ({ rating, size = 16, interactive = false, onRate }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Star
        key={i}
        size={size}
        onClick={() => interactive && onRate && onRate(i)}
        className={`${i <= Math.round(rating) ? 'text-[var(--sattva-gold)] fill-current' : 'text-gray-300'} ${
          interactive ? 'cursor-pointer hover:text-[var(--sattva-gold)]' : ''
        }`}
      />
    ))}
  </div>
);

const ProductDetail = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);
  const [pincode, setPincode] = useState('');
  const [pincodeMsg, setPincodeMsg] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${slug}`);
        setProduct(res.data);
        const [relRes, revRes] = await Promise.all([
          api.get(`/products/${res.data.id}/related?limit=4`),
          api.get(`/reviews/product/${res.data.id}?limit=5`)
        ]);
        setRelated(relRes.data);
        setReviews(revRes.data.reviews || []);
      } catch {
        navigate('/products');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug, navigate]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product.id, quantity);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addToCart(product.id, quantity);
    navigate('/checkout');
  };

  const handleWishlist = async () => {
    if (!user) { toast.error('Please login to save wishlist'); return; }
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
    } catch { toast.error('Error updating wishlist'); }
  };

  const checkPincode = () => {
    if (pincode.length !== 6) { setPincodeMsg('Enter valid 6-digit pincode'); return; }
    const serviceableStates = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata'];
    setPincodeMsg('Delivery available! Expected: 3-5 business days');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product?.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const submitReview = async () => {
    if (!user) { toast.error('Please login to review'); return; }
    if (!reviewForm.title || !reviewForm.body) { toast.error('Please fill all fields'); return; }
    setSubmittingReview(true);
    try {
      const res = await api.post('/reviews/', { product: product.id, ...reviewForm });
      setReviews([res.data, ...reviews]);
      setReviewForm({ rating: 5, title: '', body: '' });
      toast.success('Review submitted!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container-sattva py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="aspect-square skeleton rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 skeleton rounded-lg w-3/4" />
              <div className="h-6 skeleton rounded-lg w-1/2" />
              <div className="h-4 skeleton rounded-lg" />
              <div className="h-4 skeleton rounded-lg w-5/6" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) return null;

  const discount = product.price > product.discountPrice
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0;

  return (
    <Layout>
      <div className="container-sattva py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link to="/" className="hover:text-[var(--sattva-forest)]">Home</Link>
          <span>/</span>
          <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-[var(--sattva-forest)]">{product.category}</Link>
          <span>/</span>
          <span className="text-[var(--sattva-ink)] font-medium line-clamp-1">{product.name}</span>
        </div>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14">
          {/* Gallery */}
          <div data-testid="pdp-image-gallery">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-[var(--sattva-muted)] mb-3">
              <motion.img
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                src={product.images?.[selectedImage] || 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.images?.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(i => (i - 1 + product.images.length) % product.images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-[var(--sattva-surface)] rounded-full flex items-center justify-center shadow-sm"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    data-testid="pdp-image-zoom-button"
                    onClick={() => setSelectedImage(i => (i + 1) % product.images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-[var(--sattva-surface)] rounded-full flex items-center justify-center shadow-sm"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {product.images?.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setSelectedImage(i)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === i ? 'border-[var(--sattva-forest)]' : 'border-transparent'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <p className="text-[var(--sattva-gold)] text-xs font-semibold uppercase tracking-wider mb-1">{product.brand}</p>
            <h1 className="font-heading text-2xl md:text-3xl font-semibold text-[var(--sattva-ink)] leading-tight mb-3">{product.name}</h1>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <StarRating rating={product.rating} />
                <span className="text-sm text-[var(--sattva-gold)] font-semibold">{product.rating}</span>
                <span className="text-sm text-gray-500">({product.reviewCount} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-3 mb-4">
              <span className="font-bold text-2xl tabular-nums text-[var(--sattva-forest)]">₹{product.discountPrice?.toLocaleString('en-IN')}</span>
              {product.price > product.discountPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through tabular-nums">₹{product.price?.toLocaleString('en-IN')}</span>
                  <span className="px-2 py-0.5 text-xs font-bold bg-green-100 text-green-700 rounded-full">{discount}% off</span>
                </>
              )}
            </div>

            {/* Stock */}
            <div className="mb-4">
              {product.stock > 10 ? (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <Check size={14} /> In Stock
                </span>
              ) : product.stock > 0 ? (
                <span className="text-sm text-orange-600">Only {product.stock} left</span>
              ) : (
                <span className="text-sm text-red-500">Out of Stock</span>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-[var(--sattva-ink)]">Quantity</span>
              <div className="flex items-center gap-3 bg-[var(--sattva-muted)] rounded-lg px-3 py-2">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-[var(--sattva-forest)]">
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-semibold tabular-nums">{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="text-[var(--sattva-forest)]">
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <button
                data-testid="pdp-add-to-cart-button"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                <ShoppingBag size={16} /> Add to Cart
              </button>
              <button
                onClick={handleBuyNow}
                disabled={product.stock === 0}
                className="flex-1 btn-secondary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                Buy Now
              </button>
              <button
                onClick={handleWishlist}
                className={`p-3 rounded-[0.75rem] border transition-colors ${
                  wishlisted ? 'border-red-300 bg-red-50' : 'border-[color:var(--sattva-border)] hover:bg-[var(--sattva-muted)]'
                }`}
              >
                <Heart size={18} className={wishlisted ? 'fill-red-500 text-red-500' : 'text-[var(--sattva-forest)]'} />
              </button>
              <button onClick={handleShare} className="p-3 rounded-[0.75rem] border border-[color:var(--sattva-border)] hover:bg-[var(--sattva-muted)] transition-colors">
                <Share2 size={18} className="text-[var(--sattva-forest)]" />
              </button>
            </div>

            {/* Pincode Checker */}
            <div className="p-4 bg-[var(--sattva-muted)] rounded-xl mb-4">
              <p className="text-sm font-medium text-[var(--sattva-ink)] mb-2 flex items-center gap-2">
                <Truck size={14} /> Check Delivery
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter pincode"
                  className="flex-1 px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg bg-[var(--sattva-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--sattva-gold)]"
                />
                <button onClick={checkPincode} className="px-4 py-2 bg-[var(--sattva-forest)] text-[var(--sattva-cream)] text-sm rounded-lg hover:bg-[#152f28] transition-colors">
                  Check
                </button>
              </div>
              {pincodeMsg && <p className="text-xs mt-2 text-green-600">{pincodeMsg}</p>}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Shield, label: '100% Authentic' },
                { icon: RefreshCw, label: '7-day Returns' },
                { icon: Truck, label: 'Free Shipping ₹499+' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 p-2 bg-[var(--sattva-muted)] rounded-lg text-center">
                  <Icon size={14} className="text-[var(--sattva-forest)]" />
                  <span className="text-[10px] font-medium text-[var(--sattva-ink)]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-10">
          <Tabs defaultValue="description">
            <TabsList className="bg-[var(--sattva-muted)] rounded-lg">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
              <TabsTrigger value="how-to-use">How to Use</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({product.reviewCount || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <div className="prose max-w-none text-[var(--sattva-ink)] text-sm leading-relaxed">
                <p>{product.description}</p>
              </div>
            </TabsContent>

            <TabsContent value="ingredients" className="mt-6">
              <div className="text-sm text-[var(--sattva-ink)] leading-relaxed">
                {product.ingredients || 'Ingredients information not available.'}
              </div>
            </TabsContent>

            <TabsContent value="how-to-use" className="mt-6">
              <div className="text-sm text-[var(--sattva-ink)] leading-relaxed">
                {product.howToUse || 'Usage information not available.'}
              </div>
            </TabsContent>

            <TabsContent value="reviews" data-testid="pdp-reviews-section" className="mt-6">
              {/* Review Form */}
              {user && (
                <div className="card-sattva p-6 mb-6">
                  <h4 className="font-heading text-base font-semibold mb-4">Write a Review</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Rating</label>
                      <StarRating rating={reviewForm.rating} size={20} interactive onRate={(r) => setReviewForm(f => ({...f, rating: r}))} />
                    </div>
                    <input
                      type="text"
                      value={reviewForm.title}
                      onChange={(e) => setReviewForm(f => ({...f, title: e.target.value}))}
                      placeholder="Review title"
                      className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg bg-[var(--sattva-surface)] focus:outline-none"
                    />
                    <textarea
                      value={reviewForm.body}
                      onChange={(e) => setReviewForm(f => ({...f, body: e.target.value}))}
                      placeholder="Share your experience..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-[color:var(--sattva-border)] rounded-lg bg-[var(--sattva-surface)] focus:outline-none resize-none"
                    />
                    <button
                      data-testid="review-submit-button"
                      onClick={submitReview}
                      disabled={submittingReview}
                      className="btn-primary py-2 px-6"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No reviews yet. Be the first to review!</p>
                ) : reviews.map((review) => (
                  <div key={review.id} className="card-sattva p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm text-[var(--sattva-ink)]">{review.userName}</p>
                        {review.verified && <span className="text-[10px] text-green-600 font-medium">Verified Purchase</span>}
                      </div>
                      <StarRating rating={review.rating} size={12} />
                    </div>
                    <p className="font-medium text-sm text-[var(--sattva-ink)] mb-1">{review.title}</p>
                    <p className="text-sm text-gray-600">{review.body}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-14">
            <h2 className="font-heading text-xl font-semibold text-[var(--sattva-ink)] mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ProductDetail;
