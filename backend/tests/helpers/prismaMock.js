/**
 * Fabrique un double de test complet du client Prisma.
 *
 * Chaque modèle expose toutes les méthodes utilisées par le code métier, avec
 * une valeur de retour par défaut cohérente avec l'API Prisma (findMany → [],
 * count → 0, findUnique → null…). Sans ces valeurs par défaut, un service qui
 * appelle une méthode non explicitement stubée planterait sur `undefined`
 * plutôt que d'échouer sur l'assertion métier que l'on veut tester.
 *
 * Usage :
 *   jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
 *   const prisma = require('../../src/config/database');
 */

const MODELS = [
  'user',
  'profile',
  'service',
  'coachService',
  'appointment',
  'appointmentStatusHistory',
  'subscription',
  'sessionReport',
  'payment',
  'review',
  'notification',
  'document',
  'companyInvite',
  'passkey',
  'pARQQuestionnaire',
  'product',
  'productOrder',
  'coachPhoto',
];

// Valeur par défaut par méthode Prisma (ce que renvoie le vrai client quand
// rien ne correspond).
const DEFAULTS = {
  findUnique: () => null,
  findFirst: () => null,
  findMany: () => [],
  count: () => 0,
  create: () => undefined,
  createMany: () => ({ count: 0 }),
  update: () => undefined,
  updateMany: () => ({ count: 0 }),
  upsert: () => undefined,
  delete: () => undefined,
  deleteMany: () => ({ count: 0 }),
  groupBy: () => [],
  aggregate: () => ({ _avg: {}, _count: {}, _sum: {} }),
};

const createModelMock = () =>
  Object.fromEntries(
    Object.entries(DEFAULTS).map(([method, defaultValue]) => [
      method,
      jest.fn().mockResolvedValue(defaultValue()),
    ])
  );

const createPrismaMock = () => {
  const prisma = Object.fromEntries(MODELS.map((m) => [m, createModelMock()]));

  // $transaction accepte soit un tableau de promesses, soit un callback.
  prisma.$transaction = jest.fn(async (arg) =>
    typeof arg === 'function' ? arg(prisma) : Promise.all(arg)
  );
  prisma.$executeRawUnsafe = jest.fn().mockResolvedValue(0);
  prisma.$queryRaw = jest.fn().mockResolvedValue([]);
  prisma.$connect = jest.fn().mockResolvedValue(undefined);
  prisma.$disconnect = jest.fn().mockResolvedValue(undefined);

  return prisma;
};

/** Double de test du client Redis (même surface que ioredis + MemoryStore). */
const createRedisMock = () => ({
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
});

/**
 * Double de test de config/stripe (qui exporte la fonction getStripe).
 * L'objet Stripe simulé est stable d'un appel à l'autre, donc un test peut
 * faire `getStripe().refunds.create.mockResolvedValue(...)`.
 */
const createStripeMock = () => {
  const stripe = {
    refunds: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn(), retrieve: jest.fn() } },
    accounts: { create: jest.fn(), retrieve: jest.fn() },
    accountLinks: { create: jest.fn() },
    paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
  };
  return jest.fn(() => stripe);
};

/** Double de test de config/email (surface Resend utilisée par le code). */
const createEmailMock = () => ({
  emails: { send: jest.fn().mockResolvedValue({ id: 'email_test' }) },
});

module.exports = { createPrismaMock, createRedisMock, createStripeMock, createEmailMock, MODELS };

/**
 * Réinstalle les valeurs de retour par défaut sur un double existant.
 *
 * `clearMocks` (jest.config.js) remet à zéro les APPELS enregistrés mais
 * conserve les implémentations : un `mockRejectedValue` posé par un test
 * contaminerait donc tous les suivants. Les fichiers de test appellent ces
 * fonctions dans un `beforeEach` pour repartir d'un état propre.
 */
const resetPrismaDefaults = (prisma) => {
  for (const model of MODELS) {
    for (const [method, defaultValue] of Object.entries(DEFAULTS)) {
      prisma[model][method].mockResolvedValue(defaultValue());
    }
  }
  prisma.$transaction.mockImplementation(async (arg) =>
    typeof arg === 'function' ? arg(prisma) : Promise.all(arg)
  );
};

const resetRedisDefaults = (redis) => {
  redis.set.mockResolvedValue('OK');
  redis.get.mockResolvedValue(null);
  redis.del.mockResolvedValue(1);
  redis.expire.mockResolvedValue(1);
};

const resetEmailDefaults = (email) => {
  email.emails.send.mockResolvedValue({ id: 'email_test' });
};

const resetStripeDefaults = (getStripe) => {
  const s = getStripe();
  for (const group of Object.values(s)) {
    for (const fn of Object.values(group)) {
      if (typeof fn?.mockReset === 'function') fn.mockReset();
      else if (fn && typeof fn === 'object') {
        for (const nested of Object.values(fn)) nested?.mockReset?.();
      }
    }
  }
};

module.exports.resetPrismaDefaults = resetPrismaDefaults;
module.exports.resetRedisDefaults = resetRedisDefaults;
module.exports.resetEmailDefaults = resetEmailDefaults;
module.exports.resetStripeDefaults = resetStripeDefaults;
