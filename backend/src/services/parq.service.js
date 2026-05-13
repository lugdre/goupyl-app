const prisma = require('../config/database');
const ApiError = require('../utils/apiError');
const { encryptJson, decryptJson } = require('../utils/encryption');

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Submits or renews a user's PARQ questionnaire. Answers are encrypted at
 * rest so they are never transmitted to the employer/HR or readable from a
 * raw DB dump. One questionnaire per user — renewing replaces the previous
 * record (annual renewal flow).
 */
const submitQuestionnaire = async (userId, answers) => {
  if (!answers || typeof answers !== 'object') {
    throw ApiError.badRequest('Reponses manquantes ou invalides.', 'INVALID_ANSWERS');
  }

  const hasRisk = Object.values(answers).some((value) => value === true);
  const encrypted = encryptJson(answers);
  const expiresAt = new Date(Date.now() + ONE_YEAR_MS);

  // Find the latest existing questionnaire (if any) and overwrite it.
  const existing = await prisma.pARQQuestionnaire.findFirst({
    where: { userId },
    orderBy: { completedAt: 'desc' },
  });

  if (existing) {
    return prisma.pARQQuestionnaire.update({
      where: { id: existing.id },
      data: {
        answers: encrypted,
        hasRisk,
        // Resetting coach clearance — a new questionnaire restarts the
        // clearance flow if any risk is declared again.
        coachCleared: false,
        completedAt: new Date(),
        expiresAt,
      },
    });
  }

  return prisma.pARQQuestionnaire.create({
    data: {
      userId,
      answers: encrypted,
      hasRisk,
      coachCleared: false,
      expiresAt,
    },
  });
};

/**
 * Returns the user's PARQ status, used by the booking flow to decide whether
 * to display the modal and whether to block the booking.
 *
 * `canBook` rules:
 *  - if no questionnaire OR expired → false (user must complete it first)
 *  - if hasRisk && !coachCleared → false (coach must validate first)
 *  - otherwise → true
 */
const getStatus = async (userId) => {
  const latest = await prisma.pARQQuestionnaire.findFirst({
    where: { userId },
    orderBy: { completedAt: 'desc' },
  });

  if (!latest) {
    return {
      completed: false,
      expired: false,
      hasRisk: false,
      coachCleared: false,
      canBook: false,
      completedAt: null,
      expiresAt: null,
    };
  }

  const expired = latest.expiresAt.getTime() < Date.now();
  const canBook = !expired && (!latest.hasRisk || latest.coachCleared);

  return {
    completed: true,
    expired,
    hasRisk: latest.hasRisk,
    coachCleared: latest.coachCleared,
    canBook,
    completedAt: latest.completedAt,
    expiresAt: latest.expiresAt,
  };
};

/**
 * Allows the owner of the questionnaire to read back their decrypted answers
 * (e.g. to review what they submitted). Encrypted answers are never returned
 * to anyone else.
 */
const getOwnAnswers = async (userId) => {
  const latest = await prisma.pARQQuestionnaire.findFirst({
    where: { userId },
    orderBy: { completedAt: 'desc' },
  });
  if (!latest) return null;
  return decryptJson(latest.answers);
};

module.exports = { submitQuestionnaire, getStatus, getOwnAnswers };
