/**
 * Sitemap généré au build, avec un `lastmod` à la date du build (plus de date
 * figée à maintenir à la main). Site one-page -> une seule URL.
 */
const SITE = 'https://roxane-foare.com/';

export function GET() {
  const lastmod = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
