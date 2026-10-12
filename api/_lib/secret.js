/**
 * Comparaison à temps constant d'un secret partagé, et contrôle du jeton
 * d'administration.
 *
 * Extrait de api/redeploy.js, qui n'en avait plus l'exclusivité depuis que
 * /api/status expose les compteurs derrière le même secret. Une deuxième
 * implémentation de la comparaison aurait été une occasion de la faire moins
 * bien.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { createLimiter, clientIp, countRejection } from './limiter.js';

/**
 * Longueur minimale du secret. Une phrase courte se devine par essais
 * successifs ; à 32 caractères aléatoires, c'est hors de portée même sans
 * limiteur. En dessous, l'administration reste fermée.
 */
export const MIN_SECRET_LENGTH = 32;

/**
 * Échecs d'authentification : 5 par heure et par IP. Le limiteur des
 * endpoints n'intervenait qu'APRÈS une authentification réussie : une
 * tentative refusée répondait 401 sans passer par Upstash, et la phrase
 * secrète pouvait être essayée sans limite. Or /api/status renvoie les
 * messages en échec, donc des noms, adresses et contenus de visiteurs.
 */
const failures = createLimiter('admin-fail', 5, '1 h');

/**
 * Les deux valeurs sont hachées d'abord : `timingSafeEqual` exige des tampons
 * de même longueur, et comparer les longueurs brutes divulguerait déjà celle
 * du secret.
 */
export function sameSecret(a, b) {
  const ha = createHash('sha256').update(String(a), 'utf8').digest();
  const hb = createHash('sha256').update(String(b), 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Vérifie l'en-tête `X-Redeploy-Token` contre `REDEPLOY_TOKEN`.
 *
 * En-tête personnalisé plutôt que corps ou paramètre d'URL : un formulaire
 * d'un autre site ne peut pas en poser un sans passer par un contrôle CORS
 * préalable, et il ne finit ni dans les journaux d'accès ni dans l'historique
 * du navigateur.
 *
 * Fermé par défaut : sans `REDEPLOY_TOKEN` configuré, tout est refusé. Une
 * porte sans serrure vaut moins qu'une porte condamnée.
 *
 * Un secret de moins de MIN_SECRET_LENGTH caractères compte comme absent.
 *
 * @returns {'ok'|'unconfigured'|'denied'}
 */
export function checkAdminToken(req) {
  const expected = process.env.REDEPLOY_TOKEN;
  if (!expected || expected.length < MIN_SECRET_LENGTH) return 'unconfigured';
  const provided = req.headers['x-redeploy-token'];
  if (!provided || !sameSecret(provided, expected)) return 'denied';
  return 'ok';
}

/**
 * Contrôle complet d'un appel d'administration : verrou après 5 échecs en
 * une heure (même avec le bon secret ensuite, le temps que la fenêtre
 * passe), puis vérification du secret. Seuls les échecs consomment le
 * crédit : l'utilisatrice légitime n'est jamais bloquée par ses propres
 * appels réussis.
 *
 * @param {any} req
 * @param {string} reason motif compté en cas de refus, ex. 'redeploy-bad-token'
 * @returns {Promise<'ok'|'unconfigured'|'denied'|'locked'>}
 */
export async function guardAdmin(req, reason) {
  const ip = clientIp(req);
  if (failures) {
    const { remaining } = await failures.getRemaining(ip);
    if (remaining <= 0) {
      countRejection(`${reason}-locked`);
      return 'locked';
    }
  }
  const auth = checkAdminToken(req);
  if (auth === 'denied') {
    countRejection(reason);
    if (failures) await failures.limit(ip);
  }
  return auth;
}
