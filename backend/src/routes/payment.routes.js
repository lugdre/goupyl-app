const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/role.middleware');
const validate = require('../middlewares/validate.middleware');
const { createSubscriptionSchema } = require('../validators/subscription.validator');
const { createPaymentIntentSchema } = require('../validators/payment.validator');

// Webhook Stripe : raw body gere dans app.js avant express.json()
router.post('/webhook', paymentController.webhook);

// ─── Entreprise subscription checkout ──────────────────────────────────
router.post(
  '/checkout',
  authenticate,
  authorize('ENTREPRISE'),
  validate(createSubscriptionSchema),
  paymentController.createCheckout
);

router.get(
  '/verify-session',
  authenticate,
  authorize('ENTREPRISE'),
  paymentController.verifySession
);

// ─── Stripe Connect — Intervenant onboarding ──────────────────────────
router.post(
  '/onboard',
  authenticate,
  authorize('INTERVENANT'),
  paymentController.onboardIntervenant
);

router.get(
  '/onboard/status',
  authenticate,
  authorize('INTERVENANT'),
  paymentController.checkOnboardingStatus
);

// ─── Marketplace — Client pays for appointment ────────────────────────
router.post(
  '/create-intent',
  authenticate,
  authorize('CLIENT'),
  validate(createPaymentIntentSchema),
  paymentController.createPaymentIntent
);

router.post(
  '/confirm',
  authenticate,
  authorize('CLIENT'),
  paymentController.confirmPayment
);

router.get(
  '/appointment/:appointmentId',
  authenticate,
  paymentController.getPaymentStatus
);

// ─── Intervenant earnings ─────────────────────────────────────────────
router.get(
  '/earnings',
  authenticate,
  authorize('INTERVENANT'),
  paymentController.getMyEarnings
);

module.exports = router;
