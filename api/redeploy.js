/**
 * Fonction serverless Vercel - déclenche un redéploiement manuel du site via
 * un Vercel Deploy Hook (bouton sur /admin/redeploy.html), sans passer par
 * un commit Git.
 *
 * Utile quand un contenu change en dehors du dépôt (ex. miniature changée
 * directement sur Vimeo, hors CMS) : le build ne se relance pas tout seul
 * dans ce cas - les miniatures sont résolues uniquement au moment du build
 * (voir scripts/fetch-thumbs.mjs), qui n'est déclenché que par un push Git.
 * Ce endpoint permet de forcer un nouveau build sans avoir besoin de Git.
 *
 * Variables d'environnement (Vercel → Settings → Environment Variables) :
 *   DEPLOY_HOOK_URL           URL du Deploy Hook (Project Settings → Git →
 *                              Deploy Hooks, créer un hook sur la branche main)
 *   UPSTASH_REDIS_REST_URL    rate-limiting (voir api/contact.js) - optionnel
 *   UPSTASH_REDIS_REST_TOKEN  idem
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(3, '10 m'),
    analytics: true,
    prefix: 'redeploy',
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (ratelimit) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return res.status(429).json({ error: 'Trop de tentatives, réessayez dans quelques minutes.' });
    }
  }

  const hookUrl = process.env.DEPLOY_HOOK_URL;
  if (!hookUrl) {
    return res.status(500).json({ error: 'Redéploiement non configuré (DEPLOY_HOOK_URL manquante).' });
  }

  try {
    const r = await fetch(hookUrl, { method: 'POST' });
    if (!r.ok) {
      return res.status(502).json({ error: 'Déclenchement du build impossible.' });
    }
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'Déclenchement du build impossible.' });
  }
}
