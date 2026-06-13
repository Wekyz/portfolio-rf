// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://roxane-foare.com',
  // Sortie 100 % statique (équivalent au site actuel) : `astro build` -> dossier `dist/`
  output: 'static',
  build: {
    // Conserve l'arborescence simple (index.html à la racine de dist/)
    format: 'file',
  },
  // Pas de télémétrie réseau pendant le build
  devToolbar: { enabled: false },
});
