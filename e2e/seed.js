#!/usr/bin/env node
/**
 * Jeu de données des tests fonctionnels.
 *
 * Vide la base E2E puis y crée un compte par rôle, avec de quoi dérouler les
 * parcours : un coach vérifié disposant d'une prestation, un particulier, une
 * entreprise abonnée et son collaborateur, un administrateur.
 *
 * ⚠ DESTRUCTIF — protégé par un garde-fou sur le nom de la base.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.e2e'), quiet: true });

if (!/e2e/i.test(process.env.DATABASE_URL || '')) {
  console.error('✗ DATABASE_URL ne cible pas la base e2e. Abandon.');
  process.exit(1);
}

const bcrypt = require(path.resolve(__dirname, '../backend/node_modules/bcryptjs'));
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

const PASSWORD = 'Password1!';

const TABLES = [
  'appointment_status_history', 'payments', 'reviews', 'session_reports',
  'appointments', 'coach_services', 'product_orders', 'products',
  'parq_questionnaires', 'notifications', 'documents', 'company_invites',
  'passkeys', 'coach_photos', 'subscriptions', 'profiles', 'services', 'users',
];

/** Créneau libre à J+`days`, heure ouvrée. */
const slot = (days, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

async function main() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE;`
  );

  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const base = { passwordHash, isActive: true, verificationStatus: 'VERIFIED', acceptedTermsAt: new Date() };

  const admin = await prisma.user.create({
    data: { ...base, email: 'admin@e2e.test', firstName: 'Alice', lastName: 'Admin', role: 'ADMIN' },
  });

  const coach = await prisma.user.create({
    data: {
      ...base, email: 'coach@e2e.test', firstName: 'Marc', lastName: 'Leroy', role: 'INTERVENANT',
      stripeAccountId: 'acct_e2e', stripeAccountStatus: 'active',
      profile: { create: { bio: 'Coach sportif diplômé, 10 ans d\'expérience.', city: 'Le Mans', hourlyRate: 50, courseLocations: ['A domicile', 'En salle'] } },
    },
  });

  const coachSansOffre = await prisma.user.create({
    data: { ...base, email: 'coach2@e2e.test', firstName: 'Sophie', lastName: 'Martin', role: 'INTERVENANT',
      profile: { create: { bio: 'Nutritionniste du sport.', city: 'Paris', hourlyRate: 70 } } },
  });

  const coachEnAttente = await prisma.user.create({
    data: { ...base, email: 'coach-pending@e2e.test', firstName: 'Julien', lastName: 'Blanc',
      role: 'INTERVENANT', verificationStatus: 'PENDING' },
  });

  const entreprise = await prisma.user.create({
    data: { ...base, email: 'rh@e2e.test', firstName: 'Rachel', lastName: 'Hache', role: 'ENTREPRISE',
      companyName: 'ACME Corp', siret: '12345678901234', joinCode: 'ACME2026' },
  });

  await prisma.subscription.create({
    data: {
      userId: entreprise.id, plan: 'ESSENTIEL_ENTREPRISE', billingCycle: 'MONTHLY', status: 'ACTIVE',
      startDate: new Date(Date.now() - 86_400_000), endDate: new Date(Date.now() + 30 * 86_400_000),
    },
  });

  const client = await prisma.user.create({
    data: { ...base, email: 'client@e2e.test', firstName: 'Sarah', lastName: 'Benali', role: 'CLIENT',
      profile: { create: { level: 'INTERMEDIAIRE', sportType: 'Course à pied' } } },
  });

  const salarie = await prisma.user.create({
    data: { ...base, email: 'salarie@e2e.test', firstName: 'Marvin', lastName: 'Dupont', role: 'CLIENT',
      employerCompanyId: entreprise.id },
  });

  const prestation = await prisma.coachService.create({
    data: {
      intervenantId: coach.id, name: 'Coaching personnalisé', description: 'Séance individuelle sur mesure.',
      durationMinutes: 60, price: 50, category: 'SPORT', sessionType: 'SOLO', active: true,
    },
  });

  await prisma.coachService.create({
    data: { intervenantId: coach.id, name: 'Renforcement musculaire', durationMinutes: 45,
      price: 40, category: 'SPORT', sessionType: 'SOLO', active: true },
  });

  // Questionnaire médical déjà validé pour le salarié : son parcours de
  // réservation ne repasse pas par la modale PARQ. Le particulier, lui, la
  // rencontrera — les deux cas sont ainsi couverts.
  const { encryptJson } = require(path.resolve(__dirname, '../backend/src/utils/encryption'));
  await prisma.pARQQuestionnaire.create({
    data: {
      userId: salarie.id,
      answers: encryptJson({
        heartCondition: false, chestPain: false, dizziness: false, jointProblems: false,
        bloodPressureMeds: false, otherMedicalReason: false, pregnancy: false,
      }),
      hasRisk: false, coachCleared: false, expiresAt: new Date(Date.now() + 300 * 86_400_000),
    },
  });

  // Un rendez-vous déjà confirmé pour le particulier : permet de tester
  // l'agenda du coach et l'annulation sans passer par la réservation.
  const { randomUUID } = require('crypto');
  await prisma.appointment.create({
    data: {
      clientId: client.id, intervenantId: coach.id, coachServiceId: prestation.id,
      scheduledAt: slot(10, 14), durationMinutes: 60, status: 'CONFIRMED',
      paymentStatus: 'unpaid', qrToken: randomUUID(),
    },
  });

  console.log('✓ Jeu de données E2E créé');
  console.table([
    { role: 'ADMIN', email: admin.email },
    { role: 'INTERVENANT (vérifié, 2 prestations)', email: coach.email },
    { role: 'INTERVENANT (sans prestation)', email: coachSansOffre.email },
    { role: 'INTERVENANT (en attente de validation)', email: coachEnAttente.email },
    { role: 'ENTREPRISE (abonnée Essentiel)', email: entreprise.email },
    { role: 'CLIENT particulier (sans PARQ)', email: client.email },
    { role: 'CLIENT salarié (PARQ validé)', email: salarie.email },
  ]);
  console.log(`Mot de passe commun : ${PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
