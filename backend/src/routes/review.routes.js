const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { createReviewSchema, replyReviewSchema } = require('../validators/review.validator');

// Public — get reviews for an intervenant
router.get('/intervenant/:intervenantId', reviewController.getIntervenantReviews);

// Authenticated CLIENT routes
router.post(
  '/',
  authenticate,
  authorize('CLIENT'),
  validate(createReviewSchema),
  reviewController.createReview
);

router.get(
  '/appointment/:appointmentId',
  authenticate,
  authorize('CLIENT'),
  reviewController.getMyReview
);

// INTERVENANT — read review on one of their appointments
router.get(
  '/my-appointment/:appointmentId',
  authenticate,
  authorize('INTERVENANT'),
  reviewController.getReviewForAppointment
);

// INTERVENANT — reply to a review (initial reply, then up to 3 edits)
router.put(
  '/:id/reply',
  authenticate,
  authorize('INTERVENANT'),
  validate(replyReviewSchema),
  reviewController.replyToReview
);

module.exports = router;
