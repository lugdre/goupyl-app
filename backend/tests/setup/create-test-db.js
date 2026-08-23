#!/usr/bin/env node
/**
 * Prépare la base de test : crée `goupyl_sport_test` si absente, puis y
 * pousse le schéma Prisma.
 *
 * `prisma db push` est utilisé plutôt que `migrate deploy` : les migrations
 * versionnées du dépôt sont en retard sur schema.prisma (cf. CLAUDE.md), et la
 * base de test doit refléter le schéma courant.
 *
 *   npm run test:db:setup
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_TEST = path.resolve(__dirname, '../../.env.test');

if (!fs.existsSync(ENV_TEST)) {
  const user = process.env.USER || 'postgres';
  fs.writeFileSync(
    ENV_TEST,
    [
      '# Environnement des tests d\'intégration — base DÉDIÉE, effaçable à volonté.',
      '# Ce fichier ne contient aucun secret de production.',
      `DATABASE_URL="postgresql://${user}@localhost:5432/goupyl_sport_test"`,
      'JWT_SECRET="test_jwt_secret_32_chars_minimum_ok_1234"',
      'JWT_REFRESH_SECRET="test_refresh_secret_32_chars_minimum_ok"',
      'PARQ_ENCRYPTION_KEY="test_parq_encryption_key_32_chars_ok_ab"',
      '',
    ].join('\n')
  );
  console.log(`✓ ${path.basename(ENV_TEST)} créé`);
}

require('dotenv').config({ path: ENV_TEST });

const url = process.env.DATABASE_URL || '';
if (!/test/i.test(url)) {
  console.error('✗ DATABASE_URL de .env.test ne cible pas une base de test. Abandon.');
  process.exit(1);
}

const dbName = decodeURIComponent(new URL(url).pathname.slice(1));

try {
  execSync(`createdb ${dbName}`, { stdio: 'pipe' });
  console.log(`✓ base ${dbName} créée`);
} catch (err) {
  const message = String(err.stderr || '');
  if (message.includes('already exists')) console.log(`· base ${dbName} déjà présente`);
  else {
    console.error(`✗ impossible de créer ${dbName} :`, message.trim() || err.message);
    process.exit(1);
  }
}

console.log('· application du schéma Prisma…');
execSync('npx prisma db push --schema=src/prisma/schema.prisma --skip-generate --accept-data-loss', {
  cwd: path.resolve(__dirname, '../..'),
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
});
console.log(`✓ base de test prête (${dbName})`);
