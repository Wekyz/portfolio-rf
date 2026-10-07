/**
 * Sitemap généré au build. Site bilingue : 6 pages fixes + une page par
 * projet vidéo, le tout x 2 langues, avec alternances hreflang par page.
 *
 * `lastmod` vient de src/lib/page-dates.js, la même source que le
 * `dateModified` du JSON-LD. Une page sans date connue n'en déclare pas :
 * mieux vaut rien qu'une date inventée.
 */
import { getProjects } from '../lib/projects.js';
import { projectRoutes } from '../lib/slug.js';
import { SITE } from '../lib/schema-ids.js';
import { lastModified, FIXED_PAGE_DATES } from '../lib/page-dates.js';

// path : segment commun aux deux langues ('' pour l'accueil). La liste des
// pages fixes est celle de page-dates.js : une page ajoutée sans date n'entre
// pas dans le sitemap.
//
// Ni `changefreq` ni `priority` : Google a confirmé en 2023 ne plus les lire,
// et Bing l'avait annoncé avant. C'était deux valeurs à arbitrer sans qu'aucun
// moteur ne s'en serve.
const FIXED_PAGES = Object.keys(FIXED_PAGE_DATES);

export function GET() {
  const PAGES = [
    ...FIXED_PAGES,
    ...projectRoutes(getProjects()).map(({ slug }) => `/portfolio/${slug}`),
  ];

  const urls = PAGES.flatMap((path) => {
    const enLoc = `${SITE}${path || '/'}`;
    const frLoc = `${SITE}/fr${path}`;
    const date = lastModified(path);
    const lastmod = date ? `
    <lastmod>${date}</lastmod>` : '';
    const alternates = `
    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}" />
    <xhtml:link rel="alternate" hreflang="fr" href="${frLoc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${enLoc}" />`;

    return [enLoc, frLoc].map(
      (loc) => `  <url>
    <loc>${loc}</loc>${lastmod}${alternates}
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
