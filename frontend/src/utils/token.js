/**
 * Lecture locale des JWT (aucun appel reseau).
 * Sert a savoir si une session stockee est encore utilisable avant meme
 * d'appeler l'API — evite d'afficher un etat connecte qui ne l'est plus.
 */

export function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * @param {string} token
 * @param {number} skewSeconds marge de securite : un token qui expire dans
 *   moins de `skewSeconds` est deja considere comme expire.
 */
export function isTokenExpired(token, skewSeconds = 0) {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}
