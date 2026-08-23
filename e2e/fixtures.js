const base = require('@playwright/test');
const path = require('path');

/**
 * Extension du `test` de Playwright.
 *
 * L'API applique deux limiteurs de débit par adresse IP : 100 requêtes/minute
 * globalement, et 10/minute sur /api/auth/login et /register. Une suite
 * fonctionnelle complète dépasse largement le premier plafond, puisque toutes
 * les requêtes partent de la même machine — d'où des 429 apparemment
 * aléatoires, qui masquent le comportement réellement testé.
 *
 * Chaque test se voit donc attribuer une IP cliente simulée via
 * X-Forwarded-For. C'est exactement ce que fait un reverse proxy en
 * production (Netlify devant Render), et l'application est configurée pour
 * cela (`app.set('trust proxy', 1)`).
 *
 * Le limiteur lui-même n'est pas contourné pour autant : il est vérifié par
 * les tests d'API (backend/tests/api/rateLimit.api.test.js), qui réutilisent
 * volontairement une IP unique pour atteindre le plafond.
 */
let compteur = 0;
const ipSuivante = () => {
  compteur += 1;
  return `10.${(compteur >> 16) & 255}.${(compteur >> 8) & 255}.${compteur & 255}`;
};

const test = base.test.extend({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use) => {
    await use({ ...extraHTTPHeaders, 'X-Forwarded-For': ipSuivante() });
  },

  /**
   * Ouvre un contexte navigateur supplémentaire — session pré-authentifiée
   * facultative — en conservant l'isolation d'IP.
   *   const page = await ouvrirSession('coach');
   */
  ouvrirSession: async ({ browser }, use) => {
    const contextes = [];
    const ouvrir = async (alias) => {
      const contexte = await browser.newContext({
        ...(alias ? { storageState: path.resolve(__dirname, '.auth', `${alias}.json`) } : {}),
        extraHTTPHeaders: { 'X-Forwarded-For': ipSuivante() },
        locale: 'fr-FR',
        timezoneId: 'Europe/Paris',
      });
      contextes.push(contexte);
      return contexte.newPage();
    };
    await use(ouvrir);
    await Promise.all(contextes.map((c) => c.close()));
  },
});

module.exports = { test, expect: base.expect };
