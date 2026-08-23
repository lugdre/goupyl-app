#!/usr/bin/env node
/** Crée la base E2E si besoin et y pousse le schéma Prisma. */
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.e2e'), quiet: true });

const url = process.env.DATABASE_URL || '';
if (!/e2e/i.test(url)) {
  console.error('✗ DATABASE_URL ne cible pas la base e2e. Abandon.');
  process.exit(1);
}
const dbName = decodeURIComponent(new URL(url).pathname.slice(1));

try {
  execSync(`createdb ${dbName}`, { stdio: 'pipe' });
  console.log(`✓ base ${dbName} créée`);
} catch (err) {
  if (String(err.stderr || '').includes('already exists')) console.log(`· base ${dbName} déjà présente`);
  else { console.error(String(err.stderr || err.message)); process.exit(1); }
}

execSync('npx prisma db push --schema=src/prisma/schema.prisma --skip-generate --accept-data-loss', {
  cwd: path.resolve(__dirname, '../backend'),
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url },
});
console.log('✓ schéma appliqué');
