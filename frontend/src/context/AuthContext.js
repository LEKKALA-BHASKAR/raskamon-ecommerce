import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { toast } from 'sonner';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token, user: userData } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password, phone) => {
    const res = await api.post('/auth/register', { name, email, password, phone });
    const { access_token, refresh_token, user: userData } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isStaff = ['admin', 'manager', 'support'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, isAdmin, isStaff, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
};
