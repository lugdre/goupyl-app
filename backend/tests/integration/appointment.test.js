const request = require('supertest');

process.env.JWT_ACCESS_SECRET = 'test_access_secret_32_chars_minimum_ok';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minimum_ok';
process.env.NODE_ENV = 'test';

jest.mock('../../src/config/database', () => ({
  user: { findUnique: jest.fn(), create: jest.fn() },
  appointment: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  service: { findUnique: jest.fn() },
}));

jest.mock('../../src/config/redis', () => ({
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  get: jest.fn().mockResolvedValue(null),
}));

const app = require('../../src/app');

describe('Appointments API', () => {
  describe('POST /api/appointments', () => {
    it('devrait retourner 401 sans token JWT', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .send({ intervenantId: 1, serviceId: 1, scheduledAt: new Date(Date.now() + 86400000).toISOString() });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'UNAUTHORIZED');
    });
  });

  describe('POST /api/auth/login', () => {
    it('devrait retourner 400 avec des donnees invalides', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'pas-un-email', password: '' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/health', () => {
    it('devrait retourner 200 OK', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'OK');
    });
  });
});
