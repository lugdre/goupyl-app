import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'goupyl-theme';
const VALID_MODES = ['light', 'dark', 'system'];

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

// mode ('light' | 'dark' | 'system') → thème effectif ('light' | 'dark')
const resolveTheme = (mode) => (mode === 'system' ? (prefersDark() ? 'dark' : 'light') : mode);

const readStoredMode = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_MODES.includes(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode);
  const [systemDark, setSystemDark] = useState(prefersDark);

  // Suit la préférence de l'OS en direct (setState dans un callback d'événement externe)
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Thème effectif dérivé pendant le rendu (aucun setState en effet)
  const resolvedTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  // Applique au <html> + persiste le mode choisi
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* stockage indisponible */ }
  }, [resolvedTheme, mode]);

  const setMode = useCallback((next) => {
    if (VALID_MODES.includes(next)) setModeState(next);
  }, []);

  // Compat : bascule simple clair/sombre (ignore le mode système)
  const toggle = useCallback(() => {
    setModeState((m) => (resolveTheme(m) === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = {
    mode,
    setMode,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    toggle,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
