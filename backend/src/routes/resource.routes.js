const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resource.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const injectActivePlan = require('../middlewares/activePlan.middleware');

// Lecture : ENTREPRISE ou CLIENT (salarié)
router.get('/', authenticate, authorize('ENTREPRISE', 'CLIENT'), injectActivePlan, resourceController.getAll);
router.get('/:id', authenticate, authorize('ENTREPRISE', 'CLIENT'), injectActivePlan, resourceController.getById);

// Administration : ADMIN uniquement
router.post('/', authenticate, authorize('ADMIN'), resourceController.create);
router.put('/:id', authenticate, authorize('ADMIN'), resourceController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), resourceController.remove);

module.exports = router;
