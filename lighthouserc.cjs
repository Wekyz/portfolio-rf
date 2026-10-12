/**
 * Lighthouse CI sur un déploiement Vercel (CI-05), lancé par
 * .github/workflows/deployment.yml avec LHCI_BASE_URL = l'URL du déploiement.
 *
 * Trois pages, une par gabarit lourd : l'accueil (showreel), la grille, une
 * fiche projet. Pas de catégorie SEO : Vercel sert les previews avec
 * `X-Robots-Tag: noindex`, le score serait faux par construction.
 *
 * Seuils : l'accessibilité bloque (le site tient 100 en local), la
 * performance bloque sous 0,85 seulement, les machines de GitHub étant plus
 * lentes et plus variables qu'un poste de travail. Les rapports restent dans
 * la CI (artefact), rien n'est publié chez un tiers.
 */
const base = (process.env.LHCI_BASE_URL || '').replace(/\/$/, '');
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

module.exports = {
  ci: {
    collect: {
      url: ['/', '/portfolio', '/portfolio/hanro'].map((path) => `${base}${path}`),
      numberOfRuns: 1,
      settings: {
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        ...(bypass ? { extraHeaders: { 'x-vercel-protection-bypass': bypass } } : {}),
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
