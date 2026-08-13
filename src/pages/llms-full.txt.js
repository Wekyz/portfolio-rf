/**
 * llms-full.txt - version longue de la fiche d'identité : biographie intégrale,
 * productions et marques nommées.
 *
 * Séparé de llms.txt, qui doit rester court et scannable. Ici on donne la
 * matière brute : un moteur de réponse ne peut recommander que ce qu'il peut
 * citer, et la bio n'existait jusqu'ici que noyée dans du HTML de mise en page.
 */
import data from '../data/videos.json';
import { projectRoutes } from '../lib/slug.js';
import { ui } from '../i18n/strings.js';
import { LEGAL } from '../data/legal.js';

const SITE = 'https://roxane-foare.com';

/** La bio contient du balisage (<em>) : inutile hors HTML. */
const stripTags = (s) => String(s).replace(/<[^>]*>/g, '');

export function GET() {
  const projects = /** @type {import('../lib/types').Project[]} */ (data.videos || data);
  const routes = projectRoutes(projects);
  const bySlug = new Map(routes.map((r) => [r.project, r.slug]));

  const projectLines = projects.map((p) => {
    const slug = bySlug.get(p);
    const facts = [
      p.credit && `production: ${p.credit}`,
      p.year && `year: ${p.year}`,
      `category: ${p.cat}`,
      slug && `page: ${SITE}/portfolio/${slug}`,
    ].filter(Boolean);
    return `- ${p.title}\n  ${facts.join(' | ')}`;
  });

  const body = `# Roxane Foare - full profile

Freelance video editor (monteuse vidéo), based in Paris and Angers, France.

## Biography (English)

${ui.en['about.introParagraphs'].map(stripTags).join('\n\n')}

## Biographie (français)

${ui.fr['about.introParagraphs'].map(stripTags).join('\n\n')}

## Awards

- ${ui.en['award.cyprus']}
- ${ui.en['award.athens']}

## Software

Editing: Adobe Premiere Pro, DaVinci Resolve, Avid Media Composer.
Live: TriCaster, XPression by Ross, LSM by EVS, Blackmagic ATEM.

## Productions worked with

Atelier B, B&A, Bandits, Big Bang prod, Blacklemon, Bricolo Factory, Cap TV,
Evrox, France TV, Hawlssen Production, Liik, Publicis Live, Studios Paris Sud,
Trimaran, Way of Live, West Indies Production, Wild Buzz Agency.

## Brands worked for

Accor, BNP Paribas, Bosch, Carolina Herrera, Carrefour, Celio, Chaumet,
Davidoff, Estée Lauder, Fabio Salsa, Fiat, Givenchy, Hennessy, Ioma,
JP Morgan, Lacoste, L'Oréal, Louboutin, MAIF, Meetic, Messika, OL,
Paris Games Week, PSG, Ricard, Sanofi, Siemens, Société Générale, Square Enix,
Waffle Factory, Yves Rocher.

## All projects

${projectLines.join('\n')}

## Legal

Publisher: ${LEGAL.name}, sole trader (French micro-entreprise regime).
Full legal notice: ${SITE}/legal - Privacy policy: ${SITE}/privacy
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
