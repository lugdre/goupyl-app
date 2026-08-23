import { describe, it, expect, vi, afterEach } from 'vitest';
import { decodeJwt, isTokenExpired } from './token';

/** Fabrique un JWT non signé (seule la charge utile est lue côté client). */
const makeToken = (payload) => {
  const b64 = (obj) => btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256' })}.${b64(payload)}.signature`;
};

const inSeconds = (s) => Math.floor(Date.now() / 1000) + s;

afterEach(() => vi.useRealTimers());

describe('decodeJwt — lecture locale de la charge utile', () => {
  it('extrait la charge utile d\'un jeton bien formé', () => {
    expect(decodeJwt(makeToken({ userId: 42, role: 'CLIENT' }))).toEqual({ userId: 42, role: 'CLIENT' });
  });

  it('gère l\'encodage base64url (caractères - et _)', () => {
    const payload = { sub: 'aaa???bbb~~~', role: 'INTERVENANT' };
    expect(decodeJwt(makeToken(payload))).toEqual(payload);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['chaîne vide', ''],
    ['nombre', 12345],
    ['objet', { a: 1 }],
    ['chaîne sans point', 'pasunjwt'],
  ])('renvoie null pour une entrée %s', (_label, value) => {
    expect(decodeJwt(value)).toBeNull();
  });

  it('renvoie null si la charge utile n\'est pas du JSON valide', () => {
    expect(decodeJwt('header.cGFzLWR1LWpzb24.sig')).toBeNull();
  });

  // Le décodage est purement local : aucune vérification de signature. Le
  // serveur reste seul juge de l'authenticité — ce test fige cette frontière.
  it('décode un jeton à la signature falsifiée (la validation est côté serveur)', () => {
    const token = makeToken({ userId: 1, role: 'ADMIN' }).replace(/signature$/, 'falsifiee');
    expect(decodeJwt(token)).toEqual({ userId: 1, role: 'ADMIN' });
  });
});

describe('isTokenExpired — péremption locale, sans appel réseau', () => {
  it('considère valide un jeton expirant dans une heure', () => {
    expect(isTokenExpired(makeToken({ exp: inSeconds(3600) }))).toBe(false);
  });

  it('considère expiré un jeton dont l\'échéance est passée', () => {
    expect(isTokenExpired(makeToken({ exp: inSeconds(-1) }))).toBe(true);
  });

  it('considère expiré un jeton sans champ exp', () => {
    expect(isTokenExpired(makeToken({ userId: 1 }))).toBe(true);
  });

  it('considère expiré un jeton dont exp n\'est pas numérique', () => {
    expect(isTokenExpired(makeToken({ exp: '9999999999' }))).toBe(true);
  });

  it.each([null, undefined, '', 'pasunjwt'])('considère expiré une entrée invalide (%s)', (value) => {
    expect(isTokenExpired(value)).toBe(true);
  });

  // La marge évite d'envoyer une requête avec un jeton qui expirera pendant
  // le trajet réseau.
  describe('marge de sécurité', () => {
    it('déclare expiré un jeton valable moins longtemps que la marge', () => {
      expect(isTokenExpired(makeToken({ exp: inSeconds(5) }), 10)).toBe(true);
    });

    it('déclare valide un jeton dépassant la marge', () => {
      expect(isTokenExpired(makeToken({ exp: inSeconds(60) }), 10)).toBe(false);
    });

    it('sans marge, le même jeton reste valide', () => {
      expect(isTokenExpired(makeToken({ exp: inSeconds(5) }))).toBe(false);
    });
  });

  it('bascule à expiré au passage de l\'échéance', () => {
    vi.useFakeTimers();
    const token = makeToken({ exp: inSeconds(60) });

    expect(isTokenExpired(token)).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(isTokenExpired(token)).toBe(true);
  });
});
