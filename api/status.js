/**
 * Fonction serverless Vercel - état du dispositif antispam et des incidents.
 *
 * Les compteurs d'abus (`abuse:AAAA-MM:*`) tournaient dans Upstash depuis un
 * mois sans qu'aucun endroit ne permette de les consulter : ils avaient été
 * construits pour répondre à une question - « faut-il un captcha ? » - à
 * laquelle on a fini par répondre sans les regarder. Même chose pour les
 * incidents d'envoi, qui n'existaient nulle part.
 *
 * Lecture seule, derrière le même secret que /api/redeploy : une phrase de
 * plus à retenir n'aurait servi à rien, et la page qui l'utilise est la même.
 *
 * Variable d'environnement : REDEPLOY_TOKEN (voir api/redeploy.js).
 */
import { checkAdminToken } from './_lib/secret.js';
import { createLimiter, clientIp, countRejection } from './_lib/limiter.js';
import { readStatus } from './_lib/observe.js';

const ratelimit = createLimiter('status', 30, '10 m');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = checkAdminToken(req);
  if (auth === 'unconfigured') {
    return res.status(503).json({ error: 'Consultation désactivée (REDEPLOY_TOKEN non configuré).' });
  }
  if (auth === 'denied') {
    countRejection('status-bad-token');
    return res.status(401).json({ error: 'Phrase secrète invalide.' });
  }

  if (ratelimit) {
    const { success } = await ratelimit.limit(clientIp(req));
    if (!success) return res.status(429).json({ error: 'Trop de requêtes.' });
  }

  // Ces données contiennent des adresses e-mail de visiteurs : jamais de
  // cache, ni côté navigateur ni côté intermédiaire.
  res.setHeader('Cache-Control', 'no-store');
  try {
    return res.status(200).json(await readStatus());
  } catch {
    return res.status(502).json({ error: 'Lecture impossible.' });
  }
}
