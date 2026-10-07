/**
 * Sélections privées (AME-05) : pages /review/<id> envoyées à une
 * production, avec une sélection de projets et un mot d'accompagnement.
 *
 * Les projets sont choisis dans le CMS par leur titre (widget relation sur la
 * liste des vidéos). Un titre renommé ou supprimé depuis ne correspond plus à
 * rien : il est ignoré et signalé dans le journal du build plutôt que de
 * casser la page. Seuls les projets avec une vidéo Vimeo sont montrés, c'est
 * l'objet de la page.
 */
import data from '../data/reviews.json' with { type: 'json' };
import { getProjects } from './projects.js';
import { buildSlugMap } from './slug.js';

/** @typedef {import('./types').Project} Project */
/**
 * @typedef {{ id: string, title: string, lang?: string, intro?: string, projects?: string[], expires?: string }} Review
 */

/**
 * Sélections à publier : identifiant présent, date de fin non dépassée.
 *
 * @param {{ reviews?: Review[], projects?: Project[], today?: string }} [deps]
 */
export function activeReviews(deps = {}) {
  const reviews = deps.reviews ?? /** @type {Review[]} */ (/** @type {any} */ (data).reviews || []);
  const projects = deps.projects ?? getProjects();
  const today = deps.today ?? new Date().toISOString().slice(0, 10);
  const slugs = buildSlugMap(projects);

  return reviews
    .filter((r) => r && r.id && (!r.expires || String(r.expires).slice(0, 10) >= today))
    .map((r) => {
      const titles = r.projects || [];
      const found = titles.map((title) => projects.find((p) => p.title === title));
      const missing = titles.filter((_, i) => !found[i]);
      const items = found
        .filter((p) => p && p.id)
        .map((p) => ({ project: /** @type {Project} */ (p), slug: slugs.get(p) }));
      return {
        ...r,
        lang: /** @type {'en' | 'fr'} */ (r.lang === 'en' ? 'en' : 'fr'),
        items,
        missing,
      };
    });
}
