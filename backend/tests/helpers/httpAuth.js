/**
 * Fabrique d'en-têtes d'authentification pour les tests HTTP : produit un
 * Bearer token réellement signé, de sorte que le middleware d'authentification
 * s'exécute pour de bon (rien n'est court-circuité).
 */
const { generateAccessToken } = require('../../src/config/jwt');

const tokenFor = (user) => generateAccessToken(user);

const authHeader = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });

const AS = {
  client:      { id: 100, role: 'CLIENT' },
  intervenant: { id: 200, role: 'INTERVENANT' },
  entreprise:  { id: 300, role: 'ENTREPRISE' },
  admin:       { id: 400, role: 'ADMIN' },
};

module.exports = { tokenFor, authHeader, AS };
