const { registerSchema, loginSchema, refreshSchema } = require('../../src/validators/auth.validator');
const { createAppointmentSchema, updateStatusSchema, validateQrSchema, disputeSchema, resolveDisputeSchema } = require('../../src/validators/appointment.validator');
const { createCoachServiceSchema } = require('../../src/validators/coachService.validator');
const { createReviewSchema, replyReviewSchema } = require('../../src/validators/review.validator');
const { parqAnswersSchema, submitQuestionnaireSchema } = require('../../src/validators/parq.validator');
const { createSubscriptionSchema } = require('../../src/validators/subscription.validator');
const { productSchema, checkoutSchema } = require('../../src/validators/product.validator');
const { updateProfileSchema } = require('../../src/validators/user.validator');

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString();
const validRegister = {
  email: 'Marc.Leroy@Email.com',
  password: 'Password1!',
  firstName: 'Marc',
  lastName: 'Leroy',
  role: 'CLIENT',
};

describe('validators/auth — inscription', () => {
  it('accepte une inscription minimale valide', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });

  it('normalise l\'email en minuscules', () => {
    const parsed = registerSchema.parse({ ...validRegister, email: 'Marc.Leroy@Email.COM' });
    expect(parsed.email).toBe('marc.leroy@email.com');
  });

  it('trim les nom et prénom', () => {
    const parsed = registerSchema.parse({ ...validRegister, firstName: '  Marc  ', lastName: ' Leroy ' });
    expect(parsed).toMatchObject({ firstName: 'Marc', lastName: 'Leroy' });
  });

  // Test de caractérisation. Dans le schéma, `.email()` est chaîné AVANT
  // `.trim()`, donc la validation porte sur la chaîne brute : un email
  // copié-collé avec un espace parasite est refusé en 400 au lieu d'être
  // nettoyé. Ce test fige le comportement réel et échouera si l'ordre des
  // transformations est corrigé en `.trim().toLowerCase().email()`.
  it('refuse un email entouré d\'espaces (trim appliqué après la validation)', () => {
    expect(registerSchema.safeParse({ ...validRegister, email: '  marc@email.com  ' }).success).toBe(false);
  });

  describe('politique de mot de passe', () => {
    it.each([
      ['trop court',      'Pass1',      'Minimum 8 caracteres'],
      ['sans majuscule',  'password1',  'Au moins une majuscule'],
      ['sans chiffre',    'Password',   'Au moins un chiffre'],
    ])('refuse un mot de passe %s', (_label, password, expectedMessage) => {
      const result = registerSchema.safeParse({ ...validRegister, password });
      expect(result.success).toBe(false);
      expect(result.error.issues.map((i) => i.message)).toContain(expectedMessage);
    });

    it('accepte un mot de passe conforme de 8 caractères exactement', () => {
      expect(registerSchema.safeParse({ ...validRegister, password: 'Passwo1d' }).success).toBe(true);
    });
  });

  it('refuse un email mal formé', () => {
    expect(registerSchema.safeParse({ ...validRegister, email: 'pas-un-email' }).success).toBe(false);
  });

  it('refuse le rôle ADMIN (non ouvert à l\'inscription publique)', () => {
    expect(registerSchema.safeParse({ ...validRegister, role: 'ADMIN' }).success).toBe(false);
  });

  it.each(['CLIENT', 'INTERVENANT', 'ENTREPRISE'])('accepte le rôle %s', (role) => {
    expect(registerSchema.safeParse({ ...validRegister, role }).success).toBe(true);
  });

  it('exige exactement 14 chiffres pour le SIRET', () => {
    expect(registerSchema.safeParse({ ...validRegister, role: 'ENTREPRISE', siret: '12345678901234' }).success).toBe(true);
    expect(registerSchema.safeParse({ ...validRegister, role: 'ENTREPRISE', siret: '123' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...validRegister, role: 'ENTREPRISE', siret: 'abcdefghijklmn' }).success).toBe(false);
  });

  it('accepte le questionnaire d\'onboarding optionnel', () => {
    const result = registerSchema.safeParse({
      ...validRegister,
      level: 'INTERMEDIAIRE',
      sportType: 'Course à pied',
      objectives: ['Perdre du poids', 'Gagner en endurance'],
    });
    expect(result.success).toBe(true);
  });

  it('limite les objectifs à 10 entrées', () => {
    const objectives = Array.from({ length: 11 }, (_, i) => `objectif ${i}`);
    expect(registerSchema.safeParse({ ...validRegister, objectives }).success).toBe(false);
  });

  it('refuse un niveau hors énumération', () => {
    expect(registerSchema.safeParse({ ...validRegister, level: 'DIEU' }).success).toBe(false);
  });
});

describe('validators/auth — connexion et rafraîchissement', () => {
  it('accepte email + mot de passe', () => {
    expect(loginSchema.safeParse({ email: 'a@b.fr', password: 'x' }).success).toBe(true);
  });

  it('refuse un email invalide même avec un mot de passe présent', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });

  it('refuse un mot de passe absent', () => {
    expect(loginSchema.safeParse({ email: 'a@b.fr' }).success).toBe(false);
  });

  it('exige un refreshToken', () => {
    expect(refreshSchema.safeParse({}).success).toBe(false);
    expect(refreshSchema.safeParse({ refreshToken: 'jwt' }).success).toBe(true);
  });
});

describe('validators/appointment — création', () => {
  const valid = { intervenantId: 1, coachServiceId: 2, scheduledAt: tomorrow() };

  it('accepte une réservation valide sur un CoachService', () => {
    expect(createAppointmentSchema.safeParse(valid).success).toBe(true);
  });

  it('accepte une réservation sur un Service plateforme (legacy B2B)', () => {
    expect(createAppointmentSchema.safeParse({ intervenantId: 1, serviceId: 5, scheduledAt: tomorrow() }).success).toBe(true);
  });

  it('refuse une réservation sans aucun service', () => {
    expect(createAppointmentSchema.safeParse({ intervenantId: 1, scheduledAt: tomorrow() }).success).toBe(false);
  });

  it('refuse une date dans le passé', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const result = createAppointmentSchema.safeParse({ ...valid, scheduledAt: past });
    expect(result.success).toBe(false);
    expect(result.error.issues.map((i) => i.message)).toContain('Le RDV doit etre dans le futur');
  });

  it('refuse une date hors format ISO 8601', () => {
    expect(createAppointmentSchema.safeParse({ ...valid, scheduledAt: '25/12/2026' }).success).toBe(false);
  });

  it('refuse un identifiant d\'intervenant négatif ou décimal', () => {
    expect(createAppointmentSchema.safeParse({ ...valid, intervenantId: -1 }).success).toBe(false);
    expect(createAppointmentSchema.safeParse({ ...valid, intervenantId: 1.5 }).success).toBe(false);
  });

  it('limite les notes à 500 caractères', () => {
    expect(createAppointmentSchema.safeParse({ ...valid, notes: 'a'.repeat(500) }).success).toBe(true);
    expect(createAppointmentSchema.safeParse({ ...valid, notes: 'a'.repeat(501) }).success).toBe(false);
  });
});

describe('validators/appointment — statut, QR et litiges', () => {
  it.each(['CONFIRMED', 'CANCELLED', 'DONE'])('accepte le statut %s', (status) => {
    expect(updateStatusSchema.safeParse({ status }).success).toBe(true);
  });

  it('refuse un retour à PENDING (statut non transmissible par l\'API)', () => {
    expect(updateStatusSchema.safeParse({ status: 'PENDING' }).success).toBe(false);
  });

  it('exige au moins 8 caractères pour un code QR', () => {
    expect(validateQrSchema.safeParse({ code: '1234567' }).success).toBe(false);
    expect(validateQrSchema.safeParse({ code: '12345678' }).success).toBe(true);
  });

  it('trim le code QR avant de vérifier sa longueur', () => {
    expect(validateQrSchema.parse({ code: '  a1b2c3d4  ' }).code).toBe('a1b2c3d4');
  });

  it('exige un motif de litige entre 10 et 500 caractères', () => {
    expect(disputeSchema.safeParse({ reason: 'trop court' .slice(0, 5) }).success).toBe(false);
    expect(disputeSchema.safeParse({ reason: 'J\'étais bien présent à la séance' }).success).toBe(true);
    expect(disputeSchema.safeParse({ reason: 'a'.repeat(501) }).success).toBe(false);
  });

  it.each(['REJECTED', 'RESOLVED_CLIENT'])('accepte la résolution %s', (resolution) => {
    expect(resolveDisputeSchema.safeParse({ resolution }).success).toBe(true);
  });

  it('refuse une résolution inventée', () => {
    expect(resolveDisputeSchema.safeParse({ resolution: 'RESOLVED_COACH' }).success).toBe(false);
  });
});

describe('validators/coachService', () => {
  const valid = { name: 'Coaching perso', durationMinutes: 60, price: 50, category: 'SPORT' };

  it('accepte une prestation valide et applique SOLO par défaut', () => {
    expect(createCoachServiceSchema.parse(valid).sessionType).toBe('SOLO');
  });

  it.each([15, 30, 45, 60, 90, 120])('accepte la durée %i min', (durationMinutes) => {
    expect(createCoachServiceSchema.safeParse({ ...valid, durationMinutes }).success).toBe(true);
  });

  it.each([10, 50, 75, 180])('refuse la durée non standard %i min', (durationMinutes) => {
    expect(createCoachServiceSchema.safeParse({ ...valid, durationMinutes }).success).toBe(false);
  });

  it('refuse un prix nul ou négatif', () => {
    expect(createCoachServiceSchema.safeParse({ ...valid, price: 0 }).success).toBe(false);
    expect(createCoachServiceSchema.safeParse({ ...valid, price: -10 }).success).toBe(false);
  });

  it.each(['SPORT', 'NUTRITION', 'MENTAL', 'BIENETRE'])('accepte la catégorie %s', (category) => {
    expect(createCoachServiceSchema.safeParse({ ...valid, category }).success).toBe(true);
  });

  it('refuse une catégorie inconnue', () => {
    expect(createCoachServiceSchema.safeParse({ ...valid, category: 'YOGA' }).success).toBe(false);
  });

  it('borne maxParticipants entre 1 et 50', () => {
    expect(createCoachServiceSchema.safeParse({ ...valid, maxParticipants: 0 }).success).toBe(false);
    expect(createCoachServiceSchema.safeParse({ ...valid, maxParticipants: 51 }).success).toBe(false);
    expect(createCoachServiceSchema.safeParse({ ...valid, maxParticipants: 8 }).success).toBe(true);
  });
});

describe('validators/review', () => {
  it('borne la note entre 1 et 5', () => {
    expect(createReviewSchema.safeParse({ appointmentId: 1, rating: 0 }).success).toBe(false);
    expect(createReviewSchema.safeParse({ appointmentId: 1, rating: 6 }).success).toBe(false);
    expect(createReviewSchema.safeParse({ appointmentId: 1, rating: 5 }).success).toBe(true);
  });

  it('refuse une note décimale', () => {
    expect(createReviewSchema.safeParse({ appointmentId: 1, rating: 4.5 }).success).toBe(false);
  });

  it('refuse une réponse coach vide ou uniquement des espaces', () => {
    expect(replyReviewSchema.safeParse({ reply: '   ' }).success).toBe(false);
  });

  it('limite la réponse coach à 1000 caractères', () => {
    expect(replyReviewSchema.safeParse({ reply: 'a'.repeat(1001) }).success).toBe(false);
  });
});

describe('validators/parq — les 7 questions médicales', () => {
  const answers = {
    heartCondition: false, chestPain: false, dizziness: false, jointProblems: false,
    bloodPressureMeds: false, otherMedicalReason: false, pregnancy: false,
  };

  it('accepte les 7 réponses booléennes', () => {
    expect(parqAnswersSchema.safeParse(answers).success).toBe(true);
  });

  it.each(Object.keys(answers))('exige la question %s', (key) => {
    const { [key]: _omitted, ...incomplete } = answers;
    expect(parqAnswersSchema.safeParse(incomplete).success).toBe(false);
  });

  it('refuse une réponse non booléenne (pas de "oui"/"non" en chaîne)', () => {
    expect(parqAnswersSchema.safeParse({ ...answers, chestPain: 'oui' }).success).toBe(false);
  });

  it('exige l\'enveloppe { answers } pour la soumission', () => {
    expect(submitQuestionnaireSchema.safeParse(answers).success).toBe(false);
    expect(submitQuestionnaireSchema.safeParse({ answers }).success).toBe(true);
  });
});

describe('validators/subscription & product', () => {
  it('applique MONTHLY par défaut au cycle de facturation', () => {
    expect(createSubscriptionSchema.parse({ plan: 'BOOST_ENTREPRISE' }).billingCycle).toBe('MONTHLY');
  });

  it.each(['ESSENTIEL_ENTREPRISE', 'BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE'])('accepte le plan %s', (plan) => {
    expect(createSubscriptionSchema.safeParse({ plan }).success).toBe(true);
  });

  it('refuse un plan particulier sur l\'offre entreprise', () => {
    expect(createSubscriptionSchema.safeParse({ plan: 'ESSENTIELLE' }).success).toBe(false);
  });

  it('exige un prix produit entier et positif (centimes)', () => {
    expect(productSchema.safeParse({ name: 'Tapis', priceCents: 0 }).success).toBe(false);
    expect(productSchema.safeParse({ name: 'Tapis', priceCents: 19.9 }).success).toBe(false);
    expect(productSchema.safeParse({ name: 'Tapis', priceCents: 1990 }).success).toBe(true);
  });

  it('accepte une imageUrl vide ou une URL valide, refuse une chaîne quelconque', () => {
    expect(productSchema.safeParse({ name: 'Tapis', priceCents: 100, imageUrl: '' }).success).toBe(true);
    expect(productSchema.safeParse({ name: 'Tapis', priceCents: 100, imageUrl: 'https://a.fr/x.png' }).success).toBe(true);
    expect(productSchema.safeParse({ name: 'Tapis', priceCents: 100, imageUrl: 'pas-une-url' }).success).toBe(false);
  });

  it('applique une quantité de 1 par défaut au checkout et la borne à 10', () => {
    expect(checkoutSchema.parse({}).quantity).toBe(1);
    expect(checkoutSchema.safeParse({ quantity: 11 }).success).toBe(false);
  });
});

describe('validators/user — mise à jour de profil', () => {
  it('accepte une mise à jour partielle', () => {
    expect(updateProfileSchema.safeParse({ firstName: 'Marc' }).success).toBe(true);
  });

  it('refuse un prénom de moins de 2 caractères', () => {
    expect(updateProfileSchema.safeParse({ firstName: 'M' }).success).toBe(false);
  });

  it('borne l\'expérience du coach entre 0 et 50 ans', () => {
    expect(updateProfileSchema.safeParse({ profile: { experience: 51 } }).success).toBe(false);
    expect(updateProfileSchema.safeParse({ profile: { experience: 0 } }).success).toBe(true);
  });

  it('refuse un tarif horaire négatif', () => {
    expect(updateProfileSchema.safeParse({ profile: { hourlyRate: -5 } }).success).toBe(false);
  });

  it('accepte gender à null (remise à zéro du champ)', () => {
    expect(updateProfileSchema.safeParse({ gender: null }).success).toBe(true);
  });
});
