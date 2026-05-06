const prisma = require('../config/database');
const ApiError = require('../utils/apiError');

const getAll = async ({ category, page = 1, limit = 50 }) => {
  const where = { isActive: true };
  if (category) where.category = category;
  return prisma.service.findMany({
    where,
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
    orderBy: { category: 'asc' },
  });
};

const getById = async (id) => {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw ApiError.notFound('Service non trouve.');
  return service;
};

const create = async (data) => {
  return prisma.service.create({ data });
};

const update = async (id, data) => {
  return prisma.service.update({ where: { id }, data });
};

const remove = async (id) => {
  return prisma.service.update({ where: { id }, data: { isActive: false } });
};

module.exports = { getAll, getById, create, update, remove };
