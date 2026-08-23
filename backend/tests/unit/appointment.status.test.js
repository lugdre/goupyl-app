jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());
jest.mock('../../src/config/stripe', () => require('../helpers/prismaMock').createStripeMock());

const prisma = require('../../src/config/database');
const appointmentService = require('../../src/services/appointment.service');
const F = require('../helpers/fixtures');

const resetMocks = require('../helpers/resetMocks');

// Les implémentations posées par un test ne doivent pas contaminer le suivant.
beforeEach(() => resetMocks({ prisma }));

const COACH_ID = 200;
const CLIENT_ID = 100;

const arrange = (over = {}) => {
  const appt = F.appointment(over);
  prisma.appointment.findUnique.mockResolvedValue(appt);
  prisma.appointment.update.mockImplementation(async ({ data }) => ({ ...appt, ...data }));
  return appt;
};

describe('appointment.service.updateStatus — machine à états', () => {
  it.each([
    ['PENDING',   'CONFIRMED'],
    ['PENDING',   'CANCELLED'],
    ['CONFIRMED', 'CANCELLED'],
  ])('autorise la transition %s → %s', async (from, to) => {
    arrange({ status: from });

    const updated = await appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', to);

    expect(updated.status).toBe(to);
  });

  it('autorise CONFIRMED → DONE lorsque la séance est payée', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'paid' });

    const updated = await appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', 'DONE');

    expect(updated.status).toBe('DONE');
  });

  it.each([
    ['PENDING',   'DONE'],
    ['DONE',      'CONFIRMED'],
    ['DONE',      'CANCELLED'],
    ['CANCELLED', 'CONFIRMED'],
    ['CANCELLED', 'DONE'],
  ])('refuse la transition %s → %s avec INVALID_STATUS_TRANSITION', async (from, to) => {
    arrange({ status: from, paymentStatus: 'paid' });

    await expect(
      appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', to)
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'INVALID_STATUS_TRANSITION' });
  });

  it('marque la présence quand la séance passe à DONE', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'paid' });

    await appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', 'DONE');

    expect(prisma.appointment.update.mock.calls[0][0].data).toMatchObject({ status: 'DONE', attendanceStatus: 'PRESENT' });
  });

  it('enregistre le motif et l\'auteur de l\'annulation', async () => {
    arrange({ status: 'PENDING' });

    await appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', 'CANCELLED', 'Empêchement');

    expect(prisma.appointment.update.mock.calls[0][0].data).toMatchObject({ cancelReason: 'Empêchement', cancelledBy: 'intervenant' });
  });

  it('journalise chaque transition dans l\'historique (piste d\'audit)', async () => {
    arrange({ status: 'PENDING' });

    await appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', 'CONFIRMED');

    expect(prisma.appointmentStatusHistory.create).toHaveBeenCalledWith({
      data: { appointmentId: 1, fromStatus: 'PENDING', toStatus: 'CONFIRMED', changedBy: 'intervenant' },
    });
  });

  it('notifie le client à la confirmation du rendez-vous', async () => {
    arrange({ status: 'PENDING' });

    await appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', 'CONFIRMED');
    await new Promise(process.nextTick);

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: CLIENT_ID, type: 'APPOINTMENT_CONFIRMED' }),
    });
  });

  it('n\'échoue pas si l\'écriture de l\'historique tombe en erreur (audit non bloquant)', async () => {
    arrange({ status: 'PENDING' });
    prisma.appointmentStatusHistory.create.mockRejectedValue(new Error('table indisponible'));

    await expect(appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', 'CONFIRMED')).resolves.toBeDefined();
  });

  it('renvoie 404 pour un rendez-vous inexistant', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);

    await expect(
      appointmentService.updateStatus(999, COACH_ID, 'INTERVENANT', 'CONFIRMED')
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('appointment.service.updateStatus — cloisonnement par acteur', () => {
  it('refuse à un coach de modifier le rendez-vous d\'un confrère', async () => {
    arrange({ status: 'PENDING', intervenantId: 999 });

    await expect(
      appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', 'CONFIRMED')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuse à un client de toucher au rendez-vous d\'un autre client', async () => {
    arrange({ status: 'PENDING', clientId: 999 });

    await expect(
      appointmentService.updateStatus(1, CLIENT_ID, 'CLIENT', 'CANCELLED')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  // Les annulations client doivent passer par POST /:id/cancel, qui applique la
  // politique de remboursement dégressive. Ce chemin générique les rejette.
  it('redirige le client vers la procédure dédiée (USE_CANCEL_ENDPOINT)', async () => {
    arrange({ status: 'PENDING' });

    await expect(
      appointmentService.updateStatus(1, CLIENT_ID, 'CLIENT', 'CANCELLED')
    ).rejects.toMatchObject({ statusCode: 403, errorCode: 'USE_CANCEL_ENDPOINT' });
  });

  it('n\'écrit rien en base lorsque le client est refusé', async () => {
    arrange({ status: 'PENDING' });

    await appointmentService.updateStatus(1, CLIENT_ID, 'CLIENT', 'CANCELLED').catch(() => {});

    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it('laisse un ADMIN agir sans contrôle de propriété', async () => {
    arrange({ status: 'PENDING', clientId: 1, intervenantId: 2 });

    await expect(appointmentService.updateStatus(1, 999, 'ADMIN', 'CONFIRMED')).resolves.toBeDefined();
  });
});

describe('appointment.service.updateStatus — porte de paiement CONFIRMED → DONE', () => {
  it('refuse de clôturer une séance impayée', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'unpaid', coveredByCompany: false });

    await expect(
      appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', 'DONE')
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'PAYMENT_REQUIRED' });
  });

  // Nuance importante : la porte s'ouvre sur `coveredByCompany` du rendez-vous,
  // PAS sur le statut de salarié du client. Un salarié hors quota qui réserve à
  // titre personnel doit payer comme un particulier.
  it('laisse passer une séance prise en charge par l\'entreprise, même impayée', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'unpaid', coveredByCompany: true });

    await expect(appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', 'DONE')).resolves.toMatchObject({ status: 'DONE' });
  });

  it('refuse une séance remboursée (paymentStatus refunded)', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'refunded', coveredByCompany: false });

    await expect(
      appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', 'DONE')
    ).rejects.toMatchObject({ errorCode: 'PAYMENT_REQUIRED' });
  });

  it('n\'applique pas la porte de paiement à une annulation', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'unpaid' });

    await expect(appointmentService.updateStatus(1, COACH_ID, 'INTERVENANT', 'CANCELLED')).resolves.toBeDefined();
  });
});
