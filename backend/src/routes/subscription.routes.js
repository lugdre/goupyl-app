const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { createSubscriptionSchema } = require('../validators/subscription.validator');

router.use(authenticate);

router.post('/', authorize('ENTREPRISE'), validate(createSubscriptionSchema), subscriptionController.subscribe);
router.get('/mine', authorize('ENTREPRISE'), subscriptionController.getMine);
router.patch('/:id/cancel', authorize('ENTREPRISE'), subscriptionController.cancel);
router.get('/', authorize('ADMIN'), subscriptionController.getAll);

module.exports = router;
