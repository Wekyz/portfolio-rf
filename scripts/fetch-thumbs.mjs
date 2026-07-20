/**
 * Résout, pour chaque vidéo Vimeo de videos.json, l'URL de base de sa
 * miniature sur le CDN Vimeo (i.vimeocdn.com) et sa date d'upload réelle, via
 * l'API oEmbed.
 *
 * On ne télécharge plus l'image et on ne la recompresse plus (ancien pipeline
 * sharp -> WebP) : le CDN Vimeo sert déjà l'image à la volée dans la largeur
 * demandée (suffixe `_<largeur>` dans l'URL), avec une bien meilleure qualité
 * qu'une double compression locale. WorkItem.astro construit directement le
 * `srcset` à partir de cette URL de base (voir src/data/vimeo-thumbs.json).
 *
 * La date d'upload (`upload_date` de la réponse oEmbed, en UTC) sert de
 * `uploadDate` aux données structurées VideoObject (Base.astro) - remplace
 * l'ancien `${year}-01-01` sans heure ni fuseau, que Google Search Console
 * signalait (uploadDate incomplet/incorrect).
 *
 * Conséquence côté monteuse : elle saisit seulement l'ID Vimeo (+ hash si
 * vidéo privée) dans le CMS - la miniature suit automatiquement, sans fichier
 * à produire ni à committer.
 *
 * Les vidéos avec un champ `thumb` rempli (override manuel, ex. affiche de
 * film ou image live) ne sont pas concernées : ce champ reste prioritaire.
 *
 * Lancé automatiquement avant `dev` et `build` (voir package.json). Résolu à
 * chaque run (simples appels JSON, pas de traitement d'image) pour rester
 * synchronisé si la vignette change côté Vimeo.
 *
 * Les images posées à la main dans public/live/ gardent leur propre pipeline
 * de variantes responsive (sharp), inchangé.
 */
import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data', 'videos.json');
const CACHE_FILE = join(ROOT, 'src', 'data', 'vimeo-thumbs.json');
const LIVE_DIR = join(ROOT, 'public', 'live');

// Variantes responsive générées pour les images posées à la main (public/live/).
const VARIANTS = [
  { suffix: '-1280', width: 1280, quality: 82 },
  { suffix: '-960', width: 960, quality: 80 },
  { suffix: '-640', width: 640, quality: 78 },
];
const VARIANT_RE = /-(?:1280|960|640)\.webp$/;

// Domaine autorisé pour les vidéos privées Vimeo (restreintes par domaine).
// Vimeo ne renvoie la miniature que si la requête oEmbed provient de ce domaine.
const SITE_DOMAIN = process.env.SITE_DOMAIN || 'https://roxane-foare.com';

// Reconnaît le suffixe de largeur Vimeo (`..._1280` ou `..._1280?region=us`)
// pour en extraire l'URL de base, à laquelle on rajoute ensuite la largeur
// voulue (voir WorkItem.astro).
const WIDTH_SUFFIX_RE = /_\d+(\?.*)?$/;

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function oembedUrl(id, hash) {
  const videoUrl = hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`;
  return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}&width=1920`;
}

// Vimeo renvoie `upload_date` en UTC, format "YYYY-MM-DD HH:MM:SS" (pas de
// suffixe de fuseau) - on le convertit en ISO 8601 complet ("Z" = UTC).
function toIsoUtc(uploadDate) {
  if (!uploadDate) return null;
  const iso = uploadDate.replace(' ', 'T') + 'Z';
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

async function resolveThumbInfo(id, hash) {
  const res = await fetch(oembedUrl(id, hash), {
    // Referer/Origin du domaine autorisé : indispensable pour que Vimeo
    // renvoie la miniature des vidéos privées restreintes par domaine.
    headers: {
      'User-Agent': 'Mozilla/5.0 (roxane-foare-build)',
      Referer: SITE_DOMAIN,
      Origin: SITE_DOMAIN,
    },
  });
  if (!res.ok) throw new Error(`oEmbed HTTP ${res.status}`);
  const data = await res.json();
  const url = data.thumbnail_url;
  if (!url) {
    const status = data.domain_status_code;
    throw new Error(
      status && status !== 200
        ? `vidéo privée restreinte (domain_status ${status}) - vérifier que ${SITE_DOMAIN} est autorisé sur Vimeo`
        : 'thumbnail_url absent de la réponse oEmbed'
    );
  }
  if (!WIDTH_SUFFIX_RE.test(url)) {
    throw new Error(`format d'URL Vimeo inattendu : ${url}`);
  }
  // Retire le suffixe de largeur (`_1280?region=us` -> ``) pour ne garder
  // que la base, à laquelle WorkItem.astro rajoute la largeur voulue.
  const thumbBase = url.replace(WIDTH_SUFFIX_RE, '');
  const uploadDate = toIsoUtc(data.upload_date);
  return { thumbBase, uploadDate };
}

async function ensureVariants(dir) {
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return { made: 0, kept: 0 };
  }
  let made = 0;
  let kept = 0;
  for (const name of files) {
    if (!name.endsWith('.webp') || VARIANT_RE.test(name)) continue;
    let src = null;
    for (const { suffix, width, quality } of VARIANTS) {
      const variant = join(dir, name.replace(/\.webp$/, `${suffix}.webp`));
      if (await exists(variant)) {
        kept++;
        continue;
      }
      try {
        if (!src) src = await readFile(join(dir, name));
        const out = await sharp(src)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();
        await writeFile(variant, out);
        made++;
      } catch (err) {
        console.warn(`  ⚠ variante ${suffix} échouée ${name} : ${err.message}`);
      }
    }
  }
  return { made, kept };
}

async function main() {
  const raw = JSON.parse(await readFile(DATA, 'utf8'));
  const videos = raw.videos || raw;
  await mkdir(dirname(CACHE_FILE), { recursive: true });

  let previous = {};
  if (await exists(CACHE_FILE)) {
    try {
      previous = JSON.parse(await readFile(CACHE_FILE, 'utf8'));
    } catch {
      previous = {};
    }
  }

  const cache = {};
  let resolved = 0;
  let failed = 0;

  for (const v of videos) {
    if (!v.id || v.thumb) continue; // pas d'ID Vimeo, ou override manuel -> rien à faire
    try {
      cache[v.id] = await resolveThumbInfo(v.id, v.hash);
      resolved++;
    } catch (err) {
      failed++;
      // On retombe sur la dernière info connue plutôt que de perdre la
      // miniature/date pour un souci réseau ponctuel.
      if (previous[v.id]) {
        cache[v.id] = previous[v.id];
        console.warn(`  ⚠ miniature ${v.id} (${v.title}) : ${err.message} - garde les infos précédentes`);
      } else {
        console.warn(`  ⚠ échec miniature ${v.id} (${v.title}) : ${err.message}`);
      }
    }
  }

  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2) + '\n');
  console.log(`[thumbs] ${resolved} vidéo(s) résolue(s), ${failed} échec(s).`);

  const vl = await ensureVariants(LIVE_DIR);
  console.log(`[variants] ${vl.made} générée(s), ${vl.kept} déjà présente(s).`);
}

main().catch((err) => {
  console.error('[thumbs] erreur fatale :', err);
  // Build non bloqué par un souci réseau ponctuel
  process.exit(0);
});
