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
import { issueToken } from '../api/_lib/form-token.js';

// Clé de signature explicite, posée avant toute fabrication de jeton : sans
// elle, issueToken() se rabat sur RESEND_API_KEY, dont la présence dépend de
// l'ordre d'exécution des tests.
process.env.FORM_SECRET = 'cle-de-signature-de-test';

/**
 * Jeton signé daté d'il y a 10 secondes : le serveur exige un âge minimal de
 * 3 secondes. La clé de signature se dérive de RESEND_API_KEY quand
 * FORM_SECRET n'est pas définie, d'où la nécessité de la poser avant.
 */
function validToken() {
  return issueToken(Date.now() - 10_000);
}

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
          formToken: validToken(),
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
        // Jeton valide : sans lui la requête serait refusée en 400 avant
        // d'atteindre le contrôle de configuration.
        formToken: validToken(),
      }),
    },
    res
  );
  assert.equal(res.statusCode, 500);
});

// ── SE-03 : limites de taille et en-tête de sujet ────────────────────────────

/** Requête valide, à laquelle on surcharge un champ. */
function valid(extra = {}) {
  return {
    method: 'POST',
    headers: {},
    body: JSON.stringify({
      'first-name': 'Jane',
      'last-name': 'Doe',
      email: 'jane@example.com',
      message: 'Bonjour, je vous contacte pour un projet.',
      formToken: validToken(),
      ...extra,
    }),
  };
}

async function withResend(req) {
  process.env.RESEND_API_KEY = 'test-key';
  process.env.CONTACT_EMAIL = 'contact@example.com';
  const res = mockRes();
  const originalFetch = global.fetch;
  let sent = null;
  global.fetch = async (_url, init) => {
    sent = JSON.parse(init.body);
    return { ok: true };
  };
  try {
    await handler(req, res);
  } finally {
    global.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
    delete process.env.CONTACT_EMAIL;
  }
  return { res, sent };
}

test('un champ démesuré est refusé en 413, sans rien envoyer', async () => {
  const { res, sent } = await withResend(valid({ 'first-name': 'A'.repeat(100_001) }));
  assert.equal(res.statusCode, 413);
  assert.equal(sent, null, 'aucun email ne doit partir');
});

test('un message de plus de 5000 caractères est refusé', async () => {
  const { res } = await withResend(valid({ message: 'x'.repeat(5001) }));
  assert.equal(res.statusCode, 413);
});

test('une adresse de plus de 254 caractères est refusée', async () => {
  const { res } = await withResend(valid({ email: 'a'.repeat(250) + '@example.com' }));
  assert.equal(res.statusCode, 413);
});

test('les retours à la ligne ne peuvent pas être injectés dans le sujet', async () => {
  const { res, sent } = await withResend(
    valid({ 'first-name': 'Jane\r\nBcc: victime@example.com', 'last-name': 'Doe' })
  );
  assert.equal(res.statusCode, 200);
  assert.ok(!/[\r\n]/.test(sent.subject), 'le sujet ne doit contenir aucun saut de ligne');
  assert.ok(sent.subject.includes('Bcc:'), 'le texte est conservé, seul le saut de ligne saute');
});

// ── SE-04 : délai anti-bot vérifié côté serveur ──────────────────────────────

test('sans jeton : refusé, le contrôle ne dépend plus du navigateur', async () => {
  process.env.RESEND_API_KEY = 'test-key';
  const res = mockRes();
  const originalFetch = global.fetch;
  let called = false;
  global.fetch = async () => { called = true; return { ok: true }; };
  try {
    await handler(
      {
        method: 'POST',
        headers: {},
        body: JSON.stringify({
          'first-name': 'Bot',
          'last-name': 'Net',
          email: 'bot@example.com',
          message: 'spam',
        }),
      },
      res
    );
  } finally {
    global.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
  }
  assert.equal(res.statusCode, 400);
  assert.equal(called, false);
});

test('jeton trop récent : refusé en 429', async () => {
  process.env.RESEND_API_KEY = 'test-key';
  const res = mockRes();
  try {
    await handler(valid({ formToken: issueToken(Date.now()) }), res);
  } finally {
    delete process.env.RESEND_API_KEY;
  }
  assert.equal(res.statusCode, 429);
});

test('jeton falsifié : refusé', async () => {
  process.env.RESEND_API_KEY = 'test-key';
  const res = mockRes();
  try {
    const forged = `${Date.now() - 10_000}.signature-inventee`;
    await handler(valid({ formToken: forged }), res);
  } finally {
    delete process.env.RESEND_API_KEY;
  }
  assert.equal(res.statusCode, 400);
});

test('jeton périmé au-delà de deux heures : refusé', async () => {
  process.env.RESEND_API_KEY = 'test-key';
  const res = mockRes();
  try {
    await handler(valid({ formToken: issueToken(Date.now() - 3 * 60 * 60 * 1000) }), res);
  } finally {
    delete process.env.RESEND_API_KEY;
  }
  assert.equal(res.statusCode, 400);
});
