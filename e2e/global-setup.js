/**
 * Préparation de la suite fonctionnelle :
 *   1. réamorçage du jeu de données (chaque exécution repart à l'identique) ;
 *   2. création d'une session pré-authentifiée par rôle.
 *
 * Pourquoi des sessions pré-établies plutôt qu'une connexion dans chaque test :
 * l'API limite /api/auth/login à 10 requêtes par minute et par IP. Tous les
 * tests partant de la même machine, une vingtaine de connexions successives
 * déclencherait des 429 et rendrait la suite instable. Les jetons sont donc
 * signés directement avec le secret de l'environnement E2E — exactement comme
 * le fait le serveur — puis déposés dans le localStorage du navigateur.
 *
 * Les scénarios qui testent le formulaire de connexion lui-même continuent de
 * passer par l'interface : ils sont peu nombreux et restent sous le plafond.
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '.env.e2e'), quiet: true });

const STORAGE_DIR = path.resolve(__dirname, '.auth');
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5199';

const COMPTES = {
  admin: 'admin@e2e.test',
  coach: 'coach@e2e.test',
  coach2: 'coach2@e2e.test',
  entreprise: 'rh@e2e.test',
  client: 'client@e2e.test',
  salarie: 'salarie@e2e.test',
};

module.exports = async () => {
  execFileSync(process.execPath, [path.resolve(__dirname, 'seed.js')], { stdio: 'inherit' });

  const backend = path.resolve(__dirname, '../backend');
  const jwt = require(path.join(backend, 'node_modules/jsonwebtoken'));
  const { PrismaClient } = require(path.join(backend, 'node_modules/@prisma/client'));
  const prisma = new PrismaClient();

  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  try {
    for (const [alias, email] of Object.entries(COMPTES)) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error(`Compte ${email} absent du jeu de donnees.`);

      const publicUser = {
        id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
        role: user.role, isActive: user.isActive, verificationStatus: user.verificationStatus,
        verificationNote: user.verificationNote, employerCompanyId: user.employerCompanyId,
        joinCode: user.joinCode, createdAt: user.createdAt,
      };

      const accessToken = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '2h' });
      const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

      fs.writeFileSync(
        path.join(STORAGE_DIR, `${alias}.json`),
        JSON.stringify({
          cookies: [],
          origins: [{
            origin: FRONTEND_ORIGIN,
            localStorage: [
              { name: 'accessToken', value: accessToken },
              { name: 'refreshToken', value: refreshToken },
              { name: 'user', value: JSON.stringify(publicUser) },
            ],
          }],
        }, null, 2)
      );
    }
    console.log(`OK ${Object.keys(COMPTES).length} sessions pre-authentifiees creees`);
  } finally {
    await prisma.$disconnect();
  }
};
