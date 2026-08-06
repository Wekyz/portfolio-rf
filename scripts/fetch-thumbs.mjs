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
import { readFile, writeFile, appendFile, mkdir, access, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data', 'videos.json');
const CACHE_FILE = join(ROOT, 'src', 'data', 'vimeo-thumbs.json');
const LOCAL_CACHE_FILE = join(ROOT, 'src', 'data', 'local-images.json');
const BRANDS_CACHE_FILE = join(ROOT, 'src', 'data', 'brands.json');
const LIVE_DIR = join(ROOT, 'public', 'live');
const BRANDS_DIR = join(ROOT, 'public', 'brands');

// Variantes responsive générées pour les images posées à la main (public/live/).
const VARIANTS = [
  { suffix: '-1280', width: 1280, quality: 82 },
  { suffix: '-960', width: 960, quality: 80 },
  { suffix: '-640', width: 640, quality: 78 },
];
const VARIANT_RE = /-(?:1280|960|640)\.webp$/;

// Logos de marques (public/brands/) : affichés à 32 px de haut (.brand-logo img
// dans styles.css). Les fichiers d'origine font tous 160 px, soit 5x la taille
// utile. On génère les deux densités réellement servies - 64 px pour un écran
// 2x, 96 px pour un 3x - et le `srcset` d'About.astro laisse le navigateur
// choisir. L'original 160 px reste la source de regénération, il n'est jamais
// demandé par le navigateur.
const BRAND_VARIANTS = [
  { suffix: '-64', height: 64, quality: 88 },
  { suffix: '-96', height: 96, quality: 88 },
];
const BRAND_VARIANT_RE = /-(?:64|96)\.webp$/;

// Domaine autorisé pour les vidéos privées Vimeo (restreintes par domaine).
// Vimeo ne renvoie la miniature que si la requête oEmbed provient de ce domaine.
const SITE_DOMAIN = process.env.SITE_DOMAIN || 'https://roxane-foare.com';

// Reconnaît le suffixe de largeur Vimeo (`..._1280` ou `..._1280?region=us`)
// pour en extraire l'URL de base, à laquelle on rajoute ensuite la largeur
// voulue (voir WorkItem.astro).
const WIDTH_SUFFIX_RE = /_\d+(\?.*)?$/;

/**
 * Ajoute une ligne au résumé de job GitHub Actions, quand il existe.
 * Le nombre de miniatures résolues n'apparaissait que dans les journaux,
 * qu'il faut penser à ouvrir : ici, il est visible depuis la liste des runs.
 */
async function summarize(line) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  try {
    await appendFile(file, line + '\n');
  } catch {
    // Un résumé qui échoue ne doit pas faire tomber le build.
  }
}

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
  // `duration` (secondes) est déjà présent dans la même réponse oEmbed -
  // convertie en ISO 8601 (Base.astro) pour le JSON-LD VideoObject.
  const durationSeconds = Number.isFinite(data.duration) ? data.duration : null;
  return { thumbBase, uploadDate, durationSeconds };
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

/**
 * Icône d'écran d'accueil iOS, 180x180, rendue depuis favicon.svg.
 *
 * L'attribut `apple-touch-icon` annonçait 180x180 mais pointait vers un
 * favicon de 64x64 : iOS agrandissait une image quatre fois trop petite.
 *
 * Fond opaque volontaire : une icône transparente est composée sur du noir
 * par iOS. La marge évite que le monogramme touche les coins arrondis que le
 * système applique par-dessus.
 */
async function ensureAppleIcon() {
  const out = join(ROOT, 'public', 'apple-touch-icon.png');
  if (await exists(out)) return false;
  const svg = await readFile(join(ROOT, 'public', 'favicon.svg'));
  const glyphe = await sharp(svg, { density: 600 })
    .resize(148, 148, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 180, height: 180, channels: 4, background: { r: 250, g: 250, b: 248, alpha: 1 } },
  })
    .composite([{ input: glyphe, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(out);
  return true;
}

async function ensureBrandVariants(dir) {
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return { made: 0, kept: 0 };
  }
  let made = 0;
  let kept = 0;
  for (const name of files) {
    if (!name.endsWith('.webp') || BRAND_VARIANT_RE.test(name)) continue;
    let src = null;
    for (const { suffix, height, quality } of BRAND_VARIANTS) {
      const variant = join(dir, name.replace(/\.webp$/, `${suffix}.webp`));
      if (await exists(variant)) {
        kept++;
        continue;
      }
      try {
        if (!src) src = await readFile(join(dir, name));
        const out = await sharp(src)
          .resize({ height, withoutEnlargement: true })
          .webp({ quality })
          .toBuffer();
        await writeFile(variant, out);
        made++;
      } catch (err) {
        console.warn(`  ⚠ logo ${suffix} échoué ${name} : ${err.message}`);
      }
    }
  }
  return { made, kept };
}

/**
 * Mesure la largeur RÉELLE de chaque image d'un dossier et regroupe, pour
 * chaque image de base, la liste des candidats exploitables.
 *
 * Sans ça, `thumb.js` annonçait des largeurs inventées : un `1920w` figé pour
 * toutes les images de base alors qu'une seule les fait réellement, et des
 * variantes `-1280`/`-960` déclarées telles quelles bien que `withoutEnlargement`
 * les ait laissées à la taille de l'original. Le navigateur téléchargeait donc
 * un fichier plus petit que promis, puis l'étirait.
 *
 * À largeur égale on garde le fichier le plus léger, ce qui élimine au passage
 * les doublons (l'original de live4 pèse 82 Ko pour exactement les mêmes pixels
 * que sa variante -1280 à 78 Ko).
 */
async function measureCandidates(dir, urlPrefix) {
  let files;
  try {
    files = await readdir(dir);
  } catch {
    return {};
  }
  const webp = files.filter((f) => f.endsWith('.webp'));
  const measured = new Map();
  for (const name of webp) {
    try {
      const path = join(dir, name);
      const buf = await readFile(path);
      const { width, height } = await sharp(buf).metadata();
      measured.set(name, { width, height, bytes: buf.length });
    } catch (err) {
      console.warn(`  ⚠ mesure impossible ${name} : ${err.message}`);
    }
  }

  const out = {};
  for (const name of webp) {
    if (VARIANT_RE.test(name)) continue;
    const base = measured.get(name);
    if (!base) continue;
    const stem = name.replace(/\.webp$/, '');
    const family = [name, ...VARIANTS.map((v) => `${stem}${v.suffix}.webp`)];

    const byWidth = new Map();
    for (const f of family) {
      const m = measured.get(f);
      if (!m) continue;
      const kept = byWidth.get(m.width);
      if (!kept || m.bytes < kept.bytes) byWidth.set(m.width, { src: `${urlPrefix}${f}`, ...m });
    }
    out[`${urlPrefix}${name}`] = {
      width: base.width,
      height: base.height,
      candidates: [...byWidth.values()]
        .sort((a, b) => a.width - b.width)
        .map(({ src, width }) => ({ src, width })),
    };
  }
  return out;
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
  await summarize(`Miniatures Vimeo : **${resolved}** résolue(s), **${failed}** échec(s).`);

  // Échec TOTAL : plus aucune miniature ne se résout. Le repli sur le cache
  // précédent couvre les incidents ponctuels, mais un zéro pointé signale
  // autre chose - Vimeo qui durcit sa restriction de domaine, une clé
  // révoquée, un changement d'API. Sans ce garde-fou, le build passait quand
  // même et le site partait avec des miniatures manquantes.
  const attendus = videos.filter((v) => v.id && !v.thumb).length;
  if (attendus > 0 && resolved === 0) {
    console.error(
      `\n[thumbs] ERREUR : aucune des ${attendus} miniatures n'a pu être résolue.\n` +
        "         Un échec partiel reste toléré, un échec total ne l'est pas :\n" +
        '         le site partirait sans vignettes. Build interrompu.\n'
    );
    process.exit(1);
  }

  const vl = await ensureVariants(LIVE_DIR);
  console.log(`[variants] ${vl.made} générée(s), ${vl.kept} déjà présente(s).`);

  // Largeurs réelles des images locales -> descripteurs srcset exacts.
  const local = await measureCandidates(LIVE_DIR, '/live/');
  await writeFile(LOCAL_CACHE_FILE, JSON.stringify(local, null, 2) + '\n');
  const nCand = Object.values(local).reduce((a, e) => a + e.candidates.length, 0);
  console.log(`[srcset] ${Object.keys(local).length} image(s) locale(s), ${nCand} candidat(s) mesuré(s).`);

  if (await ensureAppleIcon()) console.log('[icone] apple-touch-icon.png (180x180) régénérée.');

  const bl = await ensureBrandVariants(BRANDS_DIR);
  console.log(`[logos] ${bl.made} variante(s) générée(s), ${bl.kept} déjà présente(s).`);

  // Dimensions du fichier 64 px : servent d'attributs width/height (donc de
  // ratio) sur les <img> du bandeau, pour éviter tout saut de mise en page.
  const brands = {};
  for (const [name, info] of Object.entries(await measureCandidates(BRANDS_DIR, '/brands/'))) {
    const slug = name.replace('/brands/', '').replace(/\.webp$/, '');
    if (BRAND_VARIANT_RE.test(`${slug}.webp`)) continue;
    try {
      const meta = await sharp(await readFile(join(BRANDS_DIR, `${slug}-64.webp`))).metadata();
      brands[slug] = { width: meta.width, height: meta.height };
    } catch {
      brands[slug] = { width: info.width, height: info.height };
    }
  }
  await writeFile(BRANDS_CACHE_FILE, JSON.stringify(brands, null, 2) + '\n');
  console.log(`[logos] ${Object.keys(brands).length} dimension(s) enregistrée(s).`);
}

main().catch((err) => {
  console.error('[thumbs] erreur fatale :', err);
  // Build non bloqué par un souci réseau ponctuel
  process.exit(0);
});
