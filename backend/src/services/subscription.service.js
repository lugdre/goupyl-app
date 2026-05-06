const prisma = require('../config/database');
const ApiError = require('../utils/apiError');

const subscribe = async (userId, plan, billingCycle = 'MONTHLY') => {
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

const getMine = async (userId) => {
  const [activeStrict, cancelledInPeriod, history] = await Promise.all([
    // 1. Abonnement vraiment actif (priorité absolue)
    prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    }),
    // 2. Abonnement résilié mais encore dans sa période payée (fallback)
    prisma.subscription.findFirst({
      where: { userId, status: 'CANCELLED', endDate: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);
  return { active: activeStrict ?? cancelledInPeriod, history };
};

const cancel = async (id, userId) => {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub || sub.userId !== userId) throw ApiError.forbidden('Acces refuse.');
  if (sub.status !== 'ACTIVE') throw ApiError.badRequest("Cet abonnement n'est pas actif.");
  return prisma.subscription.update({ where: { id }, data: { status: 'CANCELLED' } });
};

const getAll = async ({ page = 1, limit = 20 }) => {
  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subscription.count(),
  ]);
  return {
    subscriptions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

module.exports = { subscribe, getMine, cancel, getAll };
