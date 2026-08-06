import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout : les cinq parcours réels du site, jamais vérifiés
 * jusqu'ici (filtrage, lightbox, menu mobile, formulaire, bascule de langue).
 *
 * Ils tournent sur le build réel servi par `astro preview`, pas sur le serveur
 * de développement : c'est bien le HTML livré qu'on veut éprouver.
 *
 * Un seul navigateur, Chromium. Sur un site statique de cette taille, ajouter
 * Firefox et WebKit triplerait la durée de la CI pour un gain marginal - le
 * rendu ne dépend d'aucune API exotique.
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
  ],

  webServer: {
    // `preview` sert dist/, donc le build tel qu'il partira en production.
    command: 'npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
