/**
 * Server-side email handler.
 *
 * Renvoie une redirection 302 vers `mailto:<email>`. L'adresse est lue dans
 * la variable d'environnement CONTACT_EMAIL côté Netlify, de sorte qu'elle
 * n'apparaisse jamais dans le code source statique ni dans le bundle JS
 * (protection contre les scrapers d'adresses).
 *
 * Configuration :
 *   1. Netlify dashboard → Site settings → Environment variables
 *   2. Ajouter   CONTACT_EMAIL = roxane.foare@gmail.com
 *
 * URL publique : /api/email   (mappée dans netlify.toml)
 */

exports.handler = async () => {
  const email = process.env.CONTACT_EMAIL;

  if (!email) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'CONTACT_EMAIL env variable is not configured.'
    };
  }

  return {
    statusCode: 302,
    headers: {
      Location: `mailto:${encodeURIComponent(email).replace(/%40/g, '@')}`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer'
    },
    body: ''
  };
};
