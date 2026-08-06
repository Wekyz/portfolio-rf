/**
 * Limitation de débit et compteurs d'abus, partagés par les fonctions
 * serverless.
 *
 * Le limiteur ne s'activait que si les deux variables Upstash étaient
 * définies, et se taisait sinon : rien, ni au build ni à l'exécution, ne
 * disait si la protection était réellement en place en production. Le repli
 * reste volontaire - mieux vaut un formulaire qui fonctionne sans limiteur
 * qu'un formulaire cassé - mais il est désormais annoncé dans les journaux de
 * la fonction (Vercel → Logs).
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const limiterEnabled = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = limiterEnabled ? Redis.fromEnv() : null;

/**
 * @param {string} prefix  espace de noms Upstash
 * @param {number} max     requêtes autorisées
 * @param {`${number} ${string}`} window  fenêtre glissante, ex. '10 m'
 */
export function createLimiter(prefix, max, window) {
  if (!limiterEnabled) {
    // Visible dans les journaux de la fonction au premier démarrage à froid.
    console.warn(
      `[${prefix}] limitation de débit DÉSACTIVÉE : UPSTASH_REDIS_REST_URL ou ` +
        'UPSTASH_REDIS_REST_TOKEN manquante. La fonction accepte toutes les requêtes.'
    );
    return null;
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window),
    analytics: true,
    prefix,
  });
}

/** Adresse IP du client, telle que Vercel la transmet. */
export function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}

/**
 * Compteur mensuel par motif de rejet. Sans lui, les soumissions écartées ne
 * laissaient aucune trace : impossible de savoir si le dispositif antispam
 * est surdimensionné ou déjà dépassé - et donc s'il faut ajouter un captcha.
 *
 * Volontairement silencieux en cas d'échec : un compteur d'observation ne
 * doit jamais faire échouer la requête qu'il observe.
 */
export function countRejection(reason) {
  if (!redis) return;
  const month = new Date().toISOString().slice(0, 7); // AAAA-MM
  redis.incr(`abuse:${month}:${reason}`).catch(() => {});
}
