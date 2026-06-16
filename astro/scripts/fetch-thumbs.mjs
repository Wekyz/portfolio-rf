/**
 * Génère automatiquement les miniatures Vimeo au build.
 *
 * Pour chaque vidéo de videos.json qui a un `id` Vimeo, on s'assure qu'un
 * fichier public/thumbs/<id>.webp existe. S'il manque, on le récupère via
 * l'API oEmbed de Vimeo (compatible vidéos privées via le `hash`), puis on le
 * convertit en WebP avec sharp.
 *
 * Conséquence côté monteuse : elle saisit seulement l'ID Vimeo (+ hash si
 * vidéo privée) dans le CMS — la miniature apparaît toute seule, sans qu'elle
 * (ni toi) ait à produire ou uploader une image.
 *
 * Les fichiers déjà présents ne sont jamais réécrasés : une miniature posée à
 * la main (ex. une affiche de film) reste prioritaire.
 *
 * Lancé automatiquement avant `dev` et `build` (voir package.json).
 */
import { readFile, writeFile, mkdir, access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data', 'videos.json');
const THUMBS_DIR = join(ROOT, 'public', 'thumbs');
const LIVE_DIR = join(ROOT, 'public', 'live');
const THUMB_WIDTH = 1280; // largeur demandée à Vimeo
const VARIANT_WIDTH = 640; // variante "mobile" pour le srcset responsive
const VARIANT_SUFFIX = '-640'; // ex. 1234.webp -> 1234-640.webp
// Domaine autorisé pour les vidéos privées Vimeo (restreintes par domaine).
// Vimeo ne renvoie la miniature que si la requête provient de ce domaine.
const SITE_DOMAIN = process.env.SITE_DOMAIN || 'https://roxane-foare.com';

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/** Construit l'URL oEmbed (gère les vidéos privées avec hash). */
function oembedUrl(id, hash) {
  const videoUrl = hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`;
  return `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(videoUrl)}&width=${THUMB_WIDTH}`;
}

async function fetchThumb(id, hash) {
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
        ? `vidéo privée restreinte (domain_status ${status}) — vérifier que ${SITE_DOMAIN} est autorisé sur Vimeo`
        : 'thumbnail_url absent de la réponse oEmbed'
    );
  }

  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`image HTTP ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());

  // Plafonne la résolution : Vimeo renvoie parfois du 4K, inutilement lourd
  // pour des vignettes. On borne la largeur et on ré-encode en WebP.
  return sharp(buf)
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Génère, pour chaque image .webp d'un dossier, une variante de largeur réduite
 * (`<nom>-640.webp`) destinée au `srcset` responsive. Les variantes déjà
 * présentes ne sont jamais réécrites. Couvre aussi bien les miniatures
 * auto-générées que les images posées à la main (affiches, live).
 */
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
    if (!name.endsWith('.webp') || name.includes(`${VARIANT_SUFFIX}.`)) continue;
    const variant = join(dir, name.replace(/\.webp$/, `${VARIANT_SUFFIX}.webp`));
    if (await exists(variant)) {
      kept++;
      continue;
    }
    try {
      const src = await readFile(join(dir, name));
      const out = await sharp(src)
        .resize({ width: VARIANT_WIDTH, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      await writeFile(variant, out);
      made++;
    } catch (err) {
      console.warn(`  ⚠ variante 640 échouée ${name} : ${err.message}`);
    }
  }
  return { made, kept };
}

async function main() {
  const raw = JSON.parse(await readFile(DATA, 'utf8'));
  const videos = raw.videos || raw;
  await mkdir(THUMBS_DIR, { recursive: true });

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const v of videos) {
    if (!v.id) continue; // pas d'ID Vimeo (vidéos Live) -> rien à faire
    const target = join(THUMBS_DIR, `${v.id}.webp`);

    if (await exists(target)) {
      skipped++;
      continue;
    }

    try {
      const webp = await fetchThumb(v.id, v.hash);
      await writeFile(target, webp);
      generated++;
      console.log(`  ✓ miniature générée : thumbs/${v.id}.webp  (${v.title})`);
    } catch (err) {
      failed++;
      // On ne casse pas le build : la vignette s'affichera sans image (fond gris)
      console.warn(`  ⚠ échec miniature ${v.id} (${v.title}) : ${err.message}`);
    }
  }

  console.log(
    `[thumbs] ${generated} générée(s), ${skipped} déjà présente(s), ${failed} échec(s).`
  );

  // Variantes responsive 640px pour thumbs + live.
  const vt = await ensureVariants(THUMBS_DIR);
  const vl = await ensureVariants(LIVE_DIR);
  console.log(
    `[variants] ${vt.made + vl.made} générée(s), ${vt.kept + vl.kept} déjà présente(s).`
  );
}

main().catch((err) => {
  console.error('[thumbs] erreur fatale :', err);
  // Build non bloqué par un souci réseau ponctuel
  process.exit(0);
});
