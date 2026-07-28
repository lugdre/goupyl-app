import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../services/auth.api';
import { userApi } from '../services/user.api';
import { passkeyApi } from '../services/passkey.api';
import { clearSession, isDeadSession, onSessionExpired, refreshAccessToken } from '../services/api';
import { isTokenExpired } from '../utils/token';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    wasAuthenticated.current = !!user;
  }, [user]);

  // Session invalidee par l'API (refresh refuse) : on repasse en deconnecte
  // sans rechargement complet de la page.
  useEffect(() => {
    onSessionExpired(() => {
      if (wasAuthenticated.current) {
        toast.error('Session expiree, merci de vous reconnecter.');
      }
      setUser(null);
    });
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    // Session morte (refresh token absent ou perime) : on nettoie tout de
    // suite, sans reseau. La navbar affiche "Connexion" au lieu d'un
    // "Mon espace" qui menerait a une page bloquee.
    if (!storedUser || !accessToken || !refreshToken || isTokenExpired(refreshToken)) {
      clearSession();
      setLoading(false);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(storedUser);
    } catch {
      clearSession();
      setLoading(false);
      return;
    }
    setUser(parsed);

    // Access token encore valide : rien a faire.
    if (!isTokenExpired(accessToken, 30)) {
      setLoading(false);
      return;
    }

    // Session dormante : on renouvelle une seule fois au demarrage (ce qui
    // reveille aussi le backend Render) au lieu de laisser chaque page du
    // dashboard se prendre un 401.
    refreshAccessToken()
      .catch((err) => {
        // Un backend endormi ou une coupure reseau ne doit pas deconnecter.
        if (isDeadSession(err)) {
          clearSession();
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
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

  const googleAuth = useCallback(async (credential, extra = {}) => {
    const { data } = await authApi.google({ credential, ...extra });
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
    clearSession();
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
    googleAuth,
    loginWithPasskey,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
