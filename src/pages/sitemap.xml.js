/**
 * Sitemap généré au build, avec un `lastmod` à la date du build (plus de date
 * figée à maintenir à la main). Site bilingue : 3 pages fixes + une page par
 * projet vidéo, le tout x 2 langues, avec alternances hreflang par page.
 */
import data from '../data/videos.json';
import { projectRoutes } from '../lib/slug.js';

const SITE = 'https://roxane-foare.com';

// path : segment commun aux deux langues ('' pour l'accueil).
const FIXED_PAGES = [
  { path: '', priority: '1.0' },
  { path: '/portfolio', priority: '0.9' },
  { path: '/about', priority: '0.8' },
];

export function GET() {
  const lastmod = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Les pages projet passent après les pages fixes et en priorité plus basse :
  // elles sont nombreuses et alimentent le portfolio, qui reste la porte
  // d'entrée du référencement.
  const PAGES = [
    ...FIXED_PAGES,
    ...projectRoutes(
      /** @type {import('../lib/types').Project[]} */ (data.videos || data)
    ).map(({ slug }) => ({
      path: `/portfolio/${slug}`,
      priority: '0.7',
    })),
  ];

  const urls = PAGES.flatMap(({ path, priority }) => {
    const enLoc = `${SITE}${path || '/'}`;
    const frLoc = `${SITE}/fr${path}`;
    const alternates = `
    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}" />
    <xhtml:link rel="alternate" hreflang="fr" href="${frLoc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enLoc}" />`;

    return [
      { loc: enLoc, priority },
      { loc: frLoc, priority: (Number(priority) - 0.1).toFixed(1) },
    ].map(
      (p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${p.priority}</priority>${alternates}
  </url>`
    );
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
