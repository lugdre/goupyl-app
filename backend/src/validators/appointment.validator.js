const { z } = require('zod');

const createAppointmentSchema = z.object({
  intervenantId: z.number({ required_error: 'ID intervenant requis' }).int().positive(),
  serviceId: z.number().int().positive().optional(),
  coachServiceId: z.number().int().positive().optional(),
  scheduledAt: z
    .string({ required_error: 'Date requise' })
    .datetime('Format ISO 8601 attendu')
    .refine((date) => new Date(date) > new Date(), { message: 'Le RDV doit etre dans le futur' }),
  notes: z.string().max(500).optional(),
}).refine((data) => data.serviceId || data.coachServiceId, {
  message: 'Un serviceId ou coachServiceId est requis',
});

const updateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'DONE'], {
    errorMap: () => ({ message: 'Statut invalide' }),
  }),
  cancelReason: z.string().max(200).optional(),
});

const validateQrSchema = z.object({
  code: z.string({ required_error: 'Code requis' }).trim().min(8, 'Minimum 8 caractères').max(64),
});

const disputeSchema = z.object({
  reason: z.string({ required_error: 'Motif requis' }).trim().min(10, 'Minimum 10 caractères').max(500),
});

const resolveDisputeSchema = z.object({
  resolution: z.enum(['REJECTED', 'RESOLVED_CLIENT'], {
    errorMap: () => ({ message: 'Résolution invalide' }),
  }),
});

module.exports = { createAppointmentSchema, updateStatusSchema, validateQrSchema, disputeSchema, resolveDisputeSchema };
