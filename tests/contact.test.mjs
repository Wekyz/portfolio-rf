/**
 * Test fumée pour /api/contact - appelle le handler directement (sans
 * serveur HTTP réel) pour vérifier les chemins critiques : honeypot,
 * validation des champs, et tentative d'envoi via Resend sur un cas valide.
 * Sert de garde-fou pour la logique métier (rate-limit, honeypot, Resend),
 * la seule partie "applicative" du site.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/contact.js';

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

test('refuse les méthodes autres que POST', async () => {
  const res = mockRes();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});

test('honeypot rempli : répond 200 sans appeler Resend', async () => {
  const res = mockRes();
  const originalFetch = global.fetch;
  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return { ok: true };
  };
  try {
    await handler(
      {
        method: 'POST',
        headers: {},
        body: JSON.stringify({
          'first-name': 'Test',
          'last-name': 'Bot',
          email: 'bot@example.com',
          'bot-field': 'jaimelespam',
        }),
      },
      res
    );
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(fetchCalled, false);
});

test('champs requis manquants : répond 400', async () => {
  const res = mockRes();
  await handler({ method: 'POST', headers: {}, body: JSON.stringify({}) }, res);
  assert.equal(res.statusCode, 400);
});

test('email invalide : répond 400', async () => {
  const res = mockRes();
  await handler(
    {
      method: 'POST',
      headers: {},
      body: JSON.stringify({
        'first-name': 'Jane',
        'last-name': 'Doe',
        email: 'pas-un-email',
        message: 'Bonjour',
      }),
    },
    res
  );
  assert.equal(res.statusCode, 400);
});

test('soumission valide : tente l\'envoi via Resend', async () => {
  process.env.RESEND_API_KEY = 'test-key';
  process.env.CONTACT_EMAIL = 'contact@example.com';

  const res = mockRes();
  const originalFetch = global.fetch;
  let calledUrl = null;
  let calledInit = null;
  global.fetch = async (url, init) => {
    calledUrl = url;
    calledInit = init;
    return { ok: true };
  };
  try {
    await handler(
      {
        method: 'POST',
        headers: {},
        body: JSON.stringify({
          'first-name': 'Jane',
          'last-name': 'Doe',
          email: 'jane@example.com',
          message: 'Bonjour, je vous contacte pour un projet.',
        }),
      },
      res
    );
  } finally {
    global.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_EMAIL;
  }

  assert.equal(calledUrl, 'https://api.resend.com/emails');
  assert.equal(calledInit.headers.Authorization, 'Bearer test-key');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
});

test('Resend répond en erreur : répond 502 (et le flush Sentry ne bloque pas)', async () => {
  process.env.RESEND_API_KEY = 'test-key';
  process.env.CONTACT_EMAIL = 'contact@example.com';

  const res = mockRes();
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 429, text: async () => 'rate limited' });
  try {
    await handler(
      {
        method: 'POST',
        headers: {},
        body: JSON.stringify({
          'first-name': 'Jane',
          'last-name': 'Doe',
          email: 'jane@example.com',
          message: 'Bonjour',
        }),
      },
      res
    );
  } finally {
    global.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_EMAIL;
  }

  assert.equal(res.statusCode, 502);
  assert.equal(res.body.error, 'Envoi impossible.');
});

test('service email non configuré : répond 500', async () => {
  const res = mockRes();
  await handler(
    {
      method: 'POST',
      headers: {},
      body: JSON.stringify({
        'first-name': 'Jane',
        'last-name': 'Doe',
        email: 'jane@example.com',
        message: 'Bonjour',
      }),
    },
    res
  );
  assert.equal(res.statusCode, 500);
});
