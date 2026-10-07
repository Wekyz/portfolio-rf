/**
 * Dates de dernière modification (sitemap `lastmod` et JSON-LD
 * `dateModified`). Le sitemap annonçait la date du build sur ses 150 URL ;
 * ces tests vérifient que chaque page a désormais une date réelle et
 * plausible.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lastModified, FIXED_PAGE_DATES } from '../src/lib/page-dates.js';
import { projectRoutes } from '../src/lib/slug.js';

const raw = JSON.parse(readFileSync(new URL('../src/data/videos.json', import.meta.url), 'utf8'));
const routes = projectRoutes(raw.videos || raw);
const contentDates = JSON.parse(
  readFileSync(new URL('../src/data/content-dates.json', import.meta.url), 'utf8')
);

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const today = new Date().toISOString().slice(0, 10);

test('chaque page fixe a une date valide, pas dans le futur', () => {
  for (const [path, date] of Object.entries(FIXED_PAGE_DATES)) {
    assert.match(date, ISO_DAY, `date mal formée pour "${path}"`);
    assert.ok(!Number.isNaN(Date.parse(date)), `date invalide pour "${path}"`);
    assert.ok(date <= today, `date future pour "${path}" : ${date}`);
  }
});

test('chaque fiche projet a la date de son contenu', () => {
  for (const { slug } of routes) {
    assert.equal(lastModified(`/portfolio/${slug}`), contentDates[slug]?.date, slug);
    assert.match(lastModified(`/portfolio/${slug}`) ?? '', ISO_DAY, `pas de date pour ${slug}`);
  }
});

test('accueil et portfolio suivent le dernier projet modifié', () => {
  const latest = Object.values(contentDates).map((e) => e.date).sort().at(-1);
  for (const path of ['', '/portfolio']) {
    assert.ok(lastModified(path) >= latest, path);
    assert.ok(lastModified(path) >= FIXED_PAGE_DATES[path], path);
  }
});

test('les autres pages fixes gardent leur propre date', () => {
  assert.equal(lastModified('/legal'), FIXED_PAGE_DATES['/legal']);
  assert.equal(lastModified('/about'), FIXED_PAGE_DATES['/about']);
});

test('une page inconnue n’a pas de date (pas de date inventée)', () => {
  assert.equal(lastModified('/404'), undefined);
  assert.equal(lastModified('/portfolio/projet-inexistant'), undefined);
});
