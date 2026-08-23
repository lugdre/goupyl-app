const ApiError = require('../../src/utils/apiError');

describe('utils/ApiError — erreurs métier normalisées', () => {
  it('est une vraie Error (capturable par un catch classique)', () => {
    const err = new ApiError(418, 'Je suis une théière');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Je suis une théière');
  });

  it('marque toute ApiError comme opérationnelle — l\'errorHandler expose alors son message', () => {
    expect(new ApiError(400, 'x').isOperational).toBe(true);
  });

  it.each([
    ['badRequest',   400, 'BAD',        ApiError.badRequest('msg', 'BAD')],
    ['unauthorized', 401, 'UNAUTHORIZED', ApiError.unauthorized()],
    ['forbidden',    403, 'FORBIDDEN',  ApiError.forbidden()],
    ['notFound',     404, 'NOT_FOUND',  ApiError.notFound()],
    ['conflict',     409, 'DUP',        ApiError.conflict('msg', 'DUP')],
    ['tooMany',      429, 'RATE_LIMITED', ApiError.tooMany()],
  ])('%s() produit un statut %i et le code %s', (_name, statusCode, errorCode, err) => {
    expect(err.statusCode).toBe(statusCode);
    expect(err.errorCode).toBe(errorCode);
    expect(err.isOperational).toBe(true);
  });

  it('accepte un code d\'erreur personnalisé sur forbidden/notFound', () => {
    expect(ApiError.forbidden('nope', 'USE_CANCEL_ENDPOINT').errorCode).toBe('USE_CANCEL_ENDPOINT');
    expect(ApiError.notFound('nope', 'QR_NOT_FOUND').errorCode).toBe('QR_NOT_FOUND');
  });

  it('laisse errorCode à null quand il n\'est pas fourni', () => {
    expect(new ApiError(500, 'boom').errorCode).toBeNull();
  });
});
