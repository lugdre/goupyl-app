const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authenticate = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', notificationController.list);
router.get('/unread-count', notificationController.countUnread);
router.put('/:id/read', notificationController.markRead);
router.put('/mark-all-read', notificationController.markAllRead);

module.exports = router;
