const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { createServiceSchema, updateServiceSchema } = require('../validators/service.validator');

router.get('/', serviceController.getAll);
router.get('/:id', serviceController.getById);
router.post('/', authenticate, authorize('ADMIN'), validate(createServiceSchema), serviceController.create);
router.put('/:id', authenticate, authorize('ADMIN'), validate(updateServiceSchema), serviceController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), serviceController.remove);

module.exports = router;
