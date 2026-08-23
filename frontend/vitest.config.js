import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Configuration de test du frontend.
 *
 * Le plugin React est déclaré explicitement (transformation JSX identique à
 * celle du build). Le plugin Tailwind de vite.config.js est volontairement
 * absent : il ne produit que des feuilles de style, inutiles en test, et
 * alourdirait chaque démarrage.
 */
export default defineConfig({
  plugins: [react()],
  // Runtime JSX automatique : les fichiers de test n'importent pas React
  // explicitement, comme le reste du code applicatif.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov', 'html'],
      include: ['src/utils/**', 'src/services/**', 'src/components/**', 'src/context/**'],
      exclude: ['src/components/layout/body.jsx'], // page vitrine statique, sans logique
    },
  },
});
