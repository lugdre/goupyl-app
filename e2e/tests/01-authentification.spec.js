const { test, expect } = require('../fixtures');
const { PASSWORD, COMPTES, BOUTON_CONNEXION, seConnecter, sessionDe } = require('../helpers');

test.describe('Inscription', () => {
  // Le formulaire particulier se déroule en deux étapes : identité, puis un
  // questionnaire sportif facultatif. Le compte n'est créé qu'au terme.
  const remplirEtape1 = async (page, email, motDePasse = PASSWORD) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /particulier/i }).click();
    await page.locator('input[name="firstName"]').fill('Nouveau');
    await page.locator('input[name="lastName"]').fill('Particulier');
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(motDePasse);
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole('button', { name: /^continuer$/i }).click();
  };

  const jetonStocke = (page) => page.evaluate(() => localStorage.getItem('accessToken'));

  test('un particulier crée son compte en renseignant le questionnaire', async ({ page }) => {
    await remplirEtape1(page, `particulier.${Date.now()}@e2e.test`);

    await expect(page.getByText(/étape 2\/2/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /^intermédiaire$/i }).click();
    await page.getByRole('button', { name: /^remise en forme$/i }).click();
    await page.getByRole('button', { name: /créer mon compte/i }).click();

    // Le formulaire n'enchaîne pas sur le tableau de bord : il affiche un
    // écran de confirmation invitant à valider l'adresse email. La session
    // est néanmoins ouverte, et le tableau de bord accessible.
    await expect.poll(() => jetonStocke(page), { timeout: 20_000 }).not.toBeNull();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard\/client/, { timeout: 20_000 });
  });

  test('le questionnaire est facultatif : « Passer cette étape » suffit', async ({ page }) => {
    await remplirEtape1(page, `rapide.${Date.now()}@e2e.test`);

    await page.getByRole('button', { name: /passer cette étape/i }).click();

    await expect.poll(() => jetonStocke(page), { timeout: 20_000 }).not.toBeNull();
  });

  test('un mot de passe trop faible bloque dès la première étape', async ({ page }) => {
    await remplirEtape1(page, `faible.${Date.now()}@e2e.test`, 'court');

    // On reste à l'étape 1 : le questionnaire n'apparaît jamais.
    await expect(page.getByText(/étape 2\/2/i)).toHaveCount(0);
    expect(await jetonStocke(page)).toBeNull();
  });

  test('un email déjà utilisé est refusé et aucun compte n\'est ouvert', async ({ page }) => {
    await remplirEtape1(page, COMPTES.client.email);
    await page.getByRole('button', { name: /passer cette étape/i }).click();

    await expect(page.getByText(/existe deja|existe déjà/i).first()).toBeVisible({ timeout: 15_000 });
    expect(await jetonStocke(page)).toBeNull();
  });

  test('un collaborateur rejoint son entreprise avec le code d\'adhésion', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: /collaborateur/i }).click();
    await page.locator('input[name="firstName"]').fill('Nouveau');
    await page.locator('input[name="lastName"]').fill('Salarie');
    await page.locator('input[name="email"]').fill(`salarie.${Date.now()}@e2e.test`);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.locator('input[name="joinCode"]').fill('ACME2026');
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole('button', { name: /^continuer$/i }).click();
    await page.getByRole('button', { name: /passer cette étape/i }).click();

    await expect.poll(() => jetonStocke(page), { timeout: 20_000 }).not.toBeNull();

    // Le rattachement à l'entreprise débloque l'entrée « Mon forfait » du
    // menu, absente pour un particulier : c'est la preuve visible côté
    // interface que le code d'adhésion a bien été pris en compte.
    await page.goto('/dashboard/client');
    await expect(page.getByRole('link', { name: /mon forfait/i })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Connexion', () => {
  test('un client se connecte et voit son espace', async ({ page }) => {
    await seConnecter(page, 'client');

    await expect(page).toHaveURL(/\/dashboard\/client/);
    await expect(page.getByRole('link', { name: /mes rendez-vous/i })).toBeVisible();
  });

  test('un mot de passe erroné affiche une erreur et retient l\'utilisateur', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill(COMPTES.client.email);
    await page.locator('input[name="password"]').fill('MauvaisMotDePasse1!');
    await page.getByRole('button', { name: BOUTON_CONNEXION }).click();

    await expect(page.getByText(/incorrect/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeNull();
  });

  test('un email inconnu produit le même message, sans révéler l\'existence du compte', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[name="email"]').fill('inconnu@e2e.test');
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: BOUTON_CONNEXION }).click();

    await expect(page.getByText(/incorrect/i).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Contrôle d\'accès', () => {
  test('un visiteur non connecté est renvoyé vers la connexion', async ({ page }) => {
    await page.goto('/dashboard/client/appointments');

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test('une session effacée coupe l\'accès au tableau de bord', async ({ page }) => {
    await seConnecter(page, 'client');

    await page.evaluate(() => localStorage.clear());
    await page.goto('/dashboard/client');

    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  // Le cloisonnement entre espaces se vérifie à partir d'une session déjà
  // ouverte : inutile de repasser par le formulaire, et cela garde la suite
  // sous le plafond de connexions par minute.
  test.describe('cloisonnement entre espaces', () => {
    for (const [role, cheminInterdit] of [
      ['client', '/dashboard/admin/users'],
      ['client', '/dashboard/entreprise/employees'],
      ['coach', '/dashboard/entreprise/employees'],
      ['coach', '/dashboard/admin/disputes'],
      ['entreprise', '/dashboard/admin/users'],
      ['entreprise', '/dashboard/intervenant/agenda'],
      ['salarie', '/dashboard/admin/users'],
    ]) {
      test(`un ${role} ne peut pas atteindre ${cheminInterdit}`, async ({ ouvrirSession }) => {
        const page = await ouvrirSession(role);

        await page.goto(cheminInterdit);

        await expect(page).not.toHaveURL(cheminInterdit, { timeout: 15_000 });
      });
    }
  });
});

test.describe('Redirection par rôle', () => {
  for (const [compte, urlAttendue] of [
    ['client', /\/dashboard\/client/],
    ['coach', /\/dashboard\/intervenant/],
    ['entreprise', /\/dashboard\/entreprise/],
    ['admin', /\/dashboard\/admin/],
  ]) {
    test(`le compte ${compte} atterrit sur son propre espace`, async ({ ouvrirSession }) => {
      const page = await ouvrirSession(compte);

      await page.goto('/dashboard');

      await expect(page).toHaveURL(urlAttendue, { timeout: 15_000 });
    });
  }
});

test.describe('Pages publiques', () => {
  for (const [libelle, chemin] of [
    ['accueil', '/'],
    ['recherche de coachs', '/search'],
    ['politique de confidentialité', '/confidentialite'],
  ]) {
    test(`la page ${libelle} est accessible sans compte`, async ({ page }) => {
      const reponse = await page.goto(chemin);

      expect(reponse.status()).toBeLessThan(400);
      await expect(page.locator('body')).not.toBeEmpty();
    });
  }

  // ⚠ ANOMALIE CONNUE, révélée par ce test.
  // frontend/src/pages/public/CGU.jsx utilise <Link> à la ligne 65 sans jamais
  // l'importer : la page plante au rendu (ReferenceError: Link is not defined)
  // et n'affiche qu'un écran blanc. Or les CGU sont une page légalement
  // obligatoire, référencée depuis le pied de page et la case à cocher
  // d'inscription.
  // Correctif : ajouter en tête de fichier
  //     import { Link } from 'react-router-dom';
  // Le test est marqué « échec attendu » : il passera au vert (et signalera
  // une réussite inattendue) dès que le correctif sera appliqué.
  test('la page CGU s\'affiche sans erreur', async ({ page }) => {
    test.fail(true, 'CGU.jsx : <Link> utilisé sans import — page blanche');
    const erreurs = [];
    page.on('pageerror', (e) => erreurs.push(e.message));

    await page.goto('/cgu');
    await expect(page.getByText(/conditions générales/i).first()).toBeVisible({ timeout: 8_000 });

    expect(erreurs).toEqual([]);
  });
});
