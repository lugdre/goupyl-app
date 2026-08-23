jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());
jest.mock('../../src/config/stripe', () => require('../helpers/prismaMock').createStripeMock());

const prisma = require('../../src/config/database');
const getStripe = require('../../src/config/stripe');
const appointmentService = require('../../src/services/appointment.service');
const F = require('../helpers/fixtures');

const resetMocks = require('../helpers/resetMocks');

// Les implémentations posées par un test ne doivent pas contaminer le suivant.
beforeEach(() => resetMocks({ prisma, getStripe }));

const CLIENT_ID = 100;
const COACH_ID = 200;

/**
 * Séance à 50 € payée : 5000 centimes, 30 % plateforme (1500), 70 % coach (3500).
 * `hoursUntil` positionne la séance par rapport à maintenant, ce qui détermine
 * le palier de remboursement.
 */
const arrange = ({ hoursUntil = 240, paymentStatus = 'paid', payment = F.payment(), status = 'CONFIRMED' } = {}) => {
  const appt = F.appointment({
    status,
    paymentStatus,
    scheduledAt: F.inHours(hoursUntil),
    payment,
  });
  prisma.appointment.findUnique.mockResolvedValue(appt);
  prisma.appointment.update.mockImplementation(async ({ data }) => ({ ...appt, ...data }));
  getStripe().refunds.create.mockResolvedValue({ id: 're_test_1', status: 'succeeded' });
  return appt;
};

describe('appointment.service.cancelAppointment — politique de remboursement dégressive', () => {
  describe('palier FULL (≥ 7 jours avant la séance) → 100 % remboursé', () => {
    it('rembourse l\'intégralité à 10 jours', async () => {
      arrange({ hoursUntil: 240 });

      const { refund } = await appointmentService.cancelAppointment(1, CLIENT_ID, 'Imprévu');

      expect(refund).toMatchObject({ tier: 'FULL', refundRate: 1, refundAmount: 5000 });
    });

    it('applique encore le palier FULL à la borne exacte de 168 h', async () => {
      arrange({ hoursUntil: 168.01 });

      const { refund } = await appointmentService.cancelAppointment(1, CLIENT_ID);

      expect(refund.tier).toBe('FULL');
    });

    it('sort la séance des gains du coach (paymentStatus → refunded)', async () => {
      arrange({ hoursUntil: 240 });

      await appointmentService.cancelAppointment(1, CLIENT_ID);

      expect(prisma.appointment.update.mock.calls[0][0].data).toMatchObject({ status: 'CANCELLED', paymentStatus: 'refunded' });
    });
  });

  describe('palier PARTIAL (48 h – 7 jours) → 50 % remboursé', () => {
    it('rembourse la moitié à 72 h', async () => {
      arrange({ hoursUntil: 72 });

      const { refund } = await appointmentService.cancelAppointment(1, CLIENT_ID);

      expect(refund).toMatchObject({ tier: 'PARTIAL', refundRate: 0.5, refundAmount: 2500 });
    });

    it('bascule de FULL à PARTIAL juste sous 168 h', async () => {
      arrange({ hoursUntil: 167.9 });

      expect((await appointmentService.cancelAppointment(1, CLIENT_ID)).refund.tier).toBe('PARTIAL');
    });

    it('applique encore PARTIAL à la borne exacte de 48 h', async () => {
      arrange({ hoursUntil: 48.01 });

      expect((await appointmentService.cancelAppointment(1, CLIENT_ID)).refund.tier).toBe('PARTIAL');
    });

    // Répartition au prorata : sur les 50 % conservés, le coach garde 35 % du
    // prix total et la plateforme 15 %.
    it('répartit le reliquat 35 % coach / 15 % plateforme', async () => {
      arrange({ hoursUntil: 72 });

      const { refund } = await appointmentService.cancelAppointment(1, CLIENT_ID);

      expect(refund.coachRetains).toBe(1750);    // 35 % de 5000
      expect(refund.platformRetains).toBe(750);  // 15 % de 5000
    });

    it('ne bascule PAS la séance en refunded (remboursement non intégral)', async () => {
      arrange({ hoursUntil: 72 });

      await appointmentService.cancelAppointment(1, CLIENT_ID);

      expect(prisma.appointment.update.mock.calls[0][0].data.paymentStatus).toBeUndefined();
    });
  });

  describe('palier NONE (< 48 h) → annulation autorisée, aucun remboursement', () => {
    it('annule sans rembourser à 24 h', async () => {
      arrange({ hoursUntil: 24 });

      const { refund } = await appointmentService.cancelAppointment(1, CLIENT_ID);

      expect(refund).toMatchObject({ tier: 'NONE', refundRate: 0, refundAmount: 0 });
    });

    it('bascule de PARTIAL à NONE juste sous 48 h', async () => {
      arrange({ hoursUntil: 47.9 });

      expect((await appointmentService.cancelAppointment(1, CLIENT_ID)).refund.tier).toBe('NONE');
    });

    it('n\'appelle jamais Stripe quand rien n\'est remboursable', async () => {
      arrange({ hoursUntil: 24 });

      await appointmentService.cancelAppointment(1, CLIENT_ID);

      expect(getStripe().refunds.create).not.toHaveBeenCalled();
    });

    it('annule tout de même le rendez-vous', async () => {
      arrange({ hoursUntil: 1 });

      const result = await appointmentService.cancelAppointment(1, CLIENT_ID);

      expect(result.success).toBe(true);
      expect(prisma.appointment.update.mock.calls[0][0].data.status).toBe('CANCELLED');
    });
  });
});

describe('appointment.service.cancelAppointment — intégration Stripe', () => {
  it('reprend la part coach et la commission plateforme au prorata', async () => {
    arrange({ hoursUntil: 240 });

    await appointmentService.cancelAppointment(1, CLIENT_ID);

    expect(getStripe().refunds.create).toHaveBeenCalledWith({
      payment_intent: 'pi_test_123',
      amount: 5000,
      reverse_transfer: true,
      refund_application_fee: true,
    });
  });

  it('trace le remboursement sur l\'enregistrement Payment', async () => {
    arrange({ hoursUntil: 72 });

    await appointmentService.cancelAppointment(1, CLIENT_ID);

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { appointmentId: 1 },
      data: { refundAmount: 2500, refundStripeId: 're_test_1', refundStatus: 'succeeded' },
    });
  });

  // Un incident Stripe ne doit pas laisser le client bloqué avec un rendez-vous
  // qu'il ne peut pas annuler : on annule et on signale l'erreur pour reprise
  // manuelle.
  it('annule quand même si Stripe échoue, et remonte l\'erreur dans la réponse', async () => {
    arrange({ hoursUntil: 240 });
    getStripe().refunds.create.mockRejectedValue(new Error('Stripe indisponible'));

    const { success, refund } = await appointmentService.cancelAppointment(1, CLIENT_ID);

    expect(success).toBe(true);
    expect(refund.stripeError).toBe('Stripe indisponible');
    expect(prisma.appointment.update.mock.calls[0][0].data.status).toBe('CANCELLED');
  });

  it('ne bascule pas en refunded quand le remboursement Stripe a échoué', async () => {
    arrange({ hoursUntil: 240 });
    getStripe().refunds.create.mockRejectedValue(new Error('boom'));

    await appointmentService.cancelAppointment(1, CLIENT_ID);

    expect(prisma.appointment.update.mock.calls[0][0].data.paymentStatus).toBeUndefined();
  });

  it('ne tente aucun remboursement sur une séance jamais payée', async () => {
    arrange({ hoursUntil: 240, paymentStatus: 'unpaid' });

    const { refund } = await appointmentService.cancelAppointment(1, CLIENT_ID);

    expect(getStripe().refunds.create).not.toHaveBeenCalled();
    expect(refund).toEqual({ tier: 'FULL', refundRate: 1, refundAmount: 0 });
  });

  it('ne tente aucun remboursement si aucun Payment n\'est rattaché', async () => {
    arrange({ hoursUntil: 240, payment: null });

    await appointmentService.cancelAppointment(1, CLIENT_ID);

    expect(getStripe().refunds.create).not.toHaveBeenCalled();
  });
});

describe('appointment.service.cancelAppointment — contrôles d\'accès et d\'état', () => {
  it('renvoie 404 pour un rendez-vous inexistant', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);

    await expect(appointmentService.cancelAppointment(999, CLIENT_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuse à un client d\'annuler le rendez-vous d\'un autre', async () => {
    arrange({});

    await expect(appointmentService.cancelAppointment(1, 999)).rejects.toMatchObject({ statusCode: 403 });
  });

  it.each(['DONE', 'CANCELLED'])('refuse d\'annuler un rendez-vous déjà %s', async (status) => {
    arrange({ status });

    await expect(
      appointmentService.cancelAppointment(1, CLIENT_ID)
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'INVALID_STATUS' });
  });

  it('accepte d\'annuler un rendez-vous encore PENDING', async () => {
    arrange({ status: 'PENDING', paymentStatus: 'unpaid' });

    await expect(appointmentService.cancelAppointment(1, CLIENT_ID)).resolves.toMatchObject({ success: true });
  });

  it('applique un motif par défaut quand le client n\'en fournit pas', async () => {
    arrange({ hoursUntil: 24 });

    await appointmentService.cancelAppointment(1, CLIENT_ID);

    expect(prisma.appointment.update.mock.calls[0][0].data).toMatchObject({ cancelledBy: 'client', cancelReason: 'Annulé par le client' });
  });

  it('notifie le coach de l\'annulation', async () => {
    arrange({ hoursUntil: 24 });

    await appointmentService.cancelAppointment(1, CLIENT_ID);

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: COACH_ID, type: 'APPOINTMENT_CANCELLED' }),
    });
  });

  it('journalise l\'annulation dans l\'historique', async () => {
    arrange({ status: 'CONFIRMED', hoursUntil: 24 });

    await appointmentService.cancelAppointment(1, CLIENT_ID);

    expect(prisma.appointmentStatusHistory.create).toHaveBeenCalledWith({
      data: { appointmentId: 1, fromStatus: 'CONFIRMED', toStatus: 'CANCELLED', changedBy: 'client' },
    });
  });
});
