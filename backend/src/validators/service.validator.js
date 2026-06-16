const { z } = require('zod');

const createServiceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['SPORT', 'NUTRITION', 'MENTAL', 'BIENETRE']),
  durationMinutes: z.number().int().min(15).max(480),
  price: z.number().positive().max(9999),
  availableInPlans: z.array(z.enum(['ESSENTIEL_ENTREPRISE', 'BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE'])).optional(),
});

const updateServiceSchema = createServiceSchema.partial();

module.exports = { createServiceSchema, updateServiceSchema };
