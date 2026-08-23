const request = require('supertest');
const app = require('../../src/app');

/**
 * Client HTTP des tests d'intégration.
 *
 * Deux précautions, l'une et l'autre nécessaires à la stabilité de la suite :
 *
 * 1. UN SEUL serveur par fichier de test. `supertest(app)` démarre sinon un
 *    serveur éphémère par requête ; sur plusieurs dizaines d'appels, les
 *    sockets laissés en TIME_WAIT provoquent des « socket hang up »
 *    intermittents. On ouvre donc un port une fois pour toutes.
 *
 * 2. Une IP simulée distincte par requête. L'application déclare
 *    `trust proxy 1` et limite /api/auth/* à 10 requêtes/minute et par IP :
 *    sans rotation, une suite un peu longue déclencherait des 429 aléatoires
 *    selon l'ordre d'exécution.
 */
let server = null;
let counter = 0;

const startServer = () => {
  if (!server) server = app.listen(0);
  return server;
};

const stopServer = () =>
  new Promise((resolve) => {
    if (!server) return resolve();
    const closing = server;
    server = null;
    closing.close(resolve);
  });

const nextIp = () => {
  counter += 1;
  return `10.${(counter >> 16) & 255}.${(counter >> 8) & 255}.${counter & 255}`;
};

/** Requête anonyme. `http().get('/api/...')` */
const http = () => {
  const ip = nextIp();
  const wrap = (method) => (url) => request(server)[method](url).set('X-Forwarded-For', ip);
  return {
    get: wrap('get'), post: wrap('post'), put: wrap('put'),
    patch: wrap('patch'), delete: wrap('delete'),
  };
};

/** Requête authentifiée avec un jeton réellement signé. */
const asUser = (accessToken) => {
  const client = http();
  const withAuth = (method) => (url) => client[method](url).set('Authorization', `Bearer ${accessToken}`);
  return {
    get: withAuth('get'), post: withAuth('post'), put: withAuth('put'),
    patch: withAuth('patch'), delete: withAuth('delete'),
  };
};

/** Jeton d'accès pour un utilisateur déjà présent en base. */
const tokenFor = (user) => require('../../src/config/jwt').generateAccessToken(user);

/** Raccourci : requêtes authentifiées à partir d'un enregistrement utilisateur. */
const as = (user) => asUser(tokenFor(user));

module.exports = { app, startServer, stopServer, http, asUser, as, tokenFor };
