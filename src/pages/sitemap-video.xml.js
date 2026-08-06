/**
 * Sitemap vidéo, généré au build depuis videos.json et le cache Vimeo.
 *
 * C'est le format que Google recommande pour déclarer des vidéos, et le seul
 * canal qui n'impose aucune contrainte de rendu : contrairement au VideoObject
 * des pages projet, il n'exige ni lecteur visible ni taille minimale. Les deux
 * se complètent - le sitemap déclare, la page prouve.
 *
 * Une entrée par page projet et par langue : les deux versions sont des URL
 * indexables distinctes portant le même lecteur, et leur appariement hreflang
 * est déjà déclaré dans sitemap.xml.
 */
import data from '../data/videos.json';
import { projectRoutes } from '../lib/slug.js';
import { buildProjectMeta, embedUrl } from '../lib/project-page.js';
import { getUploadDate, getDurationSeconds } from '../lib/thumb.js';

const SITE = 'https://roxane-foare.com';
const LANGS = /** @type {const} */ (['en', 'fr']);

/**
 * Échappe les cinq caractères réservés de XML. Indispensable ici : les titres
 * viennent du CMS et contiennent apostrophes et esperluettes
 * (« Niwel London's calling », « Estée Lauder X Messika »).
 */
function xml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const routes = projectRoutes(
    /** @type {import('../lib/types').Project[]} */ (data.videos || data)
  );

  const entries = routes.flatMap(({ project, slug }) =>
    LANGS.map((lang) => {
      const meta = buildProjectMeta(project, slug, lang);
      const loc = `${SITE}${lang === 'fr' ? '/fr' : ''}${meta.path}`;
      const seconds = getDurationSeconds(project);
      const published = getUploadDate(project);

      // thumbnail_loc, title, description et player_loc sont exigés par Google ;
      // sans miniature l'entrée serait rejetée, on préfère l'omettre.
      if (!meta.ogImage) return null;

      return `  <url>
    <loc>${xml(loc)}</loc>
    <video:video>
      <video:thumbnail_loc>${xml(meta.ogImage)}</video:thumbnail_loc>
      <video:title>${xml(project.title)}</video:title>
      <video:description>${xml(meta.description)}</video:description>
      <video:player_loc allow_embed="yes">${xml(embedUrl(project))}</video:player_loc>${
        seconds ? `\n      <video:duration>${seconds}</video:duration>` : ''
      }${published ? `\n      <video:publication_date>${xml(published)}</video:publication_date>` : ''}
      <video:family_friendly>yes</video:family_friendly>
      <video:live>no</video:live>
    </video:video>
  </url>`;
    })
  ).filter(Boolean);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${entries.join('\n')}
</urlset>
`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
