import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Démonte l'arbre React et vide le localStorage entre deux tests : sans cela,
// un composant monté ou une session persistée contaminerait le test suivant.
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// APIs navigateur absentes de jsdom, utilisées par les composants testés.
window.matchMedia ??= (query) => ({
  matches: false, media: query, onchange: null,
  addListener: vi.fn(), removeListener: vi.fn(),
  addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
});

window.scrollTo ??= vi.fn();

globalThis.URL.createObjectURL ??= vi.fn(() => 'blob:mock');
globalThis.URL.revokeObjectURL ??= vi.fn();
