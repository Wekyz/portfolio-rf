/**
 * Cohérence des routes et budget de poids, vérifiés sur le build.
 *
 * L'audit demandait un test garantissant que chaque page a bien sa règle de
 * réécriture dans vercel.json. Ce besoin a disparu avec le passage à
 * `build.format: 'directory'` : Vercel sert nativement l'index d'un dossier,
 * il n'y a plus une seule réécriture à maintenir. Le risque, lui, s'est
 * déplacé : une page peut désormais être ajoutée sans entrer dans le sitemap,
 * et rien ne le signalerait.
 *
 * S'y ajoute un budget de poids, alternative déterministe à Lighthouse CI :
 * pas de navigateur, pas de score qui varie d'un run à l'autre, juste des
 * octets. Un dépassement se voit tout de suite et se corrige avant la mise en
 * ligne, ce qui était précisément le manque relevé.
 *
 * Ces tests supposent un `dist/` à jour : ils sont ignorés s'il est absent,
 * pour ne pas casser un `npm test` lancé sans build préalable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const PAGES = new URL('../src/pages/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const built = existsSync(join(DIST, 'index.html'));
const skip = built ? false : 'dist/ absent - lancer `npm run build` d’abord';

/** Toutes les pages .astro statiques, en chemins d'URL. */
function declaredRoutes() {
  const out = [];
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, `${prefix}/${entry.name}`);
      } else if (entry.name.endsWith('.astro')) {
        // Les routes dynamiques ([slug]) sont couvertes par le sitemap via
        // leur générateur : on ne peut pas les résoudre depuis le nom du
        // fichier. La 404 n'a pas vocation à être listée.
        if (entry.name.includes('[') || entry.name === '404.astro') continue;
        const name = entry.name.replace(/\.astro$/, '');
        out.push(name === 'index' ? prefix || '/' : `${prefix}/${name}`);
      }
    }
  };
  walk(PAGES, '');
  return out;
}

test('chaque page statique figure dans le sitemap', { skip }, () => {
  const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>https:\/\/roxane-foare\.com([^<]*)<\/loc>/g)].map(
    (m) => m[1] || '/'
  );
  const manquantes = declaredRoutes().filter((r) => !locs.includes(r));
  assert.deepEqual(
    manquantes,
    [],
    'pages absentes du sitemap - ajouter leur chemin à FIXED_PAGES dans src/pages/sitemap.xml.js'
  );
});

test('aucune règle de réécriture ne réapparaît dans vercel.json', { skip }, () => {
  const cfg = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  // `format: 'directory'` les rend inutiles. En réintroduire une signalerait
  // un retour en arrière sur T-04, avec le piège qui allait avec : une page
  // ajoutée sans sa règle renvoyait une 404 en production, sans rien au build.
  assert.equal(cfg.rewrites, undefined);
  assert.equal(cfg.trailingSlash, false);
});

test('la page 404 sort bien à la racine du build', { skip }, () => {
  // Astro la traite à part malgré `format: 'directory'`, et Vercel la
  // reconnaît sous ce nom précis. Un changement silencieux ferait retomber
  // les liens morts sur la page générique de la plateforme.
  assert.ok(existsSync(join(DIST, '404.html')));
});

test('budget de poids : le HTML transféré reste sous les seuils', { skip }, () => {
  const budgets = [
    ['index.html', 12],
    ['portfolio/index.html', 22],
    ['about/index.html', 16],
    ['contact/index.html', 12],
    ['portfolio/hanro/index.html', 14],
  ];
  for (const [rel, maxKo] of budgets) {
    const gz = gzipSync(readFileSync(join(DIST, rel))).length / 1024;
    assert.ok(
      gz <= maxKo,
      `${rel} : ${gz.toFixed(1)} Ko gzip, budget ${maxKo} Ko. ` +
        'Si la hausse est assumée, relever le seuil ; sinon, chercher la régression.'
    );
  }
});

test('budget de poids : la feuille de style inlinée reste raisonnable', { skip }, () => {
  // Elle est incluse dans CHAQUE page (inlineStylesheets: 'always'), donc son
  // poids se paie autant de fois qu'il y a de pages vues.
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('');
  const ko = Buffer.byteLength(styles) / 1024;
  assert.ok(ko <= 28, `CSS inlinée : ${ko.toFixed(1)} Ko brut, budget 28 Ko.`);
});

test('aucun fichier du build ne dépasse un poids déraisonnable', { skip }, () => {
  const gros = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else {
        const ko = statSync(full).size / 1024;
        // 400 Ko : au-delà, c'est une image oubliée sans redimensionnement.
        if (ko > 400) gros.push(`${full.slice(DIST.length)} (${ko.toFixed(0)} Ko)`);
      }
    }
  };
  walk(DIST);
  assert.deepEqual(gros, []);
});
