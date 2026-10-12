import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contentHash } from '../src/lib/content-hash.js';

// Fiche telle qu'elle était écrite à la main, puis telle que le CMS la
// réenregistre : tous les champs, vides compris, dans un autre ordre.
const avant = { cat: 'pub', title: 'Hanro', director: 'Thomas Gérard', year: '2024', id: '902943514', thumb: '' };
const apresCms = {
  cat: 'pub',
  title: 'Hanro',
  production: '',
  director: 'Thomas Gérard',
  format: null,
  role: '',
  year: '2024',
  id: '902943514',
  thumb: '',
  fullWidth: false,
  poster: false,
  awards: [],
  featured: false,
  slug: '',
};

test('un réenregistrement par le CMS ne change pas l’empreinte', () => {
  assert.equal(contentHash(apresCms), contentHash(avant));
});

test('l’ordre des clés ne compte pas', () => {
  const inverse = Object.fromEntries(Object.entries(avant).reverse());
  assert.equal(contentHash(inverse), contentHash(avant));
});

test('une vraie modification change l’empreinte', () => {
  assert.notEqual(contentHash({ ...avant, year: '2025' }), contentHash(avant));
  assert.notEqual(contentHash({ ...avant, poster: true }), contentHash(avant));
  assert.notEqual(contentHash({ ...avant, format: { fr: '26 min', en: '26 min' } }), contentHash(avant));
});
