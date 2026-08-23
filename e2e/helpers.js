const { expect } = require('@playwright/test');

const PASSWORD = 'Password1!';

const COMPTES = {
  admin:        { email: 'admin@e2e.test',         nom: 'Alice Admin' },
  coach:        { email: 'coach@e2e.test',         nom: 'Marc Leroy' },
  coach2:       { email: 'coach2@e2e.test',        nom: 'Sophie Martin' },
  coachPending: { email: 'coach-pending@e2e.test', nom: 'Julien Blanc' },
  entreprise:   { email: 'rh@e2e.test',            nom: 'ACME Corp' },
  client:       { email: 'client@e2e.test',        nom: 'Sarah Benali' },
  salarie:      { email: 'salarie@e2e.test',       nom: 'Marvin Dupont' },
};

// La page de connexion propose deux boutons commençant par « Se connecter »
// (mot de passe et passkey) : l'ancre exacte évite l'ambiguïté.
const BOUTON_CONNEXION = /^se connecter$/i;

/** Connexion par le formulaire réel, jusqu'à l'arrivée sur le tableau de bord. */
async function seConnecter(page, compte) {
  const { email } = COMPTES[compte] ?? compte;
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: BOUTON_CONNEXION }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
}

/** Navigation par le menu latéral, comme le ferait l'utilisateur. */
async function allerDansLeMenu(page, libelle) {
  await page.getByRole('link', { name: libelle }).first().click();
}

/** Attend qu'une requête API donnée ait répondu (évite les attentes arbitraires). */
function attendreApi(page, fragmentUrl, methode = 'GET') {
  return page.waitForResponse(
    (r) => r.url().includes(fragmentUrl) && r.request().method() === methode,
    { timeout: 20_000 }
  );
}

module.exports = { PASSWORD, COMPTES, BOUTON_CONNEXION, seConnecter, allerDansLeMenu, attendreApi };

const path = require('path');

/**
 * Chemin de la session pré-authentifiée d'un rôle, à passer à `test.use` :
 *   test.use({ storageState: sessionDe('coach') });
 *
 * Ces sessions sont fabriquées une fois pour toutes par global-setup.js, ce
 * qui évite de repasser par le formulaire de connexion — et donc de heurter
 * le plafond de 10 connexions par minute et par IP.
 */
module.exports.sessionDe = (alias) => path.resolve(__dirname, '.auth', `${alias}.json`);
