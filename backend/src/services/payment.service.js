const getStripe = require('../config/stripe');
const prisma = require('../config/database');
const ApiError = require('../utils/apiError');

// Montants en centimes (€ × 100), facturés PAR COLLABORATEUR / mois.
// YEARLY = tarif mensuel remisé -20% × 12 (montant annuel par collaborateur).
// Ultra (ULTRA_ENTREPRISE) est sur devis : aucun paiement en ligne.
const PLAN_PRICES = {
  ESSENTIEL_ENTREPRISE: { MONTHLY:  5400, YEARLY:  51600 },
  BOOST_ENTREPRISE:     { MONTHLY: 12200, YEARLY: 117600 },
};

const PLAN_NAMES = {
  ESSENTIEL_ENTREPRISE: 'Essentiel',
  BOOST_ENTREPRISE:     'Boost',
};

// ─── Entreprise subscription checkout (existing) ───────────────────────

const createCheckoutSession = async (userId, plan, billingCycle = 'MONTHLY') => {
  if (!PLAN_PRICES[plan]) throw ApiError.badRequest('Plan invalide ou sur devis.');

  const unitAmount = PLAN_PRICES[plan][billingCycle];
  const label = billingCycle === 'YEARLY' ? 'Annuel' : 'Mensuel';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Facturation par collaborateur : quantité = collaborateurs rattachés (min. 1).
  const employeeCount = await prisma.user.count({
    where: { employerCompanyId: userId, role: 'CLIENT' },
  });
  const quantity = Math.max(employeeCount, 1);

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: `${PLAN_NAMES[plan]} — ${label} · ${quantity} collaborateur(s)` },
          unit_amount: unitAmount,
        },
        quantity,
      },
    ],
    metadata: {
      userId: String(userId),
      plan,
      billingCycle,
    },
    success_url: `${frontendUrl}/dashboard/entreprise/subscription?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${frontendUrl}/dashboard/entreprise/subscription?payment=cancelled`,
  });

  return { url: session.url };
};

const verifySession = async (sessionId, userId) => {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    throw ApiError.badRequest('Le paiement n\'est pas complété.');
  }

  if (session.metadata?.userId !== String(userId)) {
    throw ApiError.forbidden('Session invalide.');
  }

  const { plan, billingCycle } = session.metadata;

  const active = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE', plan, billingCycle },
    orderBy: { createdAt: 'desc' },
  });
  if (active && new Date() - new Date(active.createdAt) < 5 * 60 * 1000) {
    return active;
  }

  await prisma.subscription.updateMany({
    where: { userId, status: 'ACTIVE' },
    data: { status: 'CANCELLED' },
  });

  const startDate = new Date();
  const endDate = new Date();
  if (billingCycle === 'YEARLY') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  return prisma.subscription.create({
    data: { userId, plan, billingCycle, startDate, endDate, status: 'ACTIVE' },
  });
};

// ─── Stripe Connect — Intervenant onboarding ──────────────────────────

const createOnboardingLink = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Utilisateur non trouve.');
  if (user.role !== 'INTERVENANT') throw ApiError.forbidden('Seuls les intervenants peuvent configurer les paiements.');

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  let accountId = user.stripeAccountId;

  // Create a Connect Express account if one doesn't exist yet
  if (!accountId) {
    const account = await getStripe().accounts.create({
      type: 'express',
      country: 'FR',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      individual: {
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
      },
    });
    accountId = account.id;

    await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId: accountId, stripeAccountStatus: 'pending' },
    });
  }

  // Generate an account link for onboarding / updating info
  const accountLink = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: `${frontendUrl}/dashboard/intervenant/payments`,
    return_url: `${frontendUrl}/dashboard/intervenant/payments?onboarding=complete`,
    type: 'account_onboarding',
  });

  return { url: accountLink.url };
};

const checkAccountStatus = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('Utilisateur non trouve.');
  if (!user.stripeAccountId) {
    return { status: 'not_started', chargesEnabled: false, payoutsEnabled: false };
  }

  const account = await getStripe().accounts.retrieve(user.stripeAccountId);
  const chargesEnabled = account.charges_enabled;
  const payoutsEnabled = account.payouts_enabled;

  // Update local status if Stripe says the account is fully active
  const newStatus = chargesEnabled && payoutsEnabled ? 'active' : 'pending';
  if (user.stripeAccountStatus !== newStatus) {
    await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountStatus: newStatus },
    });
  }

  return { status: newStatus, chargesEnabled, payoutsEnabled };
};

// ─── Stripe Connect — Payment Intent (CLIENT pays for appointment) ────

const PLATFORM_FEE_PERCENT = 0.30; // 30% platform fee

const createPaymentIntent = async (appointmentId, clientId) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: true, coachService: true, intervenant: true },
  });

  if (!appointment) throw ApiError.notFound('Rendez-vous non trouve.');
  if (appointment.clientId !== clientId) throw ApiError.forbidden('Ce rendez-vous ne vous appartient pas.');
  if (appointment.status !== 'CONFIRMED') throw ApiError.badRequest('Le rendez-vous doit etre confirme avant le paiement.');
  if (appointment.paymentStatus === 'paid') throw ApiError.badRequest('Ce rendez-vous est deja paye.');

  const intervenant = appointment.intervenant;
  if (!intervenant.stripeAccountId || intervenant.stripeAccountStatus !== 'active') {
    throw ApiError.badRequest('L\'intervenant n\'a pas encore configure ses paiements.');
  }

  // Calculate amounts in cents
  const price = appointment.coachService ? appointment.coachService.price : appointment.service?.price;
  if (!price) throw ApiError.badRequest('Aucun prix associe a ce rendez-vous.');
  const priceInCents = Math.round(Number(price) * 100);
  const platformFee = Math.round(priceInCents * PLATFORM_FEE_PERCENT);
  const intervenantShare = priceInCents - platformFee;

  // Reuse existing pending PaymentIntent (avoids duplicate on React StrictMode double-invoke)
  const existingPayment = await prisma.payment.findUnique({ where: { appointmentId } });
  if (existingPayment && existingPayment.status === 'pending') {
    try {
      const existingPI = await getStripe().paymentIntents.retrieve(existingPayment.stripePaymentIntentId);
      if (['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(existingPI.status)) {
        return { clientSecret: existingPI.client_secret, paymentIntentId: existingPI.id };
      }
    } catch { /* fall through to create new */ }
  }

  // Create PaymentIntent with automatic transfer to the intervenant
  const paymentIntent = await getStripe().paymentIntents.create({
    amount: priceInCents,
    currency: 'eur',
    payment_method_types: ['card', 'klarna'],
    application_fee_amount: platformFee,
    transfer_data: {
      destination: intervenant.stripeAccountId,
    },
    metadata: {
      appointmentId: String(appointmentId),
      clientId: String(clientId),
      intervenantId: String(intervenant.id),
    },
  });

  // Upsert payment record
  await prisma.payment.upsert({
    where: { appointmentId },
    update: {
      stripePaymentIntentId: paymentIntent.id,
      amount: priceInCents,
      platformFee,
      intervenantShare,
      status: 'pending',
    },
    create: {
      appointmentId,
      stripePaymentIntentId: paymentIntent.id,
      amount: priceInCents,
      platformFee,
      intervenantShare,
      currency: 'eur',
      status: 'pending',
    },
  });

  return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
};

// ─── Webhook handler ───────────────────────────────────────────────────

const handleWebhook = async (rawBody, signature) => {
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    throw ApiError.badRequest('Signature webhook invalide.');
  }

  switch (event.type) {
    // Entreprise subscription checkout
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, plan, billingCycle } = session.metadata;

      if (userId && plan && billingCycle) {
        await prisma.subscription.updateMany({
          where: { userId: parseInt(userId), status: 'ACTIVE' },
          data: { status: 'CANCELLED' },
        });

        const startDate = new Date();
        const endDate = new Date();
        if (billingCycle === 'YEARLY') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + 1);
        }

        await prisma.subscription.create({
          data: { userId: parseInt(userId), plan, billingCycle, startDate, endDate, status: 'ACTIVE' },
        });
      }
      break;
    }

    // Marketplace payment succeeded
    case 'payment_intent.succeeded': {
      const pi = event.data.object;
      const { appointmentId } = pi.metadata;
      if (appointmentId) {
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: pi.id },
          data: { status: 'succeeded' },
        });
        await prisma.appointment.update({
          where: { id: parseInt(appointmentId) },
          data: { paymentStatus: 'paid' },
        });
      }
      break;
    }

    // Marketplace payment failed
    case 'payment_intent.payment_failed': {
      const pi = event.data.object;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: pi.id },
        data: { status: 'failed' },
      });
      break;
    }

    default:
      break;
  }
};

// ─── Confirmation directe (sans webhook) ───────────────────────────────
// Appelé par le frontend après stripe.confirmPayment() réussi

const confirmPaymentIntent = async (paymentIntentId, clientId) => {
  const pi = await getStripe().paymentIntents.retrieve(paymentIntentId);

  if (pi.status !== 'succeeded') {
    throw ApiError.badRequest('Le paiement n\'est pas encore validé par Stripe.');
  }

  if (String(pi.metadata?.clientId) !== String(clientId)) {
    throw ApiError.forbidden('Accès refusé.');
  }

  const appointmentId = parseInt(pi.metadata?.appointmentId);
  if (!appointmentId) throw ApiError.badRequest('Métadonnées de paiement invalides.');

  await prisma.payment.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { status: 'succeeded' },
  });

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { paymentStatus: 'paid' },
  });

  return { success: true };
};

// ─── Query helpers ─────────────────────────────────────────────────────

const getPaymentByAppointment = async (appointmentId) => {
  const payment = await prisma.payment.findUnique({
    where: { appointmentId },
    include: { appointment: { include: { service: true, intervenant: true, client: true } } },
  });
  return payment;
};

// ─── Intervenant earnings ─────────────────────────────────────────────

const getIntervenantPayments = async (intervenantId) => {
  // Source de vérité : appointment.paymentStatus === 'paid'
  // (indépendant de Payment.status qui peut rester 'pending' en cas d'échec de confirmPayment)
  const all = await prisma.payment.findMany({
    where: { appointment: { intervenantId, paymentStatus: 'paid' } },
    include: {
      appointment: {
        include: {
          service: { select: { name: true } },
          coachService: { select: { name: true } },
          client: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const done    = all.filter((p) => p.appointment.status === 'DONE');
  const pending = all.filter((p) => p.appointment.status === 'CONFIRMED');

  const toRow = (p) => ({
    appointmentId: p.appointmentId,
    date: p.appointment.scheduledAt,
    clientName: `${p.appointment.client.firstName} ${p.appointment.client.lastName}`,
    serviceName: p.appointment.coachService?.name || p.appointment.service?.name || 'Séance',
    amount: p.amount,
    intervenantShare: p.intervenantShare,
    createdAt: p.createdAt,
  });

  return {
    payments: done.map(toRow),
    pending: pending.map(toRow),
    totalEarned: done.reduce((s, p) => s + p.intervenantShare, 0),
    totalPending: pending.reduce((s, p) => s + p.intervenantShare, 0),
  };
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  verifySession,
  createOnboardingLink,
  checkAccountStatus,
  createPaymentIntent,
  confirmPaymentIntent,
  getPaymentByAppointment,
  getIntervenantPayments,
};
