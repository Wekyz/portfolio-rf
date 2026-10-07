import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout : les cinq parcours réels du site, jamais vérifiés
 * jusqu'ici (filtrage, lightbox, menu mobile, formulaire, bascule de langue).
 *
 * Ils tournent sur le build réel servi par `astro preview`, pas sur le serveur
 * de développement : c'est bien le HTML livré qu'on veut éprouver.
 *
 * Chromium à chaque PR. WebKit (iPhone 14) une fois par semaine seulement,
 * voir le projet `iphone` plus bas.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    // Safari iOS, où se trouvent beaucoup de producteurs et la plupart des
    // comportements particuliers (iframe Vimeo, défilement, focus). Lancé
    // seulement par l'exécution hebdomadaire de la CI (E2E_WEBKIT=1) : il
    // doublerait la durée de chaque PR.
    ...(process.env.E2E_WEBKIT ? [{ name: 'iphone', use: { ...devices['iPhone 14'] } }] : []),
  ],

  webServer: {
    // `preview` sert dist/, donc le build tel qu'il partira en production.
    command: 'npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
