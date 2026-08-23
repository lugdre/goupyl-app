const { test, expect } = require('../fixtures');
const { sessionDe, attendreApi } = require('../helpers');

test.describe('Espace entreprise — collaborateurs', () => {
  test.use({ storageState: sessionDe('entreprise') });

  test('affiche le code d\'adhésion et les collaborateurs rattachés', async ({ page }) => {
    await page.goto('/dashboard/entreprise/employees');

    await expect(page.getByText('ACME2026')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/\d+ collaborateurs? rattachés?/i)).toBeVisible();
    await expect(page.getByText('Marvin Dupont')).toBeVisible();
    await expect(page.getByText('salarie@e2e.test')).toBeVisible();
  });

  test('ne montre pas les clients d\'une autre entreprise ni les particuliers', async ({ page }) => {
    await page.goto('/dashboard/entreprise/employees');
    await expect(page.getByText('Marvin Dupont')).toBeVisible({ timeout: 20_000 });

    // Sarah Benali est une cliente particulière : elle n'appartient à aucune entreprise.
    await expect(page.getByText('Sarah Benali')).toHaveCount(0);
  });

  test('invite un collaborateur par email', async ({ page }) => {
    await page.goto('/dashboard/entreprise/employees');
    await expect(page.getByRole('button', { name: /^inviter$/i })).toBeVisible({ timeout: 20_000 });

    await page.locator('input[type="email"]').first().fill('nouveau.collaborateur@acme.fr');
    const invitation = attendreApi(page, '/api/companies/invites', 'POST');
    await page.getByRole('button', { name: /^inviter$/i }).click();

    expect((await invitation).status()).toBe(201);
    // L'adresse apparaît aussi dans la notification éphémère : on cible la
    // ligne de la liste des invitations.
    await expect(page.locator('.me-invite-mail', { hasText: 'nouveau.collaborateur@acme.fr' })).toBeVisible({ timeout: 15_000 });
  });

  test('refuse une invitation à une adresse mal formée', async ({ page }) => {
    await page.goto('/dashboard/entreprise/employees');
    await expect(page.getByRole('button', { name: /^inviter$/i })).toBeVisible({ timeout: 20_000 });

    await page.locator('input[type="email"]').first().fill('pas-un-email');
    await page.getByRole('button', { name: /^inviter$/i }).click();

    // Aucune invitation ne doit apparaître dans la liste.
    await expect(page.getByText('pas-un-email')).toHaveCount(0);
  });

  test('propose l\'export CSV de la consommation par collaborateur', async ({ page }) => {
    await page.goto('/dashboard/entreprise/employees');
    const boutonExport = page.getByRole('button', { name: /exporter csv/i });
    await expect(boutonExport).toBeVisible({ timeout: 20_000 });

    const telechargement = page.waitForEvent('download', { timeout: 20_000 });
    await boutonExport.click();
    const fichier = await telechargement;

    // Nom horodaté : collaborateurs-AAAA-MM.csv
    expect(fichier.suggestedFilename()).toMatch(/^collaborateurs-\d{4}-\d{2}\.csv$/);
  });
});

test.describe('Espace entreprise — abonnement et quota', () => {
  test.use({ storageState: sessionDe('entreprise') });

  test('affiche la formule active, son échéance et le quota associé', async ({ page }) => {
    await page.goto('/dashboard/entreprise/subscription');

    await expect(page.getByText(/formule essentiel/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/actif/i).first()).toBeVisible();
    await expect(page.getByText(/quota\s*:\s*4 séances \/ collaborateur \/ mois/i)).toBeVisible();
  });

  test('affiche le tarif par collaborateur des trois formules', async ({ page }) => {
    await page.goto('/dashboard/entreprise/subscription');
    await expect(page.getByText(/formule essentiel/i).first()).toBeVisible({ timeout: 20_000 });

    await expect(page.getByText(/54 €/)).toBeVisible();   // Essentiel : 5 400 centimes
    await expect(page.getByText(/122 €/)).toBeVisible();  // Boost : 12 200 centimes
  });

  test('les statistiques reflètent l\'effectif rattaché', async ({ page }) => {
    await page.goto('/dashboard/entreprise/analytics');

    await expect(page.getByText(/collaborateurs rattachés/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/taux d'utilisation/i)).toBeVisible();
  });
});

test.describe('Forfait vu par le collaborateur', () => {
  test.use({ storageState: sessionDe('salarie') });

  test('le salarié voit sa couverture et son quota restant', async ({ page }) => {
    await page.goto('/dashboard/client/employer-plan');

    await expect(page.getByText('ACME Corp')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/formule essentiel/i)).toBeVisible();
    await expect(page.getByText(/séances couvertes ce mois/i)).toBeVisible();
    await expect(page.getByText(/prise\(s\) en charge par votre entreprise/i)).toBeVisible();
  });

  test('le menu du collaborateur expose l\'entrée « Mon forfait »', async ({ page }) => {
    await page.goto('/dashboard/client');

    await expect(page.getByRole('link', { name: /mon forfait/i })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Forfait et particulier', () => {
  test.use({ storageState: sessionDe('client') });

  test('un particulier n\'a pas d\'entrée « Mon forfait »', async ({ page }) => {
    await page.goto('/dashboard/client');
    // Le lien existe deux fois (menu latéral et raccourci du tableau de bord).
    await expect(page.getByRole('link', { name: 'Mes rendez-vous', exact: true })).toBeVisible({ timeout: 20_000 });

    await expect(page.getByRole('link', { name: /mon forfait/i })).toHaveCount(0);
  });

  test('et se voit refuser la page de forfait entreprise', async ({ page }) => {
    await page.goto('/dashboard/client/employer-plan');

    await expect(page.getByText('ACME Corp')).toHaveCount(0);
  });
});
