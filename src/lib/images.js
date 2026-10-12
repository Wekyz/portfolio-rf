/**
 * Images locales du site, traitées par astro:assets au build (OPT-01).
 *
 * Deux familles :
 *  - src/assets/live/ : vignettes posées à la main dans le CMS (champ
 *    « Miniature », ex. `live/live1.webp`) - photos de captation, affiche ;
 *  - src/assets/brands/ : logos du bandeau de la page À propos.
 *
 * Elles vivaient dans public/, servies sous leur nom (donc avec un cache de
 * sept jours seulement) et déclinées par environ 200 lignes maison de
 * scripts/fetch-thumbs.mjs. Astro produit maintenant les variantes, en WebP
 * et en AVIF (45 % plus léger, mesuré sur ces fichiers), sous des noms à
 * empreinte servis depuis /_astro/ avec un cache d'un an.
 *
 * Module réservé au build : `import.meta.glob` et `astro:assets` n'existent
 * que sous Vite. Les fonctions pures (lib/thumb.js, lib/project-page.js)
 * reçoivent ces données en paramètre, ce qui les garde testables sous Node.
 */
import { getImage } from 'astro:assets';

/** @typedef {{ src: string, width: number }} Candidate */
/**
 * @typedef {{ width: number, height: number, candidates: Candidate[], avifCandidates: Candidate[] }} LocalImage
 */

const live = import.meta.glob('../assets/live/*.{webp,jpg,jpeg,png}', { eager: true, import: 'default' });
const brands = import.meta.glob('../assets/brands/*.{webp,png}', { eager: true, import: 'default' });

/** Largeurs servies pour une vignette, plus la largeur d'origine. */
const THUMB_WIDTHS = [640, 960, 1280];

/** Variantes d'une image aux largeurs données, dans un format. */
async function variants(meta, widths, format) {
  const out = await Promise.all(widths.map((width) => getImage({ src: meta, width, format })));
  return out.map((img, i) => ({ src: img.src, width: widths[i] }));
}

/**
 * Vignettes locales, indexées par le chemin public historique (`/live/x.webp`)
 * que le champ « Miniature » du CMS écrit : rien ne change pour la monteuse.
 *
 * @type {Record<string, LocalImage>}
 */
export const localImages = Object.fromEntries(
  await Promise.all(
    Object.entries(live).map(async ([path, meta]) => {
      const widths = [...THUMB_WIDTHS.filter((w) => w < meta.width), meta.width];
      const [candidates, avifCandidates] = await Promise.all([
        variants(meta, widths, 'webp'),
        variants(meta, widths, 'avif'),
      ]);
      return [`/live/${path.split('/').pop()}`, { width: meta.width, height: meta.height, candidates, avifCandidates }];
    })
  )
);

/** Hauteur d'affichage des logos (.brand-logo img dans styles.css). */
const BRAND_HEIGHT = 32;

/**
 * Logos du bandeau, par slug (voir BRANDS dans data/profile.js) : deux
 * densités (64 et 96 px de haut pour un affichage à 32), en WebP et en AVIF.
 * `width`/`height` fixent le ratio et évitent un saut de mise en page.
 *
 * @type {Record<string, { src: string, srcset: string, avifSrcset: string, width: number, height: number }>}
 */
export const brandImages = Object.fromEntries(
  await Promise.all(
    Object.entries(brands).map(async ([path, meta]) => {
      const slug = path.split('/').pop().replace(/\.[a-z]+$/, '');
      const densities = [2, 3];
      const at = (d, format) => getImage({ src: meta, height: BRAND_HEIGHT * d, format });
      const [webp, avif] = await Promise.all(
        ['webp', 'avif'].map((format) => Promise.all(densities.map((d) => at(d, format))))
      );
      const width = Math.round((meta.width * BRAND_HEIGHT * 2) / meta.height);
      return [
        slug,
        {
          src: webp[0].src,
          srcset: webp.map((img, i) => `${img.src} ${densities[i]}x`).join(', '),
          avifSrcset: avif.map((img, i) => `${img.src} ${densities[i]}x`).join(', '),
          width,
          height: BRAND_HEIGHT * 2,
        },
      ];
    })
  )
);
