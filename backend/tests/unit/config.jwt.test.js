const jwt = require('jsonwebtoken');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require('../../src/config/jwt');

const user = { id: 7, role: 'INTERVENANT' };

describe('config/jwt — émission et vérification des jetons', () => {
  it('embarque userId et role dans l\'access token', () => {
    const decoded = verifyAccessToken(generateAccessToken(user));
    expect(decoded.userId).toBe(7);
    expect(decoded.role).toBe('INTERVENANT');
  });

  it('donne une durée de vie de 15 minutes à l\'access token', () => {
    const decoded = jwt.decode(generateAccessToken(user));
    expect(decoded.exp - decoded.iat).toBe(15 * 60);
  });

  it('donne une durée de vie de 7 jours au refresh token', () => {
    const decoded = jwt.decode(generateRefreshToken(user));
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
  });

  it('n\'expose pas le rôle dans le refresh token (surface minimale)', () => {
    const decoded = verifyRefreshToken(generateRefreshToken(user));
    expect(decoded.userId).toBe(7);
    expect(decoded.role).toBeUndefined();
  });

  it('rejette un access token signé avec un autre secret', () => {
    const forged = jwt.sign({ userId: 7, role: 'ADMIN' }, 'mauvais_secret');
    expect(() => verifyAccessToken(forged)).toThrow(jwt.JsonWebTokenError);
  });

  it('rejette un access token expiré avec TokenExpiredError', () => {
    const expired = jwt.sign({ userId: 7 }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    expect(() => verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
  });

  it('refuse de valider un refresh token avec le secret d\'accès (secrets cloisonnés)', () => {
    expect(() => verifyAccessToken(generateRefreshToken(user))).toThrow(jwt.JsonWebTokenError);
    expect(() => verifyRefreshToken(generateAccessToken(user))).toThrow(jwt.JsonWebTokenError);
  });

  it('rejette un jeton malformé', () => {
    expect(() => verifyAccessToken('pas.un.jwt')).toThrow(jwt.JsonWebTokenError);
  });
});
