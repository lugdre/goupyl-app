import api from './api';
import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const paymentApi = {
  // Entreprise subscription checkout (existing)
  createCheckout: (plan, billingCycle) =>
    api.post('/payments/checkout', { plan, billingCycle }),
  verifySession: (sessionId) =>
    api.get(`/payments/verify-session?session_id=${sessionId}`),

  // Stripe Connect — Intervenant onboarding
  onboard: () => api.post('/payments/onboard'),
  checkOnboardingStatus: () => api.get('/payments/onboard/status'),

  // Marketplace — Client pays for appointment
  createPaymentIntent: (appointmentId) => api.post('/payments/create-intent', { appointmentId }),
  confirmPayment: (paymentIntentId) => api.post('/payments/confirm', { paymentIntentId }),
  getPaymentStatus: (appointmentId) => api.get(`/payments/appointment/${appointmentId}`),
  getMyEarnings: () => api.get('/payments/earnings'),
};
