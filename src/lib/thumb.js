/**
 * Résout la source d'une miniature projet (src + srcset responsive).
 *
 * Priorité :
 *  1. `thumb` du projet, si renseigné (override manuel : affiche de film,
 *     image live) - fichier local sous public/, variantes -640/-1280/(base).
 *  2. sinon, servie directement depuis le CDN Vimeo (i.vimeocdn.com) à la
 *     largeur voulue - voir scripts/fetch-thumbs.mjs pour la résolution de
 *     l'URL de base au build.
 *
 * Utilisé à la fois par WorkItem.astro (grille) et Base.astro (preload LCP +
 * données structurées VideoObject) : une seule source de vérité.
 */
import vimeoThumbs from '../data/vimeo-thumbs.json';

// Date d'upload réelle (UTC, ISO 8601) résolue au build via l'API oEmbed -
// voir scripts/fetch-thumbs.mjs. Utilisée par le JSON-LD VideoObject
// (Base.astro) comme `uploadDate`.
export function getUploadDate(p) {
  return p.id ? vimeoThumbs[p.id]?.uploadDate ?? null : null;
}

// Durée ISO 8601 (ex. "PT1M33S") pour le JSON-LD VideoObject (Base.astro) -
// affiche un badge de durée dans les résultats vidéo Google. Secondes
// résolues au build via l'API oEmbed (voir scripts/fetch-thumbs.mjs).
export function getDuration(p) {
  const seconds = p.id ? vimeoThumbs[p.id]?.durationSeconds : null;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s || (!h && !m) ? `${s}S` : ''}`;
}

export function resolveThumb(p) {
  const localThumb = p.thumb ? (p.thumb.startsWith('/') ? p.thumb : `/${p.thumb}`) : null;
  const vimeoBase = !localThumb && p.id ? vimeoThumbs[p.id]?.thumbBase : null;

  if (localThumb && localThumb.endsWith('.webp')) {
    const base = localThumb.replace(/\.webp$/, '');
    return {
      src: localThumb,
      srcset: `${base}-640.webp 640w, ${base}-960.webp 960w, ${base}-1280.webp 1280w, ${localThumb} 1920w`,
      responsive: true,
    };
  }

  if (vimeoBase) {
    return {
      src: `${vimeoBase}_1280?region=us`,
      // Le CDN Vimeo redimensionne à la volée : le palier -960 (ajouté ici,
      // rien à générer) comble l'écart entre 640 et 1280 qui forçait le
      // navigateur à choisir 1280 pour des vignettes affichées ~700-950px
      // (surpoids repéré par PageSpeed Insights).
      srcset: `${vimeoBase}_640?region=us 640w, ${vimeoBase}_960?region=us 960w, ${vimeoBase}_1280?region=us 1280w, ${vimeoBase}_1920?region=us 1920w`,
      responsive: true,
    };
  }

  return { src: localThumb, srcset: undefined, responsive: false };
}
