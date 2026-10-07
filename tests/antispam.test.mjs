/**
 * Anti-spam (ANT-02, ANT-03) : jeton à usage unique et indices de contenu.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { suspicionReasons } from '../api/_lib/spam.js';
import { consumeToken, releaseToken } from '../api/_lib/form-token.js';

const champs = (extra = {}) => ({
  firstName: 'Marie',
  lastName: 'Dupont',
  email: 'marie@studio.com',
  message: 'Bonjour, un documentaire de 52 minutes à monter en novembre.',
  ...extra,
});

test('un message ordinaire n’est pas suspect', () => {
  assert.deepEqual(suspicionReasons(champs()), []);
  // Un lien ou deux vers un film à voir, c'est normal.
  assert.deepEqual(
    suspicionReasons(champs({ message: 'Le teaser : https://vimeo.com/1 et le site https://exemple.fr' })),
    []
  );
});

test('les indices de spam sont reconnus, chacun avec son motif', () => {
  assert.deepEqual(
    suspicionReasons(champs({ message: 'https://a.io https://b.io https://c.io' })),
    ['liens']
  );
  assert.deepEqual(suspicionReasons(champs({ message: 'Привет, отличный сайт' })), ['cyrillique']);
  assert.deepEqual(suspicionReasons(champs({ message: '你好，合作' })), ['cjk']);
  assert.deepEqual(suspicionReasons(champs({ firstName: 'Robert', lastName: 'robert' })), ['prenom-egal-nom']);
  assert.deepEqual(
    suspicionReasons(champs({ message: 'We can boost your SEO with quality backlinks.' })),
    ['mots-cles']
  );
});

test('les mots-clés ne se déclenchent pas au milieu d’un mot', () => {
  // « seo » dans « Seoul », « loan » dans « Sloane » : pas de faux positif.
  assert.deepEqual(suspicionReasons(champs({ message: 'Tournage à Seoul puis Sloane Square.' })), []);
});

/** Faux client Upstash : SET NX et DEL, en mémoire. */
function fauxRedis() {
  const store = new Map();
  return {
    store,
    async set(key, value, opts) {
      if (opts?.nx && store.has(key)) return null;
      store.set(key, value);
      return 'OK';
    },
    async del(key) {
      store.delete(key);
      return 1;
    },
  };
}

test('un jeton ne sert qu’une fois', async () => {
  const redis = fauxRedis();
  assert.equal(await consumeToken('1700000000000.signature', redis), true);
  assert.equal(await consumeToken('1700000000000.signature', redis), false, 'second envoi refusé');
  assert.equal(await consumeToken('1700000000001.autre', redis), true, 'un autre jeton passe');
});

test('un jeton rendu après un échec d’envoi resservira', async () => {
  const redis = fauxRedis();
  await consumeToken('1.sig', redis);
  await releaseToken('1.sig', redis);
  assert.equal(await consumeToken('1.sig', redis), true);
});

test('sans Upstash, la vérification est inactive plutôt que bloquante', async () => {
  assert.equal(await consumeToken('1.sig', null), true);
  assert.equal(await consumeToken('1.sig', null), true);
});
