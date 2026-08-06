/* ============================================================
   ESLint - garde-fou sur les erreurs réelles (variables non définies ou
   inutilisées, cas oubliés dans un switch, promesses mal formées…).

   Pas de Prettier volontairement. Mesuré avant de trancher : le JS du dépôt
   est déjà conforme à son style (107 lignes sur 945), mais Prettier
   réécrirait 1111 lignes de `styles.css` (664 -> 1244, une déclaration par
   ligne, la mise en forme compacte actuelle disparaît) et 571 lignes de
   `.astro` sur 756 - dont les `<span>` inline de `.slide-label`, exactement
   le genre d'espacement que `compressHTML: true` protège (voir le
   commentaire dans astro.config.mjs). Le rapport dégâts/bénéfice n'y est pas.
   ============================================================ */
import js from '@eslint/js';
import globals from 'globals';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**', '.astro/**', 'node_modules/**', 'src/data/**'] },

  js.configs.recommended,
  ...astro.configs.recommended,

  // Le frontmatter des .astro est du TypeScript (annotations de types,
  // `import type`) : sans ce parser, ESLint s'arrête sur le premier `:`.
  {
    files: ['**/*.astro'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },

  // Code client (navigateur) : app.js et les modules partagés avec la grille.
  {
    files: ['src/scripts/**/*.js', 'src/lib/**/*.js'],
    languageOptions: { globals: globals.browser },
  },

  // Endpoints Astro (sitemap) : exécutés au build dans un contexte serveur
  // qui expose les API web standard (Response, URL, fetch…).
  {
    files: ['src/pages/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.serviceworker } },
  },

  // Code serveur / build : fonctions Vercel, scripts de build, tests, config.
  {
    // `astro.config.mjs` lit process.env pour conditionner le captcha
    // (voir la constante TURNSTILE) : il tourne bien sous Node au build.
    files: [
      'api/**/*.js',
      'scripts/**/*.mjs',
      'tests/**/*.mjs',
      'eslint.config.js',
      'astro.config.mjs',
      'playwright.config.mjs',
      'e2e/**/*.mjs',
    ],
    languageOptions: { globals: globals.node },
  },
];
