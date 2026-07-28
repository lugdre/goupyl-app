import axios from 'axios';
import { isTokenExpired } from '../utils/token';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const AUTH_ROUTE_RE = /\/auth\/(login|register|refresh|google)/;

export function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

// L'AuthProvider s'enregistre ici pour reagir a une session morte sans
// rechargement complet de la page (window.location = reset de tout le SPA).
let sessionExpiredHandler = null;
export function onSessionExpired(handler) {
  sessionExpiredHandler = handler;
}

export function expireSession() {
  clearSession();
  if (sessionExpiredHandler) sessionExpiredHandler();
  else window.location.href = '/login';
}

/**
 * Distingue "session reellement morte" (on deconnecte) de "backend injoignable
 * / endormi" (on garde la session, l'utilisateur reessaiera).
 */
export function isDeadSession(error) {
  if (error?.message === 'SESSION_EXPIRED') return true;
  const status = error?.response?.status;
  return status === 401 || status === 403;
}

// Un seul refresh en vol a la fois : tous les appelants attendent la meme
// promesse (plus besoin de file d'attente manuelle).
let refreshPromise = null;

export function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem('refreshToken');
  // Refresh token absent ou perime (>7j) : inutile d'appeler l'API, surtout
  // quand le backend dort (chaque aller-retour coute une minute de cold start).
  if (!refreshToken || isTokenExpired(refreshToken)) {
    return Promise.reject(new Error('SESSION_EXPIRED'));
  }

  refreshPromise = axios
    .post('/api/auth/refresh', { refreshToken })
    .then(({ data }) => {
      localStorage.setItem('accessToken', data.accessToken);
      return data.accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

// Ajout automatique du token JWT a chaque requete. Si l'access token est deja
// expire, on le renouvelle AVANT d'envoyer : evite la rafale de 401 quand on
// revient sur l'app apres plusieurs heures.
api.interceptors.request.use(
  async (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    if (AUTH_ROUTE_RE.test(config.url || '')) return config;

    let token = localStorage.getItem('accessToken');
    if (token && isTokenExpired(token, 10) && localStorage.getItem('refreshToken')) {
      try {
        token = await refreshAccessToken();
      } catch (err) {
        if (isDeadSession(err)) {
          expireSession();
          throw new axios.Cancel('SESSION_EXPIRED');
        }
        throw err; // backend injoignable : on ne deconnecte pas
      }
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Filet de securite : 401 malgre un token non expire (secret tourne, compte
// desactive, refresh token revoque cote Redis...).
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Un 401 sur les routes d'auth (login/register/refresh) = mauvais
    // identifiants ou session expiree, PAS un access token a rafraichir.
    // On laisse l'erreur remonter pour l'afficher normalement.
    const isAuthRoute = AUTH_ROUTE_RE.test(originalRequest?.url || '');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (isDeadSession(refreshError)) expireSession();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
