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

const COACH_ID = 200;
const CLIENT_ID = 100;
const QR = 'a1b2c3d4-1111-2222-3333-444455556666';

const arrange = (over = {}) => {
  const appt = F.appointment(over);
  prisma.appointment.findUnique.mockResolvedValue(appt);
  prisma.appointment.findFirst.mockResolvedValue(appt);
  prisma.appointment.update.mockImplementation(async ({ data }) => ({ ...appt, ...data }));
  return appt;
};

describe('appointment.service.validateQr — validation de présence par QR code', () => {
  it('valide la séance avec l\'UUID complet (scan caméra)', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'paid' });

    const updated = await appointmentService.validateQr(COACH_ID, QR);

    expect(updated).toMatchObject({ status: 'DONE', attendanceStatus: 'PRESENT', validatedByQr: true });
    expect(prisma.appointment.findUnique).toHaveBeenCalledWith({ where: { qrToken: QR } });
  });

  it('valide la séance avec le code court de 8 caractères (saisie manuelle)', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'paid' });

    await appointmentService.validateQr(COACH_ID, 'a1b2c3d4');

    expect(prisma.appointment.findFirst).toHaveBeenCalledWith({
      where: { intervenantId: COACH_ID, status: 'CONFIRMED', qrToken: { startsWith: 'a1b2c3d4' } },
    });
  });

  it('normalise le code saisi (majuscules et espaces parasites)', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'paid' });

    await appointmentService.validateQr(COACH_ID, '  A1B2C3D4  ');

    expect(prisma.appointment.findFirst.mock.calls[0][0].where.qrToken.startsWith).toBe('a1b2c3d4');
  });

  it.each([['', 'vide'], ['abc', 'trop court'], [null, 'absent']])
    ('refuse un code %s (%s) avec QR_INVALID_CODE', async (code) => {
      await expect(
        appointmentService.validateQr(COACH_ID, code)
      ).rejects.toMatchObject({ statusCode: 400, errorCode: 'QR_INVALID_CODE' });
    });

  it('renvoie QR_NOT_FOUND si aucune séance ne correspond', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);
    prisma.appointment.findFirst.mockResolvedValue(null);

    await expect(
      appointmentService.validateQr(COACH_ID, QR)
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'QR_NOT_FOUND' });
  });

  // Le scan par UUID complet cherche sans filtrer sur l'intervenant : un coach
  // ne doit pas pouvoir valider la séance d'un confrère en scannant son QR.
  it('refuse à un coach de valider la séance d\'un confrère', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'paid', intervenantId: 999 });

    await expect(appointmentService.validateQr(COACH_ID, QR)).rejects.toMatchObject({ statusCode: 403 });
  });

  it.each(['PENDING', 'DONE', 'CANCELLED'])('refuse de valider une séance %s', async (status) => {
    arrange({ status, paymentStatus: 'paid' });

    await expect(
      appointmentService.validateQr(COACH_ID, QR)
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'QR_INVALID_STATUS' });
  });

  it('applique la même porte de paiement que la clôture manuelle', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'unpaid', coveredByCompany: false });

    await expect(
      appointmentService.validateQr(COACH_ID, QR)
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'PAYMENT_REQUIRED' });
  });

  it('laisse passer une séance couverte par l\'entreprise sans paiement', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'unpaid', coveredByCompany: true });

    await expect(appointmentService.validateQr(COACH_ID, QR)).resolves.toMatchObject({ status: 'DONE' });
  });

  it('journalise la validation dans l\'historique', async () => {
    arrange({ status: 'CONFIRMED', paymentStatus: 'paid' });

    await appointmentService.validateQr(COACH_ID, QR);

    expect(prisma.appointmentStatusHistory.create).toHaveBeenCalledWith({
      data: { appointmentId: 1, fromStatus: 'CONFIRMED', toStatus: 'DONE', changedBy: 'intervenant' },
    });
  });
});

describe('appointment.service.markAbsent — signalement d\'absence', () => {
  const past = () => F.inHours(-2);

  it('clôture la séance en DONE / ABSENT', async () => {
    arrange({ status: 'CONFIRMED', scheduledAt: past() });

    const updated = await appointmentService.markAbsent(1, COACH_ID);

    expect(updated).toMatchObject({ status: 'DONE', attendanceStatus: 'ABSENT' });
  });

  // Choix délibéré : un client absent ne paiera jamais. Bloquer sur le paiement
  // laisserait la séance CONFIRMED indéfiniment.
  it('ne dépend pas de la porte de paiement', async () => {
    arrange({ status: 'CONFIRMED', scheduledAt: past(), paymentStatus: 'unpaid', coveredByCompany: false });

    await expect(appointmentService.markAbsent(1, COACH_ID)).resolves.toMatchObject({ attendanceStatus: 'ABSENT' });
  });

  it('refuse de signaler une absence avant le début de la séance', async () => {
    arrange({ status: 'CONFIRMED', scheduledAt: F.inHours(2) });

    await expect(
      appointmentService.markAbsent(1, COACH_ID)
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'SESSION_NOT_STARTED' });
  });

  it.each(['PENDING', 'DONE', 'CANCELLED'])('refuse une séance %s', async (status) => {
    arrange({ status, scheduledAt: past() });

    await expect(
      appointmentService.markAbsent(1, COACH_ID)
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'INVALID_STATUS' });
  });

  it('refuse à un coach de signaler l\'absence sur la séance d\'un confrère', async () => {
    arrange({ status: 'CONFIRMED', scheduledAt: past(), intervenantId: 999 });

    await expect(appointmentService.markAbsent(1, COACH_ID)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('renvoie 404 pour un rendez-vous inexistant', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);

    await expect(appointmentService.markAbsent(999, COACH_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('avertit le client, en lui indiquant la voie de contestation', async () => {
    arrange({ status: 'CONFIRMED', scheduledAt: past() });

    await appointmentService.markAbsent(1, COACH_ID);
    await new Promise(process.nextTick);

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: CLIENT_ID, type: 'ABSENCE_MARKED', body: expect.stringContaining('contester') }),
    });
  });
});

describe('appointment.service.openDispute — contestation par le client', () => {
  const disputable = { status: 'DONE', attendanceStatus: 'ABSENT', disputeStatus: null };

  it('ouvre le litige et horodate la contestation', async () => {
    arrange(disputable);

    await appointmentService.openDispute(1, CLIENT_ID, 'J\'étais bien présent, badge à l\'appui.');

    expect(prisma.appointment.update.mock.calls[0][0].data).toMatchObject({
      disputeStatus: 'OPEN',
      disputeReason: 'J\'étais bien présent, badge à l\'appui.',
      disputedAt: expect.any(Date),
    });
  });

  it.each([
    ['séance PRESENT',       { status: 'DONE', attendanceStatus: 'PRESENT' }],
    ['séance encore CONFIRMED', { status: 'CONFIRMED', attendanceStatus: null }],
    ['séance annulée',       { status: 'CANCELLED', attendanceStatus: null }],
  ])('refuse de contester une %s', async (_label, over) => {
    arrange(over);

    await expect(
      appointmentService.openDispute(1, CLIENT_ID, 'motif suffisamment long')
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'DISPUTE_NOT_ALLOWED' });
  });

  it('refuse un second litige sur la même séance', async () => {
    arrange({ ...disputable, disputeStatus: 'REJECTED' });

    await expect(
      appointmentService.openDispute(1, CLIENT_ID, 'motif suffisamment long')
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'DISPUTE_ALREADY_EXISTS' });
  });

  it('refuse à un client de contester la séance d\'un autre', async () => {
    arrange(disputable);

    await expect(appointmentService.openDispute(1, 999, 'motif suffisamment long')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('notifie tous les administrateurs actifs', async () => {
    arrange(disputable);
    prisma.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await appointmentService.openDispute(1, CLIENT_ID, 'motif suffisamment long');
    await new Promise(process.nextTick);

    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 1, type: 'DISPUTE_OPENED' }) });
  });
});

describe('appointment.service.resolveDispute — arbitrage administrateur', () => {
  const arrangeDispute = (over = {}) => {
    const appt = F.appointment({
      status: 'DONE', attendanceStatus: 'ABSENT', disputeStatus: 'OPEN',
      paymentStatus: 'paid', payment: F.payment(), ...over,
    });
    prisma.appointment.findUnique.mockResolvedValue(appt);
    prisma.appointment.update.mockImplementation(async ({ data }) => ({ ...appt, ...data }));
    getStripe().refunds.create.mockResolvedValue({ id: 're_dispute', status: 'succeeded' });
    return appt;
  };

  it('REJECTED : clôt le litige sans rembourser — les gains du coach sont dégelés', async () => {
    arrangeDispute();

    await appointmentService.resolveDispute(1, 'REJECTED');

    expect(getStripe().refunds.create).not.toHaveBeenCalled();
    expect(prisma.appointment.update.mock.calls[0][0].data).toMatchObject({ disputeStatus: 'REJECTED', disputeResolvedAt: expect.any(Date) });
    expect(prisma.appointment.update.mock.calls[0][0].data.paymentStatus).toBeUndefined();
  });

  it('RESOLVED_CLIENT : rembourse intégralement en reprenant part coach et commission', async () => {
    arrangeDispute();

    await appointmentService.resolveDispute(1, 'RESOLVED_CLIENT');

    expect(getStripe().refunds.create).toHaveBeenCalledWith({
      payment_intent: 'pi_test_123', amount: 5000, reverse_transfer: true, refund_application_fee: true,
    });
  });

  it('RESOLVED_CLIENT : bascule la séance en refunded (sortie des gains du coach)', async () => {
    arrangeDispute();

    await appointmentService.resolveDispute(1, 'RESOLVED_CLIENT');

    expect(prisma.appointment.update.mock.calls[0][0].data).toMatchObject({ disputeStatus: 'RESOLVED_CLIENT', paymentStatus: 'refunded' });
  });

  it('RESOLVED_CLIENT sans paiement : clôt le litige sans appeler Stripe', async () => {
    arrangeDispute({ paymentStatus: 'unpaid', payment: null });

    await appointmentService.resolveDispute(1, 'RESOLVED_CLIENT');

    expect(getStripe().refunds.create).not.toHaveBeenCalled();
    expect(prisma.appointment.update.mock.calls[0][0].data.paymentStatus).toBeUndefined();
  });

  it.each([null, 'REJECTED', 'RESOLVED_CLIENT'])('refuse d\'arbitrer un litige au statut %s', async (disputeStatus) => {
    arrangeDispute({ disputeStatus });

    await expect(
      appointmentService.resolveDispute(1, 'REJECTED')
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'DISPUTE_NOT_OPEN' });
  });

  it('renvoie 404 pour un rendez-vous inexistant', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);

    await expect(appointmentService.resolveDispute(999, 'REJECTED')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('informe le client ET le coach de l\'issue', async () => {
    arrangeDispute();

    await appointmentService.resolveDispute(1, 'RESOLVED_CLIENT');
    await new Promise(process.nextTick);

    const recipients = prisma.notification.create.mock.calls.map((c) => c[0].data.userId);
    expect(recipients).toEqual(expect.arrayContaining([CLIENT_ID, COACH_ID]));
  });

  it('adapte le message au sens de la décision', async () => {
    arrangeDispute();

    await appointmentService.resolveDispute(1, 'REJECTED');
    await new Promise(process.nextTick);

    const coachMessage = prisma.notification.create.mock.calls.find((c) => c[0].data.userId === COACH_ID)[0].data.body;
    expect(coachMessage).toContain('débloqués');
  });
});

describe('appointment.service.listDisputes — vue administrateur', () => {
  it('filtre sur les litiges ouverts par défaut', async () => {
    await appointmentService.listDisputes();

    expect(prisma.appointment.findMany.mock.calls[0][0].where).toEqual({ disputeStatus: 'OPEN' });
  });

  it('remonte tous les litiges avec le filtre ALL', async () => {
    await appointmentService.listDisputes({ status: 'ALL' });

    expect(prisma.appointment.findMany.mock.calls[0][0].where).toEqual({ disputeStatus: { not: null } });
  });
});
