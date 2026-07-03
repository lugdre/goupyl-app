# Dossier projet — Goupyl Sport

> Document de fond destiné à la rédaction du dossier professionnel et du mémoire.
> Chaque section explique **ce qui a été fait**, **comment ça fonctionne** et **pourquoi ce choix**,
> avec le niveau de détail nécessaire pour restituer et défendre le projet à l'oral.

---

## 1. Présentation du projet

### 1.1 Le contexte et le problème

Le sport en entreprise et le bien-être des salariés sont devenus des enjeux RH majeurs (QVCT — qualité de vie et conditions de travail). Pourtant, trois acteurs peinent à se rencontrer :

- **Les entreprises** veulent proposer du sport/bien-être à leurs salariés, mais n'ont ni le temps ni l'expertise pour sourcer des coachs fiables, gérer les plannings et suivre l'utilisation.
- **Les coachs et intervenants bien-être** (sport, nutrition, santé mentale) sont des indépendants qui cherchent des clients réguliers et une gestion simplifiée (agenda, paiement, facturation).
- **Les particuliers et salariés** veulent réserver une séance aussi simplement qu'un rendez-vous médical sur Doctolib.

**Goupyl Sport** répond à ce triple besoin : une plateforme web qui met en relation des professionnels vérifiés avec des clients particuliers (B2C) et des entreprises (B2B), en gérant tout le cycle : découverte du coach → réservation → questionnaire médical → paiement → séance → avis.

### 1.2 Le modèle économique

Deux sources de revenus, qui structurent toute l'architecture technique :

1. **Abonnements entreprise** (B2B) : facturation **par collaborateur et par mois** — plan Essentiel à 54 €/collaborateur/mois, plan Boost à 122 €, plan Ultra sur devis. L'engagement annuel bénéficie de −20 %. Les salariés de l'entreprise réservent alors leurs séances sans payer : c'est l'employeur qui finance.
2. **Commission marketplace** (B2C) : sur chaque séance payée par un particulier, la plateforme prélève **30 %** et reverse **70 %** au coach, automatiquement.

### 1.3 Les quatre profils d'utilisateurs (acteurs)

| Rôle | Qui | Ce qu'il fait sur la plateforme |
|---|---|---|
| `CLIENT` particulier | Un individu | Cherche un coach, réserve, remplit le questionnaire médical, paie sa séance, laisse un avis |
| `CLIENT` salarié | Un employé d'une entreprise cliente | Idem, mais rattaché à son employeur via un code : ses séances sont couvertes par l'abonnement de l'entreprise |
| `INTERVENANT` | Coach sportif, nutritionniste, praticien bien-être | Crée ses services (prix, durée, solo/duo/groupe), gère son agenda, fait vérifier ses diplômes, encaisse ses gains |
| `ENTREPRISE` | DRH / dirigeant / CSE | Souscrit un abonnement, invite ses salariés, suit l'utilisation (analytics), accède à une bibliothèque de ressources |
| `ADMIN` | L'équipe plateforme | Vérifie l'identité et les diplômes des coachs, gère les utilisateurs, supervise l'activité |

Un même modèle `User` porte les quatre rôles (champ `role`), ce qui simplifie l'authentification tout en permettant des données spécifiques par rôle (profil coach, SIRET entreprise, rattachement employeur du salarié).

---

## 2. Analyse du besoin et spécifications

### 2.1 Exigences fonctionnelles principales

1. **Inscription différenciée** selon le profil : un particulier s'inscrit librement ; un salarié s'inscrit avec un code entreprise ou une invitation email ; une entreprise fournit un SIRET ; un coach doit soumettre pièce d'identité et diplômes avant activation.
2. **Réservation type "Doctolib"** : grille hebdomadaire de créneaux, calcul des disponibilités, prévention des doubles réservations (côté coach ET côté client).
3. **Questionnaire médical obligatoire (PAR-Q)** : avant toute première réservation, le client répond à 7 questions de santé. En cas de risque déclaré, la réservation est bloquée jusqu'à validation par un coach.
4. **Paiement en ligne** avec les deux flux (abonnement entreprise / paiement à la séance avec reversement au coach).
5. **Politique d'annulation** : annulation gratuite jusqu'à 48 h avant ; passé ce délai, impossible ; si la séance était déjà payée, remboursement partiel selon une répartition définie (35 % client / 30 % coach / 35 % plateforme).
6. **Confiance** : vérification des coachs par l'admin, avis clients post-séance (avec droit de réponse du coach), comptes-rendus de séance.
7. **Espace entreprise** : gestion des salariés (code permanent, invitations par email avec expiration), statistiques d'utilisation, bibliothèque de contenus à trois niveaux d'accès selon le plan.

### 2.2 Exigences non fonctionnelles

- **Sécurité** : données de santé chiffrées, mots de passe hachés, sessions révocables, protection contre le brute-force, contrôle d'accès par rôle sur chaque route.
- **Conformité** : les réponses au questionnaire médical sont des **données de santé au sens du RGPD** (article 9 — catégorie particulière) → chiffrement au repos, accès strictement limité au propriétaire.
- **Coût d'infrastructure minimal** : le projet doit tourner sur des offres gratuites/low-cost (contexte projet étudiant → production réelle).
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
│  API REST : 16 domaines métier                              │
│  ├─ Prisma ORM ────► PostgreSQL  (données métier)           │
│  ├─ ioredis ───────► Redis       (sessions, TTL)            │
│  ├─ stripe ────────► Stripe      (paiements + marketplace)  │
│  └─ resend ────────► Resend      (emails transactionnels)   │
└────────────────────────────────────────────────────────────┘
```

**Décision structurante — le proxy Netlify** : le frontend n'appelle jamais directement le domaine du backend. Netlify réécrit `/api/*` vers Render côté serveur. Résultat : le navigateur ne voit qu'un seul domaine, ce qui **élimine toute la problématique CORS** (en dev, le serveur Vite fait exactement la même chose vers `localhost:3000`). C'est un choix d'architecture simple qui supprime une source d'erreurs classique.

### 3.2 Le backend en couches

Chaque requête traverse une chaîne de responsabilités clairement séparées :

```
Requête HTTP
 → helmet (en-têtes de sécurité HTTP)
 → cors, morgan (logs)
 → rate-limiting global (100 req/min) — durci à 10/min sur login/register
 → express.json  (sauf le webhook Stripe, qui reçoit le corps BRUT pour
                  vérifier la signature cryptographique)
 → Route du domaine
    → authenticate : vérifie le JWT, injecte req.user = { userId, role }
    → authorize(...rôles) : contrôle d'accès RBAC
    → validate(schéma Zod) : validation/normalisation du corps de requête
 → Controller : mince — try/catch et délégation
 → Service : TOUTE la logique métier (Prisma, Redis, Stripe)
 → errorHandler centralisé : traduit les erreurs en réponses HTTP propres
```

**Pourquoi cette séparation** : les contrôleurs ne contiennent aucune logique (5-10 lignes chacun) ; toute la valeur est dans les services, qui sont testables unitairement en mockant Prisma et Redis. Les 16 domaines (auth, users, appointments, payments, parq, reviews, companies, etc.) suivent **exactement le même triple de fichiers** `routes/` + `controllers/` + `services/` (+ `validators/`) : comprendre un domaine, c'est les comprendre tous.

La gestion d'erreurs est centralisée autour d'une classe `ApiError` (avec constructeurs statiques `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`). Un service lève `ApiError.conflict("Ce créneau n'est plus disponible", 'SLOT_CONFLICT')` ; le middleware final produit la réponse HTTP correspondante avec un code d'erreur machine (`SLOT_CONFLICT`) que le frontend peut interpréter pour afficher le bon message.

### 3.3 Le modèle de données (15 modèles Prisma / PostgreSQL)

Le choix de PostgreSQL s'imposait : les données sont profondément **relationnelles et transactionnelles** (une réservation lie un client, un coach, un service, un paiement, un avis, un compte-rendu — et l'argent est en jeu).

Les modèles et leurs relations clés :

```
User ─────────────── le pivot du système (les 4 rôles dans une table)
 ├─ Profile (1:1)          bio, spécialités, diplômes, tarif horaire, ville…
 ├─ employerCompany (self-relation)  un CLIENT salarié pointe vers son
 │                          User ENTREPRISE ; l'entreprise voit ses employees
 ├─ CoachService (1:N)     les prestations définies par le coach (B2C)
 ├─ Passkey (1:N)          identifiants WebAuthn
 ├─ Document (1:N)         pièces justificatives pour la vérification
 ├─ Subscription (1:N)     abonnements de l'entreprise
 ├─ Notification (1:N)
 └─ PARQQuestionnaire (1:N) questionnaire médical (réponses chiffrées)

Appointment ───────── le cœur métier
 ├─ client / intervenant  (2 FK vers User)
 ├─ serviceId  OU  coachServiceId  (voir 3.4)
 ├─ Payment (1:1)          montants en centimes, part plateforme/coach
 ├─ Review (1:1)           note + commentaire + réponse du coach
 └─ SessionReport (1:1)    compte-rendu rédigé par le coach

Service          catalogue B2B défini par la plateforme (gating par plan)
Resource         bibliothèque de contenus (3 paliers d'accès)
CompanyInvite    invitations tokenisées à rejoindre une entreprise
```

**Détails de conception à défendre à l'oral :**

- **Montants en centimes (entiers)** dans `Payment` : jamais de flottants pour l'argent (éviter les erreurs d'arrondi binaire). Les prix « catalogue » utilisent `Decimal(10,2)`.
- **Soft delete des services coach** (booléen `active` plutôt que suppression) : un service désactivé reste référencé par les réservations passées — l'historique ne casse jamais.
- **Statuts en enums** PostgreSQL (`AppointmentStatus`, `VerificationStatus`, etc.) : l'intégrité est garantie par la base, pas seulement par le code.
- **Self-relation** `employerCompany`/`employees` sur `User` : évite une table `Company` séparée — l'entreprise EST un utilisateur (elle se connecte, a un profil), ses salariés pointent vers elle.

### 3.4 Le double type de service — décision de conception centrale

Le besoin B2B et le besoin B2C imposaient deux catalogues :

- `Service` : prestations **définies par la plateforme** pour l'offre entreprise, avec un champ `availableInPlans` qui restreint chaque prestation à certains plans d'abonnement.
- `CoachService` : prestations **définies librement par chaque coach** (nom, prix, durée 15-120 min, catégorie, type de session SOLO/DUO/GROUP avec nombre max de participants).

Une réservation (`Appointment`) pointe vers **l'un OU l'autre** (`serviceId` et `coachServiceId` tous deux nullables). Cette dualité irrigue tout le code : partout où le nom du service s'affiche, l'accès est null-safe (`appt.coachService?.name || appt.service?.name`). C'est une convention documentée du projet.

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

**Passkeys (WebAuthn)** : en complément du mot de passe, j'ai intégré l'authentification par passkey (Touch ID, Face ID, clé de sécurité) via la bibliothèque SimpleWebAuthn. Le serveur génère un *challenge* cryptographique stocké dans Redis (TTL 5 minutes), le navigateur le fait signer par l'authentificateur de l'appareil, le serveur vérifie la signature avec la clé publique enregistrée. C'est une authentification **résistante au phishing** (le challenge est lié au domaine) et sans secret transmissible. Une passkey validée émet exactement la même paire de JWT que le login classique.

**Vérification d'email** : à l'inscription, un token aléatoire (32 octets) est stocké dans Redis (TTL 24 h) et envoyé par email via Resend ; le lien `/verify-email?token=...` marque `emailVerifiedAt`.

### 4.2 Inscription multi-profils

Le formulaire d'inscription propose quatre entrées : **Particulier**, **Collaborateur**, **Entreprise**, **Professionnel**. Derrière :

- *Particulier* et *Collaborateur* créent tous deux un `CLIENT` — le collaborateur fournit en plus un **code entreprise**. Ce code est résolu de deux façons : soit c'est un token d'invitation (`CompanyInvite`, expiration 7 jours, usage unique), soit le code permanent à 8 caractères hexadécimaux de l'entreprise. Dans les deux cas, `employerCompanyId` est renseigné : le salarié est rattaché.
- *Entreprise* : fournit raison sociale + SIRET (validé par regex : exactement 14 chiffres). Un `joinCode` unique est généré (boucle de génération avec vérification d'unicité en base). La vérification SIRET via l'API Pappers est identifiée comme évolution (pour l'instant : vérification déclarative).
- *Professionnel* : le compte est créé avec `verificationStatus: PENDING` — il devra soumettre ses documents (voir 4.6) avant d'apparaître publiquement.

La validation des entrées est faite par **Zod** côté serveur (email normalisé, mot de passe : 8 caractères minimum, une majuscule, un chiffre) — le frontend affiche les messages d'erreur retournés.

### 4.3 La réservation — le module le plus complexe

**Choix de conception : pas de modèle « disponibilités »** (le coach ne déclare pas ses horaires). À la place, un modèle par **créneaux occupés** :

1. Un endpoint public `GET /appointments/busy/:intervenantId?from&to` renvoie les intervalles `{start, end}` des rendez-vous PENDING/CONFIRMED du coach.
2. Le composant frontend `SlotPicker` (grille hebdomadaire inspirée de Doctolib) génère tous les créneaux possibles entre **7 h et 21 h** à la durée du service choisi, et grise ceux qui chevauchent un intervalle occupé — ainsi que, pour un client connecté, **ses propres créneaux occupés** (pour l'empêcher de se double-réserver).
3. À la soumission, le serveur **revalide tout** (ne jamais faire confiance au client) : horaires d'ouverture, appartenance du service au coach, droits du plan entreprise le cas échéant, et **détection de chevauchement** côté coach ET côté client avec la condition classique d'intersection d'intervalles : `existant.début < nouveau.fin ET existant.fin > nouveau.début`. En cas de conflit : `409 SLOT_CONFLICT`.

**Cycle de vie d'un rendez-vous** — machine à états avec transitions whitelistées :

```
PENDING ──(coach confirme)──► CONFIRMED ──(coach clôture)──► DONE
   │                              │
   └──────── CANCELLED ◄──────────┘   (client ≥48h avant, ou coach)
```

Toute transition hors de cette liste est rejetée (`INVALID_STATUS_TRANSITION`). Deux règles métier notables :

- **Barrière de paiement** : CONFIRMED → DONE exige `paymentStatus === 'paid'`… **sauf si le client est un salarié d'entreprise** (la séance est alors couverte par l'abonnement — le coach reçoit une notification lui indiquant que le virement viendra de la plateforme).
- **Annulation à 48 h** : un client ne peut annuler que si la séance est à plus de 48 h. Si elle était déjà payée, un **remboursement partiel Stripe** est déclenché : 35 % remboursés au client, 30 % conservés pour le coach (dédommagement), 35 % pour la plateforme. Ces taux sont des constantes nommées en tête du service — modifiables en un point.

### 4.4 Le questionnaire médical PAR-Q — données de santé et RGPD

Le **PAR-Q** (Physical Activity Readiness Questionnaire) est un questionnaire standard de 7 questions oui/non (problème cardiaque, douleurs thoraciques, vertiges, problèmes articulaires, traitement hypertension, autre raison médicale, grossesse). Il conditionne la réservation :

- `GET /parq/status` renvoie un booléen `canBook` : faux si le questionnaire est absent, expiré (validité 1 an), ou si un risque est déclaré (`hasRisk`) sans validation coach (`coachCleared`).
- Le parcours de réservation affiche le questionnaire en modal si nécessaire et bloque la soumission tant que `canBook` est faux.

**Le point technique et juridique fort du projet** : les réponses sont des **données de santé** (RGPD art. 9). Elles sont donc **chiffrées au repos** avec **AES-256-GCM** :

- La clé de chiffrement est dérivée d'un secret d'environnement (`PARQ_ENCRYPTION_KEY`) par **scrypt** (fonction de dérivation résistante au brute-force).
- Chaque enregistrement produit une enveloppe `iv:authTag:ciphertext` en base64 — l'IV (vecteur d'initialisation) est aléatoire à chaque chiffrement, et le tag d'authentification GCM garantit l'**intégrité** (toute altération du ciphertext fait échouer le déchiffrement).
- Conséquence concrète : un dump de la base de données ne révèle **aucune réponse médicale** ; seuls le booléen agrégé `hasRisk` et les métadonnées sont lisibles. L'API ne renvoie les réponses déchiffrées **qu'au propriétaire** du questionnaire — ni l'employeur, ni l'admin n'y ont accès.

À l'oral : ce chiffrement illustre la **minimisation** et la **protection dès la conception** (privacy by design) exigées par le RGPD.

### 4.5 Les paiements Stripe — deux flux distincts

C'est la partie la plus sensible du projet (argent réel, obligations réglementaires).

**Flux 1 — Abonnements entreprise (Stripe Checkout)** :
1. L'entreprise choisit un plan et un cycle (mensuel/annuel). Le backend calcule la quantité = **nombre de collaborateurs rattachés** (minimum 1) et crée une *Checkout Session* Stripe avec ce montant par siège.
2. L'utilisateur paie sur la **page hébergée par Stripe** — aucune donnée bancaire ne transite par mes serveurs (conformité PCI-DSS déléguée à Stripe).
3. L'activation de l'abonnement est **doublement sécurisée** : par le webhook `checkout.session.completed` (Stripe notifie mon serveur) ET par une vérification côté API au retour de l'utilisateur (`/payments/verify-session`). Si l'un des deux canaux échoue (webhook perdu, utilisateur qui ferme l'onglet), l'autre couvre.

**Flux 2 — Marketplace B2C (Stripe Connect)** :

Encaisser de l'argent **pour le compte d'un tiers** (le coach) est une activité réglementée (statut d'établissement de paiement). **Stripe Connect** résout ce problème : chaque coach ouvre un *compte connecté* Stripe via un parcours d'onboarding hébergé (KYC, IBAN — géré par Stripe), et les paiements sont splittés automatiquement :

```js
paymentIntents.create({
  amount: prixEnCentimes,
  application_fee_amount: 30% du prix,      // commission plateforme
  transfer_data: { destination: compteStripeDuCoach },  // 70% au coach
})
```

Détails d'implémentation défendables :
- Le paiement n'est proposé qu'une fois le rendez-vous **CONFIRMED** par le coach (pas de paiement pour un créneau non validé).
- Les *PaymentIntents* en attente sont **réutilisés** au lieu d'être recréés (idempotence — protège aussi du double-montage des composants React en StrictMode).
- Le **webhook Stripe** vérifie la **signature cryptographique** du corps de requête brut (`constructEvent` avec le `STRIPE_WEBHOOK_SECRET`) : impossible de forger une fausse notification de paiement. C'est pour cela que la route webhook est montée avec `express.raw` AVANT le parseur JSON global.
- Moyens de paiement : carte + **Klarna** (paiement fractionné).
- Une page « Paiements & gains » côté coach affiche l'onboarding Stripe (états : à configurer / en vérification / actif) puis, une fois actif, le total encaissé, les montants en attente (séances payées non clôturées) et l'historique détaillé avec la part coach (70 %).

### 4.6 La vérification des coachs — workflow de confiance

1. Le coach téléverse pièce d'identité + diplômes : upload **multer** limité à 5 Mo, types MIME restreints (PDF/JPG/PNG), fichiers renommés en **UUID** (pas de collision, pas de fuite d'information dans le nom), stockés hors du répertoire public.
2. L'admin dispose d'une page de revue : la prévisualisation se fait via un endpoint **réservé à l'ADMIN** qui streame le binaire ; le frontend le récupère en `blob` et crée une URL objet — le fichier n'est jamais exposé publiquement.
3. L'admin valide ou rejette avec une note : `verificationStatus` passe à VERIFIED/REJECTED. Tant qu'il n'est pas vérifié, le coach voit un **bandeau permanent** dans son dashboard et n'apparaît pas dans la recherche publique.

### 4.7 L'espace entreprise (B2B)

- **Rattachement des salariés** : deux mécanismes complémentaires — le **code permanent** (8 hex, régénérable si compromis) à diffuser en interne, et les **invitations email nominatives** (token unique, expiration 7 jours, marquées utilisées après consommation).
- **Analytics** : agrégats Prisma (`count`, `groupBy`) sur l'utilisation — séances par mois, répartition par catégorie, taux d'adoption des salariés — restitués en graphiques Recharts.
- **Bibliothèque de ressources** : contenus (articles/vidéos) portant un niveau d'accès ESSENTIEL/BOOST/ULTRA. L'accès est **cumulatif** (Boost voit Essentiel+Boost). Point d'UX : l'API renvoie **toutes** les ressources avec un indicateur calculé `isLocked` — le frontend affiche les contenus verrouillés (flou + cadenas) plutôt que de les cacher, ce qui incite à l'upgrade.
- **Middleware `injectActivePlan`** : détermine le plan actif de l'utilisateur courant (l'abonnement de l'entreprise, ou celui de l'employeur pour un salarié), avec une règle métier : un abonnement **résilié reste valable jusqu'à sa date de fin** (le client a payé la période).

### 4.8 Avis, comptes-rendus, notifications

- **Avis** : uniquement après une séance DONE, un seul par rendez-vous (contrainte d'unicité en base). Le coach a un **droit de réponse**, modifiable au maximum 3 fois (compteur `coachReplyEdits`) — équilibre entre droit de rectification et intégrité de l'historique. Le profil public du coach agrège note moyenne + nombre d'avis, avec tri (récents / mieux notés) et pagination côté client (5 avis puis « voir plus »).
- **Comptes-rendus de séance** : le coach rédige notes et mise à jour d'objectifs après chaque séance — matérialise le suivi dans la durée.
- **Notifications** : modèle simple en base (type/titre/corps/readAt), cloche dans la barre de navigation avec **polling toutes les 30 s** du compteur non-lus. Choix assumé : le polling suffit au besoin actuel ; SSE/WebSocket est identifié comme évolution si le temps réel devient nécessaire.

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
| Autorisation | RBAC par middleware sur chaque route + revérification de propriété dans les services (« ce RDV vous appartient-il ? ») | Élévation de privilèges, IDOR |
| Données de santé | AES-256-GCM au repos, clé dérivée scrypt, accès propriétaire uniquement | Fuite RGPD art. 9 |
| Paiements | Page Stripe hébergée (PCI délégué), signature des webhooks, montants recalculés côté serveur | Fraude, manipulation des prix |
| Uploads | Taille/MIME limités, noms UUID, lecture ADMIN-only streamée | Upload malveillant, accès direct |
| Secrets | Variables d'environnement (jamais en dur) ; le `.env` backend non versionné | Fuite de secrets |

Point d'honnêteté utile pour le mémoire : les **erreurs 500 en production masquent le détail** (« Erreur interne ») pour ne rien révéler de l'implémentation — le diagnostic se fait par les logs serveur, pas par les réponses HTTP.

---

## 6. Qualité, tests et conventions

- **Tests unitaires (Jest)** : les services sont testés en isolant l'infrastructure — Prisma et Redis sont **mockés** (`jest.mock` sur les modules de config). On teste la logique métier pure (ex. : les transitions de statut interdites lèvent bien une erreur).
- **Tests d'intégration (Supertest)** : l'application Express réelle est attaquée en HTTP avec une vraie base de données.
- **Lint** : ESLint sur les deux projets.
- **Conventions internes documentées** (fichier CLAUDE.md à la racine, qui sert de documentation vivante du projet) : accès null-safe au double type de service, forme de réponse de l'API avis, labels partagés centralisés (`constants.js`), etc.
- **Vérification manuelle systématique** : chaque correctif de production a été validé par reproduction du parcours réel via `curl` contre l'API déployée (voir section 8).

---

## 7. Déploiement et mise en production

### 7.1 Chaîne de déploiement

Le déploiement est **continu, déclenché par `git push`** :

- **Netlify** (frontend) : build `npm run build` (Vite), publication du dossier `dist/` sur CDN. Configuration versionnée dans `netlify.toml` (build + règles de proxy + fallback SPA).
- **Render** (backend) : *Build Command* = installation + génération du client Prisma + synchronisation du schéma (`prisma db push`) ; *Start Command* = `npm start` uniquement. PostgreSQL managé attenant ; Redis managé (Upstash/Render Key-Value).

### 7.2 Spécificités apprises en production (voir aussi section 8)

- **Warm-up au démarrage** : le serveur ouvre ses connexions Prisma et Redis **avant** d'accepter des requêtes (sinon, la première requête après un réveil paie tout le coût de connexion et dépasse les timeouts → 504).
- **Variables d'environnement** : côté Netlify, les variables `VITE_*` sont **figées au moment du build** ; côté Render, elles sont injectées au runtime par le dashboard. Toute modification de variable Render déclenche un redéploiement.
- **Instance gratuite Render** : mise en veille après inactivité — la *Start Command* se ré-exécute à **chaque réveil**, d'où l'interdiction absolue d'y mettre des commandes touchant aux données.

---

## 8. Difficultés rencontrées et résolution — études de cas réelles

> Cette section est la plus valorisable dans un mémoire : elle démontre une **démarche de diagnostic**
> (symptôme → hypothèse → investigation → cause racine → correctif → prévention).

### Cas 1 — Erreurs 504 à la connexion (cold start)

**Symptôme** : les premières tentatives de login après une période d'inactivité échouaient en 504 (Gateway Timeout), puis tout fonctionnait.
**Investigation** : le pattern « échec puis succès » orientait vers un problème d'initialisation. Lecture du code de démarrage : le serveur faisait uniquement `app.listen()` ; Prisma et Redis (configuré en `lazyConnect`) n'établissaient leur connexion **qu'à la première requête**.
**Cause racine** : la première requête après un réveil de l'instance payait, dans son propre temps de traitement, l'ouverture des connexions DB + Redis + le handshake TLS — dépassant le timeout du proxy.
**Correctif** : warm-up explicite au démarrage — `await prisma.$connect()` (bloquant : sans base, le serveur ne sert à rien) et `await redis.connect()` (non bloquant : un Redis indisponible ne doit pas empêcher le démarrage).
**Prévention** : documenté dans la doc projet ; mesure du temps de connexion ajoutée aux logs.

### Cas 2 — Erreur 500 à l'inscription… mais seulement depuis le site

**Symptôme** : `POST /auth/register` renvoyait 500 depuis le navigateur, alors que le même appel fonctionnait depuis un client HTTP (Bruno).
**Investigation** : reproduction impossible avec des payloads valides → lecture des **logs serveur en production**, qui montraient une `ZodError` non gérée avec les messages « Au moins une majuscule, au moins un chiffre ».
**Cause racine double** : (1) l'utilisateur testait avec un mot de passe ne respectant pas la politique — cas jamais testé côté client HTTP ; (2) surtout, le middleware de validation lisait `error.errors` alors que **Zod 4 expose les erreurs dans `error.issues`** (changement d'API par rapport à Zod 3). L'erreur de validation n'était donc pas reconnue et remontait en 500 générique au lieu d'un 400 explicite.
**Correctif** : lecture de `error.issues || error.errors` (rétro-compatible) → toute erreur de validation redevient un `400 VALIDATION_ERROR` avec messages lisibles.
**Leçon** : lors d'une montée de version majeure d'une dépendance, vérifier les *breaking changes* de son API d'erreurs ; et toujours tester les **chemins d'échec**, pas seulement les chemins nominaux.

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
**Correctif** : Start Command réduite à `npm start` ; la synchronisation de schéma déplacée en Build Command (une fois par déploiement) ; suppression du flag `--accept-data-loss` ; le seed ne s'exécute plus que manuellement.
**Leçon** : comprendre le **cycle de vie exact** de sa plateforme d'hébergement (build vs start vs réveil) ; ne jamais mettre d'opération destructive dans un chemin d'exécution automatique.

### Cas 5 — Fonctionnalités en panne silencieuse en production (variables d'environnement)

**Symptôme** : le questionnaire médical renvoyait 500 en production (OK en local) ; les utilisateurs étaient déconnectés de façon aléatoire ; les emails ne partaient pas.
**Investigation** : les logs de démarrage contenaient les avertissements explicites : `REDIS_URL absent — stockage en mémoire`, `RESEND_API_KEY absent — emails désactivés` ; et la stack trace du 500 pointait `Missing secret for PARQ encryption`.
**Cause racine** : plusieurs variables d'environnement n'avaient jamais été configurées sur l'hébergeur. Le code étant conçu pour **dégrader silencieusement** (fallback mémoire pour Redis, no-op pour les emails), rien n'échouait au démarrage — les problèmes n'apparaissaient qu'à l'usage. S'y ajoutait une **incohérence de nommage** entre modules (`JWT_SECRET` vs `JWT_ACCESS_SECRET`) masquée en local par un `.env` complet.
**Correctif** : configuration des variables manquantes (dont un Redis managé) ; ajout d'une chaîne de fallback dans le module de chiffrement ; harmonisation documentée des noms.
**Leçon** : la dégradation gracieuse est une arme à double tranchant — elle doit **toujours** s'accompagner de logs de démarrage explicites et d'une checklist de variables par environnement (désormais documentée).

---

## 9. Bilan

### 9.1 Compétences mobilisées (à mapper sur le référentiel)

- **Conception** : analyse du besoin multi-acteurs, modélisation relationnelle (15 entités, self-relations, machines à états), architecture en couches.
- **Développement back-end** : API REST complète (16 domaines), authentification avancée (JWT, refresh révocable, WebAuthn), intégration de services tiers critiques (Stripe Connect, webhooks signés), chiffrement applicatif de données de santé.
- **Développement front-end** : SPA React avec routing protégé par rôle, gestion d'état d'authentification, intercepteurs HTTP, composants complexes (grille de créneaux type Doctolib, tunnel de paiement Stripe Elements).
- **Sécurité & conformité** : défense en profondeur, RGPD appliqué (chiffrement art. 9, minimisation), PCI-DSS délégué.
- **DevOps** : déploiement continu multi-plateformes, gestion des environnements, diagnostic en production par les logs.
- **Démarche qualité** : tests unitaires/intégration, documentation vivante, post-mortems des incidents.

### 9.2 Perspectives d'évolution

| Évolution | Motivation |
|---|---|
| Stockage objet (S3/R2) pour les uploads | Le disque Render est éphémère |
| Stripe Billing (abonnements récurrents) | Renouvellement automatique + prorata par siège |
| Vérification SIRET via API Pappers | Fiabiliser l'onboarding entreprise |
| Notifications temps réel (SSE) | Remplacer le polling 30 s |
| TypeScript backend progressif | Sécuriser les refactorings à mesure que le code grossit |
| Application mobile (React Native) | Mutualiser les compétences React et l'API existante |

---

## Annexe — chiffres clés du projet

| Indicateur | Valeur |
|---|---|
| Domaines API | 16 |
| Modèles de données | 15 |
| Rôles utilisateur | 4 (+ variante salarié/particulier) |
| Endpoints (ordre de grandeur) | ~70 |
| Pages frontend | ~33 (8 publiques, 25 dashboard) |
| Durée access / refresh token | 15 min / 7 jours |
| Commission marketplace | 30 % plateforme / 70 % coach |
| Politique d'annulation | ≥ 48 h ; remboursement 35/30/35 |
| Plans entreprise | 54 € et 122 € /collab/mois ; Ultra sur devis ; −20 % annuel |
| Validité PAR-Q | 1 an |
| Chiffrement données santé | AES-256-GCM, clé dérivée scrypt |
