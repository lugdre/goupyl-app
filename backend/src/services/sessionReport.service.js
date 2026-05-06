const prisma = require('../config/database');
const ApiError = require('../utils/apiError');

const create = async (intervenantId, { appointmentId, notes, objectivesUpdate, rating }) => {
  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw ApiError.notFound('Rendez-vous non trouve.');
  if (appointment.intervenantId !== intervenantId) throw ApiError.forbidden('Acces refuse.');
  if (appointment.status !== 'DONE') {
    throw ApiError.badRequest('Le RDV doit etre termine pour rediger un compte-rendu.');
  }

  const existing = await prisma.sessionReport.findUnique({ where: { appointmentId } });
  if (existing) throw ApiError.conflict('Un compte-rendu existe deja pour ce RDV.', 'REPORT_EXISTS');

  return prisma.sessionReport.create({
    data: { appointmentId, intervenantId, notes, objectivesUpdate, rating },
  });
};

const getByAppointment = async (appointmentId, userId, role) => {
  const report = await prisma.sessionReport.findUnique({
    where: { appointmentId },
    include: {
      appointment: { select: { clientId: true, intervenantId: true } },
    },
  });
  if (!report) throw ApiError.notFound('Compte-rendu non trouve.');

  if (role === 'CLIENT' && report.appointment.clientId !== userId) throw ApiError.forbidden('Acces refuse.');
  if (role === 'INTERVENANT' && report.appointment.intervenantId !== userId) throw ApiError.forbidden('Acces refuse.');

  return report;
};

const update = async (id, intervenantId, data) => {
  const report = await prisma.sessionReport.findUnique({ where: { id } });
  if (!report || report.intervenantId !== intervenantId) throw ApiError.forbidden('Acces refuse.');
  return prisma.sessionReport.update({ where: { id }, data });
};

module.exports = { create, getByAppointment, update };
