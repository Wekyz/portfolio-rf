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
// `with { type: 'json' }` : attribut d'import standard. Vite le comprend, mais
// surtout il rend ce module chargeable tel quel par Node - sans lui, un
// `import` depuis node:test échouait et cette logique restait non testée.
import vimeoThumbs from '../data/vimeo-thumbs.json' with { type: 'json' };
import localImages from '../data/local-images.json' with { type: 'json' };

// Les trois fonctions acceptent en dernier paramètre le cache à consulter, qui
// vaut par défaut celui du build. Ça n'a aucun effet sur les appelants, mais ça
// permet aux tests de fournir leurs propres données : sans ça, ils porteraient
// sur ce que l'API Vimeo a renvoyé le jour du dernier build, et changeraient de
// résultat au gré des ré-uploads.

// Date d'upload réelle (UTC, ISO 8601) résolue au build via l'API oEmbed -
// voir scripts/fetch-thumbs.mjs. Utilisée par le JSON-LD VideoObject
// (Base.astro) comme `uploadDate`.
export function getUploadDate(p, vimeo = vimeoThumbs) {
  return p.id ? vimeo[p.id]?.uploadDate ?? null : null;
}

// Durée ISO 8601 (ex. "PT1M33S") pour le JSON-LD VideoObject (Base.astro) -
// affiche un badge de durée dans les résultats vidéo Google. Secondes
// résolues au build via l'API oEmbed (voir scripts/fetch-thumbs.mjs).
export function getDuration(p, vimeo = vimeoThumbs) {
  const seconds = p.id ? vimeo[p.id]?.durationSeconds : null;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s || (!h && !m) ? `${s}S` : ''}`;
}

export function resolveThumb(p, { vimeo = vimeoThumbs, local = localImages } = {}) {
  const localThumb = p.thumb ? (p.thumb.startsWith('/') ? p.thumb : `/${p.thumb}`) : null;
  const vimeoBase = !localThumb && p.id ? vimeo[p.id]?.thumbBase : null;

  if (localThumb && localThumb.endsWith('.webp')) {
    // Descripteurs issus des largeurs réellement mesurées au build (voir
    // measureCandidates dans scripts/fetch-thumbs.mjs). L'ancienne version
    // écrivait des largeurs fixes - dont un `1920w` sur toutes les images de
    // base alors qu'une seule l'était - et le navigateur choisissait donc un
    // fichier plus petit que promis avant de l'étirer.
    const entry = local[localThumb];
    if (entry?.candidates?.length) {
      const largest = entry.candidates[entry.candidates.length - 1];
      return {
        src: largest.src,
        // Une seule taille disponible : pas de srcset, il n'y aurait rien à
        // arbitrer et le descripteur ne ferait que du bruit.
        srcset:
          entry.candidates.length > 1
            ? entry.candidates.map((c) => `${c.src} ${c.width}w`).join(', ')
            : undefined,
        responsive: entry.candidates.length > 1,
      };
    }
    // Image posée après le dernier build : servie telle quelle plutôt que
    // d'inventer des variantes qui n'existent pas encore.
    return { src: localThumb, srcset: undefined, responsive: false };
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
