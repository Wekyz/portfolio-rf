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
