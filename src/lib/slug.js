/**
 * Génération des identifiants d'URL (slugs) des pages projet.
 *
 * Le slug est dérivé du titre, pas d'un champ à saisir : les 36 projets
 * existants n'en ont pas et personne n'a envie d'en écrire 31 à la main.
 * Un projet peut malgré tout forcer le sien via le champ `slug` de
 * `videos.json` (voir public/admin/config.yml), utile dans deux cas :
 *  - figer une URL déjà indexée dont on veut changer le titre affiché ;
 *  - départager deux projets homonymes autrement qu'avec le suffixe
 *    numérique automatique.
 *
 * ATTENTION : renommer un projet dans le CMS change son slug, donc son URL.
 * L'ancienne renverra 404. Si le projet est déjà référencé, renseigner
 * `slug` avec l'ancienne valeur avant de renommer.
 *
 * Le slug est volontairement identique en EN et en FR : les deux versions
 * d'une même page projet doivent former une paire hreflang, et un slug
 * commun garde la correspondance triviale (/portfolio/x <-> /fr/portfolio/x).
 */

/** @typedef {import('./types').Project} Project */

/**
 * Titre lisible -> segment d'URL. Décompose les caractères accentués (NFD)
 * pour retirer les diacritiques : « Château » devient « chateau », plutôt
 * qu'une URL percent-encodée illisible.
 */
export function slugify(title) {
  return String(title)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques isolés par le NFD
    .replace(/['’]/g, '') // « London's » -> « londons », pas « london-s »
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Associe un slug unique à chaque projet disposant d'une vidéo Vimeo (les
 * seuls à mériter une page : sans `id`, il n'y a pas de lecteur à montrer,
 * donc rien qui justifie une URL propre).
 *
 * En cas de collision, on suffixe `-2`, `-3`... dans l'ordre de
 * `videos.json`. L'ordre étant celui du CMS, un slug reste stable tant que
 * les projets qui le précèdent ne sont pas renommés.
 *
 * @param {Project[]} projects
 * @returns {Map<Project, string>} projet -> slug
 */
export function buildSlugMap(projects) {
  /** @type {Map<Project, string>} */
  const map = new Map();
  const used = new Map(); // slug de base -> nombre d'occurrences déjà vues

  for (const p of projects) {
    if (!p.id) continue;
    const base = (p.slug ? slugify(p.slug) : slugify(p.title)) || `projet-${p.id}`;
    const seen = used.get(base) || 0;
    used.set(base, seen + 1);
    map.set(p, seen === 0 ? base : `${base}-${seen + 1}`);
  }
  return map;
}

/**
 * Liste plate prête pour `getStaticPaths` : un objet par page à générer.
 *
 * @param {Project[]} projects
 * @returns {{ project: Project, slug: string }[]}
 */
export function projectRoutes(projects) {
  return [...buildSlugMap(projects)].map(([project, slug]) => ({ project, slug }));
}
