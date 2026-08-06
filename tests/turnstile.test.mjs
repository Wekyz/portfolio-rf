/**
 * Tests de la vérification Cloudflare Turnstile (api/_lib/turnstile.js).
 *
 * Ce code décide si un message part ou non : les cas d'échec comptent autant
 * que le cas nominal. En particulier `unreachable`, qui doit laisser passer -
 * une panne chez Cloudflare ne doit pas empêcher un client d'écrire.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

/** Recharge le module avec un environnement donné (l'état est figé à l'import). */
async function load(secret) {
  if (secret) process.env.TURNSTILE_SECRET_KEY = secret;
  else delete process.env.TURNSTILE_SECRET_KEY;
  // Le suffixe force un nouveau module : sans lui, l'import serait mis en cache.
  return import(`../api/_lib/turnstile.js?v=${Math.random()}`);
}

/** Remplace fetch le temps d'un appel, et retourne ce qui a été envoyé. */
async function withFetch(impl, fn) {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, body: init?.body ? Object.fromEntries(init.body) : null });
    return impl();
  };
  try {
    return { result: await fn(), calls };
  } finally {
    global.fetch = original;
  }
}

test('sans clé secrète : désactivé, aucun appel réseau', async () => {
  const { verifyTurnstile, turnstileEnabled } = await load(null);
  assert.equal(turnstileEnabled, false);
  const { result, calls } = await withFetch(
    () => { throw new Error('ne doit pas être appelé'); },
    () => verifyTurnstile('un-jeton', '1.2.3.4')
  );
  assert.equal(result, 'disabled');
  assert.equal(calls.length, 0);
});

test('jeton absent : refusé sans interroger Cloudflare', async () => {
  const { verifyTurnstile } = await load('cle-secrete');
  const { result, calls } = await withFetch(
    () => ({ ok: true, json: async () => ({ success: true }) }),
    () => verifyTurnstile('', '1.2.3.4')
  );
  assert.equal(result, 'missing');
  assert.equal(calls.length, 0);
});

test('jeton valide : accepté, et l’IP est transmise pour la vérification', async () => {
  const { verifyTurnstile } = await load('cle-secrete');
  const { result, calls } = await withFetch(
    () => ({ ok: true, json: async () => ({ success: true }) }),
    () => verifyTurnstile('jeton-valide', '1.2.3.4')
  );
  assert.equal(result, 'ok');
  assert.equal(calls[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.deepEqual(calls[0].body, {
    secret: 'cle-secrete',
    response: 'jeton-valide',
    remoteip: '1.2.3.4',
  });
});

test('IP inconnue : le champ remoteip est omis plutôt qu’envoyé faux', async () => {
  const { verifyTurnstile } = await load('cle-secrete');
  const { calls } = await withFetch(
    () => ({ ok: true, json: async () => ({ success: true }) }),
    () => verifyTurnstile('jeton', 'unknown')
  );
  assert.ok(!('remoteip' in calls[0].body));
});

test('Cloudflare répond que le jeton est invalide : refusé', async () => {
  const { verifyTurnstile } = await load('cle-secrete');
  const { result } = await withFetch(
    () => ({ ok: true, json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) }),
    () => verifyTurnstile('jeton-bidon', '1.2.3.4')
  );
  assert.equal(result, 'invalid');
});

test('Cloudflare injoignable : laisse passer, une panne ne doit pas bloquer un client', async () => {
  const { verifyTurnstile } = await load('cle-secrete');
  const reseau = await withFetch(
    () => { throw new Error('réseau'); },
    () => verifyTurnstile('jeton', '1.2.3.4')
  );
  assert.equal(reseau.result, 'unreachable');

  const http = await withFetch(
    () => ({ ok: false, status: 503 }),
    () => verifyTurnstile('jeton', '1.2.3.4')
  );
  assert.equal(http.result, 'unreachable');
});
