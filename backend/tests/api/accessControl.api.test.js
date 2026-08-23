jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());
jest.mock('../../src/config/stripe', () => require('../helpers/prismaMock').createStripeMock());

const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const prisma = require('../../src/config/database');
const { api } = require('../helpers/httpClient');
const { authHeader, AS } = require('../helpers/httpAuth');
const resetMocks = require('../helpers/resetMocks');

beforeEach(() => resetMocks({ prisma }));

/**
 * Matrice de cloisonnement. Chaque ligne est une route protégée : on vérifie
 * qu'un anonyme reçoit 401, qu'un rôle non autorisé reçoit 403, et — pour un
 * échantillon — qu'un rôle autorisé n'est PAS rejeté par les gardes.
 */
const PROTECTED_ROUTES = [
  // [méthode, chemin,                              rôles autorisés]
  ['post',   '/api/appointments',                    ['CLIENT']],
  ['get',    '/api/appointments/me',                 ['CLIENT', 'INTERVENANT']],
  ['get',    '/api/appointments',                    ['ADMIN']],
  ['get',    '/api/appointments/me/busy-slots',      ['CLIENT']],
  ['post',   '/api/appointments/validate-qr',        ['INTERVENANT']],
  ['get',    '/api/appointments/disputes',           ['ADMIN']],
  ['patch',  '/api/appointments/1/status',           ['CLIENT', 'INTERVENANT', 'ADMIN']],
  ['post',   '/api/appointments/1/cancel',           ['CLIENT']],
  ['post',   '/api/appointments/1/absent',           ['INTERVENANT']],
  ['post',   '/api/appointments/1/dispute',          ['CLIENT']],
  ['patch',  '/api/appointments/1/dispute',          ['ADMIN']],
  ['get',    '/api/users/me',                        ['CLIENT', 'INTERVENANT', 'ENTREPRISE', 'ADMIN']],
  ['get',    '/api/users',                           ['ADMIN']],
  ['get',    '/api/users/verifications/pending',     ['ADMIN']],
  ['patch',  '/api/users/1/verify',                  ['ADMIN']],
  ['patch',  '/api/users/1/deactivate',              ['ADMIN']],
  ['post',   '/api/users/me/photos',                 ['INTERVENANT']],
  ['get',    '/api/companies/employees',             ['ENTREPRISE']],
  ['get',    '/api/companies/join-code',             ['ENTREPRISE']],
  ['post',   '/api/companies/invites',               ['ENTREPRISE']],
  ['get',    '/api/companies/usage',                 ['ENTREPRISE']],
  ['get',    '/api/companies/my-quota',              ['CLIENT']],
  ['get',    '/api/companies/employer-plan',         ['CLIENT']],
  ['get',    '/api/coach-services/mine',             ['INTERVENANT']],
  ['post',   '/api/coach-services',                  ['INTERVENANT']],
  ['put',    '/api/coach-services/1',                ['INTERVENANT']],
  ['delete', '/api/coach-services/1',                ['INTERVENANT']],
  ['post',   '/api/parq/submit',                     ['CLIENT']],
  ['get',    '/api/parq/status',                     ['CLIENT']],
  ['get',    '/api/parq/me',                         ['CLIENT']],
  ['post',   '/api/reviews',                         ['CLIENT']],
  ['put',    '/api/reviews/1/reply',                 ['INTERVENANT']],
  ['post',   '/api/payments/checkout',               ['ENTREPRISE']],
  ['get',    '/api/payments/verify-session',         ['ENTREPRISE']],
  ['post',   '/api/payments/onboard',                ['INTERVENANT']],
  ['get',    '/api/payments/onboard/status',         ['INTERVENANT']],
  ['get',    '/api/payments/earnings',               ['INTERVENANT']],
  ['post',   '/api/payments/create-intent',          ['CLIENT']],
  ['get',    '/api/products',                        ['CLIENT']],
  ['get',    '/api/products/all',                    ['ADMIN']],
  ['post',   '/api/products',                        ['ADMIN']],
  ['get',    '/api/notifications',                   ['CLIENT', 'INTERVENANT', 'ENTREPRISE', 'ADMIN']],
];

const ALL_ROLES = ['CLIENT', 'INTERVENANT', 'ENTREPRISE', 'ADMIN'];
const userFor = (role) => ({ id: { CLIENT: 100, INTERVENANT: 200, ENTREPRISE: 300, ADMIN: 400 }[role], role });

describe('Cloisonnement — un anonyme ne franchit aucune route protégée', () => {
  it.each(PROTECTED_ROUTES.map(([m, p]) => [`${m.toUpperCase()} ${p}`, m, p]))(
    '%s → 401 sans jeton', async (_label, method, path) => {
      const res = await api(app)[method](path).send({});

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHORIZED');
    }
  );
});

describe('Cloisonnement — un rôle non autorisé est refusé en 403', () => {
  const cases = PROTECTED_ROUTES.flatMap(([method, path, allowed]) =>
    ALL_ROLES.filter((r) => !allowed.includes(r)).map((role) => [`${method.toUpperCase()} ${path}`, method, path, role])
  );

  it.each(cases)('%s interdit à un %s', async (_label, method, path, role) => {
    const res = await api(app)[method](path).set(authHeader(userFor(role))).send({});

    expect(res.status).toBe(403);
  });
});

describe('Cloisonnement — un rôle autorisé franchit bien les gardes', () => {
  const cases = PROTECTED_ROUTES.flatMap(([method, path, allowed]) =>
    allowed.map((role) => [`${role} sur ${method.toUpperCase()} ${path}`, method, path, role])
  );

  // On ne teste pas la réussite métier (l'infrastructure est simulée) mais le
  // franchissement des gardes. Un 403 peut venir de deux endroits très
  // différents : le middleware de rôle (« Acces reserve aux roles : … ») ou une
  // règle métier légitime — par exemple /companies/my-quota qui refuse un
  // client non rattaché à une entreprise. Seul le premier est un échec ici.
  const REFUS_DE_GARDE = 'Acces reserve aux roles';

  it.each(cases)('%s', async (_label, method, path, role) => {
    const res = await api(app)[method](path).set(authHeader(userFor(role))).send({});

    expect(res.status).not.toBe(401);
    expect(res.body.message || '').not.toContain(REFUS_DE_GARDE);
  });
});

describe('Routes publiques — accessibles sans jeton', () => {
  it.each([
    ['GET /api/health',                          'get', '/api/health'],
    ['GET /api/users/intervenants',              'get', '/api/users/intervenants'],
    ['GET /api/appointments/busy/:id',           'get', '/api/appointments/busy/200'],
    ['GET /api/coach-services/intervenant/:id',  'get', '/api/coach-services/intervenant/200'],
    ['GET /api/reviews/intervenant/:id',         'get', '/api/reviews/intervenant/200'],
    ['GET /api/users/:id/photos',                'get', '/api/users/200/photos'],
  ])('%s', async (_label, method, path) => {
    const res = await api(app)[method](path);

    expect(res.status).toBe(200);
  });
});

describe('Robustesse du jeton d\'accès', () => {
  const path = '/api/users/me';

  it('refuse un jeton signé avec un autre secret (401 INVALID_TOKEN)', async () => {
    const forged = jwt.sign({ userId: 400, role: 'ADMIN' }, 'secret_de_lattaquant');

    const res = await api(app).get(path).set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  it('refuse un jeton expiré (401 TOKEN_EXPIRED)', async () => {
    const expired = jwt.sign({ userId: 100, role: 'CLIENT' }, process.env.JWT_SECRET, { expiresIn: '-1s' });

    const res = await api(app).get(path).set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_EXPIRED');
  });

  it.each([
    ['schéma Basic',        'Basic YWxhZGRpbjpvcGVuc2VzYW1l'],
    ['jeton seul',          'eyJhbGciOiJIUzI1NiJ9.e30.x'],
    ['Bearer sans jeton',   'Bearer '],
    ['chaîne arbitraire',   'n-importe-quoi'],
  ])('refuse un en-tête Authorization au format « %s »', async (_label, header) => {
    const res = await api(app).get(path).set('Authorization', header);

    expect(res.status).toBe(401);
  });

  // Un refresh token n'ouvre pas les routes protégées : il ne sert qu'à
  // obtenir un nouvel access token via /api/auth/refresh.
  it('refuse un refresh token présenté comme access token', async () => {
    const { generateRefreshToken } = require('../../src/config/jwt');

    const res = await api(app).get(path).set('Authorization', `Bearer ${generateRefreshToken({ id: 100 })}`);

    expect(res.status).toBe(401);
  });

  // Élévation de privilège : le rôle vient du jeton signé, jamais du corps ni
  // d'un en-tête que le client contrôlerait.
  it('ignore un rôle ADMIN annoncé dans le corps de la requête', async () => {
    const res = await api(app)
      .get('/api/users')
      .set(authHeader(AS.client))
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(403);
  });
});
