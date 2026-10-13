/**
 * Projets de la sélection de l'accueil (FeaturedWork.astro).
 *
 * Retenus : les projets cochés « Mettre en avant » qui mènent quelque part,
 * leur page (donc une vidéo Vimeo) ou à défaut leur lien externe.
 *
 * Ordre : le champ « Position sur l'accueil » (`featuredOrder`) d'abord, du
 * plus petit au plus grand ; les projets sans position viennent ensuite,
 * dans l'ordre de la liste du CMS. Avant ce champ, seul l'ordre de la liste
 * comptait, et la monteuse devait déplacer les projets dans le portfolio
 * pour changer l'accueil.
 *
 * @typedef {import('./types').Project} Project
 */

/**
 * Position saisie, ou `null` si le champ est vide. Le CMS peut enregistrer
 * un champ nombre vidé sous la forme `null` comme de `""`.
 *
 * @param {Project} p
 */
export function featuredPosition(p) {
  const v = p.featuredOrder;
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Project[]} projects
 * @param {(p: Project) => boolean} hasPage
 * @param {number} limit
 * @returns {Project[]}
 */
export function selectFeatured(projects, hasPage, limit) {
  return projects
    .filter((p) => p.featured && (hasPage(p) || p.externalLink))
    .map((p, index) => ({ p, index, pos: featuredPosition(p) }))
    .sort((a, b) => {
      if (a.pos !== null && b.pos !== null && a.pos !== b.pos) return a.pos - b.pos;
      if ((a.pos === null) !== (b.pos === null)) return a.pos === null ? 1 : -1;
      return a.index - b.index;
    })
    .slice(0, limit)
    .map(({ p }) => p);
}
