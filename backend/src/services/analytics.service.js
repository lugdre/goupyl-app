const prisma = require('../config/database');

// Analytics pour une entreprise : stats globales de ses salariés
const getEntrepriseAnalytics = async (companyId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // Récupère les IDs des salariés
  const employees = await prisma.user.findMany({
    where: { employerCompanyId: companyId },
    select: { id: true },
  });
  const employeeIds = employees.map((e) => e.id);

  // Statistiques globales du mois en cours
  const [totalSessions, confirmedSessions, doneSessions] = await Promise.all([
    prisma.appointment.count({
      where: { clientId: { in: employeeIds }, scheduledAt: { gte: startOfMonth } },
    }),
    prisma.appointment.count({
      where: { clientId: { in: employeeIds }, scheduledAt: { gte: startOfMonth }, status: 'CONFIRMED' },
    }),
    prisma.appointment.count({
      where: { clientId: { in: employeeIds }, scheduledAt: { gte: startOfMonth }, status: 'DONE' },
    }),
  ]);

  // Répartition par catégorie ce mois
  const byCategory = await prisma.appointment.groupBy({
    by: ['serviceId'],
    where: {
      clientId: { in: employeeIds },
      scheduledAt: { gte: startOfMonth },
      status: { in: ['CONFIRMED', 'DONE'] },
    },
    _count: { id: true },
  });

  // Enrichir avec la catégorie du service
  const serviceIds = byCategory.map((b) => b.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, category: true, name: true },
  });
  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));

  const categoryStats = {};
  byCategory.forEach(({ serviceId, _count }) => {
    const cat = serviceMap[serviceId]?.category || 'AUTRE';
    categoryStats[cat] = (categoryStats[cat] || 0) + _count.id;
  });

  // Tendance sur 6 mois (rdv confirmés + terminés)
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const count = await prisma.appointment.count({
      where: {
        clientId: { in: employeeIds },
        scheduledAt: { gte: start, lte: end },
        status: { in: ['CONFIRMED', 'DONE'] },
      },
    });
    const label = start.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    trend.push({ label, count });
  }

  // Salariés actifs ce mois (au moins 1 rdv)
  const activeEmployeeIds = await prisma.appointment.findMany({
    where: {
      clientId: { in: employeeIds },
      scheduledAt: { gte: startOfMonth },
      status: { in: ['CONFIRMED', 'DONE'] },
    },
    select: { clientId: true },
    distinct: ['clientId'],
  });

  return {
    employees: {
      total: employeeIds.length,
      active: activeEmployeeIds.length,
    },
    sessions: {
      total: totalSessions,
      confirmed: confirmedSessions,
      done: doneSessions,
    },
    categoryStats,
    trend,
  };
};

const getAdminAnalytics = async () => {
  const now = new Date();

  // ── KPI totaux ──────────────────────────────────────────────────────
  const [
    totalClients,
    totalIntervenants,
    totalEntreprises,
    totalAppointments,
    pendingVerifications,
    totalReviews,
    avgRatingRaw,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count({ where: { role: 'INTERVENANT' } }),
    prisma.user.count({ where: { role: 'ENTREPRISE' } }),
    prisma.appointment.count(),
    prisma.user.count({ where: { role: 'INTERVENANT', verificationStatus: 'PENDING' } }),
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { rating: true } }),
  ]);

  // ── Répartition RDV par statut ───────────────────────────────────────
  const apptByStatus = await prisma.appointment.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  // ── Revenue total (payments succeeded) ──────────────────────────────
  const revenueAgg = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { status: 'succeeded' },
  });

  // ── Tendances mensuelles (6 mois) ────────────────────────────────────
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = start.toLocaleDateString('fr-FR', { month: 'short' });

    const [newClients, newIntervenants, apptTotal, apptDone, revenue] = await Promise.all([
      prisma.user.count({ where: { role: 'CLIENT', createdAt: { gte: start, lte: end } } }),
      prisma.user.count({ where: { role: 'INTERVENANT', createdAt: { gte: start, lte: end } } }),
      prisma.appointment.count({ where: { scheduledAt: { gte: start, lte: end } } }),
      prisma.appointment.count({ where: { scheduledAt: { gte: start, lte: end }, status: 'DONE' } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'succeeded', createdAt: { gte: start, lte: end } },
      }),
    ]);

    months.push({
      label,
      clients: newClients,
      intervenants: newIntervenants,
      appointments: apptTotal,
      done: apptDone,
      revenue: Math.round((revenue._sum.amount || 0) / 100),
    });
  }

  // ── Top 5 intervenants par nombre de RDV ────────────────────────────
  const topIntervenantsRaw = await prisma.appointment.groupBy({
    by: ['intervenantId'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });
  const intervenantIds = topIntervenantsRaw.map((r) => r.intervenantId);
  const intervenantUsers = await prisma.user.findMany({
    where: { id: { in: intervenantIds } },
    select: { id: true, firstName: true, lastName: true },
  });
  const userMap = Object.fromEntries(intervenantUsers.map((u) => [u.id, u]));
  const topIntervenants = topIntervenantsRaw.map((r) => ({
    name: `${userMap[r.intervenantId]?.firstName || ''} ${userMap[r.intervenantId]?.lastName || ''}`.trim(),
    count: r._count.id,
  }));

  // ── 10 derniers RDV ──────────────────────────────────────────────────
  const recentAppointments = await prisma.appointment.findMany({
    take: 10,
    orderBy: { scheduledAt: 'desc' },
    include: {
      client: { select: { firstName: true, lastName: true } },
      intervenant: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
      coachService: { select: { name: true } },
    },
  });

  return {
    kpi: {
      totalClients,
      totalIntervenants,
      totalEntreprises,
      totalAppointments,
      pendingVerifications,
      totalReviews,
      avgRating: avgRatingRaw._avg.rating ? Number(avgRatingRaw._avg.rating.toFixed(1)) : null,
      totalRevenue: Math.round((revenueAgg._sum.amount || 0) / 100),
    },
    apptByStatus: apptByStatus.map((r) => ({ status: r.status, count: r._count.id })),
    months,
    topIntervenants,
    recentAppointments,
  };
};

module.exports = { getEntrepriseAnalytics, getAdminAnalytics };
