jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/email', () => require('../helpers/prismaMock').createEmailMock());

const prisma = require('../../src/config/database');
const resend = require('../../src/config/email');
const companyService = require('../../src/services/company.service');
const { PLAN_LIMITS, countCoveredSessions } = companyService;
const F = require('../helpers/fixtures');

const resetMocks = require('../helpers/resetMocks');

// Les implémentations posées par un test ne doivent pas contaminer le suivant.
beforeEach(() => resetMocks({ prisma, email: resend }));

const COMPANY_ID = 300;
const EMPLOYEE_ID = 100;

describe('company.service — grille des forfaits entreprise', () => {
  it.each([
    ['ESSENTIEL_ENTREPRISE',  10, 4],
    ['BOOST_ENTREPRISE',      50, 8],
    ['ULTRA_ENTREPRISE',     200, 16],
  ])('%s : %i collaborateurs, %i séances/mois/collaborateur', (plan, maxEmployees, maxSessions) => {
    expect(PLAN_LIMITS[plan]).toEqual({ maxEmployees, maxSessions });
  });

  it('couvre exactement les trois offres entreprise', () => {
    expect(Object.keys(PLAN_LIMITS)).toEqual(['ESSENTIEL_ENTREPRISE', 'BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE']);
  });

  it('ordonne les quotas de façon croissante entre les paliers', () => {
    const quotas = Object.values(PLAN_LIMITS).map((l) => l.maxSessions);
    expect(quotas).toEqual([...quotas].sort((a, b) => a - b));
  });
});

describe('company.service.countCoveredSessions — décompte du quota mensuel', () => {
  it('borne le décompte sur le mois calendaire de la date de référence', async () => {
    await countCoveredSessions(EMPLOYEE_ID, new Date(2026, 4, 17)); // mai 2026

    const { where } = prisma.appointment.count.mock.calls[0][0];
    expect(where.scheduledAt).toEqual({ gte: new Date(2026, 4, 1), lt: new Date(2026, 5, 1) });
  });

  it('gère le passage d\'année (décembre → janvier)', async () => {
    await countCoveredSessions(EMPLOYEE_ID, new Date(2026, 11, 31));

    expect(prisma.appointment.count.mock.calls[0][0].where.scheduledAt).toEqual({
      gte: new Date(2026, 11, 1), lt: new Date(2027, 0, 1),
    });
  });

  it('ne compte que les séances prises en charge par l\'entreprise', async () => {
    await countCoveredSessions(EMPLOYEE_ID);

    expect(prisma.appointment.count.mock.calls[0][0].where).toMatchObject({
      clientId: EMPLOYEE_ID,
      coveredByCompany: true,
      status: { in: ['PENDING', 'CONFIRMED', 'DONE'] },
    });
  });

  it('ne décompte pas les séances annulées', async () => {
    await countCoveredSessions(EMPLOYEE_ID);

    expect(prisma.appointment.count.mock.calls[0][0].where.status.in).not.toContain('CANCELLED');
  });

  // Piège Prisma : `{ not: 'X' }` exclut aussi les lignes où la colonne vaut
  // NULL. Sans la branche `{ disputeStatus: null }`, toutes les séances sans
  // litige — c'est-à-dire l'immense majorité — sortiraient du décompte et le
  // quota deviendrait inépuisable.
  it('inclut explicitement les séances sans litige (piège du `not` Prisma sur NULL)', async () => {
    await countCoveredSessions(EMPLOYEE_ID);

    expect(prisma.appointment.count.mock.calls[0][0].where.OR).toEqual([
      { disputeStatus: null },
      { disputeStatus: { not: 'RESOLVED_CLIENT' } },
    ]);
  });

  it('restitue au quota une séance dont le litige a été tranché en faveur du client', async () => {
    await countCoveredSessions(EMPLOYEE_ID);

    const branches = prisma.appointment.count.mock.calls[0][0].where.OR;
    expect(branches.some((b) => JSON.stringify(b).includes('RESOLVED_CLIENT'))).toBe(true);
  });
});

describe('company.service.getMyQuota — compteur affiché au salarié', () => {
  const arrangeEmployee = ({ plan = 'ESSENTIEL_ENTREPRISE', used = 0, subs = null } = {}) => {
    prisma.user.findUnique.mockResolvedValue({
      employerCompanyId: COMPANY_ID,
      employerCompany: { subscriptions: subs ?? [F.subscription({ plan })] },
    });
    prisma.appointment.count.mockResolvedValue(used);
  };

  it('renvoie plan, quota, consommé et restant', async () => {
    arrangeEmployee({ plan: 'BOOST_ENTREPRISE', used: 3 });

    expect(await companyService.getMyQuota(EMPLOYEE_ID)).toMatchObject({
      plan: 'BOOST_ENTREPRISE', quota: 8, used: 3, remaining: 5,
    });
  });

  it('plafonne le restant à zéro plutôt que de passer en négatif', async () => {
    arrangeEmployee({ plan: 'ESSENTIEL_ENTREPRISE', used: 9 });

    expect((await companyService.getMyQuota(EMPLOYEE_ID)).remaining).toBe(0);
  });

  it('renvoie un quota nul quand l\'entreprise n\'a pas d\'abonnement en cours', async () => {
    arrangeEmployee({ subs: [] });

    expect(await companyService.getMyQuota(EMPLOYEE_ID)).toMatchObject({ plan: null, quota: null, remaining: null });
  });

  it('refuse un client qui n\'est rattaché à aucune entreprise', async () => {
    prisma.user.findUnique.mockResolvedValue({ employerCompanyId: null });

    await expect(companyService.getMyQuota(EMPLOYEE_ID)).rejects.toMatchObject({ statusCode: 403 });
  });

  // Un abonnement résilié reste dû jusqu'à son échéance : le salarié conserve
  // ses droits jusqu'au dernier jour payé.
  it('tient compte des abonnements résiliés encore dans leur période payée', async () => {
    arrangeEmployee();
    await companyService.getMyQuota(EMPLOYEE_ID);

    const { subscriptions } = prisma.user.findUnique.mock.calls[0][0].select.employerCompany.select;
    expect(subscriptions.where.status.in).toEqual(['ACTIVE', 'CANCELLED']);
    expect(subscriptions.where.endDate.gt).toBeInstanceOf(Date);
  });

  it('libelle le mois en cours en français', async () => {
    arrangeEmployee();

    expect(typeof (await companyService.getMyQuota(EMPLOYEE_ID)).month).toBe('string');
  });
});

describe('company.service — code d\'adhésion', () => {
  it('renvoie le code permanent existant', async () => {
    prisma.user.findUnique.mockResolvedValue({ joinCode: 'ABCD1234' });

    expect(await companyService.getJoinCode(COMPANY_ID)).toEqual({ joinCode: 'ABCD1234' });
  });

  it('en génère un à la volée si l\'entreprise n\'en a pas encore', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ joinCode: null }).mockResolvedValue(null);

    const { joinCode } = await companyService.getJoinCode(COMPANY_ID);

    expect(joinCode).toMatch(/^[0-9A-F]{8}$/);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: COMPANY_ID }, data: { joinCode } });
  });

  it('renvoie 404 pour une entreprise inexistante', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(companyService.getJoinCode(COMPANY_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('régénère un code de 8 caractères hexadécimaux majuscules', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const { joinCode } = await companyService.regenerateJoinCode(COMPANY_ID);

    expect(joinCode).toMatch(/^[0-9A-F]{8}$/);
  });

  it('retire un code déjà attribué et retente jusqu\'à en trouver un libre', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 1 })   // 1re tentative : collision
      .mockResolvedValueOnce({ id: 2 })   // 2e tentative : collision
      .mockResolvedValue(null);           // 3e : libre

    await companyService.regenerateJoinCode(COMPANY_ID);

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(3);
  });
});

describe('company.service — invitations de collaborateurs', () => {
  const arrangeCompany = () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // aucun compte existant avec cet email
      .mockResolvedValueOnce({ companyName: 'ACME Corp', firstName: 'ACME', lastName: 'Corp' });
    prisma.companyInvite.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
  };

  it('crée une invitation avec un jeton et une échéance à 7 jours', async () => {
    arrangeCompany();

    const invite = await companyService.createInvite(COMPANY_ID, 'nouveau@acme.fr');

    expect(invite.token).toMatch(/^[0-9A-F]{12}$/);
    const days = (invite.expiresAt - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });

  it('envoie l\'email d\'invitation avec le lien d\'inscription pré-rempli', async () => {
    arrangeCompany();

    await companyService.createInvite(COMPANY_ID, 'nouveau@acme.fr');

    const sent = resend.emails.send.mock.calls[0][0];
    expect(sent.to).toBe('nouveau@acme.fr');
    expect(sent.html).toContain('role=SALARIE');
  });

  it('refuse d\'inviter un salarié déjà rattaché à l\'entreprise', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 5, employerCompanyId: COMPANY_ID });

    await expect(
      companyService.createInvite(COMPANY_ID, 'deja@acme.fr')
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('autorise l\'invitation d\'un compte existant rattaché à une autre entreprise', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 5, employerCompanyId: 999 })
      .mockResolvedValueOnce({ companyName: 'ACME Corp' });
    prisma.companyInvite.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));

    await expect(companyService.createInvite(COMPANY_ID, 'ailleurs@x.fr')).resolves.toBeDefined();
  });

  // Une panne du fournisseur d'emails ne doit pas faire perdre l'invitation :
  // le code reste récupérable dans l'interface entreprise.
  it('crée quand même l\'invitation si l\'envoi de l\'email échoue', async () => {
    arrangeCompany();
    resend.emails.send.mockRejectedValue(new Error('Resend indisponible'));

    await expect(companyService.createInvite(COMPANY_ID, 'x@acme.fr')).resolves.toBeDefined();
  });

  it('ne liste que les invitations non utilisées et non expirées', async () => {
    await companyService.getInvites(COMPANY_ID);

    expect(prisma.companyInvite.findMany.mock.calls[0][0].where).toMatchObject({
      companyId: COMPANY_ID, usedAt: null, expiresAt: { gt: expect.any(Date) },
    });
  });

  it('refuse de supprimer l\'invitation d\'une autre entreprise', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue({ id: 1, companyId: 999 });

    await expect(companyService.deleteInvite(COMPANY_ID, 1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('supprime une invitation appartenant bien à l\'entreprise', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue({ id: 1, companyId: COMPANY_ID });

    await companyService.deleteInvite(COMPANY_ID, 1);

    expect(prisma.companyInvite.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe('company.service — gestion des collaborateurs', () => {
  it('ne liste que les CLIENT rattachés à l\'entreprise', async () => {
    await companyService.getEmployees(COMPANY_ID);

    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ employerCompanyId: COMPANY_ID, role: 'CLIENT' });
  });

  it('ne remonte jamais le hash de mot de passe dans le listing', async () => {
    await companyService.getEmployees(COMPANY_ID);

    expect(prisma.user.findMany.mock.calls[0][0].select).not.toHaveProperty('passwordHash');
  });

  it('détache un collaborateur sans supprimer son compte', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: EMPLOYEE_ID, employerCompanyId: COMPANY_ID });

    await companyService.removeEmployee(COMPANY_ID, EMPLOYEE_ID);

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: EMPLOYEE_ID }, data: { employerCompanyId: null } });
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('refuse de détacher un salarié d\'une autre entreprise', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: EMPLOYEE_ID, employerCompanyId: 999 });

    await expect(companyService.removeEmployee(COMPANY_ID, EMPLOYEE_ID)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('company.service.getEmployeesUsage — tableau de consommation (export CSV)', () => {
  it('associe à chaque collaborateur ses séances couvertes et son total', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 1, firstName: 'Sarah', lastName: 'Benali', email: 's@acme.fr' },
      { id: 2, firstName: 'Marvin', lastName: 'Dupont', email: 'm@acme.fr' },
    ]);
    prisma.subscription.findFirst.mockResolvedValue(F.subscription({ plan: 'BOOST_ENTREPRISE' }));
    prisma.appointment.groupBy
      .mockResolvedValueOnce([{ clientId: 1, _count: { id: 3 } }])
      .mockResolvedValueOnce([{ clientId: 1, _count: { id: 5 } }, { clientId: 2, _count: { id: 2 } }]);

    const { quota, rows } = await companyService.getEmployeesUsage(COMPANY_ID);

    expect(quota).toBe(8);
    expect(rows).toEqual([
      expect.objectContaining({ id: 1, covered: 3, total: 5 }),
      expect.objectContaining({ id: 2, covered: 0, total: 2 }), // aucune séance couverte
    ]);
  });

  it('renvoie un quota nul quand l\'entreprise n\'a pas d\'abonnement en cours', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.subscription.findFirst.mockResolvedValue(null);

    expect((await companyService.getEmployeesUsage(COMPANY_ID)).quota).toBeNull();
  });
});

describe('company.service.getUsageStats — synthèse entreprise', () => {
  it('calcule le quota global = quota par collaborateur × effectif', async () => {
    prisma.user.count.mockResolvedValue(6);
    prisma.subscription.findFirst.mockResolvedValue(F.subscription({ plan: 'BOOST_ENTREPRISE' }));
    prisma.user.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.appointment.count.mockResolvedValue(11);

    const stats = await companyService.getUsageStats(COMPANY_ID);

    expect(stats).toMatchObject({ employeeCount: 6, sessionCount: 11, plan: 'BOOST_ENTREPRISE' });
    expect(stats.limits).toMatchObject({ quotaPerEmployee: 8, totalQuota: 48 });
  });

  it('laisse les limites à null sans abonnement', async () => {
    prisma.user.count.mockResolvedValue(3);
    prisma.subscription.findFirst.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([]);

    expect((await companyService.getUsageStats(COMPANY_ID)).limits).toMatchObject({ quotaPerEmployee: null, totalQuota: null });
  });
});

describe('company.service.getEmployerSubscription — forfait vu par le salarié', () => {
  it('renvoie l\'entreprise et son abonnement actif', async () => {
    prisma.user.findUnique.mockResolvedValue({
      employerCompanyId: COMPANY_ID,
      employerCompany: { id: COMPANY_ID, companyName: 'ACME Corp', firstName: 'A', lastName: 'C', subscriptions: [F.subscription()] },
    });

    const result = await companyService.getEmployerSubscription(EMPLOYEE_ID);

    expect(result.company).toEqual({ id: COMPANY_ID, name: 'ACME Corp' });
    expect(result.subscription.plan).toBe('ESSENTIEL_ENTREPRISE');
  });

  it('retombe sur nom + prénom quand la raison sociale est absente', async () => {
    prisma.user.findUnique.mockResolvedValue({
      employerCompanyId: COMPANY_ID,
      employerCompany: { id: COMPANY_ID, companyName: null, firstName: 'Jean', lastName: 'Martin', subscriptions: [] },
    });

    expect((await companyService.getEmployerSubscription(EMPLOYEE_ID)).company.name).toBe('Jean Martin');
  });

  it('refuse un client sans entreprise employeuse', async () => {
    prisma.user.findUnique.mockResolvedValue({ employerCompanyId: null });

    await expect(companyService.getEmployerSubscription(EMPLOYEE_ID)).rejects.toMatchObject({ statusCode: 403 });
  });
});
