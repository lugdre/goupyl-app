jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());
jest.mock('../../src/config/stripe', () => require('../helpers/prismaMock').createStripeMock());

const prisma = require('../../src/config/database');
const appointmentService = require('../../src/services/appointment.service');
const F = require('../helpers/fixtures');

const resetMocks = require('../helpers/resetMocks');

// Les implémentations posées par un test ne doivent pas contaminer le suivant.
beforeEach(() => resetMocks({ prisma }));

const CLIENT_ID = 100;
const COACH_ID = 200;
const COMPANY_ID = 300;
const iso = (d) => d.toISOString();

/** Prépare le scénario nominal : un coach, sa prestation, aucun créneau occupé. */
const arrangeNominal = ({ clientOver = {}, employer = null } = {}) => {
  const users = [F.intervenant({ id: COACH_ID }), F.client({ id: CLIENT_ID, ...clientOver })];
  if (employer) users.push(employer);
  F.mockUsers(prisma, users);
  prisma.coachService.findUnique.mockResolvedValue(F.coachService());
  prisma.appointment.findMany.mockResolvedValue([]);
  prisma.appointment.count.mockResolvedValue(0);
  prisma.appointment.create.mockImplementation(async ({ data }) =>
    F.createdAppointment({ ...data, id: 1 })
  );
};

describe('appointment.service.create — contrôles de cohérence', () => {
  it('crée un rendez-vous PENDING sur une prestation du coach', async () => {
    arrangeNominal();

    const result = await appointmentService.create(CLIENT_ID, {
      intervenantId: COACH_ID,
      coachServiceId: 10,
      scheduledAt: iso(F.at(2026, 9, 15, 10)),
    });

    expect(result.status).toBe('PENDING');
    expect(prisma.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: CLIENT_ID,
          intervenantId: COACH_ID,
          coachServiceId: 10,
          serviceId: null,
          durationMinutes: 60,
          status: 'PENDING',
        }),
      })
    );
  });

  it('génère un qrToken au format UUID dès la création', async () => {
    arrangeNominal();

    await appointmentService.create(CLIENT_ID, {
      intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, 10)),
    });

    const { qrToken } = prisma.appointment.create.mock.calls[0][0].data;
    expect(qrToken).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('journalise la création dans l\'historique de statuts', async () => {
    arrangeNominal();

    await appointmentService.create(CLIENT_ID, {
      intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, 10)),
    });

    expect(prisma.appointmentStatusHistory.create).toHaveBeenCalledWith({
      data: { appointmentId: 1, fromStatus: null, toStatus: 'PENDING', changedBy: 'client' },
    });
  });

  it('refuse un intervenant inexistant', async () => {
    F.mockUsers(prisma, []);

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: 999, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, 10)) })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuse un utilisateur qui n\'a pas le rôle INTERVENANT', async () => {
    F.mockUsers(prisma, [F.client({ id: COACH_ID })]);

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, 10)) })
    ).rejects.toMatchObject({ statusCode: 404, message: expect.stringContaining('Intervenant') });
  });

  it('refuse une prestation désactivée (suppression logique)', async () => {
    arrangeNominal();
    prisma.coachService.findUnique.mockResolvedValue(F.coachService({ active: false }));

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, 10)) })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  // Contrôle d'appartenance : sans lui, un client pourrait réserver la
  // prestation d'un coach A sur l'agenda d'un coach B.
  it('refuse une prestation qui appartient à un autre coach', async () => {
    arrangeNominal();
    prisma.coachService.findUnique.mockResolvedValue(F.coachService({ intervenantId: 999 }));

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, 10)) })
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining("n'appartient pas") });
  });

  it('refuse une demande sans serviceId ni coachServiceId', async () => {
    arrangeNominal();

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, scheduledAt: iso(F.at(2026, 9, 15, 10)) })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('appointment.service.create — horaires ouvrés 07h00–21h00', () => {
  beforeEach(arrangeNominal);

  it.each([
    ['07h00 — première heure ouvrée', 7, 0],
    ['12h30', 12, 30],
    ['20h00 — se termine à 21h00 pile', 20, 0],
  ])('accepte %s', async (_label, hour, minute) => {
    await expect(
      appointmentService.create(CLIENT_ID, {
        intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, hour, minute)),
      })
    ).resolves.toBeDefined();
  });

  it.each([
    ['06h00 — avant ouverture', 6, 0],
    ['06h59', 6, 59],
    ['20h30 — déborde après 21h00', 20, 30],
    ['22h00', 22, 0],
    ['00h00', 0, 0],
  ])('refuse %s avec OUT_OF_BUSINESS_HOURS', async (_label, hour, minute) => {
    await expect(
      appointmentService.create(CLIENT_ID, {
        intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, hour, minute)),
      })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'OUT_OF_BUSINESS_HOURS' });
  });

  it('prend en compte la durée : une séance de 120 min à 20h00 déborde', async () => {
    prisma.coachService.findUnique.mockResolvedValue(F.coachService({ durationMinutes: 120 }));

    await expect(
      appointmentService.create(CLIENT_ID, {
        intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, 20)),
      })
    ).rejects.toMatchObject({ errorCode: 'OUT_OF_BUSINESS_HOURS' });
  });
});

describe('appointment.service.create — détection de chevauchement', () => {
  const scheduledAt = iso(F.at(2026, 9, 15, 10)); // 10h00 → 11h00

  // La détection de chevauchement est répartie sur deux moitiés : le prédicat
  // SQL `scheduledAt < endTime` (moitié gauche) et le contrôle en mémoire
  // `aEnd > startTime` (moitié droite). Le double doit donc appliquer le
  // prédicat SQL, sinon on testerait une logique que la production n'exécute
  // jamais — et le cas « créneau adjacent » serait faussement en conflit.
  const withBusy = ({ coach = [], client = [] }) => {
    arrangeNominal();
    const applySqlPredicate = (rows, where) =>
      rows.filter((r) => r.scheduledAt < where.scheduledAt.lt);

    prisma.appointment.findMany.mockImplementation(async ({ where }) =>
      applySqlPredicate(where.intervenantId !== undefined ? coach : client, where)
    );
  };

  it.each([
    ['recouvrement exact',            F.at(2026, 9, 15, 10), 60],
    ['chevauche la fin',              F.at(2026, 9, 15, 9, 30), 60],
    ['chevauche le début',            F.at(2026, 9, 15, 10, 30), 60],
    ['englobe entièrement le créneau', F.at(2026, 9, 15, 9), 180],
  ])('refuse en SLOT_CONFLICT quand l\'agenda du coach %s', async (_label, busyStart, duration) => {
    withBusy({ coach: [{ scheduledAt: busyStart, durationMinutes: duration }] });

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt })
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'SLOT_CONFLICT' });
  });

  it.each([
    ['se termine pile au début',  F.at(2026, 9, 15, 9), 60],
    ['commence pile à la fin',    F.at(2026, 9, 15, 11), 60],
  ])('accepte un créneau adjacent qui %s (bornes non chevauchantes)', async (_label, busyStart, duration) => {
    withBusy({ coach: [{ scheduledAt: busyStart, durationMinutes: duration }] });

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt })
    ).resolves.toBeDefined();
  });

  it('refuse en CLIENT_SLOT_CONFLICT quand c\'est le client qui est déjà pris', async () => {
    withBusy({ coach: [], client: [{ scheduledAt: F.at(2026, 9, 15, 10), durationMinutes: 60 }] });

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt })
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'CLIENT_SLOT_CONFLICT' });
  });

  // Un PENDING périmé ne doit plus verrouiller le créneau, même avant le
  // passage du balayage périodique : le filtre l'exclut à la requête.
  it('n\'interroge que les rendez-vous actifs (CONFIRMED, ou PENDING non périmé)', async () => {
    arrangeNominal();

    await appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt });

    const { where } = prisma.appointment.findMany.mock.calls[0][0];
    expect(where.OR).toEqual([
      { status: 'CONFIRMED' },
      expect.objectContaining({
        status: 'PENDING',
        createdAt: { gte: expect.any(Date) },
        scheduledAt: { gte: expect.any(Date) },
      }),
    ]);
  });
});

describe('appointment.service.create — prise en charge entreprise (quota mensuel)', () => {
  const scheduledAt = iso(F.at(2026, 9, 15, 10));

  const arrangeEmployee = ({ plan = 'ESSENTIEL_ENTREPRISE', used = 0, subs = null } = {}) => {
    arrangeNominal({
      clientOver: { employerCompanyId: COMPANY_ID },
      employer: F.company({ id: COMPANY_ID, subscriptions: subs ?? [F.subscription({ plan })] }),
    });
    prisma.appointment.count.mockResolvedValue(used);
  };

  it('couvre la séance d\'un salarié dont le quota n\'est pas épuisé', async () => {
    arrangeEmployee({ plan: 'ESSENTIEL_ENTREPRISE', used: 3 }); // quota 4

    await appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt });

    expect(prisma.appointment.create.mock.calls[0][0].data.coveredByCompany).toBe(true);
  });

  it.each([
    ['ESSENTIEL_ENTREPRISE', 4],
    ['BOOST_ENTREPRISE',     8],
    ['ULTRA_ENTREPRISE',    16],
  ])('applique le quota du plan %s (%i séances/mois/collaborateur)', async (plan, quota) => {
    arrangeEmployee({ plan, used: quota - 1 });
    await appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt });
    expect(prisma.appointment.create.mock.calls[0][0].data.coveredByCompany).toBe(true);

    jest.clearAllMocks();

    arrangeEmployee({ plan, used: quota });
    await appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt });
    expect(prisma.appointment.create.mock.calls[0][0].data.coveredByCompany).toBe(false);
  });

  // Règle centrale du modèle : le quota épuisé ne bloque pas, il bascule
  // simplement la séance à la charge du salarié. Canal de réservation unique.
  it('ne bloque PAS la réservation quand le quota est épuisé — la séance devient payante', async () => {
    arrangeEmployee({ plan: 'ESSENTIEL_ENTREPRISE', used: 4 });

    const result = await appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt });

    expect(result).toBeDefined();
    expect(prisma.appointment.create.mock.calls[0][0].data.coveredByCompany).toBe(false);
  });

  it('ne couvre pas si l\'entreprise n\'a aucun abonnement actif', async () => {
    arrangeEmployee({ subs: [] });

    await appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt });

    expect(prisma.appointment.create.mock.calls[0][0].data.coveredByCompany).toBe(false);
  });

  it('ne couvre pas un client particulier (sans entreprise employeuse)', async () => {
    arrangeNominal();

    await appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt });

    expect(prisma.appointment.create.mock.calls[0][0].data.coveredByCompany).toBe(false);
    expect(prisma.appointment.count).not.toHaveBeenCalled();
  });

  // Réserver une séance en octobre ne doit pas consommer le quota d'août.
  it('compte le quota sur le mois calendaire de la SÉANCE, pas du jour de réservation', async () => {
    arrangeEmployee({ used: 0 });

    await appointmentService.create(CLIENT_ID, {
      intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 11, 20, 10)),
    });

    const { where } = prisma.appointment.count.mock.calls[0][0];
    expect(where.scheduledAt.gte).toEqual(new Date(2026, 10, 1));
    expect(where.scheduledAt.lt).toEqual(new Date(2026, 11, 1));
  });

  it('notifie le coach quand la séance est prise en charge par l\'entreprise', async () => {
    arrangeEmployee({ used: 0 });
    prisma.appointment.create.mockImplementation(async ({ data }) =>
      F.createdAppointment({
        ...data, id: 1,
        client: { firstName: 'Sarah', lastName: 'Benali', employerCompanyId: COMPANY_ID, employerCompany: { companyName: 'ACME Corp' } },
      })
    );

    await appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt });
    await new Promise(process.nextTick); // la notification est émise sans await

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: COACH_ID, type: 'APPOINTMENT_B2B', body: expect.stringContaining('ACME Corp') }),
    });
  });

  it('n\'envoie pas de notification B2B pour une séance non couverte', async () => {
    arrangeNominal();

    await appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, coachServiceId: 10, scheduledAt });
    await new Promise(process.nextTick);

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

describe('appointment.service.create — canal historique par Service plateforme (B2B)', () => {
  const scheduledAt = iso(F.at(2026, 9, 15, 10));

  const arrangePlatform = ({ availableInPlans = [], plan = 'ESSENTIEL_ENTREPRISE', used = 0, subs = null } = {}) => {
    F.mockUsers(prisma, [
      F.intervenant({ id: COACH_ID }),
      F.client({ id: CLIENT_ID, employerCompanyId: COMPANY_ID }),
      F.company({ id: COMPANY_ID, subscriptions: subs ?? [F.subscription({ plan })] }),
    ]);
    prisma.service.findUnique.mockResolvedValue(F.platformService({ availableInPlans }));
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.appointment.count.mockResolvedValue(used);
    prisma.appointment.create.mockImplementation(async ({ data }) => F.createdAppointment({ ...data, id: 1 }));
  };

  it('couvre la séance quand le service est inclus dans le forfait', async () => {
    arrangePlatform({ availableInPlans: ['ESSENTIEL_ENTREPRISE'] });

    await appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, serviceId: 20, scheduledAt });

    expect(prisma.appointment.create.mock.calls[0][0].data).toMatchObject({ serviceId: 20, coachServiceId: null, coveredByCompany: true });
  });

  it('refuse en SERVICE_NOT_IN_PLAN un service hors forfait', async () => {
    arrangePlatform({ availableInPlans: ['ULTRA_ENTREPRISE'] });

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, serviceId: 20, scheduledAt })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'SERVICE_NOT_IN_PLAN' });
  });

  it('refuse en QUOTA_EXHAUSTED quand le quota mensuel est atteint (blocage dur, contrairement au canal CoachService)', async () => {
    arrangePlatform({ plan: 'ESSENTIEL_ENTREPRISE', used: 4 });

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, serviceId: 20, scheduledAt })
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'QUOTA_EXHAUSTED' });
  });

  it('refuse un salarié dont l\'entreprise n\'a pas d\'abonnement actif', async () => {
    arrangePlatform({ subs: [] });

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, serviceId: 20, scheduledAt })
    ).rejects.toMatchObject({ statusCode: 403, message: expect.stringContaining('abonnement actif') });
  });

  it('refuse un service plateforme inactif', async () => {
    arrangePlatform();
    prisma.service.findUnique.mockResolvedValue(F.platformService({ isActive: false }));

    await expect(
      appointmentService.create(CLIENT_ID, { intervenantId: COACH_ID, serviceId: 20, scheduledAt })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('appointment.service.create — DÉFAUT CONNU : trou dans le contrôle d\'horaires', () => {
  /**
   * ⚠ Tests de caractérisation, révélés par cette suite.
   *
   * Le contrôle compare des heures d'horloge (`getHours()`) et non des
   * instants :
   *
   *     const startHour = startTime.getHours();
   *     const endHour   = endTime.getHours() + (endTime.getMinutes() > 0 ? 1 : 0);
   *     if (startHour < 7 || endHour > 21) throw ...
   *
   * Une séance qui démarre à 23h00 se termine à 00h00 le lendemain :
   * `endHour` vaut alors 0, `0 > 21` est faux, et `23 < 7` l'est aussi. Le
   * garde-fou est franchi. Tout le créneau 23h00–23h59 échappe donc à la règle
   * « rendez-vous entre 07h00 et 21h00 » annoncée à l'utilisateur.
   *
   * Correctif proposé — comparer des instants plutôt que des heures :
   *     const ouverture = new Date(startTime); ouverture.setHours(7, 0, 0, 0);
   *     const fermeture = new Date(startTime); fermeture.setHours(21, 0, 0, 0);
   *     if (startTime < ouverture || endTime > fermeture) throw ...
   *
   * Ces tests figent le comportement actuel et deviendront rouges dès que le
   * correctif sera appliqué : il faudra alors les déplacer dans le bloc
   * « refuse » ci-dessus.
   */
  beforeEach(arrangeNominal);

  it.each([
    ['23h00 → se termine à 00h00', 23, 0],
    ['23h30 → se termine à 00h30', 23, 30],
    ['23h59', 23, 59],
  ])('accepte à tort %s (débordement de jour non détecté)', async (_label, hour, minute) => {
    await expect(
      appointmentService.create(CLIENT_ID, {
        intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, hour, minute)),
      })
    ).resolves.toBeDefined();
  });

  it('le trou se limite à la tranche 23h00–23h59 : 22h00 est bien refusé', async () => {
    await expect(
      appointmentService.create(CLIENT_ID, {
        intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, 22)),
      })
    ).rejects.toMatchObject({ errorCode: 'OUT_OF_BUSINESS_HOURS' });
  });

  it('une séance de 120 min à 23h00 (fin 01h00) passe elle aussi', async () => {
    prisma.coachService.findUnique.mockResolvedValue(F.coachService({ durationMinutes: 120 }));

    await expect(
      appointmentService.create(CLIENT_ID, {
        intervenantId: COACH_ID, coachServiceId: 10, scheduledAt: iso(F.at(2026, 9, 15, 23)),
      })
    ).resolves.toBeDefined();
  });
});
