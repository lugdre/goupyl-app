// Environnement déterministe pour les tests unitaires et d'API : on
// n'hérite JAMAIS du .env du développeur, sinon un test peut passer sur une
// machine et échouer sur une autre.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_32_chars_minimum_ok_1234';
process.env.JWT_ACCESS_SECRET = 'test_jwt_secret_32_chars_minimum_ok_1234';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minimum_ok';
process.env.PARQ_ENCRYPTION_KEY = 'test_parq_encryption_key_32_chars_ok_ab';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
// Valeurs neutres plutôt que `delete` : src/app.js charge le .env de
// développement via dotenv, qui remplit toute variable ABSENTE. Un delete
// serait donc annulé et les tests parleraient à la vraie instance Redis et à
// la vraie clé Resend (emails réellement envoyés). Une clé présente mais vide
// est respectée par dotenv et interprétée comme absente par nos configs.
process.env.RESEND_API_KEY = "";  // config/email bascule en no-op
process.env.REDIS_URL = "";       // config/redis bascule en MemoryStore
process.env.GOOGLE_CLIENT_ID = "";

// Les services journalisent volontairement beaucoup (stack traces de
// l'errorHandler, avertissements de dégradation). On garde une sortie de test
// lisible ; TEST_VERBOSE=1 restaure les logs pour déboguer.
if (!process.env.TEST_VERBOSE) {
  global.console.error = () => {};
  global.console.warn = () => {};
  global.console.log = () => {};
  // morgan écrit directement sur stdout, en dehors de console.* ; le rapporteur
  // Jest, lui, écrit depuis le processus parent et reste donc visible.
  process.stdout.write = () => true;
}
