/**
 * Fonction serverless Vercel - délivre un jeton horodaté et signé au
 * formulaire de contact (voir api/_lib/form-token.js).
 *
 * Appelée par app.js à la première interaction avec le formulaire, pas au
 * chargement de la page : inutile de déclencher une invocation pour un
 * visiteur qui ne remplira jamais rien, ni pour un robot d'indexation.
 */
import { issueToken } from './_lib/form-token.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const token = issueToken();
  // `no-store` : un jeton mis en cache par un intermédiaire perdrait tout son
  // intérêt, plusieurs visiteurs partageraient le même horodatage.
  res.setHeader('Cache-Control', 'no-store');
  // `disabled` côté vérification : on renvoie 200 avec un jeton nul plutôt
  // qu'une erreur, le formulaire doit rester utilisable.
  return res.status(200).json({ token });
}
