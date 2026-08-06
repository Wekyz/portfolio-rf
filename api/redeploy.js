/**
 * Fonction serverless Vercel - déclenche un redéploiement manuel du site via
 * un Vercel Deploy Hook (bouton sur /admin/redeploy.html), sans passer par
 * un commit Git.
 *
 * Utile quand un contenu change en dehors du dépôt (ex. miniature changée
 * directement sur Vimeo, hors CMS) : le build ne se relance pas tout seul
 * dans ce cas - les miniatures sont résolues uniquement au moment du build
 * (voir scripts/fetch-thumbs.mjs), qui n'est déclenché que par un push Git.
 *
 * ── Authentification ─────────────────────────────────────────────────────
 * Cet endpoint était public : n'importe qui pouvait relancer un build de
 * production avec un simple curl, brûler les minutes de build, purger le
 * cache edge en boucle et déclencher une cascade d'appels à l'API Vimeo. La
 * page qui le documente répond 200 et contient l'appel en clair.
 *
 * Il exige désormais un secret partagé. Ce secret n'est PAS écrit dans la
 * page - elle est publique, il y serait lisible par tout le monde : il est
 * saisi par l'utilisatrice et gardé le temps de la session du navigateur.
 *
 * Le comportement est volontairement « fermé par défaut » : sans
 * REDEPLOY_TOKEN configuré, l'endpoint refuse tout. Une porte sans serrure
 * vaut moins qu'une porte condamnée.
 *
 * Variables d'environnement (Vercel → Settings → Environment Variables) :
 *   REDEPLOY_TOKEN            OBLIGATOIRE - phrase secrète, à saisir sur la
 *                              page de redéploiement. Générer une valeur
 *                              longue et aléatoire.
 *   DEPLOY_HOOK_URL           URL du Deploy Hook (Project Settings → Git →
 *                              Deploy Hooks, créer un hook sur la branche main)
 *   UPSTASH_REDIS_REST_URL    rate-limiting (voir api/contact.js) - optionnel
 *   UPSTASH_REDIS_REST_TOKEN  idem
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { createLimiter, clientIp, countRejection } from './_lib/limiter.js';

const ratelimit = createLimiter('redeploy', 3, '10 m');

/**
 * Comparaison à temps constant. Les deux valeurs sont hachées d'abord :
 * `timingSafeEqual` exige des tampons de même longueur, et comparer les
 * longueurs brutes divulguerait déjà celle du secret.
 */
function sameSecret(a, b) {
  const ha = createHash('sha256').update(String(a), 'utf8').digest();
  const hb = createHash('sha256').update(String(b), 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = process.env.REDEPLOY_TOKEN;
  if (!expected) {
    return res.status(503).json({ error: 'Redéploiement désactivé (REDEPLOY_TOKEN non configuré).' });
  }

  // En-tête personnalisé plutôt que corps de requête : un formulaire d'un
  // autre site ne peut pas en poser un sans passer par un contrôle CORS
  // préalable, ce qui écarte au passage la falsification de requête.
  const provided = req.headers['x-redeploy-token'];
  if (!provided || !sameSecret(provided, expected)) {
    countRejection('redeploy-bad-token');
    return res.status(401).json({ error: 'Phrase secrète invalide.' });
  }

  // Le rate-limit reste une défense de second rideau : il n'empêche pas un
  // secret volé d'être utilisé, mais il borne les dégâts.
  if (ratelimit) {
    const { success } = await ratelimit.limit(clientIp(req));
    if (!success) {
      countRejection('redeploy-rate-limit');
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
