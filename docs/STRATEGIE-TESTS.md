# Stratégie de tests — Goupyl Sport

> Document de référence de la démarche qualité. Décrit les cinq niveaux de
> test, ce que chacun couvre, comment les exécuter, et les anomalies qu'ils ont
> mises au jour.

---

## 1. Vue d'ensemble

| Niveau | Emplacement | Outil | Périmètre | Nombre | Durée |
|---|---|---|---|---:|---:|
| **Unitaire** | `backend/tests/unit/` | Jest | Logique métier isolée (Prisma, Redis, Stripe, Resend simulés) | 593 | ~5 s |
| **API** | `backend/tests/api/` | Jest + Supertest | Application Express réelle en HTTP, infrastructure simulée | 333 | ~2 s |
| **Intégration** | `backend/tests/integration/` | Jest + Supertest + PostgreSQL | Chaîne complète serveur → base de données réelle | 82 | ~7 s |
| **Composants** | `frontend/src/**/*.test.js(x)` | Vitest + Testing Library | Utilitaires, client HTTP, contexte d'authentification, composants | 169 | ~2 s |
| **Fonctionnel (E2E)** | `e2e/tests/` | Playwright | Parcours utilisateurs dans un vrai navigateur | 59 | ~90 s |
| **Total** | | | | **1 236** | |

### Pourquoi cinq niveaux plutôt qu'un seul

Chaque niveau attrape une famille de défauts que les autres laissent passer :

- les **tests unitaires** cadrent les règles chiffrées (paliers de
  remboursement, quotas, commission de 30 %) et tous leurs cas aux bornes —
  impossible à couvrir exhaustivement en bout en bout ;
- les **tests d'API** valident le câblage : authentification, autorisation par
  rôle, validation Zod, traduction des erreurs en codes HTTP. C'est là qu'est
  vérifiée la matrice complète des 43 routes protégées × 4 rôles ;
- les **tests d'intégration** vérifient ce que les doubles ne peuvent pas
  garantir : contraintes d'unicité, clés étrangères, transactions, pièges de
  requêtes Prisma ;
- les **tests de composants** couvrent la logique qui vit dans le navigateur
  (intercepteurs HTTP, contexte d'authentification, calcul des créneaux) sans
  payer le coût d'un vrai navigateur ;
- les **tests fonctionnels** valident ce que voit réellement l'utilisateur,
  y compris ce qu'aucun test serveur ne peut voir — une page blanche, par
  exemple.

---

## 2. Exécution

### Prérequis

- Node 22, PostgreSQL 16 en local.
- Aucune clé Stripe / Resend / Redis n'est nécessaire : tous les tests
  neutralisent ces dépendances (voir §4).

### Commandes

```bash
# ── Backend ────────────────────────────────────────────────────────────
cd backend
npm test                  # unitaires + API — aucune dépendance externe
npm run test:unit         # unitaires seuls
npm run test:api          # API seuls
npm run test:coverage     # unitaires + API avec rapport de couverture
npm run test:watch        # mode surveillance pendant le développement

npm run test:db:setup     # ⚠ une seule fois : crée goupyl_sport_test
npm run test:integration  # intégration (base réelle, séquentiel)
npm run test:all          # les trois niveaux

# ── Frontend ───────────────────────────────────────────────────────────
cd frontend
npm test                  # tous les tests
npm run test:watch        # mode surveillance
npm run test:coverage     # avec rapport de couverture

# ── Fonctionnels ───────────────────────────────────────────────────────
cd e2e
npm run setup             # ⚠ une seule fois : base goupyl_sport_e2e + navigateur
npm test                  # exécute les 59 parcours
npm run test:headed       # avec navigateur visible (démonstration)
npm run test:ui           # mode interactif Playwright
npm run report            # ouvre le dernier rapport HTML
```

### Intégration continue

`.github/workflows/tests.yml` rejoue les cinq niveaux à chaque poussée et
chaque pull request, avec des services PostgreSQL éphémères. Les rapports de
couverture et le rapport Playwright sont conservés en artefacts sept jours.

---

## 3. Couverture

Mesurée sur le code métier (`npm run test:coverage`) :

| | Instructions | **Branches** | Fonctions |
|---|---:|---:|---:|
| **Backend — global** | 78 % | **74 %** | 65 % |
| ├─ `src/services` (logique métier) | 80 % | 76 % | 70 % |
| ├─ `src/validators` | 91 % | 100 % | — |
| ├─ `src/utils` | 99 % | 75 % | 100 % |
| ├─ `src/middlewares` | 83 % | 82 % | 70 % |
| └─ `src/routes` | 99 % | — | 100 % |
| **Frontend — modules à logique** | — | **79 %** | — |

Des seuils planchers sont inscrits dans `backend/jest.config.js`
(branches ≥ 45 %, instructions ≥ 60 %) : le build échoue si la couverture
régresse sous ces valeurs.

**Lecture honnête du chiffre frontend.** La couverture globale du dossier
`frontend/src` est de 24 % en instructions, parce que la mesure englobe toutes
les pages et composants de présentation, non testés unitairement. Les modules
qui portent de la logique — utilitaires, client HTTP, contexte
d'authentification, composants de réservation — sont eux couverts à 79 % en
branches. Les pages sont validées par les tests fonctionnels et le cahier de
recette.

---

## 4. Isolation des dépendances externes

Aucun test, à aucun niveau, n'appelle un service tiers ni ne touche aux données
de développement.

| Dépendance | Neutralisation |
|---|---|
| **PostgreSQL** | Bases dédiées `goupyl_sport_test` et `goupyl_sport_e2e`. Un garde-fou refuse de démarrer si `DATABASE_URL` ne contient pas « test » / « e2e ». |
| **Stripe** | Double de test complet (`tests/helpers/prismaMock.js`). Aucun appel réseau. |
| **Resend** | `RESEND_API_KEY` forcée à vide → `config/email.js` bascule en no-op. |
| **Redis** | `REDIS_URL` forcée à vide → `config/redis.js` bascule sur son `MemoryStore`. |
| **Google OAuth** | Bibliothèque `google-auth-library` simulée. |

> **Point d’attention important :** `src/app.js` appelle `require('dotenv').config()`,
> qui charge le `.env` de développement. dotenv n'écrase jamais une variable
> déjà définie, mais il remplit celles qui manquent : un simple `delete` serait
> donc annulé et les tests parleraient à la vraie clé Resend — c'est-à-dire
> qu'ils enverraient de vrais emails à chaque inscription simulée. Les fichiers
> `tests/setup/env*.js` posent pour cette raison des chaînes **vides** plutôt
> que de supprimer les variables.

---

## 5. Conventions

### Nommage

Les intitulés décrivent un **comportement métier attendu**, en français, pas le
nom de la fonction testée :

```js
it('ne bloque PAS la réservation quand le quota est épuisé — la séance devient payante')
it('refuse à un coach de valider la séance d\'un confrère')
it('lit error.issues (API Zod 4) et non error.errors — non-régression')
```

### Structure

Chaque test suit un déroulé préparation → action → vérification, séparé par des
lignes vides. Les cas répétitifs passent par `it.each` pour rendre visible la
table des cas couverts (bornes, énumérations, matrices de rôles).

### Doubles de test

`backend/tests/helpers/prismaMock.js` fabrique un client Prisma simulé complet :
chaque méthode a une valeur de retour par défaut cohérente (`findMany → []`,
`count → 0`, `findUnique → null`). Sans ces valeurs, un service appelant une
méthode non explicitement configurée planterait sur `undefined` au lieu
d'échouer sur l'assertion métier visée.

`clearMocks` remet à zéro les **appels** enregistrés mais conserve les
**implémentations** : un `mockRejectedValue` posé par un test contaminerait donc
les suivants. Chaque fichier appelle pour cette raison
`resetMocks({ prisma, redis, ... })` dans un `beforeEach`.

### Limitation de débit

L'API limite les requêtes à 100/minute par IP (10/minute sur
`/api/auth/login` et `/register`). Une suite de tests dépasse largement ces
plafonds depuis une seule machine, ce qui produirait des 429 apparemment
aléatoires. Chaque test simule donc une **IP cliente distincte** via
`X-Forwarded-For` — exactement ce que fait un reverse proxy en production, et
l'application est configurée pour cela (`app.set('trust proxy', 1)`).

Le limiteur lui-même reste vérifié par
`backend/tests/api/rateLimit.api.test.js`, qui réutilise volontairement une IP
unique pour atteindre le plafond.

---

## 6. Anomalies révélées par la suite de tests

Cinq défauts ont été mis au jour pendant l'écriture des tests. Aucun n'a été
corrigé dans le code de production : chacun est **figé par un test de
caractérisation** qui documente le comportement actuel et deviendra rouge dès
l'application du correctif.

| # | Gravité | Anomalie | Correctif |
|---|---|---|---|
| 1 | **Élevée** | `pages/public/CGU.jsx:65` utilise `<Link>` sans jamais l'importer → la page des conditions générales, légalement obligatoire, plante au rendu et n'affiche qu'un écran blanc. | Ajouter `import { Link } from 'react-router-dom';` |
| 2 | **Moyenne** | 21 messages d'erreur français sont morts : les validateurs emploient encore les options Zod 3 `required_error:` et `errorMap:`, ignorées par Zod 4. L'API renvoie les libellés anglais par défaut (« Invalid input: expected string, received undefined »). | Remplacer par l'option Zod 4 `error:` dans les 6 fichiers de `src/validators/` |
| 3 | **Moyenne** | Le contrôle des horaires ouvrés compare des heures d'horloge et non des instants : une séance commençant entre 23h00 et 23h59 se termine le lendemain, `endHour` vaut alors 0, et le garde-fou « 07h–21h » est franchi. | Comparer `startTime`/`endTime` à des bornes datées plutôt que `getHours()` |
| 4 | **Faible** | Un corps JSON malformé produit un **500** au lieu d'un 400 : `errorHandler` ne teste que `err.isOperational` et ignore `err.type === 'entity.parse.failed'`. Une faute du client est ainsi comptée comme une erreur serveur. | Ajouter une branche `entity.parse.failed` → 400 dans `errorHandler.middleware.js` |
| 5 | **Faible** | Le schéma d'inscription chaîne `.email()` **avant** `.trim()` : un email copié-collé avec un espace parasite est refusé au lieu d'être nettoyé. | Réordonner en `.trim().toLowerCase().email()` |

Deux écarts entre documentation et implémentation ont également été relevés :

- **Tarifs annuels.** La documentation annonce « mensuel −20 % × 12 ». Les
  tarifs catalogue sont en réalité arrondis au chiffre commercial (516 € et
  1 176 €), soit 20,37 % de remise sur Essentiel et 19,67 % sur Boost. Les
  montants facturés sont figés par test.
- **Tests d'intégration.** Le dossier projet (§6) annonçait des tests
  d'intégration « avec une vraie base de données » ; l'unique fichier existant
  simulait en réalité Prisma. C'est désormais exact : 82 tests attaquent une
  véritable base PostgreSQL.

Voir aussi le [cahier de recette](CAHIER-RECETTE.md) pour la validation
fonctionnelle scénario par scénario.

---

## 7. Ce qui n'est pas couvert, et pourquoi

| Domaine | Raison | Compensation |
|---|---|---|
| Paiement Stripe réel (carte, Klarna, Connect) | Nécessite un compte Connect vérifié et des cartes de test 3-D Secure ; hors périmètre d'une suite automatisée. | Toute la logique de calcul (commission, répartition, idempotence, remboursements) est couverte unitairement avec un double Stripe. |
| Webhooks Stripe entrants | Nécessite un tunnel public (`stripe listen`). | Le gestionnaire de webhook est testé unitairement, signature comprise. |
| Envoi réel d'emails (Resend) | Service tiers payant. | Les appels et le contenu des emails sont vérifiés sur le double. |
| Passkeys / WebAuthn | Exige un authentificateur matériel ou virtuel. | Recette manuelle (cahier AUT-18). |
| Lecture de QR par la caméra | Exige un périphérique physique. | Le code court à 8 caractères — même chemin serveur — est testé de bout en bout. |
| Compatibilité multi-navigateurs | Un seul projet Playwright (Chromium) pour tenir le temps d'exécution. | Ajouter les projets `firefox` et `webkit` dans `playwright.config.js` suffit à étendre la couverture. |
