import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLogout = vi.fn();
const mockGetMe = vi.fn();
const mockRefreshAccessToken = vi.fn();
const mockClearSession = vi.fn();
let capturedExpiryHandler = null;

vi.mock('../services/auth.api', () => ({
  authApi: {
    login: (...a) => mockLogin(...a),
    register: (...a) => mockRegister(...a),
    logout: (...a) => mockLogout(...a),
    google: vi.fn(),
  },
}));
vi.mock('../services/user.api', () => ({ userApi: { getMe: (...a) => mockGetMe(...a) } }));
vi.mock('../services/passkey.api', () => ({ passkeyApi: { authenticate: vi.fn() } }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../services/api', () => ({
  clearSession: (...a) => {
    mockClearSession(...a);
    ['accessToken', 'refreshToken', 'user'].forEach((k) => localStorage.removeItem(k));
  },
  isDeadSession: (err) => err?.message === 'SESSION_EXPIRED' || [401, 403].includes(err?.response?.status),
  onSessionExpired: (h) => { capturedExpiryHandler = h; },
  refreshAccessToken: (...a) => mockRefreshAccessToken(...a),
}));

const { AuthProvider } = await import('../context/AuthContext');
const { useAuth } = await import('../hooks/useAuth');

const makeToken = (expInSeconds) => {
  const b64 = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64({ exp: Math.floor(Date.now() / 1000) + expInSeconds })}.sig`;
};
const VALID = () => makeToken(3600);
const EXPIRED = () => makeToken(-60);

const CLIENT = { id: 100, email: 'client@test.fr', role: 'CLIENT', firstName: 'Sarah' };

/** Sonde exposant l'état du contexte dans le DOM, plus les actions à déclencher. */
function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="roles">{[
        auth.isClient && 'CLIENT', auth.isIntervenant && 'INTERVENANT',
        auth.isEntreprise && 'ENTREPRISE', auth.isAdmin && 'ADMIN',
      ].filter(Boolean).join(',')}</span>
      <span data-testid="email">{auth.user?.email ?? ''}</span>
      <button onClick={() => auth.login({ email: 'client@test.fr', password: 'Password1!' })}>connexion</button>
      <button onClick={() => auth.logout()}>deconnexion</button>
      <button onClick={() => auth.refreshUser()}>rafraichir</button>
    </div>
  );
}

const renderProbe = () => render(<AuthProvider><Probe /></AuthProvider>);
const settled = () => waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

beforeEach(() => {
  localStorage.clear();
  capturedExpiryHandler = null;
  mockLogin.mockReset().mockResolvedValue({ data: { user: CLIENT, accessToken: VALID(), refreshToken: VALID() } });
  mockLogout.mockReset().mockResolvedValue({});
  mockGetMe.mockReset().mockResolvedValue({ data: { ...CLIENT, firstName: 'Sarah-Modifié' } });
  mockRefreshAccessToken.mockReset().mockResolvedValue(VALID());
  mockClearSession.mockReset();
});

describe('AuthProvider — restauration de la session au démarrage', () => {
  it('démarre déconnecté quand rien n\'est stocké', async () => {
    renderProbe();

    await settled();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('restaure l\'utilisateur d\'une session valide, sans appel réseau', async () => {
    localStorage.setItem('user', JSON.stringify(CLIENT));
    localStorage.setItem('accessToken', VALID());
    localStorage.setItem('refreshToken', VALID());

    renderProbe();

    await settled();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('email')).toHaveTextContent('client@test.fr');
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });

  // Le backend Render s'endort : chaque aller-retour coûte une minute de
  // réveil. On évite donc tout appel réseau quand la session est déjà morte.
  it.each([
    ['refresh token périmé',   { user: true, access: VALID, refresh: EXPIRED }],
    ['refresh token absent',   { user: true, access: VALID, refresh: null }],
    ['access token absent',    { user: true, access: null, refresh: VALID }],
    ['utilisateur absent',     { user: false, access: VALID, refresh: VALID }],
  ])('purge la session sans appel réseau quand le %s', async (_label, { user, access, refresh }) => {
    if (user) localStorage.setItem('user', JSON.stringify(CLIENT));
    if (access) localStorage.setItem('accessToken', access());
    if (refresh) localStorage.setItem('refreshToken', refresh());

    renderProbe();

    await settled();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(mockClearSession).toHaveBeenCalled();
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });

  it('purge la session quand l\'utilisateur stocké est illisible', async () => {
    localStorage.setItem('user', '{json corrompu');
    localStorage.setItem('accessToken', VALID());
    localStorage.setItem('refreshToken', VALID());

    renderProbe();

    await settled();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(mockClearSession).toHaveBeenCalled();
  });

  // Session dormante : un seul renouvellement au démarrage, qui réveille aussi
  // le backend, plutôt qu'un 401 sur chaque page du tableau de bord.
  it('renouvelle une seule fois quand l\'access token est expiré mais le refresh valide', async () => {
    localStorage.setItem('user', JSON.stringify(CLIENT));
    localStorage.setItem('accessToken', EXPIRED());
    localStorage.setItem('refreshToken', VALID());

    renderProbe();

    await settled();
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
  });

  it('maintient la session connectée si le backend est injoignable', async () => {
    localStorage.setItem('user', JSON.stringify(CLIENT));
    localStorage.setItem('accessToken', EXPIRED());
    localStorage.setItem('refreshToken', VALID());
    mockRefreshAccessToken.mockRejectedValue({ response: { status: 504 } });

    renderProbe();

    await settled();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
  });

  it('déconnecte si le renouvellement est explicitement refusé', async () => {
    localStorage.setItem('user', JSON.stringify(CLIENT));
    localStorage.setItem('accessToken', EXPIRED());
    localStorage.setItem('refreshToken', VALID());
    mockRefreshAccessToken.mockRejectedValue({ response: { status: 401 } });

    renderProbe();

    await settled();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });
});

describe('AuthProvider — connexion et déconnexion', () => {
  it('persiste jetons et utilisateur à la connexion', async () => {
    renderProbe();
    await settled();

    await userEvent.click(screen.getByText('connexion'));

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(CLIENT);
    expect(localStorage.getItem('accessToken')).toBeTruthy();
    expect(localStorage.getItem('refreshToken')).toBeTruthy();
  });

  it('purge tout à la déconnexion', async () => {
    renderProbe();
    await settled();
    await userEvent.click(screen.getByText('connexion'));
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));

    await userEvent.click(screen.getByText('deconnexion'));

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'));
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  // Un échec de l'appel serveur ne doit pas laisser l'utilisateur coincé dans
  // un état connecté qu'il vient explicitement de quitter.
  it('déconnecte localement même si l\'appel serveur échoue', async () => {
    mockLogout.mockRejectedValue(new Error('Network Error'));
    renderProbe();
    await settled();
    await userEvent.click(screen.getByText('connexion'));
    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'));

    await userEvent.click(screen.getByText('deconnexion'));

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'));
  });
});

describe('AuthProvider — raccourcis de rôle', () => {
  it.each([
    ['CLIENT',      'CLIENT'],
    ['INTERVENANT', 'INTERVENANT'],
    ['ENTREPRISE',  'ENTREPRISE'],
    ['ADMIN',       'ADMIN'],
  ])('n\'active que le raccourci du rôle %s', async (role, expected) => {
    localStorage.setItem('user', JSON.stringify({ ...CLIENT, role }));
    localStorage.setItem('accessToken', VALID());
    localStorage.setItem('refreshToken', VALID());

    renderProbe();

    await settled();
    expect(screen.getByTestId('roles')).toHaveTextContent(expected);
  });

  it('n\'active aucun raccourci hors session', async () => {
    renderProbe();

    await settled();
    expect(screen.getByTestId('roles')).toHaveTextContent('');
  });
});

describe('AuthProvider — synchronisation du profil', () => {
  it('recharge l\'utilisateur et met à jour le stockage local', async () => {
    localStorage.setItem('user', JSON.stringify(CLIENT));
    localStorage.setItem('accessToken', VALID());
    localStorage.setItem('refreshToken', VALID());
    renderProbe();
    await settled();

    await userEvent.click(screen.getByText('rafraichir'));

    await waitFor(() => expect(JSON.parse(localStorage.getItem('user')).firstName).toBe('Sarah-Modifié'));
  });

  it('ne fait rien hors session', async () => {
    renderProbe();
    await settled();

    await userEvent.click(screen.getByText('rafraichir'));

    expect(mockGetMe).not.toHaveBeenCalled();
  });
});

describe('AuthProvider — session invalidée par l\'API', () => {
  // L'intercepteur signale la session morte ; le provider repasse en
  // déconnecté sans recharger la page (ce qui réinitialiserait tout le SPA).
  it('repasse en déconnecté sur notification de l\'intercepteur', async () => {
    localStorage.setItem('user', JSON.stringify(CLIENT));
    localStorage.setItem('accessToken', VALID());
    localStorage.setItem('refreshToken', VALID());
    renderProbe();
    await settled();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');

    act(() => capturedExpiryHandler());

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('false'));
  });

  it('s\'enregistre auprès de l\'intercepteur dès le montage', async () => {
    renderProbe();

    await settled();
    expect(typeof capturedExpiryHandler).toBe('function');
  });
});

describe('useAuth — garde-fou d\'utilisation', () => {
  it('lève une erreur explicite hors AuthProvider', () => {
    const Orphelin = () => { useAuth(); return null; };
    const silence = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Orphelin />)).toThrow(/AuthProvider/);

    silence.mockRestore();
  });
});
