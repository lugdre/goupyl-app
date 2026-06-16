-- Harmonisation des paliers entreprise vers la nomenclature du brief :
-- ZEN -> ESSENTIEL, PULSE -> BOOST, BOOST -> ULTRA
-- Renommage des valeurs d'enum sans perte de données (PostgreSQL >= 10).
-- L'ordre évite la collision sur "BOOST" (déjà existant côté ancien palier haut).

-- SubscriptionPlan
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'BOOST_ENTREPRISE' TO 'ULTRA_ENTREPRISE';
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'PULSE_ENTREPRISE' TO 'BOOST_ENTREPRISE';
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'ZEN_ENTREPRISE' TO 'ESSENTIEL_ENTREPRISE';

-- ResourceAccess
ALTER TYPE "ResourceAccess" RENAME VALUE 'BOOST' TO 'ULTRA';
ALTER TYPE "ResourceAccess" RENAME VALUE 'PULSE' TO 'BOOST';
ALTER TYPE "ResourceAccess" RENAME VALUE 'ZEN' TO 'ESSENTIEL';

-- Nouvelle valeur par défaut de resources.access
ALTER TABLE "resources" ALTER COLUMN "access" SET DEFAULT 'ESSENTIEL';

-- Mise à jour des tokens stockés dans le champ JSON services.available_in_plans
-- (le renommage d'enum ne touche pas le contenu JSON). Même ordre anti-collision.
UPDATE "services"
SET "available_in_plans" = REPLACE(REPLACE(REPLACE(
      "available_in_plans"::text,
      'BOOST_ENTREPRISE', 'ULTRA_ENTREPRISE'),
      'PULSE_ENTREPRISE', 'BOOST_ENTREPRISE'),
      'ZEN_ENTREPRISE',   'ESSENTIEL_ENTREPRISE')::jsonb
WHERE "available_in_plans" IS NOT NULL;
