/**
 * Liste des projets de `src/data/videos.json`, typée une fois pour toutes.
 *
 * Le fichier édité par le CMS est un objet `{ videos: [...] }` ; d'anciennes
 * versions étaient un tableau nu, d'où le repli. Cette lecture et son
 * transtypage étaient recopiés dans huit fichiers : un changement de format
 * n'a plus qu'un endroit à suivre.
 *
 * `with { type: 'json' }` : même raison que dans thumb.js, le module reste
 * chargeable tel quel par Node, donc par les tests.
 */
import data from '../data/videos.json' with { type: 'json' };

/** @typedef {import('./types').Project} Project */

/** @returns {Project[]} */
export function getProjects() {
  return /** @type {Project[]} */ (/** @type {unknown} */ (data.videos || data));
}
