# Dossier projet — Goupyl Sport

> Document de fond destiné à la rédaction du dossier professionnel et du mémoire.
> Chaque section explique **ce qui a été fait**, **comment ça fonctionne** et **pourquoi ce choix**,
> avec le niveau de détail nécessaire pour restituer et défendre le projet à l'oral.
>
> Documents liés : [STACK-TECHNIQUE.md](STACK-TECHNIQUE.md) (briques et justifications),
> [STRATEGIE-TESTS.md](STRATEGIE-TESTS.md) (démarche qualité),
> [CAHIER-RECETTE.md](CAHIER-RECETTE.md) (validation fonctionnelle scénario par scénario).

---

## 1. Présentation du projet

### 1.1 Le contexte et le problème

Le sport en entreprise et le bien-être des salariés sont devenus des enjeux RH majeurs (QVCT — qualité de vie et conditions de travail). Pourtant, trois acteurs peinent à se rencontrer :

- **Les entreprises** veulent proposer du sport/bien-être à leurs salariés, mais n'ont ni le temps ni l'expertise pour sourcer des coachs fiables, gérer les plannings et suivre l'utilisation.
- **Les coachs et intervenants bien-être** (sport, nutrition, santé mentale) sont des indépendants qui cherchent des clients réguliers et une gestion simplifiée (agenda, paiement, facturation).
- **Les particuliers et salariés** veulent réserver une séance aussi simplement qu'un rendez-vous médical sur Doctolib.

**Goupyl Sport** répond à ce triple besoin : une plateforme web qui met en relation des professionnels vérifiés avec des clients particuliers (B2C) et des entreprises (B2B), en gérant tout le cycle : découverte du coach → réservation → questionnaire médical → paiement → séance → validation de présence → avis.

### 1.2 Le modèle économique

Trois sources de revenus, qui structurent toute l'architecture technique :

1. **Abonnements entreprise** (B2B) : facturation **par collaborateur et par mois** — plan Essentiel à 54 €/collaborateur/mois, plan Boost à 122 €, plan Ultra sur devis. L'engagement annuel est facturé 516 € et 1 176 € (soit une remise commerciale d'environ 20 %). Les salariés réservent leurs séances sans payer, dans la limite d'un quota mensuel : c'est l'employeur qui finance.
2. **Commission marketplace** (B2C) : sur chaque séance payée par un particulier, la plateforme prélève **30 %** et reverse **70 %** au coach, automatiquement.
3. **Boutique produits** : un catalogue d'équipements administré par la plateforme, vendu directement (pas de reversement à un tiers).

### 1.3 Les quatre profils d'utilisateurs (acteurs)

| Rôle | Qui | Ce qu'il fait |
|---|---|---|
| **CLIENT** | Particulier **ou** salarié rattaché à une entreprise | Recherche un coach, réserve, remplit le questionnaire médical, paie (sauf si couvert), note la séance, conteste une absence |
| **INTERVENANT** | Coach / professionnel du bien-être | Définit ses prestations, gère son agenda, valide la présence par QR code, encaisse via Stripe Connect, répond aux avis |
| **ENTREPRISE** | Service RH | Souscrit un abonnement, rattache ses collaborateurs, suit l'usage et exporte les statistiques |
| **ADMIN** | Plateforme | Vérifie les dossiers des coachs, arbitre les litiges, gère le catalogue produits et les comptes |

La distinction **particulier / salarié** n'est pas un rôle mais un attribut : un CLIENT porte un `employerCompanyId` nullable. C'est une décision de conception à défendre (voir 3.3).

---

## 2. Analyse du besoin et spécifications

### 2.1 Exigences fonctionnelles principales

1. **Inscription différenciée** selon le profil : un particulier s'inscrit librement ; un salarié s'inscrit avec un code entreprise ou une invitation email ; une entreprise fournit un SIRET ; un coach doit soumettre pièce d'identité et diplômes avant activation.
2. **Réservation type « Doctolib »** : grille hebdomadaire de créneaux, calcul des disponibilités, prévention des doubles réservations (côté coach ET côté client).
3. **Questionnaire médical obligatoire (PAR-Q)** : avant toute première réservation, le client répond à 7 questions de santé. En cas de risque déclaré, la réservation est bloquée jusqu'à validation par un coach.
4. **Paiement en ligne** avec trois flux : abonnement entreprise, paiement à la séance avec reversement au coach, achat de produits.
5. **Prise en charge entreprise** : les séances d'un salarié sont couvertes par l'abonnement de son employeur dans la limite d'un quota mensuel par collaborateur ; au-delà, la séance reste réservable mais à sa charge.
6. **Politique d'annulation dégressive** : plus l'annulation est tardive, moins le remboursement est important — sans jamais empêcher l'annulation.
7. **Preuve de présence** : la séance ne peut être clôturée à la légère — validation par QR code présenté par le client, ou signalement d'absence par le coach, avec voie de contestation pour le client.
8. **Confiance** : vérification des coachs par l'admin sur pièces, avis clients post-séance (avec droit de réponse du coach), comptes-rendus de séance.
9. **Espace entreprise** : gestion des salariés (code permanent, invitations par email avec expiration), statistiques d'utilisation, export CSV.

### 2.2 Exigences non fonctionnelles

- **Sécurité** : données de santé chiffrées, mots de passe hachés, sessions révocables, protection contre le brute-force, contrôle d'accès par rôle sur chaque route.
- **Conformité** : les réponses au questionnaire médical sont des **données de santé au sens du RGPD** (article 9 — catégorie particulière) → chiffrement au repos, accès strictement limité au propriétaire.
- **Coût d'infrastructure minimal** : le projet doit tourner sur des offres gratuites/low-cost (contexte projet étudiant → production réelle).
- **Aucune dépendance à un disque local** : l'hébergement retenu (Render, offre gratuite) fournit un système de fichiers **éphémère**, effacé à chaque déploiement et à chaque réveil de veille. Toute donnée téléversée doit donc survivre ailleurs.
- **Maintenabilité** : architecture homogène et prévisible, pour qu'un développeur seul puisse tout maintenir.

---

## 3. Conception

### 3.1 Architecture générale

J'ai retenu une architecture **SPA + API REST**, le standard actuel des applications web métier :

```
┌────────────────────────────────────────────────────────────┐
│                       NAVIGATEUR                            │
│              React 19 — Single Page Application             │
└────────────────────────────┬───────────────────────────────┘
                             │ HTTPS — appels /api (same-origin)
┌────────────────────────────▼───────────────────────────────┐
│  NETLIFY — hébergement du frontend statique                 │
│  · CDN mondial, HTTPS automatique                           │
│  · proxy /api/* → backend (pas de CORS à gérer)             │
└────────────────────────────┬───────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────┐
│  RENDER — backend Node.js (Express 5)                       │
│  API REST : 16 domaines métier, 106 endpoints               │
│  ├─ Prisma ORM ────► PostgreSQL  (données métier + fichiers)│
│  ├─ ioredis ───────► Redis       (sessions, TTL)            │
│  ├─ stripe ────────► Stripe      (paiements + marketplace)  │
│  └─ resend ────────► Resend      (emails transactionnels)   │
└────────────────────────────────────────────────────────────┘
```

**Décision structurante — le proxy Netlify** : le frontend n'appelle jamais directement le domaine du backend. Netlify réécrit `/api/*` vers Render côté serveur. Résultat : le navigateur ne voit qu'un seul domaine, ce qui **élimine toute la problématique CORS** (en dev, le serveur Vite fait exactement la même chose vers `localhost:3000`). C'est un choix d'architecture simple qui supprime une source d'erreurs classique.

**Décision structurante — aucun fichier sur disque** : les avatars, photos de galerie et pièces justificatives sont stockés en **`bytea` PostgreSQL** et servis par des routes `/api` dédiées. C'est un compromis assumé (une base de données n'est pas un stockage objet), imposé par le caractère éphémère du disque Render et retenu plutôt que d'introduire un service tiers supplémentaire à ce stade. Voir 9.2 pour l'évolution prévue.

### 3.2 Le backend en couches

Chaque requête traverse une chaîne de responsabilités clairement séparées :

```
Requête HTTP
 → helmet (en-têtes de sécurité HTTP)
 → cors, morgan (logs)
 → rate-limiting global (100 req/min) — durci à 10/min sur login/register
 → express.raw sur /api/payments/webhook (AVANT express.json : Stripe signe
                  le corps BRUT, le parser JSON le rendrait invérifiable)
 → express.json
 → Route du domaine
    → authenticate : vérifie le JWT, injecte req.user = { userId, role }
    → authorize(...rôles) : contrôle d'accès RBAC
    → validate(schéma Zod) : validation/normalisation du corps de requête
 → Controller : mince — try/catch et délégation
 → Service : TOUTE la logique métier (Prisma, Redis, Stripe)
 → errorHandler centralisé : traduit les erreurs en réponses HTTP propres
```

**Pourquoi cette séparation** : les contrôleurs ne contiennent aucune logique (5-10 lignes chacun) ; toute la valeur est dans les services, qui sont testables unitairement en mockant Prisma et Redis. Les 16 domaines (auth, users, services, appointments, subscriptions, session-reports, documents, companies, payments, analytics, reviews, coach-services, passkeys, notifications, parq, products) suivent **exactement le même triple de fichiers** `routes/` + `controllers/` + `services/` (+ `validators/`) : comprendre un domaine, c'est les comprendre tous.

La gestion d'erreurs est centralisée autour d'une classe `ApiError` (avec constructeurs statiques `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`). Un service lève `ApiError.conflict("Ce créneau n'est plus disponible", 'SLOT_CONFLICT')` ; le middleware final produit la réponse HTTP correspondante avec un code d'erreur machine (`SLOT_CONFLICT`) que le frontend peut interpréter pour afficher le bon message. Le middleware traduit également les erreurs Prisma (`P2002` → 409, `P2025` → 404) et JWT (→ 401).

### 3.3 Le modèle de données (18 modèles Prisma / PostgreSQL)

Le choix de PostgreSQL s'imposait : les données sont profondément **relationnelles et transactionnelles** (une réservation lie un client, un coach, un service, un paiement, un avis, un compte-rendu — et l'argent est en jeu).

Les modèles et leurs relations clés :

```
User ─────────────── le pivot du système (les 4 rôles dans une table)
 ├─ Profile (1:1)          bio, spécialités, diplômes, tarif horaire, ville…
 ├─ employerCompany (self-relation)  un CLIENT salarié pointe vers son
 │                          User ENTREPRISE ; l'entreprise voit ses employees
 ├─ CoachService (1:N)     les prestations définies par le coach
 ├─ CoachPhoto (1:N)       galerie du coach (12 max), octets en base
 ├─ Passkey (1:N)          identifiants WebAuthn
 ├─ Document (1:N)         pièces justificatives (octets en base)
 ├─ Subscription (1:N)     abonnements de l'entreprise
 ├─ Notification (1:N)
 └─ PARQQuestionnaire (1:N) questionnaire médical (réponses chiffrées)

Appointment ───────── le cœur métier
 ├─ client / intervenant   (2 FK vers User)
 ├─ serviceId  OU  coachServiceId  (voir 3.4)
 ├─ coveredByCompany       la séance est-elle prise en charge par l'employeur
 ├─ qrToken / validatedByQr / attendanceStatus   preuve de présence
 ├─ disputeStatus / disputeReason / disputedAt   contestation d'absence
 ├─ Payment (1:1)          montants en centimes, part plateforme/coach
 ├─ Review (1:1)           note + commentaire + réponse du coach
 ├─ SessionReport (1:1)    compte-rendu rédigé par le coach
 └─ AppointmentStatusHistory (1:N)  journal d'audit des transitions

Service          catalogue B2B hérité, défini par la plateforme (voir 3.4)
Product          catalogue boutique administré par la plateforme
 └─ ProductOrder (1:N)     commandes payées par Checkout Stripe
CompanyInvite    invitations tokenisées à rejoindre une entreprise
```

**Détails de conception à défendre à l'oral :**

- **Montants en centimes (entiers)** dans `Payment` : jamais de flottants pour l'argent (éviter les erreurs d'arrondi binaire). Les prix « catalogue » utilisent `Decimal(10,2)`.
- **Soft delete des services coach** (booléen `active` plutôt que suppression) : un service désactivé reste référencé par les réservations passées — l'historique ne casse jamais. Même principe pour `Product`.
- **Statuts en enums** PostgreSQL (`AppointmentStatus`, `VerificationStatus`, `DisputeStatus`, `AttendanceStatus`…) : l'intégrité est garantie par la base, pas seulement par le code.
- **Self-relation** `employerCompany`/`employees` sur `User` : évite une table `Company` séparée — l'entreprise EST un utilisateur (elle se connecte, a un profil), ses salariés pointent vers elle. Corollaire assumé : le « salarié » n'est pas un rôle, c'est un CLIENT dont `employerCompanyId` est renseigné. Le contrôle d'accès reste donc simple (4 rôles), et la bascule particulier ↔ salarié est un simple rattachement.
- **Journal d'audit** `AppointmentStatusHistory` : chaque transition de statut est enregistrée avec son auteur (`client` / `intervenant` / `admin` / `system`), en écriture *fire-and-forget* pour ne jamais faire échouer l'opération métier. Aucune interface ne l'expose encore : c'est une base de traçabilité, exploitable en cas de litige.

### 3.4 Le double type de service — une dette de conception assumée

Le projet a d'abord été pensé avec **deux catalogues distincts** :

- `Service` : prestations **définies par la plateforme** pour l'offre entreprise, avec un champ `availableInPlans` restreignant chaque prestation à certains plans.
- `CoachService` : prestations **définies librement par chaque coach** (nom, prix, durée 15-120 min, catégorie, type de session SOLO/DUO/GROUP avec nombre max de participants).

`Appointment` pointe donc vers **l'un OU l'autre** (`serviceId` et `coachServiceId` tous deux nullables).

**Ce qui a changé, et pourquoi.** Ce double canal imposait deux parcours de réservation différents selon que l'utilisateur était salarié ou particulier, avec un blocage dur (`403 QUOTA_EXHAUSTED`) quand le quota entreprise était épuisé — un salarié se retrouvait dans une impasse alors qu'il était tout à fait prêt à payer sa séance lui-même. J'ai donc unifié le parcours : **tout le monde réserve la prestation du coach** (`CoachService`), et la prise en charge entreprise devient un simple attribut calculé à la réservation (`coveredByCompany`), sans blocage.

Le chemin `serviceId` existe toujours côté serveur (rétrocompatibilité des rendez-vous historiques, tests de non-régression) mais n'est plus utilisé par l'interface. Cette dualité irrigue encore tout le code : partout où le nom du service s'affiche, l'accès est null-safe (`appt.coachService?.name || appt.service?.name`). C'est une convention documentée du projet.

À l'oral, c'est un bon exemple de **décision revue à l'usage** : la conception initiale était techniquement correcte mais produisait une mauvaise expérience ; la simplification a supprimé un parcours entier sans supprimer de fonctionnalité.

---

## 4. Réalisation — les parcours fonctionnels en détail

### 4.1 Authentification : JWT double token + Redis

**Le mécanisme** (à savoir expliquer à l'oral) :

1. Au login, le serveur vérifie le mot de passe avec **bcrypt** (hachage à coût 12 : volontairement lent, pour rendre le brute-force hors ligne impraticable).
2. Il émet **deux tokens JWT** :
   - un **access token** de 15 minutes — envoyé en header `Authorization: Bearer` sur chaque requête ; il embarque `userId` et `role` ;
   - un **refresh token** de 7 jours — stocké **côté serveur dans Redis** (`refresh_token:<userId>`, TTL 7 jours).
3. Quand l'access token expire, le frontend appelle `/auth/refresh` avec le refresh token ; le serveur le compare à celui stocké dans Redis avant d'émettre un nouvel access token.

**Pourquoi ce design** : un JWT pur est *stateless* — impossible à révoquer avant son expiration. En stockant le refresh token dans Redis, la déconnexion côté serveur devient possible (supprimer la clé = session tuée), tout en gardant la légèreté du JWT pour les 15 minutes de l'access token. C'est le compromis standard sécurité/performance.

**Côté frontend**, un intercepteur Axios rend tout cela invisible : sur une réponse 401, il rafraîchit le token et **rejoue la requête initiale** automatiquement, avec une file d'attente pour les requêtes concurrentes (si trois appels reçoivent un 401 en même temps, un seul refresh est déclenché). Subtilité importante : les routes d'authentification elles-mêmes (`/auth/login`, `/auth/register`, `/auth/refresh`) sont **exclues** de ce mécanisme — un 401 sur le login signifie « mauvais identifiants », pas « token expiré » (voir section 8, ce point a fait l'objet d'un bug réel).

**Trois moyens de connexion** partagent la même émission de tokens :

- mot de passe classique ;
- **Google Sign-In** (`POST /auth/google`) : le frontend obtient un *ID token* Google, le backend le vérifie avec `google-auth-library` contre `GOOGLE_CLIENT_ID`, puis rattache ou crée le compte ;
- **Passkeys / WebAuthn** (`@simplewebauthn/server`) : authentification sans mot de passe, résistante au phishing. Les *challenges* sont stockés dans Redis avec un TTL de 5 minutes (`passkey_challenge:<scope>:<id>`) — un challenge est par nature à usage unique et à durée de vie courte, Redis est exactement l'outil adapté.

Détail de robustesse : un échec d'écriture Redis pendant le login est **attrapé et journalisé** sans faire échouer l'authentification. Un hoquet du cache ne doit pas empêcher un utilisateur de se connecter.

### 4.2 Inscription multi-profils

Un seul formulaire, quatre parcours :

- **Particulier** : inscription libre, suivie d'un questionnaire d'onboarding facultatif (niveau, type de sport, objectifs) qui crée le `Profile` en création imbriquée Prisma. « Passer cette étape » est explicitement proposé — un questionnaire obligatoire à l'inscription est un frein à la conversion.
- **Collaborateur** : saisie d'un `joinCode`. Le champ accepte indifféremment le **code permanent** de l'entreprise (8 caractères hexadécimaux) ou le **jeton d'une invitation nominative** — l'utilisateur n'a pas à savoir lequel il détient.
- **Entreprise** : SIRET à 14 chiffres, compte auto-vérifié, `joinCode` unique généré automatiquement.
- **Professionnel** : compte créé au statut `PENDING`, invisible dans la recherche publique tant que l'admin n'a pas validé les pièces.

Un email de vérification est envoyé via Resend ; le jeton vit dans Redis 24 h (`email_verify:<token>`).

### 4.3 La réservation — le module le plus complexe

**Choix de conception : pas de modèle « disponibilités »** (le coach ne déclare pas ses horaires). À la place, un modèle par **créneaux occupés** :

1. Un endpoint public `GET /appointments/busy/:intervenantId?from&to` renvoie les intervalles `{start, end}` des rendez-vous PENDING/CONFIRMED du coach — et **rien d'autre** : aucune donnée personnelle du client n'est exposée sur cette route publique.
2. Le composant frontend `SlotPicker` (grille hebdomadaire inspirée de Doctolib) génère tous les créneaux possibles entre **7 h et 21 h** à la durée du service choisi, et grise ceux qui chevauchent un intervalle occupé — ainsi que, pour un client connecté, **ses propres créneaux occupés** (pour l'empêcher de se double-réserver).
3. À la soumission, le serveur **revalide tout** (ne jamais faire confiance au client) : horaires d'ouverture, appartenance du service au coach, et **détection de chevauchement** côté coach ET côté client avec la condition classique d'intersection d'intervalles : `existant.début < nouveau.fin ET existant.fin > nouveau.début`. En cas de conflit : `409 SLOT_CONFLICT` (côté coach) ou `409 CLIENT_SLOT_CONFLICT` (côté client).

**Cycle de vie d'un rendez-vous** — machine à états avec transitions whitelistées :

```
PENDING ──(coach confirme)──► CONFIRMED ──(clôture / QR / absence)──► DONE
   │                              │
   └──────── CANCELLED ◄──────────┘
   │
   └──(non confirmé sous 24 h)──► CANCELLED  (balayage automatique)
```

Toute transition hors de cette liste est rejetée (`INVALID_STATUS_TRANSITION`). Quatre règles métier notables :

- **Prise en charge entreprise, calculée à la réservation.** Si le client a un `employerCompanyId`, que l'employeur a un abonnement `ACTIVE` et qu'il reste du quota mensuel, le rendez-vous est créé avec `coveredByCompany: true`. Sinon il est simplement payable. Le quota est un nombre de séances **par collaborateur et par mois calendaire de la séance** — Essentiel 4, Boost 8, Ultra 16 (`PLAN_LIMITS`) —, ce qui évite qu'une réservation prise en juillet pour août consomme le quota de juillet.
- **Barrière de paiement** : CONFIRMED → DONE exige `paymentStatus === 'paid'` **sauf si `coveredByCompany`**. Le point subtil à savoir défendre : la condition porte sur le **flag figé à la réservation**, pas sur le statut « salarié » du client au moment de la clôture. Un salarié hors quota qui a réservé à titre personnel doit payer, même si son employeur a un abonnement actif.
- **Expiration des PENDING** : une réservation en attente verrouille un créneau. Un balayage exécuté au démarrage puis toutes les 10 minutes annule (`cancelledBy: 'system'`) les PENDING de plus de 24 h ou dont l'heure est passée. Les requêtes de créneaux occupés ignorent en plus les PENDING périmés, pour que le créneau se libère immédiatement sans attendre le prochain passage.
- **Annulation client** : elle est **refusée sur la route générique** `PATCH /:id/status` (403 `USE_CANCEL_ENDPOINT`) et doit passer par `POST /:id/cancel`, seule route qui applique la politique de remboursement. C'est une contrainte volontaire : rendre impossible le contournement accidentel d'une règle métier financière.

**Politique d'annulation dégressive** (constantes en tête de `appointment.service.js`, paliers repris à l'identique dans le composant `CancellationModal`) :

| Délai avant la séance | Remboursement client | Coach conserve | Plateforme conserve |
|---|---:|---:|---:|
| ≥ 7 jours | **100 %** | 0 % | 0 % |
| 48 h – 7 jours | **50 %** | 35 % | 15 % |
| < 48 h | **0 %** | 70 % | 30 % |

L'annulation est **toujours autorisée** — seule la contrepartie financière varie. Techniquement, le remboursement partiel utilise `reverse_transfer: true` et `refund_application_fee: true` : Stripe reprend au prorata la part déjà transférée au coach **et** la commission de la plateforme, ce qui produit mécaniquement la répartition 35/15 sur un remboursement de 50 %. Un remboursement intégral bascule en plus `paymentStatus: 'refunded'`, ce qui sort la séance des gains du coach.

Dernier détail de robustesse : si l'appel Stripe échoue, **l'annulation est quand même enregistrée** et l'erreur est remontée pour traitement manuel. Bloquer l'annulation d'un client parce qu'un service tiers est indisponible serait le pire des deux mondes.

### 4.4 Preuve de présence : QR code, absence et litiges

Le problème métier : la plateforme reverse de l'argent à un coach pour une séance dont elle n'a aucune preuve qu'elle a eu lieu. Trois mécanismes s'articulent.

**Validation par QR code.** Chaque rendez-vous reçoit un `qrToken` (UUID) à sa création. Le client l'affiche depuis son espace (`QrCodeModal`, rendu par `react-qr-code`) ; le coach le valide via `POST /appointments/validate-qr`, soit en le scannant avec la caméra (`html5-qrcode`), soit en saisissant le **code court** — les 8 premiers caractères de l'UUID, recherchés en `startsWith` **restreint à ses propres rendez-vous CONFIRMED**. La séance passe DONE avec `attendanceStatus: 'PRESENT'` et `validatedByQr: true`, sous la même barrière de paiement que la clôture manuelle (qui reste disponible).

Pourquoi un code court en plus du scan : la caméra n'est pas toujours disponible (navigateur sans autorisation, salle sans réseau, matériel du coach). Le repli manuel garde le parcours utilisable, et la restriction de la recherche au périmètre du coach empêche qu'un préfixe de 8 caractères devienne une faille — un coach ne peut jamais valider la séance d'un confrère (403).

**Signalement d'absence.** Si le client ne vient pas, le coach déclare `POST /:id/absent` sur une séance CONFIRMED **dont l'heure de début est passée** (sinon `SESSION_NOT_STARTED`) → DONE + `attendanceStatus: 'ABSENT'`, et le client est notifié. Choix délibéré : **pas de barrière de paiement ici**. Une absence doit pouvoir être enregistrée même sur une séance impayée, sinon le coach n'a aucun moyen de clôturer le dossier.

**Contestation.** Le client dispose alors de `POST /:id/dispute` (motif de 10 à 500 caractères) → `disputeStatus: 'OPEN'`, tous les administrateurs sont notifiés, et surtout **les gains du coach sur cette séance sont gelés** : `GET /payments/earnings` les isole dans une catégorie `frozen`/`totalFrozen`, exclue des totaux disponibles. L'admin arbitre depuis `/dashboard/admin/disputes` :

- `REJECTED` → l'absence est confirmée, les gains sont débloqués ;
- `RESOLVED_CLIENT` → remboursement Stripe intégral (`reverse_transfer` + `refund_application_fee`), `paymentStatus: 'refunded'`, et si la séance était couverte par l'entreprise, **la séance est restituée au quota** du salarié.

Ce dernier point cache un piège Prisma qui mérite d'être raconté à l'oral : le décompte du quota doit exclure les litiges tranchés en faveur du client, or en SQL comme en Prisma, `{ not: 'RESOLVED_CLIENT' }` **exclut aussi les valeurs NULL**. Écrit naïvement, le filtre ne comptait plus que les séances litigieuses. La forme correcte est explicite : `OR: [{ disputeStatus: null }, { disputeStatus: { not: 'RESOLVED_CLIENT' } }]`.

### 4.5 Le questionnaire médical PAR-Q — données de santé et RGPD

Le **PAR-Q** (Physical Activity Readiness Questionnaire) est un questionnaire standard de 7 questions oui/non (problème cardiaque, douleurs thoraciques, vertiges, problèmes articulaires, traitement hypertension, autre raison médicale, grossesse). Il conditionne la réservation :

- `GET /parq/status` renvoie un booléen `canBook` : faux si le questionnaire est absent, expiré (validité 1 an), ou si un risque est déclaré (`hasRisk`) sans validation coach (`coachCleared`).
- Le parcours de réservation affiche le questionnaire en modal si nécessaire et bloque la soumission tant que `canBook` est faux. Une resoumission écrase l'enregistrement précédent et réinitialise `coachCleared`.

**Le point technique et juridique fort du projet** : les réponses sont des **données de santé** (RGPD art. 9). Elles sont donc **chiffrées au repos** avec **AES-256-GCM** :

- La clé de chiffrement est dérivée d'un secret d'environnement (`PARQ_ENCRYPTION_KEY`) par **scrypt** (fonction de dérivation résistante au brute-force).
- Chaque enregistrement produit une enveloppe `iv:authTag:ciphertext` en base64 — l'IV (vecteur d'initialisation) est aléatoire à chaque chiffrement, et le tag d'authentification GCM garantit l'**intégrité** (toute altération du ciphertext fait échouer le déchiffrement).
- Conséquence concrète : un dump de la base de données ne révèle **aucune réponse médicale** ; seuls le booléen agrégé `hasRisk` et les métadonnées sont lisibles. L'API ne renvoie les réponses déchiffrées **qu'au propriétaire** du questionnaire — ni l'employeur, ni l'admin n'y ont accès.

À l'oral : ce chiffrement illustre la **minimisation** et la **protection dès la conception** (privacy by design) exigées par le RGPD.

### 4.6 Les paiements Stripe — trois flux distincts

C'est la partie la plus sensible du projet (argent réel, obligations réglementaires).

**Flux 1 — Abonnements entreprise (Stripe Checkout)**

1. L'entreprise choisit un plan et un cycle (mensuel/annuel). Le backend calcule la quantité = **nombre de collaborateurs rattachés** (minimum 1) et crée une *Checkout Session* Stripe avec le prix unitaire correspondant (`PLAN_PRICES`, en centimes).
2. L'utilisateur paie sur la **page hébergée par Stripe** — aucune donnée bancaire ne transite par mes serveurs (conformité PCI-DSS déléguée à Stripe).
3. L'activation est **doublement sécurisée** : par le webhook `checkout.session.completed` **et** par une vérification côté API au retour de l'utilisateur (`GET /payments/verify-session`). Si l'un des deux canaux échoue (webhook perdu, utilisateur qui ferme l'onglet), l'autre couvre.

Nuance à assumer : il s'agit de paiements **one-shot**, pas d'abonnements Stripe récurrents — le renouvellement est donc manuel. C'était le bon compromis pour la V1 (voir 9.2).

**Flux 2 — Séances B2C (Stripe Connect)**

Encaisser de l'argent **pour le compte d'un tiers** (le coach) est une activité réglementée (statut d'établissement de paiement). **Stripe Connect** résout ce problème : chaque coach ouvre un *compte connecté* Stripe via un parcours d'onboarding hébergé (KYC, IBAN — géré par Stripe), et les paiements sont splittés automatiquement :

```js
paymentIntents.create({
  amount: prixEnCentimes,
  application_fee_amount: platformFee,                  // 30 % plateforme
  transfer_data: { destination: compteStripeDuCoach },  // 70 % au coach
})
```

Détails d'implémentation défendables :
- Le paiement n'est proposé qu'une fois le rendez-vous **CONFIRMED** par le coach (pas de paiement pour un créneau non validé).
- Les *PaymentIntents* en attente sont **réutilisés** au lieu d'être recréés (idempotence — protège aussi du double-montage des composants React en StrictMode).
- La réussite est enregistrée par **deux chemins** — le webhook `payment_intent.succeeded` et l'appel `POST /payments/confirm` émis par le frontend après `stripe.confirmPayment()` — qui convergent vers un helper **idempotent** `markAppointmentPaid`. Le coach ne reçoit donc qu'**une seule** notification `PAYMENT_RECEIVED`, quel que soit le chemin emprunté ou l'ordre d'arrivée.
- Le **webhook Stripe** vérifie la **signature cryptographique** du corps de requête brut (`constructEvent` avec le `STRIPE_WEBHOOK_SECRET`) : impossible de forger une fausse notification de paiement. C'est pour cela que la route webhook est montée avec `express.raw` AVANT le parseur JSON global.
- Moyens de paiement : carte + **Klarna** (paiement fractionné).
- La page « Paiements & gains » du coach affiche l'onboarding Stripe (à configurer / en vérification / actif) puis trois totaux distincts : **acquis** (séances DONE et payées), **en attente** (payées mais non clôturées) et **gelés** (litige ouvert).

**Flux 3 — Boutique produits (Stripe Checkout, vente directe)**

Le catalogue d'équipements est administré par la plateforme (`Product`, soft-delete via `active`). Une commande crée un `ProductOrder` et une Checkout Session — **sans Connect**, puisque le vendeur est la plateforme elle-même. Le webhook `checkout.session.completed` est partagé avec le flux 1 : la distinction se fait sur `metadata.type === 'product_order'`. La confirmation est idempotente par construction (`updateMany` filtré sur le statut PENDING → PAID), doublée là aussi d'une vérification au retour (`GET /products/orders/verify`).

### 4.7 La vérification des coachs — workflow de confiance

1. Le coach téléverse pièce d'identité et diplômes. L'upload passe par **multer en `memoryStorage`** : le fichier ne touche jamais le disque, ses octets sont écrits directement dans la colonne `data` (`bytea`) de `Document`. Limites : 5 Mo, PDF/JPG/PNG uniquement. Plusieurs fichiers par type sont acceptés (recto/verso, plusieurs diplômes).
2. L'admin dispose d'une page de revue : la prévisualisation passe par un endpoint **réservé à l'ADMIN** (`GET /api/documents/:id/file`) qui renvoie le binaire ; le frontend le récupère en `blob` et crée une URL objet — le fichier n'est jamais exposé publiquement, et il n'existe aucune URL devinable vers un document.
3. **Garde-fou métier** : l'admin ne *peut pas* passer un intervenant en VERIFIED sans au moins une pièce d'identité **et** un diplôme non rejetés (400 `INCOMPLETE_VERIFICATION_FILE`, levé dans `user.service.verifyUser`). La règle est dans le service, pas dans l'interface : elle tient même si l'appel est forgé.
4. Tant qu'il n'est pas vérifié, le coach voit un **bandeau permanent** dans son dashboard et n'apparaît pas dans la recherche publique.

Le même principe de stockage en base s'applique aux **avatars** (`GET /api/users/:id/avatar`, route publique, avec un `?v=<timestamp>` en cache-buster réécrit à chaque upload) et à la **galerie photos** du coach (12 maximum, octets immuables donc servis avec un cache de 7 jours).

### 4.8 L'espace entreprise (B2B)

- **Rattachement des salariés** : deux mécanismes complémentaires — le **code permanent** (8 hex, régénérable si compromis) à diffuser en interne, et les **invitations email nominatives** (token unique, expiration 7 jours, marquées consommées après usage).
- **Quota et suivi** : `GET /companies/employees/usage` renvoie, par collaborateur, le nombre de séances couvertes et le total. Le salarié voit de son côté son propre compteur sur `/dashboard/client/employer-plan` (`GET /companies/my-quota`), et un bandeau lui annonce avant réservation si la séance sera prise en charge (`willBeCovered`) — étant entendu que **c'est le serveur qui tranche** au moment de la création.
- **Export CSV** : généré côté client (`utils/exportCsv.js`) avec **BOM UTF-8 et séparateur `;`** — sans quoi Excel en configuration française casse les accents et met tout dans une seule colonne. C'est un détail trivial techniquement, mais c'est exactement le genre de finition qui décide de l'adoption d'un outil RH.
- **Analytics** : agrégats Prisma (`count`, `groupBy`) sur l'utilisation — effectif, collaborateurs actifs, séances du mois, taux d'utilisation — restitués en graphiques Recharts.

### 4.9 Avis, comptes-rendus, notifications

- **Avis** : uniquement après une séance DONE, un seul par rendez-vous (contrainte d'unicité en base). Le coach a un **droit de réponse**, modifiable au maximum 3 fois (compteur `coachReplyEdits`) — équilibre entre droit de rectification et intégrité de l'historique. Le profil public agrège note moyenne et nombre d'avis, avec tri et pagination côté client. Piège d'API documenté : `reviewApi.getForIntervenant()` renvoie un objet `{ reviews, averageRating, reviewCount, totalSessions }`, pas un tableau.
- **Comptes-rendus de séance** : le coach rédige notes et mise à jour d'objectifs après chaque séance — matérialise le suivi dans la durée. Visible du seul client concerné.
- **Notifications** : modèle simple en base (type/titre/corps/readAt), cloche dans la barre de navigation avec **polling toutes les 30 s** du compteur non-lus. Choix assumé : le polling suffit au besoin actuel ; SSE/WebSocket est identifié comme évolution si le temps réel devient nécessaire. Toutes les créations de notification sont *fire-and-forget* — une notification perdue ne doit jamais faire échouer un paiement ou une réservation.

---

## 5. Sécurité — synthèse transverse

À présenter comme une **défense en profondeur** (plusieurs couches indépendantes) :

| Couche | Mesure | Contre quoi |
|---|---|---|
| Transport | HTTPS partout (Netlify/Render) | Interception |
| En-têtes HTTP | helmet | Clickjacking, sniffing MIME, etc. |
| Entrées | Validation Zod systématique à la frontière API | Injections, données malformées |
| Requêtes DB | Prisma (requêtes paramétrées) | Injection SQL |
| Authentification | bcrypt coût 12 ; JWT 15 min ; refresh révocable en Redis ; passkeys anti-phishing | Vol de credentials, sessions volées |
| Anti brute-force | Rate-limit 100/min global, **10/min sur login/register** | Credential stuffing |
| Énumération de comptes | Message d'erreur **identique** pour email inconnu et mot de passe faux | Découverte d'adresses inscrites |
| Autorisation | RBAC par middleware sur chaque route + revérification de propriété dans les services (« ce RDV vous appartient-il ? ») | Élévation de privilèges, IDOR |
| Escalade par payload | Le rôle provient **du jeton signé**, jamais du corps de requête | Auto-promotion en ADMIN |
| Données de santé | AES-256-GCM au repos, clé dérivée scrypt, accès propriétaire uniquement | Fuite RGPD art. 9 |
| Paiements | Page Stripe hébergée (PCI délégué), signature des webhooks, montants recalculés côté serveur | Fraude, manipulation des prix |
| Uploads | Taille/MIME limités, octets en base, lecture ADMIN-only, aucune URL publique devinable | Upload malveillant, accès direct |
| Secrets | Variables d'environnement (jamais en dur) ; le `.env` backend non versionné | Fuite de secrets |

Point d'honnêteté utile pour le mémoire : les **erreurs 500 en production masquent le détail** (« Erreur interne ») pour ne rien révéler de l'implémentation — le diagnostic se fait par les logs serveur, pas par les réponses HTTP.

Le cloisonnement est vérifié explicitement par les tests : la matrice complète des routes protégées × 4 rôles est rejouée automatiquement (voir [STRATEGIE-TESTS.md](STRATEGIE-TESTS.md) §1).

---

## 6. Qualité, tests et conventions

La démarche complète est détaillée dans [STRATEGIE-TESTS.md](STRATEGIE-TESTS.md) ; en synthèse, **1 236 tests répartis sur cinq niveaux** :

| Niveau | Outil | Périmètre | Nombre |
|---|---|---|---:|
| Unitaire | Jest | Logique métier, infrastructure simulée | 593 |
| API | Jest + Supertest | Application Express réelle en HTTP, infra simulée | 333 |
| Intégration | Jest + PostgreSQL réel | Contraintes, FK, transactions, pièges Prisma | 82 |
| Composants | Vitest + Testing Library | Utilitaires, client HTTP, contexte d'auth, composants | 169 |
| Fonctionnel (E2E) | Playwright | Parcours utilisateurs dans un vrai navigateur | 59 |

Chaque niveau attrape une famille de défauts que les autres laissent passer : les unitaires cadrent les règles chiffrées (paliers de remboursement, quotas, commission) et leurs cas aux bornes ; les tests d'API valident le câblage auth/RBAC/validation ; l'intégration vérifie ce qu'un double ne peut pas garantir ; l'E2E voit ce qu'aucun test serveur ne voit — une page blanche, par exemple.

**Résultat concret : la suite de tests a révélé cinq anomalies** (dont une page légalement obligatoire qui ne s'affichait pas). Aucune n'a été corrigée à chaud : chacune est **figée par un test de caractérisation** qui documente le comportement actuel et deviendra rouge dès l'application du correctif. C'est un point à assumer et à expliquer à l'oral : documenter une dette est plus honnête que la corriger en silence à la veille d'une soutenance.

`.github/workflows/tests.yml` rejoue l'ensemble à chaque poussée et chaque pull request, avec des services PostgreSQL éphémères.

Autres éléments de la démarche qualité :

- **Lint** : ESLint sur les deux projets.
- **Conventions internes documentées** dans `CLAUDE.md` à la racine, qui sert de documentation vivante : accès null-safe au double type de service, forme de réponse de l'API avis, labels partagés centralisés (`constants.js`), pièges d'environnement.
- **Cahier de recette** ([CAHIER-RECETTE.md](CAHIER-RECETTE.md)) : 128 scénarios fonctionnels, dont 114 rejoués automatiquement.

---

## 7. Déploiement et mise en production

### 7.1 Chaîne de déploiement

Le déploiement est **continu, déclenché par `git push`** :

- **Netlify** (frontend) : build `npm run build` (Vite), publication du dossier `dist/` sur CDN. Configuration versionnée dans `netlify.toml` (build + règle de proxy `/api/*` + fallback SPA).
- **Render** (backend) : *Build Command* = installation + génération du client Prisma + synchronisation du schéma (`prisma db push`) ; *Start Command* = `npm start` uniquement. PostgreSQL managé attenant ; Redis managé.

### 7.2 Spécificités apprises en production (voir aussi section 8)

- **Warm-up au démarrage** : le serveur ouvre ses connexions Prisma et Redis **avant** d'accepter des requêtes (sinon, la première requête après un réveil paie tout le coût de connexion et dépasse les timeouts → 504). Prisma est bloquant (sans base, le serveur ne sert à rien), Redis ne l'est pas (un cache indisponible ne doit pas empêcher le démarrage).
- **Variables d'environnement** : côté Netlify, les variables `VITE_*` sont **figées au moment du build** ; côté Render, elles sont injectées au runtime par le dashboard. Toute modification de variable Render déclenche un redéploiement.
- **Instance gratuite Render** : mise en veille après inactivité — la *Start Command* se ré-exécute à **chaque réveil**, d'où l'interdiction absolue d'y mettre des commandes touchant aux données.
- **Système de fichiers éphémère** : effacé à chaque déploiement et à chaque réveil. C'est la contrainte qui a dicté le stockage des fichiers en base (3.1).

---

## 8. Difficultés rencontrées et résolution — études de cas réelles

> Cette section est la plus valorisable dans un mémoire : elle démontre une **démarche de diagnostic**
> (symptôme → hypothèse → investigation → cause racine → correctif → prévention).

### Cas 1 — Erreurs 504 à la connexion (cold start)

**Symptôme** : les premières tentatives de login après une période d'inactivité échouaient en 504 (Gateway Timeout), puis tout fonctionnait.
**Investigation** : le pattern « échec puis succès » orientait vers un problème d'initialisation. Lecture du code de démarrage : le serveur faisait uniquement `app.listen()` ; Prisma et Redis (configuré en `lazyConnect`) n'établissaient leur connexion **qu'à la première requête**.
**Cause racine** : la première requête après un réveil de l'instance payait, dans son propre temps de traitement, l'ouverture des connexions DB + Redis + le handshake TLS — dépassant le timeout du proxy.
**Correctif** : warm-up explicite au démarrage — `await prisma.$connect()` (bloquant) et `await redis.connect()` (non bloquant).
**Prévention** : documenté dans la doc projet ; mesure du temps de connexion ajoutée aux logs.

### Cas 2 — Erreur 500 à l'inscription… mais seulement depuis le site

**Symptôme** : `POST /auth/register` renvoyait 500 depuis le navigateur, alors que le même appel fonctionnait depuis un client HTTP (Bruno).
**Investigation** : reproduction impossible avec des payloads valides → lecture des **logs serveur en production**, qui montraient une `ZodError` non gérée avec les messages « Au moins une majuscule, au moins un chiffre ».
**Cause racine double** : (1) l'utilisateur testait avec un mot de passe ne respectant pas la politique — cas jamais testé côté client HTTP ; (2) surtout, le middleware de validation lisait `error.errors` alors que **Zod 4 expose les erreurs dans `error.issues`** (changement d'API par rapport à Zod 3). L'erreur de validation n'était donc pas reconnue et remontait en 500 générique au lieu d'un 400 explicite.
**Correctif** : lecture de `error.issues || error.errors` (rétro-compatible) → toute erreur de validation redevient un `400 VALIDATION_ERROR` avec messages lisibles.
**Leçon** : lors d'une montée de version majeure d'une dépendance, vérifier les *breaking changes* de son API d'erreurs ; et toujours tester les **chemins d'échec**, pas seulement les chemins nominaux.
**Suite** : la campagne de tests a montré que la migration Zod 3 → 4 n'était pas terminée — 21 messages d'erreur français restent inopérants dans les validateurs, qui emploient encore les options `required_error:` et `errorMap:`. L'anomalie est documentée et figée par test (anomalie n° 2).

### Cas 3 — La page de login se recharge sans afficher d'erreur

**Symptôme** : en cas de mauvais mot de passe, aucune erreur ne s'affichait — la page se rechargeait silencieusement.
**Investigation** : les logs montraient la séquence `POST /auth/login 401` immédiatement suivie de `POST /auth/refresh 401`.
**Cause racine** : l'intercepteur Axios traitait **tout** 401 comme « access token expiré » et tentait un refresh — **y compris le 401 du login lui-même**. Le refresh échouait (pas de session), et le gestionnaire d'échec faisait `window.location.href = '/login'` → rechargement, message d'erreur jamais affiché.
**Correctif** : exclusion des routes d'authentification du mécanisme d'auto-refresh (test du chemin de la requête dans l'intercepteur).
**Leçon** : un intercepteur global doit distinguer les **sémantiques différentes d'un même code HTTP** selon la route.

### Cas 4 — Les données de production disparaissent régulièrement

**Symptôme** : comptes, abonnements et configurations disparaissaient « tout seuls » ; les comptes de démonstration réapparaissaient.
**Investigation** : la réapparition des comptes de démo était la signature du **script de seed**. Audit de la configuration d'hébergement : la *Start Command* Render contenait `prisma db push --accept-data-loss && npm run db:seed && npm start`.
**Cause racine** : sur l'offre gratuite Render, la Start Command se ré-exécute à **chaque réveil de veille** — donc le seed (qui commence par vider toutes les tables) s'exécutait plusieurs fois par jour en production.
**Correctif** : Start Command réduite à `npm start` ; la synchronisation de schéma déplacée en Build Command ; suppression du flag `--accept-data-loss` ; le seed ne s'exécute plus que manuellement.
**Leçon** : comprendre le **cycle de vie exact** de sa plateforme d'hébergement (build vs start vs réveil) ; ne jamais mettre d'opération destructive dans un chemin d'exécution automatique.

### Cas 5 — Fonctionnalités en panne silencieuse en production (variables d'environnement)

**Symptôme** : le questionnaire médical renvoyait 500 en production (OK en local) ; les utilisateurs étaient déconnectés de façon aléatoire ; les emails ne partaient pas.
**Investigation** : les logs de démarrage contenaient les avertissements explicites : `REDIS_URL absent — stockage en mémoire`, `RESEND_API_KEY absent — emails désactivés` ; et la stack trace du 500 pointait la clé de chiffrement PARQ manquante.
**Cause racine** : plusieurs variables d'environnement n'avaient jamais été configurées sur l'hébergeur. Le code étant conçu pour **dégrader silencieusement** (fallback mémoire pour Redis, no-op pour les emails), rien n'échouait au démarrage — les problèmes n'apparaissaient qu'à l'usage. S'y ajoutait une **incohérence de nommage** entre modules (`JWT_SECRET` vs `JWT_ACCESS_SECRET`) masquée en local par un `.env` complet.
**Correctif** : configuration des variables manquantes (dont un Redis managé) ; chaîne de fallback dans le module de chiffrement (`PARQ_ENCRYPTION_KEY` → `JWT_ACCESS_SECRET` → `JWT_SECRET`) ; harmonisation documentée des noms.
**Leçon** : la dégradation gracieuse est une arme à double tranchant — elle doit **toujours** s'accompagner de logs de démarrage explicites et d'une checklist de variables par environnement (désormais documentée dans le README et `CLAUDE.md`).

### Cas 6 — Le quota entreprise cessait de se décompter

**Symptôme** : après la mise en service des litiges, le compteur de séances couvertes d'un salarié affichait des valeurs manifestement fausses — souvent zéro.
**Investigation** : le décompte devait exclure les séances dont le litige avait été tranché en faveur du client (elles sont restituées au quota). Le filtre avait été écrit `disputeStatus: { not: 'RESOLVED_CLIENT' }`.
**Cause racine** : en SQL, toute comparaison avec `NULL` est *inconnue*, donc fausse — `<> 'RESOLVED_CLIENT'` **exclut les lignes NULL**. Prisma reproduit fidèlement cette sémantique. Or l'immense majorité des séances n'ont aucun litige, donc `disputeStatus IS NULL` : le filtre ne comptait plus **que** les séances litigieuses.
**Correctif** : rendre le NULL explicite — `OR: [{ disputeStatus: null }, { disputeStatus: { not: 'RESOLVED_CLIENT' } }]`.
**Prévention** : cas figé par un test d'intégration sur une vraie base — un double Prisma n'aurait jamais reproduit cette sémantique SQL, ce qui justifie à lui seul le troisième niveau de tests.
**Leçon** : un ORM ne protège pas de la logique ternaire de SQL. Dès qu'une colonne est nullable, une négation doit traiter le NULL explicitement.

---

## 9. Bilan

### 9.1 Compétences mobilisées (à mapper sur le référentiel)

- **Conception** : analyse du besoin multi-acteurs, modélisation relationnelle (18 entités, self-relations, machines à états, journal d'audit), architecture en couches, révision d'une décision de conception à l'usage (3.4).
- **Développement back-end** : API REST complète (16 domaines, 106 endpoints), authentification avancée (JWT, refresh révocable, WebAuthn, OAuth Google), intégration de services tiers critiques (Stripe Connect, webhooks signés, idempotence), chiffrement applicatif de données de santé, tâche planifiée d'expiration.
- **Développement front-end** : SPA React avec routing protégé par rôle, gestion d'état d'authentification, intercepteurs HTTP, composants complexes (grille de créneaux type Doctolib, tunnel de paiement Stripe Elements, scan de QR code par la caméra).
- **Sécurité & conformité** : défense en profondeur, RGPD appliqué (chiffrement art. 9, minimisation), PCI-DSS délégué.
- **DevOps** : déploiement continu multi-plateformes, intégration continue GitHub Actions, gestion des environnements, diagnostic en production par les logs.
- **Démarche qualité** : stratégie de tests à cinq niveaux (1 236 tests), cahier de recette formalisé, tests de caractérisation sur les anomalies connues, documentation vivante, post-mortems des incidents.

### 9.2 Perspectives d'évolution

| Évolution | Motivation |
|---|---|
| Correction des 5 anomalies figées par test | Dette identifiée et documentée, prête à être soldée |
| Stockage objet (S3/R2) pour les fichiers | Décharger PostgreSQL, servir via CDN — le stockage en `bytea` est une solution de contournement du disque éphémère |
| Stripe Billing (abonnements récurrents) | Renouvellement automatique + prorata par siège, aujourd'hui manuels |
| Vérification SIRET via API Pappers | Fiabiliser l'onboarding entreprise, aujourd'hui déclaratif |
| Notifications temps réel (SSE) | Remplacer le polling 30 s |
| Interface sur `AppointmentStatusHistory` | La traçabilité est collectée mais pas encore exploitée |
| Suppression du chemin `serviceId` hérité | Solder la dette du double catalogue (3.4) |
| TypeScript backend progressif | Sécuriser les refactorings à mesure que le code grossit |
| Application mobile (React Native) | Mutualiser les compétences React et l'API existante |

---

## Annexe — chiffres clés du projet

| Indicateur | Valeur |
|---|---|
| Domaines API | 16 |
| Endpoints | 106 |
| Modèles de données | 18 |
| Rôles utilisateur | 4 (+ variante salarié/particulier) |
| Pages frontend | 34 composants de page, 8 routes publiques |
| Tests automatisés | 1 236 sur 5 niveaux |
| Scénarios de recette | 128 (114 automatisés) |
| Durée access / refresh token | 15 min / 7 jours |
| Commission marketplace | 30 % plateforme / 70 % coach |
| Politique d'annulation | ≥ 7 j : 100 % · 48 h–7 j : 50 % · < 48 h : 0 % |
| Quota entreprise (séances/collaborateur/mois) | Essentiel 4 · Boost 8 · Ultra 16 |
| Plans entreprise | 54 € et 122 € /collab/mois ; 516 € et 1 176 € /an ; Ultra sur devis |
| Validité PAR-Q | 1 an |
| Chiffrement données santé | AES-256-GCM, clé dérivée scrypt |
| Expiration des réservations non confirmées | 24 h (balayage toutes les 10 min) |
