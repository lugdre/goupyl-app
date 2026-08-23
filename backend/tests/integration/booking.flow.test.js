/**
 * Parcours de réservation de bout en bout, sur une VRAIE base PostgreSQL.
 * Aucun module de données n'est simulé : chaque assertion traverse
 * routes → middlewares → contrôleur → service → Prisma → PostgreSQL.
 */
const db = require('../helpers/db');
const { startServer, stopServer, http, as } = require('../helpers/httpServer');

const { prisma } = db;

beforeAll(startServer);
beforeEach(db.resetDatabase);
afterAll(async () => { await stopServer(); await db.disconnect(); });

/** Coach vérifié + une prestation + un client particulier. */
const arrangeActors = async () => {
  const coach = await db.createIntervenant();
  const service = await db.createCoachService(coach.id);
  const client = await db.createClient();
  return { coach, service, client };
};

describe('Parcours nominal : réserver, confirmer, clôturer, noter', () => {
  it('déroule le cycle complet et laisse la base dans un état cohérent', async () => {
    const { coach, service, client } = await arrangeActors();
    const slot = db.futureSlot(3, 10);

    // 1. Le client réserve — le rendez-vous naît en PENDING
    const booked = await as(client).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: slot.toISOString(),
    });
    expect(booked.status).toBe(201);
    expect(booked.body.status).toBe('PENDING');
    const appointmentId = booked.body.id;

    // 2. Le coach confirme
    const confirmed = await as(coach).patch(`/api/appointments/${appointmentId}/status`).send({ status: 'CONFIRMED' });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.status).toBe('CONFIRMED');

    // 3. La séance est payée (encaissement Stripe simulé au niveau des données)
    await prisma.appointment.update({ where: { id: appointmentId }, data: { paymentStatus: 'paid' } });

    // 4. Le coach clôture — la porte de paiement est franchie
    const done = await as(coach).patch(`/api/appointments/${appointmentId}/status`).send({ status: 'DONE' });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ status: 'DONE', attendanceStatus: 'PRESENT' });

    // 5. Le client dépose son avis
    const review = await as(client).post('/api/reviews').send({ appointmentId, rating: 5, comment: 'Excellent coach' });
    expect(review.status).toBe(201);

    // 6. L'historique d'audit a bien tracé chaque transition
    const history = await prisma.appointmentStatusHistory.findMany({
      where: { appointmentId }, orderBy: { id: 'asc' },
    });
    expect(history.map((h) => `${h.fromStatus}→${h.toStatus}`)).toEqual([
      'null→PENDING', 'PENDING→CONFIRMED', 'CONFIRMED→DONE',
    ]);

    // 7. La note moyenne publique du coach reflète l'avis déposé
    const publicProfile = await http().get(`/api/reviews/intervenant/${coach.id}`);
    expect(publicProfile.body).toMatchObject({ averageRating: 5, reviewCount: 1, totalSessions: 1 });
  });

  it('bloque la clôture tant que la séance n\'est pas payée', async () => {
    const { coach, service, client } = await arrangeActors();
    const booked = await as(client).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: db.futureSlot(3, 10).toISOString(),
    });
    await as(coach).patch(`/api/appointments/${booked.body.id}/status`).send({ status: 'CONFIRMED' });

    const done = await as(coach).patch(`/api/appointments/${booked.body.id}/status`).send({ status: 'DONE' });

    expect(done.status).toBe(400);
    expect(done.body.error).toBe('PAYMENT_REQUIRED');
    expect((await prisma.appointment.findUnique({ where: { id: booked.body.id } })).status).toBe('CONFIRMED');
  });

  it('refuse un avis tant que la séance n\'est pas terminée', async () => {
    const { coach, service, client } = await arrangeActors();
    const booked = await as(client).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: db.futureSlot(3, 10).toISOString(),
    });

    const review = await as(client).post('/api/reviews').send({ appointmentId: booked.body.id, rating: 5 });

    expect(review.status).toBe(400);
    expect(review.body.error).toBe('NOT_DONE');
    expect(await prisma.review.count()).toBe(0);
  });
});

describe('Concurrence sur les créneaux', () => {
  it('empêche deux clients de réserver le même créneau chez le même coach', async () => {
    const { coach, service, client } = await arrangeActors();
    const autreClient = await db.createClient();
    const slot = db.futureSlot(4, 14);

    const premier = await as(client).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: slot.toISOString(),
    });
    expect(premier.status).toBe(201);

    const second = await as(autreClient).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: slot.toISOString(),
    });

    expect(second.status).toBe(409);
    expect(second.body.error).toBe('SLOT_CONFLICT');
    expect(await prisma.appointment.count()).toBe(1);
  });

  it('empêche un client d\'avoir deux rendez-vous simultanés chez deux coachs différents', async () => {
    const { coach, service, client } = await arrangeActors();
    const autreCoach = await db.createIntervenant();
    const autreService = await db.createCoachService(autreCoach.id);
    const slot = db.futureSlot(4, 14);

    await as(client).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: slot.toISOString(),
    });
    const second = await as(client).post('/api/appointments').send({
      intervenantId: autreCoach.id, coachServiceId: autreService.id, scheduledAt: slot.toISOString(),
    });

    expect(second.status).toBe(409);
    expect(second.body.error).toBe('CLIENT_SLOT_CONFLICT');
  });

  it('accepte un créneau immédiatement adjacent (bornes non chevauchantes)', async () => {
    const { coach, service, client } = await arrangeActors();

    await as(client).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: db.futureSlot(4, 14).toISOString(),
    });
    const suivant = await as(client).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: db.futureSlot(4, 15).toISOString(),
    });

    expect(suivant.status).toBe(201);
  });

  it('libère le créneau après annulation', async () => {
    const { coach, service, client } = await arrangeActors();
    const slot = db.futureSlot(9, 11);

    const booked = await as(client).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: slot.toISOString(),
    });
    await as(client).post(`/api/appointments/${booked.body.id}/cancel`).send({ reason: 'Changement de programme' });

    const autreClient = await db.createClient();
    const reprise = await as(autreClient).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: slot.toISOString(),
    });

    expect(reprise.status).toBe(201);
  });

  it('expose le créneau réservé sur la route publique des disponibilités', async () => {
    const { coach, service, client } = await arrangeActors();
    const slot = db.futureSlot(5, 9);
    await as(client).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: slot.toISOString(),
    });

    const busy = await http().get(`/api/appointments/busy/${coach.id}`);

    expect(busy.status).toBe(200);
    expect(busy.body).toEqual([
      { start: slot.toISOString(), end: new Date(slot.getTime() + 3_600_000).toISOString() },
    ]);
  });
});

describe('Annulation et politique de remboursement', () => {
  const bookAt = async ({ client, coach, service, hoursFromNow }) =>
    db.createAppointment({
      clientId: client.id, intervenantId: coach.id, coachServiceId: service.id,
      status: 'CONFIRMED', scheduledAt: new Date(Date.now() + hoursFromNow * 3_600_000),
    });

  it.each([
    ['à 10 jours',  240, 'FULL',    1],
    ['à 3 jours',    72, 'PARTIAL', 0.5],
    ['à 24 heures',  24, 'NONE',    0],
  ])('applique le palier %s', async (_label, hoursFromNow, tier, refundRate) => {
    const { coach, service, client } = await arrangeActors();
    const appt = await bookAt({ client, coach, service, hoursFromNow });

    const res = await as(client).post(`/api/appointments/${appt.id}/cancel`).send({ reason: 'Empêchement' });

    expect(res.status).toBe(200);
    expect(res.body.refund).toMatchObject({ tier, refundRate });
    expect((await prisma.appointment.findUnique({ where: { id: appt.id } })).status).toBe('CANCELLED');
  });

  it('refuse à un client d\'annuler le rendez-vous d\'un autre', async () => {
    const { coach, service, client } = await arrangeActors();
    const intrus = await db.createClient();
    const appt = await bookAt({ client, coach, service, hoursFromNow: 100 });

    const res = await as(intrus).post(`/api/appointments/${appt.id}/cancel`).send({ reason: 'Tentative' });

    expect(res.status).toBe(403);
    expect((await prisma.appointment.findUnique({ where: { id: appt.id } })).status).toBe('CONFIRMED');
  });
});

describe('Validation de présence par QR code', () => {
  it('clôture la séance à partir du code court à 8 caractères', async () => {
    const { coach, service, client } = await arrangeActors();
    const appt = await db.createAppointment({
      clientId: client.id, intervenantId: coach.id, coachServiceId: service.id,
      status: 'CONFIRMED', paymentStatus: 'paid',
    });

    const res = await as(coach).post('/api/appointments/validate-qr').send({ code: appt.qrToken.slice(0, 8) });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'DONE', attendanceStatus: 'PRESENT', validatedByQr: true });
  });

  it('refuse à un coach de valider la séance d\'un confrère', async () => {
    const { coach, service, client } = await arrangeActors();
    const autreCoach = await db.createIntervenant();
    const appt = await db.createAppointment({
      clientId: client.id, intervenantId: coach.id, coachServiceId: service.id,
      status: 'CONFIRMED', paymentStatus: 'paid',
    });

    const res = await as(autreCoach).post('/api/appointments/validate-qr').send({ code: appt.qrToken });

    expect(res.status).toBe(403);
    expect((await prisma.appointment.findUnique({ where: { id: appt.id } })).status).toBe('CONFIRMED');
  });
});

describe('Absence puis contestation', () => {
  const arrangeAbsence = async () => {
    const { coach, service, client } = await arrangeActors();
    const appt = await db.createAppointment({
      clientId: client.id, intervenantId: coach.id, coachServiceId: service.id,
      status: 'CONFIRMED', scheduledAt: new Date(Date.now() - 2 * 3_600_000),
    });
    return { coach, client, appt };
  };

  it('déroule absence → litige → arbitrage administrateur', async () => {
    const admin = await db.createAdmin();
    const { coach, client, appt } = await arrangeAbsence();

    // 1. Le coach signale l'absence (aucune porte de paiement ici)
    const absent = await as(coach).post(`/api/appointments/${appt.id}/absent`);
    expect(absent.status).toBe(200);
    expect(absent.body).toMatchObject({ status: 'DONE', attendanceStatus: 'ABSENT' });

    // 2. Le client conteste
    const dispute = await as(client).post(`/api/appointments/${appt.id}/dispute`)
      .send({ reason: 'J\'étais présent, le badge d\'entrée le prouve.' });
    expect(dispute.status).toBe(200);
    expect(dispute.body.disputeStatus).toBe('OPEN');

    // 3. L'administrateur voit le litige dans sa file
    const file = await as(admin).get('/api/appointments/disputes');
    expect(file.status).toBe(200);
    expect(file.body).toHaveLength(1);

    // 4. Il tranche
    const resolved = await as(admin).patch(`/api/appointments/${appt.id}/dispute`).send({ resolution: 'REJECTED' });
    expect(resolved.status).toBe(200);
    expect(resolved.body.disputeStatus).toBe('REJECTED');

    // 5. Le client a bien été notifié à chaque étape
    const notifications = await prisma.notification.findMany({ where: { userId: client.id } });
    expect(notifications.map((n) => n.type)).toEqual(
      expect.arrayContaining(['ABSENCE_MARKED', 'DISPUTE_RESOLVED'])
    );
  });

  it('refuse de signaler une absence avant le début de la séance', async () => {
    const { coach, service, client } = await arrangeActors();
    const appt = await db.createAppointment({
      clientId: client.id, intervenantId: coach.id, coachServiceId: service.id,
      status: 'CONFIRMED', scheduledAt: db.futureSlot(3, 10),
    });

    const res = await as(coach).post(`/api/appointments/${appt.id}/absent`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('SESSION_NOT_STARTED');
  });

  it('refuse un second litige sur la même séance', async () => {
    const { coach, client, appt } = await arrangeAbsence();
    await as(coach).post(`/api/appointments/${appt.id}/absent`);
    await as(client).post(`/api/appointments/${appt.id}/dispute`).send({ reason: 'Premier motif détaillé' });

    const second = await as(client).post(`/api/appointments/${appt.id}/dispute`).send({ reason: 'Second motif détaillé' });

    expect(second.status).toBe(409);
    expect(second.body.error).toBe('DISPUTE_ALREADY_EXISTS');
  });
});

describe('Prestations du coach — cycle de vie réel', () => {
  it('crée, modifie puis désactive une prestation sans casser l\'historique', async () => {
    const coach = await db.createIntervenant();
    const client = await db.createClient();

    const created = await as(coach).post('/api/coach-services')
      .send({ name: 'Renforcement', durationMinutes: 45, price: 40, category: 'SPORT' });
    expect(created.status).toBe(201);

    const updated = await as(coach).put(`/api/coach-services/${created.body.id}`).send({ price: 55 });
    expect(Number(updated.body.price)).toBe(55);

    // Une réservation existante référence la prestation
    await as(client).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: created.body.id, scheduledAt: db.futureSlot(6, 9).toISOString(),
    });

    // La désactivation est logique : la ligne survit, l'historique aussi
    await as(coach).delete(`/api/coach-services/${created.body.id}`);
    expect((await prisma.coachService.findUnique({ where: { id: created.body.id } })).active).toBe(false);
    expect(await prisma.appointment.count()).toBe(1);

    // Et la prestation disparaît du catalogue public
    const publicList = await http().get(`/api/coach-services/intervenant/${coach.id}`);
    expect(publicList.body).toHaveLength(0);
  });

  it('refuse de réserver une prestation désactivée', async () => {
    const coach = await db.createIntervenant();
    const client = await db.createClient();
    const service = await db.createCoachService(coach.id, { active: false });

    const res = await as(client).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: db.futureSlot(3, 10).toISOString(),
    });

    expect(res.status).toBe(404);
  });

  it('refuse de réserver la prestation d\'un coach chez un autre coach', async () => {
    const coachA = await db.createIntervenant();
    const coachB = await db.createIntervenant();
    const serviceA = await db.createCoachService(coachA.id);
    const client = await db.createClient();

    const res = await as(client).post('/api/appointments').send({
      intervenantId: coachB.id, coachServiceId: serviceA.id, scheduledAt: db.futureSlot(3, 10).toISOString(),
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("n'appartient pas");
  });
});
