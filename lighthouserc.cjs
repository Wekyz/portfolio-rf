/**
 * Lighthouse CI sur le site en ligne (CI-05), lancé par
 * .github/workflows/deploy.yml après chaque mise en ligne, avec
 * LHCI_BASE_URL = https://roxane-foare.com.
 *
 * Trois pages, une par gabarit lourd : l'accueil (showreel), la grille, une
 * fiche projet. Profil mobile, celui par défaut de Lighthouse.
 *
 * Seuils : l'accessibilité bloque (le site tient 100), la performance bloque
 * sous 0,85 seulement, les machines de GitHub étant plus lentes et plus
 * variables qu'un poste de travail. Les bonnes pratiques ne font
 * qu'avertir : le lecteur Vimeo de l'accueil pose un cookie tiers
 * (`__cf_bm`) qui coûte une vingtaine de points sans qu'on y puisse rien.
 * Les rapports restent dans la CI (artefact), rien n'est publié chez un
 * tiers.
 *
 * Le site étant déjà en ligne à ce stade, un échec ne retire rien : il
 * signale une régression à corriger dans la PR suivante.
 */
const base = (process.env.LHCI_BASE_URL || '').replace(/\/$/, '');

module.exports = {
  ci: {
    collect: {
      url: ['/', '/portfolio', '/portfolio/hanro'].map((path) => `${base}${path}`),
      numberOfRuns: 1,
      settings: {
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
