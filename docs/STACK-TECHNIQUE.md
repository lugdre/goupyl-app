# Stack technique — Goupyl Sport

Ce document décrit la stack technique de la plateforme, le fonctionnement de chaque brique et les raisons de chaque choix.

---

## 1. Vue d'ensemble

Goupyl Sport est une application web full-stack organisée en **monorepo à deux projets indépendants** :

```
┌─────────────────────────────────────────────────────────────────┐
│                          NAVIGATEUR                              │
│                    React 19 SPA (Vite)                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS — appels same-origin /api
┌──────────────────────────▼──────────────────────────────────────┐
│  NETLIFY (frontend statique)                                     │
│  · sert le bundle React (dist/)                                  │
│  · proxy /api/* et /uploads/* → backend Render (rewrite 200)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  RENDER (backend Node.js)                                        │
│  Express 5 — API REST /api                                       │
│  ├── Prisma ORM ──────► PostgreSQL   (données métier)            │
│  ├── ioredis ─────────► Redis        (sessions, challenges)      │
│  ├── stripe ──────────► Stripe       (paiements, marketplace)    │
│  └── resend ──────────► Resend       (emails transactionnels)    │
└──────────────────────────────────────────────────────────────────┘
```

**Principe directeur** : une architecture classique et éprouvée (SPA + API REST + base relationnelle), sans sur-ingénierie. Chaque brique a été choisie pour sa maturité, sa documentation et sa capacité à être maintenue par une petite équipe.

---

## 2. Frontend

| Brique | Version | Rôle |
|---|---|---|
| React | 19 | Bibliothèque UI |
| Vite | 8 | Bundler / dev server |
| Tailwind CSS | 4 | Styles utilitaires |
| React Router | 7 | Routing SPA |
| Axios | 1.13 | Client HTTP |
| Stripe.js + React Stripe | 9 / 6 | Éléments de paiement embarqués |
| SimpleWebAuthn (browser) | 13 | Passkeys côté client |
| Recharts | 3 | Graphiques (analytics entreprise/admin) |
| date-fns | 4 | Manipulation de dates |
| lucide-react | 1.6 | Icônes |
| react-hot-toast | 2.6 | Notifications toast |

### React 19 — pourquoi

- **Écosystème dominant** : la plus grande communauté, le plus de ressources, le plus de bibliothèques compatibles (Stripe Elements, Recharts, react-router ont tous un support React de premier ordre).
- **Modèle mental simple pour ce projet** : l'app est un ensemble de dashboards CRUD par rôle. Le couple composants + hooks + contexte suffit — pas besoin de state manager externe (Redux/Zustand) : l'état global se limite à l'authentification (`AuthContext`) et au thème (`ThemeContext`), le reste est de l'état local de page rechargé depuis l'API.
- **Alternative écartée — Next.js** : le rendu serveur n'apporte rien ici (application derrière login, sauf la landing), et le déploiement statique sur Netlify est plus simple et gratuit. Une SPA pure évite de gérer un serveur Node côté front.

### Vite — pourquoi

- **Vitesse de développement** : démarrage instantané et HMR quasi immédiat (le build complet du projet prend < 400 ms), contre plusieurs secondes avec Webpack/CRA.
- **Proxy dev intégré** : `vite.config.js` proxifie `/api` → `localhost:3000`, ce qui reproduit en local le comportement du proxy Netlify en production. **Conséquence clé : zéro configuration CORS**, en dev comme en prod, car le navigateur ne parle jamais qu'à son propre domaine.
- Create React App est déprécié ; Vite est le standard de facto pour les SPA React.

### Tailwind CSS v4 — pourquoi

- **Rapidité d'itération** sur les dashboards : les styles vivent dans le JSX, pas de fichiers CSS à synchroniser, pas de conflits de nommage.
- La v4 s'intègre par **plugin Vite** (`@tailwindcss/vite`) : plus de config PostCSS ni de `tailwind.config` obligatoire.
- **Nuance assumée** : les pages publiques (landing, login, register, profil coach public) utilisent du CSS inline sur mesure avec une direction artistique éditoriale (Archivo Narrow / Inter Tight / JetBrains Mono). Tailwind sert l'app « outil » (dashboards), le CSS custom sert la vitrine — deux besoins, deux approches.

### React Router 7 — pourquoi

- Standard du routing SPA React. Les **routes imbriquées** épousent exactement la structure de l'app : un layout `DashboardLayout` par rôle avec un `<Outlet/>`, protégé par deux gardes composables (`ProtectedRoute` → authentification, `RoleRoute` → autorisation par rôle).

### Axios — pourquoi (plutôt que fetch)

Le besoin décisif : les **intercepteurs**. L'instance unique (`services/api.js`) :
1. injecte automatiquement le Bearer token sur chaque requête ;
2. sur une réponse 401, **rafraîchit le token de manière transparente et rejoue la requête** (avec file d'attente pour les 401 concurrents), en excluant les routes d'auth ;
3. déconnecte proprement si le refresh échoue.

Implémenter cette mécanique avec `fetch` natif reviendrait à réécrire un mini-axios.

---

## 3. Backend

| Brique | Version | Rôle |
|---|---|---|
| Node.js + Express | 5 | Serveur HTTP / API REST |
| Prisma | 5.22 | ORM PostgreSQL |
| PostgreSQL | — | Base de données relationnelle |
| ioredis | 5 | Client Redis |
| Zod | 4 | Validation des entrées |
| jsonwebtoken | 9 | Tokens JWT |
| bcryptjs | 3 | Hachage des mots de passe |
| @simplewebauthn/server | 13 | Passkeys / WebAuthn |
| stripe | 21 | Paiements |
| resend | 6 | Emails transactionnels |
| multer | 2 | Upload de fichiers |
| helmet / express-rate-limit / morgan | — | Sécurité HTTP / anti-brute-force / logs |
| Jest + Supertest | 30 / 7 | Tests |

### Express 5 — pourquoi

- **Minimalisme maîtrisé** : Express n'impose rien ; l'architecture en couches du projet (routes → middlewares → controllers → services) est explicite et lisible dans le code plutôt que cachée dans un framework.
- Le besoin est une API REST classique : pas de GraphQL, pas de temps réel — Express suffit largement.
- **Alternatives écartées** : NestJS (courbe d'apprentissage + verbosité injustifiées pour cette taille d'équipe), Fastify (gain de performance non critique ici, écosystème de middlewares moins fourni).

**Fonctionnement — le pipeline de requête** :

```
Requête → helmet (headers sécurité) → cors → morgan (log) → rate-limit global 100/min
  → express.raw sur /payments/webhook (AVANT express.json — Stripe signe le corps brut)
  → express.json → routes/index.js
    → authenticate (JWT → req.user) → authorize(...rôles) → validate (Zod)
    → controller (mince : try/catch, délègue) → service (logique métier)
    → errorHandler centralisé (ApiError, erreurs Prisma P2002/P2025, erreurs JWT)
```

Chaque domaine métier (16 au total : auth, users, appointments, payments, parq, …) suit le même triple `routes/X.routes.js` + `controllers/X.controller.js` + `services/X.service.js`, plus un `validators/X.validator.js`. Un développeur qui a compris un domaine les a tous compris.

### PostgreSQL + Prisma — pourquoi

**PostgreSQL** parce que les données sont profondément **relationnelles** : un `Appointment` relie un client, un intervenant, un service, un paiement, un avis et un compte-rendu ; un `User` entreprise possède ses salariés (self-relation). L'intégrité référentielle (FK, contraintes d'unicité) et les transactions sont non négociables pour un système de réservation et de paiement. Un document store (MongoDB) aurait déplacé cette rigueur dans le code applicatif.

**Prisma** comme ORM :
- **Schéma déclaratif unique** (`schema.prisma`, 15 modèles) qui sert à la fois de documentation du modèle de données, de source des migrations et de générateur de client typé.
- **Client auto-généré** avec autocomplétion sur chaque modèle/champ — les erreurs de requête se voient à l'écriture, pas en production.
- `prisma db push` pour synchroniser le schéma en dev, Prisma Studio comme GUI d'inspection.
- **Alternatives écartées** : SQL brut (trop d'écriture répétitive pour 15 modèles), Sequelize (API datée), TypeORM (fiabilité des migrations).

### Redis (ioredis) — pourquoi

Redis stocke tout ce qui est **éphémère avec TTL natif** :
- les **refresh tokens** (7 jours) — les révoquer = les supprimer, un logout serveur est instantané ;
- les **challenges WebAuthn** (5 min) lors de l'enregistrement/authentification par passkey ;
- les **tokens de vérification email** (24 h).

Mettre ces données en PostgreSQL fonctionnerait, mais imposerait un nettoyage manuel des expirés ; Redis le fait nativement (`SET ... EX`). Le module `config/redis.js` prévoit un **fallback en mémoire** si `REDIS_URL` est absent — acceptable en dev, documenté comme dangereux en production (les sessions ne survivent pas à un redémarrage).

### Zod 4 — pourquoi

- **Validation à la frontière** : chaque corps de requête traverse un schéma Zod avant d'atteindre le contrôleur. Messages d'erreur en français, transformation intégrée (trim, lowercase des emails), regex métier (SIRET à 14 chiffres, complexité du mot de passe).
- Schémas **composables et déclaratifs** — le validator est lisible comme une spécification.
- Alternative écartée : Joi (API plus verbeuse, dynamique moins bonne avec l'outillage moderne).
- ⚠️ Piège documenté : Zod 4 expose les erreurs dans `error.issues` (et non `error.errors` comme Zod 3) — le middleware `validate` en tient compte.

### Authentification — JWT double token + bcrypt + Passkeys

- **Access token 15 min / refresh token 7 jours** : le vol d'un access token a une fenêtre d'exploitation courte ; le refresh token, lui, est **vérifié contre Redis** à chaque usage, donc révocable côté serveur (contrairement à du JWT pur stateless).
- **bcryptjs** (coût 12) pour les mots de passe : standard éprouvé, version pure-JS qui évite les problèmes de compilation native au déploiement.
- **Passkeys (WebAuthn)** via SimpleWebAuthn : authentification sans mot de passe, résistante au phishing — un différenciateur UX moderne qui réutilise la même émission de JWT que le login classique.
- **RBAC** : le rôle est embarqué dans le JWT et vérifié par middleware (`authorize('CLIENT', ...)`) route par route.
- **Défense en profondeur** : helmet (headers), rate-limit global 100/min et **10/min sur login/register** (anti-brute-force), chiffrement **AES-256-GCM** des réponses au questionnaire médical PARQ (données de santé jamais stockées en clair, clé dérivée par scrypt).

### Stripe — pourquoi

Le besoin couvre **deux flux très différents**, et Stripe est l'un des rares PSP à couvrir les deux proprement :

1. **Abonnements entreprise** — Stripe **Checkout** (page hébergée) : aucune donnée bancaire ne transite par nos serveurs, conformité PCI déléguée, facturation par collaborateur via `quantity`.
2. **Marketplace B2C** — Stripe **Connect** : chaque coach ouvre un compte connecté (onboarding hébergé par Stripe, KYC inclus) ; le paiement d'une séance crée un PaymentIntent avec `application_fee_amount` (30 % plateforme) et transfert automatique des 70 % au coach. **Sans Connect, il faudrait un agrément d'établissement de paiement** pour encaisser pour compte de tiers — Stripe porte cette charge réglementaire.

La fiabilité repose sur une **double confirmation** : webhook signé (`checkout.session.completed`, `payment_intent.succeeded`) **et** vérification côté API au retour du client — si l'un des deux canaux échoue, l'autre couvre.

### Resend — pourquoi

Emails transactionnels (vérification de compte, invitations entreprise). API minimaliste (un `POST`), offre gratuite suffisante, DX moderne. Alternatives (SendGrid, Mailgun) plus lourdes à configurer pour le même besoin. Le module email est un **no-op silencieux** sans clé API — l'app fonctionne sans emails en dev.

### Multer — uploads

Pièces d'identité et diplômes des coachs : stockage disque local (`uploads/documents/`), noms de fichiers UUID (pas de collision ni de fuite d'info), 5 Mo max, PDF/JPG/PNG uniquement, lecture réservée à l'ADMIN via un endpoint qui streame le binaire. *Limite connue : un stockage objet (S3) serait nécessaire à plus grande échelle, le disque Render étant éphémère.*

### Jest + Supertest — tests

- **Tests unitaires** : Prisma et Redis sont mockés (`jest.mock` sur les modules de config) — les services se testent sans infrastructure.
- **Tests d'intégration** : Supertest attaque l'app Express réelle avec une vraie base.

---

## 4. Hébergement & déploiement

| Service | Rôle | Pourquoi |
|---|---|---|
| **Netlify** | Frontend statique + proxy | Déploiement git-push, CDN, HTTPS auto, gratuit. Le fichier `netlify.toml` fait office de reverse-proxy (`/api/*` → Render) : le front et l'API partagent le même domaine → **pas de CORS, cookies/headers simples** |
| **Render** | Backend Node + PostgreSQL | Déploiement git-push d'un service Node long-running (nécessaire : Express + connexions persistantes Prisma/Redis, incompatible avec du serverless à froid). Postgres managé attenant |
| **Upstash / Render Key-Value** | Redis managé | TTL natif, offre gratuite |

**Discipline de déploiement apprise sur ce projet** (documentée dans CLAUDE.md) :
- La *Start Command* Render se ré-exécute à **chaque réveil** de l'instance gratuite → elle ne doit contenir **que** `npm start`. La synchronisation du schéma (`prisma db push`) vit dans la *Build Command*. Le seed (destructif) ne s'exécute que manuellement.
- Le serveur ouvre ses connexions Prisma/Redis **au démarrage** (warm-up dans `server.js`) pour éviter les 504 de cold start sur la première requête.
- Les variables `VITE_*` sont figées **au build** (Netlify) ; les variables backend vivent dans le dashboard Render.

---

## 5. Choix transverses

### CommonJS (backend) / ESM (frontend)
Le backend est en CommonJS (`require`), standard historique de Node, sans étape de build : le code déployé est le code écrit. Le frontend est en ESM, imposé et optimisé par Vite (tree-shaking). Pas de TypeScript : compromis assumé — la validation runtime (Zod) protège la frontière API, et Prisma fournit l'autocomplétion sur la couche données, là où les erreurs de type coûtent le plus cher.

### API REST (vs GraphQL)
Les écrans consomment des ressources CRUD par domaine, sans besoin de requêtage flexible côté client. REST + un module API frontend par domaine (`user.api.js`, `payment.api.js`, …) garde une symétrie 1:1 lisible entre le front et le back.

### Monorepo simple (vs workspaces/Turborepo)
Deux dossiers, deux `package.json`. Aucun code partagé entre front et back (les constantes dupliquées comme les labels de catégories sont un compromis accepté) — l'outillage de monorepo n'apporterait que de la complexité.

---

## 6. Limites connues et évolutions envisagées

| Limite actuelle | Évolution naturelle |
|---|---|
| Uploads sur disque local (éphémère sur Render) | Stockage objet S3/R2 |
| Pas de TypeScript backend | Migration progressive ou JSDoc + `checkJs` |
| Abonnements Stripe en paiement one-shot (renouvellement manuel) | Stripe Billing (subscriptions récurrentes + prorata) |
| Vérification SIRET déclarative | Intégration API Pappers (prévue) |
| Notifications par polling (30 s) | SSE ou WebSocket si le besoin temps réel se confirme |
| Instance Render gratuite (cold starts) | Plan payant ou keep-alive |
