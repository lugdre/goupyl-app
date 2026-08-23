jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());

const prisma = require('../../src/config/database');
const redis = require('../../src/config/redis');
const userService = require('../../src/services/user.service');
const F = require('../helpers/fixtures');
const resetMocks = require('../helpers/resetMocks');

beforeEach(() => resetMocks({ prisma, redis }));

const COACH_ID = 200;

describe('user.service.verifyUser — validation d\'un professionnel par l\'administrateur', () => {
  const withDocuments = (types) => {
    prisma.user.findUnique.mockResolvedValue({ role: 'INTERVENANT' });
    prisma.document.findMany.mockResolvedValue(types.map((type) => ({ type })));
    prisma.user.update.mockImplementation(async ({ data }) => ({ id: COACH_ID, ...data }));
  };

  it('valide un intervenant dont le dossier contient identité ET diplôme', async () => {
    withDocuments(['ID_CARD', 'DIPLOMA']);

    const result = await userService.verifyUser(COACH_ID, 'VERIFIED', 'Dossier conforme');

    expect(result.verificationStatus).toBe('VERIFIED');
    expect(result.verificationNote).toBe('Dossier conforme');
  });

  it('accepte plusieurs diplômes et plusieurs pièces d\'identité', async () => {
    withDocuments(['ID_CARD', 'ID_CARD', 'DIPLOMA', 'DIPLOMA', 'DIPLOMA']);

    await expect(userService.verifyUser(COACH_ID, 'VERIFIED')).resolves.toBeDefined();
  });

  // Exigence du cahier des charges : aucun professionnel ne peut être publié
  // sur la place de marché sans dossier complet.
  it.each([
    ['sans aucun document',      []],
    ['sans pièce d\'identité',   ['DIPLOMA']],
    ['sans diplôme',             ['ID_CARD']],
  ])('refuse de valider un intervenant %s', async (_label, types) => {
    withDocuments(types);

    await expect(
      userService.verifyUser(COACH_ID, 'VERIFIED')
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'INCOMPLETE_VERIFICATION_FILE' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('ignore les documents rejetés dans le contrôle de complétude', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'INTERVENANT' });
    prisma.document.findMany.mockResolvedValue([{ type: 'ID_CARD' }, { type: 'DIPLOMA' }]);

    await userService.verifyUser(COACH_ID, 'VERIFIED');

    expect(prisma.document.findMany.mock.calls[0][0].where).toEqual({
      userId: COACH_ID, status: { not: 'REJECTED' },
    });
  });

  it('n\'exige aucun document pour un REJET', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'INTERVENANT' });
    prisma.user.update.mockImplementation(async ({ data }) => ({ id: COACH_ID, ...data }));

    await expect(userService.verifyUser(COACH_ID, 'REJECTED', 'Diplôme illisible')).resolves.toBeDefined();
    expect(prisma.document.findMany).not.toHaveBeenCalled();
  });

  it('n\'applique pas le contrôle de dossier aux autres rôles', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'ENTREPRISE' });
    prisma.user.update.mockImplementation(async ({ data }) => ({ ...data }));

    await expect(userService.verifyUser(300, 'VERIFIED')).resolves.toBeDefined();
    expect(prisma.document.findMany).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'EN_ATTENTE', 'valide', ''])('refuse le statut invalide « %s »', async (status) => {
    await expect(userService.verifyUser(COACH_ID, status)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('laisse la note inchangée quand elle n\'est pas fournie', async () => {
    withDocuments(['ID_CARD', 'DIPLOMA']);

    await userService.verifyUser(COACH_ID, 'VERIFIED');

    expect(prisma.user.update.mock.calls[0][0].data).not.toHaveProperty('verificationNote');
  });
});

describe('user.service.getIntervenants — recherche publique de professionnels', () => {
  it('ne remonte que les intervenants actifs ET vérifiés', async () => {
    await userService.getIntervenants({});

    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({
      role: 'INTERVENANT', isActive: true, verificationStatus: 'VERIFIED',
    });
  });

  it('filtre la ville sans tenir compte de la casse', async () => {
    await userService.getIntervenants({ city: 'lyon' });

    expect(prisma.user.findMany.mock.calls[0][0].where.profile).toEqual({
      city: { contains: 'lyon', mode: 'insensitive' },
    });
  });

  // Le filtre utilise `has` : la valeur doit correspondre octet pour octet à
  // l'entrée de COURSE_LOCATION_OPTIONS côté frontend.
  it('filtre le lieu de cours par correspondance exacte dans le tableau', async () => {
    await userService.getIntervenants({ courseLocation: 'À domicile' });

    expect(prisma.user.findMany.mock.calls[0][0].where.profile).toEqual({
      courseLocations: { has: 'À domicile' },
    });
  });

  it('filtre le tarif horaire maximum', async () => {
    await userService.getIntervenants({ maxRate: '60' });

    expect(prisma.user.findMany.mock.calls[0][0].where.profile).toEqual({ hourlyRate: { lte: 60 } });
  });

  it('ignore un tarif maximum non numérique plutôt que de produire une requête absurde', async () => {
    await userService.getIntervenants({ maxRate: 'cher' });

    expect(prisma.user.findMany.mock.calls[0][0].where.profile).toBeUndefined();
  });

  it('combine plusieurs filtres', async () => {
    await userService.getIntervenants({ city: 'Paris', maxRate: 80, courseLocation: 'En salle' });

    expect(prisma.user.findMany.mock.calls[0][0].where.profile).toEqual({
      city: { contains: 'Paris', mode: 'insensitive' },
      courseLocations: { has: 'En salle' },
      hourlyRate: { lte: 80 },
    });
  });

  it('n\'expose ni email ni hash de mot de passe dans les résultats publics', async () => {
    await userService.getIntervenants({});

    const { select } = prisma.user.findMany.mock.calls[0][0];
    expect(select).not.toHaveProperty('email');
    expect(select).not.toHaveProperty('passwordHash');
  });

  it('enrichit chaque professionnel de sa note moyenne et de son volume de séances', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prisma.review.groupBy.mockResolvedValue([{ intervenantId: 1, _avg: { rating: 4.66 }, _count: { id: 3 } }]);
    prisma.appointment.groupBy.mockResolvedValue([{ intervenantId: 1, _count: { id: 12 } }]);

    const { intervenants } = await userService.getIntervenants({});

    expect(intervenants[0]).toMatchObject({ averageRating: 4.7, reviewCount: 3, sessionsDone: 12 });
    expect(intervenants[1]).toMatchObject({ averageRating: null, reviewCount: 0, sessionsDone: 0 });
  });

  it('arrondit la note moyenne à une décimale', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.review.groupBy.mockResolvedValue([{ intervenantId: 1, _avg: { rating: 3.333333 }, _count: { id: 3 } }]);

    expect((await userService.getIntervenants({})).intervenants[0].averageRating).toBe(3.3);
  });
});

describe('user.service.getIntervenantById — fiche publique', () => {
  it('renvoie la fiche enrichie d\'un intervenant actif', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: COACH_ID, firstName: 'Marc', lastName: 'Leroy', profile: {} });
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { id: 8 } });
    prisma.appointment.count.mockResolvedValue(30);

    expect(await userService.getIntervenantById(COACH_ID)).toMatchObject({
      id: COACH_ID, averageRating: 4.5, reviewCount: 8, sessionsDone: 30,
    });
  });

  it('renvoie 404 pour un intervenant inexistant ou désactivé', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(userService.getIntervenantById(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('renvoie une note nulle plutôt que NaN quand il n\'y a aucun avis', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: COACH_ID, profile: {} });
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { id: 0 } });

    expect((await userService.getIntervenantById(COACH_ID)).averageRating).toBeNull();
  });
});

describe('user.service — profil personnel', () => {
  it('renvoie 404 pour un utilisateur inexistant', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(userService.getMe(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('n\'expose pas le hash du mot de passe sur /users/me', async () => {
    prisma.user.findUnique.mockResolvedValue(F.client());

    await userService.getMe(100);

    expect(prisma.user.findUnique.mock.calls[0][0].select).not.toHaveProperty('passwordHash');
  });

  it('crée le profil s\'il n\'existe pas encore, le met à jour sinon (upsert)', async () => {
    prisma.user.update.mockResolvedValue({});

    await userService.updateMe(100, { firstName: 'Marc', profile: { bio: 'Coach depuis 10 ans' } });

    expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({
      firstName: 'Marc',
      profile: { upsert: { create: { bio: 'Coach depuis 10 ans' }, update: { bio: 'Coach depuis 10 ans' } } },
    });
  });

  it('ne touche pas au profil quand la mise à jour ne concerne que le compte', async () => {
    prisma.user.update.mockResolvedValue({});

    await userService.updateMe(100, { firstName: 'Marc' });

    expect(prisma.user.update.mock.calls[0][0].data.profile).toBeUndefined();
  });
});

describe('user.service.deleteMe — suppression de compte (RGPD)', () => {
  it('révoque la session avant de supprimer les données', async () => {
    await userService.deleteMe(100);

    expect(redis.del).toHaveBeenCalledWith('refresh_token:100');
  });

  it('supprime toutes les données rattachées dans une transaction unique', async () => {
    await userService.deleteMe(100);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(10);
  });

  // Ordre imposé par les clés étrangères : les enfants avant le parent.
  it('supprime les entités filles avant l\'utilisateur lui-même', async () => {
    await userService.deleteMe(100);

    expect(prisma.review.deleteMany).toHaveBeenCalled();
    expect(prisma.payment.deleteMany).toHaveBeenCalled();
    expect(prisma.appointment.deleteMany).toHaveBeenCalled();
    expect(prisma.profile.deleteMany).toHaveBeenCalled();
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 100 } });
  });
});

describe('user.service — avatar et galerie photos', () => {
  const file = { buffer: Buffer.from('image'), mimetype: 'image/png' };

  it('stocke l\'avatar en base et non sur le disque (filesystem éphémère)', async () => {
    prisma.user.update.mockResolvedValue({});

    await userService.uploadAvatar(100, file);

    expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({
      avatarData: file.buffer, avatarMimeType: 'image/png',
    });
  });

  it('ajoute un paramètre de version à l\'URL pour invalider le cache navigateur', async () => {
    prisma.user.update.mockResolvedValue({});

    await userService.uploadAvatar(100, file);

    expect(prisma.user.update.mock.calls[0][0].data.avatarUrl).toMatch(/^\/api\/users\/100\/avatar\?v=\d+$/);
  });

  it('renvoie 404 quand l\'utilisateur n\'a pas d\'avatar', async () => {
    prisma.user.findUnique.mockResolvedValue({ avatarData: null });

    await expect(userService.getAvatar(100)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('retombe sur image/jpeg si le type MIME n\'a pas été enregistré', async () => {
    prisma.user.findUnique.mockResolvedValue({ avatarData: Buffer.from('x'), avatarMimeType: null });

    expect((await userService.getAvatar(100)).mimeType).toBe('image/jpeg');
  });

  it('réserve la galerie aux intervenants', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'CLIENT' });

    await expect(userService.addPhoto(100, file)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('plafonne la galerie à 12 photos', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'INTERVENANT' });
    prisma.coachPhoto.count.mockResolvedValue(12);

    await expect(
      userService.addPhoto(COACH_ID, file)
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'GALLERY_FULL' });
  });

  it('accepte une 12e photo quand la galerie en contient 11', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'INTERVENANT' });
    prisma.coachPhoto.count.mockResolvedValue(11);
    prisma.coachPhoto.create.mockResolvedValue({ id: 5, createdAt: new Date() });

    await expect(userService.addPhoto(COACH_ID, file)).resolves.toMatchObject({ id: 5 });
  });

  it('ne renvoie jamais les octets dans le listing de la galerie', async () => {
    await userService.listPhotos(COACH_ID);

    expect(prisma.coachPhoto.findMany.mock.calls[0][0].select).toEqual({ id: true, createdAt: true });
  });

  it('refuse de servir une photo appartenant à un autre coach', async () => {
    prisma.coachPhoto.findUnique.mockResolvedValue({ id: 5, intervenantId: 999 });

    await expect(userService.getPhoto(COACH_ID, 5)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('refuse de supprimer la photo d\'un autre coach', async () => {
    prisma.coachPhoto.findUnique.mockResolvedValue({ id: 5, intervenantId: 999 });

    await expect(userService.deletePhoto(COACH_ID, 5)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('user.service — administration des comptes', () => {
  it('liste tous les utilisateurs, filtrés par rôle si demandé', async () => {
    await userService.getAllUsers({ role: 'INTERVENANT' });

    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: 'INTERVENANT' });
  });

  it('sans filtre de rôle, ne restreint rien', async () => {
    await userService.getAllUsers({});

    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({});
  });

  it('désactive un compte sans le supprimer', async () => {
    prisma.user.update.mockResolvedValue({ id: 1, isActive: false });

    await userService.toggleUserActive(1, false);

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 1 }, data: { isActive: false },
    }));
  });

  it('ne liste comme à vérifier que les intervenants en attente', async () => {
    await userService.getPendingVerifications();

    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({
      verificationStatus: 'PENDING', role: 'INTERVENANT',
    });
  });

  // Sans le statut des documents, l'interface d'administration réaffiche
  // « En attente » sur des pièces déjà validées.
  it('remonte le statut de chaque document pour l\'interface d\'administration', async () => {
    await userService.getPendingVerifications();

    const docSelect = prisma.user.findMany.mock.calls[0][0].select.documents.select;
    expect(docSelect).toMatchObject({ status: true, adminNote: true, expiresAt: true });
  });
});
