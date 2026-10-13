/**
 * Résout la source d'une miniature projet (src + srcset responsive).
 *
 * Priorité :
 *  1. `thumb` du projet, si renseigné (override manuel : affiche de film,
 *     image live) - fichier de src/assets/live/, décliné par astro:assets
 *     (voir lib/images.js), en WebP et en AVIF.
 *  2. sinon, servie directement depuis le CDN Vimeo (i.vimeocdn.com) à la
 *     largeur voulue - voir scripts/fetch-thumbs.mjs pour la résolution de
 *     l'URL de base au build.
 *
 * Utilisé à la fois par WorkItem.astro (grille) et Base.astro (preload LCP +
 * données structurées VideoObject) : une seule source de vérité.
 */
// `with { type: 'json' }` : attribut d'import standard. Vite le comprend, mais
// surtout il rend ce module chargeable tel quel par Node - sans lui, un
// `import` depuis node:test échouait et cette logique restait non testée.
import vimeoThumbs from '../data/vimeo-thumbs.json' with { type: 'json' };
// Les fonctions acceptent en dernier paramètre le cache à consulter, qui vaut
// par défaut celui du build (sauf `local`, fourni par lib/images.js, que Node
// ne peut pas charger : les composants le passent, les tests aussi). Ça n'a aucun effet sur les appelants, mais ça
// permet aux tests de fournir leurs propres données : sans ça, ils porteraient
// sur ce que l'API Vimeo a renvoyé le jour du dernier build, et changeraient de
// résultat au gré des ré-uploads.

// Date d'upload réelle (UTC, ISO 8601) résolue au build via l'API oEmbed -
// voir scripts/fetch-thumbs.mjs. Utilisée par le JSON-LD VideoObject
// (Base.astro) comme `uploadDate`.
export function getUploadDate(p, vimeo = vimeoThumbs) {
  return p.id ? vimeo[p.id]?.uploadDate ?? null : null;
}

export function resolveThumb(p, { vimeo = vimeoThumbs, local = {} } = {}) {
  const localThumb = p.thumb ? (p.thumb.startsWith('/') ? p.thumb : `/${p.thumb}`) : null;
  const vimeoBase = !localThumb && p.id ? vimeo[p.id]?.thumbBase : null;

  if (localThumb) {
    // Descripteurs issus des largeurs réellement produites au build (voir
    // lib/images.js). Une ancienne version écrivait des largeurs fixes - dont
    // un `1920w` sur toutes les images de base alors qu'une seule l'était - et
    // le navigateur choisissait un fichier plus petit que promis.
    const entry = local[localThumb];
    if (entry?.candidates?.length) {
      const largest = entry.candidates[entry.candidates.length - 1];
      return {
        src: largest.src,
        // Dimensions réelles, mesurées au build : elles permettent à un cadre
        // qui épouse l'image (vignette « affiche ») de réserver sa hauteur
        // avant chargement, sans style inline - que la CSP interdit.
        width: entry.width,
        height: entry.height,
        // Une seule taille disponible : pas de srcset, il n'y aurait rien à
        // arbitrer et le descripteur ne ferait que du bruit.
        srcset:
          entry.candidates.length > 1
            ? entry.candidates.map((c) => `${c.src} ${c.width}w`).join(', ')
            : undefined,
        // Même jeu de largeurs en AVIF, proposé en <source> (voir Thumb.astro).
        avifSrcset: entry.avifCandidates?.length
          ? entry.avifCandidates.map((c) => `${c.src} ${c.width}w`).join(', ')
          : undefined,
        responsive: entry.candidates.length > 1,
      };
    }
    // Chemin qui ne correspond à aucun fichier de src/assets/live/ (faute de
    // frappe dans le CMS, image pas encore déposée) : pas d'image plutôt
    // qu'une image cassée. La vignette garde son cadre et son titre.
    return { src: undefined, srcset: undefined, responsive: false };
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
