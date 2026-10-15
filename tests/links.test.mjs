/**
 * Liens internes du build (CI-03).
 *
 * Un slug renommé, une page supprimée ou une faute dans un chemin écrit à la
 * main (`/fr/portfolio`, `/showreel/poster-960.webp`) donnaient une 404 que
 * rien ne signalait avant la mise en ligne. Ce test relit chaque `href`,
 * `src` et `srcset` interne des pages générées et vérifie qu'il mène à un
 * fichier de dist/ - ou à une fonction de api/. Les liens externes sont
 * contrôlés à part, chaque semaine, par lychee (voir ci.yml) : un site tiers
 * indisponible ne doit pas bloquer une mise en ligne.
 *
 * Ignoré sans dist/, comme routes.test.mjs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DIST = join(ROOT, 'dist');
const skip = existsSync(join(DIST, 'index.html')) ? false : 'dist/ absent - lancer `npm run build` d’abord';

function pages() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory() && e.name !== 'admin') walk(full);
      else if (e.name.endsWith('.html')) out.push(full);
    }
  };
  walk(DIST);
  return out;
}

/** Une adresse interne existe-t-elle dans le build (ou en fonction serverless) ? */
function exists(path) {
  if (path.startsWith('/api/')) return existsSync(join(ROOT, 'api', `${path.slice(5)}.js`));
  // Vercel sert /x depuis x/index.html (format 'directory'), ou x tel quel.
  const target = join(DIST, decodeURIComponent(path));
  if (existsSync(target) && statSync(target).isFile()) return true;
  return existsSync(join(target, 'index.html'));
}

test('chaque lien interne du site mène à une page ou un fichier existant', { skip }, () => {
  const casses = new Set();
  let vus = 0;
  for (const file of pages()) {
    const html = readFileSync(file, 'utf8');
    const urls = [
      ...[...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1]),
      ...[...html.matchAll(/\s(?:srcset|imagesrcset)="([^"]*)"/g)].flatMap((m) =>
        m[1].split(',').map((c) => c.trim().split(/\s+/)[0])
      ),
    ];
    for (const raw of urls) {
      // Internes seulement : chemin absolu du site, ou adresse complète du domaine.
      const url = raw.replace(/^https:\/\/roxane-foare\.com/, '');
      if (!url.startsWith('/') || url.startsWith('//')) continue;
      const path = url.split(/[?#]/)[0] || '/';
      vus++;
      if (!exists(path)) casses.add(`${relative(DIST, file)} -> ${path}`);
    }
  }
  assert.ok(vus > 100, `seulement ${vus} liens internes trouvés : le test ne lit plus les pages`);
  assert.deepEqual([...casses], [], 'liens internes cassés');
});
