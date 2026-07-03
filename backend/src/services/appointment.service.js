const { randomUUID } = require('crypto');
const prisma = require('../config/database');
const ApiError = require('../utils/apiError');
const getStripe = require('../config/stripe');
const notificationService = require('./notification.service');
const { PLAN_LIMITS, countCoveredSessions } = require('./company.service');

// ── Annulation dégressive ──────────────────────────────────────────────
// ≥ 7 jours : remboursement intégral ; entre 48h et 7 jours : 50% remboursé
// (le reste est repris au prorata 70/30 par Stripe : 35% coach, 15% plateforme) ;
// < 48h : annulation possible mais aucun remboursement.
const FULL_REFUND_HOURS    = 7 * 24;
const PARTIAL_REFUND_HOURS = 48;
const PARTIAL_REFUND_RATE  = 0.50;

// Un RDV PENDING non confirmé expire au bout de 24h (ou dès que l'heure de
// la séance est passée) pour ne pas verrouiller le créneau indéfiniment.
const PENDING_TTL_HOURS = 24;

// Filtre des RDV qui occupent réellement un créneau : les PENDING périmés
// (pas encore balayés par le sweep) libèrent le créneau immédiatement.
const activeAppointmentFilter = () => ({
  OR: [
    { status: 'CONFIRMED' },
    {
      status: 'PENDING',
      createdAt: { gte: new Date(Date.now() - PENDING_TTL_HOURS * 3_600_000) },
      scheduledAt: { gte: new Date() },
    },
  ],
});

// L'audit ne doit jamais faire échouer la transition
const logStatus = (appointmentId, fromStatus, toStatus, changedBy) =>
  prisma.appointmentStatusHistory
    .create({ data: { appointmentId, fromStatus, toStatus, changedBy } })
    .catch(() => {});

const create = async (clientId, { intervenantId, serviceId, coachServiceId, scheduledAt, notes }) => {
  const intervenant = await prisma.user.findUnique({ where: { id: intervenantId } });
  if (!intervenant || intervenant.role !== 'INTERVENANT') {
    throw ApiError.notFound('Intervenant non trouve.');
  }

  let durationMinutes;
  let resolvedServiceId = null;
  let resolvedCoachServiceId = null;
  let coveredByCompany = false;

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

      // Quota mensuel par collaborateur, compté sur le mois calendaire de la
      // séance demandée (réserver en août ne consomme pas le quota de juillet)
      const quota = PLAN_LIMITS[activeSub.plan]?.maxSessions;
      if (quota != null) {
        const used = await countCoveredSessions(clientId, new Date(scheduledAt));
        if (used >= quota) {
          throw ApiError.forbidden(
            `Quota mensuel atteint (${quota} séances couvertes par votre entreprise). Vous pouvez réserver une séance à titre personnel.`,
            'QUOTA_EXHAUSTED'
          );
        }
      }
      coveredByCompany = true;
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
        ...activeAppointmentFilter(),
        scheduledAt: { lt: endTime },
      },
      select: { scheduledAt: true, durationMinutes: true },
    }),
    prisma.appointment.findMany({
      where: {
        clientId,
        ...activeAppointmentFilter(),
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
      coveredByCompany,
      qrToken: randomUUID(),
    },
    include: {
      service: { select: { name: true, category: true, price: true } },
      coachService: { select: { name: true, price: true, durationMinutes: true, category: true } },
      intervenant: { select: { firstName: true, lastName: true } },
      client: { select: { firstName: true, lastName: true, employerCompanyId: true, employerCompany: { select: { companyName: true } } } },
    },
  });

  logStatus(created.id, null, 'PENDING', 'client');

  // Notification B2B au coach si la séance est couverte par l'entreprise
  if (created.coveredByCompany) {
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
  // Les annulations client passent exclusivement par POST /:id/cancel
  // (politique de remboursement dégressive) — jamais par ce chemin générique.
  if (role === 'CLIENT') {
    throw ApiError.forbidden("Utilisez la procédure d'annulation dédiée.", 'USE_CANCEL_ENDPOINT');
  }

  // Payment gate: CONFIRMED → DONE requires payment (sauf séances couvertes par l'entreprise)
  if (appointment.status === 'CONFIRMED' && newStatus === 'DONE') {
    if (!appointment.coveredByCompany && appointment.paymentStatus !== 'paid') {
      throw ApiError.badRequest(
        'Le paiement doit être effectué avant de clôturer la séance.',
        'PAYMENT_REQUIRED'
      );
    }
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: newStatus,
      ...(newStatus === 'DONE' && { attendanceStatus: 'PRESENT' }),
      ...(cancelReason && { cancelReason, cancelledBy: role.toLowerCase() }),
    },
    include: {
      service: { select: { name: true, category: true } },
      intervenant: { select: { firstName: true, lastName: true } },
      client: { select: { firstName: true, lastName: true } },
    },
  });

  logStatus(appointmentId, appointment.status, newStatus, role.toLowerCase());

  if (appointment.status === 'PENDING' && newStatus === 'CONFIRMED') {
    notificationService.create(appointment.clientId, {
      type: 'APPOINTMENT_CONFIRMED',
      title: 'Rendez-vous confirmé',
      body: `Votre séance du ${new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} a été confirmée par le professionnel.`,
    }).catch(() => {});
  }

  return updated;
};

const getBusySlots = async (intervenantId, from, to) => {
  const fromDate = from ? new Date(from) : new Date();
  const toDate = to ? new Date(to) : new Date(fromDate.getTime() + 14 * 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      intervenantId: parseInt(intervenantId),
      ...activeAppointmentFilter(),
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

  // ── Politique dégressive ───────────────────────────────────────────────
  const hoursUntil = (new Date(appointment.scheduledAt).getTime() - Date.now()) / 3_600_000;
  let tier = 'NONE';
  let refundRate = 0;
  if (hoursUntil >= FULL_REFUND_HOURS) {
    tier = 'FULL';
    refundRate = 1;
  } else if (hoursUntil >= PARTIAL_REFUND_HOURS) {
    tier = 'PARTIAL';
    refundRate = PARTIAL_REFUND_RATE;
  }

  let refundInfo = { tier, refundRate, refundAmount: 0 };
  if (appointment.paymentStatus === 'paid' && appointment.payment && refundRate > 0) {
    const { payment } = appointment;
    const refundAmount = Math.round(payment.amount * refundRate);

    try {
      // reverse_transfer + refund_application_fee : Stripe reprend la part du
      // coach (70%) et la commission plateforme (30%) au prorata du montant remboursé
      const refund = await getStripe().refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: refundAmount,
        reverse_transfer: true,
        refund_application_fee: true,
      });

      await prisma.payment.update({
        where: { appointmentId },
        data: {
          refundAmount,
          refundStripeId: refund.id,
          refundStatus: refund.status,
        },
      });

      refundInfo = {
        tier,
        refundRate,
        refundAmount,
        coachRetains: Math.round(payment.intervenantShare * (1 - refundRate)),
        platformRetains: Math.round(payment.platformFee * (1 - refundRate)),
        stripeRefundId: refund.id,
      };
    } catch (err) {
      // Ne bloque pas l'annulation — traitement manuel possible
      console.error('[cancel] Stripe refund failed:', err.message);
      refundInfo = { tier, refundRate, refundAmount, stripeError: err.message };
    }
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: 'CANCELLED',
      cancelledBy: 'client',
      cancelReason: reason || 'Annulé par le client',
      // Remboursement intégral → le paiement sort des gains du coach
      ...(refundInfo.stripeRefundId && refundRate === 1 && { paymentStatus: 'refunded' }),
    },
  });

  logStatus(appointmentId, appointment.status, 'CANCELLED', 'client');

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
      ...activeAppointmentFilter(),
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

// ── Validation de séance par QR code ─────────────────────────────────────
// code = uuid complet (scan caméra) ou les 8 premiers caractères (saisie manuelle)
const validateQr = async (intervenantId, rawCode) => {
  const code = String(rawCode || '').trim().toLowerCase();
  if (code.length < 8) throw ApiError.badRequest('Code invalide.', 'QR_INVALID_CODE');

  let appointment;
  if (code.length >= 36) {
    appointment = await prisma.appointment.findUnique({ where: { qrToken: code } });
  } else {
    appointment = await prisma.appointment.findFirst({
      where: { intervenantId, status: 'CONFIRMED', qrToken: { startsWith: code } },
    });
  }

  if (!appointment) throw ApiError.notFound('Aucune séance trouvée pour ce code.', 'QR_NOT_FOUND');
  if (appointment.intervenantId !== intervenantId) throw ApiError.forbidden('Cette séance ne vous appartient pas.');
  if (appointment.status !== 'CONFIRMED') {
    throw ApiError.badRequest('Seule une séance confirmée peut être validée.', 'QR_INVALID_STATUS');
  }
  if (!appointment.coveredByCompany && appointment.paymentStatus !== 'paid') {
    throw ApiError.badRequest(
      'Le paiement doit être effectué avant de valider la séance.',
      'PAYMENT_REQUIRED'
    );
  }

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: 'DONE', attendanceStatus: 'PRESENT', validatedByQr: true },
    include: {
      service: { select: { name: true, category: true } },
      coachService: { select: { name: true, category: true } },
      client: { select: { firstName: true, lastName: true } },
    },
  });

  logStatus(appointment.id, 'CONFIRMED', 'DONE', 'intervenant');
  return updated;
};

// ── Absence client ────────────────────────────────────────────────────────
// Pas de porte de paiement : un client absent ne paiera jamais, et bloquer
// laisserait la séance en CONFIRMED indéfiniment.
const markAbsent = async (appointmentId, intervenantId) => {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw ApiError.notFound('Rendez-vous non trouvé.');
  if (appointment.intervenantId !== intervenantId) throw ApiError.forbidden('Accès refusé.');
  if (appointment.status !== 'CONFIRMED') {
    throw ApiError.badRequest('Seule une séance confirmée peut être marquée absente.', 'INVALID_STATUS');
  }
  if (new Date(appointment.scheduledAt) > new Date()) {
    throw ApiError.badRequest("La séance n'a pas encore commencé.", 'SESSION_NOT_STARTED');
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: 'DONE', attendanceStatus: 'ABSENT' },
  });

  logStatus(appointmentId, 'CONFIRMED', 'DONE', 'intervenant');

  notificationService.create(appointment.clientId, {
    type: 'ABSENCE_MARKED',
    title: 'Absence signalée',
    body: `Le professionnel a signalé votre absence à la séance du ${new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}. Vous pouvez contester depuis vos rendez-vous.`,
  }).catch(() => {});

  return updated;
};

// ── Litiges ───────────────────────────────────────────────────────────────
const openDispute = async (appointmentId, clientId, reason) => {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw ApiError.notFound('Rendez-vous non trouvé.');
  if (appointment.clientId !== clientId) throw ApiError.forbidden('Accès refusé.');
  if (appointment.status !== 'DONE' || appointment.attendanceStatus !== 'ABSENT') {
    throw ApiError.badRequest('Seule une séance marquée absente peut être contestée.', 'DISPUTE_NOT_ALLOWED');
  }
  if (appointment.disputeStatus) {
    throw ApiError.conflict('Un litige existe déjà pour cette séance.', 'DISPUTE_ALREADY_EXISTS');
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { disputeStatus: 'OPEN', disputeReason: reason, disputedAt: new Date() },
  });

  // Notifie tous les admins — le virement au coach est gelé en attendant
  prisma.user
    .findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } })
    .then((admins) =>
      admins.forEach((admin) =>
        notificationService.create(admin.id, {
          type: 'DISPUTE_OPENED',
          title: 'Nouveau litige',
          body: `Un client conteste l'absence signalée sur la séance du ${new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.`,
        }).catch(() => {})
      )
    )
    .catch(() => {});

  return updated;
};

const listDisputes = async ({ status = 'OPEN' } = {}) => {
  const where = status === 'ALL' ? { disputeStatus: { not: null } } : { disputeStatus: status };
  return prisma.appointment.findMany({
    where,
    include: {
      service: { select: { name: true, category: true } },
      coachService: { select: { name: true, category: true } },
      client: { select: { id: true, firstName: true, lastName: true, email: true } },
      intervenant: { select: { id: true, firstName: true, lastName: true, email: true } },
      payment: { select: { amount: true, intervenantShare: true, refundAmount: true } },
    },
    orderBy: { disputedAt: 'desc' },
  });
};

const resolveDispute = async (appointmentId, resolution) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { payment: true },
  });
  if (!appointment) throw ApiError.notFound('Rendez-vous non trouvé.');
  if (appointment.disputeStatus !== 'OPEN') {
    throw ApiError.badRequest("Ce litige n'est pas ouvert.", 'DISPUTE_NOT_OPEN');
  }

  let refundInfo = null;
  if (resolution === 'RESOLVED_CLIENT' && appointment.paymentStatus === 'paid' && appointment.payment) {
    const { payment } = appointment;
    const refund = await getStripe().refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: payment.amount,
      reverse_transfer: true,
      refund_application_fee: true,
    });
    await prisma.payment.update({
      where: { appointmentId },
      data: { refundAmount: payment.amount, refundStripeId: refund.id, refundStatus: refund.status },
    });
    refundInfo = { refundAmount: payment.amount, stripeRefundId: refund.id };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      disputeStatus: resolution,
      disputeResolvedAt: new Date(),
      // paymentStatus 'refunded' sort la séance des gains du coach
      ...(refundInfo && { paymentStatus: 'refunded' }),
    },
  });

  const dateLabel = new Date(appointment.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const clientBody = resolution === 'RESOLVED_CLIENT'
    ? `Votre litige sur la séance du ${dateLabel} a été tranché en votre faveur${refundInfo ? ' — vous serez intégralement remboursé' : ''}.`
    : `Votre litige sur la séance du ${dateLabel} a été rejeté : l'absence signalée est confirmée.`;
  const coachBody = resolution === 'RESOLVED_CLIENT'
    ? `Le litige sur la séance du ${dateLabel} a été tranché en faveur du client${refundInfo ? ' — le paiement est intégralement remboursé' : ''}.`
    : `Le litige sur la séance du ${dateLabel} a été rejeté : vos gains sont débloqués.`;
  notificationService.create(appointment.clientId, { type: 'DISPUTE_RESOLVED', title: 'Litige résolu', body: clientBody }).catch(() => {});
  notificationService.create(appointment.intervenantId, { type: 'DISPUTE_RESOLVED', title: 'Litige résolu', body: coachBody }).catch(() => {});

  return updated;
};

// ── Expiration des PENDING (verrouillage de créneau limité dans le temps) ──
const expirePendingAppointments = async () => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - PENDING_TTL_HOURS * 3_600_000);
  const stale = await prisma.appointment.findMany({
    where: {
      status: 'PENDING',
      OR: [{ scheduledAt: { lt: now } }, { createdAt: { lt: cutoff } }],
    },
    select: { id: true },
  });
  if (!stale.length) return 0;

  const ids = stale.map((s) => s.id);
  await prisma.appointment.updateMany({
    where: { id: { in: ids } },
    data: {
      status: 'CANCELLED',
      cancelledBy: 'system',
      cancelReason: 'Expiré : non confirmé par le professionnel dans les délais.',
    },
  });
  await prisma.appointmentStatusHistory.createMany({
    data: ids.map((id) => ({ appointmentId: id, fromStatus: 'PENDING', toStatus: 'CANCELLED', changedBy: 'system' })),
  }).catch(() => {});

  return ids.length;
};

module.exports = {
  create,
  getMyAppointments,
  getAll,
  updateStatus,
  getBusySlots,
  getMyBusySlots,
  cancelAppointment,
  validateQr,
  markAbsent,
  openDispute,
  listDisputes,
  resolveDispute,
  expirePendingAppointments,
};
