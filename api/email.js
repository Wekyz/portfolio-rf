/**
 * Fonction serverless Vercel - lien « Send me an email ».
 * Renvoie une redirection 302 vers mailto:<CONTACT_EMAIL> pour que l'adresse
 * n'apparaisse jamais dans le HTML/JS (anti-scraping). Équivalent de l'ancienne
 * fonction Netlify.
 *
 * Variable d'environnement : CONTACT_EMAIL
 */
import { createLimiter, clientIp } from './_lib/limiter.js';

// Même raison que /api/form-token : endpoint public, non authentifié, une
// invocation serverless par appel. 60 par tranche de 10 minutes est très
// au-dessus de tout usage humain - on ne clique pas soixante fois sur « Send
// me an email » - tout en bornant l'abus.
const ratelimit = createLimiter('email', 60, '10 m');

export default async function handler(req, res) {
  if (ratelimit) {
    const { success } = await ratelimit.limit(clientIp(req));
    if (!success) {
      res.status(429).setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send('Trop de requêtes.');
    }
  }

  const email = process.env.CONTACT_EMAIL;
  if (!email) {
    res.status(500).setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send('CONTACT_EMAIL non configurée.');
  }
  res.setHeader('Location', `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}`);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  return res.status(302).end();
}
