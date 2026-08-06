/**
 * Tests de la génération des slugs de pages projet.
 *
 * Ces slugs sont des URL publiques : une régression ici casse des adresses
 * déjà indexées. D'où les cas figés sur des titres réels de videos.json.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { slugify, buildSlugMap, projectRoutes } from '../src/lib/slug.js';

test('slugify translittère les accents plutôt que de les encoder', () => {
  assert.equal(slugify('Estée Lauder - Made for more'), 'estee-lauder-made-for-more');
  assert.equal(slugify('Château de la Viaudière'), 'chateau-de-la-viaudiere');
  assert.equal(slugify('Société Générale'), 'societe-generale');
});

test("slugify supprime l'apostrophe au lieu de la couper", () => {
  assert.equal(slugify("Niwel London's calling"), 'niwel-londons-calling');
  assert.equal(slugify('Article 1 Campus d’été'), 'article-1-campus-dete');
});

test('slugify réduit toute ponctuation à un tiret simple, sans tiret aux bords', () => {
  assert.equal(slugify('A Day of L.O.V.'), 'a-day-of-l-o-v');
  assert.equal(slugify('  -- Hello // World --  '), 'hello-world');
  assert.equal(slugify('10 years BL9CK PARTY'), '10-years-bl9ck-party');
});

test('seuls les projets avec une vidéo Vimeo obtiennent un slug', () => {
  const projects = [
    { id: '1', title: 'Avec video' },
    { title: 'Sans video' },
    { id: '2', title: 'Autre' },
  ];
  const map = buildSlugMap(projects);
  assert.equal(map.size, 2);
  assert.equal(map.get(projects[0]), 'avec-video');
  assert.equal(map.get(projects[1]), undefined);
});

test('les homonymes sont départagés par un suffixe numérique', () => {
  const projects = [
    { id: '1', title: 'Hennessy' },
    { id: '2', title: 'Hennessy' },
    { id: '3', title: 'Hennessy' },
  ];
  const slugs = [...buildSlugMap(projects).values()];
  assert.deepEqual(slugs, ['hennessy', 'hennessy-2', 'hennessy-3']);
});

test('le champ slug explicite prend le pas sur le titre', () => {
  const projects = [{ id: '1', title: 'Nouveau titre', slug: 'ancienne-url' }];
  assert.equal([...buildSlugMap(projects).values()][0], 'ancienne-url');
});

test('un titre sans caractère exploitable retombe sur un slug dérivé de l’id', () => {
  const projects = [{ id: '4242', title: '!!!' }];
  assert.equal([...buildSlugMap(projects).values()][0], 'projet-4242');
});

test('tous les slugs des projets réels sont uniques et non vides', async () => {
  const { default: data } = await import('../src/data/videos.json', { with: { type: 'json' } });
  const routes = projectRoutes(data.videos || data);
  const slugs = routes.map((r) => r.slug);

  assert.ok(slugs.length > 0, 'aucune page projet generee');
  assert.equal(new Set(slugs).size, slugs.length, 'collision de slug');
  for (const s of slugs) {
    assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/, `slug invalide : ${s}`);
  }
});
