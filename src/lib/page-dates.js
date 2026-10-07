/**
 * Date de dernière modification réelle d'une page, pour le `lastmod` du
 * sitemap et le `dateModified` du JSON-LD. Les deux lisent cette fonction et
 * annoncent donc toujours la même date.
 *
 * Le sitemap écrivait la date du build sur ses 150 URL : chaque enregistrement
 * CMS ou clic sur "Redéployer" déclarait tout le site modifié, et Google cesse
 * de lire un `lastmod` qui ment de façon systématique.
 *
 * - Fiches projet : date tenue par scripts/fetch-thumbs.mjs dans
 *   content-dates.json, qui ne bouge que si la fiche change.
 * - Pages fixes : leur contenu vit dans les sources, et un build Vercel n'a pas
 *   d'historique git fiable (clone partiel). La date est donc écrite ici, à la
 *   main.
 * - Accueil et Portfolio affichent des projets : elles prennent la plus récente
 *   des deux dates, la leur ou celle du dernier projet modifié.
 */
import contentDates from '../data/content-dates.json' with { type: 'json' };

/**
 * À METTRE À JOUR quand le texte ou la structure d'une page change de façon
 * visible (pas pour un correctif de style ou un refactor). La clé est le
 * chemin commun aux deux langues, la date vaut pour /x et /fr/x.
 */
export const FIXED_PAGE_DATES = {
  '': '2026-09-06',
  '/portfolio': '2026-10-07',
  '/about': '2026-09-06',
  '/contact': '2026-09-06',
  '/legal': '2026-08-06',
  '/privacy': '2026-08-06',
};

const LISTS_PROJECTS = new Set(['', '/portfolio']);

const latestProjectDate = Object.values(contentDates)
  .map((entry) => entry.date)
  .sort()
  .at(-1);

/** Plus récente de deux dates YYYY-MM-DD (l'ordre lexical suffit). */
const latest = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

/**
 * @param {string} path chemin sans préfixe de langue ('' pour l'accueil)
 * @returns {string | undefined} YYYY-MM-DD, ou undefined si la page est inconnue
 */
export function lastModified(path) {
  const project = path.match(/^\/portfolio\/([^/]+)$/);
  if (project) return contentDates[project[1]]?.date;

  const own = FIXED_PAGE_DATES[path];
  return LISTS_PROJECTS.has(path) ? latest(own, latestProjectDate) : own;
}
