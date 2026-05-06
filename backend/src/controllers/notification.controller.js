const notificationService = require('../services/notification.service');

const list = async (req, res, next) => {
  try {
    const notifications = await notificationService.listForUser(req.user.userId);
    res.json(notifications);
  } catch (e) { next(e); }
};

const countUnread = async (req, res, next) => {
  try {
    const count = await notificationService.countUnread(req.user.userId);
    res.json({ count });
  } catch (e) { next(e); }
};

const markRead = async (req, res, next) => {
  try {
    await notificationService.markRead(req.user.userId, parseInt(req.params.id));
    res.json({ ok: true });
  } catch (e) { next(e); }
};

const markAllRead = async (req, res, next) => {
  try {
    await notificationService.markAllRead(req.user.userId);
    res.json({ ok: true });
  } catch (e) { next(e); }
};

module.exports = { list, countUnread, markRead, markAllRead };
