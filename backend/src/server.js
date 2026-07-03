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

    // Balayage des RDV PENDING expirés (créneau verrouillé max 24h).
    // Dans server.js (pas app.js) pour ne jamais démarrer l'interval dans les tests.
    if (process.env.NODE_ENV !== 'test') {
      const appointmentService = require('./services/appointment.service');
      let sweeping = false;
      const sweep = async () => {
        if (sweeping) return;
        sweeping = true;
        try {
          const n = await appointmentService.expirePendingAppointments();
          if (n) console.log(`[sweep] ${n} RDV PENDING expirés`);
        } catch (err) {
          console.error('[sweep] échec :', err.message);
        } finally {
          sweeping = false;
        }
      };
      sweep();
      setInterval(sweep, 10 * 60 * 1000).unref();
    }
  })
  .catch((err) => {
    console.error('Echec du demarrage (connexion DB/Redis) :', err.message);
    process.exit(1);
  });
