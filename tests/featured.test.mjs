/**
 * Sélection de l'accueil (src/lib/featured.js) : quels projets, dans quel
 * ordre. L'ordre se règle dans le CMS (« Position sur l'accueil »).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectFeatured, featuredPosition } from '../src/lib/featured.js';

const avecPage = (p) => Boolean(p.id);
const titres = (list) => list.map((p) => p.title);

test('sans position, l’ordre de la liste est conservé', () => {
  const projets = [
    { title: 'A', id: '1', featured: true },
    { title: 'B', id: '2', featured: false },
    { title: 'C', id: '3', featured: true },
  ];
  assert.deepEqual(titres(selectFeatured(projets, avecPage, 3)), ['A', 'C']);
});

test('les positions passent devant, puis la liste pour les autres', () => {
  const projets = [
    { title: 'A', id: '1', featured: true },
    { title: 'B', id: '2', featured: true, featuredOrder: 2 },
    { title: 'C', id: '3', featured: true },
    { title: 'D', id: '4', featured: true, featuredOrder: 1 },
  ];
  assert.deepEqual(titres(selectFeatured(projets, avecPage, 3)), ['D', 'B', 'A']);
});

test('la limite s’applique après le tri', () => {
  const projets = [
    { title: 'A', id: '1', featured: true },
    { title: 'B', id: '2', featured: true },
    { title: 'C', id: '3', featured: true },
    { title: 'D', id: '4', featured: true, featuredOrder: 1 },
  ];
  assert.deepEqual(titres(selectFeatured(projets, avecPage, 3)), ['D', 'A', 'B']);
});

test('deux projets à la même position gardent l’ordre de la liste', () => {
  const projets = [
    { title: 'A', id: '1', featured: true, featuredOrder: 1 },
    { title: 'B', id: '2', featured: true, featuredOrder: 1 },
  ];
  assert.deepEqual(titres(selectFeatured(projets, avecPage, 3)), ['A', 'B']);
});

test('un projet sans page ni lien externe est écarté, un lien externe suffit', () => {
  const projets = [
    { title: 'Photo', featured: true, featuredOrder: 1 },
    { title: 'Film', featured: true, externalLink: 'https://example.com' },
  ];
  assert.deepEqual(titres(selectFeatured(projets, avecPage, 3)), ['Film']);
});

test('un champ position vidé par le CMS compte comme vide', () => {
  assert.equal(featuredPosition({ title: 'T', featuredOrder: '' }), null);
  assert.equal(featuredPosition({ title: 'T', featuredOrder: null }), null);
  assert.equal(featuredPosition({ title: 'T' }), null);
  assert.equal(featuredPosition({ title: 'T', featuredOrder: '2' }), 2);
});
