const prisma = require('../config/database');

// Injecte req.activePlan avec le plan actif de l'utilisateur (entreprise directe ou employeur)
const injectActivePlan = async (req, res, next) => {
  try {
    if (!req.user) return next();

    const { userId, role } = req.user;

    // Un abonnement résilié (CANCELLED) reste valide jusqu'à sa endDate
    const validSubWhere = {
      OR: [
        { status: 'ACTIVE' },
        { status: 'CANCELLED', endDate: { gt: new Date() } },
      ],
    };

    if (role === 'ENTREPRISE') {
      const sub = await prisma.subscription.findFirst({
        where: { userId, ...validSubWhere },
        orderBy: { endDate: 'desc' },
      });
      req.activePlan = sub?.plan || null;
    } else if (role === 'CLIENT') {
      // Salarié : chercher le plan de l'employeur
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          employerCompanyId: true,
          employerCompany: {
            select: {
              subscriptions: {
                where: validSubWhere,
                orderBy: { endDate: 'desc' },
                take: 1,
              },
            },
          },
        },
      });
      req.activePlan = user?.employerCompany?.subscriptions?.[0]?.plan || null;
    }

    next();
  } catch {
    next();
  }
};

module.exports = injectActivePlan;
