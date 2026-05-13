import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'sonner';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Canonicalise role strings (case-insensitive + legacy → Phase 1 mapping)
const LEGACY_ROLE_MAP = {
  admin: 'ADMIN',
  manager: 'ADMIN',
  sub_admin: 'SUB_ADMIN',
  staff: 'SUB_ADMIN',
  support: 'SUB_ADMIN',
  customer: 'B2C_CUSTOMER',
  vendor: 'VENDOR',
  b2b: 'B2B_BUYER',
};
export const normalizeRole = (role) => {
  if (!role) return '';
  const r = String(role).trim();
  if (!r) return '';
  if (r === r.toUpperCase()) return r;
  return LEGACY_ROLE_MAP[r.toLowerCase()] || r.toUpperCase();
};

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Unified login (auth_v2) — supports B2C, B2B, Vendor, Admin
  // Returns normalized user object with canonical role.
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth_v2/login', { email, password });

      // Handle 2FA required response — backend returns requires_2fa flag
      if (res.data?.requires_2fa) {
        return { requires_2fa: true, email };
      }

      const { access_token, refresh_token, user: userData } = res.data.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      setUser(userData);
      return userData;
    } catch (err) {
      // Structured 403 responses for PENDING / REJECTED / blocked accounts
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === 'object' && detail.code) {
        const err2 = new Error(detail.message || 'Login failed');
        err2.code = detail.code;
        err2.details = detail.details;
        err2.status = err.response?.status;
        throw err2;
      }
      throw err;
    }
  };

  // Legacy B2C register (unchanged)
  const register = async (name, email, password, phone) => {
    const res = await api.post('/auth/register', { name, email, password, phone });
    const { access_token, refresh_token, user: userData } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(userData);
    return userData;
  };

  // Phase 1 — B2B registration (returns { user_id, approval_status: 'PENDING' })
  const registerB2B = async (payload) => {
    const res = await api.post('/auth_v2/register-b2b', payload);
    return res.data?.data;
  };

  // Phase 1 — Vendor registration (returns { user_id, vendor_id, approval_status: 'PENDING' })
  const registerVendor = async (payload) => {
    const res = await api.post('/auth_v2/register-vendor', payload);
    return res.data?.data;
  };

  // Google OAuth login
  const loginWithGoogle = async (googleToken) => {
    const res = await api.post('/auth/enhanced/google', { token: googleToken });
    const { access_token, refresh_token, user: userData } = res.data.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(userData);
    return userData;
  };

  // Mobile OTP — step 1: send OTP
  const sendMobileOTP = async (phone) => {
    const res = await api.post('/auth/enhanced/mobile/send-otp', { phone });
    return res.data;
  };

  // Mobile OTP — step 2: verify and login
  const verifyMobileOTP = async (phone, otp) => {
    const res = await api.post('/auth/enhanced/mobile/verify-otp', { phone, otp });
    const { access_token, refresh_token, user: userData } = res.data.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    setUser(userData);
    return res.data.data;
  };

  // 2FA login (after initial login returns requires_2fa)
  const loginWith2FA = async (email, password, totpCode) => {
    const res = await api.post('/auth/enhanced/login-2fa', { email, password, totp_code: totpCode });
    const { access_token, refresh_token, user: userData } = res.data.data;
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

  const canonicalRole = normalizeRole(user?.role);
  const isAdmin = canonicalRole === 'ADMIN' || canonicalRole === 'SUB_ADMIN';
  const isStaff = ['ADMIN', 'SUB_ADMIN'].includes(canonicalRole);
  const isVendor = canonicalRole === 'VENDOR';
  const isB2B = canonicalRole === 'B2B_BUYER';

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        loginWithGoogle,
        sendMobileOTP,
        verifyMobileOTP,
        loginWith2FA,
        register,
        registerB2B,
        registerVendor,
        logout,
        fetchMe,
        canonicalRole,
        isAdmin,
        isStaff,
        isVendor,
        isB2B,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
