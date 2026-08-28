# Dossier Professionnel (DP) — Concepteur Développeur d'Applications

> Contenu calibré pour les cases du formulaire Word officiel (version du 01/06/2016).
> À compléter : `[…]` = nom, adresse, entreprise d'accueil, lieu et date.
> Sources : `docs/DOSSIER-PROJET.md`, `STACK-TECHNIQUE.md`, `STRATEGIE-TESTS.md`, `CAHIER-RECETTE.md`.

---

## Page de garde

| Champ | À saisir |
|---|---|
| Nom de naissance / Nom d'usage | [Nom] |
| Prénom | Lucien |
| Adresse | [Adresse] |
| Titre professionnel visé | Concepteur Développeur d'Applications |
| Modalité d'accès | ☒ Parcours de formation |

## Sommaire — intitulés des exemples

AT 1 — Développer une application sécurisée
1. Développer des interfaces utilisateur — *Interface de réservation et tunnel de paiement de Goupyl Sport*
2. Développer des composants métier — *Moteur de réservation, politique d'annulation, chiffrement des données de santé*
3. Contribuer à la gestion d'un projet informatique — *Versionnage, intégration continue et suivi d'anomalies*

AT 2 — Concevoir et développer une application sécurisée en couches
1. Analyser les besoins et maquetter — *Cadrage multi-acteurs et maquettage Figma*
2. Définir l'architecture logicielle — *SPA + API REST en couches, deux hébergeurs*
3. Concevoir et mettre en place une base de données relationnelle — *18 entités PostgreSQL sous Prisma*
4. Développer des composants d'accès aux données SQL et NoSQL — *Prisma/PostgreSQL et Redis*

AT 3 — Préparer le déploiement d'une application sécurisée
1. Préparer et exécuter les plans de test — *5 niveaux, 1 236 tests, 128 scénarios de recette*

---
---

# ACTIVITÉ-TYPE 1 — Développer une application sécurisée

## Exemple n° 1 — Développer des interfaces utilisateur

### 1. Tâches ou opérations effectuées, et dans quelles conditions

J'ai développé l'interface web de Goupyl Sport, plateforme mettant en relation des professionnels du sport et du bien-être avec des particuliers et des entreprises : une application monopage React 19 de 34 pages servant quatre rôles (client, professionnel, entreprise, administrateur).

- Structure et routage : routage par rôle avec deux gardes imbriquées — authentification, puis appartenance du rôle à la liste blanche de la route.
- Authentification côté client : contexte React et intercepteurs Axios rafraîchissant le jeton expiré de façon transparente, avec mise en file d'attente des requêtes concurrentes.
- Composant de réservation `SlotPicker` : grille hebdomadaire de créneaux (7 h-21 h) à la durée de la prestation, grisant les créneaux déjà occupés du coach et du client. Le composant le plus complexe de l'application.
- Tunnel de paiement avec Stripe Elements, et validation de présence par QR code (affichage côté client, scan caméra côté coach, saisie manuelle en repli).
- Écrans métier des quatre espaces : agenda, prestations, gestion des collaborateurs et statistiques graphiques, back-office d'administration.
- Système de design : primitives réutilisables et libellés centralisés pour une présentation homogène des statuts et catégories.
- Affichage mobile repris sur la landing et la recherche ; 169 tests d'interface.

Conditions : développement en autonomie, sur un projet réel mis en production, livraisons continues par `git push`.

### 2. Moyens utilisés

- Langages : JavaScript (ES modules), JSX, HTML5, CSS3.
- Bibliothèques : React 19, React Router 7, Axios, Tailwind CSS v4, Recharts, `date-fns`, Stripe Elements, `react-qr-code`, `html5-qrcode`, `react-hot-toast`.
- Outillage : Vite 8, ESLint, Vitest + Testing Library, Git/GitHub, VS Code.
- Méthodes : composants fonctionnels et hooks, état d'authentification par contexte, un module d'appel API par domaine métier, conventions de code documentées dans le dépôt.
- Ressources : maquettes Figma, documentations React, Stripe et Tailwind.

### 3. Avec qui avez-vous travaillé ?

Développement mené en autonomie, avec Alexandre YVON, tuteur en entreprise, lors de points d'avancement réguliers : validation des parcours utilisateurs et priorisation des écrans. Des utilisateurs testeurs (coach, client, entreprise) ont fait évoluer le parcours de réservation et l'affichage mobile.

### 4. Contexte

| | |
|---|---|
| Nom de l'entreprise, organisme ou association | [Nom de l'entreprise d'accueil] — projet Goupyl Sport |
| Chantier, atelier, service | Développement front-end (alternance, formation CDA — EKOD) |
| Période d'exercice | Du mars 2026 au août 2026 |

### 5. Informations complémentaires

L'application sert quatre rôles. Plutôt que de dupliquer les écrans, j'ai construit une mise en page unique dont le menu dérive du rôle, et des gardes rendant l'accès hors périmètre impossible. L'interface n'est jamais la seule barrière : chaque règle appliquée côté client est revérifiée côté serveur.

---
---

## Exemple n° 2 — Développer des composants métier d'une application

### 1. Tâches ou opérations effectuées, et dans quelles conditions

J'ai développé la couche métier de l'API REST de Goupyl Sport — 16 domaines, 106 endpoints en Node.js/Express — en concentrant toute la logique dans des services testables, les contrôleurs se limitant à déléguer.

- Moteur de réservation : plutôt que de modéliser les disponibilités, j'expose les créneaux occupés d'un coach, sans aucune donnée personnelle. À la soumission, le serveur revalide tout et détecte les chevauchements côté coach et côté client par intersection d'intervalles.
- Machine à états du rendez-vous à transitions en liste blanche (`PENDING → CONFIRMED → DONE | CANCELLED`), doublée d'un journal d'audit enregistrant l'auteur de chaque transition.
- Prise en charge entreprise : un drapeau figé à la réservation selon l'abonnement de l'employeur et le quota mensuel du collaborateur. La barrière de paiement en clôture s'appuie sur ce drapeau, non sur le statut de salarié au moment de la clôture.
- Politique d'annulation dégressive (100 % au-delà de 7 jours, 50 % entre 48 h et 7 jours, 0 % en deçà), l'annulation restant toujours possible ; remboursements Stripe reprenant au prorata la part du coach et la commission.
- Preuve de présence et litiges : jeton QR par rendez-vous, signalement d'absence, contestation par le client et gel des gains du coach jusqu'à arbitrage.
- Chiffrement AES-256-GCM des réponses au questionnaire médical (données de santé, RGPD art. 9), clé dérivée par scrypt, restitution au seul propriétaire.
- Authentification (bcrypt, jetons courts, rafraîchissement révocable, passkeys), paiements idempotents, tâche planifiée d'expiration des réservations, gestion d'erreurs centralisée et validation systématique des entrées.

Ces composants sont couverts par 593 tests unitaires et 333 tests d'API.

### 2. Moyens utilisés

- Langage et environnement : JavaScript (CommonJS), Node.js 22, Express 5.
- Bibliothèques : Prisma, ioredis, Zod, `jsonwebtoken`, `bcrypt`, `stripe`, `@simplewebauthn/server`, `resend`, `multer`, `helmet`, module natif `crypto`.
- Outillage : Jest, Supertest, ESLint, Bruno, Prisma Studio, Git/GitHub.
- Méthodes : séparation route / validation / contrôleur / service, responsabilité unique, dépendances externes injectées pour être simulées en test, idempotence des opérations financières, machines à états explicites, montants en centimes entiers.
- Ressources : documentations Stripe et Prisma, référentiel PAR-Q, recommandations CNIL/RGPD, guides OWASP.

### 3. Avec qui avez-vous travaillé ?

Implémentation réalisée seul. Alexandre YVON, tuteur en entreprise, a arbitré les règles de gestion chiffrées (commission, paliers de remboursement, quotas) qui relèvent du métier et non de la technique, et validé les conditions d'annulation présentées aux utilisateurs.

### 4. Contexte

| | |
|---|---|
| Nom de l'entreprise, organisme ou association | [Nom de l'entreprise d'accueil] — projet Goupyl Sport |
| Chantier, atelier, service | Développement back-end — API REST métier |
| Période d'exercice | Du mars 2026 au août 2026 |

### 5. Informations complémentaires

Le projet gérait au départ deux parcours de réservation distincts, et un salarié hors quota se retrouvait bloqué alors qu'il acceptait de payer. J'ai unifié le parcours : tout le monde réserve la prestation du coach, la prise en charge devenant un attribut calculé. La conception initiale était correcte techniquement mais mauvaise à l'usage.

---
---

## Exemple n° 3 — Contribuer à la gestion d'un projet informatique

### 1. Tâches ou opérations effectuées, et dans quelles conditions

Sur un projet mené par un développeur unique, la gestion consiste à rendre le travail traçable, priorisé et reprenable.

- Découpage et priorisation : sept lots fonctionnels, périmètre de version 1 assumé, et documentation explicite de ce qui en est exclu et pourquoi.
- Versionnage : branches thématiques fusionnées par pull request, 95 commits préfixés par nature (`feat:`, `fix:`, `docs:`). L'historique sert de journal de bord.
- Intégration continue : workflow GitHub Actions rejouant à chaque poussée les tests unitaires et d'API avec couverture, les tests d'intégration sur une base PostgreSQL éphémère et les tests navigateur. Un échec bloque la fusion.
- Traitement des incidents de production : six incidents documentés en *symptôme → investigation → cause racine → correctif → prévention*, dont une perte répétée des données de production causée par un script de réinitialisation placé dans la commande de démarrage de l'hébergeur.
- Suivi des anomalies : les cinq anomalies révélées par la recette n'ont pas été corrigées à chaud à l'approche de la livraison, mais figées par des tests de caractérisation qui deviendront rouges dès l'application du correctif.
- Documentation : README d'exploitation, dossier projet, note de stack technique, stratégie de tests, cahier de recette et fichier de conventions internes — objectif explicite : qu'un développeur reprenne le projet sans moi.
- Environnements et livraisons : trois bases distinctes, déploiement continu vers deux hébergeurs, checklist de variables par environnement.
- Points d'avancement réguliers avec le tuteur en entreprise.

### 2. Moyens utilisés

- Gestion de version : Git, GitHub (branches, pull requests), conventions de messages de commit.
- Intégration continue : GitHub Actions — trois jobs, services conteneurisés PostgreSQL 16, rapports de couverture publiés en artefacts.
- Documentation : Markdown versionné dans le dépôt, diagrammes d'architecture et de flux.
- Suivi qualité : cahier de recette formalisé, tableau des anomalies avec criticité et statut, tests de caractérisation.
- Exploitation : journaux et tableaux de bord Render et Netlify pour le diagnostic en production.
- Méthodes : développement itératif et incrémental, livraisons continues, revue avant fusion, post-mortems d'incidents.

### 3. Avec qui avez-vous travaillé ?

Alexandre YVON, tuteur en entreprise : arbitrage du périmètre, points d'avancement, validation des incréments livrés. Des utilisateurs testeurs ont alimenté le journal des anomalies et réordonné certaines priorités.

### 4. Contexte

| | |
|---|---|
| Nom de l'entreprise, organisme ou association | [Nom de l'entreprise d'accueil] — projet Goupyl Sport |
| Chantier, atelier, service | Pilotage du projet — versionnage, intégration continue, documentation, recette |
| Période d'exercice | Du mars 2026 au août 2026 |

### 5. Informations complémentaires

L'incident le plus formateur relevait de la gestion, non du code : la commande de démarrage de l'hébergeur contenait un script de réinitialisation de la base et se ré-exécutait à chaque réveil de veille, effaçant les données plusieurs fois par jour. Leçon : ne jamais placer d'opération destructive sur un chemin d'exécution automatique.

---
---

# ACTIVITÉ-TYPE 2 — Concevoir et développer une application sécurisée en couches

## Exemple n° 1 — Analyser les besoins et maquetter une application

### 1. Tâches ou opérations effectuées, et dans quelles conditions

J'ai conduit le cadrage du projet avant tout développement.

Analyse. Le besoin est un problème de rencontre entre trois acteurs : des entreprises voulant proposer du sport à leurs salariés sans savoir sourcer des intervenants fiables, des coachs indépendants cherchant des clients réguliers, des particuliers voulant réserver aussi simplement qu'un rendez-vous médical. J'ai formalisé :

- Quatre acteurs et leurs cas d'usage. Décision d'analyse importante : *salarié* n'est pas un rôle mais un attribut de rattachement d'un client à son employeur, ce qui maintient un contrôle d'accès simple.
- Neuf exigences fonctionnelles : inscription différenciée, réservation par créneaux, questionnaire médical préalable, trois flux de paiement, prise en charge entreprise par quota, annulation dégressive, preuve de présence contestable, vérification des coachs, espace de gestion entreprise.
- Les exigences non fonctionnelles, aussi structurantes : conformité RGPD (les réponses médicales sont des données de santé, art. 9), coût d'infrastructure minimal, aucune dépendance à un disque local, maintenabilité par un développeur seul.
- Le modèle économique et ses conséquences directes : abonnement par collaborateur, commission de 30 % sur les séances, vente de produits — chaque source de revenus impose un flux de paiement différent.

Maquettage sous Figma : arborescence par rôle et parcours utilisateurs, écrans clés (recherche, fiche coach, grille de créneaux, questionnaire, paiement, tableaux de bord), déclinaisons mobile et desktop, et définition du système visuel devenu les primitives d'interface du code. Les maquettes ont été validées avant développement ; le questionnaire d'onboarding a notamment été rendu facultatif, un formulaire obligatoire à l'inscription étant un frein à la conversion.

### 2. Moyens utilisés

- Maquettage : Figma — wireframes basse-fidélité, puis maquettes haute-fidélité avec composants, variantes et déclinaisons responsive.
- Formalisation : description des acteurs et cas d'usage, exigences fonctionnelles et non fonctionnelles, règles de gestion chiffrées (quotas, commission, paliers de remboursement, durées de validité), diagrammes de parcours.
- Documentation : Markdown versionné avec le code, schémas d'architecture intégrés au dépôt.
- Références : questionnaire PAR-Q, RGPD art. 9 et recommandations CNIL, analyse ergonomique de plateformes de réservation existantes, documentation Stripe pour valider dès l'analyse la faisabilité des trois flux.

### 3. Avec qui avez-vous travaillé ?

Alexandre YVON, tuteur en entreprise : expression du besoin, validation du modèle économique et des règles de gestion, revue des maquettes. Des utilisateurs cibles (coachs, salariés) ont été consultés sur les parcours.

### 4. Contexte

| | |
|---|---|
| Nom de l'entreprise, organisme ou association | [Nom de l'entreprise d'accueil] — projet Goupyl Sport |
| Chantier, atelier, service | Analyse fonctionnelle et maquettage — phase de cadrage |
| Période d'exercice | Du mars 2026 au août 2026 |

### 5. Informations complémentaires

Certaines exigences non fonctionnelles décident de l'architecture plus sûrement que les exigences fonctionnelles : l'hébergement retenu offrant un système de fichiers éphémère, tous les fichiers téléversés ont dû être stockés en base. Une contrainte budgétaire s'est ainsi transformée en décision de conception structurante.

---
---

## Exemple n° 2 — Définir l'architecture logicielle d'une application

### 1. Tâches ou opérations effectuées, et dans quelles conditions

J'ai défini seul l'architecture de la plateforme et justifié chaque brique par écrit. Architecture retenue : application monopage + API REST, front statique servi par CDN, API Node.js/Express, PostgreSQL, Redis, Stripe et service d'emails.

Décisions structurantes que j'ai prises :

- Proxy côté hébergeur : le front n'appelle jamais directement le domaine du back, qui est réécrit derrière `/api`. Le navigateur ne voit qu'un seul domaine, ce qui élimine toute la problématique CORS, en développement comme en production.
- Chaîne de responsabilités en couches, identique pour les 16 domaines : en-têtes de sécurité → limitation de débit → authentification → contrôle d'accès par rôle → validation → contrôleur → service → gestionnaire d'erreurs centralisé. La logique métier est exclusivement dans les services, donc testable en isolant les dépendances.
- L'ordre des intergiciels comme contrainte de sécurité : la route de webhook Stripe reçoit le corps brut avant le parseur JSON global, sans quoi la signature du prestataire serait invérifiable.
- Aucun fichier sur disque : le système de fichiers de l'hébergeur étant effacé à chaque redémarrage, les fichiers téléversés sont stockés en base et servis par des routes contrôlées. Compromis assumé et documenté comme dette.
- Contrat d'erreur unifié : un code d'erreur machine dans chaque réponse, interprété par le front ; hors développement, le détail est masqué et le diagnostic passe par les journaux.
- Sécurité en défense en profondeur : HTTPS, en-têtes durcis, validation systématique, requêtes paramétrées, bcrypt, jetons courts et rafraîchissement révocable, limitation de débit durcie sur l'authentification, contrôle d'accès par rôle doublé d'une vérification de propriété dans les services, rôle issu du jeton signé et jamais du corps de requête, chiffrement des données de santé, conformité PCI déléguée à Stripe.
- Séquence de démarrage : ouverture des connexions base et cache avant d'accepter des requêtes, correctif d'un incident réel de délais dépassés au réveil de l'instance.

### 2. Moyens utilisés

- Technologies : Node.js 22, Express 5, React 19, Vite, PostgreSQL, Redis, Prisma, Tailwind CSS.
- Services tiers : Stripe (Checkout, Payment Intents, Connect, webhooks signés), Resend, Netlify, Render.
- Formalisation : schémas d'architecture et de flux de requête, tableaux de décision technologique avec alternatives écartées, matrice de sécurité couche / mesure / menace.
- Documentation produite : note de stack technique justifiant chaque brique, section architecture du dossier projet, fichier de conventions d'implémentation.
- Références : documentations Express, Prisma et Stripe, recommandations OWASP, principes de séparation des responsabilités.

### 3. Avec qui avez-vous travaillé ?

Architecture définie en autonomie. Alexandre YVON, tuteur en entreprise : validation des choix au regard des coûts d'exploitation et de la reprise ultérieure du projet, et arbitrage des alternatives écartées (stockage objet dès la V1).

### 4. Contexte

| | |
|---|---|
| Nom de l'entreprise, organisme ou association | [Nom de l'entreprise d'accueil] — projet Goupyl Sport |
| Chantier, atelier, service | Architecture logicielle et technique |
| Période d'exercice | Du mars 2026 au août 2026 |

### 5. Informations complémentaires

Un choix s'est retourné contre le projet : plusieurs modules étaient conçus pour dégrader silencieusement si la configuration était incomplète. En production, faute de variables d'environnement, les utilisateurs étaient déconnectés et les emails ne partaient pas, sans aucune erreur au démarrage. La dégradation gracieuse exige des journaux de démarrage explicites.

---
---

## Exemple n° 3 — Concevoir et mettre en place une base de données relationnelle

### 1. Tâches ou opérations effectuées, et dans quelles conditions

J'ai conçu et mis en place le modèle de données complet : 18 modèles PostgreSQL décrits dans un schéma versionné avec le code.

Conception. Le relationnel s'imposait : une réservation lie un client, un coach, une prestation, un paiement, un avis et un compte-rendu, avec de l'argent en jeu. Le modèle s'organise autour de deux pivots — `User`, table unique pour les quatre rôles avec une relation réflexive reliant un salarié à son entreprise (j'ai écarté une table `Company` séparée : l'entreprise *est* un utilisateur), et `Appointment`, cœur métier relié en 1:1 au paiement, à l'avis et au compte-rendu.

Décisions que je sais défendre :

- Montants en centimes entiers, jamais en flottants : les arrondis binaires sont inacceptables sur de l'argent.
- Statuts en types énumérés : l'intégrité est garantie par la base, pas seulement par le code.
- Suppression logique des prestations et produits : l'historique des réservations ne casse jamais.
- Contraintes d'unicité métier (un avis par rendez-vous, jeton QR unique, code entreprise unique) et journal d'audit des changements de statut.

Mise en place : rédaction du schéma, synchronisation vers la base, index et contraintes ; script de peuplement d'un jeu de démonstration cohérent, dans lequel j'ai dû traiter l'ordre de suppression imposé par les clés étrangères ; trois bases distinctes (développement, intégration, recette) avec un garde-fou refusant l'exécution si l'URL ne désigne pas une base de test ; 82 tests d'intégration sur base réelle vérifiant contraintes, clés étrangères et transactions.

### 2. Moyens utilisés

- SGBD : PostgreSQL 16 — local, managé en production, conteneurisé en intégration continue.
- Modélisation et accès : Prisma (schéma déclaratif, client généré), Prisma Studio, `psql`.
- Types et contraintes : types énumérés, `Decimal(10,2)`, `bytea`, entiers pour les montants, unicités simples et composées, clés étrangères avec comportements de suppression explicites, index de recherche.
- Tests : Jest en mode séquentiel sur base réelle, jeux de données isolés.
- Méthodes : modélisation conceptuelle puis logique, normalisation, suppression logique, journalisation d'audit, schéma versionné comme source de vérité unique.

### 3. Avec qui avez-vous travaillé ?

Modélisation et implémentation en autonomie. Alexandre YVON, tuteur en entreprise : validation des règles de gestion à traduire en contraintes de base (unicité d'un avis par séance, quotas, statuts possibles d'un rendez-vous).

### 4. Contexte

| | |
|---|---|
| Nom de l'entreprise, organisme ou association | [Nom de l'entreprise d'accueil] — projet Goupyl Sport |
| Chantier, atelier, service | Conception et mise en place de la base de données |
| Période d'exercice | Du mars 2026 au août 2026 |

### 5. Informations complémentaires

Un défaut réel illustre la limite d'un ORM : un filtre écrit « statut ≠ *résolu* » excluait aussi les lignes NULL — donc l'immense majorité —, faussant tout le décompte des quotas. En SQL, toute comparaison avec NULL est indéterminée : le cas est corrigé et figé par un test d'intégration sur base réelle.

---
---

## Exemple n° 4 — Développer des composants d'accès aux données SQL et NoSQL

### 1. Tâches ou opérations effectuées, et dans quelles conditions

J'ai développé la couche d'accès aux données, répartie sur deux magasins de nature différente, chacun choisi pour ce qu'il sait faire.

SQL — PostgreSQL via Prisma, encapsulé dans les services (jamais d'accès depuis un contrôleur) :

- Requêtes relationnelles avec chargement des relations et sélection explicite des champs, pour ne jamais exposer un mot de passe haché ou une donnée inutile.
- Requêtes de plage et détection de chevauchement de créneaux.
- Créations imbriquées et transactions pour les opérations financières.
- Opérations idempotentes : la confirmation d'une commande passe par une mise à jour conditionnelle, sûre même si le webhook et le retour de l'utilisateur arrivent tous les deux.
- Agrégations pour les statistiques d'entreprise, les gains d'un coach ventilés en trois catégories et les notes moyennes.
- Traitement explicite des valeurs nulles dans les négations, et lecture/écriture des fichiers en colonnes binaires avec le bon type MIME et une politique de cache adaptée.

NoSQL — Redis, pour tout ce qui est éphémère et à durée de vie déterminée, qu'une table gère mal : jetons de rafraîchissement (7 jours) — ce qui rend les sessions révocables, alors qu'un jeton signé seul ne l'est pas —, challenges d'authentification sans mot de passe (5 minutes), jetons de vérification d'email (24 h) et compteurs de limitation de débit. Un échec d'écriture du cache est capturé sans faire échouer la connexion de l'utilisateur.

Toutes ces dépendances sont simulées dans les tests unitaires, avec réinitialisation explicite avant chaque test ; ce qu'un double ne peut pas garantir est couvert par les tests d'intégration.

### 2. Moyens utilisés

- SQL : PostgreSQL 16, Prisma — requêtes paramétrées par construction, donc immunité à l'injection SQL —, filtres composés, agrégations, mises à jour conditionnelles, transactions, types `Decimal` et `bytea`.
- NoSQL : Redis, client ioredis (écriture avec expiration, lecture, suppression), conventions de nommage des clés par espace fonctionnel.
- Environnement : JavaScript (CommonJS), Node.js 22 ; outillage Prisma Studio, `redis-cli`, Jest, Supertest.
- Méthodes : encapsulation des accès dans la couche service, sélection explicite des champs restitués, idempotence des opérations de paiement, choix du magasin selon la nature de la donnée, tolérance aux pannes du cache.

### 3. Avec qui avez-vous travaillé ?

Implémentation en autonomie, le partage des responsabilités entre base relationnelle et cache relevant d'un choix technique de ma part. Alexandre YVON, tuteur en entreprise : définition des indicateurs des tableaux de bord, qui a déterminé les agrégations à écrire.

### 4. Contexte

| | |
|---|---|
| Nom de l'entreprise, organisme ou association | [Nom de l'entreprise d'accueil] — projet Goupyl Sport |
| Chantier, atelier, service | Couche d'accès aux données — PostgreSQL/Prisma et Redis |
| Période d'exercice | Du mars 2026 au août 2026 |

### 5. Informations complémentaires

Le stockage des fichiers en colonnes binaires est le point le plus discutable, et je l'assume : une base relationnelle n'est pas un stockage objet. Il découle d'une contrainte d'hébergement et est documenté comme dette, avec sa voie de sortie — migration vers un stockage objet servi par CDN.

---
---

# ACTIVITÉ-TYPE 3 — Préparer le déploiement d'une application sécurisée

## Exemple n° 1 — Préparer et exécuter les plans de test d'une application

### 1. Tâches ou opérations effectuées, et dans quelles conditions

J'ai conçu et mis en œuvre la stratégie de tests du projet et la campagne de recette fonctionnelle.

Cinq niveaux, 1 236 tests automatisés : 593 tests unitaires (logique métier, infrastructure simulée), 333 tests d'API sur l'application réelle interrogée en HTTP, 82 tests d'intégration sur PostgreSQL réel, 169 tests de composants d'interface et 59 parcours navigateur. Chaque niveau attrape des défauts que les autres laissent passer : les unitaires cadrent les règles chiffrées et leurs cas aux bornes, les tests d'API valident le câblage authentification / droits / validation — la matrice des routes protégées croisée avec les quatre rôles est rejouée automatiquement —, l'intégration vérifie ce qu'un double ne peut garantir, et les tests navigateur voient ce qu'aucun test serveur ne voit.

- Définition du plan : périmètre et critères de chaque niveau, seuils de couverture appliqués automatiquement.
- Isolation des dépendances externes, le point le plus délicat : neutraliser les clés d'API réelles pour ne pas envoyer de vrais emails, contourner la limitation de débit qui faisait échouer toute suite lancée d'une seule machine, et réinitialiser les implémentations simulées entre les tests pour éviter qu'un échec programmé ne fuite.
- Bases de test dédiées avec garde-fou refusant l'exécution hors base de test.
- Cahier de recette : 128 scénarios en 13 chapitres (prérequis, étapes, résultat attendu, statut), dont 114 automatisés.
- Automatisation en intégration continue : les cinq niveaux rejoués à chaque poussée, un échec bloquant la fusion.
- Analyse des résultats : cinq anomalies révélées, dont une page légalement obligatoire non affichée. Aucune corrigée à chaud : chacune est figée par un test de caractérisation documentant le comportement actuel, qui deviendra rouge dès le correctif appliqué. Ce qui n'est pas couvert (charge, compatibilité étendue, accessibilité automatisée) est documenté comme tel.

### 2. Moyens utilisés

- Outils de test : Jest (unitaire, API, intégration), Supertest, Vitest + Testing Library, Playwright.
- Infrastructure : bases PostgreSQL dédiées, doubles de test pour la base, le cache, le prestataire de paiement et le service d'emails, jeu de recette reproductible par script.
- Intégration continue : GitHub Actions — services conteneurisés PostgreSQL 16, rapports de couverture publiés, seuils bloquants. Qualité statique : ESLint.
- Documents produits : plan et stratégie de tests, cahier de recette, journal des anomalies avec criticité et statut.
- Méthodes : pyramide de tests, valeurs limites, tests des chemins d'échec autant que des chemins nominaux, tests de caractérisation, non-régression systématique après incident.

### 3. Avec qui avez-vous travaillé ?

Alexandre YVON, tuteur en entreprise : validation des scénarios de recette et des critères d'acceptation, arbitrage sur le traitement des anomalies tardives. Des utilisateurs testeurs ont joué les 14 scénarios non automatisables.

### 4. Contexte

| | |
|---|---|
| Nom de l'entreprise, organisme ou association | [Nom de l'entreprise d'accueil] — projet Goupyl Sport |
| Chantier, atelier, service | Qualification et recette — plan de test, automatisation, intégration continue |
| Période d'exercice | Du mars 2026 au août 2026 |

### 5. Informations complémentaires

L'enseignement principal porte sur les anomalies découvertes tardivement. Plutôt que de corriger vite et sans filet à quelques jours de la livraison, j'ai figé chaque anomalie par un test décrivant le comportement réel. Le correctif reste à faire, mais il est cadré, testé d'avance et impossible à oublier.

---
---

# Titres, diplômes, CQP, attestations de formation *(facultatif)*

| Intitulé | Autorité ou organisme | Date |
|---|---|---|
| [À compléter] | [À compléter] | [À compléter] |

---

# Déclaration sur l'honneur

> Je soussigné(e) [prénom et nom], déclare sur l'honneur que les renseignements fournis dans ce dossier sont exacts et que je suis l'auteur(e) des réalisations jointes.
>
> Fait à [ville] le [date], pour faire valoir ce que de droit.
>
> Signature :

---

# Documents illustrant la pratique professionnelle *(facultatif)*

| Intitulé |
|---|
| Schéma d'architecture générale de la plateforme |
| Modèle de données — 18 entités PostgreSQL et leurs relations |
| Machine à états du cycle de vie d'un rendez-vous |
| Maquettes Figma — parcours de réservation (mobile et desktop) |
| Captures d'écran des interfaces des quatre rôles |
| Extrait de code — chiffrement AES-256-GCM des données de santé |
| Extrait de code — paiement Stripe Connect avec commission de plateforme |
| Rapport d'exécution de la suite de tests et rapport de couverture |
| Extrait du cahier de recette et fiches de post-mortem des incidents |

---

# Annexes *(si le règlement de certification le prévoit)*

- `docs/DOSSIER-PROJET.md` — dossier projet détaillé
- `docs/STACK-TECHNIQUE.md` — justification des choix technologiques
- `docs/STRATEGIE-TESTS.md` — stratégie de tests
- `docs/CAHIER-RECETTE.md` — cahier de recette (128 scénarios)
- `README.md` — installation, exploitation, déploiement
