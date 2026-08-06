/**
 * Tests de /api/redeploy - déclenchement manuel d'un build via Vercel Deploy
 * Hook (bouton /admin/redeploy.html).
 *
 * L'endpoint était public et non authentifié : n'importe qui pouvait relancer
 * un build de production. Les cas d'authentification ci-dessous verrouillent
 * le correctif, y compris le comportement « fermé par défaut » quand le
 * secret n'est pas configuré.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/redeploy.js';

const SECRET = 'phrase-secrete-de-test';
const HOOK = 'https://api.vercel.com/v1/integrations/deploy/test';

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

/** Requête POST authentifiée, sauf indication contraire. */
const post = (token = SECRET) => ({
  method: 'POST',
  headers: token === null ? {} : { 'x-redeploy-token': token },
});

/** Exécute le handler avec un environnement et un fetch maîtrisés. */
async function run(req, { secret = SECRET, hook = HOOK, fetchImpl } = {}) {
  const res = mockRes();
  const originalFetch = global.fetch;
  const calls = [];
  if (secret) process.env.REDEPLOY_TOKEN = secret;
  else delete process.env.REDEPLOY_TOKEN;
  if (hook) process.env.DEPLOY_HOOK_URL = hook;
  else delete process.env.DEPLOY_HOOK_URL;
  global.fetch = fetchImpl || (async (url, init) => { calls.push({ url, method: init?.method }); return { ok: true }; });
  try {
    await handler(req, res);
  } finally {
    global.fetch = originalFetch;
    delete process.env.REDEPLOY_TOKEN;
    delete process.env.DEPLOY_HOOK_URL;
  }
  return { res, calls };
}

test('refuse les méthodes autres que POST', async () => {
  const { res } = await run({ method: 'GET', headers: {} });
  assert.equal(res.statusCode, 405);
});

test('sans phrase secrète : refuse et ne déclenche rien', async () => {
  const { res, calls } = await run(post(null));
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 0, 'aucun build ne doit être déclenché');
});

test('avec une mauvaise phrase secrète : refuse et ne déclenche rien', async () => {
  const { res, calls } = await run(post('mauvaise-phrase'));
  assert.equal(res.statusCode, 401);
  assert.equal(calls.length, 0);
});

test('une phrase secrète de même préfixe est rejetée', async () => {
  // Garde-fou contre une comparaison qui s'arrêterait au premier écart.
  const { res } = await run(post(SECRET.slice(0, -1)));
  assert.equal(res.statusCode, 401);
});

test('REDEPLOY_TOKEN non configuré : fermé par défaut, aucun appel', async () => {
  const { res, calls } = await run(post(), { secret: null });
  assert.equal(res.statusCode, 503, 'doit refuser plutôt que laisser passer');
  assert.equal(calls.length, 0);
});

test('DEPLOY_HOOK_URL non configurée : répond 500', async () => {
  const { res } = await run(post(), { hook: null });
  assert.equal(res.statusCode, 500);
});

test('deploy hook répond en erreur : répond 502', async () => {
  const { res } = await run(post(), { fetchImpl: async () => ({ ok: false, status: 500 }) });
  assert.equal(res.statusCode, 502);
});

test('deploy hook injoignable : répond 502', async () => {
  const { res } = await run(post(), { fetchImpl: async () => { throw new Error('réseau'); } });
  assert.equal(res.statusCode, 502);
});

test('phrase secrète valide : déclenche le build et répond 200', async () => {
  const { res, calls } = await run(post());
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.deepEqual(calls, [{ url: HOOK, method: 'POST' }]);
});
