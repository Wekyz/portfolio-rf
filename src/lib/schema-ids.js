/**
 * Identifiants stables des nœuds JSON-LD.
 *
 * Une page projet émet cinq blocs indépendants - Person, WebPage,
 * VideoObject, BreadcrumbList, et ProfessionalService sur l'accueil. Aucun ne
 * portait d'`@id` : rien ne disait qu'il s'agit de la même personne d'un bloc
 * à l'autre, ni que la vidéo appartient à cette page. Les consommateurs
 * recollent alors par heuristique, avec des résultats inégaux - et c'est
 * précisément le genre de signal qu'un moteur de réponse exploite quand il
 * arbitre entre plusieurs sources.
 *
 * Deux règles suivies partout :
 *  - un `@id` global (la personne, le site, l'activité) ne dépend pas de la
 *    page qui l'émet, sinon la même entité aurait autant d'identités que de
 *    pages ;
 *  - un `@id` local (la page, sa vidéo, son fil d'Ariane) est le canonique de
 *    la page suivi d'un fragment.
 *
 * Corollaire de la première règle : le nœud Person porte désormais une `url`
 * fixe (l'accueil) et non plus celle de la page courante. Deux pages
 * déclarant le même `@id` avec des `url` différentes se contrediraient.
 */
export const SITE = 'https://roxane-foare.com';

/** Roxane elle-même. Identique sur les 75 pages. */
export const PERSON_ID = `${SITE}/#person`;
/** Le site comme œuvre, dont chaque page est une partie. */
export const WEBSITE_ID = `${SITE}/#website`;
/** L'activité de montage, déclarée sur l'accueil et À propos. */
export const SERVICE_ID = `${SITE}/#service`;

/**
 * Référence courte vers un nœud déclaré ailleurs dans la page. On garde
 * `@type` et `name` à côté de l'`@id` : la référence reste lisible par un
 * consommateur qui n'aurait lu que ce bloc, tout en étant recollable par
 * celui qui lit la page entière.
 */
export const personRef = () => ({
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Roxane Foare',
});

/** `@id` des nœuds propres à une page, à partir de son URL canonique. */
export const pageIds = (canonical) => ({
  webPage: `${canonical}#webpage`,
  video: `${canonical}#video`,
  breadcrumb: `${canonical}#breadcrumb`,
});
