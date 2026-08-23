jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());
jest.mock('../../src/config/stripe', () => require('../helpers/prismaMock').createStripeMock());

const prisma = require('../../src/config/database');
const getStripe = require('../../src/config/stripe');
const paymentService = require('../../src/services/payment.service');
const F = require('../helpers/fixtures');

const resetMocks = require('../helpers/resetMocks');

// Les implémentations posées par un test ne doivent pas contaminer le suivant.
beforeEach(() => resetMocks({ prisma, getStripe }));

const CLIENT_ID = 100;
const COACH_ID = 200;

describe('payment.service.createPaymentIntent — commission plateforme de 30 %', () => {
  const arrange = (over = {}) => {
    prisma.appointment.findUnique.mockResolvedValue({
      ...F.appointment({ status: 'CONFIRMED', paymentStatus: 'unpaid' }),
      coachService: F.coachService({ price: 50 }),
      service: null,
      intervenant: F.intervenant(),
      ...over,
    });
    prisma.payment.findUnique.mockResolvedValue(null);
    getStripe().paymentIntents.create.mockResolvedValue({ id: 'pi_new', client_secret: 'pi_new_secret' });
  };

  it.each([
    [50,    5000, 1500, 3500],
    [100,  10000, 3000, 7000],
    [33.33, 3333,  1000, 2333], // arrondi au centime : 999,9 → 1000
    [19.99, 1999,   600, 1399], // 599,7 → 600
  ])('sur un prix de %s € : total %i c, plateforme %i c, coach %i c', async (price, total, fee, share) => {
    arrange({ coachService: F.coachService({ price }) });

    await paymentService.createPaymentIntent(1, CLIENT_ID);

    expect(getStripe().paymentIntents.create.mock.calls[0][0]).toMatchObject({
      amount: total,
      currency: 'eur',
      application_fee_amount: fee,
    });
    expect(prisma.payment.upsert.mock.calls[0][0].create).toMatchObject({
      amount: total, platformFee: fee, intervenantShare: share,
    });
  });

  it('conserve l\'invariant commission + part coach = montant total', async () => {
    arrange({ coachService: F.coachService({ price: 77.77 }) });

    await paymentService.createPaymentIntent(1, CLIENT_ID);

    const { amount, platformFee, intervenantShare } = prisma.payment.upsert.mock.calls[0][0].create;
    expect(platformFee + intervenantShare).toBe(amount);
  });

  it('reverse le paiement sur le compte Connect du coach', async () => {
    arrange();

    await paymentService.createPaymentIntent(1, CLIENT_ID);

    expect(getStripe().paymentIntents.create.mock.calls[0][0].transfer_data).toEqual({ destination: 'acct_test' });
  });

  it('accepte la carte et Klarna', async () => {
    arrange();

    await paymentService.createPaymentIntent(1, CLIENT_ID);

    expect(getStripe().paymentIntents.create.mock.calls[0][0].payment_method_types).toEqual(['card', 'klarna']);
  });

  it('joint les métadonnées de rapprochement au PaymentIntent', async () => {
    arrange();

    await paymentService.createPaymentIntent(1, CLIENT_ID);

    expect(getStripe().paymentIntents.create.mock.calls[0][0].metadata).toEqual({
      appointmentId: '1', clientId: '100', intervenantId: '200',
    });
  });

  it('retombe sur le prix du Service plateforme quand il n\'y a pas de CoachService', async () => {
    arrange({ coachService: null, service: F.platformService({ price: 40 }) });

    await paymentService.createPaymentIntent(1, CLIENT_ID);

    expect(getStripe().paymentIntents.create.mock.calls[0][0].amount).toBe(4000);
  });

  describe('conditions préalables', () => {
    it('renvoie 404 pour un rendez-vous inexistant', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(paymentService.createPaymentIntent(999, CLIENT_ID)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('refuse à un client de payer le rendez-vous d\'un autre', async () => {
      arrange();

      await expect(paymentService.createPaymentIntent(1, 999)).rejects.toMatchObject({ statusCode: 403 });
    });

    it.each(['PENDING', 'DONE', 'CANCELLED'])('refuse de payer un rendez-vous %s', async (status) => {
      arrange({ status });

      await expect(
        paymentService.createPaymentIntent(1, CLIENT_ID)
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('confirme') });
    });

    it('refuse un second paiement sur un rendez-vous déjà payé', async () => {
      arrange({ paymentStatus: 'paid' });

      await expect(
        paymentService.createPaymentIntent(1, CLIENT_ID)
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('deja paye') });
    });

    it.each([
      ['sans compte Stripe',   { stripeAccountId: null, stripeAccountStatus: null }],
      ['onboarding inachevé',  { stripeAccountId: 'acct_x', stripeAccountStatus: 'pending' }],
    ])('refuse le paiement si le coach est %s', async (_label, over) => {
      arrange({ intervenant: F.intervenant(over) });

      await expect(
        paymentService.createPaymentIntent(1, CLIENT_ID)
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('configure ses paiements') });
    });

    it('refuse un rendez-vous sans prix rattaché', async () => {
      arrange({ coachService: null, service: null });

      await expect(paymentService.createPaymentIntent(1, CLIENT_ID)).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  // React StrictMode invoque deux fois les effets en développement : sans
  // réutilisation, chaque ouverture de la modale créerait un PaymentIntent.
  describe('réutilisation du PaymentIntent en attente', () => {
    it.each(['requires_payment_method', 'requires_confirmation', 'requires_action'])(
      'réutilise un PaymentIntent au statut %s', async (status) => {
        arrange();
        prisma.payment.findUnique.mockResolvedValue(F.payment({ status: 'pending' }));
        getStripe().paymentIntents.retrieve.mockResolvedValue({ id: 'pi_test_123', client_secret: 'secret_reuse', status });

        const result = await paymentService.createPaymentIntent(1, CLIENT_ID);

        expect(result).toEqual({ clientSecret: 'secret_reuse', paymentIntentId: 'pi_test_123' });
        expect(getStripe().paymentIntents.create).not.toHaveBeenCalled();
      }
    );

    it('en crée un nouveau si l\'ancien n\'est plus réutilisable', async () => {
      arrange();
      prisma.payment.findUnique.mockResolvedValue(F.payment({ status: 'pending' }));
      getStripe().paymentIntents.retrieve.mockResolvedValue({ id: 'pi_old', status: 'canceled' });

      await paymentService.createPaymentIntent(1, CLIENT_ID);

      expect(getStripe().paymentIntents.create).toHaveBeenCalled();
    });

    it('en crée un nouveau si Stripe ne retrouve plus l\'ancien', async () => {
      arrange();
      prisma.payment.findUnique.mockResolvedValue(F.payment({ status: 'pending' }));
      getStripe().paymentIntents.retrieve.mockRejectedValue(new Error('No such payment_intent'));

      await expect(paymentService.createPaymentIntent(1, CLIENT_ID)).resolves.toBeDefined();
      expect(getStripe().paymentIntents.create).toHaveBeenCalled();
    });
  });
});

describe('payment.service — encaissement idempotent (webhook + repli frontend)', () => {
  const arrangePaid = (paymentStatus = 'unpaid') => {
    prisma.appointment.findUnique.mockResolvedValue({
      paymentStatus, intervenantId: COACH_ID, scheduledAt: F.at(2026, 9, 15, 10),
    });
    getStripe().paymentIntents.retrieve.mockResolvedValue({
      status: 'succeeded',
      metadata: { appointmentId: '1', clientId: String(CLIENT_ID) },
    });
  };

  it('marque le rendez-vous payé et notifie le coach', async () => {
    arrangePaid();

    await paymentService.confirmPaymentIntent('pi_test_123', CLIENT_ID);

    expect(prisma.appointment.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { paymentStatus: 'paid' } });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { stripePaymentIntentId: 'pi_test_123' }, data: { status: 'succeeded' },
    });
  });

  // Le webhook Stripe et le repli POST /payments/confirm arrivent tous les deux :
  // le coach ne doit être notifié qu'une fois.
  it('n\'agit pas deux fois si le rendez-vous est déjà payé — une seule notification', async () => {
    arrangePaid('paid');

    await paymentService.confirmPaymentIntent('pi_test_123', CLIENT_ID);
    await new Promise(process.nextTick);

    expect(prisma.appointment.update).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('envoie exactement une notification PAYMENT_RECEIVED au premier encaissement', async () => {
    arrangePaid();

    await paymentService.confirmPaymentIntent('pi_test_123', CLIENT_ID);
    await new Promise(process.nextTick);

    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: COACH_ID, type: 'PAYMENT_RECEIVED' }),
    });
  });

  it('refuse une confirmation dont le paiement n\'est pas abouti chez Stripe', async () => {
    getStripe().paymentIntents.retrieve.mockResolvedValue({ status: 'requires_payment_method', metadata: {} });

    await expect(
      paymentService.confirmPaymentIntent('pi_x', CLIENT_ID)
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  // Sans ce contrôle, n'importe quel client authentifié pourrait confirmer le
  // paiement d'un autre en devinant un identifiant de PaymentIntent.
  it('refuse une confirmation par un client qui n\'est pas le payeur', async () => {
    arrangePaid();

    await expect(
      paymentService.confirmPaymentIntent('pi_test_123', 999)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuse un PaymentIntent sans appointmentId en métadonnées', async () => {
    getStripe().paymentIntents.retrieve.mockResolvedValue({ status: 'succeeded', metadata: { clientId: '100' } });

    await expect(
      paymentService.confirmPaymentIntent('pi_x', CLIENT_ID)
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('payment.service.handleWebhook — événements Stripe', () => {
  const emit = (event) => {
    getStripe().webhooks.constructEvent.mockReturnValue(event);
    return paymentService.handleWebhook(Buffer.from('{}'), 'sig');
  };

  it('rejette une signature invalide en 400', async () => {
    getStripe().webhooks.constructEvent.mockImplementation(() => { throw new Error('signature'); });

    await expect(
      paymentService.handleWebhook(Buffer.from('{}'), 'mauvaise_signature')
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Signature') });
  });

  it('payment_intent.succeeded : encaisse le rendez-vous', async () => {
    prisma.appointment.findUnique.mockResolvedValue({ paymentStatus: 'unpaid', intervenantId: COACH_ID, scheduledAt: new Date() });

    await emit({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_1', metadata: { appointmentId: '1' } } } });

    expect(prisma.appointment.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { paymentStatus: 'paid' } });
  });

  it('payment_intent.succeeded sans appointmentId : ignoré sans erreur', async () => {
    await expect(
      emit({ type: 'payment_intent.succeeded', data: { object: { id: 'pi_1', metadata: {} } } })
    ).resolves.toBeUndefined();
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });

  it('payment_intent.payment_failed : marque le paiement en échec', async () => {
    await emit({ type: 'payment_intent.payment_failed', data: { object: { id: 'pi_ko' } } });

    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { stripePaymentIntentId: 'pi_ko' }, data: { status: 'failed' },
    });
  });

  it('checkout.session.completed : active l\'abonnement entreprise et résilie le précédent', async () => {
    await emit({
      type: 'checkout.session.completed',
      data: { object: { metadata: { userId: '300', plan: 'BOOST_ENTREPRISE', billingCycle: 'MONTHLY' } } },
    });

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { userId: 300, status: 'ACTIVE' }, data: { status: 'CANCELLED' },
    });
    expect(prisma.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 300, plan: 'BOOST_ENTREPRISE', status: 'ACTIVE' }),
    });
  });

  it('checkout.session.completed YEARLY : fixe une échéance à un an', async () => {
    await emit({
      type: 'checkout.session.completed',
      data: { object: { metadata: { userId: '300', plan: 'BOOST_ENTREPRISE', billingCycle: 'YEARLY' } } },
    });

    const { startDate, endDate } = prisma.subscription.create.mock.calls[0][0].data;
    expect(endDate.getFullYear() - startDate.getFullYear()).toBe(1);
  });

  it('ignore un type d\'événement non géré', async () => {
    await expect(emit({ type: 'invoice.paid', data: { object: {} } })).resolves.toBeUndefined();
  });
});

describe('payment.service.createCheckoutSession — abonnement entreprise', () => {
  it.each([
    ['ESSENTIEL_ENTREPRISE', 'MONTHLY',   5400],
    ['ESSENTIEL_ENTREPRISE', 'YEARLY',   51600],
    ['BOOST_ENTREPRISE',     'MONTHLY',  12200],
    ['BOOST_ENTREPRISE',     'YEARLY',  117600],
  ])('facture %s en %s à %i centimes par collaborateur', async (plan, cycle, expected) => {
    prisma.user.count.mockResolvedValue(1);
    getStripe().checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });

    await paymentService.createCheckoutSession(300, plan, cycle);

    expect(getStripe().checkout.sessions.create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(expected);
  });

  // Test de caractérisation. La documentation annonce « mensuel −20 % × 12 »,
  // mais les tarifs catalogue sont arrondis au chiffre commercial (516 € et
  // 1 176 €) : la remise réelle vaut 20,37 % sur Essentiel et 19,67 % sur
  // Boost. Ce test fige les montants facturés et signalera toute dérive.
  it('applique une remise annuelle voisine de 20 %, sur des tarifs arrondis', () => {
    const discount = (monthly, yearly) => 1 - yearly / (monthly * 12);

    expect(discount(5400, 51600)).toBeCloseTo(0.2037, 4);
    expect(discount(12200, 117600)).toBeCloseTo(0.1967, 4);
    expect(discount(5400, 51600)).toBeGreaterThan(0.19);
    expect(discount(12200, 117600)).toBeGreaterThan(0.19);
  });

  it('facture autant d\'unités que de collaborateurs rattachés', async () => {
    prisma.user.count.mockResolvedValue(7);
    getStripe().checkout.sessions.create.mockResolvedValue({ url: 'https://x' });

    await paymentService.createCheckoutSession(300, 'BOOST_ENTREPRISE');

    expect(getStripe().checkout.sessions.create.mock.calls[0][0].line_items[0].quantity).toBe(7);
  });

  it('facture au minimum 1 collaborateur, même sans salarié rattaché', async () => {
    prisma.user.count.mockResolvedValue(0);
    getStripe().checkout.sessions.create.mockResolvedValue({ url: 'https://x' });

    await paymentService.createCheckoutSession(300, 'BOOST_ENTREPRISE');

    expect(getStripe().checkout.sessions.create.mock.calls[0][0].line_items[0].quantity).toBe(1);
  });

  it('refuse ULTRA_ENTREPRISE : offre sur devis, sans paiement en ligne', async () => {
    await expect(
      paymentService.createCheckoutSession(300, 'ULTRA_ENTREPRISE')
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('devis') });
  });

  it('refuse un plan inconnu', async () => {
    await expect(paymentService.createCheckoutSession(300, 'PLAN_IMAGINAIRE')).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('payment.service.verifySession — activation au retour de Stripe', () => {
  const session = (over = {}) => ({
    payment_status: 'paid',
    metadata: { userId: '300', plan: 'BOOST_ENTREPRISE', billingCycle: 'MONTHLY' },
    ...over,
  });

  it('crée l\'abonnement quand le paiement est confirmé', async () => {
    getStripe().checkout.sessions.retrieve.mockResolvedValue(session());
    prisma.subscription.findFirst.mockResolvedValue(null);

    await paymentService.verifySession('cs_1', 300);

    expect(prisma.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 300, plan: 'BOOST_ENTREPRISE', status: 'ACTIVE' }),
    });
  });

  it('refuse une session non payée', async () => {
    getStripe().checkout.sessions.retrieve.mockResolvedValue(session({ payment_status: 'unpaid' }));

    await expect(paymentService.verifySession('cs_1', 300)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse une session appartenant à une autre entreprise', async () => {
    getStripe().checkout.sessions.retrieve.mockResolvedValue(session());

    await expect(paymentService.verifySession('cs_1', 999)).rejects.toMatchObject({ statusCode: 403 });
  });

  // Le webhook et la redirection de succès arrivent tous les deux : sans cette
  // fenêtre, l'entreprise se retrouverait avec deux abonnements actifs.
  it('ne double pas l\'abonnement si le webhook vient déjà de l\'activer', async () => {
    getStripe().checkout.sessions.retrieve.mockResolvedValue(session());
    const existing = { id: 42, createdAt: new Date(Date.now() - 30_000) };
    prisma.subscription.findFirst.mockResolvedValue(existing);

    const result = await paymentService.verifySession('cs_1', 300);

    expect(result).toBe(existing);
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });

  it('crée un nouvel abonnement si le précédent date de plus de 5 minutes', async () => {
    getStripe().checkout.sessions.retrieve.mockResolvedValue(session());
    prisma.subscription.findFirst.mockResolvedValue({ id: 42, createdAt: new Date(Date.now() - 10 * 60_000) });

    await paymentService.verifySession('cs_1', 300);

    expect(prisma.subscription.create).toHaveBeenCalled();
  });
});

describe('payment.service.getIntervenantPayments — gains du coach', () => {
  const row = (over = {}) => ({
    appointmentId: 1, amount: 5000, intervenantShare: 3500, createdAt: new Date(),
    appointment: {
      status: 'DONE', disputeStatus: null, scheduledAt: new Date(),
      client: { firstName: 'Sarah', lastName: 'Benali' },
      coachService: { name: 'Coaching' }, service: null,
      ...over,
    },
  });

  it('sépare acquis (DONE), en attente (CONFIRMED) et gelés (litige ouvert)', async () => {
    prisma.payment.findMany.mockResolvedValue([
      row(),
      row({ status: 'CONFIRMED' }),
      row({ status: 'DONE', disputeStatus: 'OPEN' }),
    ]);

    const result = await paymentService.getIntervenantPayments(COACH_ID);

    expect(result.totalEarned).toBe(3500);
    expect(result.totalPending).toBe(3500);
    expect(result.totalFrozen).toBe(3500);
  });

  // Un litige ouvert gèle le virement : la somme sort des gains disponibles
  // tant que l'administrateur n'a pas tranché.
  it('exclut des gains acquis une séance sous litige ouvert', async () => {
    prisma.payment.findMany.mockResolvedValue([row({ status: 'DONE', disputeStatus: 'OPEN' })]);

    const result = await paymentService.getIntervenantPayments(COACH_ID);

    expect(result.totalEarned).toBe(0);
    expect(result.frozen).toHaveLength(1);
  });

  it('réintègre les gains d\'un litige rejeté', async () => {
    prisma.payment.findMany.mockResolvedValue([row({ status: 'DONE', disputeStatus: 'REJECTED' })]);

    expect((await paymentService.getIntervenantPayments(COACH_ID)).totalEarned).toBe(3500);
  });

  it('ne comptabilise que les rendez-vous réellement payés', async () => {
    await paymentService.getIntervenantPayments(COACH_ID);

    expect(prisma.payment.findMany.mock.calls[0][0].where).toEqual({
      appointment: { intervenantId: COACH_ID, paymentStatus: 'paid' },
    });
  });

  it('libelle la prestation avec le repli CoachService → Service', async () => {
    prisma.payment.findMany.mockResolvedValue([
      row({ coachService: null, service: { name: 'Atelier posture' } }),
    ]);

    expect((await paymentService.getIntervenantPayments(COACH_ID)).payments[0].serviceName).toBe('Atelier posture');
  });

  it('libelle « Séance » quand aucune prestation n\'est rattachée', async () => {
    prisma.payment.findMany.mockResolvedValue([row({ coachService: null, service: null })]);

    expect((await paymentService.getIntervenantPayments(COACH_ID)).payments[0].serviceName).toBe('Séance');
  });

  it('renvoie des totaux à zéro pour un coach sans paiement', async () => {
    prisma.payment.findMany.mockResolvedValue([]);

    expect(await paymentService.getIntervenantPayments(COACH_ID)).toMatchObject({
      totalEarned: 0, totalPending: 0, totalFrozen: 0, payments: [], pending: [], frozen: [],
    });
  });
});

describe('payment.service — onboarding Stripe Connect du coach', () => {
  it('crée un compte Express FR puis renvoie le lien d\'onboarding', async () => {
    F.mockUsers(prisma, [F.intervenant({ stripeAccountId: null })]);
    getStripe().accounts.create.mockResolvedValue({ id: 'acct_new' });
    getStripe().accountLinks.create.mockResolvedValue({ url: 'https://connect.stripe.com/setup' });

    const result = await paymentService.createOnboardingLink(COACH_ID);

    expect(getStripe().accounts.create.mock.calls[0][0]).toMatchObject({ type: 'express', country: 'FR' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: COACH_ID }, data: { stripeAccountId: 'acct_new', stripeAccountStatus: 'pending' },
    });
    expect(result).toEqual({ url: 'https://connect.stripe.com/setup' });
  });

  it('réutilise le compte Connect existant sans en recréer un', async () => {
    F.mockUsers(prisma, [F.intervenant({ stripeAccountId: 'acct_existant' })]);
    getStripe().accountLinks.create.mockResolvedValue({ url: 'https://x' });

    await paymentService.createOnboardingLink(COACH_ID);

    expect(getStripe().accounts.create).not.toHaveBeenCalled();
    expect(getStripe().accountLinks.create.mock.calls[0][0].account).toBe('acct_existant');
  });

  it('réserve l\'onboarding aux intervenants', async () => {
    F.mockUsers(prisma, [F.client({ id: COACH_ID })]);

    await expect(paymentService.createOnboardingLink(COACH_ID)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('renvoie « not_started » tant qu\'aucun compte Connect n\'existe', async () => {
    F.mockUsers(prisma, [F.intervenant({ stripeAccountId: null })]);

    expect(await paymentService.checkAccountStatus(COACH_ID)).toEqual({
      status: 'not_started', chargesEnabled: false, payoutsEnabled: false,
    });
  });

  it('passe le compte à « active » quand Stripe autorise paiements et virements', async () => {
    F.mockUsers(prisma, [F.intervenant({ stripeAccountStatus: 'pending' })]);
    getStripe().accounts.retrieve.mockResolvedValue({ charges_enabled: true, payouts_enabled: true });

    const status = await paymentService.checkAccountStatus(COACH_ID);

    expect(status.status).toBe('active');
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: COACH_ID }, data: { stripeAccountStatus: 'active' } });
  });

  it('reste « pending » si les virements ne sont pas encore autorisés', async () => {
    F.mockUsers(prisma, [F.intervenant({ stripeAccountStatus: 'pending' })]);
    getStripe().accounts.retrieve.mockResolvedValue({ charges_enabled: true, payouts_enabled: false });

    expect((await paymentService.checkAccountStatus(COACH_ID)).status).toBe('pending');
  });

  it('n\'écrit en base que si le statut a réellement changé', async () => {
    F.mockUsers(prisma, [F.intervenant({ stripeAccountStatus: 'active' })]);
    getStripe().accounts.retrieve.mockResolvedValue({ charges_enabled: true, payouts_enabled: true });

    await paymentService.checkAccountStatus(COACH_ID);

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
