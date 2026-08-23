/**
 * Constructeurs d'objets de test. Chaque fabrique produit un objet plausible
 * et complet ; les tests n'y surchargent que le champ qui les intéresse, ce
 * qui rend l'intention de chaque cas immédiatement lisible.
 */

/** Date locale, pour que les contrôles d'horaires ouvrés (getHours) soient déterministes. */
const at = (year, month, day, hour, minute = 0) => new Date(year, month - 1, day, hour, minute, 0, 0);

/** Dans N heures — utilisé pour les paliers d'annulation. */
const inHours = (h) => new Date(Date.now() + h * 3_600_000);

const client = (over = {}) => ({
  id: 100, email: 'client@test.fr', role: 'CLIENT', firstName: 'Sarah', lastName: 'Benali',
  isActive: true, employerCompanyId: null, ...over,
});

const intervenant = (over = {}) => ({
  id: 200, email: 'coach@test.fr', role: 'INTERVENANT', firstName: 'Marc', lastName: 'Leroy',
  isActive: true, verificationStatus: 'VERIFIED',
  stripeAccountId: 'acct_test', stripeAccountStatus: 'active', ...over,
});

const company = (over = {}) => ({
  id: 300, email: 'rh@acme.fr', role: 'ENTREPRISE', firstName: 'ACME', lastName: 'Corp',
  companyName: 'ACME Corp', isActive: true, subscriptions: [], ...over,
});

const subscription = (over = {}) => ({
  id: 1, userId: 300, plan: 'ESSENTIEL_ENTREPRISE', billingCycle: 'MONTHLY',
  status: 'ACTIVE', startDate: new Date('2026-01-01'), endDate: new Date('2027-01-01'), ...over,
});

const coachService = (over = {}) => ({
  id: 10, intervenantId: 200, name: 'Coaching personnalisé', durationMinutes: 60,
  price: 50, category: 'SPORT', sessionType: 'SOLO', active: true, ...over,
});

const platformService = (over = {}) => ({
  id: 20, name: 'Atelier posture', durationMinutes: 60, price: 40,
  category: 'BIENETRE', isActive: true, availableInPlans: [], ...over,
});

const appointment = (over = {}) => ({
  id: 1, clientId: 100, intervenantId: 200, serviceId: null, coachServiceId: 10,
  scheduledAt: at(2026, 9, 15, 10), durationMinutes: 60, status: 'CONFIRMED',
  paymentStatus: 'unpaid', coveredByCompany: false, qrToken: 'a1b2c3d4-1111-2222-3333-444455556666',
  validatedByQr: false, attendanceStatus: null, disputeStatus: null,
  createdAt: new Date(), notes: null, ...over,
});

/** Rendez-vous tel que renvoyé par prisma.appointment.create (avec ses `include`). */
const createdAppointment = (over = {}) => ({
  ...appointment(over),
  service: null,
  coachService: { name: 'Coaching personnalisé', price: 50, durationMinutes: 60, category: 'SPORT' },
  intervenant: { firstName: 'Marc', lastName: 'Leroy' },
  client: { firstName: 'Sarah', lastName: 'Benali', employerCompanyId: null, employerCompany: null },
  ...over,
});

const payment = (over = {}) => ({
  id: 'pay_1', appointmentId: 1, stripePaymentIntentId: 'pi_test_123',
  amount: 5000, platformFee: 1500, intervenantShare: 3500,
  currency: 'eur', status: 'succeeded', refundAmount: null, ...over,
});

/**
 * Câble prisma.user.findUnique pour répondre selon `where.id` ou `where.email`
 * — le service interroge plusieurs utilisateurs différents dans un même appel
 * (intervenant, client, entreprise employeuse).
 */
const mockUsers = (prisma, users) => {
  prisma.user.findUnique.mockImplementation(async ({ where }) => {
    const found = users.find(
      (u) =>
        (where.id !== undefined && u.id === where.id) ||
        (where.email !== undefined && u.email === where.email) ||
        (where.joinCode !== undefined && u.joinCode === where.joinCode)
    );
    return found || null;
  });
};

module.exports = {
  at, inHours, client, intervenant, company, subscription,
  coachService, platformService, appointment, createdAppointment, payment, mockUsers,
};
