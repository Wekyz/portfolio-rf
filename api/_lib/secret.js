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
 * @returns {'ok'|'unconfigured'|'denied'}
 */
export function checkAdminToken(req) {
  const expected = process.env.REDEPLOY_TOKEN;
  if (!expected) return 'unconfigured';
  const provided = req.headers['x-redeploy-token'];
  if (!provided || !sameSecret(provided, expected)) return 'denied';
  return 'ok';
}
