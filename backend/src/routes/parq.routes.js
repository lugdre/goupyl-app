const express = require('express');
const router = express.Router();
const parqController = require('../controllers/parq.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { submitQuestionnaireSchema } = require('../validators/parq.validator');

// Submit (or renew) the PARQ questionnaire — CLIENT only.
router.post(
  '/submit',
  authenticate,
  authorize('CLIENT'),
  validate(submitQuestionnaireSchema),
  parqController.submit
);

// Booking flow polls this to decide whether the questionnaire is needed.
router.get(
  '/status',
  authenticate,
  authorize('CLIENT'),
  parqController.getStatus
);

// The user may read back their own (decrypted) answers.
router.get(
  '/me',
  authenticate,
  authorize('CLIENT'),
  parqController.getMyAnswers
);

module.exports = router;
