/**
 * Observation des fonctions serverless.
 *
 * Rien n'était instrumenté au-delà des compteurs de pages vues. Si Resend
 * tombe, si RESEND_API_KEY expire, si le quota gratuit est atteint ou si une
 * variable d'environnement disparaît, la fonction répond 502, le visiteur voit
 * « Erreur - réessayez » pendant quatre secondes, et personne n'apprend jamais
 * que l'envoi a échoué. Un producteur qui écrit une fois sans réponse n'écrit
 * pas deux fois.
 *
 * Deux niveaux, sans dépendance nouvelle ni prestataire supplémentaire :
 *
 *  1. `console.error` préfixé `[rf-error]`, donc filtrable dans les journaux
 *     Vercel et accrochable à une alerte de Log Drain.
 *  2. Compteurs et derniers incidents dans Upstash, déjà en place pour la
 *     limitation de débit, et lisibles depuis /api/status.
 *
 * ── Données personnelles ───────────────────────────────────────────────
 * `stashFailedMessage` ne conserve un message QUE si son envoi a échoué -
 * c'est-à-dire exactement quand le canal normal l'a perdu. Un envoi réussi
 * n'est pas dupliqué ici : il est déjà chez Resend et dans la boîte. La
 * conservation est bornée à 90 jours par un TTL, et la politique de
 * confidentialité le mentionne.
 */
import { redis } from './limiter.js';

const MOIS = () => new Date().toISOString().slice(0, 7);
/** Assez pour voir une panne en cours, trop peu pour constituer un journal. */
const MAX_INCIDENTS = 20;
const MAX_MESSAGES = 50;
const TTL_MESSAGES = 90 * 24 * 3600;

/**
 * Consigne un incident. Volontairement silencieux si Upstash est absent ou
 * refuse : un dispositif d'observation ne doit jamais faire échouer la requête
 * qu'il observe.
 *
 * @param {string} kind  motif court et stable, ex. 'resend-http' ou 'resend-network'
 * @param {string} [detail]  complément non sensible (code HTTP, message d'erreur)
 */
export function reportError(kind, detail = '') {
  // Toujours dans les journaux, même sans Upstash.
  console.error(`[rf-error] ${kind}${detail ? ` : ${detail}` : ''}`);
  if (!redis) return;
  const at = new Date().toISOString();
  Promise.all([
    redis.incr(`errors:${MOIS()}:${kind}`),
    redis.lpush('errors:last', JSON.stringify({ at, kind, detail: String(detail).slice(0, 200) })),
    redis.ltrim('errors:last', 0, MAX_INCIDENTS - 1),
  ]).catch(() => {});
}

/** Compteur mensuel des envois acceptés, pour donner une base de comparaison. */
export function countSent() {
  if (!redis) return;
  redis.incr(`sent:${MOIS()}`).catch(() => {});
}

/**
 * Met de côté un message dont l'envoi a échoué, pour qu'il ne soit pas
 * simplement perdu. Le visiteur, lui, voit une erreur et peut réessayer.
 */
export function stashFailedMessage({ firstName, lastName, email, message }) {
  if (!redis) return;
  const entry = JSON.stringify({
    at: new Date().toISOString(),
    name: `${firstName} ${lastName}`.trim().slice(0, 120),
    email: String(email).slice(0, 254),
    message: String(message || '').slice(0, 2000),
  });
  Promise.all([
    redis.lpush('messages:failed', entry),
    redis.ltrim('messages:failed', 0, MAX_MESSAGES - 1),
    redis.expire('messages:failed', TTL_MESSAGES),
  ]).catch(() => {});
}

/** Analyse en JSON les entrées d'une liste Upstash, en ignorant les illisibles. */
const parseList = (rows) =>
  (rows || [])
    .map((r) => {
      try {
        return typeof r === 'string' ? JSON.parse(r) : r;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

/**
 * État consolidé, servi par /api/status. Une seule lecture de tous les
 * compteurs du mois courant plutôt qu'un balayage : les clés sont connues,
 * c'est `countRejection` et `reportError` qui les écrivent.
 */
export async function readStatus() {
  if (!redis) {
    return { upstash: false, note: 'UPSTASH_REDIS_REST_URL/_TOKEN absentes : rien n’est compté.' };
  }
  const mois = MOIS();
  const motifs = [
    'rate-limit',
    'honeypot',
    'too-long',
    'invalid-fields',
    'too-fast',
    'bad-token',
    'captcha-missing',
    'captcha-invalid',
    'captcha-unreachable',
    'redeploy-bad-token',
    'redeploy-rate-limit',
  ];

  const [sent, rejets, incidents, echecs] = await Promise.all([
    redis.get(`sent:${mois}`),
    Promise.all(motifs.map((m) => redis.get(`abuse:${mois}:${m}`))),
    redis.lrange('errors:last', 0, MAX_INCIDENTS - 1),
    redis.lrange('messages:failed', 0, MAX_MESSAGES - 1),
  ]);

  const rejections = {};
  motifs.forEach((m, i) => {
    const n = Number(rejets[i] || 0);
    if (n > 0) rejections[m] = n;
  });

  return {
    upstash: true,
    month: mois,
    sent: Number(sent || 0),
    rejections,
    errors: parseList(incidents),
    failedMessages: parseList(echecs),
  };
}
