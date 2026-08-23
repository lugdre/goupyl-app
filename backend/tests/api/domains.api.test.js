jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());
jest.mock('../../src/config/stripe', () => require('../helpers/prismaMock').createStripeMock());
jest.mock('../../src/config/email', () => require('../helpers/prismaMock').createEmailMock());

const app = require('../../src/app');
const prisma = require('../../src/config/database');
const redis = require('../../src/config/redis');
const resend = require('../../src/config/email');
const getStripe = require('../../src/config/stripe');
const { api } = require('../helpers/httpClient');
const { authHeader, AS } = require('../helpers/httpAuth');
const resetMocks = require('../helpers/resetMocks');
const F = require('../helpers/fixtures');
const { encryptJson } = require('../../src/utils/encryption');

beforeEach(() => resetMocks({ prisma, redis, email: resend, getStripe }));

describe('API /users — profil et recherche', () => {
  it('GET /users/me renvoie le profil du porteur du jeton', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 100, email: 'client@test.fr', role: 'CLIENT' });

    const res = await api(app).get('/api/users/me').set(authHeader(AS.client));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 100 });
    expect(prisma.user.findUnique.mock.calls[0][0].where).toEqual({ id: 100 });
  });

  it('PUT /users/me met à jour le profil et refuse les champs hors schéma', async () => {
    prisma.user.update.mockResolvedValue({ id: 100, firstName: 'Sarah' });

    const res = await api(app).put('/api/users/me').set(authHeader(AS.client))
      .send({ firstName: 'Sarah', role: 'ADMIN', isActive: false });

    expect(res.status).toBe(200);
    const sent = prisma.user.update.mock.calls[0][0].data;
    expect(sent).not.toHaveProperty('role');
    expect(sent).not.toHaveProperty('isActive');
  });

  it('PUT /users/me refuse un prénom trop court', async () => {
    const res = await api(app).put('/api/users/me').set(authHeader(AS.client)).send({ firstName: 'S' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('GET /users/intervenants est public et renvoie une liste paginée', async () => {
    const res = await api(app).get('/api/users/intervenants?city=Lyon');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('intervenants');
    expect(res.body).toHaveProperty('pagination');
  });

  it('GET /users/intervenants/:id renvoie 404 pour un profil inconnu', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const res = await api(app).get('/api/users/intervenants/999');

    expect(res.status).toBe(404);
  });

  it('GET /users/:id/avatar sert les octets avec le bon type MIME et un cache long', async () => {
    prisma.user.findUnique.mockResolvedValue({ avatarData: Buffer.from('PNGDATA'), avatarMimeType: 'image/png' });

    const res = await api(app).get('/api/users/200/avatar');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.headers['cache-control']).toBe('public, max-age=86400');
  });

  it('GET /users/:id/avatar renvoie 404 en l\'absence d\'avatar', async () => {
    prisma.user.findUnique.mockResolvedValue({ avatarData: null });

    expect((await api(app).get('/api/users/200/avatar')).status).toBe(404);
  });

  it('GET /users/:id/photos/:photoId met en cache 7 jours (ressource immuable)', async () => {
    prisma.coachPhoto.findUnique.mockResolvedValue({ id: 5, intervenantId: 200, data: Buffer.from('x'), mimeType: 'image/jpeg' });

    const res = await api(app).get('/api/users/200/photos/5');

    expect(res.headers['cache-control']).toBe('public, max-age=604800');
  });

  it('DELETE /users/me répond 204 sans corps', async () => {
    const res = await api(app).delete('/api/users/me').set(authHeader(AS.client));

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('POST /users/me/avatar refuse une requête sans fichier', async () => {
    const res = await api(app).post('/api/users/me/avatar').set(authHeader(AS.client));

    expect(res.status).toBe(400);
  });
});

describe('API /users — administration', () => {
  it('PATCH /users/:id/verify valide un dossier complet', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'INTERVENANT' });
    prisma.document.findMany.mockResolvedValue([{ type: 'ID_CARD' }, { type: 'DIPLOMA' }]);
    prisma.user.update.mockImplementation(async ({ data }) => ({ id: 200, ...data }));

    const res = await api(app).patch('/api/users/200/verify')
      .set(authHeader(AS.admin)).send({ status: 'VERIFIED', note: 'OK' });

    expect(res.status).toBe(200);
    expect(res.body.verificationStatus).toBe('VERIFIED');
  });

  it('PATCH /users/:id/verify refuse un dossier incomplet', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'INTERVENANT' });
    prisma.document.findMany.mockResolvedValue([{ type: 'ID_CARD' }]);

    const res = await api(app).patch('/api/users/200/verify')
      .set(authHeader(AS.admin)).send({ status: 'VERIFIED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INCOMPLETE_VERIFICATION_FILE');
  });

  it('PATCH /users/:id/deactivate désactive un compte', async () => {
    prisma.user.update.mockResolvedValue({ id: 100, isActive: false });

    const res = await api(app).patch('/api/users/100/deactivate').set(authHeader(AS.admin));

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it('GET /users?role=INTERVENANT filtre la liste', async () => {
    const res = await api(app).get('/api/users?role=INTERVENANT').set(authHeader(AS.admin));

    expect(res.status).toBe(200);
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: 'INTERVENANT' });
  });
});

describe('API /companies — espace entreprise', () => {
  it('GET /companies/join-code renvoie le code permanent', async () => {
    prisma.user.findUnique.mockResolvedValue({ joinCode: 'ACME1234' });

    const res = await api(app).get('/api/companies/join-code').set(authHeader(AS.entreprise));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ joinCode: 'ACME1234' });
  });

  it('POST /companies/invites crée l\'invitation et répond 201', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ companyName: 'ACME Corp' });
    prisma.companyInvite.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));

    const res = await api(app).post('/api/companies/invites')
      .set(authHeader(AS.entreprise)).send({ email: 'nouveau@acme.fr' });

    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^[0-9A-F]{12}$/);
  });

  it('POST /companies/invites refuse un email invalide', async () => {
    const res = await api(app).post('/api/companies/invites')
      .set(authHeader(AS.entreprise)).send({ email: 'pas-un-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('DELETE /companies/employees/:id répond 204', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 100, employerCompanyId: 300 });

    const res = await api(app).delete('/api/companies/employees/100').set(authHeader(AS.entreprise));

    expect(res.status).toBe(204);
  });

  it('DELETE /companies/employees/:id refuse un salarié d\'une autre entreprise', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 100, employerCompanyId: 999 });

    const res = await api(app).delete('/api/companies/employees/100').set(authHeader(AS.entreprise));

    expect(res.status).toBe(404);
  });

  it('GET /companies/my-quota renvoie le compteur du salarié', async () => {
    prisma.user.findUnique.mockResolvedValue({
      employerCompanyId: 300,
      employerCompany: { subscriptions: [F.subscription({ plan: 'BOOST_ENTREPRISE' })] },
    });
    prisma.appointment.count.mockResolvedValue(2);

    const res = await api(app).get('/api/companies/my-quota').set(authHeader(AS.client));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ plan: 'BOOST_ENTREPRISE', quota: 8, used: 2, remaining: 6 });
  });

  it('GET /companies/my-quota renvoie 403 pour un client sans entreprise', async () => {
    prisma.user.findUnique.mockResolvedValue({ employerCompanyId: null });

    expect((await api(app).get('/api/companies/my-quota').set(authHeader(AS.client))).status).toBe(403);
  });

  it('GET /companies/usage renvoie la synthèse', async () => {
    prisma.subscription.findFirst.mockResolvedValue(F.subscription());

    const res = await api(app).get('/api/companies/usage').set(authHeader(AS.entreprise));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('limits');
  });
});

describe('API /coach-services — prestations du coach', () => {
  const valid = { name: 'Coaching perso', durationMinutes: 60, price: 50, category: 'SPORT' };

  it('POST crée une prestation rattachée au coach authentifié', async () => {
    prisma.coachService.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));

    const res = await api(app).post('/api/coach-services').set(authHeader(AS.intervenant)).send(valid);

    expect(res.status).toBe(201);
    expect(prisma.coachService.create.mock.calls[0][0].data.intervenantId).toBe(200);
  });

  it('POST refuse une durée non standard', async () => {
    const res = await api(app).post('/api/coach-services')
      .set(authHeader(AS.intervenant)).send({ ...valid, durationMinutes: 17 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Duree invalide');
  });

  it('DELETE désactive au lieu de supprimer', async () => {
    prisma.coachService.findUnique.mockResolvedValue(F.coachService());
    prisma.coachService.update.mockResolvedValue({ id: 10, active: false });

    const res = await api(app).delete('/api/coach-services/10').set(authHeader(AS.intervenant));

    expect(res.status).toBe(200);
    expect(prisma.coachService.update.mock.calls[0][0].data).toEqual({ active: false });
  });

  it('PUT refuse la prestation d\'un confrère en 403', async () => {
    prisma.coachService.findUnique.mockResolvedValue(F.coachService({ intervenantId: 999 }));

    const res = await api(app).put('/api/coach-services/10')
      .set(authHeader(AS.intervenant)).send({ price: 60 });

    expect(res.status).toBe(403);
  });

  it('GET /intervenant/:id est public et ne renvoie que les prestations actives', async () => {
    const res = await api(app).get('/api/coach-services/intervenant/200');

    expect(res.status).toBe(200);
    expect(prisma.coachService.findMany.mock.calls[0][0].where).toEqual({ intervenantId: 200, active: true });
  });
});

describe('API /parq — questionnaire médical', () => {
  const answers = {
    heartCondition: false, chestPain: false, dizziness: false, jointProblems: false,
    bloodPressureMeds: false, otherMedicalReason: false, pregnancy: false,
  };

  it('POST /parq/submit enregistre les réponses chiffrées', async () => {
    prisma.pARQQuestionnaire.findFirst.mockResolvedValue(null);
    prisma.pARQQuestionnaire.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));

    const res = await api(app).post('/api/parq/submit').set(authHeader(AS.client)).send({ answers });

    expect(res.status).toBe(201);
    expect(prisma.pARQQuestionnaire.create.mock.calls[0][0].data.answers).not.toContain('heartCondition');
  });

  it('POST /parq/submit refuse un questionnaire incomplet', async () => {
    const { pregnancy: _omitted, ...incomplete } = answers;

    const res = await api(app).post('/api/parq/submit').set(authHeader(AS.client)).send({ answers: incomplete });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('GET /parq/status autorise la réservation sans risque déclaré', async () => {
    prisma.pARQQuestionnaire.findFirst.mockResolvedValue({
      hasRisk: false, coachCleared: false, expiresAt: new Date(Date.now() + 86_400_000), completedAt: new Date(),
    });

    const res = await api(app).get('/api/parq/status').set(authHeader(AS.client));

    expect(res.status).toBe(200);
    expect(res.body.canBook).toBe(true);
    expect(res.body).not.toHaveProperty('answers');
  });

  it('GET /parq/status bloque la réservation en cas de risque non levé', async () => {
    prisma.pARQQuestionnaire.findFirst.mockResolvedValue({
      hasRisk: true, coachCleared: false, expiresAt: new Date(Date.now() + 86_400_000), completedAt: new Date(),
    });

    expect((await api(app).get('/api/parq/status').set(authHeader(AS.client))).body.canBook).toBe(false);
  });

  it('GET /parq/me renvoie au propriétaire ses réponses déchiffrées', async () => {
    prisma.pARQQuestionnaire.findFirst.mockResolvedValue({ answers: encryptJson(answers) });

    const res = await api(app).get('/api/parq/me').set(authHeader(AS.client));

    expect(res.status).toBe(200);
    expect(res.body.answers ?? res.body).toEqual(answers);
  });
});

describe('API /reviews — avis', () => {
  it('POST /reviews crée un avis sur une séance terminée', async () => {
    prisma.appointment.findUnique.mockResolvedValue({
      ...F.appointment({ status: 'DONE' }), review: null, client: { firstName: 'S', lastName: 'B' },
    });
    prisma.review.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));

    const res = await api(app).post('/api/reviews')
      .set(authHeader(AS.client)).send({ appointmentId: 1, rating: 5, comment: 'Parfait' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ rating: 5, intervenantId: 200 });
  });

  it.each([0, 6, 4.5])('POST /reviews refuse la note %s', async (rating) => {
    const res = await api(app).post('/api/reviews')
      .set(authHeader(AS.client)).send({ appointmentId: 1, rating });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('POST /reviews refuse un avis sur une séance non terminée', async () => {
    prisma.appointment.findUnique.mockResolvedValue({
      ...F.appointment({ status: 'CONFIRMED' }), review: null, client: {},
    });

    const res = await api(app).post('/api/reviews')
      .set(authHeader(AS.client)).send({ appointmentId: 1, rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('NOT_DONE');
  });

  it('GET /reviews/intervenant/:id est public et renvoie l\'agrégat', async () => {
    prisma.review.findMany.mockResolvedValue([{ rating: 5 }, { rating: 4 }]);
    prisma.appointment.count.mockResolvedValue(10);

    const res = await api(app).get('/api/reviews/intervenant/200');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ averageRating: 4.5, reviewCount: 2, totalSessions: 10 });
  });

  it('PUT /reviews/:id/reply bloque après 3 modifications', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 1, intervenantId: 200, coachReply: 'x', coachReplyEdits: 3 });

    const res = await api(app).put('/api/reviews/1/reply')
      .set(authHeader(AS.intervenant)).send({ reply: 'Nouvelle réponse' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('REPLY_EDIT_LIMIT');
  });

  it('PUT /reviews/:id/reply refuse une réponse vide', async () => {
    const res = await api(app).put('/api/reviews/1/reply').set(authHeader(AS.intervenant)).send({ reply: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });
});

describe('API /notifications', () => {
  it('GET /notifications ne renvoie que celles de l\'utilisateur authentifié', async () => {
    await api(app).get('/api/notifications').set(authHeader(AS.client));

    expect(prisma.notification.findMany.mock.calls[0][0].where.userId).toBe(100);
  });

  it('GET /notifications/unread-count renvoie un compteur', async () => {
    prisma.notification.count.mockResolvedValue(3);

    const res = await api(app).get('/api/notifications/unread-count').set(authHeader(AS.client));

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain('3');
  });

  it('PUT /notifications/:id/read cloisonne le marquage au propriétaire', async () => {
    await api(app).put('/api/notifications/5/read').set(authHeader(AS.client));

    expect(prisma.notification.updateMany.mock.calls[0][0].where).toMatchObject({ id: 5, userId: 100 });
  });
});

describe('API /payments', () => {
  it('POST /payments/checkout crée une session Stripe pour une entreprise', async () => {
    prisma.user.count.mockResolvedValue(3);
    getStripe().checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });

    const res = await api(app).post('/api/payments/checkout')
      .set(authHeader(AS.entreprise)).send({ plan: 'BOOST_ENTREPRISE', billingCycle: 'MONTHLY' });

    expect(res.status).toBe(200);
    expect(res.body.url).toContain('checkout.stripe.com');
  });

  it('POST /payments/checkout refuse le plan sur devis ULTRA', async () => {
    const res = await api(app).post('/api/payments/checkout')
      .set(authHeader(AS.entreprise)).send({ plan: 'ULTRA_ENTREPRISE' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('devis');
  });

  it('POST /payments/create-intent renvoie le clientSecret', async () => {
    prisma.appointment.findUnique.mockResolvedValue({
      ...F.appointment({ status: 'CONFIRMED', paymentStatus: 'unpaid' }),
      coachService: F.coachService({ price: 50 }), service: null, intervenant: F.intervenant(),
    });
    prisma.payment.findUnique.mockResolvedValue(null);
    getStripe().paymentIntents.create.mockResolvedValue({ id: 'pi_1', client_secret: 'pi_1_secret' });

    const res = await api(app).post('/api/payments/create-intent')
      .set(authHeader(AS.client)).send({ appointmentId: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ clientSecret: 'pi_1_secret', paymentIntentId: 'pi_1' });
  });

  it('POST /payments/create-intent refuse un appointmentId non entier', async () => {
    const res = await api(app).post('/api/payments/create-intent')
      .set(authHeader(AS.client)).send({ appointmentId: 'abc' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('GET /payments/earnings sépare acquis, en attente et gelés', async () => {
    prisma.payment.findMany.mockResolvedValue([]);

    const res = await api(app).get('/api/payments/earnings').set(authHeader(AS.intervenant));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalEarned: 0, totalPending: 0, totalFrozen: 0 });
  });

  // Le webhook est monté avant express.json et n'exige pas de jeton : c'est la
  // signature Stripe qui fait office d'authentification.
  it('POST /payments/webhook rejette une signature invalide sans exiger de jeton', async () => {
    getStripe().webhooks.constructEvent.mockImplementation(() => { throw new Error('bad signature'); });

    const res = await api(app).post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'signature_falsifiee')
      .send(JSON.stringify({ type: 'payment_intent.succeeded' }));

    expect(res.status).toBe(400);
    // Le contrôleur webhook court-circuite l'errorHandler et répond
    // `{ error: <message> }` au lieu du `{ error: <CODE>, message: <texte> }`
    // du reste de l'API. Stripe ne lit que le statut, donc sans conséquence
    // fonctionnelle — mais c'est la seule réponse d'erreur non homogène.
    expect(res.body.error).toContain('Signature');
  });
});
