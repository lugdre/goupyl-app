const request = require('supertest');

let counter = 0;
const nextIp = () => {
  counter += 1;
  return `10.${(counter >> 16) & 255}.${(counter >> 8) & 255}.${counter & 255}`;
};

/**
 * Client HTTP de test.
 *
 * L'application déclare `trust proxy 1` et applique un limiteur de débit par
 * adresse IP (10 requêtes/min sur /api/auth/login et /register). Toutes les
 * requêtes de test partant de la même boucle locale, une suite de plus de dix
 * cas déclencherait un 429 qui masquerait le comportement réellement testé.
 *
 * Chaque appel à `api(app)` simule donc une IP cliente distincte via
 * X-Forwarded-For — exactement ce que fait un reverse proxy en production.
 * Le limiteur lui-même est vérifié dans rateLimit.api.test.js, qui réutilise
 * volontairement une IP unique.
 */
const api = (app) => {
  const ip = nextIp();
  const wrap = (method) => (url) => request(app)[method](url).set('X-Forwarded-For', ip);
  return {
    get: wrap('get'), post: wrap('post'), put: wrap('put'),
    patch: wrap('patch'), delete: wrap('delete'),
  };
};

module.exports = { api };
