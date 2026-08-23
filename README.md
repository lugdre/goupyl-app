# Goupyl Sport

Plateforme web mettant en relation des **professionnels du sport et du bien-être** vérifiés avec des **particuliers** (B2C) et des **entreprises** (B2B). Elle couvre tout le cycle : découverte du coach → réservation → questionnaire médical → paiement → validation de présence → avis.

- **Entreprises** : abonnement par collaborateur, quota mensuel de séances prises en charge, suivi d'usage.
- **Particuliers** : réservation à la séance, paiement en ligne avec reversement automatique au coach (commission 30 %).
- **Professionnels** : catalogue de prestations, agenda, validation par QR code, encaissement Stripe Connect.
- **Administration** : vérification des dossiers sur pièces, arbitrage des litiges, catalogue produits.

---

## Sommaire

- [Stack](#stack)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Lancer le projet](#lancer-le-projet)
- [Comptes de démonstration](#comptes-de-démonstration)
- [Tests](#tests)
- [Commandes utiles](#commandes-utiles)
- [Structure du dépôt](#structure-du-dépôt)
- [Déploiement](#déploiement)
- [Documentation](#documentation)

---

## Stack

| | |
|---|---|
| **Frontend** | React 19 · Vite 8 · Tailwind CSS v4 · React Router 7 · Axios |
| **Backend** | Node.js · Express 5 (CommonJS) · Prisma 5 · Zod 4 |
| **Données** | PostgreSQL · Redis (sessions, challenges, TTL) |
| **Services** | Stripe (Checkout + Connect) · Resend (emails) |
| **Tests** | Jest + Supertest · Vitest + Testing Library · Playwright |
| **Hébergement** | Netlify (frontend) · Render (backend + PostgreSQL) |

Justification détaillée de chaque choix : [docs/STACK-TECHNIQUE.md](docs/STACK-TECHNIQUE.md).

---

## Prérequis

- **Node.js 22**
- **PostgreSQL 16** en local
- **Redis** en local (facultatif mais recommandé — voir l'avertissement plus bas)

---

## Installation

### 1. Cloner et installer les dépendances

```bash
git clone <url-du-depot> goupyl-sport
cd goupyl-sport

cd backend  && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Créer la base de données

```bash
createdb goupyl_sport
```

### 3. Configurer les variables d'environnement

```bash
cp backend/.env.example backend/.env
```

Puis renseigner `backend/.env` :

| Variable | Rôle | Sans elle |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL | ⛔ le serveur ne démarre pas |
| `JWT_SECRET` | Signature des access tokens (lu par `config/jwt.js`) | ⛔ authentification cassée |
| `JWT_REFRESH_SECRET` | Signature des refresh tokens | ⛔ rafraîchissement cassé |
| `JWT_ACCESS_SECRET` | Lu par `utils/encryption.js` — **garder identique à `JWT_SECRET`** | ⚠️ incohérence silencieuse |
| `PARQ_ENCRYPTION_KEY` | Clé AES du questionnaire médical (repli : `JWT_ACCESS_SECRET`, puis `JWT_SECRET`) | ⚠️ 500 à la soumission du PAR-Q si aucun repli |
| `REDIS_URL` | Sessions, challenges passkey, jetons email | ⚠️ **repli mémoire** : toutes les sessions sont perdues à chaque redémarrage |
| `RESEND_API_KEY` | Emails transactionnels | ⚠️ **envoi désactivé en silence** |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Paiements | ⚠️ les routes de paiement lèvent une erreur au premier appel |
| `CORS_ORIGIN`, `FRONTEND_URL` | Origine autorisée, liens des emails et redirections Stripe | ⚠️ liens cassés |
| `PASSKEY_RP_ID`, `PASSKEY_ORIGIN` | WebAuthn — doivent correspondre au domaine servi | ⚠️ passkeys inopérantes |
| `GOOGLE_CLIENT_ID` | Vérification des ID tokens Google Sign-In | ⚠️ « Continuer avec Google » échoue |

> ⚠️ **Piège à connaître.** Plusieurs modules **dégradent en silence** au lieu d'échouer au démarrage : une variable oubliée ne se remarque qu'à l'usage, parfois en production. C'est la cause de l'incident n° 5 documenté dans le [dossier projet](docs/DOSSIER-PROJET.md#8-difficultés-rencontrées-et-résolution--études-de-cas-réelles). Les avertissements sont affichés dans les logs de démarrage : lisez-les.

`frontend/.env` est **versionné** (cas inhabituel, assumé) et ne contient que `VITE_STRIPE_PUBLISHABLE_KEY`, une clé publique figée dans le bundle au moment du build.

### 4. Synchroniser le schéma et charger les données de démonstration

```bash
cd backend
npx prisma db push --schema=src/prisma/schema.prisma
npm run db:seed
```

> ⚠️ **`db:seed` est destructif** : il vide toutes les tables avant de recharger le jeu de démonstration. Ne jamais l'exécuter contre une base contenant de vraies données.

> ⚠️ **Ne pas utiliser `prisma migrate`.** Les migrations versionnées dans `src/prisma/migrations/` sont en retard sur `schema.prisma`. La synchronisation se fait par `prisma db push`.

---

## Lancer le projet

Deux terminaux :

```bash
cd backend  && npm run dev    # API   → http://localhost:3000
cd frontend && npm run dev    # SPA   → http://localhost:5173
```

Le serveur Vite proxifie `/api` vers `localhost:3000` : le navigateur ne parle qu'à un seul domaine, **aucune configuration CORS n'est nécessaire** en développement (ni en production, où Netlify joue le même rôle).

---

## Comptes de démonstration

Créés par `npm run db:seed`. Mot de passe commun : **`Password1!`**

| Compte | Rôle |
|---|---|
| `admin@goupylsport.fr` | ADMIN |
| `marc.leroy@email.com` · `sophie.martin@email.com` · `julien.blanc@email.com` | INTERVENANT (avec prestations) |
| `marvin.dupont@email.com` · `sarah.benali@email.com` | CLIENT |
| `rh@acmecorp.fr` (Essentiel) · `wellness@techstart.fr` (Boost) · `sport@industria.fr` (Ultra) | ENTREPRISE |

---

## Tests

**1 236 tests sur cinq niveaux.** Stratégie complète : [docs/STRATEGIE-TESTS.md](docs/STRATEGIE-TESTS.md).

```bash
# Backend — aucune dépendance externe requise
cd backend
npm test                  # unitaires (593) + API (333), ~6 s
npm run test:coverage

# Backend — intégration (vraie base PostgreSQL)
npm run test:db:setup     # ⚠ une seule fois : crée goupyl_sport_test
npm run test:integration  # 82 tests
npm run test:all          # les trois niveaux

# Frontend
cd frontend && npm test   # 169 tests (Vitest)

# Fonctionnels (navigateur réel)
cd e2e
npm run setup             # ⚠ une seule fois : base goupyl_sport_e2e + Chromium
npm test                  # 59 parcours, ~90 s
npm run test:headed       # navigateur visible (démonstration)
```

Aucun test n'appelle un service tiers ni ne touche à la base de développement. Les suites E2E tournent sur leurs propres ports (API 3100, front 5199) et leur propre base.

`.github/workflows/tests.yml` rejoue l'ensemble à chaque poussée et chaque pull request.

---

## Commandes utiles

```bash
# backend/
npm run db:generate    # regénérer le client Prisma après modification du schéma
npm run db:studio      # Prisma Studio (GUI d'inspection)
npm run lint

# frontend/
npm run build          # → dist/
npm run lint
```

Toutes les commandes Prisma exigent le chemin explicite du schéma (`--schema=src/prisma/schema.prisma`), son emplacement n'étant pas standard.

---

## Structure du dépôt

```
backend/
  src/
    app.js              pipeline Express (helmet, cors, rate-limit, routes)
    server.js           warm-up des connexions + balayage des réservations expirées
    config/             database, redis, jwt, stripe, email
    routes/             16 domaines montés sous /api
    controllers/        minces : try/catch et délégation
    services/           toute la logique métier
    validators/         schémas Zod
    middlewares/        auth, RBAC, validation, uploads, gestion d'erreurs
    prisma/             schema.prisma (18 modèles) + seed.js
  tests/                unit · api · integration

frontend/
  src/
    pages/              par rôle : public, client, intervenant, entreprise, admin
    components/         layout, ui, composants métier
    contexts/           AuthContext, ThemeContext
    services/           un module API par domaine backend
    utils/              constantes partagées, export CSV, helpers
  netlify.toml          build, proxy /api/*, fallback SPA

e2e/                    Playwright — parcours utilisateurs de bout en bout
docs/                   dossier projet, stack, stratégie de tests, cahier de recette
CLAUDE.md               conventions internes et pièges du projet
```

---

## Déploiement

- **Frontend → Netlify** : build `npm run build`, publication de `dist/`, proxy serveur `/api/*` vers le backend Render et fallback SPA. Les variables `VITE_*` sont **figées au moment du build**.
- **Backend → Render** (Web Service) :
  - *Build Command* : `npm install && npx prisma generate --schema=src/prisma/schema.prisma && npx prisma db push --schema=src/prisma/schema.prisma`
  - *Start Command* : `npm start` — **et rien d'autre**

> 🚨 **Ne jamais mettre `db:seed`, `prisma migrate reset` ou `db push --accept-data-loss` dans la Start Command.** Sur l'offre gratuite, l'instance se met en veille et la Start Command **se ré-exécute à chaque réveil** : le seed viderait la base en production plusieurs fois par jour. C'est un incident réellement survenu sur ce projet.

Le système de fichiers Render est **éphémère** (effacé à chaque déploiement et à chaque réveil) : c'est pourquoi aucun fichier téléversé n'est écrit sur disque — avatars, photos et pièces justificatives sont stockés en `bytea` PostgreSQL et servis par des routes `/api`.

Pour diagnostiquer un 500 en production : hors développement, l'API renvoie un message générique. La vraie trace se lit dans les logs Render, à la ligne `Erreur:`.

---

## Documentation

| Document | Contenu |
|---|---|
| [docs/DOSSIER-PROJET.md](docs/DOSSIER-PROJET.md) | Contexte, conception, parcours fonctionnels détaillés, sécurité, incidents de production et leur résolution |
| [docs/STACK-TECHNIQUE.md](docs/STACK-TECHNIQUE.md) | Chaque brique technique, son rôle et la justification du choix |
| [docs/STRATEGIE-TESTS.md](docs/STRATEGIE-TESTS.md) | Les cinq niveaux de test, la couverture, les anomalies révélées |
| [docs/CAHIER-RECETTE.md](docs/CAHIER-RECETTE.md) | 128 scénarios de validation fonctionnelle |
| [CLAUDE.md](CLAUDE.md) | Conventions internes, pièges et règles à respecter en développement |

### Anomalies connues

Cinq anomalies ont été identifiées pendant la campagne de tests et **volontairement non corrigées** : chacune est figée par un test de caractérisation qui documente le comportement actuel et deviendra rouge dès l'application du correctif. La plus sérieuse — la page CGU qui ne s'affiche pas — est détaillée avec les quatre autres dans [docs/STRATEGIE-TESTS.md §6](docs/STRATEGIE-TESTS.md).
