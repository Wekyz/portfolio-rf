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
 * Les images posées à la main (src/assets/live/) et les logos
 * (src/assets/brands/) ne passent plus par ici : astro:assets les décline au
 * build (voir src/lib/images.js).
 */
import { readFile, writeFile, appendFile, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { buildSlugMap } from '../src/lib/slug.js';
import { SHOWREEL } from '../src/data/profile.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'src', 'data', 'videos.json');
const CACHE_FILE = join(ROOT, 'src', 'data', 'vimeo-thumbs.json');
const DATES_FILE = join(ROOT, 'src', 'data', 'content-dates.json');
const SHOWREEL_DIR = join(ROOT, 'public', 'showreel');
const SHOWREEL_CACHE_FILE = join(ROOT, 'src', 'data', 'showreel.json');
/** Largeurs servies pour l'image d'ouverture du showreel (format 1920x803). */
const SHOWREEL_WIDTHS = [960, 1920];

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
  return ensureSquareIcon('apple-touch-icon.png', 180);
}

/**
 * Icônes 192 et 512 px du manifeste (MOB-05) : Android s'en sert pour
 * l'ajout à l'écran d'accueil et l'écran de lancement, et étirait jusqu'ici
 * l'icône iOS de 180 px. Même rendu que celle-ci.
 */
async function ensureManifestIcons() {
  const made = await Promise.all([ensureSquareIcon('icon-192.png', 192), ensureSquareIcon('icon-512.png', 512)]);
  return made.some(Boolean);
}

/**
 * Icône carrée sur fond opaque, rendue depuis favicon.svg, glyphe à 82 % du
 * côté (148 px sur 180, proportion d'origine de l'icône iOS). Générée
 * seulement si elle manque : les fichiers sont versionnés.
 */
async function ensureSquareIcon(name, size) {
  const out = join(ROOT, 'public', name);
  if (await exists(out)) return false;
  const svg = await readFile(join(ROOT, 'public', 'favicon.svg'));
  const inner = Math.round((size * 148) / 180);
  const glyphe = await sharp(svg, { density: 600 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 250, g: 250, b: 248, alpha: 1 } },
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

/**
 * Image d'ouverture du showreel, tirée de sa miniature Vimeo.
 *
 * L'accueil chargeait le lecteur Vimeo dès l'arrivée : 1,4 Mo sur 1,44 Mo de
 * page (lecteur, hls.js, flux). L'image s'affiche d'abord, le lecteur est
 * injecté une fois la page chargée (voir app.js) et prend sa place quand la
 * lecture démarre.
 *
 * Régénérée seulement si la miniature a changé sur Vimeo (l'URL est retenue
 * dans src/data/showreel.json) ou si un fichier manque. Vimeo injoignable :
 * on garde les fichiers existants, comme pour les autres miniatures.
 *
 * @returns {Promise<'made' | 'kept' | 'offline'>}
 */
async function ensureShowreelPoster() {
  let thumbBase;
  try {
    ({ thumbBase } = await resolveThumbInfo(SHOWREEL.id, SHOWREEL.hash));
  } catch (err) {
    if (isNetworkError(err)) return 'offline';
    throw err;
  }

  let previous = null;
  try {
    previous = JSON.parse(await readFile(SHOWREEL_CACHE_FILE, 'utf8')).thumbBase;
  } catch {
    // Pas encore de registre : l'image sera générée.
  }
  const files = SHOWREEL_WIDTHS.map((w) => join(SHOWREEL_DIR, `poster-${w}.webp`));
  const present = (await Promise.all(files.map(exists))).every(Boolean);
  if (present && previous === thumbBase) return 'kept';

  // La miniature Vimeo existe au format exact de la vidéo (1920x803).
  const res = await fetch(`${thumbBase}_1920x803`, { signal: AbortSignal.timeout(OEMBED_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`miniature du showreel : HTTP ${res.status}`);
  const source = Buffer.from(await res.arrayBuffer());

  await mkdir(SHOWREEL_DIR, { recursive: true });
  for (const [i, width] of SHOWREEL_WIDTHS.entries()) {
    await sharp(source)
      .resize({ width, height: Math.round((width * 803) / 1920), fit: 'cover' })
      .webp({ quality: 72 })
      .toFile(files[i]);
  }
  await writeFile(SHOWREEL_CACHE_FILE, JSON.stringify({ thumbBase }, null, 2) + '\n');
  return 'made';
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

  if (await ensureAppleIcon()) console.log('[icone] apple-touch-icon.png (180x180) régénérée.');
  if (await ensureFaviconIco()) console.log('[icone] favicon.ico (16, 32, 48) régénéré.');
  if (await ensureManifestIcons()) console.log('[icone] icon-192.png et icon-512.png régénérées.');

  const showreel = await ensureShowreelPoster();
  console.log(
    {
      made: "[showreel] image d'ouverture régénérée.",
      kept: "[showreel] image d'ouverture à jour.",
      offline: "[showreel] Vimeo injoignable, image d'ouverture conservée.",
    }[showreel]
  );
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
