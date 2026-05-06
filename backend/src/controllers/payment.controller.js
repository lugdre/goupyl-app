const paymentService = require('../services/payment.service');

const createCheckout = async (req, res, next) => {
  try {
    const { plan, billingCycle } = req.body;
    const result = await paymentService.createCheckoutSession(req.user.userId, plan, billingCycle);
    res.json(result);
  } catch (e) { next(e); }
};

const webhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    await paymentService.handleWebhook(req.body, signature);
    res.json({ received: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

const verifySession = async (req, res, next) => {
  try {
    const { session_id } = req.query;
    if (!session_id) throw require('../utils/apiError').badRequest('session_id manquant.');
    const result = await paymentService.verifySession(session_id, req.user.userId);
    res.json(result);
  } catch (e) { next(e); }
};

const onboardIntervenant = async (req, res, next) => {
  try {
    const result = await paymentService.createOnboardingLink(req.user.userId);
    res.json(result);
  } catch (e) { next(e); }
};

const checkOnboardingStatus = async (req, res, next) => {
  try {
    const result = await paymentService.checkAccountStatus(req.user.userId);
    res.json(result);
  } catch (e) { next(e); }
};

const createPaymentIntent = async (req, res, next) => {
  try {
    const { appointmentId } = req.body;
    const result = await paymentService.createPaymentIntent(appointmentId, req.user.userId);
    res.json(result);
  } catch (e) { next(e); }
};

const getPaymentStatus = async (req, res, next) => {
  try {
    const appointmentId = parseInt(req.params.appointmentId);
    const result = await paymentService.getPaymentByAppointment(appointmentId);
    res.json(result);
  } catch (e) { next(e); }
};

const confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;
    const result = await paymentService.confirmPaymentIntent(paymentIntentId, req.user.userId);
    res.json(result);
  } catch (e) { next(e); }
};

const getMyEarnings = async (req, res, next) => {
  try {
    const result = await paymentService.getIntervenantPayments(req.user.userId);
    res.json(result);
  } catch (e) { next(e); }
};

module.exports = { createCheckout, webhook, verifySession, onboardIntervenant, checkOnboardingStatus, createPaymentIntent, confirmPayment, getPaymentStatus, getMyEarnings };
