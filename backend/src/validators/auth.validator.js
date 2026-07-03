const { z } = require('zod');

const registerSchema = z.object({
  email: z.string({ required_error: 'Email requis' }).email('Format email invalide').toLowerCase().trim(),
  password: z
    .string({ required_error: 'Mot de passe requis' })
    .min(8, 'Minimum 8 caracteres')
    .regex(/[A-Z]/, 'Au moins une majuscule')
    .regex(/[0-9]/, 'Au moins un chiffre'),
  firstName: z.string({ required_error: 'Prenom requis' }).min(2).max(50).trim(),
  lastName: z.string({ required_error: 'Nom requis' }).min(2).max(50).trim(),
  role: z.enum(['CLIENT', 'INTERVENANT', 'ENTREPRISE'], { errorMap: () => ({ message: 'Role invalide' }) }),
  companyName: z.string().min(2).max(100).trim().optional(),
  siret: z
    .string()
    .regex(/^\d{14}$/, 'Le SIRET doit contenir exactement 14 chiffres')
    .optional(),
  joinCode: z.string().optional(),
  acceptedTerms: z.boolean().optional(),
  // Questionnaire d'onboarding (CLIENT uniquement, facultatif)
  level: z.enum(['DEBUTANT', 'INTERMEDIAIRE', 'AVANCE', 'ELITE']).optional(),
  sportType: z.string().max(100).trim().optional(),
  objectives: z.array(z.string().min(1).max(80)).max(10).optional(),
});

const loginSchema = z.object({
  email: z.string({ required_error: 'Email requis' }).email().toLowerCase().trim(),
  password: z.string({ required_error: 'Mot de passe requis' }),
});

const refreshSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token requis' }),
});

module.exports = { registerSchema, loginSchema, refreshSchema };
