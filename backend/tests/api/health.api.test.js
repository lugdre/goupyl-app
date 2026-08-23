jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());

const request = require('supertest');
const app = require('../../src/app');

describe('Infrastructure HTTP de l\'API', () => {
  it('GET /api/health répond 200 avec un état exploitable par la supervision', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'OK', environment: 'test' });
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('renvoie un 404 explicite et non une page HTML sur une route inconnue', async () => {
    const res = await request(app).get('/api/route-qui-nexiste-pas');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
    expect(res.body.message).toContain('GET /api/route-qui-nexiste-pas');
  });

  it('positionne les en-têtes de sécurité de Helmet', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-dns-prefetch-control': 'off',
    });
    expect(res.headers).toHaveProperty('strict-transport-security');
  });

  it('n\'annonce pas le moteur applicatif (X-Powered-By masqué)', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('autorise l\'origine du frontend en CORS', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  // ⚠ Test de caractérisation — DÉFAUT CONNU, révélé par cette suite.
  // `express.json()` lève un SyntaxError portant `status: 400` et
  // `type: 'entity.parse.failed'`, mais errorHandler ne teste que
  // `err.isOperational` : la requête retombe donc dans la branche 500. Un corps
  // mal formé, qui est une faute du client, est ainsi compté comme une erreur
  // serveur et pollue la supervision.
  // Correctif proposé (errorHandler.middleware.js, avant la branche finale) :
  //   if (err.type === 'entity.parse.failed') {
  //     return res.status(400).json({ error: 'INVALID_JSON', message: 'Corps de requête JSON invalide.' });
  //   }
  // Ce test fige le comportement actuel et deviendra rouge dès que le
  // correctif sera appliqué — il faudra alors basculer l'attente sur 400.
  it('retourne aujourd\'hui 500 sur un JSON malformé (défaut connu, correctif documenté)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('INTERNAL_ERROR');
  });
});
