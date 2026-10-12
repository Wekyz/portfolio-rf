/**
 * Sélections privées (AME-05) et navigation entre fiches (AME-01).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { activeReviews } from '../src/lib/reviews.js';
import { siblingProjects } from '../src/lib/project-page.js';

const projets = [
  { cat: 'pub', title: 'Hanro', id: '1' },
  { cat: 'pub', title: 'Ioma', id: '2' },
  { cat: 'live', title: 'PSG Football' }, // photo, sans vidéo
  { cat: 'doc', title: 'Breathe', id: '3' },
];

test('une sélection résout ses titres en projets, dans l’ordre choisi', () => {
  const [r] = activeReviews({
    reviews: [{ id: 'abc', title: 'Pour Atelier B', projects: ['Breathe', 'Hanro'] }],
    projects: projets,
    today: '2026-10-07',
  });
  assert.deepEqual(r.items.map((i) => i.project.title), ['Breathe', 'Hanro']);
  assert.equal(r.items[0].slug, 'breathe');
  assert.equal(r.lang, 'fr', 'le français par défaut');
});

test('un titre disparu est signalé, un projet sans vidéo est écarté', () => {
  const [r] = activeReviews({
    reviews: [{ id: 'abc', title: 'T', projects: ['Ancien titre', 'PSG Football', 'Ioma'] }],
    projects: projets,
    today: '2026-10-07',
  });
  assert.deepEqual(r.missing, ['Ancien titre']);
  assert.deepEqual(r.items.map((i) => i.project.title), ['Ioma']);
});

test('une sélection expirée ou sans identifiant n’est pas publiée', () => {
  const actives = activeReviews({
    reviews: [
      { id: 'a', title: 'Encore valable', expires: '2026-10-07' },
      { id: 'b', title: 'Expirée', expires: '2026-10-06' },
      { id: '', title: 'Sans identifiant' },
    ],
    projects: projets,
    today: '2026-10-07',
  });
  assert.deepEqual(actives.map((r) => r.title), ['Encore valable']);
});

test('précédent et suivant restent dans la catégorie et bouclent', () => {
  const routes = [
    { project: projets[0], slug: 'hanro' },
    { project: projets[1], slug: 'ioma' },
    { project: projets[3], slug: 'breathe' },
  ];
  const s = siblingProjects(projets[0], routes);
  assert.equal(s.next.slug, 'ioma');
  assert.equal(s.prev.slug, 'ioma', 'deux projets : le précédent boucle sur le suivant');
  assert.equal(siblingProjects(projets[3], routes), null, 'seul dans sa catégorie : pas de navigation');
});
