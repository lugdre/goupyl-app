import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests de l'instance axios partagée. On ne simule PAS le module axios : on
 * lui branche un adaptateur de test, si bien que toute la chaîne
 * d'intercepteurs (ajout du Bearer, renouvellement, rejeu) s'exécute réellement.
 *
 * `vi.resetModules()` avant chaque test remet à zéro l'état interne du module
 * (la promesse de renouvellement en vol, le gestionnaire de session expirée).
 */
const makeToken = (expInSeconds) => {
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64({ exp: Math.floor(Date.now() / 1000) + expInSeconds })}.sig`;
};

const VALID = () => makeToken(3600);
const EXPIRED = () => makeToken(-60);

const responseFor = (config, status, data) => ({
  data, status, statusText: '', headers: {}, config, request: {},
});

const errorFor = (config, status, data) => {
  const err = new Error(`Request failed with status code ${status}`);
  err.isAxiosError = true;
  err.config = config;
  err.response = responseFor(config, status, data);
  return err;
};

/**
 * Adaptateur de test : `routes` associe un fragment d'URL à une réponse, ou à
 * une liste de réponses consommées dans l'ordre (pour simuler « 401 puis 200 »).
 */
const makeAdapter = (routes) => {
  const calls = [];
  const adapter = vi.fn(async (config) => {
    calls.push(config);
    const key = Object.keys(routes).find((k) => (config.url || '').includes(k));
    const entry = routes[key];
    const spec = Array.isArray(entry) ? entry.shift() : entry;
    if (!spec) throw errorFor(config, 500, { message: `Aucune réponse simulée pour ${config.url}` });
    if (spec.status >= 400) throw errorFor(config, spec.status, spec.data);
    return responseFor(config, spec.status, spec.data);
  });
  adapter.calls = calls;
  return adapter;
};

let api;
let mod;
let axios;

const load = async (adapter) => {
  vi.resetModules();
  axios = (await import('axios')).default;
  axios.defaults.adapter = adapter;
  mod = await import('./api.js');
  api = mod.default;
  api.defaults.adapter = adapter;
  return mod;
};

beforeEach(() => localStorage.clear());

describe('Intercepteur de requête — authentification', () => {
  it('ajoute le jeton Bearer aux appels authentifiés', async () => {
    const token = VALID();
    localStorage.setItem('accessToken', token);
    const adapter = makeAdapter({ '/users/me': { status: 200, data: { id: 1 } } });
    await load(adapter);

    await api.get('/users/me');

    expect(adapter.calls[0].headers.Authorization).toBe(`Bearer ${token}`);
  });

  it('n\'ajoute aucun en-tête d\'autorisation en l\'absence de jeton', async () => {
    const adapter = makeAdapter({ '/users/intervenants': { status: 200, data: [] } });
    await load(adapter);

    await api.get('/users/intervenants');

    expect(adapter.calls[0].headers.Authorization).toBeUndefined();
  });

  // Le navigateur doit poser lui-même la frontière multipart : forcer
  // application/json casserait l'envoi de fichiers (avatar, documents).
  it('retire Content-Type pour un envoi FormData', async () => {
    localStorage.setItem('accessToken', VALID());
    const adapter = makeAdapter({ '/users/me/avatar': { status: 200, data: {} } });
    await load(adapter);

    const form = new FormData();
    form.append('avatar', new Blob(['x']), 'photo.png');
    await api.post('/users/me/avatar', form);

    // L'intercepteur supprime bien l'en-tête ; axios le repositionne ensuite
    // en fonction du corps. Sous jsdom il choisit x-www-form-urlencoded là où
    // un vrai navigateur écrit multipart/form-data avec sa frontière. Le point
    // vérifiable — et le seul qui compte — est que le application/json par
    // défaut, qui casserait l'envoi de fichier, a bien été écarté.
    expect(adapter.calls[0].headers['Content-Type']).not.toContain('application/json');
  });

  it('conserve Content-Type: application/json pour un corps ordinaire', async () => {
    const adapter = makeAdapter({ '/appointments': { status: 201, data: {} } });
    await load(adapter);

    await api.post('/appointments', { intervenantId: 1 });

    expect(adapter.calls[0].headers['Content-Type']).toContain('application/json');
  });

  // Éviter la rafale de 401 au retour sur l'application après plusieurs heures.
  it('renouvelle un access token déjà expiré AVANT d\'envoyer la requête', async () => {
    localStorage.setItem('accessToken', EXPIRED());
    localStorage.setItem('refreshToken', VALID());
    const nouveau = VALID();
    const adapter = makeAdapter({
      '/auth/refresh': { status: 200, data: { accessToken: nouveau } },
      '/users/me': { status: 200, data: { id: 1 } },
    });
    await load(adapter);

    await api.get('/users/me');

    expect(adapter.calls[0].url).toContain('/auth/refresh');
    expect(adapter.calls[1].headers.Authorization).toBe(`Bearer ${nouveau}`);
    expect(localStorage.getItem('accessToken')).toBe(nouveau);
  });

  // Sans cette exclusion, un 401 « identifiants incorrects » déclencherait une
  // tentative de renouvellement et l'erreur ne remonterait jamais au formulaire.
  // C'est l'incident documenté au §8.2 du dossier projet.
  it.each(['/auth/login', '/auth/register', '/auth/refresh', '/auth/google'])(
    'n\'attache pas de jeton sur la route d\'authentification %s', async (route) => {
      localStorage.setItem('accessToken', VALID());
      const adapter = makeAdapter({ [route]: { status: 200, data: {} } });
      await load(adapter);

      await api.post(route, {});

      expect(adapter.calls[0].headers.Authorization).toBeUndefined();
    }
  );
});

describe('Intercepteur de réponse — renouvellement sur 401', () => {
  it('renouvelle puis rejoue la requête initiale, de façon transparente', async () => {
    localStorage.setItem('accessToken', VALID());
    localStorage.setItem('refreshToken', VALID());
    const nouveau = VALID();
    const adapter = makeAdapter({
      '/users/me': [{ status: 401, data: {} }, { status: 200, data: { id: 1 } }],
      '/auth/refresh': { status: 200, data: { accessToken: nouveau } },
    });
    await load(adapter);

    const { data } = await api.get('/users/me');

    expect(data).toEqual({ id: 1 });
    expect(adapter.calls.map((c) => c.url)).toEqual(['/users/me', '/api/auth/refresh', '/users/me']);
    expect(adapter.calls[2].headers.Authorization).toBe(`Bearer ${nouveau}`);
  });

  // Sans le drapeau _retry, un 401 persistant provoquerait une boucle infinie.
  it('ne tente qu\'un seul renouvellement par requête', async () => {
    localStorage.setItem('accessToken', VALID());
    localStorage.setItem('refreshToken', VALID());
    const adapter = makeAdapter({
      '/users/me': [{ status: 401, data: {} }, { status: 401, data: {} }],
      '/auth/refresh': { status: 200, data: { accessToken: VALID() } },
    });
    await load(adapter);
    mod.onSessionExpired(vi.fn());

    await expect(api.get('/users/me')).rejects.toBeTruthy();

    expect(adapter.calls.filter((c) => c.url.includes('/auth/refresh'))).toHaveLength(1);
  });

  // Un 401 sur /auth/login signifie « identifiants incorrects » : il doit
  // remonter tel quel au formulaire, sans détour par le renouvellement.
  it('laisse remonter un 401 issu d\'une route d\'authentification', async () => {
    localStorage.setItem('refreshToken', VALID());
    const adapter = makeAdapter({ '/auth/login': { status: 401, data: { message: 'Email ou mot de passe incorrect.' } } });
    await load(adapter);

    const error = await api.post('/auth/login', { email: 'a@b.fr', password: 'faux' }).catch((e) => e);

    expect(error.response.status).toBe(401);
    expect(error.response.data.message).toBe('Email ou mot de passe incorrect.');
    expect(adapter.calls.some((c) => c.url.includes('/auth/refresh'))).toBe(false);
  });

  it('ne renouvelle pas sur une erreur autre que 401', async () => {
    localStorage.setItem('accessToken', VALID());
    localStorage.setItem('refreshToken', VALID());
    const adapter = makeAdapter({ '/appointments': { status: 409, data: { error: 'SLOT_CONFLICT' } } });
    await load(adapter);

    const error = await api.post('/appointments', {}).catch((e) => e);

    expect(error.response.status).toBe(409);
    expect(adapter.calls).toHaveLength(1);
  });
});

describe('refreshAccessToken — mutualisation et court-circuit', () => {
  it('mutualise les appels concurrents en une seule requête réseau', async () => {
    localStorage.setItem('refreshToken', VALID());
    const adapter = makeAdapter({ '/auth/refresh': { status: 200, data: { accessToken: VALID() } } });
    await load(adapter);

    await Promise.all([mod.refreshAccessToken(), mod.refreshAccessToken(), mod.refreshAccessToken()]);

    expect(adapter.calls.filter((c) => c.url.includes('/auth/refresh'))).toHaveLength(1);
  });

  // Chaque aller-retour inutile coûte cher quand le backend Render sort de
  // veille : on n'appelle pas l'API si le refresh token est déjà mort.
  it('échoue sans appel réseau quand le refresh token est absent', async () => {
    const adapter = makeAdapter({});
    await load(adapter);

    await expect(mod.refreshAccessToken()).rejects.toThrow('SESSION_EXPIRED');
    expect(adapter.calls).toHaveLength(0);
  });

  it('échoue sans appel réseau quand le refresh token est périmé', async () => {
    localStorage.setItem('refreshToken', EXPIRED());
    const adapter = makeAdapter({});
    await load(adapter);

    await expect(mod.refreshAccessToken()).rejects.toThrow('SESSION_EXPIRED');
    expect(adapter.calls).toHaveLength(0);
  });

  it('autorise une nouvelle tentative après l\'échec de la précédente', async () => {
    localStorage.setItem('refreshToken', VALID());
    const adapter = makeAdapter({
      '/auth/refresh': [{ status: 500, data: {} }, { status: 200, data: { accessToken: VALID() } }],
    });
    await load(adapter);

    await expect(mod.refreshAccessToken()).rejects.toBeTruthy();
    await expect(mod.refreshAccessToken()).resolves.toBeTruthy();
  });
});

describe('Fin de session', () => {
  it('clearSession purge les trois entrées du stockage local', async () => {
    localStorage.setItem('accessToken', 'a');
    localStorage.setItem('refreshToken', 'b');
    localStorage.setItem('user', '{}');
    await load(makeAdapter({}));

    mod.clearSession();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  // Distinction essentielle : un backend endormi (502/504, coupure réseau) ne
  // doit PAS déconnecter l'utilisateur ; seule une session réellement refusée
  // le doit.
  it.each([
    ['SESSION_EXPIRED',        { message: 'SESSION_EXPIRED' },        true],
    ['401 Unauthorized',       { response: { status: 401 } },         true],
    ['403 Forbidden',          { response: { status: 403 } },         true],
    ['500 erreur serveur',     { response: { status: 500 } },         false],
    ['502 backend endormi',    { response: { status: 502 } },         false],
    ['504 délai dépassé',      { response: { status: 504 } },         false],
    ['coupure réseau',         { message: 'Network Error' },          false],
    ['erreur indéfinie',       undefined,                             false],
  ])('isDeadSession(%s) = %s', async (_label, error, expected) => {
    await load(makeAdapter({}));

    expect(mod.isDeadSession(error)).toBe(expected);
  });

  it('prévient l\'AuthProvider enregistré plutôt que de recharger la page', async () => {
    await load(makeAdapter({}));
    const handler = vi.fn();
    mod.onSessionExpired(handler);
    localStorage.setItem('accessToken', 'a');

    mod.expireSession();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
