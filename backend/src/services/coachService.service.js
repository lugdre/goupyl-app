const prisma = require('../config/database');
const ApiError = require('../utils/apiError');

const getByIntervenant = async (intervenantId) => {
  return prisma.coachService.findMany({
    where: { intervenantId, active: true },
    orderBy: { createdAt: 'desc' },
  });
};

const getMine = async (userId) => {
  return prisma.coachService.findMany({
    where: { intervenantId: userId },
    orderBy: { createdAt: 'desc' },
  });
};

const create = async (userId, data) => {
  return prisma.coachService.create({
    data: {
      ...data,
      intervenantId: userId,
    },
  });
};

const update = async (id, userId, data) => {
  const service = await prisma.coachService.findUnique({ where: { id } });
  if (!service) throw ApiError.notFound('Service non trouve.');
  if (service.intervenantId !== userId) throw ApiError.forbidden('Acces refuse.');

  return prisma.coachService.update({
    where: { id },
    data,
  });
};

const remove = async (id, userId) => {
  const service = await prisma.coachService.findUnique({ where: { id } });
  if (!service) throw ApiError.notFound('Service non trouve.');
  if (service.intervenantId !== userId) throw ApiError.forbidden('Acces refuse.');

  return prisma.coachService.update({
    where: { id },
    data: { active: false },
  });
};

module.exports = { getByIntervenant, getMine, create, update, remove };
