/**
 * Sitemap généré au build, avec un `lastmod` à la date du build (plus de date
 * figée à maintenir à la main). Site bilingue -> deux URL (EN sur /, FR sur /fr)
 * avec alternances hreflang pour le SEO multilingue.
 */
const SITE = 'https://roxane-foare.com';

export function GET() {
  const lastmod = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const pages = [
    { loc: `${SITE}/`, priority: '1.0' },
    { loc: `${SITE}/fr`, priority: '0.9' },
  ];
  const alternates = `
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}/" />
    <xhtml:link rel="alternate" hreflang="fr" href="${SITE}/fr" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/" />`;

  const urls = pages
    .map(
      (p) => `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${p.priority}</priority>${alternates}
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
