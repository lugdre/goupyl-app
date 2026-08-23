/**
 * ⚠ SUITE DE NON-RÉGRESSION — DÉFAUT CONNU, révélé par ces tests.
 *
 * Zod 4 a renommé les options de personnalisation des messages d'erreur :
 *
 *     Zod 3                                   Zod 4
 *     z.string({ required_error: 'X' })   →   z.string({ error: 'X' })
 *     z.enum([...], { errorMap: () => ({ message: 'X' }) })
 *                                         →   z.enum([...], { error: 'X' })
 *
 * Les schémas du projet emploient encore la forme Zod 3. Zod 4 ne lève pas
 * d'erreur : il ignore simplement l'option inconnue. Résultat, 21 messages
 * français rédigés pour l'utilisateur final sont morts, et l'API renvoie les
 * libellés anglais par défaut de Zod (« Invalid input: expected string,
 * received undefined »). C'est la même famille d'incident que le passage
 * `error.errors` → `error.issues` documenté au §8 du dossier projet.
 *
 * Ces tests figent le comportement ACTUEL. Après application du correctif
 * (remplacer `required_error:` et `errorMap:` par `error:`), ils deviendront
 * rouges : il faudra alors inverser les attentes, ce qui prouvera que les
 * messages français sont bien rétablis.
 */
const { z } = require('zod');
const { registerSchema, loginSchema, refreshSchema } = require('../../src/validators/auth.validator');
const { createAppointmentSchema, updateStatusSchema, resolveDisputeSchema, validateQrSchema, disputeSchema } = require('../../src/validators/appointment.validator');
const { createCoachServiceSchema } = require('../../src/validators/coachService.validator');
const { createSubscriptionSchema } = require('../../src/validators/subscription.validator');
const { productSchema } = require('../../src/validators/product.validator');

const messagesFor = (schema, value) => {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

describe('Zod 4 — vérification du socle', () => {
  it('la version installée est bien Zod 4', () => {
    expect(require('zod/package.json').version).toMatch(/^4\./);
  });

  it('l\'option Zod 4 `error` fonctionne, l\'option Zod 3 `errorMap` est ignorée', () => {
    expect(messagesFor(z.enum(['A', 'B'], { error: 'Choix invalide' }), 'Z')).toEqual(['Choix invalide']);
    expect(messagesFor(z.enum(['A', 'B'], { errorMap: () => ({ message: 'Choix invalide' }) }), 'Z')[0])
      .toContain('Invalid option');
  });

  it('l\'option Zod 4 `error` fonctionne, l\'option Zod 3 `required_error` est ignorée', () => {
    expect(messagesFor(z.string({ error: 'Champ requis' }), undefined)).toEqual(['Champ requis']);
    expect(messagesFor(z.string({ required_error: 'Champ requis' }), undefined)[0])
      .toContain('Invalid input');
  });
});

describe('Messages personnalisés PERDUS — option `errorMap` (Zod 3)', () => {
  it.each([
    ['auth.role',                  registerSchema,          { role: 'ADMIN' },              'Role invalide'],
    ['appointment.status',         updateStatusSchema,      { status: 'PENDING' },          'Statut invalide'],
    ['appointment.resolution',     resolveDisputeSchema,    { resolution: 'AUTRE' },        'Résolution invalide'],
    ['subscription.plan',          createSubscriptionSchema,{ plan: 'ESSENTIELLE' },        'Plan invalide'],
    ['coachService.category',      createCoachServiceSchema,{ category: 'YOGA' },           'Categorie invalide'],
  ])('%s : le message « %s » n\'atteint jamais l\'utilisateur', (_label, schema, value, lostMessage) => {
    const messages = messagesFor(schema, value);

    expect(messages).not.toContain(lostMessage);
    expect(messages.some((m) => m.includes('Invalid option'))).toBe(true);
  });
});

describe('Messages personnalisés PERDUS — option `required_error` (Zod 3)', () => {
  it.each([
    ['auth.email',            registerSchema,           'email',         'Email requis'],
    ['auth.password',         registerSchema,           'password',      'Mot de passe requis'],
    ['auth.firstName',        registerSchema,           'firstName',     'Prenom requis'],
    ['auth.lastName',         registerSchema,           'lastName',      'Nom requis'],
    ['login.email',           loginSchema,              'email',         'Email requis'],
    ['login.password',        loginSchema,              'password',      'Mot de passe requis'],
    ['refresh.refreshToken',  refreshSchema,            'refreshToken',  'Refresh token requis'],
    ['appointment.intervenantId', createAppointmentSchema, 'intervenantId', 'ID intervenant requis'],
    ['appointment.scheduledAt',   createAppointmentSchema, 'scheduledAt',   'Date requise'],
    ['qr.code',               validateQrSchema,         'code',          'Code requis'],
    ['dispute.reason',        disputeSchema,            'reason',        'Motif requis'],
    ['coachService.price',    createCoachServiceSchema, 'price',         'Prix requis'],
    ['coachService.duration', createCoachServiceSchema, 'durationMinutes', 'Duree requise'],
    ['product.name',          productSchema,            'name',          'Nom requis'],
    ['product.priceCents',    productSchema,            'priceCents',    'Prix requis'],
  ])('%s : le message « %s » n\'atteint jamais l\'utilisateur', (_label, schema, _field, lostMessage) => {
    const messages = messagesFor(schema, {});

    expect(messages).not.toContain(lostMessage);
  });

  it('remonte au total un message anglais par champ obligatoire manquant', () => {
    const messages = messagesFor(registerSchema, {});

    expect(messages.length).toBeGreaterThanOrEqual(5);
    expect(messages.every((m) => m.startsWith('Invalid input') || m.startsWith('Invalid option'))).toBe(true);
  });
});

describe('Messages personnalisés QUI FONCTIONNENT — 2e argument des raffinements', () => {
  // Les messages passés en 2e argument (.min(), .regex(), .refine()…) utilisent
  // une API inchangée entre Zod 3 et Zod 4 : ceux-là sont bien rendus.
  it.each([
    ['mot de passe trop court',   registerSchema, { email: 'a@b.fr', password: 'Pw1', firstName: 'Ab', lastName: 'Cd', role: 'CLIENT' }, 'Minimum 8 caracteres'],
    ['mot de passe sans majuscule', registerSchema, { email: 'a@b.fr', password: 'password1', firstName: 'Ab', lastName: 'Cd', role: 'CLIENT' }, 'Au moins une majuscule'],
    ['email mal formé',           registerSchema, { email: 'x', password: 'Password1', firstName: 'Ab', lastName: 'Cd', role: 'CLIENT' }, 'Format email invalide'],
    ['SIRET non conforme',        registerSchema, { email: 'a@b.fr', password: 'Password1', firstName: 'Ab', lastName: 'Cd', role: 'ENTREPRISE', siret: '12' }, 'Le SIRET doit contenir exactement 14 chiffres'],
    ['durée non standard',        createCoachServiceSchema, { name: 'x', durationMinutes: 17, price: 10, category: 'SPORT' }, 'Duree invalide (15, 30, 45, 60, 90 ou 120 min)'],
    ['code QR trop court',        validateQrSchema, { code: 'abc' }, 'Minimum 8 caractères'],
  ])('%s : le message français est bien remonté', (_label, schema, value, expectedMessage) => {
    expect(messagesFor(schema, value)).toContain(expectedMessage);
  });
});
