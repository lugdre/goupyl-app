const crypto = require('crypto');
const prisma = require('../config/database');
const ApiError = require('../utils/apiError');
const resend = require('../config/email');
const { invitationEmail } = require('../utils/emailTemplates');

const getEmployees = async (companyId) => {
  return prisma.user.findMany({
    where: { employerCompanyId: companyId, role: 'CLIENT' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      createdAt: true,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getJoinCode = async (companyId) => {
  const company = await prisma.user.findUnique({
    where: { id: companyId },
    select: { joinCode: true },
  });
  if (!company) throw ApiError.notFound('Entreprise non trouvée.');
  if (!company.joinCode) return regenerateJoinCode(companyId);
  return { joinCode: company.joinCode };
};

const regenerateJoinCode = async (companyId) => {
  let code;
  let exists = true;
  while (exists) {
    code = crypto.randomBytes(4).toString('hex').toUpperCase();
    exists = !!(await prisma.user.findUnique({ where: { joinCode: code } }));
  }
  await prisma.user.update({ where: { id: companyId }, data: { joinCode: code } });
  return { joinCode: code };
};

const createInvite = async (companyId, email) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.employerCompanyId === companyId) {
    throw ApiError.conflict('Ce salarié est déjà rattaché à votre entreprise.');
  }

  const company = await prisma.user.findUnique({
    where: { id: companyId },
    select: { companyName: true, firstName: true, lastName: true },
  });
  const companyName = company.companyName || `${company.firstName} ${company.lastName}`;

  const token = crypto.randomBytes(6).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.companyInvite.create({
    data: { companyId, email, token, expiresAt },
    select: { id: true, email: true, token: true, expiresAt: true, createdAt: true },
  });

  const registerUrl = `${process.env.FRONTEND_URL}/register?token=${token}&role=SALARIE`;
  const { subject, html } = invitationEmail(companyName, registerUrl, expiresAt);

  await resend.emails.send({
    from: 'Goupyl Sport <onboarding@resend.dev>',
    to: email,
    subject,
    html,
  }).catch(() => {}); // Ne pas bloquer si l'email échoue

  return invite;
};

const getInvites = async (companyId) => {
  return prisma.companyInvite.findMany({
    where: { companyId, usedAt: null, expiresAt: { gt: new Date() } },
    select: { id: true, email: true, token: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
};

const deleteInvite = async (companyId, inviteId) => {
  const invite = await prisma.companyInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.companyId !== companyId) throw ApiError.notFound('Invitation non trouvée.');
  return prisma.companyInvite.delete({ where: { id: inviteId } });
};

const removeEmployee = async (companyId, employeeId) => {
  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee || employee.employerCompanyId !== companyId) {
    throw ApiError.notFound('Salarié non trouvé dans votre entreprise.');
  }
  return prisma.user.update({
    where: { id: employeeId },
    data: { employerCompanyId: null },
  });
};

const getEmployerSubscription = async (employeeId) => {
  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    select: {
      employerCompanyId: true,
      employerCompany: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!employee?.employerCompanyId) throw ApiError.forbidden('Vous n\'êtes pas rattaché à une entreprise.');

  const company = employee.employerCompany;
  const activeSub = company.subscriptions[0] || null;

  return {
    company: {
      id: company.id,
      name: company.companyName || `${company.firstName} ${company.lastName}`,
    },
    subscription: activeSub,
  };
};

const PLAN_LIMITS = {
  ESSENTIEL_ENTREPRISE: { maxEmployees: 10,  maxSessions: 4 },
  BOOST_ENTREPRISE:     { maxEmployees: 50,  maxSessions: 8 },
  ULTRA_ENTREPRISE:     { maxEmployees: 200, maxSessions: 16 },
};

const getUsageStats = async (companyId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [employeeCount, sub] = await Promise.all([
    prisma.user.count({ where: { employerCompanyId: companyId, role: 'CLIENT' } }),
    prisma.subscription.findFirst({
      where: {
        userId: companyId,
        status: { in: ['ACTIVE', 'CANCELLED'] },
        endDate: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const employeeIds = await prisma.user.findMany({
    where: { employerCompanyId: companyId, role: 'CLIENT' },
    select: { id: true },
  }).then((rows) => rows.map((r) => r.id));

  const sessionCount = await prisma.appointment.count({
    where: {
      clientId: { in: employeeIds },
      scheduledAt: { gte: startOfMonth },
      status: { in: ['PENDING', 'CONFIRMED', 'DONE'] },
    },
  });

  const limits = sub ? (PLAN_LIMITS[sub.plan] || { maxEmployees: null, maxSessions: null }) : { maxEmployees: null, maxSessions: null };

  return { employeeCount, sessionCount, limits, plan: sub?.plan || null };
};

const getEmployeeStats = async (employeeId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    select: {
      employerCompanyId: true,
      employerCompany: {
        select: {
          companyName: true,
          subscriptions: {
            where: { status: { in: ['ACTIVE', 'CANCELLED'] }, endDate: { gt: now } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!employee?.employerCompanyId) throw ApiError.forbidden("Vous n'êtes pas rattaché à une entreprise.");

  const sub = employee.employerCompany?.subscriptions[0] || null;

  const [totalSessions, confirmedSessions] = await Promise.all([
    prisma.appointment.count({
      where: { clientId: employeeId, scheduledAt: { gte: startOfMonth } },
    }),
    prisma.appointment.count({
      where: { clientId: employeeId, scheduledAt: { gte: startOfMonth }, status: { in: ['CONFIRMED', 'DONE'] } },
    }),
  ]);

  // Services available for this plan
  let services = [];
  if (sub?.plan) {
    services = await prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, name: true, category: true, durationMinutes: true, price: true },
    });
    // Filter by availableInPlans if the field exists
    services = services.filter((s) => {
      if (!s.availableInPlans) return true;
      const plans = Array.isArray(s.availableInPlans) ? s.availableInPlans : [];
      return plans.length === 0 || plans.includes(sub.plan);
    });
  }

  return {
    sessions: { total: totalSessions, confirmed: confirmedSessions },
    plan: sub?.plan || null,
    planEndDate: sub?.endDate || null,
    services,
  };
};

module.exports = { getEmployees, getJoinCode, regenerateJoinCode, createInvite, getInvites, deleteInvite, removeEmployee, getEmployerSubscription, getUsageStats, getEmployeeStats };
