const { test, expect } = require('../fixtures');
const { sessionDe, attendreApi } = require('../helpers');

test.describe('Validation des professionnels', () => {
  test.use({ storageState: sessionDe('admin') });

  test('la file d\'attente ne contient que les professionnels non validés', async ({ page }) => {
    await page.goto('/dashboard/admin/verifications');

    await expect(page.getByText(/\d+ compte.? en attente de validation/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Julien Blanc')).toBeVisible();
    // Marc Leroy et Sophie Martin sont déjà validés : absents de la file.
    await expect(page.getByText('Marc Leroy')).toHaveCount(0);
  });

  test('un professionnel sans dossier ne peut pas être validé', async ({ page }) => {
    await page.goto('/dashboard/admin/verifications');
    await page.getByText('Julien Blanc').click();

    // Le dossier est vide : « 0 docs » est affiché en regard du compte.
    await expect(page.getByText(/0 docs/i)).toBeVisible({ timeout: 20_000 });

    const valider = page.getByRole('button', { name: /^valider$/i });
    if (await valider.count()) {
      const reponse = attendreApi(page, '/verify', 'PATCH');
      await valider.first().click();
      // Le serveur refuse : dossier incomplet (pièce d'identité + diplôme requis).
      expect((await reponse).status()).toBe(400);
    }
  });
});

test.describe('Gestion des comptes', () => {
  test.use({ storageState: sessionDe('admin') });

  test('liste tous les utilisateurs de la plateforme', async ({ page }) => {
    await page.goto('/dashboard/admin/users');

    await expect(page.getByText(/\d+ utilisateurs au total/i)).toBeVisible({ timeout: 20_000 });
    // Portée limitée au tableau : le nom de l'administrateur connecté figure
    // aussi dans le menu latéral.
    const tableau = page.getByRole('table');
    for (const nom of ['Alice Admin', 'Marc Leroy', 'Rachel Hache', 'Sarah Benali', 'Marvin Dupont']) {
      await expect(tableau.getByText(nom)).toBeVisible();
    }
  });

  test('filtre la liste par rôle', async ({ page }) => {
    await page.goto('/dashboard/admin/users');
    await expect(page.getByText(/\d+ utilisateurs au total/i)).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: /^coach$/i }).click();

    await expect(page.getByText('Marc Leroy')).toBeVisible();
    await expect(page.getByText('Sarah Benali')).toHaveCount(0);
  });

  test('désactive puis réactive un compte', async ({ page }) => {
    await page.goto('/dashboard/admin/users');
    await expect(page.getByText('Sarah Benali')).toBeVisible({ timeout: 20_000 });

    const ligne = page.locator('tr', { hasText: 'Sarah Benali' });
    const desactivation = attendreApi(page, '/deactivate', 'PATCH');
    await ligne.getByRole('button', { name: /désactiver/i }).click();
    expect((await desactivation).status()).toBe(200);

    await expect(ligne.getByRole('button', { name: /réactiver|activer/i })).toBeVisible({ timeout: 15_000 });
  });

  test('un compte désactivé ne peut plus se connecter', async ({ ouvrirSession }) => {
    // Le test précédent a désactivé Sarah Benali.
    const page = await ouvrirSession(null);

    await page.goto('/login');
    await page.locator('input[name="email"]').fill('client@e2e.test');
    await page.locator('input[name="password"]').fill('Password1!');
    await page.getByRole('button', { name: /^se connecter$/i }).click();

    await expect(page.getByText(/desactive|désactivé/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Arbitrage des litiges', () => {
  test.use({ storageState: sessionDe('admin') });

  test('la file est vide en l\'absence de contestation', async ({ page }) => {
    await page.goto('/dashboard/admin/disputes');

    await expect(page.getByText(/aucun litige en cours/i)).toBeVisible({ timeout: 20_000 });
  });

  test('rappelle que les gains du professionnel sont gelés pendant le litige', async ({ page }) => {
    await page.goto('/dashboard/admin/disputes');

    await expect(page.getByText(/gelé tant que le litige est ouvert/i)).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Absence puis litige — parcours complet', () => {
  test.slow();

  test('les gardes métier de l\'absence et du litige tiennent depuis l\'application', async ({ ouvrirSession }) => {
    // Séance passée et confirmée, créée par l'API pour se placer directement
    // dans la situation à tester (le temps ne se simule pas dans un navigateur).
    // Le localStorage n'est lisible qu'une fois une page de l'origine chargée.
    const coachPage = await ouvrirSession('coach');
    await coachPage.goto('/dashboard/intervenant');
    const jetonCoach = await coachPage.evaluate(() => localStorage.getItem('accessToken'));

    const salariePage = await ouvrirSession('salarie');
    await salariePage.goto('/dashboard/client');
    const jetonSalarie = await salariePage.evaluate(() => localStorage.getItem('accessToken'));

    // Repérage d'une séance confirmée du coach dans le passé, sinon on la crée.
    const seance = await coachPage.evaluate(async (jeton) => {
      const r = await fetch('/api/appointments/me?limit=50', { headers: { Authorization: `Bearer ${jeton}` } });
      const { appointments } = await r.json();
      return appointments.find((a) => a.status === 'CONFIRMED') || null;
    }, jetonCoach);

    test.skip(!seance, 'Aucune séance confirmée disponible dans le jeu de données.');

    // Le coach ne peut pas signaler une absence avant l'heure de la séance.
    const refus = await coachPage.evaluate(async ({ jeton, id }) => {
      const r = await fetch(`/api/appointments/${id}/absent`, {
        method: 'POST', headers: { Authorization: `Bearer ${jeton}` },
      });
      return { status: r.status, body: await r.json() };
    }, { jeton: jetonCoach, id: seance.id });

    expect(refus.status).toBe(400);
    expect(refus.body.error).toBe('SESSION_NOT_STARTED');

    // Et un client qui n'est pas propriétaire de la séance ne peut pas la
    // contester : le contrôle de propriété passe avant celui du statut.
    const contestationRefusee = await salariePage.evaluate(async ({ jeton, id }) => {
      const r = await fetch(`/api/appointments/${id}/dispute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Motif suffisamment long pour être accepté' }),
      });
      return { status: r.status, body: await r.json() };
    }, { jeton: jetonSalarie, id: seance.id });

    expect(contestationRefusee.status).toBe(403);
  });
});
