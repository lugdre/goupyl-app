/**
 * Cloisonnement des données sur base réelle : un utilisateur ne doit jamais
 * atteindre les données d'un autre, même en connaissant leurs identifiants.
 * Ces cas complètent la matrice de rôles des tests d'API, qui vérifie les
 * gardes ; ici on vérifie que la règle tient aussi APRÈS le garde, quand
 * l'identifiant visé existe bel et bien en base.
 */
const db = require('../helpers/db');
const { startServer, stopServer, http, as } = require('../helpers/httpServer');

const { prisma } = db;

beforeAll(startServer);
beforeEach(db.resetDatabase);
afterAll(async () => { await stopServer(); await db.disconnect(); });

/** Deux clients distincts, chacun avec un rendez-vous chez le même coach. */
const arrangeTwoClients = async () => {
  const coach = await db.createIntervenant();
  const service = await db.createCoachService(coach.id);
  const victime = await db.createClient({ firstName: 'Victime' });
  const intrus = await db.createClient({ firstName: 'Intrus' });
  const rdvVictime = await db.createAppointment({
    clientId: victime.id, intervenantId: coach.id, coachServiceId: service.id, status: 'CONFIRMED',
  });
  return { coach, service, victime, intrus, rdvVictime };
};

describe('Un client ne peut pas atteindre les données d\'un autre client', () => {
  it('sa liste de rendez-vous ne contient que les siens', async () => {
    const { victime, intrus } = await arrangeTwoClients();

    const listeIntrus = await as(intrus).get('/api/appointments/me');
    const listeVictime = await as(victime).get('/api/appointments/me');

    expect(listeIntrus.body.appointments).toHaveLength(0);
    expect(listeVictime.body.appointments).toHaveLength(1);
  });

  it.each([
    ['annuler',          (id) => ({ method: 'post',  url: `/api/appointments/${id}/cancel`, body: { reason: 'Tentative' } })],
    ['contester',        (id) => ({ method: 'post',  url: `/api/appointments/${id}/dispute`, body: { reason: 'Motif suffisamment long' } })],
    ['changer le statut',(id) => ({ method: 'patch', url: `/api/appointments/${id}/status`, body: { status: 'CANCELLED' } })],
  ])('ne peut pas %s le rendez-vous d\'un autre', async (_label, build) => {
    const { intrus, rdvVictime } = await arrangeTwoClients();
    const { method, url, body } = build(rdvVictime.id);

    const res = await as(intrus)[method](url).send(body);

    expect(res.status).toBe(403);
    expect((await prisma.appointment.findUnique({ where: { id: rdvVictime.id } })).status).toBe('CONFIRMED');
  });

  it('ne peut pas payer le rendez-vous d\'un autre', async () => {
    const { intrus, rdvVictime } = await arrangeTwoClients();

    const res = await as(intrus).post('/api/payments/create-intent').send({ appointmentId: rdvVictime.id });

    expect(res.status).toBe(403);
  });

  it('ne peut pas lire l\'avis déposé par un autre', async () => {
    const { coach, service, victime, intrus } = await arrangeTwoClients();
    const termine = await db.createAppointment({
      clientId: victime.id, intervenantId: coach.id, coachServiceId: service.id, status: 'DONE',
    });
    await prisma.review.create({
      data: { appointmentId: termine.id, clientId: victime.id, intervenantId: coach.id, rating: 5 },
    });

    const res = await as(intrus).get(`/api/reviews/appointment/${termine.id}`);

    expect(res.status).toBe(403);
  });

  it('ne peut pas lire le compte-rendu de séance d\'un autre', async () => {
    const { coach, service, victime, intrus } = await arrangeTwoClients();
    const termine = await db.createAppointment({
      clientId: victime.id, intervenantId: coach.id, coachServiceId: service.id, status: 'DONE',
    });
    await prisma.sessionReport.create({
      data: { appointmentId: termine.id, intervenantId: coach.id, notes: 'Notes confidentielles du suivi.' },
    });

    const res = await as(intrus).get(`/api/session-reports/appointment/${termine.id}`);

    expect(res.status).toBe(403);
  });

  it('GET /users/me renvoie toujours le porteur du jeton, jamais un autre compte', async () => {
    const { victime, intrus } = await arrangeTwoClients();

    const res = await as(intrus).get('/api/users/me');

    expect(res.body.id).toBe(intrus.id);
    expect(res.body.id).not.toBe(victime.id);
  });
});

describe('Un coach ne peut pas atteindre les données d\'un confrère', () => {
  const arrangeTwoCoaches = async () => {
    const titulaire = await db.createIntervenant();
    const confrere = await db.createIntervenant();
    const service = await db.createCoachService(titulaire.id);
    const client = await db.createClient();
    const rdv = await db.createAppointment({
      clientId: client.id, intervenantId: titulaire.id, coachServiceId: service.id,
      status: 'CONFIRMED', paymentStatus: 'paid',
    });
    return { titulaire, confrere, service, client, rdv };
  };

  it('son agenda ne contient que ses propres rendez-vous', async () => {
    const { confrere } = await arrangeTwoCoaches();

    expect((await as(confrere).get('/api/appointments/me')).body.appointments).toHaveLength(0);
  });

  it.each([
    ['clôturer',                (id) => ({ method: 'patch', url: `/api/appointments/${id}/status`, body: { status: 'DONE' } })],
    ['signaler une absence',    (id) => ({ method: 'post',  url: `/api/appointments/${id}/absent`, body: {} })],
  ])('ne peut pas %s la séance d\'un confrère', async (_label, build) => {
    const { confrere, rdv } = await arrangeTwoCoaches();
    const { method, url, body } = build(rdv.id);

    const res = await as(confrere)[method](url).send(body);

    expect(res.status).toBe(403);
  });

  it('ne peut ni modifier ni désactiver la prestation d\'un confrère', async () => {
    const { confrere, service } = await arrangeTwoCoaches();

    expect((await as(confrere).put(`/api/coach-services/${service.id}`).send({ price: 1 })).status).toBe(403);
    expect((await as(confrere).delete(`/api/coach-services/${service.id}`)).status).toBe(403);
    expect((await prisma.coachService.findUnique({ where: { id: service.id } })).active).toBe(true);
  });

  it('ne voit dans ses gains que ses propres séances', async () => {
    const { titulaire, confrere, rdv } = await arrangeTwoCoaches();
    await prisma.payment.create({
      data: {
        appointmentId: rdv.id, stripePaymentIntentId: 'pi_isolation_1',
        amount: 5000, platformFee: 1500, intervenantShare: 3500, status: 'succeeded',
      },
    });
    await prisma.appointment.update({ where: { id: rdv.id }, data: { status: 'DONE' } });

    expect((await as(titulaire).get('/api/payments/earnings')).body.totalEarned).toBe(3500);
    expect((await as(confrere).get('/api/payments/earnings')).body.totalEarned).toBe(0);
  });

  it('ne peut pas répondre à un avis adressé à un confrère', async () => {
    const { titulaire, confrere, client, service } = await arrangeTwoCoaches();
    const termine = await db.createAppointment({
      clientId: client.id, intervenantId: titulaire.id, coachServiceId: service.id, status: 'DONE',
    });
    const avis = await prisma.review.create({
      data: { appointmentId: termine.id, clientId: client.id, intervenantId: titulaire.id, rating: 2 },
    });

    const res = await as(confrere).put(`/api/reviews/${avis.id}/reply`).send({ reply: 'Réponse usurpée' });

    expect(res.status).toBe(403);
    expect((await prisma.review.findUnique({ where: { id: avis.id } })).coachReply).toBeNull();
  });
});

describe('Une entreprise ne voit que son propre périmètre', () => {
  it('ne liste pas les collaborateurs d\'une autre entreprise', async () => {
    const acme = await db.createCompany({ companyName: 'ACME' });
    const globex = await db.createCompany({ companyName: 'Globex' });
    await db.createClient({ employerCompanyId: acme.id });
    await db.createClient({ employerCompanyId: globex.id });
    await db.createClient({ employerCompanyId: globex.id });

    expect((await as(acme).get('/api/companies/employees')).body).toHaveLength(1);
    expect((await as(globex).get('/api/companies/employees')).body).toHaveLength(2);
  });

  it('ne peut pas supprimer l\'invitation d\'une autre entreprise', async () => {
    const acme = await db.createCompany();
    const globex = await db.createCompany();
    const invitation = await prisma.companyInvite.create({
      data: { companyId: globex.id, email: 'cible@globex.fr', token: 'TOKENGLOBEX', expiresAt: new Date(Date.now() + 86_400_000) },
    });

    const res = await as(acme).delete(`/api/companies/invites/${invitation.id}`);

    expect(res.status).toBe(404);
    expect(await prisma.companyInvite.findUnique({ where: { id: invitation.id } })).not.toBeNull();
  });
});

describe('Questionnaire médical — confidentialité des réponses', () => {
  const answers = {
    heartCondition: true, chestPain: false, dizziness: false, jointProblems: false,
    bloodPressureMeds: false, otherMedicalReason: false, pregnancy: false,
  };

  it('stocke les réponses chiffrées : un accès direct à la base ne révèle rien', async () => {
    const client = await db.createClient();

    await as(client).post('/api/parq/submit').send({ answers });

    const stored = await prisma.pARQQuestionnaire.findFirst({ where: { userId: client.id } });
    expect(stored.answers).not.toContain('heartCondition');
    expect(stored.answers).not.toContain('true');
    expect(stored.answers.split(':')).toHaveLength(3); // enveloppe iv:authTag:ciphertext
    expect(stored.hasRisk).toBe(true);
  });

  it('ne restitue les réponses en clair qu\'à leur auteur', async () => {
    const client = await db.createClient();
    const autre = await db.createClient();
    await as(client).post('/api/parq/submit').send({ answers });

    const parLAuteur = await as(client).get('/api/parq/me');
    const parUnAutre = await as(autre).get('/api/parq/me');

    expect(JSON.stringify(parLAuteur.body)).toContain('heartCondition');
    expect(JSON.stringify(parUnAutre.body)).not.toContain('heartCondition');
  });

  it('bloque la réservation tant qu\'un risque déclaré n\'est pas levé', async () => {
    const client = await db.createClient();
    await as(client).post('/api/parq/submit').send({ answers });

    expect((await as(client).get('/api/parq/status')).body).toMatchObject({ hasRisk: true, canBook: false });
  });

  it('autorise la réservation après levée de la réserve par le coach', async () => {
    const client = await db.createClient();
    await as(client).post('/api/parq/submit').send({ answers });
    await prisma.pARQQuestionnaire.updateMany({ where: { userId: client.id }, data: { coachCleared: true } });

    expect((await as(client).get('/api/parq/status')).body.canBook).toBe(true);
  });

  it('remplace le questionnaire précédent et réinitialise la levée de réserve', async () => {
    const client = await db.createClient();
    await as(client).post('/api/parq/submit').send({ answers });
    await prisma.pARQQuestionnaire.updateMany({ where: { userId: client.id }, data: { coachCleared: true } });

    await as(client).post('/api/parq/submit').send({ answers: { ...answers, chestPain: true } });

    expect(await prisma.pARQQuestionnaire.count({ where: { userId: client.id } })).toBe(1);
    expect((await as(client).get('/api/parq/status')).body).toMatchObject({ coachCleared: false, canBook: false });
  });
});

describe('Validation d\'un professionnel par l\'administrateur', () => {
  it('refuse la validation tant que le dossier est incomplet, l\'accepte une fois complet', async () => {
    const admin = await db.createAdmin();
    const coach = await db.createIntervenant({ verificationStatus: 'PENDING' });
    const document = (type) => ({
      userId: coach.id, type, storedName: `${type}.pdf`, originalName: `${type}.pdf`,
      mimeType: 'application/pdf', sizeBytes: 1024, data: Buffer.from('PDF'),
    });

    // Dossier vide → refus
    const vide = await as(admin).patch(`/api/users/${coach.id}/verify`).send({ status: 'VERIFIED' });
    expect(vide.status).toBe(400);
    expect(vide.body.error).toBe('INCOMPLETE_VERIFICATION_FILE');

    // Pièce d'identité seule → toujours refus
    await prisma.document.create({ data: document('ID_CARD') });
    expect((await as(admin).patch(`/api/users/${coach.id}/verify`).send({ status: 'VERIFIED' })).status).toBe(400);

    // Diplôme ajouté → validation acceptée
    await prisma.document.create({ data: document('DIPLOMA') });
    const complet = await as(admin).patch(`/api/users/${coach.id}/verify`).send({ status: 'VERIFIED', note: 'Dossier conforme' });
    expect(complet.status).toBe(200);

    // Le coach devient alors visible dans la recherche publique
    expect((await http().get('/api/users/intervenants')).body.intervenants).toHaveLength(1);
  });

  it('permet le rejet sans exiger de document', async () => {
    const admin = await db.createAdmin();
    const coach = await db.createIntervenant({ verificationStatus: 'PENDING' });

    const res = await as(admin).patch(`/api/users/${coach.id}/verify`).send({ status: 'REJECTED', note: 'Diplôme illisible' });

    expect(res.status).toBe(200);
    expect(res.body.verificationStatus).toBe('REJECTED');
  });

  it('ne liste comme à traiter que les intervenants en attente', async () => {
    const admin = await db.createAdmin();
    await db.createIntervenant({ verificationStatus: 'PENDING' });
    await db.createIntervenant({ verificationStatus: 'VERIFIED' });
    await db.createClient();

    const res = await as(admin).get('/api/users/verifications/pending');

    expect(res.body).toHaveLength(1);
  });
});

describe('Suppression de compte (RGPD)', () => {
  it('efface l\'utilisateur et les données qui lui sont rattachées', async () => {
    const coach = await db.createIntervenant();
    const service = await db.createCoachService(coach.id);
    const client = await db.createClient({ profile: { level: 'AVANCE' } });
    const rdv = await db.createAppointment({
      clientId: client.id, intervenantId: coach.id, coachServiceId: service.id, status: 'DONE',
    });
    await prisma.review.create({ data: { appointmentId: rdv.id, clientId: client.id, intervenantId: coach.id, rating: 4 } });

    const res = await as(client).delete('/api/users/me');

    expect(res.status).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: client.id } })).toBeNull();
    expect(await prisma.profile.count({ where: { userId: client.id } })).toBe(0);
    expect(await prisma.appointment.count({ where: { clientId: client.id } })).toBe(0);
    expect(await prisma.review.count()).toBe(0);
    // Le coach, lui, n'est pas affecté
    expect(await prisma.user.findUnique({ where: { id: coach.id } })).not.toBeNull();
  });
});
