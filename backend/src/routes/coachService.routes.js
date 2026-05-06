const express = require('express');
const router = express.Router();
const coachServiceController = require('../controllers/coachService.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { createCoachServiceSchema, updateCoachServiceSchema } = require('../validators/coachService.validator');

// Public — get active services for a given intervenant
router.get('/intervenant/:intervenantId', coachServiceController.getByIntervenant);

// Protected — INTERVENANT only
router.get('/mine', authenticate, authorize('INTERVENANT'), coachServiceController.getMine);
router.post('/', authenticate, authorize('INTERVENANT'), validate(createCoachServiceSchema), coachServiceController.create);
router.put('/:id', authenticate, authorize('INTERVENANT'), validate(updateCoachServiceSchema), coachServiceController.update);
router.delete('/:id', authenticate, authorize('INTERVENANT'), coachServiceController.remove);

module.exports = router;
