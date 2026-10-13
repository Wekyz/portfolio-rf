/**
 * llms.txt - fiche d'identité du site pour les moteurs de réponse et les agents.
 *
 * Généré au build depuis videos.json, comme le sitemap. La version manuelle
 * précédente ne nommait aucun projet - or c'est précisément ce qu'un moteur
 * doit pouvoir restituer quand on lui demande « qui a monté tel film » - et
 * elle affirmait que les miniatures étaient auto-hébergées en WebP, ce qui
 * était devenu faux depuis le passage au CDN Vimeo. Un fichier écrit pour être
 * lu par des machines et qui contient une affirmation fausse est pire que pas
 * de fichier du tout : la génération supprime cette classe d'erreur.
 */
import { getProjects } from '../lib/projects.js';
import { projectRoutes } from '../lib/slug.js';
import { SITE } from '../lib/schema-ids.js';
import { ui } from '../i18n/strings.js';
import { IMDB_URL, SOFTWARE } from '../data/profile.js';
import { creditLine } from '../lib/credits.js';

/** « A, B and C » : la forme d'une énumération dans une phrase anglaise. */
const andList = (items) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

const CATEGORY_LABELS = {
  pub: 'Commercial',
  film: 'Feature film',
  doc: 'Documentary',
  corpo: 'Corporate',
  event: 'Event',
  teaser: 'Teaser',
  live: 'Live broadcast',
};

export function GET() {
  const projects = getProjects();
  const routes = projectRoutes(projects);
  const bySlug = new Map(routes.map((r) => [r.project, r.slug]));
  const t = (key) => ui.en[key];

  // Un projet par ligne, groupé par catégorie : c'est la forme la plus
  // directement citable. Les projets sans page (pas de vidéo Vimeo) sont
  // listés sans lien plutôt qu'omis - ils font partie du parcours.
  const byCategory = Object.keys(CATEGORY_LABELS)
    .map((cat) => {
      const items = projects.filter((p) => p.cat === cat);
      if (items.length === 0) return null;
      const lines = items.map((p) => {
        const bits = [creditLine(p, 'en'), p.year].filter(Boolean).join(', ');
        const slug = bySlug.get(p);
        const label = slug ? `[${p.title}](${SITE}/portfolio/${slug})` : p.title;
        // Les distinctions sont le fait le plus citable d'un projet qui en
        // porte : elles vivaient dans le champ crédit et n'apparaissaient
        // donc ici que noyées dans une chaîne de 124 caractères.
        const prix = p.awards?.length ? ` - ${p.awards.join('; ')}` : '';
        return `- ${label}${bits ? ` - ${bits}` : ''}${prix}`;
      });
      return `### ${CATEGORY_LABELS[cat]}\n\n${lines.join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n');

  const body = `# Roxane Foare

> Freelance video editor based in Paris and Angers, France. More than ten years
> editing feature films, documentaries, commercials, corporate films, live
> broadcast and events. Works in French and English.

Roxane Foare (monteuse vidéo) edits on ${andList(SOFTWARE.editing)}.
Live work uses ${andList(SOFTWARE.live)}.

## Key facts

- Profession: video editor (monteuse vidéo), freelance, sole trader.
- Based in Paris and Angers, France; available elsewhere.
- Languages: French, English.
- Awards: ${t('award.cyprus')}; ${t('award.athens')}.
- IMDb: ${IMDB_URL}

## Projects

${byCategory}

## Pages

- [Home](${SITE}/) - showreel and entry points. French: ${SITE}/fr
- [Portfolio](${SITE}/portfolio) - all projects, filterable by category. French: ${SITE}/fr/portfolio
- [About](${SITE}/about) - biography, software, productions, brands, awards. French: ${SITE}/fr/about
- [Contact](${SITE}/contact) - contact form, working area, languages. French: ${SITE}/fr/contact
- Project pages: ${SITE}/portfolio/<slug> - one per video, with player, credits, year and awards where applicable.
- [Legal notice](${SITE}/legal) - [Privacy policy](${SITE}/privacy)

English is the default language at the root; French lives under /fr with the
same structure and matching hreflang pairs.

## Contact

The contact page is ${SITE}/contact (French: ${SITE}/fr/contact). The same
form also sits at the bottom of the portfolio, about and project pages. The
email address is served through a redirect at /api/email rather than exposed
in the HTML, and is also published in the legal notice.

## Notes for automated agents

- Everything is static HTML rendered at build time. Project titles, credits,
  years and awards are readable without executing JavaScript.
- Video players are Vimeo embeds (player.vimeo.com). Thumbnails come from the
  Vimeo CDN (i.vimeocdn.com); a few projects override them with self-hosted
  WebP files under /live/.
- A video sitemap is available at ${SITE}/sitemap-video.xml, and the regular
  sitemap at ${SITE}/sitemap.xml.
- /admin is a content editor behind GitHub OAuth. Do not crawl or index it.
- A longer version of this file, with the full biography, is at
  ${SITE}/llms-full.txt
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
