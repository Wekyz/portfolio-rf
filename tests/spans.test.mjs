/**
 * Tests du pattern de grille (src/lib/spans.js).
 *
 * C'est la logique la plus subtile du site, et la seule partagée entre le
 * rendu au build et le filtrage côté client : une régression y déforme la
 * grille entière sans qu'aucune erreur ne soit levée.
 *
 * Le dernier test fige le rendu réel des 36 projets. Il n'a pas vocation à
 * décrire un comportement souhaitable, seulement à signaler tout changement :
 * si la grille doit évoluer, mettre à jour l'empreinte en connaissance de
 * cause.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { computeSpans, GRID_CLASSES, ALL_GRID_CLASSES } from '../src/lib/spans.js';

/** Raccourci de lecture : suite de largeurs. */
const widths = (items) => computeSpans(items).map((p) => p.span);
const classes = (items) => computeSpans(items).map((p) => p.cls);
const many = (cat, n) => Array.from({ length: n }, () => ({ cat }));

test('le pattern suit le cycle 8/4/4/8 après le premier item', () => {
  // Le 1er item ouvre la catégorie (start8), puis le cycle démarre à l'indice 1.
  assert.deepEqual(widths(many('pub', 6)), [8, 4, 4, 8, 8, 4]);
});

test('le premier item d’une catégorie force le retour en colonne 1', () => {
  const items = [...many('pub', 3), ...many('doc', 3)];
  assert.deepEqual(classes(items), [
    GRID_CLASSES.start8,
    GRID_CLASSES.span4,
    GRID_CLASSES.span4,
    GRID_CLASSES.start8, // nouvelle catégorie : on repart à gauche
    GRID_CLASSES.span4,
    GRID_CLASSES.span4,
  ]);
});

test('le cycle repart de zéro à chaque changement de catégorie', () => {
  // Sans remise à zéro, la 2e catégorie hériterait de la position de la 1re
  // et le décalage se propagerait sur toute la grille.
  const deux = widths([...many('pub', 4), ...many('doc', 4)]);
  assert.deepEqual(deux.slice(0, 4), deux.slice(4));
});

test('un item pleine largeur occupe 12 colonnes et réamorce le pattern', () => {
  const items = [...many('film', 2), { cat: 'film', fullWidth: true }, ...many('film', 3)];
  assert.deepEqual(widths(items), [8, 4, 12, 8, 4, 4]);
  assert.equal(classes(items)[2], GRID_CLASSES.full);
});

test('un item portrait vaut 4 colonnes sans perturber le cycle', () => {
  const sans = widths(many('pub', 5));
  const avec = widths([
    ...many('pub', 2),
    { cat: 'pub', portrait: true },
    ...many('pub', 3),
  ]);
  // Le portrait s'intercale, le reste de la suite est inchangé.
  assert.equal(avec[2], 4);
  assert.deepEqual([...avec.slice(0, 2), ...avec.slice(3)], sans);
  assert.equal(classes([{ cat: 'pub', portrait: true }])[0], GRID_CLASSES.portrait);
});

test('une affiche vaut 6 colonnes et réamorce le pattern comme un pleine largeur', () => {
  const items = [...many('film', 2), { cat: 'film', poster: true }, ...many('film', 3)];
  assert.deepEqual(widths(items), [8, 4, 6, 8, 4, 4]);
  // Aucune classe dynamique : le placement vient de [data-poster] en CSS.
  assert.equal(classes(items)[2], GRID_CLASSES.poster);
  // Le cycle repart de son premier palier (8), comme après un pleine largeur.
  // L'affiche laisse 3 colonnes libres de chaque côté, où un span 8 ne rentre
  // pas : CSS Grid le renvoie à la ligne suivante, en colonne 1.
  assert.equal(classes(items)[3], GRID_CLASSES.span8);
});

test('la catégorie live occupe toujours 6 colonnes, sans classe dynamique', () => {
  const items = many('live', 4);
  assert.deepEqual(widths(items), [6, 6, 6, 6]);
  assert.deepEqual(classes(items), [null, null, null, null]);
});

test('un live suivi d’une autre catégorie relance bien un start8', () => {
  const items = [...many('live', 2), ...many('teaser', 2)];
  assert.deepEqual(classes(items).slice(2), [GRID_CLASSES.start8, GRID_CLASSES.span4]);
});

test('une liste vide ne produit rien', () => {
  assert.deepEqual(computeSpans([]), []);
});

test('toutes les classes produites figurent dans ALL_GRID_CLASSES', () => {
  // applySpans retire ALL_GRID_CLASSES avant de reposer la bonne : une classe
  // absente de cette liste resterait collée à l'élément après un filtrage.
  const items = [
    ...many('pub', 5),
    { cat: 'pub', fullWidth: true },
    { cat: 'doc', portrait: true },
    ...many('doc', 3),
    ...many('live', 2),
  ];
  for (const cls of classes(items)) {
    if (cls !== null) assert.ok(ALL_GRID_CLASSES.includes(cls), `classe orpheline : ${cls}`);
  }
});

test('le rendu des 36 projets réels est figé', () => {
  const data = JSON.parse(
    readFileSync(new URL('../src/data/videos.json', import.meta.url), 'utf8')
  );
  const projects = data.videos || data;
  const placements = computeSpans(projects);
  const empreinte = createHash('sha256')
    .update(placements.map((p) => `${p.cls || '-'}:${p.span}`).join('|'))
    .digest('hex')
    .slice(0, 16);

  assert.equal(placements.length, projects.length);
  assert.equal(
    empreinte,
    '1ee31a91c24ca14a',
    'la disposition de la grille a changé. Si c’est voulu (nouveau projet, ' +
      'catégorie réordonnée, pattern modifié), remplacer cette empreinte ; ' +
      'sinon, c’est une régression de computeSpans.'
  );
});
