const { z } = require('zod');

const createSubscriptionSchema = z.object({
  plan: z.enum(['ESSENTIEL_ENTREPRISE', 'BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE'], {
    errorMap: () => ({ message: 'Plan invalide' }),
  }),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
});

module.exports = { createSubscriptionSchema };
