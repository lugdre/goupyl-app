const prisma = require('../config/database');
const ApiError = require('../utils/apiError');
const notificationService = require('./notification.service');

const createReview = async (clientId, { appointmentId, rating, comment }) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      review: { select: { id: true } },
      client: { select: { firstName: true, lastName: true } },
    },
  });

  if (!appointment) throw ApiError.notFound('Rendez-vous non trouve.');
  if (appointment.clientId !== clientId) throw ApiError.forbidden('Ce rendez-vous ne vous appartient pas.');
  if (appointment.status !== 'DONE') {
    throw ApiError.badRequest('La seance doit etre terminee avant de laisser un avis.', 'NOT_DONE');
  }
  if (appointment.review) {
    throw ApiError.conflict('Un avis a deja ete depose pour cette seance.', 'REVIEW_EXISTS');
  }

  const review = await prisma.review.create({
    data: {
      appointmentId,
      clientId,
      intervenantId: appointment.intervenantId,
      rating,
      comment: comment || null,
    },
    include: {
      client: { select: { firstName: true, lastName: true } },
    },
  });

  // Notify the intervenant
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
  await notificationService.create(appointment.intervenantId, {
    type: 'NEW_REVIEW',
    title: `Nouvel avis de ${appointment.client.firstName} ${appointment.client.lastName}`,
    body: `${stars} — "${comment || 'Aucun commentaire'}"`,
  });

  return review;
};

const MAX_COACH_REPLY_EDITS = 3;

const replyToReview = async (intervenantId, reviewId, reply) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw ApiError.notFound('Avis introuvable.');
  if (review.intervenantId !== intervenantId) throw ApiError.forbidden('Cet avis ne vous appartient pas.');

  const isEdit = Boolean(review.coachReply);
  if (isEdit && review.coachReplyEdits >= MAX_COACH_REPLY_EDITS) {
    throw ApiError.badRequest(
      `Limite de modifications atteinte (${MAX_COACH_REPLY_EDITS} max)`,
      'REPLY_EDIT_LIMIT'
    );
  }

  return prisma.review.update({
    where: { id: reviewId },
    data: {
      coachReply: reply,
      coachRepliedAt: new Date(),
      ...(isEdit ? { coachReplyEdits: { increment: 1 } } : {}),
    },
    include: { client: { select: { firstName: true, lastName: true } } },
  });
};

const getIntervenantReviews = async (intervenantId) => {
  const [reviews, totalSessions] = await Promise.all([
    prisma.review.findMany({
      where: { intervenantId },
      include: {
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.appointment.count({
      where: { intervenantId, status: 'DONE' },
    }),
  ]);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  return {
    reviews,
    averageRating: averageRating !== null ? Math.round(averageRating * 10) / 10 : null,
    reviewCount: reviews.length,
    totalSessions,
  };
};

const getReviewByAppointment = async (appointmentId, clientId) => {
  const review = await prisma.review.findUnique({
    where: { appointmentId },
  });
  if (review && review.clientId !== clientId) {
    throw ApiError.forbidden('Acces refuse.');
  }
  return review;
};

// For INTERVENANT — fetch review on one of their appointments
const getReviewForAppointment = async (appointmentId, intervenantId) => {
  const review = await prisma.review.findUnique({
    where: { appointmentId },
    include: { client: { select: { firstName: true, lastName: true, avatarUrl: true } } },
  });
  if (!review) return null;
  if (review.intervenantId !== intervenantId) throw ApiError.forbidden('Acces refuse.');
  return review;
};

module.exports = { createReview, replyToReview, getIntervenantReviews, getReviewByAppointment, getReviewForAppointment };
