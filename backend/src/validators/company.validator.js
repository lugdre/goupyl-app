const { z } = require('zod');

const inviteSchema = z.object({
  email: z.string().email('Email invalide').toLowerCase().trim(),
});

module.exports = { inviteSchema };
