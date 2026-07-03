const { z } = require('zod');

const productSchema = z.object({
  name: z.string({ required_error: 'Nom requis' }).min(2, 'Minimum 2 caractères').max(120).trim(),
  description: z.string().max(2000).trim().optional(),
  priceCents: z.number({ required_error: 'Prix requis' }).int().positive('Le prix doit être positif'),
  imageUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  brand: z.string().max(80).trim().optional(),
  category: z.string().max(80).trim().optional(),
  externalProviderUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  active: z.boolean().optional(),
});

const updateProductSchema = productSchema.partial();

const checkoutSchema = z.object({
  quantity: z.number().int().min(1).max(10).optional().default(1),
});

module.exports = { productSchema, updateProductSchema, checkoutSchema };
