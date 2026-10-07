/**
 * Verrouille la cohérence entre la version de Sveltia CMS chargée depuis le
 * CDN et celle suivie par npm.
 *
 * Le CMS est chargé par une balise <script> vers unpkg, avec une empreinte
 * SRI. L'épinglage protège d'une compromission du paquet, mais Dependabot ne
 * voit pas une balise HTML : aucune mise à jour de sécurité ne remontait, sur
 * un paquet en version 0.x qui évolue vite.
 *
 * `@sveltia/cms` est donc déclaré en devDependency à la version réellement
 * chargée. Dependabot la surveille désormais, et ces tests font échouer la CI
 * tant que `public/admin/index.html` n'a pas suivi - version ET empreinte.
 * La montée de version reste ainsi un geste conscient, avec le CMS testé.
 *
 * Le paquet npm et le fichier servi par unpkg ont été vérifiés identiques
 * octet pour octet, ce qui rend l'empreinte calculable localement.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync(new URL('../public/admin/index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const srcMatch = html.match(/unpkg\.com\/@sveltia\/cms@([\d.]+)\/dist\/sveltia-cms\.js/);
const sriMatch = html.match(/integrity="sha384-([^"]+)"/);
const declared = (pkg.devDependencies['@sveltia/cms'] || '').replace(/^[^\d]*/, '');

test('la balise script déclare bien une version et une empreinte', () => {
  assert.ok(srcMatch, 'aucune URL unpkg trouvée dans public/admin/index.html');
  assert.ok(sriMatch, 'aucun attribut integrity trouvé');
});

test('la version chargée est celle suivie par npm', () => {
  assert.equal(
    srcMatch[1],
    declared,
    `public/admin/index.html charge ${srcMatch[1]} alors que package.json suit ${declared}. ` +
      'Après une montée de version, mettre à jour la balise script ET son empreinte SRI.'
  );
});

test("l'empreinte SRI correspond au contenu réel du paquet", () => {
  const file = readFileSync(
    new URL('../node_modules/@sveltia/cms/dist/sveltia-cms.js', import.meta.url)
  );
  const actual = createHash('sha384').update(file).digest('base64');
  assert.equal(
    sriMatch[1],
    actual,
    'empreinte SRI obsolète. Nouvelle valeur : sha384-' + actual
  );
});

test('la CSP de /admin/ autorise exactement cette version, et pas tout unpkg', () => {
  // SEC-04 : `https://unpkg.com` seul ouvrait l'administration à n'importe
  // quel paquet npm. La CSP vise désormais le dossier de la version épinglée :
  // elle doit suivre chaque montée, comme la balise et son empreinte.
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const csp = vercel.headers
    .find((r) => r.source === '/admin/(.*)')
    .headers.find((h) => h.key === 'Content-Security-Policy').value;
  assert.ok(
    csp.includes(`https://unpkg.com/@sveltia/cms@${declared}/`),
    `la CSP de /admin/ ne vise pas @sveltia/cms@${declared} : la mettre à jour dans vercel.json`
  );
  assert.ok(!/https:\/\/unpkg\.com[ ;]/.test(csp), 'la CSP de /admin/ autorise encore tout unpkg.com');
});
