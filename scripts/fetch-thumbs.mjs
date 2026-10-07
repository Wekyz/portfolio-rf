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
 * Un champ `thumb` rempli (override manuel, ex. affiche de film) reste
 * prioritaire pour l'image, mais n'empêche pas l'appel : la réponse oEmbed
 * porte aussi la date de publication et la durée, que rien d'autre ne fournit.
 * Les avoir écartées avec la miniature faisait retomber la page projet sur une
 * date de repli et privait le sitemap vidéo de sa durée, sans rien signaler.
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
import { createHash } from 'node:crypto';
import { buildSlugMap } from '../src/lib/slug.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data', 'videos.json');
const CACHE_FILE = join(ROOT, 'src', 'data', 'vimeo-thumbs.json');
const LOCAL_CACHE_FILE = join(ROOT, 'src', 'data', 'local-images.json');
const BRANDS_CACHE_FILE = join(ROOT, 'src', 'data', 'brands.json');
const DATES_FILE = join(ROOT, 'src', 'data', 'content-dates.json');
const LIVE_DIR = join(ROOT, 'public', 'live');
// Sources des logos (160 px) hors de public/ : elles ne sont jamais servies -
// seules les densités -64/-96 le sont - et les laisser là revenait à déployer
// 545 Ko que personne ne demande jamais. `public/` veut dire « publié ».
const BRANDS_SRC_DIR = join(ROOT, 'assets', 'brands-src');
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

// Appels oEmbed. Ils partaient un par un et sans délai d'expiration : une
// réponse de Vimeo qui n'arrivait jamais figeait le build jusqu'à la limite de
// Vercel (45 minutes). Chaque appel est désormais abandonné au bout de 8 s -
// le repli sur le cache versionné prend alors le relais pour cette vidéo - et
// six partent en même temps, assez pour diviser la durée sans ressembler à un
// balayage aux yeux de Vimeo.
const OEMBED_TIMEOUT_MS = 8_000;
const OEMBED_CONCURRENCY = 6;

/**
 * `fn` appliquée à chaque élément, au plus `limit` à la fois. Les résultats
 * reviennent dans l'ordre de `items`, quel que soit l'ordre d'arrivée : le
 * cache écrit et les journaux restent donc identiques d'un build à l'autre.
 */
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Erreur due au réseau (DNS, connexion, délai dépassé) plutôt qu'au contenu
 * du dépôt. Sert à décider si le build peut continuer sur les caches.
 */
const NETWORK_CODES = new Set([
  'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_SOCKET',
]);
function isNetworkError(err) {
  if (!err) return false;
  if (err.name === 'TimeoutError' || err.name === 'AbortError') return true;
  if (err instanceof TypeError && err.message === 'fetch failed') return true;
  return NETWORK_CODES.has(err.code) || NETWORK_CODES.has(err.cause?.code);
}

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
    signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS),
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
  let skipped = 0;
  for (const name of files) {
    if (!name.endsWith('.webp') || VARIANT_RE.test(name)) continue;
    let src = null;
    let srcWidth = null;
    for (const { suffix, width, quality } of VARIANTS) {
      const variant = join(dir, name.replace(/\.webp$/, `${suffix}.webp`));

      // `withoutEnlargement` produisait une copie de l'original quand celui-ci
      // était déjà plus étroit que la cible : trois fichiers de 800x450 pour
      // live3, dont deux que personne ne demandait. Le correctif P-03 les
      // avait écartés du srcset ; ils continuaient d'être générés et
      // déployés. On ne les fabrique plus du tout - la base sert alors de
      // plus grand palier, ce qu'elle est réellement.
      if (srcWidth === null) {
        if (!src) src = await readFile(join(dir, name));
        srcWidth = (await sharp(src).metadata()).width ?? 0;
      }
      if (srcWidth <= width) {
        skipped++;
        continue;
      }

      if (await exists(variant)) {
        kept++;
        continue;
      }
      try {
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
  return { made, kept, skipped };
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

/**
 * favicon.ico (16, 32 et 48 px), rendu depuis favicon.svg.
 *
 * Des clients le demandent à la racine sans lire les <link rel="icon">
 * (lecteurs RSS, messageries, certains robots) : /favicon.ico répondait 404.
 *
 * sharp n'écrit pas le format ICO, mais un ICO peut contenir des PNG tels
 * quels (Windows Vista et tous les navigateurs actuels) : il suffit d'un
 * en-tête de 6 octets puis d'une entrée de 16 octets par taille.
 *
 * Fond blanc opaque, comme favicon.png.
 */
async function ensureFaviconIco() {
  const out = join(ROOT, 'public', 'favicon.ico');
  if (await exists(out)) return false;
  const svg = await readFile(join(ROOT, 'public', 'favicon.svg'));
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(
    sizes.map((size) =>
      sharp(svg, { density: 600 })
        .resize(size, size, { fit: 'contain', background: '#ffffff' })
        .flatten({ background: '#ffffff' })
        .ensureAlpha()
        .png({ compressionLevel: 9 })
        .toBuffer()
    )
  );

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // réservé
  header.writeUInt16LE(1, 2); // 1 = icône
  header.writeUInt16LE(sizes.length, 4);

  let offset = 6 + 16 * sizes.length;
  const entries = sizes.map((size, i) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0); // largeur
    entry.writeUInt8(size, 1); // hauteur
    entry.writeUInt16LE(1, 4); // plans de couleur
    entry.writeUInt16LE(32, 6); // bits par pixel
    entry.writeUInt32LE(pngs[i].length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    return entry;
  });

  await writeFile(out, Buffer.concat([header, ...entries, ...pngs]));
  return true;
}

/** Lit les sources dans `srcDir`, écrit les densités servies dans `outDir`. */
async function ensureBrandVariants(srcDir, outDir) {
  let files;
  try {
    files = await readdir(srcDir);
  } catch {
    return { made: 0, kept: 0 };
  }
  await mkdir(outDir, { recursive: true });
  let made = 0;
  let kept = 0;
  for (const name of files) {
    if (!name.endsWith('.webp') || BRAND_VARIANT_RE.test(name)) continue;
    let src = null;
    for (const { suffix, height, quality } of BRAND_VARIANTS) {
      const variant = join(outDir, name.replace(/\.webp$/, `${suffix}.webp`));
      if (await exists(variant)) {
        kept++;
        continue;
      }
      try {
        if (!src) src = await readFile(join(srcDir, name));
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

/**
 * Date de dernière modification réelle de chaque page projet.
 *
 * `dateModified` valait la date du build sur les 75 pages : republier après
 * avoir corrigé une virgule sur une page faisait passer les 74 autres pour
 * modifiées le même jour. Or les moteurs de réponse pondèrent fortement ce
 * signal quand ils arbitrent entre plusieurs sources - et un signal
 * uniformément neuf est un signal qu'on apprend à ignorer.
 *
 * Le registre associe à chaque projet l'empreinte de son contenu et la date à
 * laquelle cette empreinte est apparue. Tant que le contenu ne bouge pas, la
 * date ne bouge pas, quel que soit le nombre de builds.
 *
 * Pas de `git log` : Vercel clone sans garantie sur la profondeur de
 * l'historique, un build ne peut donc pas s'y fier. Le registre est versionné
 * comme les autres caches de src/data (voir .gitignore).
 *
 * Amorçage : un projet vu pour la première fois prend la date d'upload de sa
 * vidéo Vimeo, à défaut la date du jour. C'est une estimation, et elle se
 * trompe dans le sens prudent - mieux vaut sous-estimer la fraîcheur que
 * déclarer 62 pages modifiées aujourd'hui.
 *
 * LIMITE CONNUE : un build Vercel ne peut rien réécrire dans le dépôt. Après
 * une modification via le CMS, le projet touché portera la date du jour à
 * chaque build tant que ce fichier n'aura pas été régénéré et commité depuis
 * un poste. Les autres projets, eux, gardent leur date exacte - c'est
 * l'essentiel du bénéfice.
 */
async function updateContentDates(videos, vimeoCache) {
  const today = new Date().toISOString().slice(0, 10);

  let previous = {};
  if (await exists(DATES_FILE)) {
    try {
      previous = JSON.parse(await readFile(DATES_FILE, 'utf8'));
    } catch {
      previous = {};
    }
  }

  const dates = {};
  let nouveaux = 0;
  let changes = 0;
  for (const [project, slug] of buildSlugMap(videos)) {
    // Toute la fiche est prise en compte : le titre et le crédit s'affichent,
    // mais `poster` ou `fullWidth` changent la page tout autant.
    const hash = createHash('sha256').update(JSON.stringify(project)).digest('hex').slice(0, 12);
    const avant = previous[slug];
    if (!avant) {
      const upload = vimeoCache[project.id]?.uploadDate;
      dates[slug] = { hash, date: upload ? upload.slice(0, 10) : today };
      nouveaux++;
    } else if (avant.hash !== hash) {
      dates[slug] = { hash, date: today };
      changes++;
    } else {
      dates[slug] = avant;
    }
  }

  await writeFile(DATES_FILE, JSON.stringify(dates, null, 2) + '\n');
  return { total: Object.keys(dates).length, nouveaux, changes };
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

  // Pas d'ID Vimeo (photo de plateau) : rien à résoudre.
  const outcomes = await mapLimit(
    videos.filter((v) => v.id),
    OEMBED_CONCURRENCY,
    async (v) => {
      try {
        return { v, info: await resolveThumbInfo(v.id, v.hash) };
      } catch (err) {
        return { v, err };
      }
    }
  );

  for (const { v, info, err: raw } of outcomes) {
    if (info) {
      cache[v.id] = info;
      resolved++;
    } else {
      // Le message natif d'un délai dépassé (« The operation was aborted due
      // to timeout ») ne dit pas lequel : on le reformule.
      const err =
        raw?.name === 'TimeoutError'
          ? new Error(`pas de réponse de Vimeo en ${OEMBED_TIMEOUT_MS / 1000} s`)
          : raw;
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

  // Après l'écriture du cache Vimeo : l'amorçage d'un projet inconnu lit sa
  // date d'upload, qui vient d'y être résolue.
  const d = await updateContentDates(videos, cache);
  console.log(
    `[dates] ${d.total} page(s) projet, ${d.nouveaux} amorcée(s), ${d.changes} modifiée(s) aujourd'hui.`
  );
  await summarize(`Miniatures Vimeo : **${resolved}** résolue(s), **${failed}** échec(s).`);

  // Échec TOTAL : plus aucune miniature ne se résout. Signe d'autre chose
  // qu'un incident ponctuel - Vimeo qui durcit sa restriction de domaine, une
  // clé révoquée, un changement d'API.
  //
  // Le garde-fou interrompait alors le build. Trop brutal : il rendait tout
  // déploiement impossible pendant une panne Vimeo, y compris un correctif
  // urgent sans aucun rapport avec les vignettes - alors que le repli sur le
  // cache versionné existe précisément pour ça. On ne s'arrête donc que si le
  // cache ne peut PAS prendre le relais ; sinon on avertit bruyamment et on
  // continue avec les miniatures du dernier build réussi.
  const attendus = videos.filter((v) => v.id).length;
  if (attendus > 0 && resolved === 0) {
    const secours = videos.filter((v) => v.id && cache[v.id]?.thumbBase).length;
    if (secours === attendus) {
      const alerte =
        `aucune des ${attendus} miniatures n'a pu être résolue auprès de Vimeo. ` +
        `Le cache versionné les fournit toutes (${secours}/${attendus}), le build ` +
        'continue avec les valeurs du dernier build réussi. À vérifier si cela se répète : restriction de domaine, clé, API.';
      console.warn(`\n[thumbs] AVERTISSEMENT : ${alerte}\n`);
      await summarize(`> [!WARNING]\n> ${alerte}`);
    } else {
      console.error(
        `\n[thumbs] ERREUR : aucune des ${attendus} miniatures n'a pu être résolue,\n` +
          `         et le cache n'en couvre que ${secours}. Le site partirait sans\n` +
          '         vignettes. Build interrompu.\n'
      );
      process.exit(1);
    }
  }

  const vl = await ensureVariants(LIVE_DIR);
  console.log(`[variants] ${vl.made} générée(s), ${vl.kept} déjà présente(s), ${vl.skipped} inutile(s) évitée(s).`);

  // Largeurs réelles des images locales -> descripteurs srcset exacts.
  const local = await measureCandidates(LIVE_DIR, '/live/');
  await writeFile(LOCAL_CACHE_FILE, JSON.stringify(local, null, 2) + '\n');
  const nCand = Object.values(local).reduce((a, e) => a + e.candidates.length, 0);
  console.log(`[srcset] ${Object.keys(local).length} image(s) locale(s), ${nCand} candidat(s) mesuré(s).`);

  if (await ensureAppleIcon()) console.log('[icone] apple-touch-icon.png (180x180) régénérée.');
  if (await ensureFaviconIco()) console.log('[icone] favicon.ico (16, 32, 48) régénéré.');

  const bl = await ensureBrandVariants(BRANDS_SRC_DIR, BRANDS_DIR);
  console.log(`[logos] ${bl.made} variante(s) générée(s), ${bl.kept} déjà présente(s).`);

  // Dimensions du fichier 64 px : servent d'attributs width/height (donc de
  // ratio) sur les <img> du bandeau, pour éviter tout saut de mise en page.
  // Lues directement dans public/brands/, qui ne contient plus que les deux
  // densités servies depuis que les sources ont été sorties de public/.
  const brands = {};
  for (const file of await readdir(BRANDS_DIR)) {
    if (!file.endsWith('-64.webp')) continue;
    const slug = file.replace('-64.webp', '');
    const meta = await sharp(await readFile(join(BRANDS_DIR, file))).metadata();
    brands[slug] = { width: meta.width, height: meta.height };
  }
  await writeFile(BRANDS_CACHE_FILE, JSON.stringify(brands, null, 2) + '\n');
  console.log(`[logos] ${Object.keys(brands).length} dimension(s) enregistrée(s).`);
}

// Une erreur qui remonte jusqu'ici n'est presque jamais réseau - les appels
// Vimeo ont leur propre repli plus haut. C'est un videos.json illisible, une
// image déposée par le CMS que sharp ne sait pas lire, un fichier impossible à
// écrire. Le script sortait pourtant en succès dans tous les cas : le build
// partait sans variantes ni dimensions, et seule une ligne perdue dans les
// journaux le disait. Désormais il ne laisse passer que le réseau ; le reste
// arrête le build, et Vercel garde en ligne le dernier déploiement réussi.
main().catch(async (err) => {
  if (isNetworkError(err)) {
    console.warn(`[thumbs] erreur réseau, build poursuivi avec les caches versionnés : ${err.message}`);
    await summarize(`> [!WARNING]\n> Miniatures : erreur réseau (${err.message}), caches du dernier build utilisés.`);
    process.exit(0);
  }
  console.error('[thumbs] erreur fatale, build interrompu :', err);
  await summarize(`> [!CAUTION]\n> Script des miniatures interrompu : ${err.message}`);
  process.exit(1);
});
