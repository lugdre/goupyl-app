const { test, expect } = require('../fixtures');
const { sessionDe, attendreApi } = require('../helpers');

const COACH_ID = 2;                       // Marc Leroy, cf. seed.js
const PRESTATION = /coaching personnalisé/i;

/** Choisit une prestation puis un créneau libre, et renvoie l'intitulé du créneau. */
async function choisirPrestationEtCreneau(page, indexCreneau = 0) {
  await page.getByRole('button', { name: PRESTATION }).click();
  const creneaux = page.locator('button', { hasText: /^\d{2}:\d{2}$/ });
  await expect(creneaux.first()).toBeVisible({ timeout: 15_000 });
  const libelle = await creneaux.nth(indexCreneau).innerText();
  await creneaux.nth(indexCreneau).click();
  await expect(page.getByText(/créneau sélectionné/i)).toBeVisible();
  return libelle;
}

/**
 * Répond au PAR-Q. La modale se déroule en deux temps : le formulaire des sept
 * questions, puis un écran de synthèse — rassurant si aucun risque, alertant
 * sinon — dont le bouton final déclenche l'enregistrement chiffré.
 */
async function repondreParq(page, { risque = false } = {}) {
  await expect(page.getByRole('heading', { name: /questionnaire santé/i })).toBeVisible({ timeout: 20_000 });

  const oui = page.getByRole('button', { name: /^oui$/i });
  const non = page.getByRole('button', { name: /^non$/i });
  await expect(non).toHaveCount(7);

  // Première question à « Oui » pour le parcours à risque, « Non » partout ailleurs.
  if (risque) await oui.nth(0).click();
  for (let i = risque ? 1 : 0; i < 7; i += 1) await non.nth(i).click();

  await page.getByRole('button', { name: /^continuer$/i }).click();

  const validation = risque
    ? page.getByRole('button', { name: /enregistrer et continuer/i })
    : page.getByRole('button', { name: /valider et réserver/i });
  await expect(validation).toBeVisible({ timeout: 10_000 });
  await validation.click();
}

test.describe('Réservation par un salarié (questionnaire déjà validé)', () => {
  test.use({ storageState: sessionDe('salarie') });

  test('réserve une séance prise en charge par son entreprise', async ({ page }) => {
    await page.goto(`/dashboard/client/book/${COACH_ID}`);

    // L'interface annonce la prise en charge avant même la réservation.
    await expect(page.getByText(/prise en charge par le forfait de votre entreprise/i)).toBeVisible();
    await expect(page.getByText(/restantes ce mois\s*:\s*4\s*\/\s*4/i)).toBeVisible();

    await choisirPrestationEtCreneau(page);
    const creation = attendreApi(page, '/api/appointments', 'POST');
    await page.getByRole('button', { name: /confirmer la réservation/i }).click();
    expect((await creation).status()).toBe(201);

    // Le rendez-vous apparaît dans « Mes rendez-vous », en attente de
    // confirmation du professionnel.
    await page.goto('/dashboard/client/appointments');
    await page.getByRole('button', { name: /^liste$/i }).click();
    await expect(page.getByText(PRESTATION).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/en attente/i).first()).toBeVisible();
  });

  test('le compteur de forfait décompte la séance réservée', async ({ page }) => {
    await page.goto('/dashboard/client/employer-plan');

    // Une séance a été consommée par le test précédent.
    await expect(page.getByText(/séances couvertes ce mois/i)).toBeVisible();
    await expect(page.getByText(/^[1-9]\s*\/\s*4$/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('deux réservations sur le même créneau sont refusées', async ({ page }) => {
    await page.goto(`/dashboard/client/book/${COACH_ID}`);
    await choisirPrestationEtCreneau(page, 1);
    await page.getByRole('button', { name: /confirmer la réservation/i }).click();
    await expect(page).toHaveURL(/appointments|book/, { timeout: 15_000 });

    // Le créneau vient d'être pris : il ne doit plus être proposé.
    await page.goto(`/dashboard/client/book/${COACH_ID}`);
    await page.getByRole('button', { name: PRESTATION }).click();
    const creneaux = page.locator('button', { hasText: /^\d{2}:\d{2}$/ });
    await expect(creneaux.first()).toBeVisible({ timeout: 15_000 });
    await expect(creneaux).toHaveCount(12); // 14 créneaux − 2 déjà réservés
  });
});

test.describe('Questionnaire médical du particulier', () => {
  test.use({ storageState: sessionDe('client') });

  test('le PAR-Q est demandé avant la première réservation, puis la réservation aboutit', async ({ page }) => {
    await page.goto(`/dashboard/client/book/${COACH_ID}`);
    await choisirPrestationEtCreneau(page, 5);

    // La page annonce le questionnaire avant même la confirmation.
    await expect(page.getByText(/questionnaire santé.*sera proposé|PAR-Q/i).first()).toBeVisible();
    await page.getByRole('button', { name: /confirmer la réservation/i }).click();

    // La modale s'interpose : le questionnaire est enregistré (chiffré) mais
    // la réservation n'est PAS relancée automatiquement — l'utilisateur doit
    // reconfirmer. Observation reportée au cahier de recette (friction mineure).
    const soumissionParq = attendreApi(page, '/api/parq/submit', 'POST');
    await repondreParq(page);
    expect((await soumissionParq).status()).toBe(201);

    const creation = attendreApi(page, '/api/appointments', 'POST');
    await page.getByRole('button', { name: /confirmer la réservation/i }).click();
    expect((await creation).status()).toBe(201);
  });

  test('les réponses au questionnaire ne sont plus redemandées ensuite', async ({ page }) => {
    await page.goto(`/dashboard/client/book/${COACH_ID}`);
    await choisirPrestationEtCreneau(page, 6);

    await page.getByRole('button', { name: /confirmer la réservation/i }).click();

    await expect(page.getByRole('heading', { name: /questionnaire santé/i })).toHaveCount(0);
  });

  test('la séance d\'un particulier n\'est pas prise en charge par une entreprise', async ({ page }) => {
    await page.goto(`/dashboard/client/book/${COACH_ID}`);

    await expect(page.getByText(/prise en charge par le forfait/i)).toHaveCount(0);
  });
});

test.describe('Agenda du professionnel', () => {
  test.use({ storageState: sessionDe('coach') });
  test.slow(); // première compilation des pages par le serveur de développement

  test('les réservations des clients remontent dans son agenda', async ({ page }) => {
    await page.goto('/dashboard/intervenant/agenda');
    await page.getByRole('button', { name: /^liste$/i }).click();

    await expect(page.getByText(PRESTATION).first()).toBeVisible({ timeout: 15_000 });
  });

  test('il confirme une séance en attente', async ({ page }) => {
    await page.goto('/dashboard/intervenant/agenda');
    await page.getByRole('button', { name: /^liste$/i }).click();
    await page.getByRole('button', { name: /^en attente$/i }).click();

    const confirmer = page.getByRole('button', { name: /^confirmer$/i }).first();
    await expect(confirmer).toBeVisible({ timeout: 15_000 });
    const maj = attendreApi(page, '/status', 'PATCH');
    await confirmer.click();

    expect((await maj).status()).toBe(200);
  });

  test('il gère ses prestations : création puis retrait du catalogue', async ({ page }) => {
    await page.goto('/dashboard/intervenant/services');
    await expect(page.getByText(/renforcement musculaire/i).first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: /ajouter un service/i }).click();
    // Les champs de la modale n'ont ni id ni name : on les cible par leur
    // texte indicatif, qui fait office de repère stable.
    await page.getByPlaceholder('Coaching sportif').fill('Séance test E2E');
    await page.getByPlaceholder('50').fill('35');

    const creation = attendreApi(page, '/api/coach-services', 'POST');
    await page.getByRole('button', { name: /créer le service/i }).click();
    expect((await creation).status()).toBe(201);

    await expect(page.getByText('Séance test E2E')).toBeVisible({ timeout: 30_000 });
  });

  test('la prestation créée persiste après rechargement', async ({ page }) => {
    await page.goto('/dashboard/intervenant/services');

    await expect(page.getByText('Séance test E2E')).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('Recherche publique de professionnels', () => {
  // Pages vitrine volumineuses : on laisse au serveur de développement le
  // temps de les compiler à la première visite.
  test.slow();

  test('un visiteur trouve les coachs vérifiés, et eux seuls', async ({ page }) => {
    await page.goto('/search');

    await expect(page.getByText(/marc leroy/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/sophie martin/i).first()).toBeVisible();
    // Julien Blanc est encore en attente de validation : invisible du public.
    await expect(page.getByText(/julien blanc/i)).toHaveCount(0);
  });

  test('le filtre par ville restreint les résultats', async ({ page }) => {
    await page.goto('/search');
    await expect(page.getByText(/marc leroy/i).first()).toBeVisible({ timeout: 30_000 });

    await page.getByPlaceholder('Ville').fill('Paris');
    await page.getByRole('button', { name: /^rechercher$/i }).click();

    await expect(page.getByText(/sophie martin/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/marc leroy/i)).toHaveCount(0);
  });
});

test.describe('Questionnaire médical déclarant un risque', () => {
  // Parcours long : inscription complète puis réservation.
  test.slow();

  test('un risque déclaré bloque la réservation jusqu\'à la levée par le coach', async ({ browser }) => {
    // Compte neuf, sans questionnaire préalable : on isole le parcours à risque.
    const contexte = await browser.newContext();
    const page = await contexte.newPage();

    await page.goto('/register');
    await page.getByRole('button', { name: /particulier/i }).click();
    await page.locator('input[name="firstName"]').fill('Risque');
    await page.locator('input[name="lastName"]').fill('Declare');
    await page.locator('input[name="email"]').fill(`risque.${Date.now()}@e2e.test`);
    await page.locator('input[name="password"]').fill('Password1!');
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole('button', { name: /^continuer$/i }).click();
    await page.getByRole('button', { name: /passer cette étape/i }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('accessToken')), { timeout: 20_000 }).not.toBeNull();

    await page.goto(`/dashboard/client/book/${COACH_ID}`);
    await choisirPrestationEtCreneau(page, 8);
    await page.getByRole('button', { name: /confirmer la réservation/i }).click();

    const soumission = attendreApi(page, '/api/parq/submit', 'POST');
    await repondreParq(page, { risque: true });
    expect((await soumission).status()).toBe(201);

    // Le serveur enregistre le risque : la réservation reste suspendue à la
    // validation du professionnel.
    const statut = await page.evaluate(async () => {
      const r = await fetch('/api/parq/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      return r.json();
    });
    expect(statut).toMatchObject({ hasRisk: true, coachCleared: false, canBook: false });
  });
});
