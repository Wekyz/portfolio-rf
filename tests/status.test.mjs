/**
 * Contrôle du secret d'administration et lecture d'état.
 *
 * Ces deux briques gardent /api/redeploy (qui déclenche un build de
 * production) et /api/status (qui expose des adresses e-mail de visiteurs).
 * Leur comportement par défaut compte autant que le cas nominal : sans secret
 * configuré, tout doit être refusé.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sameSecret, checkAdminToken } from '../api/_lib/secret.js';
import { readStatus } from '../api/_lib/observe.js';

const req = (token) => ({ headers: token === undefined ? {} : { 'x-redeploy-token': token } });

test('sameSecret compare sans se laisser piéger par la longueur', () => {
  assert.equal(sameSecret('abc', 'abc'), true);
  assert.equal(sameSecret('abc', 'abd'), false);
  // Longueurs différentes : les deux valeurs sont hachées d'abord, donc la
  // comparaison reste possible sans divulguer la longueur du secret.
  assert.equal(sameSecret('abc', 'abcdefghijklmnop'), false);
  assert.equal(sameSecret('', ''), true);
});

test('sans REDEPLOY_TOKEN, tout est refusé (fermé par défaut)', () => {
  const avant = process.env.REDEPLOY_TOKEN;
  delete process.env.REDEPLOY_TOKEN;
  try {
    assert.equal(checkAdminToken(req('nimporte quoi')), 'unconfigured');
    assert.equal(checkAdminToken(req()), 'unconfigured');
  } finally {
    if (avant !== undefined) process.env.REDEPLOY_TOKEN = avant;
  }
});

test('avec REDEPLOY_TOKEN, seul le bon en-tête passe', () => {
  const avant = process.env.REDEPLOY_TOKEN;
  process.env.REDEPLOY_TOKEN = 'phrase-secrete-de-test';
  try {
    assert.equal(checkAdminToken(req('phrase-secrete-de-test')), 'ok');
    assert.equal(checkAdminToken(req('mauvaise')), 'denied');
    assert.equal(checkAdminToken(req('')), 'denied');
    assert.equal(checkAdminToken(req()), 'denied', 'en-tête absent');
  } finally {
    if (avant === undefined) delete process.env.REDEPLOY_TOKEN;
    else process.env.REDEPLOY_TOKEN = avant;
  }
});

test('readStatus le dit franchement quand Upstash est absent', async () => {
  // Les tests tournent sans variables Upstash : c'est aussi l'état d'un
  // déploiement mal configuré, et la page d'administration doit alors afficher
  // « rien n'est compté » plutôt qu'un tableau de zéros rassurant.
  const s = await readStatus();
  assert.equal(s.upstash, false);
  assert.match(s.note, /UPSTASH/);
});
