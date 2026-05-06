const { z } = require('zod');

const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).trim().optional(),
  lastName: z.string().min(2).max(50).trim().optional(),
  phone: z.string().max(20).optional(),
  companyName: z.string().min(2).max(100).trim().optional(),
  gender: z.enum(['HOMME', 'FEMME']).nullable().optional(),
  profile: z
    .object({
      level: z.enum(['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'ELITE']).optional(),
      objectives: z.array(z.string()).optional(),
      sportType: z.string().max(100).optional(),
      constraints: z.string().max(500).optional(),
      bio: z.string().max(1000).optional(),
      specialties: z.array(z.string()).optional(),
      experience: z.number().int().min(0).max(50).optional(),
      diplomas: z.array(z.string()).optional(),
      hourlyRate: z.number().positive().max(9999).optional(),
      city: z.string().max(100).optional(),
    })
    .optional(),
});

module.exports = { updateProfileSchema };
