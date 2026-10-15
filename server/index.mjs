/**
 * Serveur de production sur le serveur cloud Infomaniak (site Node.js).
 *
 * Remplace Vercel, dont l'offre gratuite a coupé le site en octobre 2026
 * (quota de CPU des fonctions dépassé, 402 DEPLOYMENT_DISABLED sur toutes les
 * pages). Un seul processus fait ce que Vercel faisait :
 *
 *   - sert les fichiers produits par `astro build` dans dist/ ;
 *   - applique les en-têtes et redirections de vercel.json, gardé comme
 *     source unique pour ne pas les recopier ici ;
 *   - exécute les fonctions de api/ telles quelles, avec les quelques
 *     raccourcis de l'objet réponse Vercel qu'elles utilisent
 *     (`res.status().json()`, `res.send()`) et le corps de requête déjà lu.
 *
 * Aucune dépendance en plus de celles de api/ : node:http suffit.
 *
 * Démarrage : `npm start` (commande d'exécution du Manager Infomaniak).
 * Le port vient de la variable PORT fournie par Infomaniak. Les variables
 * d'environnement (RESEND_API_KEY, etc.) sont lues dans le fichier .env à
 * la racine du site s'il existe : il n'est jamais écrasé par le déploiement
 * (voir .github/workflows/deploy.yml).
 *
 * Seuls les fichiers de dist/ changent à chaque publication du CMS : ils sont
 * relus sur le disque à chaque requête, donc aucun redémarrage n'est
 * nécessaire. Un changement de ce fichier ou de api/ demande en revanche un
 * redémarrage depuis le Manager.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, normalize, extname, sep, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { brotliCompressSync, gzipSync, constants as zlib } from 'node:zlib';
import { SITE } from '../src/lib/schema-ids.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const API = join(ROOT, 'api');

if (existsSync(join(ROOT, '.env'))) process.loadEnvFile(join(ROOT, '.env'));
// Ferme l'exception localhost du formulaire (allowedOrigin dans api/contact.js).
process.env.NODE_ENV ??= 'production';

const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY = 100 * 1024;

// ── En-têtes et redirections de vercel.json ─────────────────────────────────
// Les motifs de vercel.json (`/(.*)`, `/(.*).woff2`, `/(favicon.ico|...)`) sont
// déjà des expressions régulières une fois ancrés. Seul `:path+` des
// redirections est une syntaxe propre à Vercel. Comme chez Vercel, toutes les
// règles qui correspondent s'appliquent, la dernière l'emportant sur une même
// clé (c'est ainsi que /admin/ remplace la CSP générale).
const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
const toRegExp = (source) =>
  new RegExp(`^${source.replace(/:(\w+)\+/g, '(?<$1>.+)')}$`);
const headerRules = vercel.headers.map((r) => ({ re: toRegExp(r.source), headers: r.headers }));
const redirectRules = vercel.redirects.map((r) => ({
  re: toRegExp(r.source),
  destination: r.destination,
  status: r.permanent ? 308 : 307,
}));

function headersFor(pathname) {
  const out = {};
  for (const rule of headerRules) {
    if (rule.re.test(pathname)) for (const { key, value } of rule.headers) out[key] = value;
  }
  return out;
}

// ── Fichiers statiques ───────────────────────────────────────────────────────
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.yml': 'text/yaml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt; charset=utf-8',
  '.pdf': 'application/pdf',
};
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.webmanifest', '.xml', '.txt', '.yml', '.svg', '.vtt']);

// Versions compressées gardées en mémoire, invalidées par la date de
// modification : le site entier pèse quelques Mo de texte.
const compressed = new Map();
function compress(file, mtimeMs, body, encoding) {
  const key = `${encoding}:${file}`;
  const hit = compressed.get(key);
  if (hit && hit.mtimeMs === mtimeMs) return hit.body;
  const out =
    encoding === 'br'
      ? brotliCompressSync(body, { params: { [zlib.BROTLI_PARAM_QUALITY]: 9 } })
      : gzipSync(body, { level: 9 });
  compressed.set(key, { mtimeMs, body: out });
  return out;
}

async function fileAt(path) {
  try {
    const s = await stat(path);
    return s.isFile() ? { path, stat: s } : null;
  } catch {
    return null;
  }
}

/** `/portfolio` -> dist/portfolio/index.html, `/og-image.jpg` -> dist/og-image.jpg. */
async function resolveFile(pathname) {
  const rel = normalize(pathname).replace(/^([\\/])+/, '');
  const abs = join(DIST, rel);
  if (abs !== DIST && !abs.startsWith(DIST + sep)) return null;
  return (await fileAt(abs)) || (await fileAt(join(abs, 'index.html')));
}

async function sendFile(req, res, file, status, extraHeaders) {
  const ext = extname(file.path).toLowerCase();
  const etag = `"${file.stat.size.toString(16)}-${Math.floor(file.stat.mtimeMs).toString(16)}"`;
  const headers = {
    'Content-Type': TYPES[ext] || 'application/octet-stream',
    // Défaut de Vercel pour un fichier statique, sauf règle de vercel.json
    // déjà posée par handle() (_astro/, polices, showreel).
    ...(res.hasHeader('Cache-Control') ? {} : { 'Cache-Control': 'public, max-age=0, must-revalidate' }),
    ETag: etag,
    'Last-Modified': file.stat.mtime.toUTCString(),
    ...extraHeaders,
  };

  if (status === 200 && req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    return res.end();
  }

  let body = await readFile(file.path);
  if (COMPRESSIBLE.has(ext) && body.length > 1024) {
    const accept = req.headers['accept-encoding'] || '';
    const encoding = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : null;
    headers.Vary = 'Accept-Encoding';
    if (encoding) {
      body = compress(file.path, file.stat.mtimeMs, body, encoding);
      headers['Content-Encoding'] = encoding;
    }
  }
  headers['Content-Length'] = body.length;
  res.writeHead(status, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
}

// ── Fonctions api/ ───────────────────────────────────────────────────────────
const handlers = new Map();
async function loadHandler(name) {
  if (!handlers.has(name)) {
    const file = join(API, `${name}.js`);
    handlers.set(name, existsSync(file) ? (await import(pathToFileURL(file).href)).default : null);
  }
  return handlers.get(name);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('corps trop volumineux'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** Corps lu et décodé comme le fait Vercel : JSON, formulaire, sinon texte. */
function parseBody(raw, type = '') {
  if (!raw) return undefined;
  if (type.includes('application/json')) {
    try { return JSON.parse(raw); } catch { return raw; }
  }
  if (type.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }
  return raw;
}

/** Les raccourcis de l'objet réponse Vercel utilisés par api/. */
function vercelResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
    return res;
  };
  res.send = (data) => {
    if (data !== null && typeof data === 'object' && !Buffer.isBuffer(data)) return res.json(data);
    res.end(data);
    return res;
  };
  return res;
}

async function runFunction(req, res, name, url) {
  const handler = await loadHandler(name);
  if (!handler) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: 'Not found' }));
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    req.body = parseBody(await readBody(req), req.headers['content-type']);
  }
  req.query = Object.fromEntries(url.searchParams);
  await handler(req, vercelResponse(res));
}

// ── Routage ──────────────────────────────────────────────────────────────────
async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }

  // www.roxane-foare.com -> roxane-foare.com : le certificat couvre les deux
  // noms, mais une seule adresse doit servir le site (balises canoniques,
  // sitemaps et JSON-LD utilisent toutes SITE).
  if (/^www\./i.test(req.headers.host || '')) {
    res.writeHead(308, { Location: SITE + req.url });
    return res.end();
  }

  for (const [key, value] of Object.entries(headersFor(pathname))) res.setHeader(key, value);

  for (const rule of redirectRules) {
    const m = rule.re.exec(pathname);
    if (m) {
      const to = rule.destination.replace(/:(\w+)\+/g, (_, k) => m.groups?.[k] ?? '');
      res.writeHead(rule.status, { Location: to + url.search });
      return res.end();
    }
  }

  // `trailingSlash: false` : /portfolio/ -> /portfolio, comme chez Vercel.
  if (pathname.length > 1 && pathname.endsWith('/')) {
    res.writeHead(308, { Location: pathname.replace(/\/+$/, '') + url.search });
    return res.end();
  }

  const api = /^\/api\/([\w-]+)$/.exec(pathname);
  if (api) return runFunction(req, res, api[1], url);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  const file = await resolveFile(pathname);
  if (file) return sendFile(req, res, file, 200);

  const notFound = await fileAt(join(DIST, '404.html'));
  if (notFound) return sendFile(req, res, notFound, 404, { 'Cache-Control': 'no-store' });
  res.writeHead(404);
  res.end();
}

createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(`[server] ${req.method} ${req.url} :`, err);
    if (!res.headersSent) {
      res.writeHead(err.status || 500, { 'Content-Type': 'text/plain; charset=utf-8' });
    }
    res.end();
  });
}).listen(PORT, () => {
  console.log(`[server] roxane-foare.com sur le port ${PORT}`);
});
