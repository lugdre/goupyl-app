const { z } = require('zod');

const createPaymentIntentSchema = z.object({
  appointmentId: z.number({ message: 'appointmentId doit etre un nombre' }).int().positive(),
});

module.exports = { createPaymentIntentSchema };
