jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());

const request = require('supertest');
const app = require('../../src/app');

/**
 * Le limiteur de débit compte par adresse IP. Ce fichier est le seul à
 * réutiliser volontairement une IP fixe, pour déclencher le plafond ;
 * les autres suites passent par `helpers/httpClient` qui simule une IP
 * distincte à chaque appel.
 *
 * Le compteur vit dans la mémoire de l'application, elle-même chargée une fois
 * par fichier de test : ce fichier doit donc rester isolé.
 */
const from = (ip) => (path, body) =>
  request(app).post(path).set('X-Forwarded-For', ip).send(body ?? {});

describe('Limitation de débit sur les routes d\'authentification (10 req/min/IP)', () => {
  it('laisse passer les 10 premières tentatives de connexion puis renvoie 429', async () => {
    const post = from('203.0.113.10');
    const statuses = [];

    for (let i = 0; i < 12; i += 1) {
      const res = await post('/api/auth/login', { email: 'a@b.fr', password: 'Password1!' });
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 10)).not.toContain(429);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it('renvoie un corps exploitable par le frontend lors du blocage', async () => {
    const post = from('203.0.113.11');
    let res;
    for (let i = 0; i < 11; i += 1) res = await post('/api/auth/login', { email: 'a@b.fr', password: 'x' });

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ error: 'RATE_LIMITED' });
    expect(res.body.message).toContain('Trop de tentatives');
  });

  it('compte séparément chaque adresse IP — un attaquant ne bloque pas les autres', async () => {
    const attaquant = from('203.0.113.12');
    for (let i = 0; i < 11; i += 1) await attaquant('/api/auth/login', { email: 'a@b.fr', password: 'x' });

    const legitime = await from('203.0.113.13')('/api/auth/login', { email: 'a@b.fr', password: 'x' });

    expect(legitime.status).not.toBe(429);
  });

  it('protège aussi l\'inscription', async () => {
    const post = from('203.0.113.14');
    let res;
    for (let i = 0; i < 11; i += 1) res = await post('/api/auth/register', {});

    expect(res.status).toBe(429);
  });

  // Le limiteur est laissé sur sa configuration par défaut, qui émet les
  // en-têtes historiques `X-RateLimit-*`. Les en-têtes normalisés
  // `RateLimit-*` (draft IETF) s'obtiendraient avec
  // `standardHeaders: 'draft-7'` — amélioration possible, sans incidence
  // fonctionnelle aujourd'hui.
  it('expose le quota restant dans les en-têtes X-RateLimit-*', async () => {
    const res = await from('203.0.113.15')('/api/auth/login', { email: 'a@b.fr', password: 'x' });

    expect(res.headers['x-ratelimit-limit']).toBe('10');
    expect(res.headers['x-ratelimit-remaining']).toBe('9');
  });

  // Le plafond global (100 req/min) est nettement plus haut : les routes non
  // sensibles ne doivent pas être bridées au même rythme que l'authentification.
  it('n\'applique pas le plafond d\'authentification aux autres routes', async () => {
    const ip = '203.0.113.16';
    const statuses = [];

    for (let i = 0; i < 15; i += 1) {
      const res = await request(app).get('/api/health').set('X-Forwarded-For', ip);
      statuses.push(res.status);
    }

    expect(statuses.every((s) => s === 200)).toBe(true);
  });
});
