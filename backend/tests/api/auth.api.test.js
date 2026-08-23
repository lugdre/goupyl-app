jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());
jest.mock('../../src/config/email', () => require('../helpers/prismaMock').createEmailMock());

const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { api } = require('../helpers/httpClient');
const prisma = require('../../src/config/database');
const redis = require('../../src/config/redis');
const resend = require('../../src/config/email');
const resetMocks = require('../helpers/resetMocks');
const { authHeader, AS } = require('../helpers/httpAuth');

beforeEach(() => resetMocks({ prisma, redis, email: resend }));

const VALID = {
  email: 'nouveau@test.fr', password: 'Password1!',
  firstName: 'Nouveau', lastName: 'Compte', role: 'CLIENT',
};

describe('POST /api/auth/register', () => {
  it('crée le compte et répond 201 avec la paire de jetons', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 1, email: VALID.email, role: 'CLIENT', firstName: 'N', lastName: 'C', isActive: true, createdAt: new Date() });

    const res = await api(app).post('/api/auth/register').send(VALID);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it.each([
    ['email mal formé',       { email: 'pas-un-email' },  'Format email invalide'],
    ['mot de passe trop court', { password: 'Pw1' },      'Minimum 8 caracteres'],
    ['mot de passe sans majuscule', { password: 'password1' }, 'Au moins une majuscule'],
    // Message anglais et non « Role invalide » : voir validators.zod4-regression.test.js
    ['rôle interdit',         { role: 'ADMIN' },          'Invalid option'],
  ])('refuse en 400 VALIDATION_ERROR : %s', async (_label, override, expectedMessage) => {
    const res = await api(app).post('/api/auth/register').send({ ...VALID, ...override });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.message).toContain(expectedMessage);
  });

  it('refuse un corps vide en 400 en listant les champs manquants', async () => {
    const res = await api(app).post('/api/auth/register').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('renvoie 409 EMAIL_ALREADY_EXISTS pour un email déjà pris', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: VALID.email });

    const res = await api(app).post('/api/auth/register').send(VALID);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('EMAIL_ALREADY_EXISTS');
  });
});

describe('POST /api/auth/login', () => {
  let hash;
  beforeAll(async () => { hash = await bcrypt.hash('Password1!', 4); });

  it('répond 200 avec l\'utilisateur et les jetons', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1, email: 'client@test.fr', passwordHash: hash, role: 'CLIENT', isActive: true,
      firstName: 'Sarah', lastName: 'Benali', createdAt: new Date(),
    });

    const res = await api(app).post('/api/auth/login').send({ email: 'client@test.fr', password: 'Password1!' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: 1, role: 'CLIENT' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('refuse un mot de passe erroné en 401', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, passwordHash: hash, role: 'CLIENT', isActive: true });

    const res = await api(app).post('/api/auth/login').send({ email: 'client@test.fr', password: 'Mauvais1!' });

    expect(res.status).toBe(401);
  });

  it('refuse un email inconnu en 401, avec le même message qu\'un mot de passe faux', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const res = await api(app).post('/api/auth/login').send({ email: 'inconnu@test.fr', password: 'Password1!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Email ou mot de passe incorrect');
  });

  it('refuse un compte désactivé en 403', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, passwordHash: hash, role: 'CLIENT', isActive: false });

    const res = await api(app).post('/api/auth/login').send({ email: 'client@test.fr', password: 'Password1!' });

    expect(res.status).toBe(403);
  });

  it('refuse des identifiants mal formés en 400 avant d\'interroger la base', async () => {
    const res = await api(app).post('/api/auth/login').send({ email: 'pas-un-email', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/refresh', () => {
  const { generateRefreshToken } = require('../../src/config/jwt');

  it('renvoie un nouvel access token pour un refresh token valide', async () => {
    const token = generateRefreshToken({ id: 1 });
    redis.get.mockResolvedValue(token);
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'a@b.fr', role: 'CLIENT', isActive: true });

    const res = await api(app).post('/api/auth/refresh').send({ refreshToken: token });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('renvoie 401 pour un refresh token révoqué', async () => {
    redis.get.mockResolvedValue(null);

    const res = await api(app).post('/api/auth/refresh').send({ refreshToken: generateRefreshToken({ id: 1 }) });

    expect(res.status).toBe(401);
  });

  it('renvoie 401 INVALID_TOKEN pour un jeton mal signé', async () => {
    const res = await api(app).post('/api/auth/refresh').send({ refreshToken: 'pas.un.jwt' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('INVALID_TOKEN');
  });

  it('exige le champ refreshToken', async () => {
    const res = await api(app).post('/api/auth/refresh').send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/logout', () => {
  it('révoque la session de l\'utilisateur authentifié', async () => {
    const res = await api(app).post('/api/auth/logout').set(authHeader(AS.client));

    expect(res.status).toBe(200);
    expect(redis.del).toHaveBeenCalledWith('refresh_token:100');
  });

  it('exige une authentification', async () => {
    const res = await api(app).post('/api/auth/logout');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });
});

describe('POST /api/auth/verify-email', () => {
  it('valide l\'email avec un jeton reconnu', async () => {
    redis.get.mockResolvedValue('7');

    const res = await api(app).post('/api/auth/verify-email').send({ token: 'abc' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('renvoie 400 INVALID_VERIFY_TOKEN pour un lien expiré', async () => {
    redis.get.mockResolvedValue(null);

    const res = await api(app).post('/api/auth/verify-email').send({ token: 'perime' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_VERIFY_TOKEN');
  });
});
