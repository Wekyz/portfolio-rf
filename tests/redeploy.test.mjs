/**
 * Test fumée pour /api/redeploy - déclenchement manuel d'un build via
 * Vercel Deploy Hook (bouton /admin/redeploy.html).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/redeploy.js';

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

test('DEPLOY_HOOK_URL non configurée : répond 500', async () => {
  const res = mockRes();
  await handler({ method: 'POST', headers: {} }, res);
  assert.equal(res.statusCode, 500);
});

test('deploy hook répond en erreur : répond 502', async () => {
  process.env.DEPLOY_HOOK_URL = 'https://api.vercel.com/v1/integrations/deploy/test';

  const res = mockRes();
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 500 });
  try {
    await handler({ method: 'POST', headers: {} }, res);
  } finally {
    global.fetch = originalFetch;
    delete process.env.DEPLOY_HOOK_URL;
  }

  assert.equal(res.statusCode, 502);
});

test('déclenchement réussi : répond 200', async () => {
  process.env.DEPLOY_HOOK_URL = 'https://api.vercel.com/v1/integrations/deploy/test';

  const res = mockRes();
  const originalFetch = global.fetch;
  let calledUrl = null;
  let calledMethod = null;
  global.fetch = async (url, init) => {
    calledUrl = url;
    calledMethod = init?.method;
    return { ok: true };
  };
  try {
    await handler({ method: 'POST', headers: {} }, res);
  } finally {
    global.fetch = originalFetch;
    delete process.env.DEPLOY_HOOK_URL;
  }

  assert.equal(calledUrl, 'https://api.vercel.com/v1/integrations/deploy/test');
  assert.equal(calledMethod, 'POST');
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
});
