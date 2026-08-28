/**
 * Avatars de démonstration — visages générés par IA (thispersondoesnotexist.com).
 *
 * Tant que les coachs n'ont pas téléversé leur vraie photo, l'UI retombe sur une
 * silhouette SVG générique. Ce script remplace ces silhouettes par des portraits
 * plausibles : l'image est téléchargée, redimensionnée puis stockée en base
 * (`avatarData` bytea), exactement comme un upload utilisateur — rien ne vit sur
 * le disque et rien ne dépend d'un service externe au runtime.
 *
 *   node src/prisma/seed-avatars.js                # intervenants sans avatar
 *   node src/prisma/seed-avatars.js --all          # écrase aussi les avatars existants
 *   node src/prisma/seed-avatars.js --role=CLIENT  # autre rôle (ou --role=ALL)
 *   node src/prisma/seed-avatars.js --limit=5
 *
 * ⚠️ Placeholders uniquement : les visages sont aléatoires, ils ne respectent ni
 * le genre ni l'âge du profil. À supprimer dès que les vraies photos arrivent.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

// La page d'accueil renvoie du HTML ; c'est cette URL qui sert le JPEG (1024×1024).
const SOURCE_URL = 'https://thispersondoesnotexist.com/random-person.jpeg';
const TARGET_SIZE = 400;   // px — un avatar 1024² pèse ~500 Ko, inutile en base
const JPEG_QUALITY = 82;
const DELAY_MS = 600;      // courtoisie envers le service (pas de rafale)
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchFace = async () => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(SOURCE_URL, {
        headers: { 'User-Agent': 'Mozilla/5.0 (goupyl-sport seed)' },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const type = res.headers.get('content-type') || '';
      if (!type.startsWith('image/')) throw new Error(`Réponse non-image (${type})`);
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 1024) throw new Error('Image tronquée');
      return buffer;
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) await sleep(DELAY_MS * attempt);
    }
  }
  throw lastError;
};

/**
 * Réduction box-average vers un carré TARGET_SIZE (la source est déjà carrée).
 * jpeg-js est une devDependency : si elle manque, on stocke l'original tel quel
 * plutôt que d'échouer.
 */
const downscale = (buffer) => {
  let jpeg;
  try {
    jpeg = require('jpeg-js');
  } catch {
    return { data: buffer, mimeType: 'image/jpeg' };
  }
  try {
    const src = jpeg.decode(buffer, { useTArray: true });
    if (src.width <= TARGET_SIZE) return { data: buffer, mimeType: 'image/jpeg' };

    const size = TARGET_SIZE;
    const out = Buffer.alloc(size * size * 4);
    const ratioX = src.width / size;
    const ratioY = src.height / size;

    for (let y = 0; y < size; y++) {
      const y0 = Math.floor(y * ratioY);
      const y1 = Math.min(src.height, Math.ceil((y + 1) * ratioY));
      for (let x = 0; x < size; x++) {
        const x0 = Math.floor(x * ratioX);
        const x1 = Math.min(src.width, Math.ceil((x + 1) * ratioX));
        let r = 0, g = 0, b = 0, n = 0;
        for (let sy = y0; sy < y1; sy++) {
          for (let sx = x0; sx < x1; sx++) {
            const i = (sy * src.width + sx) * 4;
            r += src.data[i];
            g += src.data[i + 1];
            b += src.data[i + 2];
            n++;
          }
        }
        const o = (y * size + x) * 4;
        out[o] = r / n;
        out[o + 1] = g / n;
        out[o + 2] = b / n;
        out[o + 3] = 255;
      }
    }
    return {
      data: jpeg.encode({ data: out, width: size, height: size }, JPEG_QUALITY).data,
      mimeType: 'image/jpeg',
    };
  } catch {
    return { data: buffer, mimeType: 'image/jpeg' };
  }
};

/**
 * @param {object}  options
 * @param {import('@prisma/client').PrismaClient} options.prisma
 * @param {string}  [options.role='INTERVENANT']  rôle ciblé, 'ALL' pour tous
 * @param {boolean} [options.overwrite=false]     écraser les avatars existants
 * @param {number}  [options.limit]               nombre max d'utilisateurs traités
 * @returns {Promise<{ updated: number, skipped: number, total: number }>}
 */
const assignAvatars = async ({ prisma, role = 'INTERVENANT', overwrite = false, limit } = {}) => {
  const users = await prisma.user.findMany({
    where: {
      ...(role !== 'ALL' && { role }),
      ...(overwrite ? {} : { avatarData: null }),
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { id: 'asc' },
    ...(limit && { take: limit }),
  });

  let updated = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      const { data, mimeType } = downscale(await fetchFace());
      await prisma.user.update({
        where: { id: user.id },
        data: {
          avatarData: data,
          avatarMimeType: mimeType,
          avatarUrl: `/api/users/${user.id}/avatar?v=${Date.now()}`,
        },
      });
      updated++;
      console.log(`  ✓ ${user.firstName} ${user.lastName} (${Math.round(data.length / 1024)} Ko)`);
    } catch (err) {
      skipped++;
      console.warn(`  ✗ ${user.firstName} ${user.lastName} — ${err.message}`);
    }
    await sleep(DELAY_MS);
  }

  return { updated, skipped, total: users.length };
};

module.exports = { assignAvatars };

if (require.main === module) {
  const arg = (name, fallback) => {
    const found = process.argv.find((a) => a.startsWith(`--${name}=`));
    return found ? found.split('=')[1] : fallback;
  };

  const options = {
    role: (arg('role', 'INTERVENANT') || 'INTERVENANT').toUpperCase(),
    overwrite: process.argv.includes('--all'),
    limit: Number(arg('limit')) || undefined,
  };

  const prisma = new PrismaClient();
  console.log(`Avatars de démo — rôle ${options.role}${options.overwrite ? ' (écrasement)' : ' (manquants uniquement)'}`);

  assignAvatars({ prisma, ...options })
    .then(({ updated, skipped, total }) => {
      if (!total) console.log('Aucun utilisateur à traiter.');
      else console.log(`Terminé : ${updated}/${total} avatars posés${skipped ? `, ${skipped} échec(s)` : ''}.`);
    })
    .catch((err) => {
      console.error('Échec :', err.message);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
