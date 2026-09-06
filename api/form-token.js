/**
 * Fonction serverless Vercel - délivre un jeton horodaté et signé au
 * formulaire de contact (voir api/_lib/form-token.js).
 *
 * Appelée par app.js à la première interaction avec le formulaire, pas au
 * chargement de la page : inutile de déclencher une invocation pour un
 * visiteur qui ne remplira jamais rien, ni pour un robot d'indexation.
 */
import { issueToken } from './_lib/form-token.js';
import { createLimiter, clientIp } from './_lib/limiter.js';

// Fonction publique et non authentifiée : sans limite, un script trivial
// l'invoque en boucle et consomme le quota d'invocations de l'offre Hobby -
// ce qui couperait le formulaire de contact, c'est-à-dire l'objet du site.
// 30 par tranche de 10 minutes laisse largement de quoi remplir un formulaire,
// y compris en rechargeant la page plusieurs fois.
const ratelimit = createLimiter('form-token', 30, '10 m');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (ratelimit) {
    const { success } = await ratelimit.limit(clientIp(req));
    // 429 sans jeton : app.js retombe sur son propre décompte et l'envoi part
    // quand même. Un visiteur légitime derrière une IP partagée ne doit pas se
    // retrouver bloqué par une protection de volume.
    if (!success) return res.status(429).json({ error: 'Trop de requêtes.' });
  }

  const token = issueToken();
  // `no-store` : un jeton mis en cache par un intermédiaire perdrait tout son
  // intérêt, plusieurs visiteurs partageraient le même horodatage.
  res.setHeader('Cache-Control', 'no-store');
  // `disabled` côté vérification : on renvoie 200 avec un jeton nul plutôt
  // qu'une erreur, le formulaire doit rester utilisable.
  return res.status(200).json({ token });
}
