/**
 * Limitation de débit et compteurs d'abus, partagés par les fonctions
 * serverless.
 *
 * Le limiteur ne s'activait que si les deux variables Upstash étaient
 * définies, et se taisait sinon : rien, ni au build ni à l'exécution, ne
 * disait si la protection était réellement en place en production. Le repli
 * reste volontaire - mieux vaut un formulaire qui fonctionne sans limiteur
 * qu'un formulaire cassé - mais il est désormais annoncé dans les journaux de
 * la fonction (console « Exécution » du site dans le Manager Infomaniak).
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const limiterEnabled = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

/**
 * Client Upstash partagé, exporté pour les compteurs d'observation
 * (voir _lib/observe.js). `null` tant que les variables ne sont pas définies :
 * tout ce qui l'utilise doit donc vérifier avant d'écrire.
 */
export const redis = limiterEnabled ? Redis.fromEnv() : null;

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
    // Pas d'analytics : elles enregistrent chaque identifiant, donc chaque
    // IP, pour le tableau de bord Upstash, sans durée limitée. La politique
    // de confidentialité affirme que l'IP n'est « ni conservée durablement ».
    // Les compteurs de rejet (countRejection) suffisent, et ne contiennent
    // aucune IP. Économise aussi des commandes sur le quota gratuit.
    analytics: false,
    prefix,
  });
}

/**
 * Adresse IP du client, premier élément de X-Forwarded-For posé par le
 * frontal Infomaniak. Si ce frontal ajoute l'adresse à un en-tête déjà
 * fourni au lieu de le remplacer, ce premier élément peut être forgé : à
 * vérifier avant de rebrancher Upstash.
 */
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
  incrWithTtl(`abuse:${month}:${reason}`);
}

/**
 * Durée de vie des compteurs mensuels : 400 jours, de quoi comparer un mois
 * à celui de l'année précédente. Ils n'en avaient aucune et s'accumulaient
 * sans fin sur le quota gratuit d'Upstash (ANT-05).
 */
const COUNTER_TTL = 400 * 24 * 3600;

/** INCR puis EXPIRE, silencieux en cas d'échec (voir countRejection). */
export function incrWithTtl(key) {
  if (!redis) return Promise.resolve();
  return Promise.all([redis.incr(key), redis.expire(key, COUNTER_TTL)]).catch(() => {});
}
