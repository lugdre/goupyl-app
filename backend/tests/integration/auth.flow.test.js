/**
 * Tests d'intégration — application Express réelle attaquée en HTTP, avec une
 * VRAIE base PostgreSQL (goupyl_sport_test). Aucun module n'est simulé côté
 * données : chaque assertion traverse routes → middlewares → contrôleur →
 * service → Prisma → PostgreSQL.
 *
 * Prérequis : npm run test:db:setup
 */
const db = require('../helpers/db');
const { startServer, stopServer, http, asUser } = require('../helpers/httpServer');

const { prisma } = db;

beforeAll(startServer);
beforeEach(db.resetDatabase);
afterAll(async () => { await stopServer(); await db.disconnect(); });

const post = (path) => http().post(path);

const REGISTRATION = {
  email: 'nouveau@test.fr', password: 'Password1!',
  firstName: 'Nouveau', lastName: 'Compte', role: 'CLIENT', acceptedTerms: true,
};

describe('Parcours complet : inscription → connexion → accès authentifié', () => {
  it('persiste réellement le compte et permet de s\'y connecter', async () => {
    const registered = await post('/api/auth/register').send(REGISTRATION);
    expect(registered.status).toBe(201);

    // Le compte existe bien en base, avec un mot de passe haché
    const inDb = await prisma.user.findUnique({ where: { email: 'nouveau@test.fr' } });
    expect(inDb).not.toBeNull();
    expect(inDb.passwordHash).not.toBe('Password1!');
    expect(inDb.acceptedTermsAt).toBeInstanceOf(Date);

    // La connexion avec ces identifiants aboutit
    const loggedIn = await post('/api/auth/login').send({ email: 'nouveau@test.fr', password: 'Password1!' });
    expect(loggedIn.status).toBe(200);

    // Et le jeton obtenu ouvre bien une route protégée
    const me = await asUser(loggedIn.body.accessToken).get('/api/users/me');
    expect(me.status).toBe(200);
    expect(me.body.email).toBe('nouveau@test.fr');
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('refuse une seconde inscription avec le même email (contrainte d\'unicité réelle)', async () => {
    await post('/api/auth/register').send(REGISTRATION);

    const second = await post('/api/auth/register').send({ ...REGISTRATION, firstName: 'Autre' });

    expect(second.status).toBe(409);
    expect(await prisma.user.count()).toBe(1);
  });

  it('normalise l\'email en minuscules avant de le stocker', async () => {
    await post('/api/auth/register').send({ ...REGISTRATION, email: 'MAJUSCULE@Test.FR' });

    expect(await prisma.user.findUnique({ where: { email: 'majuscule@test.fr' } })).not.toBeNull();
  });

  it('crée le profil d\'onboarding en cascade', async () => {
    const res = await post('/api/auth/register').send({
      ...REGISTRATION, level: 'INTERMEDIAIRE', sportType: 'Course à pied', objectives: ['Endurance', 'Perte de poids'],
    });

    const profile = await prisma.profile.findUnique({ where: { userId: res.body.user.id } });
    expect(profile).toMatchObject({ level: 'INTERMEDIAIRE', sportType: 'Course à pied' });
    expect(profile.objectives).toEqual(['Endurance', 'Perte de poids']);
  });

  it('refuse la connexion d\'un compte désactivé par l\'administrateur', async () => {
    const res = await post('/api/auth/register').send(REGISTRATION);
    await prisma.user.update({ where: { id: res.body.user.id }, data: { isActive: false } });

    const login = await post('/api/auth/login').send({ email: 'nouveau@test.fr', password: 'Password1!' });

    expect(login.status).toBe(403);
  });
});

describe('Cycle de vie de la session : refresh puis révocation', () => {
  const registerAndLogin = async () => {
    await post('/api/auth/register').send(REGISTRATION);
    const { body } = await post('/api/auth/login').send({ email: REGISTRATION.email, password: REGISTRATION.password });
    return body;
  };

  it('échange un refresh token contre un nouvel access token utilisable', async () => {
    const { refreshToken } = await registerAndLogin();

    const refreshed = await post('/api/auth/refresh').send({ refreshToken });
    expect(refreshed.status).toBe(200);

    const me = await asUser(refreshed.body.accessToken).get('/api/users/me');
    expect(me.status).toBe(200);
  });

  it('invalide le refresh token après déconnexion — la session ne peut plus être prolongée', async () => {
    const { accessToken, refreshToken } = await registerAndLogin();

    const logout = await asUser(accessToken).post('/api/auth/logout');
    expect(logout.status).toBe(200);

    const refreshed = await post('/api/auth/refresh').send({ refreshToken });
    expect(refreshed.status).toBe(401);
  });

  it('refuse de prolonger la session d\'un compte désactivé entre-temps', async () => {
    const { user, refreshToken } = await registerAndLogin();
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });

    expect((await post('/api/auth/refresh').send({ refreshToken })).status).toBe(401);
  });
});

describe('Rattachement d\'un salarié à son entreprise', () => {
  it('rattache le nouveau compte via le code permanent de l\'entreprise', async () => {
    const company = await db.createCompany({ joinCode: 'ACME1234' });

    const res = await post('/api/auth/register').send({ ...REGISTRATION, joinCode: 'ACME1234' });

    expect(res.status).toBe(201);
    const employee = await prisma.user.findUnique({ where: { id: res.body.user.id } });
    expect(employee.employerCompanyId).toBe(company.id);
  });

  it('rattache via un jeton d\'invitation et marque celui-ci consommé', async () => {
    const company = await db.createCompany();
    await prisma.companyInvite.create({
      data: { companyId: company.id, email: REGISTRATION.email, token: 'INVIT123456', expiresAt: new Date(Date.now() + 86_400_000) },
    });

    const res = await post('/api/auth/register').send({ ...REGISTRATION, joinCode: 'INVIT123456' });

    expect(res.status).toBe(201);
    expect((await prisma.user.findUnique({ where: { id: res.body.user.id } })).employerCompanyId).toBe(company.id);
    expect((await prisma.companyInvite.findUnique({ where: { token: 'INVIT123456' } })).usedAt).toBeInstanceOf(Date);
  });

  it('refuse un code d\'entreprise inconnu, sans créer de compte orphelin', async () => {
    const res = await post('/api/auth/register').send({ ...REGISTRATION, joinCode: 'INEXISTANT' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_JOIN_CODE');
    expect(await prisma.user.count()).toBe(0);
  });

  it('attribue un code d\'adhésion unique à chaque entreprise inscrite', async () => {
    const a = await post('/api/auth/register').send({
      ...REGISTRATION, email: 'entreprise-a@test.fr', role: 'ENTREPRISE', companyName: 'Alpha SAS', siret: '11111111111111',
    });
    const b = await post('/api/auth/register').send({
      ...REGISTRATION, email: 'entreprise-b@test.fr', role: 'ENTREPRISE', companyName: 'Beta SARL', siret: '22222222222222',
    });

    expect(a.body.user.joinCode).toMatch(/^[0-9A-F]{8}$/);
    expect(b.body.user.joinCode).not.toBe(a.body.user.joinCode);
  });
});

describe('Statut de vérification à l\'inscription', () => {
  it.each([
    ['un CLIENT est vérifié d\'emblée',            { role: 'CLIENT' },                                     'VERIFIED'],
    ['un INTERVENANT attend la validation admin',  { role: 'INTERVENANT' },                                'PENDING'],
    ['une ENTREPRISE avec SIRET est auto-vérifiée', { role: 'ENTREPRISE', siret: '12345678901234' },       'VERIFIED'],
    ['une ENTREPRISE sans SIRET reste en attente',  { role: 'ENTREPRISE' },                                'PENDING'],
  ])('%s', async (_label, override, expected) => {
    const res = await post('/api/auth/register').send({ ...REGISTRATION, ...override });

    const user = await prisma.user.findUnique({ where: { id: res.body.user.id } });
    expect(user.verificationStatus).toBe(expected);
  });

  // Un intervenant PENDING n'apparaît pas dans la recherche publique.
  it('n\'expose pas dans la recherche un intervenant non encore validé', async () => {
    await db.createIntervenant({ verificationStatus: 'PENDING' });
    await db.createIntervenant({ verificationStatus: 'VERIFIED' });

    const res = await http().get('/api/users/intervenants');

    expect(res.body.intervenants).toHaveLength(1);
  });
});
