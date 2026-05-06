const { z } = require('zod');

const createSessionReportSchema = z.object({
  appointmentId: z.number().int().positive(),
  notes: z.string().min(10, 'Minimum 10 caracteres').max(2000),
  objectivesUpdate: z.string().max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

module.exports = { createSessionReportSchema };
