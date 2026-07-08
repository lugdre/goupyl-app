const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/services', require('./service.routes'));
router.use('/appointments', require('./appointment.routes'));
router.use('/subscriptions', require('./subscription.routes'));
router.use('/session-reports', require('./sessionReport.routes'));
router.use('/documents', require('./document.routes'));
router.use('/companies', require('./company.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/analytics', require('./analytics.routes'));
router.use('/reviews', require('./review.routes'));
router.use('/coach-services', require('./coachService.routes'));
router.use('/passkeys', require('./passkey.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/parq', require('./parq.routes'));
router.use('/products', require('./product.routes'));

module.exports = router;
