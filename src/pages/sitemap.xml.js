/**
 * Sitemap généré au build, avec un `lastmod` à la date du build (plus de date
 * figée à maintenir à la main). Site bilingue : 3 pages fixes + une page par
 * projet vidéo, le tout x 2 langues, avec alternances hreflang par page.
 */
import data from '../data/videos.json';
import { projectRoutes } from '../lib/slug.js';

const SITE = 'https://roxane-foare.com';

// path : segment commun aux deux langues ('' pour l'accueil).
//
// Ni `changefreq` ni `priority` : Google a confirmé en 2023 ne plus les lire,
// et Bing l'avait annoncé avant. C'était deux valeurs à arbitrer sans qu'aucun
// moteur ne s'en serve.
const FIXED_PAGES = ['', '/portfolio', '/about', '/legal', '/privacy'];

export function GET() {
  const lastmod = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const PAGES = [
    ...FIXED_PAGES,
    ...projectRoutes(
      /** @type {import('../lib/types').Project[]} */ (data.videos || data)
    ).map(({ slug }) => `/portfolio/${slug}`),
  ];

  const urls = PAGES.flatMap((path) => {
    const enLoc = `${SITE}${path || '/'}`;
    const frLoc = `${SITE}/fr${path}`;
    const alternates = `
    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}" />
    <xhtml:link rel="alternate" hreflang="fr" href="${frLoc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enLoc}" />`;

    return [enLoc, frLoc].map(
      (loc) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>${alternates}
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
