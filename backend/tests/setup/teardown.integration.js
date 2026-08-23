/**
 * globalTeardown Jest — ferme proprement le pool Prisma pour éviter le
 * message « a worker process has failed to exit gracefully ».
 * La base de test n'est PAS supprimée : la relancer coûterait un db push à
 * chaque exécution, et son contenu est tronqué avant chaque test.
 */
const path = require('path');

module.exports = async () => {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });
  try {
    const prisma = require('../../src/config/database');
    await prisma.$disconnect();
  } catch { /* le client n'a jamais été instancié */ }
};
