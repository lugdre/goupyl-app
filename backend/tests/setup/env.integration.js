// Les tests d'intégration attaquent une VRAIE base PostgreSQL dédiée.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test'), quiet: true });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_32_chars_minimum_ok_1234';
process.env.JWT_ACCESS_SECRET = process.env.JWT_SECRET;
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_32_chars_minimum_ok';
process.env.PARQ_ENCRYPTION_KEY = process.env.PARQ_ENCRYPTION_KEY || 'test_parq_encryption_key_32_chars_ok_ab';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.CORS_ORIGIN = 'http://localhost:5173';

// ── Neutralisation des dépendances externes ────────────────────────────────
// `src/app.js` appelle `require('dotenv').config()`, qui charge le .env de
// DÉVELOPPEMENT. dotenv n'écrase jamais une variable déjà définie, mais il
// remplit celles qui manquent : un simple `delete` serait donc annulé et les
// tests parleraient à la vraie instance Redis, à la vraie clé Resend (envoi
// d'emails réels à chaque inscription de test !) et aux vraies clés Stripe.
// On pose donc des valeurs neutres — la clé existe, dotenv la respecte.
process.env.RESEND_API_KEY = '';        // config/email bascule en no-op
process.env.REDIS_URL = '';             // config/redis bascule en MemoryStore
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.GOOGLE_CLIENT_ID = '';

// Garde-fou : jamais d'intégration sur une base qui n'est pas la base de test.
if (!/test/i.test(process.env.DATABASE_URL || '')) {
  throw new Error(
    `Refus de lancer les tests d'intégration : DATABASE_URL ne cible pas une base de test (${process.env.DATABASE_URL}). ` +
    'Lancez d\'abord : npm run test:db:setup'
  );
}

if (!process.env.TEST_VERBOSE) {
  global.console.error = () => {};
  global.console.warn = () => {};
  global.console.log = () => {};
  // morgan écrit directement sur stdout, en dehors de console.* ; le rapporteur
  // Jest, lui, écrit depuis le processus parent et reste donc visible.
  process.stdout.write = () => true;
}
