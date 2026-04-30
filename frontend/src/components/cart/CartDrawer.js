import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';

const CartDrawer = () => {
  const { cart, cartOpen, setCartOpen, updateQuantity, removeFromCart, itemCount } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setCartOpen(false);
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCartOpen(false)}
            className="fixed inset-0 bg-black/40 z-50"
          />

          {/* Drawer */}
          <motion.div
            data-testid="cart-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[var(--sattva-surface)] z-50 flex flex-col shadow-[var(--shadow-md)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--sattva-border)]">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-[var(--sattva-forest)]" />
                <span className="font-heading text-lg font-semibold text-[var(--sattva-ink)]">
                  Cart {itemCount > 0 && <span className="text-[var(--sattva-gold)]">({itemCount})</span>}
                </span>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-2 rounded-lg hover:bg-[var(--sattva-muted)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto">
              {cart.items?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
                  <div className="w-20 h-20 rounded-full bg-[var(--sattva-muted)] flex items-center justify-center">
                    <ShoppingBag size={32} className="text-[var(--sattva-forest)] opacity-50" />
                  </div>
                  <div>
                    <p className="font-heading text-lg text-[var(--sattva-ink)]">Your cart is empty</p>
                    <p className="text-sm text-gray-500 mt-1">Add some wellness rituals to your cart</p>
                  </div>
                  <button
                    onClick={() => { setCartOpen(false); navigate('/products'); }}
                    className="btn-primary"
                  >
                    Explore Products
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[color:var(--sattva-border)]">
                  {cart.items?.map((item) => (
                    <div key={item.productId} className="flex gap-4 p-4">
                      {/* Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--sattva-muted)] flex-shrink-0">
                        <img
                          src={item.product?.images?.[0] || 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&q=80'}
                          alt={item.product?.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-[var(--sattva-ink)] line-clamp-2 leading-snug">{item.product?.name}</p>
                        {item.variant && Object.keys(item.variant).length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">{Object.values(item.variant).join(', ')}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity */}
                          <div className="flex items-center gap-2 bg-[var(--sattva-muted)] rounded-lg px-2 py-1">
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)] transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-medium w-5 text-center tabular-nums">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)] transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm tabular-nums text-[var(--sattva-forest)]">
                              ₹{((item.product?.discountPrice || 0) * item.quantity).toLocaleString('en-IN')}
                            </span>
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.items?.length > 0 && (
              <div className="border-t border-[color:var(--sattva-border)] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Free shipping on orders above ₹499</span>
                  {cart.total >= 499 ? (
                    <span className="text-xs text-green-600 font-medium">Free shipping applied!</span>
                  ) : (
                    <span className="text-xs text-[var(--sattva-gold)] font-medium">₹{(499 - cart.total).toFixed(0)} more</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-heading text-lg text-[var(--sattva-ink)]">Total</span>
                  <span className="font-bold text-xl tabular-nums text-[var(--sattva-forest)]">₹{cart.total?.toLocaleString('en-IN')}</span>
                </div>
                <button
                  data-testid="cart-checkout-button"
                  onClick={handleCheckout}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                >
                  Proceed to Checkout
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate('/products')}
                  className="w-full text-sm text-[var(--sattva-forest)] hover:text-[var(--sattva-gold)] transition-colors text-center"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartDrawer;
