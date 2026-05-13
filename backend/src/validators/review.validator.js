const { z } = require('zod');

const createReviewSchema = z.object({
  appointmentId: z.number({ message: 'appointmentId doit etre un nombre' }).int().positive(),
  rating: z.number({ message: 'rating doit etre un nombre' }).int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

const replyReviewSchema = z.object({
  reply: z
    .string({ message: 'La reponse est requise' })
    .trim()
    .min(1, 'La reponse ne peut etre vide')
    .max(1000, 'La reponse ne peut depasser 1000 caracteres'),
});

module.exports = { createReviewSchema, replyReviewSchema };
