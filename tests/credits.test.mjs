/**
 * Crédits d'un projet (CON-02). L'ancien champ unique `credit` s'affichait
 * sous le libellé "Production" quel que soit son contenu, et avec la
 * typographie française sur la version anglaise.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { creditParts, creditLine } from '../src/lib/credits.js';

const videos = JSON.parse(readFileSync(new URL('../src/data/videos.json', import.meta.url), 'utf8')).videos;

test('plus aucun projet ne porte l’ancien champ credit', () => {
  assert.deepEqual(videos.filter((p) => 'credit' in p).map((p) => p.title), []);
});

test('chaque libellé correspond à son information', () => {
  const p = { cat: 'pub', title: 'T', production: 'Atelier B', director: 'Thomas Gérard' };
  assert.deepEqual(
    creditParts(p, 'fr').map(({ label, value }) => [label, value]),
    [['Production', 'Atelier B'], ['Réalisation', 'Thomas Gérard']]
  );
  assert.deepEqual(
    creditParts(p, 'en').map(({ label }) => label),
    ['Production', 'Director']
  );
});

test('les deux-points suivent la typographie de chaque langue', () => {
  const p = { cat: 'pub', title: 'T', production: 'WBA' };
  assert.equal(creditLine(p, 'fr'), 'Production : WBA');
  assert.equal(creditLine(p, 'en'), 'Production: WBA');
});

test('le format est rendu dans la langue de la page, avec repli', () => {
  const p = { cat: 'doc', title: 'T', format: { fr: '5 épisodes de 14 min', en: '5 episodes of 14 min' } };
  assert.equal(creditLine(p, 'fr'), '5 épisodes de 14 min');
  assert.equal(creditLine(p, 'en'), '5 episodes of 14 min');
  assert.equal(creditLine({ cat: 'doc', title: 'T', format: { fr: '30 min' } }, 'en'), '30 min');
});

test('le rôle se lit seul, sans libellé', () => {
  assert.equal(creditLine({ cat: 'live', title: 'T', role: 'LSM Operator' }, 'fr'), 'LSM Operator');
});

test('un projet sans crédit rend une chaîne vide', () => {
  assert.equal(creditLine({ cat: 'pub', title: 'T' }, 'fr'), '');
});
