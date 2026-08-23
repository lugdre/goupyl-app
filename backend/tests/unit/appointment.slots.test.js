jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());
jest.mock('../../src/config/stripe', () => require('../helpers/prismaMock').createStripeMock());

const prisma = require('../../src/config/database');
const appointmentService = require('../../src/services/appointment.service');
const F = require('../helpers/fixtures');

const resetMocks = require('../helpers/resetMocks');

// Les implémentations posées par un test ne doivent pas contaminer le suivant.
beforeEach(() => resetMocks({ prisma }));

describe('appointment.service.getBusySlots — créneaux occupés d\'un coach', () => {
  it('convertit chaque rendez-vous en intervalle {start, end} ISO', async () => {
    prisma.appointment.findMany.mockResolvedValue([
      { scheduledAt: F.at(2026, 9, 15, 10), durationMinutes: 60 },
      { scheduledAt: F.at(2026, 9, 15, 14), durationMinutes: 90 },
    ]);

    const slots = await appointmentService.getBusySlots(200);

    expect(slots).toEqual([
      { start: F.at(2026, 9, 15, 10).toISOString(), end: F.at(2026, 9, 15, 11).toISOString() },
      { start: F.at(2026, 9, 15, 14).toISOString(), end: F.at(2026, 9, 15, 15, 30).toISOString() },
    ]);
  });

  it('accepte un identifiant transmis en chaîne (paramètre d\'URL)', async () => {
    await appointmentService.getBusySlots('200');

    expect(prisma.appointment.findMany.mock.calls[0][0].where.intervenantId).toBe(200);
  });

  it('couvre 14 jours à partir d\'aujourd\'hui par défaut', async () => {
    await appointmentService.getBusySlots(200);

    const { gte, lt } = prisma.appointment.findMany.mock.calls[0][0].where.scheduledAt;
    expect(Math.round((lt - gte) / 86_400_000)).toBe(14);
  });

  it('respecte la fenêtre demandée', async () => {
    const from = F.at(2026, 9, 1, 0).toISOString();
    const to = F.at(2026, 9, 8, 0).toISOString();

    await appointmentService.getBusySlots(200, from, to);

    const { where } = prisma.appointment.findMany.mock.calls[0][0];
    expect(where.scheduledAt).toEqual({ gte: new Date(from), lt: new Date(to) });
  });

  // Un créneau réservé mais jamais confirmé ne doit pas bloquer indéfiniment
  // l'agenda public du coach.
  it('exclut les PENDING périmés du calcul d\'occupation', async () => {
    await appointmentService.getBusySlots(200);

    expect(prisma.appointment.findMany.mock.calls[0][0].where.OR).toEqual([
      { status: 'CONFIRMED' },
      expect.objectContaining({ status: 'PENDING' }),
    ]);
  });

  it('renvoie une liste vide quand l\'agenda est libre', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);

    expect(await appointmentService.getBusySlots(200)).toEqual([]);
  });
});

describe('appointment.service.getMyBusySlots — créneaux occupés du client', () => {
  it('filtre sur le client courant, pas sur l\'intervenant', async () => {
    await appointmentService.getMyBusySlots(100);

    const { where } = prisma.appointment.findMany.mock.calls[0][0];
    expect(where.clientId).toBe(100);
    expect(where.intervenantId).toBeUndefined();
  });

  it('renvoie les mêmes intervalles {start, end} que la vue coach', async () => {
    prisma.appointment.findMany.mockResolvedValue([{ scheduledAt: F.at(2026, 9, 15, 8), durationMinutes: 30 }]);

    expect(await appointmentService.getMyBusySlots(100)).toEqual([
      { start: F.at(2026, 9, 15, 8).toISOString(), end: F.at(2026, 9, 15, 8, 30).toISOString() },
    ]);
  });
});

describe('appointment.service.getMyAppointments — liste paginée', () => {
  it('filtre sur clientId pour un CLIENT', async () => {
    await appointmentService.getMyAppointments(100, 'CLIENT', {});

    expect(prisma.appointment.findMany.mock.calls[0][0].where).toEqual({ clientId: 100 });
  });

  it('filtre sur intervenantId pour un INTERVENANT', async () => {
    await appointmentService.getMyAppointments(200, 'INTERVENANT', {});

    expect(prisma.appointment.findMany.mock.calls[0][0].where).toEqual({ intervenantId: 200 });
  });

  it('applique le filtre de statut quand il est fourni', async () => {
    await appointmentService.getMyAppointments(100, 'CLIENT', { status: 'CONFIRMED' });

    expect(prisma.appointment.findMany.mock.calls[0][0].where).toEqual({ clientId: 100, status: 'CONFIRMED' });
  });

  it('calcule la pagination à partir du total', async () => {
    prisma.appointment.count.mockResolvedValue(25);

    const { pagination } = await appointmentService.getMyAppointments(100, 'CLIENT', { page: 2, limit: 10 });

    expect(pagination).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
  });

  it('convertit page et limit transmis en chaîne (paramètres de requête)', async () => {
    await appointmentService.getMyAppointments(100, 'CLIENT', { page: '3', limit: '5' });

    expect(prisma.appointment.findMany.mock.calls[0][0]).toMatchObject({ skip: 10, take: 5 });
  });
});

describe('appointment.service.expirePendingAppointments — balayage des réservations non confirmées', () => {
  it('annule les PENDING périmés en les attribuant au système', async () => {
    prisma.appointment.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const count = await appointmentService.expirePendingAppointments();

    expect(count).toBe(2);
    expect(prisma.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      data: expect.objectContaining({ status: 'CANCELLED', cancelledBy: 'system' }),
    });
  });

  it('cible les PENDING de plus de 24 h OU dont l\'heure est passée', async () => {
    prisma.appointment.findMany.mockResolvedValue([{ id: 1 }]);

    await appointmentService.expirePendingAppointments();

    const { where } = prisma.appointment.findMany.mock.calls[0][0];
    expect(where.status).toBe('PENDING');
    expect(where.OR).toEqual([
      { scheduledAt: { lt: expect.any(Date) } },
      { createdAt: { lt: expect.any(Date) } },
    ]);
    const cutoff = where.OR[1].createdAt.lt;
    expect(Math.round((Date.now() - cutoff.getTime()) / 3_600_000)).toBe(24);
  });

  it('ne fait rien et renvoie 0 quand aucun rendez-vous n\'est périmé', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);

    expect(await appointmentService.expirePendingAppointments()).toBe(0);
    expect(prisma.appointment.updateMany).not.toHaveBeenCalled();
  });

  it('journalise chaque expiration dans l\'historique', async () => {
    prisma.appointment.findMany.mockResolvedValue([{ id: 7 }]);

    await appointmentService.expirePendingAppointments();

    expect(prisma.appointmentStatusHistory.createMany).toHaveBeenCalledWith({
      data: [{ appointmentId: 7, fromStatus: 'PENDING', toStatus: 'CANCELLED', changedBy: 'system' }],
    });
  });

  it('n\'échoue pas si l\'écriture de l\'historique tombe en erreur', async () => {
    prisma.appointment.findMany.mockResolvedValue([{ id: 7 }]);
    prisma.appointmentStatusHistory.createMany.mockRejectedValue(new Error('indisponible'));

    await expect(appointmentService.expirePendingAppointments()).resolves.toBe(1);
  });
});
