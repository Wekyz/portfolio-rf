/**
 * Alerte immédiate en cas d'incident (AME-02). Sans elle, un envoi en échec
 * n'était visible que dans /admin/redeploy.html.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sendAlert } from '../api/_lib/observe.js';

function fauxFetch() {
  const appels = [];
  const fetchImpl = async (url, init) => {
    appels.push({ url, init });
    return { ok: true };
  };
  return { appels, fetchImpl };
}

test('sans ALERT_WEBHOOK_URL, aucune alerte ne part', async () => {
  const { appels, fetchImpl } = fauxFetch();
  assert.equal(await sendAlert('resend-http', 'HTTP 500', { url: '', fetchImpl }), false);
  assert.equal(appels.length, 0);
});

test('ntfy : texte brut, motif et détail, sans donnée personnelle', async () => {
  const { appels, fetchImpl } = fauxFetch();
  await sendAlert('resend-http', 'HTTP 500', { url: 'https://ntfy.sh/sujet-test', fetchImpl });
  assert.equal(appels.length, 1);
  assert.match(appels[0].init.headers['Content-Type'], /text\/plain/);
  assert.match(appels[0].init.body, /resend-http/);
  assert.match(appels[0].init.body, /HTTP 500/);
  assert.doesNotMatch(appels[0].init.body, /@/);
});

test('Discord et Slack reçoivent le JSON qu’ils attendent', async () => {
  const discord = fauxFetch();
  await sendAlert('config-missing', 'RESEND_API_KEY', {
    url: 'https://discord.com/api/webhooks/1/abc',
    fetchImpl: discord.fetchImpl,
  });
  assert.ok(JSON.parse(discord.appels[0].init.body).content.includes('config-missing'));

  const slack = fauxFetch();
  await sendAlert('config-missing', '', { url: 'https://hooks.slack.com/services/x', fetchImpl: slack.fetchImpl });
  assert.ok(JSON.parse(slack.appels[0].init.body).text.includes('config-missing'));
});

test('un webhook en panne ne fait pas échouer le signalement', async () => {
  const fetchImpl = async () => {
    throw new Error('réseau');
  };
  assert.equal(await sendAlert('resend-network', '', { url: 'https://ntfy.sh/x', fetchImpl }), false);
});
