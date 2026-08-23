const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

require('dotenv').config({ path: path.resolve(__dirname, '.env.e2e'), quiet: true });

const BACKEND_PORT = process.env.PORT || 3100;
const FRONTEND_PORT = 5199;
const BASE_URL = `http://localhost:${FRONTEND_PORT}`;

/**
 * Tests fonctionnels (bout en bout) — un vrai navigateur pilote la vraie
 * application : SPA React → proxy Vite → API Express → PostgreSQL.
 *
 * Isolation stricte vis-à-vis du développement :
 *  · base `goupyl_sport_e2e`, jamais `goupyl_sport`
 *  · API sur le port 3100, front sur 5199 (3000 / 5173 restent libres)
 *  · Stripe, Resend et Redis neutralisés (aucun appel sortant)
 *
 * Prérequis, une seule fois : npm run setup
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,       // une base partagée, réamorcée avant la suite
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],

  globalSetup: require.resolve('./global-setup.js'),

  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: [
    {
      name: 'api',
      command: 'node src/server.js',
      cwd: path.resolve(__dirname, '../backend'),
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(BACKEND_PORT),
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_ACCESS_SECRET: process.env.JWT_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        PARQ_ENCRYPTION_KEY: process.env.PARQ_ENCRYPTION_KEY,
        FRONTEND_URL: BASE_URL,
        CORS_ORIGIN: BASE_URL,
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
        // Chaînes vides : dotenv ne remplace jamais une variable déjà
        // définie, donc le .env de développement ne peut pas réintroduire la
        // vraie clé Resend ni l'instance Redis locale.
        RESEND_API_KEY: '',
        REDIS_URL: '',
        GOOGLE_CLIENT_ID: '',
      },
    },
    {
      name: 'web',
      command: `npx vite --port ${FRONTEND_PORT} --strictPort`,
      cwd: path.resolve(__dirname, '../frontend'),
      url: BASE_URL,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 60_000,
      env: { VITE_API_PROXY_TARGET: `http://localhost:${BACKEND_PORT}` },
    },
  ],
});
