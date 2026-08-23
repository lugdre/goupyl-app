const jwt = require('jsonwebtoken');
const authenticate = require('../../src/middlewares/auth.middleware');
const authorize = require('../../src/middlewares/role.middleware');
const validate = require('../../src/middlewares/validate.middleware');
const errorHandler = require('../../src/middlewares/errorHandler.middleware');
const ApiError = require('../../src/utils/apiError');
const { generateAccessToken } = require('../../src/config/jwt');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('middlewares/auth — authentification par Bearer token', () => {
  it('renseigne req.user à partir d\'un token valide', () => {
    const req = { headers: { authorization: `Bearer ${generateAccessToken({ id: 12, role: 'CLIENT' })}` } };
    const next = jest.fn();

    authenticate(req, mockRes(), next);

    expect(req.user).toEqual({ userId: 12, role: 'CLIENT' });
    expect(next).toHaveBeenCalledWith(); // pas d'erreur
  });

  it.each([
    ['header absent', {}],
    ['schéma non Bearer', { authorization: 'Basic abc' }],
    ['chaîne vide', { authorization: '' }],
  ])('rejette en 401 quand le %s', (_label, headers) => {
    const next = jest.fn();
    authenticate({ headers }, mockRes(), next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.errorCode).toBe('UNAUTHORIZED');
  });

  it('transmet un JsonWebTokenError quand la signature est invalide', () => {
    const forged = jwt.sign({ userId: 1, role: 'ADMIN' }, 'mauvais_secret');
    const next = jest.fn();

    authenticate({ headers: { authorization: `Bearer ${forged}` } }, mockRes(), next);

    expect(next.mock.calls[0][0].name).toBe('JsonWebTokenError');
  });

  it('transmet un TokenExpiredError quand le token a expiré', () => {
    const expired = jwt.sign({ userId: 1 }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    const next = jest.fn();

    authenticate({ headers: { authorization: `Bearer ${expired}` } }, mockRes(), next);

    expect(next.mock.calls[0][0].name).toBe('TokenExpiredError');
  });
});

describe('middlewares/role — autorisation par rôle', () => {
  it('laisse passer un rôle autorisé', () => {
    const next = jest.fn();
    authorize('CLIENT', 'ADMIN')({ user: { role: 'ADMIN' } }, mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('renvoie 403 pour un rôle non autorisé, en listant les rôles attendus', () => {
    const next = jest.fn();
    authorize('ADMIN')({ user: { role: 'CLIENT' } }, mockRes(), next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain('ADMIN');
  });

  it('renvoie 401 si aucun utilisateur n\'est authentifié', () => {
    const next = jest.fn();
    authorize('ADMIN')({}, mockRes(), next);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });
});

describe('middlewares/validate — validation Zod', () => {
  const { z } = require('zod');
  const schema = z.object({
    email: z.string().email('Format email invalide'),
    age: z.number().int().min(18, 'Majeur requis'),
  });

  it('remplace req.body par la valeur parsée (coercions et trims appliqués)', () => {
    const trimming = z.object({ name: z.string().trim().toLowerCase() });
    const req = { body: { name: '  MARC  ' } };
    const next = jest.fn();

    validate(trimming)(req, mockRes(), next);

    expect(req.body).toEqual({ name: 'marc' });
    expect(next).toHaveBeenCalledWith();
  });

  it('renvoie 400 VALIDATION_ERROR avec les messages concaténés', () => {
    const next = jest.fn();
    validate(schema)({ body: { email: 'pas-un-email', age: 12 } }, mockRes(), next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.errorCode).toBe('VALIDATION_ERROR');
    expect(err.message).toContain('Format email invalide');
    expect(err.message).toContain('Majeur requis');
  });

  // Régression : Zod 4 expose les erreurs dans `issues` (`errors` en Zod 3).
  // Lire la mauvaise propriété faisait remonter un 500 générique au lieu d'un
  // 400 explicite — incident documenté au §8 du dossier projet.
  it('lit error.issues (API Zod 4) et non error.errors — non-régression', () => {
    const next = jest.fn();
    const zodLike = { parse: () => { throw { issues: [{ message: 'champ requis' }] }; } };

    validate(zodLike)({ body: {} }, mockRes(), next);

    expect(next.mock.calls[0][0].errorCode).toBe('VALIDATION_ERROR');
    expect(next.mock.calls[0][0].message).toContain('champ requis');
  });

  it('reste compatible avec la forme Zod 3 (error.errors)', () => {
    const next = jest.fn();
    const zod3Like = { parse: () => { throw { errors: [{ message: 'ancien format' }] }; } };

    validate(zod3Like)({ body: {} }, mockRes(), next);

    expect(next.mock.calls[0][0].errorCode).toBe('VALIDATION_ERROR');
  });

  it('propage sans transformation une erreur qui n\'est pas une erreur Zod', () => {
    const next = jest.fn();
    const boom = new Error('panne interne');
    validate({ parse: () => { throw boom; } })({ body: {} }, mockRes(), next);

    expect(next).toHaveBeenCalledWith(boom);
  });

  it('peut valider une autre source que le body (query, params)', () => {
    const { z: zod } = require('zod');
    const req = { query: { page: '2' } };
    const next = jest.fn();

    validate(zod.object({ page: zod.coerce.number() }), 'query')(req, mockRes(), next);

    expect(req.query).toEqual({ page: 2 });
  });
});

describe('middlewares/errorHandler — traduction des erreurs en réponse HTTP', () => {
  it('expose le statut et le message d\'une ApiError', () => {
    const res = mockRes();
    errorHandler(ApiError.conflict('Déjà pris', 'SLOT_CONFLICT'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'SLOT_CONFLICT', message: 'Déjà pris' });
  });

  it('mappe la contrainte d\'unicité Prisma P2002 en 409', () => {
    const res = mockRes();
    errorHandler({ code: 'P2002' }, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].error).toBe('DUPLICATE_ENTRY');
  });

  it('mappe l\'enregistrement introuvable Prisma P2025 en 404', () => {
    const res = mockRes();
    errorHandler({ code: 'P2025' }, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].error).toBe('NOT_FOUND');
  });

  it.each([
    ['TokenExpiredError', 'TOKEN_EXPIRED'],
    ['JsonWebTokenError', 'INVALID_TOKEN'],
  ])('mappe %s en 401 %s', (name, errorCode) => {
    const res = mockRes();
    errorHandler({ name }, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error).toBe(errorCode);
  });

  it('masque le message des erreurs non opérationnelles hors développement', () => {
    const res = mockRes();
    errorHandler(new Error('SELECT * FROM users -- fuite'), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'INTERNAL_ERROR', message: 'Erreur interne.' });
  });

  it('révèle le message réel en développement (débogage)', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const res = mockRes();

    errorHandler(new Error('trace utile'), {}, res, jest.fn());

    expect(res.json.mock.calls[0][0].message).toBe('trace utile');
    process.env.NODE_ENV = previous;
  });
});
