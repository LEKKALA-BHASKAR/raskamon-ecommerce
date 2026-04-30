import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { toast } from 'sonner';

const CartContext = createContext({});
export const useCart = () => useContext(CartContext);

const getCartId = () => {
  let id = localStorage.getItem('cart_id');
  if (!id) {
    id = 'cart_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('cart_id', id);
  }
  return id;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const cartId = getCartId();

  const fetchCart = useCallback(async () => {
    try {
      const res = await api.get(`/cart/${cartId}`);
      setCart(res.data);
    } catch (err) {
      console.error('Cart fetch error:', err);
    }
  }, [cartId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1, variant = null) => {
    setLoading(true);
    try {
      await api.post(`/cart/${cartId}/items`, { product_id: productId, quantity, variant });
      await fetchCart();
      toast.success('Added to cart', {
        description: 'Item added to your cart',
        action: { label: 'View Cart', onClick: () => setCartOpen(true) }
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add to cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      await api.put(`/cart/${cartId}/items/${productId}`, { quantity });
      await fetchCart();
    } catch (err) {
      toast.error('Failed to update cart');
    }
  };

  const removeFromCart = async (productId) => {
    try {
      await api.delete(`/cart/${cartId}/items/${productId}`);
      await fetchCart();
      toast.success('Removed from cart');
    } catch (err) {
      toast.error('Failed to remove item');
    }
  };

  const clearCart = async () => {
    try {
      await api.delete(`/cart/${cartId}`);
      setCart({ items: [], total: 0 });
    } catch (err) {
      console.error('Clear cart error:', err);
    }
  };

  const itemCount = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider value={{
      cart, cartId, cartOpen, setCartOpen, loading,
      addToCart, updateQuantity, removeFromCart, clearCart,
      fetchCart, itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
};
