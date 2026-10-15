/**
 * Contrôle d'un déploiement Vercel réel (CI-05).
 *
 * Les en-têtes de vercel.json, ses redirections et les fonctions de api/ ne
 * tournent qu'une fois déployés : `astro preview` ne les connaît pas, la CI
 * ne pouvait donc rien en dire. Ce script interroge l'URL d'un déploiement
 * (preview de PR ou production) et vérifie ce qui ne se voit qu'en ligne.
 *
 *   node scripts/check-deployment.mjs https://<deploiement>.vercel.app
 *
 * Si la protection des previews Vercel est active, définir
 * VERCEL_AUTOMATION_BYPASS_SECRET (Project Settings > Deployment Protection >
 * Protection Bypass for Automation) : le script l'envoie dans l'en-tête prévu.
 *
 * Sortie : une ligne par contrôle, résumé dans GITHUB_STEP_SUMMARY si présent,
 * code 1 au premier échec constaté (tous les contrôles tournent quand même).
 */
import { appendFile } from 'node:fs/promises';

const base = (process.argv[2] || '').replace(/\/$/, '');
// http://localhost : le serveur Infomaniak (server/index.mjs) lancé en local.
if (!/^(https:\/\/|http:\/\/localhost[:/])/.test(base + '/')) {
  console.error('Usage : node scripts/check-deployment.mjs https://<deploiement>');
  process.exit(2);
}

const headers = {};
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  headers['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}

/** Requête sans suivre les redirections : c'est leur code qu'on vérifie. */
const get = (path) =>
  fetch(`${base}${path}`, { headers, redirect: 'manual', signal: AbortSignal.timeout(15_000) });

const results = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail || '' });
  } catch (err) {
    results.push({ name, ok: false, detail: err.message });
  }
}
const expect = (cond, message) => {
  if (!cond) throw new Error(message);
};

await check('Accueil en 200, en-têtes de sécurité', async () => {
  const r = await get('/');
  expect(r.status === 200, `HTTP ${r.status}`);
  for (const h of ['strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy']) {
    expect(r.headers.get(h), `en-tête ${h} absent`);
  }
  expect(/frame-ancestors/.test(r.headers.get('content-security-policy') || ''), 'CSP (frame-ancestors) absente');
  const html = await r.text();
  expect(/http-equiv="content-security-policy"/i.test(html), 'CSP <meta> absente du HTML');
});

await check('/portfolio/ redirige en 308 vers /portfolio', async () => {
  const r = await get('/portfolio/');
  expect(r.status === 308, `HTTP ${r.status}`);
  expect(/\/portfolio$/.test(r.headers.get('location') || ''), `Location : ${r.headers.get('location')}`);
});

await check('/index.html redirige en 308 vers / (SEO-05)', async () => {
  const r = await get('/index.html');
  expect(r.status === 308, `HTTP ${r.status}`);
});

await check('/favicon.ico existe', async () => {
  const r = await get('/favicon.ico');
  expect(r.status === 200, `HTTP ${r.status}`);
});

await check('Une page inexistante répond 404', async () => {
  const r = await get('/cette-page-nexiste-pas');
  expect(r.status === 404, `HTTP ${r.status}`);
});

await check('/api/form-token délivre un jeton', async () => {
  const r = await get('/api/form-token');
  expect(r.status === 200, `HTTP ${r.status}`);
  const data = await r.json();
  expect(typeof data.token === 'string' && data.token.length > 10, 'pas de jeton dans la réponse');
});

await check('/api/contact refuse un GET', async () => {
  const r = await get('/api/contact');
  expect(r.status === 405, `HTTP ${r.status}`);
});

await check('Les pages /admin/ ne sont pas indexables', async () => {
  const r = await get('/admin/redeploy.html');
  expect(/noindex/.test(r.headers.get('x-robots-tag') || ''), 'X-Robots-Tag absent');
});

const lines = results.map((r) => `${r.ok ? 'OK ' : 'ÉCHEC'}  ${r.name}${r.detail ? ` : ${r.detail}` : ''}`);
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `## Contrôle du déploiement\n\n${base}\n\n${results
      .map((r) => `- ${r.ok ? '✅' : '❌'} ${r.name}${r.detail ? ` : ${r.detail}` : ''}`)
      .join('\n')}\n`
  );
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
