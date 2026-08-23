/**
 * Raccourci à appeler dans un `beforeEach` : remet les doubles d'infrastructure
 * dans leur état par défaut, quelles que soient les implémentations posées par
 * le test précédent.
 *
 *   const reset = require('../helpers/resetMocks');
 *   beforeEach(() => reset({ prisma, redis, email, getStripe }));
 */
const {
  resetPrismaDefaults, resetRedisDefaults, resetEmailDefaults, resetStripeDefaults,
} = require('./prismaMock');

module.exports = ({ prisma, redis, email, getStripe } = {}) => {
  if (prisma) resetPrismaDefaults(prisma);
  if (redis) resetRedisDefaults(redis);
  if (email) resetEmailDefaults(email);
  if (getStripe) resetStripeDefaults(getStripe);
};
