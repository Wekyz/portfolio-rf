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
    // La feuille de style globale (~4 Ko) est petite et unique : l'inliner
    // dans le <head> évite une requête bloquant le rendu initial (LCP/FCP),
    // repérée par PageSpeed Insights (~90-160 ms sur /_astro/Base.*.css).
    inlineStylesheets: 'always',
  },
  // Astro 7 : compressHTML par défaut passe à 'jsx' (règles React/JSX pour les
  // espaces). On fige l'ancien comportement (true) pour ne pas introduire de
  // régression d'espacement silencieuse sur les éléments inline existants.
  compressHTML: true,
  // Pas de télémétrie réseau pendant le build
  devToolbar: { enabled: false },
  // Aucun contenu Markdown/bloc de code sur ce site : on désactive Shiki (le
  // surligneur par défaut d'Astro) plutôt que de le laisser tourner pour
  // rien - il génère des styles inline incompatibles avec la CSP stricte
  // ci-dessous (warning de build sinon).
  markdown: { syntaxHighlight: false },
  // CSP : Astro calcule au build les hashes SHA-256 des scripts/styles inline
  // (JSON-LD, script client) et les injecte dans une balise <meta> - plus
  // besoin de 'unsafe-inline' (script-src/style-src gérés automatiquement).
  // Les autres directives (celles que <meta> ne couvre pas ou qu'on veut
  // garder identiques à avant) sont ajoutées telles quelles.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        // Pas de frame-ancestors ici : la spec l'ignore explicitement quand
        // la CSP est livrée via <meta> (seul mode possible en sortie 100 %
        // statique) - la garder ne fait que générer un avertissement console
        // sur chaque page sans aucune protection réelle. La même protection
        // est déjà assurée par le vrai header HTTP X-Frame-Options:
        // SAMEORIGIN (vercel.json), non soumis à cette limitation.
        "font-src 'self' data:",
        "img-src 'self' data: blob: https://*.vimeocdn.com https://*.vimeo.com https://i.vimeocdn.com",
        "frame-src https://player.vimeo.com",
        "connect-src 'self' https://*.vimeo.com https://api.vimeo.com https://fresnel.vimeo.com https://vimeo.com",
      ],
    },
  },
});
