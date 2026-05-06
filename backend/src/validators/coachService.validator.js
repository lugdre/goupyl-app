const { z } = require('zod');

const createCoachServiceSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long (100 max)'),
  description: z.string().max(300, 'Description trop longue (300 max)').optional(),
  durationMinutes: z
    .number({ required_error: 'Duree requise' })
    .int()
    .refine((v) => [15, 30, 45, 60, 90, 120].includes(v), {
      message: 'Duree invalide (15, 30, 45, 60, 90 ou 120 min)',
    }),
  price: z.number({ required_error: 'Prix requis' }).positive('Le prix doit etre positif'),
  category: z.enum(['SPORT', 'NUTRITION', 'MENTAL', 'BIENETRE'], {
    errorMap: () => ({ message: 'Categorie invalide' }),
  }),
  sessionType: z.enum(['SOLO', 'DUO', 'GROUP']).optional().default('SOLO'),
  maxParticipants: z.number().int().min(1).max(50).optional().nullable(),
  active: z.boolean().optional(),
});

const updateCoachServiceSchema = createCoachServiceSchema.partial();

module.exports = { createCoachServiceSchema, updateCoachServiceSchema };
