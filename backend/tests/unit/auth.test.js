jest.mock('../../src/config/database', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../src/config/redis', () => ({
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  get: jest.fn(),
}));

const prisma = require('../../src/config/database');
const redis = require('../../src/config/redis');
const authService = require('../../src/services/auth.service');

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('devrait creer un utilisateur et retourner les tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'CLIENT',
        isActive: true,
        createdAt: new Date(),
      });

      process.env.JWT_ACCESS_SECRET = 'test_access_secret_32_chars_minimum_ok';
      process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minimum_ok';

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password1!',
        firstName: 'Test',
        lastName: 'User',
        role: 'CLIENT',
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(redis.set).toHaveBeenCalledWith(
        'refresh_token:1',
        expect.any(String),
        'EX',
        expect.any(Number)
      );
    });

    it('devrait lever une erreur si l\'email existe deja', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'existing@example.com' });

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'Password1!',
          firstName: 'Test',
          lastName: 'User',
          role: 'CLIENT',
        })
      ).rejects.toMatchObject({ statusCode: 409, errorCode: 'EMAIL_ALREADY_EXISTS' });
    });
  });

  describe('login', () => {
    it('devrait lever une erreur 401 si le mot de passe est incorrect', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('CorrectPassword1!', 12);

      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        passwordHash: hash,
        isActive: true,
        role: 'CLIENT',
      });

      await expect(
        authService.login({ email: 'test@example.com', password: 'WrongPassword1!' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });
  });

  describe('logout', () => {
    it('devrait supprimer le refresh token de Redis', async () => {
      await authService.logout(42);
      expect(redis.del).toHaveBeenCalledWith('refresh_token:42');
    });
  });
});
