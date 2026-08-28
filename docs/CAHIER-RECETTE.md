# Cahier de recette — Goupyl Sport

> Plan de validation fonctionnelle de la plateforme. Chaque scénario décrit un
> cas d'usage réel, ses prérequis, les étapes à dérouler et le résultat attendu.
>
> La colonne **Auto.** indique si le scénario est rejoué automatiquement :
> ✅ couvert par un test automatisé · 🔍 recette manuelle uniquement ·
> ⚠️ couvert par un test de **caractérisation** (le test fige une anomalie
> connue : il vaut donc constat, pas validation — voir §12).
>
> **Version** 1.0 · **Environnement de recette** : base `goupyl_sport_e2e`,
> API sur `localhost:3100`, interface sur `localhost:5199`
> (`cd e2e && npm run setup && npm test`).

---

## Jeu de données de recette

Créé par `e2e/seed.js`. Mot de passe commun : `Password1!`.

| Compte | Rôle | Particularité |
|---|---|---|
| `admin@e2e.test` | ADMIN | Alice Admin |
| `coach@e2e.test` | INTERVENANT | Marc Leroy — vérifié, 2 prestations, Stripe actif |
| `coach2@e2e.test` | INTERVENANT | Sophie Martin — vérifiée, aucune prestation |
| `coach-pending@e2e.test` | INTERVENANT | Julien Blanc — **en attente de validation**, dossier vide |
| `rh@e2e.test` | ENTREPRISE | ACME Corp — abonnement Essentiel actif, code `ACME2026` |
| `client@e2e.test` | CLIENT | Sarah Benali — particulière, **sans questionnaire PAR-Q** |
| `salarie@e2e.test` | CLIENT | Marvin Dupont — salarié ACME, **PAR-Q déjà validé** |

---

## 1. Inscription et authentification

| ID | Rôle | Prérequis | Étapes | Résultat attendu | Auto. | Résultat obtenu | OK/KO |
|---|---|---|---|---|:--:|---|:--:|
| AUT-01 | Visiteur | — | `/register` → « Particulier » → identité + mot de passe conforme → CGU cochées → Continuer → renseigner le questionnaire → Créer mon compte | Compte créé, session ouverte, écran de confirmation d'envoi d'email | ✅ | | |
| AUT-02 | Visiteur | — | Idem AUT-01 mais « Passer cette étape » | Compte créé sans profil sportif ; le questionnaire est bien facultatif | ✅ | | |
| AUT-03 | Visiteur | — | Saisir un mot de passe de 5 caractères → Continuer | Blocage à l'étape 1, règles de mot de passe affichées, aucun compte créé | ✅ | | |
| AUT-04 | Visiteur | Compte `client@e2e.test` existant | Reprendre cet email à l'inscription | Message « un compte existe déjà », retour à l'étape 1, aucun doublon en base | ✅ | | |
| AUT-05 | Visiteur | Code `ACME2026` | `/register` → « Collaborateur » → saisir le code → terminer | Compte rattaché à ACME Corp ; l'entrée « Mon forfait » apparaît dans le menu | ✅ | | |
| AUT-06 | Visiteur | — | « Collaborateur » avec un code inexistant | Refus explicite, aucun compte créé | ✅ | | |
| AUT-07 | Visiteur | — | S'inscrire comme « Professionnel » | Compte créé au statut **En attente**, bandeau de vérification affiché | 🔍 | | |
| AUT-08 | Visiteur | — | S'inscrire comme « Entreprise » avec un SIRET à 14 chiffres | Compte auto-vérifié, code d'adhésion unique attribué | ✅ | | |
| AUT-09 | Client | Compte existant | Se connecter avec les bons identifiants | Redirection vers `/dashboard/client` | ✅ | | |
| AUT-10 | Client | Compte existant | Se connecter avec un mot de passe erroné | Message « Email ou mot de passe incorrect », maintien sur `/login` | ✅ | | |
| AUT-11 | Visiteur | — | Se connecter avec un email inconnu | **Message identique** à AUT-10 (pas d'énumération de comptes) | ✅ | | |
| AUT-12 | Client | Compte désactivé par l'admin | Tenter de se connecter | Refus explicite « compte désactivé » | ✅ | | |
| AUT-13 | Client | Connecté | Se déconnecter, puis revenir sur `/dashboard` | Redirection vers `/login`, jeton de rafraîchissement révoqué | ✅ | | |
| AUT-14 | Visiteur | — | Ouvrir `/dashboard/client/appointments` sans être connecté | Redirection vers `/login` | ✅ | | |
| AUT-15 | Client | Session ouverte depuis > 15 min | Recharger une page du tableau de bord | Renouvellement transparent du jeton, aucune déconnexion visible | ✅ | | |
| AUT-16 | Visiteur | — | 11 tentatives de connexion en moins d'une minute | 429 « Trop de tentatives » à partir de la 11ᵉ | ✅ | | |
| AUT-17 | Client | Compte Google | « Continuer avec Google » | Compte créé ou rattaché, session ouverte | 🔍 | | |
| AUT-18 | Client | Passkey enregistrée | « Se connecter avec une passkey » | Session ouverte sans mot de passe | 🔍 | | |
| AUT-19 | Client | Email de vérification reçu | Cliquer le lien | Adresse marquée vérifiée | 🔍 | | |

---

## 2. Cloisonnement des accès

| ID | Rôle | Étapes | Résultat attendu | Auto. | Résultat obtenu | OK/KO |
|---|---|---|---|:--:|---|:--:|
| ACC-01 | Client | Ouvrir `/dashboard/admin/users` | Accès refusé, redirection hors de l'espace admin | ✅ | | |
| ACC-02 | Client | Ouvrir `/dashboard/entreprise/employees` | Accès refusé | ✅ | | |
| ACC-03 | Coach | Ouvrir `/dashboard/entreprise/employees` | Accès refusé | ✅ | | |
| ACC-04 | Coach | Ouvrir `/dashboard/admin/disputes` | Accès refusé | ✅ | | |
| ACC-05 | Entreprise | Ouvrir `/dashboard/intervenant/agenda` | Accès refusé | ✅ | | |
| ACC-06 | Client A | Tenter d'annuler le rendez-vous d'un client B (via l'API) | 403, rendez-vous inchangé | ✅ | | |
| ACC-07 | Coach A | Tenter de clôturer la séance d'un coach B | 403 | ✅ | | |
| ACC-08 | Coach A | Tenter de valider par QR la séance d'un coach B | 403, séance inchangée | ✅ | | |
| ACC-09 | Entreprise A | Consulter les collaborateurs — vérifier qu'aucun salarié d'une entreprise B n'apparaît | Liste restreinte au périmètre propre | ✅ | | |
| ACC-10 | Client | Envoyer un jeton signé avec un autre secret | 401 `INVALID_TOKEN` | ✅ | | |
| ACC-11 | Client | Envoyer un jeton expiré | 401 `TOKEN_EXPIRED` | ✅ | | |
| ACC-12 | Client | Présenter un *refresh token* comme jeton d'accès | 401 | ✅ | | |
| ACC-13 | Client | Envoyer `{"role":"ADMIN"}` dans le corps d'une requête | Ignoré : le rôle provient du jeton signé | ✅ | | |

---

## 3. Recherche et fiche professionnelle

| ID | Rôle | Étapes | Résultat attendu | Auto. | Résultat obtenu | OK/KO |
|---|---|---|---|:--:|---|:--:|
| RCH-01 | Visiteur | Ouvrir `/search` | Marc Leroy et Sophie Martin listés ; **Julien Blanc absent** (non validé) | ✅ | | |
| RCH-02 | Visiteur | Filtrer par ville « Paris » | Seule Sophie Martin reste affichée | ✅ | | |
| RCH-03 | Visiteur | Filtrer par lieu de séance « À domicile » | Seuls les coachs proposant ce lieu remontent | 🔍 | | |
| RCH-04 | Visiteur | Filtrer par tarif maximum | Seuls les coachs sous ce tarif remontent | ✅ | | |
| RCH-05 | Visiteur | Ouvrir la fiche publique d'un coach | Bio, spécialités, note moyenne, prestations et galerie photos | 🔍 | | |
| RCH-06 | Visiteur | Consulter l'agenda depuis la fiche publique | Créneaux occupés grisés, **aucune donnée personnelle** exposée | ✅ | | |

---

## 4. Réservation

| ID | Rôle | Prérequis | Étapes | Résultat attendu | Auto. | Résultat obtenu | OK/KO |
|---|---|---|---|---|:--:|---|:--:|
| RES-01 | Salarié | PAR-Q validé, quota disponible | Choisir un coach → une prestation → un créneau → Confirmer | Rendez-vous créé **En attente**, marqué pris en charge par l'entreprise | ✅ | | |
| RES-02 | Salarié | — | Vérifier le bandeau avant réservation | « Cette séance sera prise en charge par le forfait de votre entreprise · 4/4 restantes » | ✅ | | |
| RES-03 | Particulier | Aucun PAR-Q | Réserver → Confirmer | La modale PAR-Q s'interpose ; le questionnaire est enregistré chiffré | ✅ | | |
| RES-04 | Particulier | PAR-Q « Non » aux 7 questions | Reconfirmer après le questionnaire | Réservation créée | ✅ | | |
| RES-05 | Particulier | PAR-Q déjà rempli | Réserver une seconde séance | Le questionnaire **n'est plus demandé** | ✅ | | |
| RES-06 | Particulier | — | Répondre « Oui » à une question du PAR-Q | Écran d'alerte ; réservation suspendue à la levée de réserve par le coach (`canBook: false`) | ✅ | | |
| RES-07 | Client B | Créneau déjà pris chez le même coach | Tenter de réserver ce créneau | Créneau non proposé ; en forçant l'appel API : 409 `SLOT_CONFLICT` | ✅ | | |
| RES-08 | Client | Déjà un rendez-vous à cette heure | Réserver chez un autre coach au même moment | 409 `CLIENT_SLOT_CONFLICT` | ✅ | | |
| RES-09 | Client | — | Vérifier les créneaux proposés | De 07:00 à 20:00 inclus pour une séance d'une heure ; rien avant ni après | ✅ | | |
| RES-10 | Client | Prestation de 30 min | Ouvrir le sélecteur | Pas de 30 minutes, jusqu'à 20:30 | ✅ | | |
| RES-11 | Client | — | Réserver un créneau adjacent à un rendez-vous existant | Accepté : les bornes ne se chevauchent pas | ✅ | | |
| RES-12 | Client | Prestation désactivée par le coach | Tenter de la réserver | 404, prestation absente du catalogue public | ✅ | | |
| RES-13 | Salarié | Quota Essentiel épuisé (4 séances) | Réserver une 5ᵉ séance | **Réservation acceptée**, mais à la charge du salarié (non couverte) | ✅ | | |

---

## 5. Cycle de vie d'une séance

| ID | Rôle | Prérequis | Étapes | Résultat attendu | Auto. | Résultat obtenu | OK/KO |
|---|---|---|---|---|:--:|---|:--:|
| SEA-01 | Coach | Séance En attente | Agenda → Liste → Confirmer | Statut **Confirmé**, client notifié | ✅ | | |
| SEA-02 | Coach | Séance confirmée non payée, non couverte | Terminer la séance | Refus 400 `PAYMENT_REQUIRED` | ✅ | | |
| SEA-03 | Coach | Séance confirmée **couverte par l'entreprise** | Terminer la séance | Acceptée sans paiement | ✅ | | |
| SEA-04 | Coach | Séance confirmée et payée | Terminer la séance | Statut **Terminé**, présence marquée | ✅ | | |
| SEA-05 | Coach | Séance confirmée et payée | Saisir le code court à 8 caractères du QR | Séance terminée, présence marquée, validation par QR tracée | ✅ | | |
| SEA-06 | Coach | Séance d'un confrère | Scanner son QR | 403, séance inchangée | ✅ | | |
| SEA-07 | Coach | Séance dont l'heure est passée | « Client absent » | Statut Terminé / **Absent**, client notifié avec voie de contestation | ✅ | | |
| SEA-08 | Coach | Séance à venir | « Client absent » | Refus 400 `SESSION_NOT_STARTED` | ✅ | | |
| SEA-09 | Coach | Séance déjà terminée | Tenter de la reconfirmer | Refus `INVALID_STATUS_TRANSITION` | ✅ | | |
| SEA-10 | Client | Séance terminée | Déposer un avis noté 1 à 5 | Avis enregistré, note moyenne du coach mise à jour, coach notifié | ✅ | | |
| SEA-11 | Client | Séance non terminée | Tenter de déposer un avis | Refus 400 `NOT_DONE` | ✅ | | |
| SEA-12 | Client | Avis déjà déposé | En déposer un second | Refus 409 `REVIEW_EXISTS` | ✅ | | |
| SEA-13 | Coach | Avis reçu | Y répondre, puis modifier la réponse 3 fois | 4ᵉ modification refusée (`REPLY_EDIT_LIMIT`) | ✅ | | |
| SEA-14 | Coach | Séance terminée | Rédiger le compte-rendu | Enregistré, visible du client concerné seulement | ✅ | | |
| SEA-15 | Client | Séance non confirmée depuis 24 h | Attendre le balayage automatique | Séance annulée automatiquement, auteur « système » | ✅ | | |

---

## 6. Annulation et remboursement

| ID | Rôle | Prérequis | Étapes | Résultat attendu | Auto. | Résultat obtenu | OK/KO |
|---|---|---|---|---|:--:|---|:--:|
| ANN-01 | Client | Séance payée, dans **plus de 7 jours** | Annuler | Palier « Remboursement intégral (100 %) » annoncé puis appliqué ; séance sortie des gains du coach | ✅ | | |
| ANN-02 | Client | Séance payée, dans **48 h à 7 jours** | Annuler | 50 % remboursés ; coach conserve 35 %, plateforme 15 % | ✅ | | |
| ANN-03 | Client | Séance payée, dans **moins de 48 h** | Annuler | Annulation acceptée, **aucun remboursement** | ✅ | | |
| ANN-04 | Client | Séance non payée | Annuler | Message « annulation sans frais », aucun appel Stripe | ✅ | | |
| ANN-05 | Client | Séance déjà terminée | Tenter d'annuler | Refus 400 `INVALID_STATUS` | ✅ | | |
| ANN-06 | Client | Séance annulée | Vérifier l'agenda du coach | Le créneau est de nouveau réservable | ✅ | | |
| ANN-07 | Client | Stripe indisponible | Annuler une séance payée | Annulation effectuée malgré tout, erreur remontée pour traitement manuel | ✅ | | |
| ANN-08 | Client | Séance d'un autre client | Tenter de l'annuler | 403 | ✅ | | |

---

## 7. Litiges

| ID | Rôle | Prérequis | Étapes | Résultat attendu | Auto. | Résultat obtenu | OK/KO |
|---|---|---|---|---|:--:|---|:--:|
| LIT-01 | Client | Séance marquée Absent | Contester avec un motif de 10 à 500 caractères | Litige **Ouvert**, tous les administrateurs notifiés | ✅ | | |
| LIT-02 | Client | — | Contester avec un motif de 5 caractères | Refus de validation | ✅ | | |
| LIT-03 | Client | Séance marquée Présent | Tenter de contester | Refus `DISPUTE_NOT_ALLOWED` | ✅ | | |
| LIT-04 | Client | Litige déjà ouvert | En ouvrir un second | Refus 409 `DISPUTE_ALREADY_EXISTS` | ✅ | | |
| LIT-05 | Coach | Litige ouvert sur une de ses séances | Consulter « Paiements & gains » | Montant affiché comme **gelé**, exclu des gains disponibles | ✅ | | |
| LIT-06 | Admin | Litige ouvert | `/dashboard/admin/disputes` → Rejeter | Litige **Rejeté**, gains du coach débloqués, deux parties notifiées | ✅ | | |
| LIT-07 | Admin | Litige ouvert sur séance payée | Trancher en faveur du client | Remboursement Stripe intégral, séance marquée remboursée | ✅ | | |
| LIT-08 | Salarié | Litige gagné sur une séance couverte | Consulter « Mon forfait » | La séance est **restituée au quota** | ✅ | | |
| LIT-09 | Admin | Litige déjà tranché | Tenter de le trancher à nouveau | Refus `DISPUTE_NOT_OPEN` | ✅ | | |

---

## 8. Espace entreprise

| ID | Rôle | Étapes | Résultat attendu | Auto. | Résultat obtenu | OK/KO |
|---|---|---|---|:--:|---|:--:|
| ENT-01 | Entreprise | Ouvrir « Collaborateurs » | Code d'adhésion, effectif et liste des salariés rattachés | ✅ | | |
| ENT-02 | Entreprise | Inviter `nouveau@acme.fr` | Invitation créée (jeton 12 caractères, 7 jours), email envoyé, ligne ajoutée | ✅ | | |
| ENT-03 | Entreprise | Inviter une adresse mal formée | Refus, aucune invitation créée | ✅ | | |
| ENT-04 | Entreprise | Régénérer le code d'adhésion | Nouveau code ; l'ancien ne rattache plus personne | ✅ | | |
| ENT-05 | Entreprise | Détacher un collaborateur | Compte conservé, simplement détaché ; ses rendez-vous subsistent | ✅ | | |
| ENT-06 | Entreprise | Détacher le salarié d'une autre entreprise | Refus 404 | ✅ | | |
| ENT-07 | Entreprise | « Exporter CSV » | Fichier `collaborateurs-AAAA-MM.csv` : BOM UTF-8, séparateur `;`, une ligne par collaborateur | ✅ | | |
| ENT-08 | Entreprise | Ouvrir le CSV dans Excel FR | Accents corrects, colonnes correctement séparées | 🔍 | | |
| ENT-09 | Entreprise | Ouvrir « Abonnement » | Formule active, échéance, quota par collaborateur, tarifs des 3 formules | ✅ | | |
| ENT-10 | Entreprise | Souscrire la formule Boost | Redirection Stripe Checkout, quantité = nombre de collaborateurs | 🔍 | | |
| ENT-11 | Entreprise | Revenir du paiement Stripe | Abonnement activé une seule fois (webhook + retour de redirection) | 🔍 | | |
| ENT-12 | Entreprise | Ouvrir « Statistiques » | Effectif, collaborateurs actifs, séances du mois, taux d'utilisation | ✅ | | |
| ENT-13 | Salarié | Ouvrir « Mon forfait » | Entreprise, formule, quota consommé / total, échéance | ✅ | | |
| ENT-14 | Particulier | Chercher « Mon forfait » dans le menu | Entrée absente ; la page ne divulgue rien | ✅ | | |

---

## 9. Espace professionnel

| ID | Rôle | Étapes | Résultat attendu | Auto. | Résultat obtenu | OK/KO |
|---|---|---|---|:--:|---|:--:|
| PRO-01 | Coach | Créer une prestation (nom, durée, prix, catégorie) | Prestation créée et visible du public | ✅ | | |
| PRO-02 | Coach | Créer une prestation de 17 minutes | Refus : durées autorisées 15/30/45/60/90/120 | ✅ | | |
| PRO-03 | Coach | Modifier le prix d'une prestation | Nouveau prix pris en compte | ✅ | | |
| PRO-04 | Coach | Supprimer une prestation réservée par le passé | Retrait du catalogue public, historique des rendez-vous préservé | ✅ | | |
| PRO-05 | Coach A | Modifier la prestation d'un coach B | 403 | ✅ | | |
| PRO-06 | Coach | Téléverser pièce d'identité et diplôme | Documents enregistrés en base, statut En attente | 🔍 | | |
| PRO-07 | Coach | Téléverser un fichier de plus de 5 Mo ou un `.docx` | Refus explicite | 🔍 | | |
| PRO-08 | Coach | Ouvrir « Paiements & gains » | Gains acquis, en attente et gelés séparés | ✅ | | |
| PRO-09 | Coach | Configurer Stripe Connect | Redirection vers l'onboarding, statut mis à jour au retour | 🔍 | | |
| PRO-10 | Coach | Ajouter des photos à la galerie | Jusqu'à 12 photos ; la 13ᵉ est refusée | ✅ | | |
| PRO-11 | Coach | Ouvrir l'agenda en vue Semaine puis Liste | Rendez-vous affichés, filtrables par statut | ✅ | | |

---

## 10. Administration

| ID | Rôle | Étapes | Résultat attendu | Auto. | Résultat obtenu | OK/KO |
|---|---|---|---|:--:|---|:--:|
| ADM-01 | Admin | Ouvrir « Vérifications » | Seuls les professionnels en attente sont listés | ✅ | | |
| ADM-02 | Admin | Valider un professionnel au dossier vide | Refus 400 `INCOMPLETE_VERIFICATION_FILE` | ✅ | | |
| ADM-03 | Admin | Valider avec pièce d'identité **seule** | Refus : un diplôme est également requis | ✅ | | |
| ADM-04 | Admin | Valider avec pièce d'identité **et** diplôme | Professionnel vérifié, aussitôt visible dans la recherche publique | ✅ | | |
| ADM-05 | Admin | Rejeter un dossier avec un motif | Statut Rejeté, motif visible du professionnel | ✅ | | |
| ADM-06 | Admin | Prévisualiser un document téléversé | Document affiché en ligne, réservé aux administrateurs | 🔍 | | |
| ADM-07 | Admin | Ouvrir « Utilisateurs » | Effectif total, filtres par rôle opérationnels | ✅ | | |
| ADM-08 | Admin | Désactiver un compte | Compte désactivé ; l'utilisateur ne peut plus se connecter | ✅ | | |
| ADM-09 | Admin | Réactiver ce compte | Connexion de nouveau possible | ✅ | | |
| ADM-10 | Admin | Ouvrir « Litiges » | File des contestations, rappel du gel des virements | ✅ | | |
| ADM-11 | Admin | Ouvrir « Produits » | Catalogue administrable (création, modification, désactivation) | 🔍 | | |

---

## 11. Données personnelles et sécurité

| ID | Rôle | Étapes | Résultat attendu | Auto. | Résultat obtenu | OK/KO |
|---|---|---|---|:--:|---|:--:|
| RGP-01 | Client | Soumettre le PAR-Q puis inspecter la base | Réponses **chiffrées** (`iv:authTag:ciphertext`), aucun terme lisible | ✅ | | |
| RGP-02 | Client B | Tenter de lire le PAR-Q d'un client A | Aucune donnée médicale retournée | ✅ | | |
| RGP-03 | Entreprise | Chercher les réponses médicales de ses salariés | Aucune route ne les expose | ✅ | | |
| RGP-04 | Client | Supprimer son compte | Compte, profil, rendez-vous et avis effacés ; session révoquée ; les autres comptes intacts | ✅ | | |
| RGP-05 | Client | Vérifier les réponses API | Le hash de mot de passe n'apparaît nulle part | ✅ | | |
| RGP-06 | Visiteur | Provoquer une erreur serveur en production | Message générique « Erreur interne », aucune trace technique exposée | ✅ | | |
| RGP-07 | Visiteur | Inspecter les en-têtes HTTP | En-têtes Helmet présents, `X-Powered-By` masqué | ✅ | | |
| RGP-08 | Visiteur | Ouvrir `/confidentialite` | Politique de confidentialité accessible | ✅ | | |
| RGP-09 | Visiteur | Ouvrir `/cgu` | Conditions générales accessibles | ⚠️ | **KO — page blanche (anomalie n° 1)** | KO |

---

## 12. Anomalies ouvertes

Détectées pendant la campagne de tests, figées par des tests de
caractérisation. Voir [STRATEGIE-TESTS.md §6](STRATEGIE-TESTS.md) pour les
correctifs proposés.

| N° | Gravité | Scénario | Description |
|---|---|---|---|
| 1 | **Élevée** | RGP-09 | La page CGU plante au rendu (`<Link>` utilisé sans import) : écran blanc sur une page légalement obligatoire. |
| 2 | Moyenne | AUT-03, AUT-04 | 21 messages d'erreur français ne s'affichent pas : les validateurs emploient l'API Zod 3, ignorée par Zod 4. L'utilisateur voit des libellés anglais. |
| 3 | Moyenne | RES-09 | Une séance démarrant entre 23h00 et 23h59 échappe au contrôle « 07h–21h ». |
| 4 | Faible | — | Un corps JSON malformé produit un 500 au lieu d'un 400. |
| 5 | Faible | AUT-01 | Un email comportant un espace parasite est refusé au lieu d'être nettoyé. |

**Observation ergonomique (sans gravité)** — scénario RES-03 : après avoir
rempli le questionnaire PAR-Q, la réservation en cours n'est pas relancée
automatiquement ; l'utilisateur doit cliquer une seconde fois sur « Confirmer
la réservation ».

---

## 13. Synthèse de la campagne

| Domaine | Scénarios | Automatisés | Manuels |
|---|---:|---:|---:|
| Inscription et authentification | 19 | 15 | 4 |
| Cloisonnement des accès | 13 | 13 | 0 |
| Recherche | 6 | 4 | 2 |
| Réservation | 13 | 13 | 0 |
| Cycle de vie d'une séance | 15 | 15 | 0 |
| Annulation et remboursement | 8 | 8 | 0 |
| Litiges | 9 | 9 | 0 |
| Espace entreprise | 14 | 11 | 3 |
| Espace professionnel | 11 | 8 | 3 |
| Administration | 11 | 9 | 2 |
| Données personnelles et sécurité | 9 | 9 | 0 |
| **Total** | **128** | **114 (89 %)** | **14** |

Les 14 scénarios manuels portent sur des dépendances externes non
automatisables en l'état : paiements Stripe réels, envoi d'emails, passkeys,
téléversement de documents, lecture de QR par caméra.

---

**Date de recette** : ____________  **Testeur** : ____________  **Version** : ____________
