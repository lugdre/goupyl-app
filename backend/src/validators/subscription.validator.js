const { z } = require('zod');

const createSubscriptionSchema = z.object({
  plan: z.enum(['ZEN_ENTREPRISE', 'PULSE_ENTREPRISE', 'BOOST_ENTREPRISE'], {
    errorMap: () => ({ message: 'Plan invalide' }),
  }),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
});

module.exports = { createSubscriptionSchema };
