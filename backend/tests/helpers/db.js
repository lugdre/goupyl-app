/**
 * Utilitaires des tests d'intégration : nettoyage de la base et fabriques de
 * données réellement persistées.
 *
 * Chaque test part d'une base vide (`resetDatabase` dans un beforeEach) : les
 * tests sont ainsi indépendants de leur ordre d'exécution, condition sans
 * laquelle une suite d'intégration devient rapidement ingérable.
 */
const bcrypt = require('bcryptjs');
const prisma = require('../../src/config/database');

// TRUNCATE ... CASCADE lève d'un coup toutes les contraintes de clés
// étrangères : pas d'ordre de suppression à maintenir, contrairement au seed.
const TABLES = [
  'appointment_status_history', 'payments', 'reviews', 'session_reports',
  'appointments', 'coach_services', 'product_orders', 'products',
  'parq_questionnaires', 'notifications', 'documents', 'company_invites',
  'passkeys', 'coach_photos', 'subscriptions', 'profiles', 'services', 'users',
];

const resetDatabase = async () => {
  // Garde-fou redondant avec env.integration.js : ce module TRONQUE des tables.
  if (!/test/i.test(process.env.DATABASE_URL || '')) {
    throw new Error('resetDatabase refuse de s\'exécuter hors base de test.');
  }
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`
  );
};

const disconnect = () => prisma.$disconnect();

// Coût bcrypt réduit : la robustesse du hachage est vérifiée en test unitaire,
// ici on ne veut pas payer 12 tours à chaque fixture.
const PASSWORD = 'Password1!';
let cachedHash = null;
const passwordHash = async () => {
  if (!cachedHash) cachedHash = await bcrypt.hash(PASSWORD, 4);
  return cachedHash;
};

let sequence = 0;
const uniqueEmail = (prefix) => `${prefix}.${Date.now()}.${sequence++}@test.fr`;

const createUser = async (over = {}) => {
  const { profile, ...rest } = over;
  return prisma.user.create({
    data: {
      email: over.email || uniqueEmail(over.role?.toLowerCase() || 'user'),
      passwordHash: await passwordHash(),
      firstName: 'Test',
      lastName: 'Utilisateur',
      role: 'CLIENT',
      verificationStatus: 'VERIFIED',
      isActive: true,
      ...rest,
      ...(profile && { profile: { create: profile } }),
    },
  });
};

const createClient = (over = {}) => createUser({ role: 'CLIENT', ...over });

const createIntervenant = (over = {}) =>
  createUser({
    role: 'INTERVENANT',
    verificationStatus: 'VERIFIED',
    stripeAccountId: 'acct_test',
    stripeAccountStatus: 'active',
    ...over,
  });

const createCompany = (over = {}) =>
  createUser({
    role: 'ENTREPRISE',
    companyName: 'ACME Corp',
    joinCode: over.joinCode || `CODE${String(sequence++).padStart(4, '0')}`,
    ...over,
  });

const createAdmin = (over = {}) => createUser({ role: 'ADMIN', ...over });

const createCoachService = (intervenantId, over = {}) =>
  prisma.coachService.create({
    data: {
      intervenantId,
      name: 'Coaching personnalisé',
      durationMinutes: 60,
      price: 50,
      category: 'SPORT',
      sessionType: 'SOLO',
      active: true,
      ...over,
    },
  });

const createSubscription = (userId, over = {}) =>
  prisma.subscription.create({
    data: {
      userId,
      plan: 'ESSENTIEL_ENTREPRISE',
      billingCycle: 'MONTHLY',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 86_400_000),
      endDate: new Date(Date.now() + 30 * 86_400_000),
      ...over,
    },
  });

const createAppointment = ({ clientId, intervenantId, coachServiceId, ...over }) =>
  prisma.appointment.create({
    data: {
      clientId,
      intervenantId,
      coachServiceId,
      scheduledAt: over.scheduledAt || new Date(Date.now() + 3 * 86_400_000),
      durationMinutes: 60,
      status: 'PENDING',
      qrToken: require('crypto').randomUUID(),
      ...over,
    },
  });

/** Date locale à J+`days`, à l'heure voulue — respecte les horaires ouvrés. */
const futureSlot = (days, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

module.exports = {
  prisma, resetDatabase, disconnect, PASSWORD, uniqueEmail,
  createUser, createClient, createIntervenant, createCompany, createAdmin,
  createCoachService, createSubscription, createAppointment, futureSlot,
};
