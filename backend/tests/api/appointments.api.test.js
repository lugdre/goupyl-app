jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());
jest.mock('../../src/config/stripe', () => require('../helpers/prismaMock').createStripeMock());

const app = require('../../src/app');
const prisma = require('../../src/config/database');
const getStripe = require('../../src/config/stripe');
const { api } = require('../helpers/httpClient');
const { authHeader, AS } = require('../helpers/httpAuth');
const resetMocks = require('../helpers/resetMocks');
const F = require('../helpers/fixtures');

beforeEach(() => resetMocks({ prisma, getStripe }));

const tomorrowAt = (hour) => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(hour, 0, 0, 0);
  return d;
};

describe('POST /api/appointments — réservation', () => {
  const arrange = () => {
    F.mockUsers(prisma, [F.intervenant({ id: 200 }), F.client({ id: 100 })]);
    prisma.coachService.findUnique.mockResolvedValue(F.coachService());
    prisma.appointment.create.mockImplementation(async ({ data }) => F.createdAppointment({ ...data, id: 1 }));
  };

  it('crée le rendez-vous et répond 201', async () => {
    arrange();

    const res = await api(app).post('/api/appointments').set(authHeader(AS.client)).send({
      intervenantId: 200, coachServiceId: 10, scheduledAt: tomorrowAt(10).toISOString(),
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'PENDING', intervenantId: 200 });
  });

  it('associe le rendez-vous au client du jeton, jamais à un clientId envoyé par le client', async () => {
    arrange();

    await api(app).post('/api/appointments').set(authHeader(AS.client)).send({
      intervenantId: 200, coachServiceId: 10, scheduledAt: tomorrowAt(10).toISOString(),
      clientId: 999, // tentative d'usurpation
    });

    expect(prisma.appointment.create.mock.calls[0][0].data.clientId).toBe(100);
  });

  it.each([
    ['date passée',        { scheduledAt: new Date(Date.now() - 86_400_000).toISOString() }],
    ['date non ISO',       { scheduledAt: '25/12/2026' }],
    ['sans service',       { coachServiceId: undefined }],
    ['intervenant absent', { intervenantId: undefined }],
  ])('refuse en 400 une demande avec %s', async (_label, override) => {
    arrange();

    const res = await api(app).post('/api/appointments').set(authHeader(AS.client)).send({
      intervenantId: 200, coachServiceId: 10, scheduledAt: tomorrowAt(10).toISOString(), ...override,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('renvoie 409 SLOT_CONFLICT quand le créneau est déjà pris', async () => {
    arrange();
    const start = tomorrowAt(10);
    prisma.appointment.findMany.mockResolvedValue([{ scheduledAt: start, durationMinutes: 60 }]);

    const res = await api(app).post('/api/appointments').set(authHeader(AS.client)).send({
      intervenantId: 200, coachServiceId: 10, scheduledAt: start.toISOString(),
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SLOT_CONFLICT');
  });

  it('renvoie 400 OUT_OF_BUSINESS_HOURS hors plage 07h–21h', async () => {
    arrange();

    const res = await api(app).post('/api/appointments').set(authHeader(AS.client)).send({
      intervenantId: 200, coachServiceId: 10, scheduledAt: tomorrowAt(22).toISOString(),
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('OUT_OF_BUSINESS_HOURS');
  });

  it('renvoie 404 pour un intervenant inexistant', async () => {
    F.mockUsers(prisma, []);

    const res = await api(app).post('/api/appointments').set(authHeader(AS.client)).send({
      intervenantId: 999, coachServiceId: 10, scheduledAt: tomorrowAt(10).toISOString(),
    });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/appointments/:id/status', () => {
  const arrange = (over = {}) => {
    const appt = F.appointment(over);
    prisma.appointment.findUnique.mockResolvedValue(appt);
    prisma.appointment.update.mockImplementation(async ({ data }) => ({ ...appt, ...data }));
  };

  it('confirme un rendez-vous en attente (coach)', async () => {
    arrange({ status: 'PENDING' });

    const res = await api(app).patch('/api/appointments/1/status')
      .set(authHeader(AS.intervenant)).send({ status: 'CONFIRMED' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CONFIRMED');
  });

  it('renvoie 400 INVALID_STATUS_TRANSITION sur une transition interdite', async () => {
    arrange({ status: 'DONE' });

    const res = await api(app).patch('/api/appointments/1/status')
      .set(authHeader(AS.intervenant)).send({ status: 'CONFIRMED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_STATUS_TRANSITION');
  });

  it('renvoie 403 USE_CANCEL_ENDPOINT quand un client tente d\'annuler par cette route', async () => {
    arrange({ status: 'PENDING' });

    const res = await api(app).patch('/api/appointments/1/status')
      .set(authHeader(AS.client)).send({ status: 'CANCELLED' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('USE_CANCEL_ENDPOINT');
  });

  it('renvoie 400 PAYMENT_REQUIRED sur une clôture de séance impayée', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'unpaid', coveredByCompany: false });

    const res = await api(app).patch('/api/appointments/1/status')
      .set(authHeader(AS.intervenant)).send({ status: 'DONE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('PAYMENT_REQUIRED');
  });

  it('refuse un statut hors énumération en 400 VALIDATION_ERROR', async () => {
    const res = await api(app).patch('/api/appointments/1/status')
      .set(authHeader(AS.intervenant)).send({ status: 'TERMINE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('renvoie 404 pour un rendez-vous inexistant', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);

    const res = await api(app).patch('/api/appointments/999/status')
      .set(authHeader(AS.intervenant)).send({ status: 'CONFIRMED' });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/appointments/:id/cancel — annulation client', () => {
  it('renvoie le palier de remboursement appliqué', async () => {
    const appt = F.appointment({ status: 'CONFIRMED', scheduledAt: F.inHours(240), paymentStatus: 'unpaid' });
    prisma.appointment.findUnique.mockResolvedValue(appt);
    prisma.appointment.update.mockResolvedValue(appt);

    const res = await api(app).post('/api/appointments/1/cancel')
      .set(authHeader(AS.client)).send({ reason: 'Empêchement' });

    expect(res.status).toBe(200);
    expect(res.body.refund).toMatchObject({ tier: 'FULL', refundRate: 1 });
  });

  it('refuse au client d\'annuler le rendez-vous d\'un autre (403)', async () => {
    prisma.appointment.findUnique.mockResolvedValue(F.appointment({ clientId: 999 }));

    const res = await api(app).post('/api/appointments/1/cancel').set(authHeader(AS.client)).send({});

    expect(res.status).toBe(403);
  });
});

describe('POST /api/appointments/validate-qr — validation par QR', () => {
  it('valide la séance et la passe en DONE', async () => {
    const appt = F.appointment({ status: 'CONFIRMED', paymentStatus: 'paid' });
    prisma.appointment.findFirst.mockResolvedValue(appt);
    prisma.appointment.update.mockImplementation(async ({ data }) => ({ ...appt, ...data }));

    const res = await api(app).post('/api/appointments/validate-qr')
      .set(authHeader(AS.intervenant)).send({ code: 'a1b2c3d4' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'DONE', attendanceStatus: 'PRESENT', validatedByQr: true });
  });

  it('refuse un code de moins de 8 caractères en 400 VALIDATION_ERROR', async () => {
    const res = await api(app).post('/api/appointments/validate-qr')
      .set(authHeader(AS.intervenant)).send({ code: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('renvoie 404 QR_NOT_FOUND pour un code inconnu', async () => {
    prisma.appointment.findFirst.mockResolvedValue(null);

    const res = await api(app).post('/api/appointments/validate-qr')
      .set(authHeader(AS.intervenant)).send({ code: 'ffffffff' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('QR_NOT_FOUND');
  });
});

describe('Litiges — POST /:id/dispute et PATCH /:id/dispute', () => {
  it('ouvre un litige sur une séance marquée absente', async () => {
    const appt = F.appointment({ status: 'DONE', attendanceStatus: 'ABSENT', disputeStatus: null });
    prisma.appointment.findUnique.mockResolvedValue(appt);
    prisma.appointment.update.mockImplementation(async ({ data }) => ({ ...appt, ...data }));

    const res = await api(app).post('/api/appointments/1/dispute')
      .set(authHeader(AS.client)).send({ reason: 'J\'étais présent, badge à l\'appui.' });

    expect(res.status).toBe(200);
    expect(res.body.disputeStatus).toBe('OPEN');
  });

  it('refuse un motif de moins de 10 caractères', async () => {
    const res = await api(app).post('/api/appointments/1/dispute')
      .set(authHeader(AS.client)).send({ reason: 'court' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('permet à l\'administrateur de trancher', async () => {
    const appt = F.appointment({ status: 'DONE', disputeStatus: 'OPEN', paymentStatus: 'unpaid' });
    prisma.appointment.findUnique.mockResolvedValue(appt);
    prisma.appointment.update.mockImplementation(async ({ data }) => ({ ...appt, ...data }));

    const res = await api(app).patch('/api/appointments/1/dispute')
      .set(authHeader(AS.admin)).send({ resolution: 'REJECTED' });

    expect(res.status).toBe(200);
    expect(res.body.disputeStatus).toBe('REJECTED');
  });

  it('refuse une résolution hors énumération', async () => {
    const res = await api(app).patch('/api/appointments/1/dispute')
      .set(authHeader(AS.admin)).send({ resolution: 'RESOLVED_COACH' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/appointments/busy/:intervenantId — route publique', () => {
  it('renvoie les intervalles occupés sans authentification', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      { scheduledAt: tomorrowAt(10), durationMinutes: 60 },
    ]);

    const res = await api(app).get('/api/appointments/busy/200');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('start');
    expect(res.body[0]).toHaveProperty('end');
  });

  // La route est publique : elle ne doit exposer que des bornes horaires, ni
  // identité du client, ni prestation, ni prix.
  it('n\'expose aucune donnée personnelle', async () => {
    prisma.appointment.findMany.mockResolvedValue([{ scheduledAt: tomorrowAt(10), durationMinutes: 60 }]);

    const res = await api(app).get('/api/appointments/busy/200');

    expect(Object.keys(res.body[0])).toEqual(['start', 'end']);
    expect(prisma.appointment.findMany.mock.calls[0][0].select).toEqual({ scheduledAt: true, durationMinutes: true });
  });
});

describe('GET /api/appointments/me — liste paginée', () => {
  it('renvoie la liste et sa pagination pour un client', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.appointment.count.mockResolvedValue(0);

    const res = await api(app).get('/api/appointments/me').set(authHeader(AS.client));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('appointments');
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10, total: 0 });
  });

  it('filtre sur le client authentifié, pas sur un identifiant fourni en requête', async () => {
    await api(app).get('/api/appointments/me?clientId=999').set(authHeader(AS.client));

    expect(prisma.appointment.findMany.mock.calls[0][0].where).toEqual({ clientId: 100 });
  });
});
