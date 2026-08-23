jest.mock('../../src/config/database', () => require('../helpers/prismaMock').createPrismaMock());
jest.mock('../../src/config/redis', () => require('../helpers/prismaMock').createRedisMock());
jest.mock('../../src/config/email', () => require('../helpers/prismaMock').createEmailMock());

// La vérification d'un jeton Google est un appel réseau vers Google : on
// simule la bibliothèque pour tester notre logique, pas la leur.
const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../src/config/database');
const redis = require('../../src/config/redis');
const resend = require('../../src/config/email');
const authService = require('../../src/services/auth.service');
const F = require('../helpers/fixtures');

const resetMocks = require('../helpers/resetMocks');

// Les implémentations posées par un test ne doivent pas contaminer le suivant.
beforeEach(() => resetMocks({ prisma, redis, email: resend }));

const PASSWORD = 'Password1!';
let passwordHash;
beforeAll(async () => { passwordHash = await bcrypt.hash(PASSWORD, 4); });

const baseRegistration = {
  email: 'nouveau@test.fr', password: PASSWORD, firstName: 'Nouveau', lastName: 'Compte', role: 'CLIENT',
};

const arrangeRegister = (createdOver = {}) => {
  prisma.user.findUnique.mockResolvedValue(null);
  prisma.user.create.mockImplementation(async ({ data }) => ({
    id: 1, email: data.email, firstName: data.firstName, lastName: data.lastName,
    role: data.role, isActive: true, verificationStatus: data.verificationStatus,
    employerCompanyId: data.employerCompanyId ?? null, joinCode: data.joinCode ?? null,
    createdAt: new Date(), ...createdOver,
  }));
};

describe('auth.service.register — création de compte', () => {
  it('renvoie l\'utilisateur et la paire de jetons', async () => {
    arrangeRegister();

    const result = await authService.register(baseRegistration);

    expect(result.user).toMatchObject({ id: 1, email: 'nouveau@test.fr', role: 'CLIENT' });
    expect(jwt.decode(result.accessToken)).toMatchObject({ userId: 1, role: 'CLIENT' });
    expect(jwt.decode(result.refreshToken)).toMatchObject({ userId: 1 });
  });

  it('ne renvoie jamais le hash du mot de passe', async () => {
    arrangeRegister();

    const { user } = await authService.register(baseRegistration);

    expect(user).not.toHaveProperty('passwordHash');
    expect(prisma.user.create.mock.calls[0][0].select).not.toHaveProperty('passwordHash');
  });

  it('hache le mot de passe avec bcrypt en coût 12 — jamais stocké en clair', async () => {
    arrangeRegister();

    await authService.register(baseRegistration);

    const stored = prisma.user.create.mock.calls[0][0].data.passwordHash;
    expect(stored).not.toBe(PASSWORD);
    expect(stored).toMatch(/^\$2[aby]\$12\$/);
    expect(await bcrypt.compare(PASSWORD, stored)).toBe(true);
  });

  it('stocke le refresh token dans Redis avec une durée de vie de 7 jours', async () => {
    arrangeRegister();

    await authService.register(baseRegistration);

    expect(redis.set).toHaveBeenCalledWith('refresh_token:1', expect.any(String), 'EX', 7 * 24 * 60 * 60);
  });

  it('refuse un email déjà utilisé en 409 EMAIL_ALREADY_EXISTS', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 9, email: 'nouveau@test.fr' });

    await expect(
      authService.register(baseRegistration)
    ).rejects.toMatchObject({ statusCode: 409, errorCode: 'EMAIL_ALREADY_EXISTS' });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  // Un incident Redis pendant l'inscription laisserait un compte créé en base
  // mais une inscription en erreur côté client : on absorbe la panne.
  it('n\'échoue pas si Redis est indisponible — le compte est déjà créé', async () => {
    arrangeRegister();
    redis.set.mockRejectedValue(new Error('Redis down'));

    await expect(authService.register(baseRegistration)).resolves.toHaveProperty('accessToken');
  });

  it('n\'échoue pas si l\'envoi de l\'email de vérification échoue', async () => {
    arrangeRegister();
    resend.emails.send.mockRejectedValue(new Error('Resend down'));

    await expect(authService.register(baseRegistration)).resolves.toBeDefined();
  });
});

describe('auth.service.register — statut de vérification selon le rôle', () => {
  it.each([
    ['CLIENT sans SIRET',                  { role: 'CLIENT' },                          'VERIFIED'],
    ['ENTREPRISE avec SIRET',              { role: 'ENTREPRISE', siret: '12345678901234' }, 'VERIFIED'],
    ['ENTREPRISE sans SIRET',              { role: 'ENTREPRISE' },                      'PENDING'],
    ['INTERVENANT (validation admin requise)', { role: 'INTERVENANT' },                 'PENDING'],
  ])('%s → %s', async (_label, over, expected) => {
    arrangeRegister();

    await authService.register({ ...baseRegistration, ...over });

    expect(prisma.user.create.mock.calls[0][0].data.verificationStatus).toBe(expected);
  });

  it('attribue à une ENTREPRISE un code d\'adhésion unique de 8 caractères', async () => {
    arrangeRegister();

    await authService.register({ ...baseRegistration, role: 'ENTREPRISE', companyName: 'ACME' });

    expect(prisma.user.create.mock.calls[0][0].data.joinCode).toMatch(/^[0-9A-F]{8}$/);
  });

  it('n\'attribue pas de code d\'adhésion à un CLIENT', async () => {
    arrangeRegister();

    await authService.register(baseRegistration);

    expect(prisma.user.create.mock.calls[0][0].data.joinCode).toBeUndefined();
  });

  it('horodate l\'acceptation des CGU quand elle est cochée', async () => {
    arrangeRegister();

    await authService.register({ ...baseRegistration, acceptedTerms: true });

    expect(prisma.user.create.mock.calls[0][0].data.acceptedTermsAt).toBeInstanceOf(Date);
  });
});

describe('auth.service.register — rattachement à une entreprise', () => {
  it('rattache le salarié via un jeton d\'invitation valide', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.companyInvite.findUnique.mockResolvedValue({
      companyId: 300, usedAt: null, expiresAt: new Date(Date.now() + 86_400_000),
    });
    prisma.user.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));

    await authService.register({ ...baseRegistration, joinCode: 'INVITE123456' });

    expect(prisma.user.create.mock.calls[0][0].data.employerCompanyId).toBe(300);
  });

  it('marque l\'invitation comme utilisée après création du compte', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.companyInvite.findUnique.mockResolvedValue({
      companyId: 300, usedAt: null, expiresAt: new Date(Date.now() + 86_400_000),
    });
    prisma.user.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));

    await authService.register({ ...baseRegistration, joinCode: 'INVITE123456' });

    expect(prisma.companyInvite.update).toHaveBeenCalledWith({
      where: { token: 'INVITE123456' }, data: { usedAt: expect.any(Date) },
    });
  });

  it('rattache le salarié via le code permanent de l\'entreprise', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(null);
    F.mockUsers(prisma, [F.company({ id: 300, joinCode: 'ACME1234' })]);
    prisma.user.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));

    await authService.register({ ...baseRegistration, joinCode: 'ACME1234' });

    expect(prisma.user.create.mock.calls[0][0].data.employerCompanyId).toBe(300);
  });

  it('refuse un code d\'entreprise inconnu', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      authService.register({ ...baseRegistration, joinCode: 'INEXISTANT' })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'INVALID_JOIN_CODE' });
  });

  it('refuse un code qui pointe vers un compte non-entreprise', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue(null);
    F.mockUsers(prisma, [F.client({ joinCode: 'ACME1234' })]);

    await expect(
      authService.register({ ...baseRegistration, joinCode: 'ACME1234' })
    ).rejects.toMatchObject({ errorCode: 'INVALID_JOIN_CODE' });
  });

  it('retombe sur le code permanent quand l\'invitation est expirée', async () => {
    prisma.companyInvite.findUnique.mockResolvedValue({
      companyId: 300, usedAt: null, expiresAt: new Date(Date.now() - 1000), // expirée
    });
    F.mockUsers(prisma, [F.company({ id: 400, joinCode: 'TOKENEXP' })]);
    prisma.user.create.mockImplementation(async ({ data }) => ({ id: 1, ...data }));

    await authService.register({ ...baseRegistration, joinCode: 'TOKENEXP' });

    expect(prisma.user.create.mock.calls[0][0].data.employerCompanyId).toBe(400);
  });

  it('ignore le code d\'adhésion pour un rôle autre que CLIENT', async () => {
    arrangeRegister();

    await authService.register({ ...baseRegistration, role: 'INTERVENANT', joinCode: 'ACME1234' });

    expect(prisma.companyInvite.findUnique).not.toHaveBeenCalled();
  });
});

describe('auth.service.register — questionnaire d\'onboarding client', () => {
  it('crée le profil en cascade quand le questionnaire est renseigné', async () => {
    arrangeRegister();

    await authService.register({
      ...baseRegistration, level: 'INTERMEDIAIRE', sportType: 'Course', objectives: ['Endurance'],
    });

    expect(prisma.user.create.mock.calls[0][0].data.profile).toEqual({
      create: { level: 'INTERMEDIAIRE', sportType: 'Course', objectives: ['Endurance'] },
    });
  });

  it('ne crée aucun profil quand le questionnaire est passé', async () => {
    arrangeRegister();

    await authService.register(baseRegistration);

    expect(prisma.user.create.mock.calls[0][0].data.profile).toBeUndefined();
  });

  it('alerte un administrateur pour un client PRO/ELITE à besoin spécifique', async () => {
    arrangeRegister();
    process.env.SPECIFIC_NEEDS_ADMIN_EMAIL = 'admin@goupylsport.fr';

    await authService.register({
      ...baseRegistration, level: 'ELITE', specificNeed: 'Préparation olympique',
    });

    const recipients = resend.emails.send.mock.calls.map((c) => c[0].to);
    expect(recipients).toContain('admin@goupylsport.fr');
    delete process.env.SPECIFIC_NEEDS_ADMIN_EMAIL;
  });

  it('n\'alerte pas d\'administrateur pour un client débutant', async () => {
    arrangeRegister();

    await authService.register({ ...baseRegistration, level: 'DEBUTANT', specificNeed: 'perdre du poids' });

    expect(resend.emails.send).toHaveBeenCalledTimes(1); // uniquement l'email de vérification
  });
});

describe('auth.service.login — connexion', () => {
  const storedUser = (over = {}) => F.client({ id: 1, email: 'client@test.fr', passwordHash, ...over });

  it('renvoie l\'utilisateur et la paire de jetons avec le bon mot de passe', async () => {
    prisma.user.findUnique.mockResolvedValue(storedUser());

    const result = await authService.login({ email: 'client@test.fr', password: PASSWORD });

    expect(result.user.id).toBe(1);
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  it('n\'expose jamais le hash dans la réponse', async () => {
    prisma.user.findUnique.mockResolvedValue(storedUser());

    const { user } = await authService.login({ email: 'client@test.fr', password: PASSWORD });

    expect(user).not.toHaveProperty('passwordHash');
  });

  // Message identique dans les deux cas : ne pas révéler quels emails
  // existent en base (énumération de comptes).
  it('renvoie le même message pour un email inconnu et un mot de passe faux', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const unknownEmail = await authService.login({ email: 'inconnu@test.fr', password: PASSWORD }).catch((e) => e);

    prisma.user.findUnique.mockResolvedValue(storedUser());
    const wrongPassword = await authService.login({ email: 'client@test.fr', password: 'Mauvais1!' }).catch((e) => e);

    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.message).toBe(wrongPassword.message);
  });

  it('refuse un compte désactivé en 403', async () => {
    prisma.user.findUnique.mockResolvedValue(storedUser({ isActive: false }));

    await expect(
      authService.login({ email: 'client@test.fr', password: PASSWORD })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('oriente vers Google un compte créé sans mot de passe', async () => {
    prisma.user.findUnique.mockResolvedValue(storedUser({ passwordHash: null }));

    await expect(
      authService.login({ email: 'client@test.fr', password: PASSWORD })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'GOOGLE_ACCOUNT' });
  });

  it('n\'échoue pas si Redis est indisponible', async () => {
    prisma.user.findUnique.mockResolvedValue(storedUser());
    redis.set.mockRejectedValue(new Error('Redis down'));

    await expect(authService.login({ email: 'client@test.fr', password: PASSWORD })).resolves.toHaveProperty('accessToken');
  });
});

describe('auth.service.refresh — renouvellement de l\'access token', () => {
  const { generateRefreshToken } = require('../../src/config/jwt');

  it('émet un nouvel access token à partir d\'un refresh token valide', async () => {
    const token = generateRefreshToken({ id: 1 });
    redis.get.mockResolvedValue(token);
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'a@b.fr', role: 'CLIENT', isActive: true });

    const { accessToken } = await authService.refresh(token);

    expect(jwt.decode(accessToken)).toMatchObject({ userId: 1, role: 'CLIENT' });
  });

  // Révocation : le jeton reste cryptographiquement valide, mais il n'est plus
  // en base Redis — c'est elle qui fait autorité.
  it('refuse un refresh token révoqué (absent de Redis) alors qu\'il est encore signé', async () => {
    const token = generateRefreshToken({ id: 1 });
    redis.get.mockResolvedValue(null);

    await expect(authService.refresh(token)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('refuse un refresh token qui ne correspond pas à celui stocké (rotation)', async () => {
    redis.get.mockResolvedValue(generateRefreshToken({ id: 999 }));

    await expect(
      authService.refresh(generateRefreshToken({ id: 1 }))
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejette un refresh token à la signature invalide', async () => {
    await expect(authService.refresh(jwt.sign({ userId: 1 }, 'mauvais_secret'))).rejects.toThrow();
  });

  it('refuse le renouvellement pour un compte désactivé entre-temps', async () => {
    const token = generateRefreshToken({ id: 1 });
    redis.get.mockResolvedValue(token);
    prisma.user.findUnique.mockResolvedValue({ id: 1, isActive: false });

    await expect(authService.refresh(token)).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('auth.service.logout et vérification d\'email', () => {
  it('révoque le refresh token de l\'utilisateur', async () => {
    await authService.logout(42);

    expect(redis.del).toHaveBeenCalledWith('refresh_token:42');
  });

  it('valide l\'email et consomme le jeton à usage unique', async () => {
    redis.get.mockResolvedValue('7');

    await authService.verifyEmail('abc123');

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { emailVerifiedAt: expect.any(Date) } });
    expect(redis.del).toHaveBeenCalledWith('email_verify:abc123');
  });

  it('refuse un jeton de vérification expiré ou inconnu', async () => {
    redis.get.mockResolvedValue(null);

    await expect(
      authService.verifyEmail('perime')
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'INVALID_VERIFY_TOKEN' });
  });
});

describe('auth.service.googleAuth — connexion via Google', () => {
  const payload = (over = {}) => ({
    email: 'Nouveau@Gmail.com', email_verified: true, sub: 'google-uid-1',
    given_name: 'Nouveau', family_name: 'Compte', name: 'Nouveau Compte', ...over,
  });

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'client-id.apps.googleusercontent.com';
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => payload() });
  });
  afterEach(() => { delete process.env.GOOGLE_CLIENT_ID; });

  it('crée un compte CLIENT vérifié à la première connexion', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async ({ data }) => ({ id: 5, ...data }));

    const result = await authService.googleAuth({ credential: 'id-token-google' });

    expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
      email: 'nouveau@gmail.com', role: 'CLIENT', verificationStatus: 'VERIFIED', passwordHash: null,
    });
    expect(result).toHaveProperty('accessToken');
  });

  it('rattache l\'identité Google à un compte créé par mot de passe', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 3, email: 'nouveau@gmail.com', isActive: true, googleId: null });
    prisma.user.update.mockImplementation(async ({ data }) => ({ id: 3, isActive: true, ...data }));

    await authService.googleAuth({ credential: 'id-token-google' });

    expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({ googleId: 'google-uid-1' });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('refuse une adresse Google non vérifiée', async () => {
    mockVerifyIdToken.mockResolvedValue({ getPayload: () => payload({ email_verified: false }) });

    await expect(
      authService.googleAuth({ credential: 'x' })
    ).rejects.toMatchObject({ statusCode: 400, errorCode: 'GOOGLE_EMAIL_UNVERIFIED' });
  });

  it('refuse un jeton Google invalide sans divulguer la cause exacte', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Wrong recipient, payload audience != requiredAudience'));

    const error = await authService.googleAuth({ credential: 'x' }).catch((e) => e);

    expect(error.statusCode).toBe(401);
    expect(error.message).not.toContain('audience');
  });

  it('refuse un compte désactivé', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 3, isActive: false, googleId: 'g' });

    await expect(authService.googleAuth({ credential: 'x' })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('signale une configuration serveur absente', async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    await expect(
      authService.googleAuth({ credential: 'x' })
    ).rejects.toMatchObject({ errorCode: 'GOOGLE_NOT_CONFIGURED' });
  });
});
