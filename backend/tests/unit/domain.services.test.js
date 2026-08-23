jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());

const prisma = require('../../src/config/database');
const reviewService = require('../../src/services/review.service');
const parqService = require('../../src/services/parq.service');
const sessionReportService = require('../../src/services/sessionReport.service');
const subscriptionService = require('../../src/services/subscription.service');
const coachServiceService = require('../../src/services/coachService.service');
const notificationService = require('../../src/services/notification.service');
const serviceService = require('../../src/services/service.service');
const { decryptJson } = require('../../src/utils/encryption');
const F = require('../helpers/fixtures');
const resetMocks = require('../helpers/resetMocks');

beforeEach(() => resetMocks({ prisma }));

const CLIENT_ID = 100;
const COACH_ID = 200;

describe('review.service.createReview — dépôt d\'avis', () => {
  const arrange = (over = {}) => {
    prisma.appointment.findUnique.mockResolvedValue({
      ...F.appointment({ status: 'DONE' }),
      review: null,
      client: { firstName: 'Sarah', lastName: 'Benali' },
      ...over,
    });
    prisma.review.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
  };

  it('crée l\'avis en le rattachant au coach de la séance', async () => {
    arrange();

    const review = await reviewService.createReview(CLIENT_ID, { appointmentId: 1, rating: 5, comment: 'Parfait' });

    expect(review).toMatchObject({ appointmentId: 1, clientId: CLIENT_ID, intervenantId: COACH_ID, rating: 5 });
  });

  it('normalise un commentaire absent en null plutôt qu\'en undefined', async () => {
    arrange();

    await reviewService.createReview(CLIENT_ID, { appointmentId: 1, rating: 4 });

    expect(prisma.review.create.mock.calls[0][0].data.comment).toBeNull();
  });

  it.each(['PENDING', 'CONFIRMED', 'CANCELLED'])('refuse un avis sur une séance %s', async (status) => {
    arrange({ status });

    await expect(
      reviewService.createReview(CLIENT_ID, { appointmentId: 1, rating: 5 })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'NOT_DONE' });
  });

  it('refuse un second avis sur la même séance', async () => {
    arrange({ review: { id: 7 } });

    await expect(
      reviewService.createReview(CLIENT_ID, { appointmentId: 1, rating: 5 })
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'REVIEW_EXISTS' });
  });

  it('refuse à un client de noter la séance d\'un autre', async () => {
    arrange();

    await expect(
      reviewService.createReview(999, { appointmentId: 1, rating: 5 })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('renvoie 404 pour une séance inexistante', async () => {
    prisma.appointment.findUnique.mockResolvedValue(null);

    await expect(
      reviewService.createReview(CLIENT_ID, { appointmentId: 999, rating: 5 })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('notifie le coach avec la note en étoiles', async () => {
    arrange();

    await reviewService.createReview(CLIENT_ID, { appointmentId: 1, rating: 4, comment: 'Très bien' });

    expect(prisma.notification.create.mock.calls[0][0].data).toMatchObject({
      userId: COACH_ID, type: 'NEW_REVIEW', body: expect.stringContaining('★★★★☆'),
    });
  });
});

describe('review.service.replyToReview — droit de réponse du coach', () => {
  const arrange = (over = {}) => {
    prisma.review.findUnique.mockResolvedValue({ id: 1, intervenantId: COACH_ID, coachReply: null, coachReplyEdits: 0, ...over });
    prisma.review.update.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
  };

  it('enregistre la première réponse sans compter de modification', async () => {
    arrange();

    await reviewService.replyToReview(COACH_ID, 1, 'Merci pour votre retour !');

    const { data } = prisma.review.update.mock.calls[0][0];
    expect(data).toMatchObject({ coachReply: 'Merci pour votre retour !', coachRepliedAt: expect.any(Date) });
    expect(data.coachReplyEdits).toBeUndefined();
  });

  it.each([0, 1, 2])('incrémente le compteur à la modification n°%i', async (edits) => {
    arrange({ coachReply: 'Ancienne réponse', coachReplyEdits: edits });

    await reviewService.replyToReview(COACH_ID, 1, 'Nouvelle réponse');

    expect(prisma.review.update.mock.calls[0][0].data.coachReplyEdits).toEqual({ increment: 1 });
  });

  it('bloque la 4e modification (limite de 3)', async () => {
    arrange({ coachReply: 'Réponse', coachReplyEdits: 3 });

    await expect(
      reviewService.replyToReview(COACH_ID, 1, 'Encore une')
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'REPLY_EDIT_LIMIT' });
  });

  it('refuse à un coach de répondre à l\'avis d\'un confrère', async () => {
    arrange({ intervenantId: 999 });

    await expect(reviewService.replyToReview(COACH_ID, 1, 'Réponse')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('renvoie 404 pour un avis inexistant', async () => {
    prisma.review.findUnique.mockResolvedValue(null);

    await expect(reviewService.replyToReview(COACH_ID, 999, 'Réponse')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('review.service.getIntervenantReviews — agrégat public du coach', () => {
  it('renvoie un objet {reviews, averageRating, reviewCount, totalSessions}, pas un tableau', async () => {
    prisma.review.findMany.mockResolvedValue([{ rating: 5 }, { rating: 4 }]);
    prisma.appointment.count.mockResolvedValue(30);

    const result = await reviewService.getIntervenantReviews(COACH_ID);

    expect(Array.isArray(result)).toBe(false);
    expect(result).toMatchObject({ averageRating: 4.5, reviewCount: 2, totalSessions: 30 });
  });

  it('arrondit la moyenne à une décimale', async () => {
    prisma.review.findMany.mockResolvedValue([{ rating: 5 }, { rating: 4 }, { rating: 4 }]);

    expect((await reviewService.getIntervenantReviews(COACH_ID)).averageRating).toBe(4.3);
  });

  it('renvoie une moyenne nulle et non NaN sans aucun avis', async () => {
    prisma.review.findMany.mockResolvedValue([]);

    expect(await reviewService.getIntervenantReviews(COACH_ID)).toMatchObject({ averageRating: null, reviewCount: 0 });
  });

  it('ne compte que les séances effectivement réalisées', async () => {
    await reviewService.getIntervenantReviews(COACH_ID);

    expect(prisma.appointment.count.mock.calls[0][0].where).toEqual({ intervenantId: COACH_ID, status: 'DONE' });
  });

  it('refuse à un client de lire l\'avis d\'un autre', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 1, clientId: 999 });

    await expect(reviewService.getReviewByAppointment(1, CLIENT_ID)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuse à un coach de lire l\'avis déposé sur un confrère', async () => {
    prisma.review.findUnique.mockResolvedValue({ id: 1, intervenantId: 999 });

    await expect(reviewService.getReviewForAppointment(1, COACH_ID)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('parq.service — questionnaire médical chiffré', () => {
  const noRisk = {
    heartCondition: false, chestPain: false, dizziness: false, jointProblems: false,
    bloodPressureMeds: false, otherMedicalReason: false, pregnancy: false,
  };
  const withRisk = { ...noRisk, chestPain: true };

  describe('soumission', () => {
    it('chiffre les réponses avant de les persister — jamais de clair en base', async () => {
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue(null);
      prisma.pARQQuestionnaire.create.mockImplementation(async ({ data }) => data);

      await parqService.submitQuestionnaire(CLIENT_ID, noRisk);

      const stored = prisma.pARQQuestionnaire.create.mock.calls[0][0].data.answers;
      expect(typeof stored).toBe('string');
      expect(stored).not.toContain('heartCondition');
      expect(decryptJson(stored)).toEqual(noRisk);
    });

    it('détecte un risque dès qu\'une réponse est « oui »', async () => {
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue(null);
      prisma.pARQQuestionnaire.create.mockImplementation(async ({ data }) => data);

      await parqService.submitQuestionnaire(CLIENT_ID, withRisk);

      expect(prisma.pARQQuestionnaire.create.mock.calls[0][0].data.hasRisk).toBe(true);
    });

    it('n\'annonce aucun risque quand les 7 réponses sont « non »', async () => {
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue(null);
      prisma.pARQQuestionnaire.create.mockImplementation(async ({ data }) => data);

      await parqService.submitQuestionnaire(CLIENT_ID, noRisk);

      expect(prisma.pARQQuestionnaire.create.mock.calls[0][0].data.hasRisk).toBe(false);
    });

    it('fixe une validité d\'un an', async () => {
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue(null);
      prisma.pARQQuestionnaire.create.mockImplementation(async ({ data }) => data);

      await parqService.submitQuestionnaire(CLIENT_ID, noRisk);

      const { expiresAt } = prisma.pARQQuestionnaire.create.mock.calls[0][0].data;
      expect(Math.round((expiresAt - Date.now()) / 86_400_000)).toBe(365);
    });

    it('écrase le questionnaire précédent au lieu d\'en empiler un nouveau', async () => {
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue({ id: 7 });
      prisma.pARQQuestionnaire.update.mockImplementation(async ({ data }) => data);

      await parqService.submitQuestionnaire(CLIENT_ID, noRisk);

      expect(prisma.pARQQuestionnaire.update.mock.calls[0][0].where).toEqual({ id: 7 });
      expect(prisma.pARQQuestionnaire.create).not.toHaveBeenCalled();
    });

    // Un renouvellement doit repasser par la validation du coach si un risque
    // est déclaré : la levée précédente ne vaut plus.
    it('réinitialise la levée de réserve du coach à chaque renouvellement', async () => {
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue({ id: 7, coachCleared: true });
      prisma.pARQQuestionnaire.update.mockImplementation(async ({ data }) => data);

      await parqService.submitQuestionnaire(CLIENT_ID, withRisk);

      expect(prisma.pARQQuestionnaire.update.mock.calls[0][0].data.coachCleared).toBe(false);
    });

    it.each([[null], [undefined], ['oui'], [42]])('refuse des réponses invalides (%s)', async (answers) => {
      await expect(
        parqService.submitQuestionnaire(CLIENT_ID, answers)
      ).rejects.toMatchObject({ statusCode: 400, errorCode: 'INVALID_ANSWERS' });
    });
  });

  describe('getStatus — verrou du parcours de réservation', () => {
    const future = () => new Date(Date.now() + 86_400_000);
    const past = () => new Date(Date.now() - 86_400_000);

    it('interdit la réservation tant qu\'aucun questionnaire n\'est rempli', async () => {
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue(null);

      expect(await parqService.getStatus(CLIENT_ID)).toMatchObject({ completed: false, canBook: false });
    });

    it.each([
      ['sans risque, non expiré',        { hasRisk: false, coachCleared: false, expiresAt: future() }, true],
      ['risque levé par le coach',       { hasRisk: true,  coachCleared: true,  expiresAt: future() }, true],
      ['risque non levé',                { hasRisk: true,  coachCleared: false, expiresAt: future() }, false],
      ['expiré même sans risque',        { hasRisk: false, coachCleared: false, expiresAt: past() },   false],
      ['expiré et levé par le coach',    { hasRisk: true,  coachCleared: true,  expiresAt: past() },   false],
    ])('%s → réservation %s', async (_label, questionnaire, canBook) => {
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue(questionnaire);

      expect((await parqService.getStatus(CLIENT_ID)).canBook).toBe(canBook);
    });

    it('signale explicitement l\'expiration', async () => {
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue({ hasRisk: false, coachCleared: false, expiresAt: past() });

      expect(await parqService.getStatus(CLIENT_ID)).toMatchObject({ completed: true, expired: true });
    });

    it('ne renvoie jamais les réponses dans le statut', async () => {
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue({ hasRisk: false, coachCleared: false, expiresAt: future(), answers: 'chiffré' });

      expect(await parqService.getStatus(CLIENT_ID)).not.toHaveProperty('answers');
    });
  });

  describe('getOwnAnswers — relecture par le propriétaire uniquement', () => {
    it('déchiffre les réponses du propriétaire', async () => {
      const { encryptJson } = require('../../src/utils/encryption');
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue({ answers: encryptJson(withRisk) });

      expect(await parqService.getOwnAnswers(CLIENT_ID)).toEqual(withRisk);
    });

    it('renvoie null quand aucun questionnaire n\'existe', async () => {
      prisma.pARQQuestionnaire.findFirst.mockResolvedValue(null);

      expect(await parqService.getOwnAnswers(CLIENT_ID)).toBeNull();
    });

    it('filtre toujours sur l\'utilisateur demandeur', async () => {
      await parqService.getOwnAnswers(CLIENT_ID);

      expect(prisma.pARQQuestionnaire.findFirst.mock.calls[0][0].where).toEqual({ userId: CLIENT_ID });
    });
  });
});

describe('sessionReport.service — compte-rendu de séance', () => {
  const arrange = (over = {}) => {
    prisma.appointment.findUnique.mockResolvedValue(F.appointment({ status: 'DONE', ...over }));
    prisma.sessionReport.findUnique.mockResolvedValue(null);
    prisma.sessionReport.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));
  };

  it('crée le compte-rendu sur une séance terminée', async () => {
    arrange();

    const report = await sessionReportService.create(COACH_ID, { appointmentId: 1, notes: 'Bonne progression.' });

    expect(report).toMatchObject({ appointmentId: 1, intervenantId: COACH_ID });
  });

  it.each(['PENDING', 'CONFIRMED', 'CANCELLED'])('refuse un compte-rendu sur une séance %s', async (status) => {
    arrange({ status });

    await expect(
      sessionReportService.create(COACH_ID, { appointmentId: 1, notes: 'Notes' })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse un second compte-rendu sur la même séance', async () => {
    arrange();
    prisma.sessionReport.findUnique.mockResolvedValue({ id: 9 });

    await expect(
      sessionReportService.create(COACH_ID, { appointmentId: 1, notes: 'Notes' })
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'REPORT_EXISTS' });
  });

  it('refuse à un coach de rédiger sur la séance d\'un confrère', async () => {
    arrange({ intervenantId: 999 });

    await expect(
      sessionReportService.create(COACH_ID, { appointmentId: 1, notes: 'Notes' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('ouvre la lecture au client concerné', async () => {
    prisma.sessionReport.findUnique.mockResolvedValue({ id: 1, appointment: { clientId: CLIENT_ID, intervenantId: COACH_ID } });

    await expect(sessionReportService.getByAppointment(1, CLIENT_ID, 'CLIENT')).resolves.toMatchObject({ id: 1 });
  });

  it('refuse la lecture à un client tiers', async () => {
    prisma.sessionReport.findUnique.mockResolvedValue({ id: 1, appointment: { clientId: 999, intervenantId: COACH_ID } });

    await expect(sessionReportService.getByAppointment(1, CLIENT_ID, 'CLIENT')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuse la lecture à un coach tiers', async () => {
    prisma.sessionReport.findUnique.mockResolvedValue({ id: 1, appointment: { clientId: CLIENT_ID, intervenantId: 999 } });

    await expect(sessionReportService.getByAppointment(1, COACH_ID, 'INTERVENANT')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('renvoie 404 pour un compte-rendu inexistant', async () => {
    prisma.sessionReport.findUnique.mockResolvedValue(null);

    await expect(sessionReportService.getByAppointment(1, CLIENT_ID, 'CLIENT')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuse la modification par un autre coach', async () => {
    prisma.sessionReport.findUnique.mockResolvedValue({ id: 1, intervenantId: 999 });

    await expect(sessionReportService.update(1, COACH_ID, { notes: 'x' })).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('subscription.service — abonnements entreprise', () => {
  it('résilie l\'abonnement en cours avant d\'en créer un nouveau', async () => {
    prisma.subscription.create.mockImplementation(async ({ data }) => data);

    await subscriptionService.subscribe(300, 'BOOST_ENTREPRISE');

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { userId: 300, status: 'ACTIVE' }, data: { status: 'CANCELLED' },
    });
  });

  it.each([
    ['MONTHLY', (s, e) => (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()), 1],
    ['YEARLY',  (s, e) => e.getFullYear() - s.getFullYear(), 1],
  ])('fixe une échéance cohérente pour un cycle %s', async (cycle, measure, expected) => {
    prisma.subscription.create.mockImplementation(async ({ data }) => data);

    const sub = await subscriptionService.subscribe(300, 'BOOST_ENTREPRISE', cycle);

    expect(measure(sub.startDate, sub.endDate)).toBe(expected);
  });

  // Un abonnement résilié en cours de période reste dû jusqu'à son échéance.
  it('affiche l\'abonnement résilié encore valide quand il n\'y en a plus d\'actif', async () => {
    const cancelled = { id: 2, status: 'CANCELLED', endDate: new Date(Date.now() + 86_400_000) };
    prisma.subscription.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(cancelled);

    expect((await subscriptionService.getMine(300)).active).toBe(cancelled);
  });

  it('donne la priorité à l\'abonnement réellement actif', async () => {
    const active = { id: 1, status: 'ACTIVE' };
    prisma.subscription.findFirst.mockResolvedValueOnce(active).mockResolvedValueOnce({ id: 2 });

    expect((await subscriptionService.getMine(300)).active).toBe(active);
  });

  it('refuse de résilier l\'abonnement d\'une autre entreprise', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ id: 1, userId: 999, status: 'ACTIVE' });

    await expect(subscriptionService.cancel(1, 300)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuse de résilier un abonnement déjà inactif', async () => {
    prisma.subscription.findUnique.mockResolvedValue({ id: 1, userId: 300, status: 'CANCELLED' });

    await expect(subscriptionService.cancel(1, 300)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('coachService.service — prestations du coach', () => {
  it('n\'expose publiquement que les prestations actives', async () => {
    await coachServiceService.getByIntervenant(COACH_ID);

    expect(prisma.coachService.findMany.mock.calls[0][0].where).toEqual({ intervenantId: COACH_ID, active: true });
  });

  it('montre au coach ses prestations, y compris désactivées', async () => {
    await coachServiceService.getMine(COACH_ID);

    expect(prisma.coachService.findMany.mock.calls[0][0].where).toEqual({ intervenantId: COACH_ID });
  });

  it('rattache automatiquement la prestation créée à son auteur', async () => {
    prisma.coachService.create.mockImplementation(async ({ data }) => data);

    await coachServiceService.create(COACH_ID, { name: 'Yoga', price: 40 });

    expect(prisma.coachService.create.mock.calls[0][0].data.intervenantId).toBe(COACH_ID);
  });

  it.each([
    ['modifier', (id, user) => coachServiceService.update(id, user, { price: 1 })],
    ['supprimer', (id, user) => coachServiceService.remove(id, user)],
  ])('refuse de %s la prestation d\'un confrère', async (_label, act) => {
    prisma.coachService.findUnique.mockResolvedValue(F.coachService({ intervenantId: 999 }));

    await expect(act(10, COACH_ID)).rejects.toMatchObject({ statusCode: 403 });
  });

  it.each([
    ['modifier', (id, user) => coachServiceService.update(id, user, { price: 1 })],
    ['supprimer', (id, user) => coachServiceService.remove(id, user)],
  ])('renvoie 404 pour %s une prestation inexistante', async (_label, act) => {
    prisma.coachService.findUnique.mockResolvedValue(null);

    await expect(act(999, COACH_ID)).rejects.toMatchObject({ statusCode: 404 });
  });

  // Suppression logique : les rendez-vous passés référencent encore la
  // prestation, une suppression physique casserait l'historique.
  it('désactive la prestation au lieu de la supprimer', async () => {
    prisma.coachService.findUnique.mockResolvedValue(F.coachService());

    await coachServiceService.remove(10, COACH_ID);

    expect(prisma.coachService.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { active: false } });
    expect(prisma.coachService.delete).not.toHaveBeenCalled();
  });
});

describe('notification.service', () => {
  it('crée une notification avec un corps nul par défaut', async () => {
    prisma.notification.create.mockImplementation(async ({ data }) => data);

    await notificationService.create(CLIENT_ID, { type: 'TEST', title: 'Titre' });

    expect(prisma.notification.create.mock.calls[0][0].data).toEqual({
      userId: CLIENT_ID, type: 'TEST', title: 'Titre', body: null,
    });
  });

  it('plafonne le fil à 50 notifications', async () => {
    await notificationService.listForUser(CLIENT_ID);

    expect(prisma.notification.findMany.mock.calls[0][0].take).toBe(50);
  });

  it('filtre sur les non-lues quand c\'est demandé', async () => {
    await notificationService.listForUser(CLIENT_ID, { onlyUnread: true });

    expect(prisma.notification.findMany.mock.calls[0][0].where).toEqual({ userId: CLIENT_ID, readAt: null });
  });

  // Le filtre porte à la fois sur l'id et sur l'utilisateur : impossible de
  // marquer lue la notification de quelqu'un d'autre.
  it('cloisonne le marquage « lue » à son propriétaire', async () => {
    await notificationService.markRead(CLIENT_ID, 5);

    expect(prisma.notification.updateMany.mock.calls[0][0].where).toEqual({ id: 5, userId: CLIENT_ID, readAt: null });
  });

  it('ne recompte pas les notifications déjà lues', async () => {
    await notificationService.countUnread(CLIENT_ID);

    expect(prisma.notification.count.mock.calls[0][0].where).toEqual({ userId: CLIENT_ID, readAt: null });
  });
});

describe('service.service — catalogue plateforme (hérité)', () => {
  it('ne liste que les services actifs', async () => {
    await serviceService.getAll({});

    expect(prisma.service.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
  });

  it('filtre par catégorie quand elle est fournie', async () => {
    await serviceService.getAll({ category: 'NUTRITION' });

    expect(prisma.service.findMany.mock.calls[0][0].where).toEqual({ isActive: true, category: 'NUTRITION' });
  });

  it('renvoie 404 pour un service inexistant', async () => {
    prisma.service.findUnique.mockResolvedValue(null);

    await expect(serviceService.getById(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('désactive au lieu de supprimer', async () => {
    await serviceService.remove(1);

    expect(prisma.service.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { isActive: false } });
  });
});
