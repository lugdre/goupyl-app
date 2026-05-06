const { z } = require('zod');

const createReviewSchema = z.object({
  appointmentId: z.number({ message: 'appointmentId doit etre un nombre' }).int().positive(),
  rating: z.number({ message: 'rating doit etre un nombre' }).int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

module.exports = { createReviewSchema };
