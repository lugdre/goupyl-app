const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');

router.get('/entreprise', authenticate, authorize('ENTREPRISE'), analyticsController.getEntrepriseAnalytics);
router.get('/admin', authenticate, authorize('ADMIN'), analyticsController.getAdminAnalytics);

module.exports = router;
