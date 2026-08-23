/**
 * Configuration Jest — trois projets distincts, exécutables séparément.
 *
 *   unit        tests unitaires : Prisma / Redis / Stripe / Resend mockés,
 *               aucune I/O. Cible la logique métier des services.
 *   api         tests d'API : application Express réelle attaquée en HTTP
 *               (supertest) avec l'infrastructure mockée. Vérifie le câblage
 *               middlewares → routes → contrôleurs (auth, rôles, Zod, 404…).
 *   integration tests d'intégration : application Express réelle + vraie base
 *               PostgreSQL (goupyl_sport_test). Nécessite `npm run test:db:setup`.
 *
 *   npm test              → unit + api (aucune dépendance externe)
 *   npm run test:integration → integration (base requise, séquentiel)
 *   npm run test:all      → les trois
 */
const base = {
  testEnvironment: 'node',
  rootDir: __dirname,
  clearMocks: true,
};

module.exports = {
  projects: [
    {
      ...base,
      displayName: { name: 'unit', color: 'blue' },
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      setupFiles: ['<rootDir>/tests/setup/env.js'],
    },
    {
      ...base,
      displayName: { name: 'api', color: 'magenta' },
      testMatch: ['<rootDir>/tests/api/**/*.test.js'],
      setupFiles: ['<rootDir>/tests/setup/env.js'],
    },
    {
      ...base,
      displayName: { name: 'integration', color: 'yellow' },
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFiles: ['<rootDir>/tests/setup/env.integration.js'],
      globalSetup: '<rootDir>/tests/setup/global.integration.js',
      globalTeardown: '<rootDir>/tests/setup/teardown.integration.js',
      testTimeout: 30000,
    },
  ],

  // Couverture mesurée sur le code métier uniquement : le serveur (bootstrap),
  // le seed et les migrations ne sont pas du code testable unitairement.
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/prisma/**',
    '!src/config/database.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text-summary', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 45,
      functions: 55,
      lines: 60,
    },
  },
};
