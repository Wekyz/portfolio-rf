/**
 * Tests des métadonnées de page projet (src/lib/project-page.js).
 *
 * `formatDuration` et `buildBreadcrumb` produisent du contenu visible et des
 * données structurées lues par Google : une régression y est silencieuse.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, buildBreadcrumb, embedUrl, relatedProjects } from '../src/lib/project-page.js';

test('formatDuration rend le format des lecteurs vidéo', () => {
  assert.equal(formatDuration('PT1M23S'), '1:23');
  assert.equal(formatDuration('PT45S'), '0:45');
  assert.equal(formatDuration('PT1H2M5S'), '1:02:05');
  assert.equal(formatDuration('PT2H'), '2:00:00');
});

test('formatDuration complète à deux chiffres sous une unité supérieure', () => {
  // « 1:5 » se lirait comme 1 min 5, d'où le zéro.
  assert.equal(formatDuration('PT1M5S'), '1:05');
  assert.equal(formatDuration('PT1H5M'), '1:05:00');
});

test('formatDuration refuse une entrée absente, vide ou malformée', () => {
  assert.equal(formatDuration(null), null);
  assert.equal(formatDuration(undefined), null);
  assert.equal(formatDuration('PT0S'), null);
  assert.equal(formatDuration('1m23s'), null);
  assert.equal(formatDuration('P1DT2H'), null);
});

test('le fil d’Ariane a trois maillons, le dernier sans URL', () => {
  const b = buildBreadcrumb({ title: 'Hanro' }, 'en');
  assert.equal(b['@type'], 'BreadcrumbList');
  assert.equal(b.itemListElement.length, 3);
  assert.deepEqual(b.itemListElement.map((i) => i.position), [1, 2, 3]);
  assert.equal(b.itemListElement[0].item, 'https://roxane-foare.com/');
  assert.equal(b.itemListElement[1].item, 'https://roxane-foare.com/portfolio');
  assert.equal(b.itemListElement[2].name, 'Hanro');
  // Google demande de ne pas auto-référencer la page courante.
  assert.equal(b.itemListElement[2].item, undefined);
});

test('le fil d’Ariane est traduit et pointe vers les URL françaises', () => {
  const b = buildBreadcrumb({ title: 'Hanro' }, 'fr');
  assert.equal(b.itemListElement[0].name, 'Accueil');
  assert.equal(b.itemListElement[0].item, 'https://roxane-foare.com/fr');
  assert.equal(b.itemListElement[1].item, 'https://roxane-foare.com/fr/portfolio');
});

test("embedUrl n'ajoute le hash que pour une vidéo privée", () => {
  assert.equal(embedUrl({ id: '123' }), 'https://player.vimeo.com/video/123');
  assert.equal(embedUrl({ id: '123', hash: 'abc' }), 'https://player.vimeo.com/video/123?h=abc');
});

test('relatedProjects reste dans la catégorie et exclut le projet courant', () => {
  const a = { cat: 'pub', title: 'A' };
  const routes = [
    { project: a, slug: 'a' },
    { project: { cat: 'pub', title: 'B' }, slug: 'b' },
    { project: { cat: 'doc', title: 'C' }, slug: 'c' },
    { project: { cat: 'pub', title: 'D' }, slug: 'd' },
    { project: { cat: 'pub', title: 'E' }, slug: 'e' },
  ];
  const r = relatedProjects(a, routes);
  assert.equal(r.length, 3, 'limite par défaut');
  assert.ok(!r.some((x) => x.project === a), 'le projet courant est exclu');
  assert.ok(r.every((x) => x.project.cat === 'pub'), 'même catégorie uniquement');
});
