/**
 * Modèle B2B de bout en bout, sur base réelle : abonnement entreprise, quota
 * mensuel par collaborateur, bascule à la charge du salarié une fois le quota
 * épuisé, et restitution du quota après un litige gagné.
 */
const db = require('../helpers/db');
const { startServer, stopServer, as } = require('../helpers/httpServer');

const { prisma } = db;

beforeAll(startServer);
beforeEach(db.resetDatabase);
afterAll(async () => { await stopServer(); await db.disconnect(); });

const arrange = async ({ plan = 'ESSENTIEL_ENTREPRISE', withSubscription = true } = {}) => {
  const company = await db.createCompany();
  if (withSubscription) await db.createSubscription(company.id, { plan });
  const employee = await db.createClient({ employerCompanyId: company.id });
  const coach = await db.createIntervenant();
  const service = await db.createCoachService(coach.id);
  return { company, employee, coach, service };
};

/**
 * Réserve la n-ième séance d'un test (n commence à 0).
 *
 * Toutes les réservations d'un même test tombent sur UN SEUL jour (demain), à
 * des heures différentes. Deux raisons :
 *  · le quota se compte sur le mois calendaire de la SÉANCE ; étaler les
 *    réservations sur plusieurs jours ferait franchir une fin de mois selon la
 *    date d'exécution, et le quota se réinitialiserait au milieu du test ;
 *  · l'agenda du coach n'accepte pas deux séances simultanées.
 *
 * La plage ouvrée 07h–21h offre 14 créneaux d'une heure : de quoi couvrir
 * largement le plus gros quota testé (Boost : 8).
 */
const HEURE_PREMIERE = 7;
const book = ({ employee, coach, service, n }) =>
  as(employee).post('/api/appointments').send({
    intervenantId: coach.id,
    coachServiceId: service.id,
    scheduledAt: db.futureSlot(1, HEURE_PREMIERE + n).toISOString(),
  });

describe('Quota entreprise — prise en charge des séances', () => {
  it('couvre les 4 premières séances du plan Essentiel puis bascule à la charge du salarié', async () => {
    const { employee, coach, service } = await arrange({ plan: 'ESSENTIEL_ENTREPRISE' });
    const couvertures = [];

    for (let n = 0; n < 6; n += 1) {
      const res = await book({ employee, coach, service, n });
      expect(res.status).toBe(201);
      couvertures.push(res.body.coveredByCompany);
    }

    expect(couvertures).toEqual([true, true, true, true, false, false]);
  });

  it.each([
    ['ESSENTIEL_ENTREPRISE', 4],
    ['BOOST_ENTREPRISE',     8],
  ])('respecte le quota du plan %s (%i séances)', async (plan, quota) => {
    const { employee, coach, service } = await arrange({ plan });

    for (let n = 0; n < quota; n += 1) {
      const res = await book({ employee, coach, service, n });
      expect(res.body.coveredByCompany).toBe(true);
    }
    const surNombre = await book({ employee, coach, service, n: quota });

    expect(surNombre.status).toBe(201);
    expect(surNombre.body.coveredByCompany).toBe(false);
  });

  // Règle centrale du modèle : le quota épuisé ne bloque jamais la réservation,
  // il déplace seulement la charge vers le salarié. Canal de réservation unique.
  it('ne bloque jamais la réservation, même largement au-delà du quota', async () => {
    const { employee, coach, service } = await arrange({ plan: 'ESSENTIEL_ENTREPRISE' });

    for (let n = 0; n < 5; n += 1) await book({ employee, coach, service, n });
    const res = await book({ employee, coach, service, n: 5 });

    expect(res.status).toBe(201);
    expect(await prisma.appointment.count()).toBe(6);
  });

  // Le quota se compte sur le mois calendaire de la séance : réserver pour le
  // mois suivant ne consomme pas le quota du mois en cours, et inversement.
  it('réinitialise le quota au changement de mois calendaire', async () => {
    const { employee, coach, service } = await arrange({ plan: 'ESSENTIEL_ENTREPRISE' });
    for (let n = 0; n < 4; n += 1) await book({ employee, coach, service, n });

    // 5e séance ce mois-ci : plus de quota.
    const ceMois = await book({ employee, coach, service, n: 4 });
    expect(ceMois.body.coveredByCompany).toBe(false);

    // Même semaine, mais séance planifiée le mois suivant : quota neuf.
    const moisProchain = new Date();
    moisProchain.setMonth(moisProchain.getMonth() + 1, 15);
    moisProchain.setHours(10, 0, 0, 0);

    const suivant = await as(employee).post('/api/appointments').send({
      intervenantId: coach.id, coachServiceId: service.id, scheduledAt: moisProchain.toISOString(),
    });

    expect(suivant.status).toBe(201);
    expect(suivant.body.coveredByCompany).toBe(true);
  });

  it('ne couvre rien si l\'entreprise n\'a pas d\'abonnement', async () => {
    const { employee, coach, service } = await arrange({ withSubscription: false });

    const res = await book({ employee, coach, service, n: 0 });

    expect(res.body.coveredByCompany).toBe(false);
  });

  it('ne couvre pas un client particulier, sans entreprise employeuse', async () => {
    const coach = await db.createIntervenant();
    const service = await db.createCoachService(coach.id);
    const particulier = await db.createClient();

    const res = await book({ employee: particulier, coach, service, n: 0 });

    expect(res.body.coveredByCompany).toBe(false);
  });

  it('cloisonne les quotas entre collaborateurs d\'une même entreprise', async () => {
    const { company, employee, coach, service } = await arrange({ plan: 'ESSENTIEL_ENTREPRISE' });
    const collegue = await db.createClient({ employerCompanyId: company.id });

    for (let n = 0; n < 4; n += 1) await book({ employee, coach, service, n });
    const surNombre = await book({ employee, coach, service, n: 4 });
    // Créneau distinct : l'agenda du coach n'accepte pas deux séances à la même heure.
    const premiereDuCollegue = await book({ employee: collegue, coach, service, n: 5 });

    expect(surNombre.body.coveredByCompany).toBe(false);
    expect(premiereDuCollegue.body.coveredByCompany).toBe(true);
  });

  it('ouvre la porte de paiement pour une séance couverte, non payée', async () => {
    const { employee, coach, service } = await arrange();
    const booked = await book({ employee, coach, service, n: 0 });
    expect(booked.body.coveredByCompany).toBe(true);

    await as(coach).patch(`/api/appointments/${booked.body.id}/status`).send({ status: 'CONFIRMED' });
    const done = await as(coach).patch(`/api/appointments/${booked.body.id}/status`).send({ status: 'DONE' });

    expect(done.status).toBe(200);
    expect(done.body.status).toBe('DONE');
  });

  // Nuance : la porte s'appuie sur `coveredByCompany` du rendez-vous, pas sur
  // le statut de salarié. Hors quota, le salarié paie comme un particulier.
  it('maintient la porte de paiement pour un salarié hors quota', async () => {
    const { employee, coach, service } = await arrange({ plan: 'ESSENTIEL_ENTREPRISE' });
    for (let n = 0; n < 4; n += 1) await book({ employee, coach, service, n });

    const horsQuota = await book({ employee, coach, service, n: 4 });
    await as(coach).patch(`/api/appointments/${horsQuota.body.id}/status`).send({ status: 'CONFIRMED' });
    const done = await as(coach).patch(`/api/appointments/${horsQuota.body.id}/status`).send({ status: 'DONE' });

    expect(done.status).toBe(400);
    expect(done.body.error).toBe('PAYMENT_REQUIRED');
  });
});

describe('GET /api/companies/my-quota — compteur du salarié', () => {
  it('reflète la consommation réelle après chaque réservation', async () => {
    const { employee, coach, service } = await arrange({ plan: 'BOOST_ENTREPRISE' });

    const avant = await as(employee).get('/api/companies/my-quota');
    expect(avant.body).toMatchObject({ plan: 'BOOST_ENTREPRISE', quota: 8, used: 0, remaining: 8 });

    await book({ employee, coach, service, n: 0 });
    await book({ employee, coach, service, n: 1 });

    const apres = await as(employee).get('/api/companies/my-quota');
    expect(apres.body).toMatchObject({ used: 2, remaining: 6 });
  });

  it('ne décompte pas les séances annulées', async () => {
    const { employee, coach, service } = await arrange();
    const booked = await book({ employee, coach, service, n: 0 });

    await as(employee).post(`/api/appointments/${booked.body.id}/cancel`).send({ reason: 'Empêchement' });

    expect((await as(employee).get('/api/companies/my-quota')).body.used).toBe(0);
  });

  it('refuse en 403 un client sans entreprise employeuse', async () => {
    const particulier = await db.createClient();

    expect((await as(particulier).get('/api/companies/my-quota')).status).toBe(403);
  });
});

describe('Restitution du quota après un litige tranché en faveur du client', () => {
  // Piège Prisma : le filtre du décompte doit inclure explicitement
  // `disputeStatus: null`, sinon `{ not: 'RESOLVED_CLIENT' }` exclurait aussi
  // toutes les séances sans litige et le quota deviendrait inépuisable.
  it('rend la séance au quota, sans faire disparaître les séances sans litige', async () => {
    const admin = await db.createAdmin();
    const { employee, coach, service } = await arrange({ plan: 'ESSENTIEL_ENTREPRISE' });

    // 3 séances couvertes, dont une passée qui va faire l'objet d'un litige.
    await book({ employee, coach, service, n: 0 });
    await book({ employee, coach, service, n: 1 });
    const litigieuse = await db.createAppointment({
      clientId: employee.id, intervenantId: coach.id, coachServiceId: service.id,
      status: 'CONFIRMED', coveredByCompany: true,
      scheduledAt: new Date(Date.now() - 2 * 3_600_000),
    });

    expect((await as(employee).get('/api/companies/my-quota')).body.used).toBe(3);

    await as(coach).post(`/api/appointments/${litigieuse.id}/absent`);
    await as(employee).post(`/api/appointments/${litigieuse.id}/dispute`)
      .send({ reason: 'J\'étais bien présent à cette séance.' });

    // Litige ouvert : la séance compte encore.
    expect((await as(employee).get('/api/companies/my-quota')).body.used).toBe(3);

    await as(admin).patch(`/api/appointments/${litigieuse.id}/dispute`).send({ resolution: 'RESOLVED_CLIENT' });

    // Litige gagné : la séance est restituée, les deux autres restent comptées.
    expect((await as(employee).get('/api/companies/my-quota')).body.used).toBe(2);
  });

  it('ne restitue rien lorsque le litige est rejeté', async () => {
    const admin = await db.createAdmin();
    const { employee, coach, service } = await arrange();
    const litigieuse = await db.createAppointment({
      clientId: employee.id, intervenantId: coach.id, coachServiceId: service.id,
      status: 'CONFIRMED', coveredByCompany: true,
      scheduledAt: new Date(Date.now() - 2 * 3_600_000),
    });

    await as(coach).post(`/api/appointments/${litigieuse.id}/absent`);
    await as(employee).post(`/api/appointments/${litigieuse.id}/dispute`).send({ reason: 'Motif détaillé du litige' });
    await as(admin).patch(`/api/appointments/${litigieuse.id}/dispute`).send({ resolution: 'REJECTED' });

    expect((await as(employee).get('/api/companies/my-quota')).body.used).toBe(1);
  });
});

describe('Gestion des collaborateurs par l\'entreprise', () => {
  it('liste les collaborateurs rattachés et ceux-là seulement', async () => {
    const { company } = await arrange();
    await db.createClient({ employerCompanyId: company.id });
    await db.createClient(); // particulier, rattaché à personne
    const autreEntreprise = await db.createCompany();
    await db.createClient({ employerCompanyId: autreEntreprise.id });

    const res = await as(company).get('/api/companies/employees');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).not.toHaveProperty('passwordHash');
  });

  it('détache un collaborateur sans supprimer son compte ni ses rendez-vous', async () => {
    const { company, employee, coach, service } = await arrange();
    await book({ employee, coach, service, n: 0 });

    const res = await as(company).delete(`/api/companies/employees/${employee.id}`);

    expect(res.status).toBe(204);
    const apres = await prisma.user.findUnique({ where: { id: employee.id } });
    expect(apres).not.toBeNull();
    expect(apres.employerCompanyId).toBeNull();
    expect(await prisma.appointment.count()).toBe(1);
  });

  it('refuse de détacher le collaborateur d\'une autre entreprise', async () => {
    const { company } = await arrange();
    const autreEntreprise = await db.createCompany();
    const salarieTiers = await db.createClient({ employerCompanyId: autreEntreprise.id });

    const res = await as(company).delete(`/api/companies/employees/${salarieTiers.id}`);

    expect(res.status).toBe(404);
    expect((await prisma.user.findUnique({ where: { id: salarieTiers.id } })).employerCompanyId).toBe(autreEntreprise.id);
  });

  it('remonte la consommation par collaborateur pour l\'export CSV', async () => {
    const { company, employee, coach, service } = await arrange({ plan: 'BOOST_ENTREPRISE' });
    await book({ employee, coach, service, n: 0 });
    await book({ employee, coach, service, n: 1 });

    const res = await as(company).get('/api/companies/employees/usage');

    expect(res.status).toBe(200);
    expect(res.body.quota).toBe(8);
    expect(res.body.rows).toEqual([expect.objectContaining({ id: employee.id, covered: 2, total: 2 })]);
  });

  it('régénère le code d\'adhésion et invalide l\'ancien', async () => {
    const { company } = await arrange();
    const ancien = (await as(company).get('/api/companies/join-code')).body.joinCode;

    const nouveau = (await as(company).post('/api/companies/join-code/regenerate')).body.joinCode;

    expect(nouveau).not.toBe(ancien);
    expect((await prisma.user.findUnique({ where: { id: company.id } })).joinCode).toBe(nouveau);
  });
});
