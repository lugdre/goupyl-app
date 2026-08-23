/**
 * globalSetup Jest — s'exécute une seule fois avant toute la suite
 * d'intégration : vérifie que la base de test répond et que son schéma est à
 * jour, sinon échoue avec un message actionnable plutôt qu'une erreur Prisma
 * obscure test par test.
 */
const path = require('path');
const { execSync } = require('child_process');

module.exports = async () => {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

  const url = process.env.DATABASE_URL || '';
  if (!/test/i.test(url)) {
    throw new Error(
      'Tests d\'intégration : DATABASE_URL absente ou ne ciblant pas une base de test.\n' +
      'Lancez d\'abord : npm run test:db:setup'
    );
  }

  try {
    execSync('npx prisma db push --schema=src/prisma/schema.prisma --skip-generate --accept-data-loss', {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: url },
    });
  } catch (err) {
    throw new Error(
      `Impossible de synchroniser le schéma sur la base de test.\n` +
      `Lancez : npm run test:db:setup\n\n${String(err.stderr || err.message)}`
    );
  }
};
