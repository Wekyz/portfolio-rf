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
  // Astro 7 : compressHTML par défaut passe à 'jsx' (règles React/JSX pour les
  // espaces). On fige l'ancien comportement (true) pour ne pas introduire de
  // régression d'espacement silencieuse sur les éléments inline existants.
  compressHTML: true,
  // Pas de télémétrie réseau pendant le build
  devToolbar: { enabled: false },
  // CSP : Astro calcule au build les hashes SHA-256 des scripts/styles inline
  // (JSON-LD, script client) et les injecte dans une balise <meta> - plus
  // besoin de 'unsafe-inline' (script-src/style-src gérés automatiquement).
  // Les autres directives (celles que <meta> ne couvre pas ou qu'on veut
  // garder identiques à avant) sont ajoutées telles quelles.
  security: {
    csp: {
      directives: [
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "frame-ancestors 'self'",
        "font-src 'self' data:",
        "img-src 'self' data: blob: https://*.vimeocdn.com https://*.vimeo.com https://i.vimeocdn.com",
        "frame-src https://player.vimeo.com",
        "connect-src 'self' https://*.vimeo.com https://api.vimeo.com https://fresnel.vimeo.com https://vimeo.com",
      ],
    },
  },
});
