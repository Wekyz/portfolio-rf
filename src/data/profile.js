/**
 * Profil de Roxane : ce qui la décrit et ne dépend ni de la langue ni d'un
 * projet. Une seule source pour les composants, le JSON-LD et les fichiers
 * générés (llms.txt, llms-full.txt).
 *
 * Ces listes vivaient en double, dans About.astro et en dur dans
 * llms-full.txt.js, et l'URL IMDb était recopiée à quatre endroits. Une
 * production ajoutée d'un côté manquait de l'autre sans que rien ne le
 * signale.
 *
 * L'URL du site n'est pas ici : elle vit dans src/lib/schema-ids.js, que
 * astro.config.mjs importe aussi pour son option `site`.
 */

/** Profil IMDb - seule présence externe existante. */
export const IMDB_URL = 'https://www.imdb.com/fr/name/nm8663077/';

/** Logiciels, dans l'ordre d'affichage de la page À propos. */
export const SOFTWARE = {
  editing: ['Adobe Premiere Pro', 'DaVinci Resolve', 'Avid Media Composer'],
  live: ['TriCaster', 'XPression by Ross', 'LSM by EVS', 'Blackmagic ATEM'],
};

/** Sociétés de production, par ordre alphabétique. */
export const PRODUCTIONS = [
  'Atelier B',
  'B&A',
  'Bandits',
  'Big Bang prod',
  'Blacklemon',
  'Bricolo Factory',
  'Cap TV',
  'Evrox',
  'France TV',
  'Hawlssen Production',
  'Liik',
  'Publicis Live',
  'Studios Paris Sud',
  'Trimaran',
  'Way of Live',
  'West Indies Production',
  'Wild Buzz Agency',
];

/**
 * Marques du bandeau de logos. `slug` désigne les fichiers
 * public/brands/<slug>-64.webp et -96.webp (voir scripts/fetch-thumbs.mjs).
 */
export const BRANDS = [
  { slug: 'accor', name: 'Accor' },
  { slug: 'bnp', name: 'BNP Paribas' },
  { slug: 'bosch', name: 'Bosch' },
  { slug: 'carolina-herrera', name: 'Carolina Herrera' },
  { slug: 'carrefour', name: 'Carrefour' },
  { slug: 'celio', name: 'Celio' },
  { slug: 'chaumet', name: 'Chaumet' },
  { slug: 'davidoff', name: 'Davidoff' },
  { slug: 'estee-lauder', name: 'Estée Lauder' },
  { slug: 'fabio-salsa', name: 'Fabio Salsa' },
  { slug: 'fiat', name: 'Fiat' },
  { slug: 'givenchy', name: 'Givenchy' },
  { slug: 'hennessy', name: 'Hennessy' },
  { slug: 'ioma', name: 'Ioma' },
  { slug: 'jp-morgan', name: 'JP Morgan' },
  { slug: 'lacoste', name: 'Lacoste' },
  { slug: 'loreal', name: "L'Oréal" },
  { slug: 'louboutin', name: 'Louboutin' },
  { slug: 'maif', name: 'MAIF' },
  { slug: 'meetic', name: 'Meetic' },
  { slug: 'messika', name: 'Messika' },
  { slug: 'ol', name: 'OL' },
  { slug: 'pgw', name: 'Paris Games Week' },
  { slug: 'psg', name: 'PSG' },
  { slug: 'ricard', name: 'Ricard' },
  { slug: 'sanofi', name: 'Sanofi' },
  { slug: 'siemens', name: 'Siemens' },
  { slug: 'soge', name: 'Société Générale' },
  { slug: 'square', name: 'Square Enix' },
  { slug: 'waffle', name: 'Waffle Factory' },
  { slug: 'yves-rocher', name: 'Yves Rocher' },
];

/**
 * Informations pratiques de la page Contact : ce qu'un producteur demande
 * avant d'écrire, et que les assistants IA reformulent. Depuis le retrait de
 * la FAQ, rien de tout cela n'était écrit nulle part.
 *
 * Chaque valeur vient de Roxane, rien n'est déduit. Une entrée laissée à
 * `null` n'est affichée ni sur le site ni dans llms-full.txt. Format : une
 * phrase courte et factuelle par langue, par exemple
 *   remote: { fr: 'Oui, sur rushes partagés.', en: 'Yes, from shared rushes.' },
 *
 * L'ordre des clés est l'ordre d'affichage. Chaque clé a son intitulé dans
 * src/i18n/strings.js (`contactPage.<clé>`). Après une modification, mettre
 * à jour la date de '/contact' dans src/lib/page-dates.js.
 *
 * @type {Record<'turnaround' | 'remote' | 'deliverables' | 'review' | 'travel', { fr: string, en: string } | null>}
 */
export const PRACTICAL = {
  /** Délais habituels (ours, version finale). */
  turnaround: null,
  /** Travail à distance ou sur place. */
  remote: null,
  /** Formats livrés (masters, déclinaisons réseaux sociaux, sous-titres...). */
  deliverables: null,
  /** Outils de validation (Frame.io, Vimeo review...). */
  review: null,
  /** Déplacements (France, étranger, conditions). */
  travel: null,
};
