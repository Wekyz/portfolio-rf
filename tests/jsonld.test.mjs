/**
 * Données structurées du build (CI-03).
 *
 * Le JSON-LD est assemblé à la main dans Base.astro et project-page.js : une
 * virgule de trop, un champ renommé ou une vignette absente ne cassaient ni
 * le build ni les tests, et Google se contentait d'ignorer le bloc. Ce test
 * relit chaque bloc `application/ld+json` des pages générées, vérifie qu'il
 * se lit, et que chaque fiche projet déclare une vidéo complète au sens de
 * Google (name, description, thumbnailUrl, uploadDate, embedUrl).
 *
 * Ignoré sans dist/, comme routes.test.mjs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const skip = existsSync(join(DIST, 'index.html')) ? false : 'dist/ absent - lancer `npm run build` d’abord';

/** Pages HTML du build, hors administration. */
function pages() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory() && e.name !== 'admin' && e.name !== '_astro') walk(full);
      else if (e.name.endsWith('.html')) out.push(full);
    }
  };
  walk(DIST);
  return out;
}

/** Blocs JSON-LD d'une page, analysés. Lève avec le nom du fichier si un bloc est illisible. */
function blocks(file) {
  const html = readFileSync(file, 'utf8');
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m, i) => {
    try {
      return JSON.parse(m[1]);
    } catch (err) {
      throw new Error(`${relative(DIST, file)}, bloc ${i + 1} : JSON illisible (${err.message})`, { cause: err });
    }
  });
}

/** Tous les nœuds d'un bloc, `@graph` compris. */
const nodes = (block) => (Array.isArray(block['@graph']) ? block['@graph'] : [block]);

test('chaque bloc JSON-LD du site se lit et porte un @context', { skip }, () => {
  let total = 0;
  for (const file of pages()) {
    for (const block of blocks(file)) {
      total++;
      assert.ok(block['@context'], `${relative(DIST, file)} : bloc sans @context`);
    }
  }
  assert.ok(total > 0, 'aucun bloc JSON-LD trouvé');
});

test('chaque fiche projet déclare un VideoObject complet', { skip }, () => {
  const fiches = pages().filter((f) => /[\\/]portfolio[\\/][^\\/]+[\\/]index\.html$/.test(f));
  assert.ok(fiches.length > 0, 'aucune fiche projet dans dist/');
  for (const file of fiches) {
    const videos = blocks(file).flatMap(nodes).filter((n) => n['@type'] === 'VideoObject');
    assert.equal(videos.length, 1, `${relative(DIST, file)} : ${videos.length} VideoObject`);
    const v = videos[0];
    for (const champ of ['name', 'description', 'thumbnailUrl', 'uploadDate', 'embedUrl']) {
      assert.ok(v[champ], `${relative(DIST, file)} : VideoObject sans ${champ}`);
    }
    assert.ok(!Number.isNaN(Date.parse(v.uploadDate)), `${relative(DIST, file)} : uploadDate illisible`);
    assert.match(String(v.thumbnailUrl), /^https:\/\//, `${relative(DIST, file)} : vignette en URL absolue`);
  }
});
