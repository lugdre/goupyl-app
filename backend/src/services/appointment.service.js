const prisma = require('../config/database');
const ApiError = require('../utils/apiError');
const getStripe = require('../config/stripe');
const notificationService = require('./notification.service');

const CANCELLATION_WINDOW_HOURS = 48;
// Répartition sur annulation : 35% remboursé client, 30% coach, 35% plateforme
const CANCEL_REFUND_RATE     = 0.35;
const CANCEL_COACH_RATE      = 0.30;

const create = async (clientId, { intervenantId, serviceId, coachServiceId, scheduledAt, notes }) => {
  const intervenant = await prisma.user.findUnique({ where: { id: intervenantId } });
  if (!intervenant || intervenant.role !== 'INTERVENANT') {
    throw ApiError.notFound('Intervenant non trouve.');
  }

  let durationMinutes;
  let resolvedServiceId = null;
  let resolvedCoachServiceId = null;

  if (coachServiceId) {
    // B2C flow — coach's own service
    const coachService = await prisma.coachService.findUnique({ where: { id: coachServiceId } });
    if (!coachService || !coachService.active) throw ApiError.notFound('Service non trouve ou inactif.');
    if (coachService.intervenantId !== intervenantId) throw ApiError.badRequest("Ce service n'appartient pas a cet intervenant.");
    durationMinutes = coachService.durationMinutes;
    resolvedCoachServiceId = coachServiceId;
  } else if (serviceId) {
    // B2B flow — global platform service
    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service || !service.isActive) throw ApiError.notFound('Service non trouve ou inactif.');

    // Vérification forfait pour les salariés d'entreprise
    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: { employerCompanyId: true },
    });
    if (client?.employerCompanyId) {
      const employer = await prisma.user.findUnique({
        where: { id: client.employerCompanyId },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
      });
      const activeSub = employer?.subscriptions?.[0];
      if (!activeSub) {
        throw ApiError.forbidden("Votre entreprise n'a pas d'abonnement actif.");
      }
      const availablePlans = Array.isArray(service.availableInPlans) ? service.availableInPlans : [];
      if (availablePlans.length > 0 && !availablePlans.includes(activeSub.plan)) {
        throw ApiError.forbidden("Ce service n'est pas inclus dans le forfait de votre entreprise.", 'SERVICE_NOT_IN_PLAN');
      }
    }

    durationMinutes = service.durationMinutes;
    resolvedServiceId = serviceId;
  } else {
    throw ApiError.badRequest('Un serviceId ou coachServiceId est requis.');
  }

  const startTime = new Date(scheduledAt);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  // Business hours: 07:00 → 21:00 local time (Europe/Paris implicit via server TZ)
  const startHour = startTime.getHours();
  const endHour = endTime.getHours() + (endTime.getMinutes() > 0 ? 1 : 0);
  if (startHour < 7 || endHour > 21) {
    throw ApiError.badRequest(
      'Les rendez-vous doivent être entre 07h00 et 21h00.',
      'OUT_OF_BUSINESS_HOURS'
    );
  }

  // Overlap detection: existing.start < new.end AND existing.end > new.start
  const [intervenantBusy, clientBusy] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        intervenantId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { lt: endTime },
      },
      select: { scheduledAt: true, durationMinutes: true },
    }),
    prisma.appointment.findMany({
      where: {
        clientId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: { lt: endTime },
      },
      select: { scheduledAt: true, durationMinutes: true },
    }),
  ]);

  const overlaps = (appts) =>
    appts.some((a) => {
      const aEnd = new Date(a.scheduledAt.getTime() + a.durationMinutes * 60 * 1000);
      return aEnd > startTime;
    });

  if (overlaps(intervenantBusy)) throw ApiError.conflict("Ce creneau n'est plus disponible.", 'SLOT_CONFLICT');
  if (overlaps(clientBusy)) throw ApiError.conflict('Vous avez déjà un rendez-vous sur ce créneau.', 'CLIENT_SLOT_CONFLICT');

  const created = await prisma.appointment.create({
    data: {
      clientId,
      intervenantId,
      serviceId: resolvedServiceId,
      coachServiceId: resolvedCoachServiceId,
      scheduledAt: startTime,
      durationMinutes,
      status: 'PENDING',
      notes,
    },
    include: {
      service: { select: { name: true, category: true, price: true } },
      coachService: { select: { name: true, price: true, durationMinutes: true, category: true } },
      intervenant: { select: { firstName: true, lastName: true } },
      client: { select: { firstName: true, lastName: true, employerCompanyId: true, employerCompany: { select: { companyName: true } } } },
    },
  });

  // Notification B2B au coach si le client est un salarié d'entreprise
  if (created.client.employerCompanyId) {
    const companyName = created.client.employerCompany?.companyName || 'une entreprise partenaire';
    notificationService.create(intervenantId, {
      type: 'APPOINTMENT_B2B',
      title: 'Réservation entreprise',
      body: `La séance avec ${created.client.firstName} ${created.client.lastName} est prise en charge par ${companyName}. Le virement vous sera versé par Goupyl Sport.`,
    }).catch(() => {});
  }

  return created;
};

const getMyAppointments = async (userId, role, { page = 1, limit = 10, status }) => {
  const where = role === 'CLIENT' ? { clientId: userId } : { intervenantId: userId };
  if (status) where.status = status;

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        service: { select: { name: true, category: true, price: true } },
        coachService: { select: { name: true, price: true, durationMinutes: true, category: true } },
        intervenant: { select: { id: true, firstName: true, lastName: true } },
        client: { select: { id: true, firstName: true, lastName: true, employerCompanyId: true, employerCompany: { select: { companyName: true } } } },
        sessionReport: { select: { id: true } },
        review: { select: { id: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.appointment.count({ where }),
  ]);

  return {
    appointments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

const getAll = async ({ page = 1, limit = 20 }) => {
  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      include: {
        service: { select: { name: true, category: true } },
        coachService: { select: { name: true, category: true } },
        intervenant: { select: { firstName: true, lastName: true } },
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.appointment.count(),
  ]);
  return {
    appointments,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

const updateStatus = async (appointmentId, userId, role, newStatus, cancelReason) => {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw ApiError.notFound('Rendez-vous non trouve.');

  if (role === 'INTERVENANT' && appointment.intervenantId !== userId) throw ApiError.forbidden('Acces refuse.');
  if (role === 'CLIENT' && appointment.clientId !== userId) throw ApiError.forbidden('Acces refuse.');

  const validTransitions = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['DONE', 'CANCELLED'],
    DONE: [],
    CANCELLED: [],
  };

  if (!validTransitions[appointment.status].includes(newStatus)) {
    throw ApiError.badRequest(
      `Transition "${appointment.status}" vers "${newStatus}" invalide.`,
      'INVALID_STATUS_TRANSITION'
    );
  }
  if (role === 'CLIENT' && newStatus !== 'CANCELLED') {
    throw ApiError.forbidden("Les clients ne peuvent qu'annuler un RDV.");
  }

  // Payment gate: CONFIRMED → DONE requires payment (sauf pour les salariés d'entreprise)
  if (appointment.status === 'CONFIRMED' && newStatus === 'DONE') {
    const clientUser = await prisma.user.findUnique({
      where: { id: appointment.clientId },
      select: { employerCompanyId: true },
    });
    const isB2B = clientUser?.employerCompanyId != null;
    if (!isB2B && appointment.paymentStatus !== 'paid') {
      throw ApiError.badRequest(
        'Le paiement doit être effectué avant de clôturer la séance.',
        'PAYMENT_REQUIRED'
      );
    }
  }

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: newStatus,
      ...(cancelReason && { cancelReason, cancelledBy: role.toLowerCase() }),
    },
    include: {
      service: { select: { name: true, category: true } },
      intervenant: { select: { firstName: true, lastName: true } },
      client: { select: { firstName: true, lastName: true } },
    },
  });
};

const getBusySlots = async (intervenantId, from, to) => {
  const fromDate = from ? new Date(from) : new Date();
  const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 14 * 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      intervenantId: parseInt(intervenantId),
      status: { in: ['PENDING', 'CONFIRMED'] },
      scheduledAt: { gte: fromDate, lt: toDate },
    },
    select: { scheduledAt: true, durationMinutes: true },
    orderBy: { scheduledAt: 'asc' },
  });

  return appointments.map((a) => ({
    start: a.scheduledAt.toISOString(),
    end: new Date(a.scheduledAt.getTime() + a.durationMinutes * 60 * 1000).toISOString(),
  }));
};

const cancelAppointment = async (appointmentId, clientId, reason) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { payment: true },
  });

  if (!appointment) throw ApiError.notFound('Rendez-vous non trouvé.');
  if (appointment.clientId !== clientId) throw ApiError.forbidden('Accès refusé.');
  if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
    throw ApiError.badRequest('Ce rendez-vous ne peut plus être annulé.', 'INVALID_STATUS');
  }

  const hoursUntil = (new Date(appointment.scheduledAt).getTime() - Date.now()) / 3_600_000;
  if (hoursUntil < CANCELLATION_WINDOW_HOURS) {
    throw ApiError.badRequest(
      "L'annulation n'est plus possible moins de 48h avant la séance.",
      'CANCELLATION_TOO_LATE'
    );
  }

  // ── Remboursement Stripe partiel (35 %) si déjà payé ──────────────────
  let refundInfo = null;
  if (appointment.paymentStatus === 'paid' && appointment.payment) {
    const { payment } = appointment;
    const refundAmount   = Math.round(payment.amount * CANCEL_REFUND_RATE);
    const coachRetains   = Math.round(payment.amount * CANCEL_COACH_RATE);
    const platformRetains = payment.amount - refundAmount - coachRetains;

    try {
      const refund = await getStripe().refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: refundAmount,
      });

      await prisma.payment.update({
        where: { appointmentId },
        data: {
          refundAmount,
          refundStripeId: refund.id,
          refundStatus: refund.status,
        },
      });

      refundInfo = { refundAmount, coachRetains, platformRetains, stripeRefundId: refund.id };
    } catch (err) {
      // Ne bloque pas l'annulation — traitement manuel possible
      console.error('[cancel] Stripe refund failed:', err.message);
      refundInfo = { refundAmount: Math.round(payment.amount * CANCEL_REFUND_RATE), stripeError: err.message };
    }
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: 'CANCELLED',
      cancelledBy: 'client',
      cancelReason: reason || 'Annulé par le client',
    },
  });

  // Notification au coach
  try {
    await notificationService.create(appointment.intervenantId, {
      type: 'APPOINTMENT_CANCELLED',
      title: 'Rendez-vous annulé',
      body: `Un client a annulé sa séance du ${new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.`,
    });
  } catch { /* non bloquant */ }

  return { success: true, refund: refundInfo };
};

const getMyBusySlots = async (userId, from, to) => {
  const fromDate = from ? new Date(from) : new Date();
  const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 14 * 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      clientId: userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      scheduledAt: { gte: fromDate, lt: toDate },
    },
    select: { scheduledAt: true, durationMinutes: true },
    orderBy: { scheduledAt: 'asc' },
  });

  return appointments.map((a) => ({
    start: a.scheduledAt.toISOString(),
    end: new Date(a.scheduledAt.getTime() + a.durationMinutes * 60 * 1000).toISOString(),
  }));
};

module.exports = { create, getMyAppointments, getAll, updateStatus, getBusySlots, getMyBusySlots, cancelAppointment };
