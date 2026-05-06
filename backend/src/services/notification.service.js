const prisma = require('../config/database');

const create = async (userId, { type, title, body = null }) => {
  return prisma.notification.create({
    data: { userId, type, title, body },
  });
};

const listForUser = async (userId, { onlyUnread = false } = {}) => {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(onlyUnread && { readAt: null }),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

const countUnread = async (userId) => {
  return prisma.notification.count({ where: { userId, readAt: null } });
};

const markRead = async (userId, id) => {
  return prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
};

const markAllRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
};

module.exports = { create, listForUser, countUnread, markRead, markAllRead };
