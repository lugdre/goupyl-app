const prisma = require('../config/database');
const ApiError = require('../utils/apiError');

// Niveaux d'accès par plan
const PLAN_ACCESS_LEVEL = {
  ZEN_ENTREPRISE:   ['ZEN'],
  PULSE_ENTREPRISE: ['ZEN', 'PULSE'],
  BOOST_ENTREPRISE: ['ZEN', 'PULSE', 'BOOST'],
};

const getAll = async ({ category, type, plan } = {}) => {
  const where = { published: true };
  if (category) where.category = category;
  if (type) where.type = type;

  const resources = await prisma.resource.findMany({
    where,
    orderBy: [{ access: 'asc' }, { createdAt: 'desc' }],
  });

  const allowedAccess = plan ? (PLAN_ACCESS_LEVEL[plan] || []) : [];
  return resources.map((r) => ({ ...r, isLocked: !allowedAccess.includes(r.access) }));
};

const getById = async (id) => {
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) throw ApiError.notFound('Ressource introuvable.');
  return resource;
};

const create = async (data) => {
  return prisma.resource.create({ data });
};

const update = async (id, data) => {
  await getById(id);
  return prisma.resource.update({ where: { id }, data });
};

const remove = async (id) => {
  await getById(id);
  return prisma.resource.delete({ where: { id } });
};

module.exports = { getAll, getById, create, update, remove };
