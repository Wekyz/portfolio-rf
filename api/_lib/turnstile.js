/**
 * Vérification Cloudflare Turnstile - captcha invisible du formulaire.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ DÉSACTIVÉ TANT QUE LES DEUX VARIABLES NE SONT PAS DÉFINIES.          │
 * │   PUBLIC_TURNSTILE_SITE_KEY   clé publique, lue au build par Astro   │
 * │   TURNSTILE_SECRET_KEY        clé privée, lue ici                    │
 * │                                                                      │
 * │ AVANT DE L'ACTIVER : la politique de confidentialité affirme         │
 * │ aujourd'hui qu'aucune requête n'est adressée à un service tiers et   │
 * │ que l'adresse IP du visiteur n'est transmise à personne. Turnstile   │
 * │ transmet cette IP à Cloudflare, société établie aux États-Unis. Le   │
 * │ paragraphe correspondant de src/i18n/legal.js apparaît               │
 * │ automatiquement quand la clé publique est définie, mais l'arbitrage  │
 * │ reste à faire en connaissance de cause.                              │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * À n'activer que si les compteurs d'abus (voir _lib/limiter.js, clés
 * `abuse:AAAA-MM:*` dans Upstash) montrent du spam réellement reçu. Le
 * honeypot et le jeton horodaté signé arrêtent déjà les scripts génériques.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export const turnstileEnabled = Boolean(process.env.TURNSTILE_SECRET_KEY);

/**
 * @returns {Promise<'ok'|'disabled'|'missing'|'invalid'|'unreachable'>}
 * `unreachable` est traité comme un succès par l'appelant : Cloudflare
 * indisponible ne doit pas empêcher un client d'écrire.
 */
export async function verifyTurnstile(token, ip) {
  if (!turnstileEnabled) return 'disabled';
  if (!token || typeof token !== 'string') return 'missing';

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  if (ip && ip !== 'unknown') body.set('remoteip', ip);

  try {
    const r = await fetch(VERIFY_URL, { method: 'POST', body });
    if (!r.ok) return 'unreachable';
    const data = await r.json();
    return data.success ? 'ok' : 'invalid';
  } catch {
    return 'unreachable';
  }
}
