/**
 * Sitemap généré au build, avec un `lastmod` à la date du build (plus de date
 * figée à maintenir à la main). Site bilingue, 3 pages (Accueil/Portfolio/
 * About) x 2 langues = 6 URL, avec alternances hreflang par page.
 */
const SITE = 'https://roxane-foare.com';

// path : segment commun aux deux langues ('' pour l'accueil).
const PAGES = [
  { path: '', priority: '1.0' },
  { path: '/portfolio', priority: '0.9' },
  { path: '/about', priority: '0.8' },
];

export function GET() {
  const lastmod = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

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
