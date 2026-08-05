/**
 * Fonction serverless Vercel - lien « Send me an email ».
 * Renvoie une redirection 302 vers mailto:<CONTACT_EMAIL> pour que l'adresse
 * n'apparaisse jamais dans le HTML/JS (anti-scraping). Équivalent de l'ancienne
 * fonction Netlify.
 *
 * Variable d'environnement : CONTACT_EMAIL
 */
// `_req` : la signature Vercel impose les deux paramètres, mais cette fonction
// ignore la requête (elle répond toujours la même redirection). Le préfixe `_`
// est la convention que TypeScript reconnaît pour « inutilisé volontairement ».
export default function handler(_req, res) {
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
