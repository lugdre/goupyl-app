import { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/auth.api';
import { userApi } from '../services/user.api';
import { passkeyApi } from '../services/passkey.api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    if (storedUser && accessToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authApi.register(formData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const loginWithPasskey = useCallback(async (email) => {
    const data = await passkeyApi.authenticate(email);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await userApi.getMe();
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data);
    } catch {}
  }, [user]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isClient: user?.role === 'CLIENT',
    isEntreprise: user?.role === 'ENTREPRISE',
    isIntervenant: user?.role === 'INTERVENANT',
    isAdmin: user?.role === 'ADMIN',
    register,
    login,
    loginWithPasskey,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
