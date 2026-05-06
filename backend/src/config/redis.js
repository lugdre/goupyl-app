const Redis = require('ioredis');

// Fallback mémoire si pas de REDIS_URL (démo / dev sans Redis)
class MemoryStore {
  constructor() {
    this.store = new Map();
  }
  async set(key, value, exFlag, ttl) {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }
  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  async del(key) {
    this.store.delete(key);
    return 1;
  }
}

let redis;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });
  redis.on('connect', () => console.log('Redis connecte'));
  redis.on('error', (err) => console.error('Erreur Redis:', err.message));
} else {
  console.warn('REDIS_URL absent — stockage en mémoire (redémarrage = déconnexion)');
  redis = new MemoryStore();
}

module.exports = redis;
