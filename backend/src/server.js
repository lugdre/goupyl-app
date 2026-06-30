require('dotenv').config();
const app = require('./app');
const prisma = require('./config/database');
const redis = require('./config/redis');

const PORT = process.env.PORT || 3000;

// Ouvrir les connexions au démarrage pour éviter le cold start (504 sur la
// première requête, le temps que Prisma + Redis établissent leur connexion).
const warmUp = async () => {
  await prisma.$connect();
  // ioredis (lazyConnect) expose .connect() ; le MemoryStore de fallback non.
  // Connexion Redis non bloquante : si Redis est down, le serveur démarre
  // quand même (les erreurs Redis sont déjà gérées par requête).
  if (typeof redis.connect === 'function') {
    try {
      await redis.connect();
    } catch (err) {
      console.warn('Redis indisponible au demarrage :', err.message);
    }
  }
};

warmUp()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\nGoupyl Sport API`);
      console.log(`Serveur demarre sur le port ${PORT}`);
      console.log(`http://localhost:${PORT}/api/health`);
      console.log(`Environnement : ${process.env.NODE_ENV || 'development'}\n`);
    });
  })
  .catch((err) => {
    console.error('Echec du demarrage (connexion DB/Redis) :', err.message);
    process.exit(1);
  });
