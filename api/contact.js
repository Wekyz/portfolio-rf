/**
 * Fonction serverless Vercel - réception du formulaire de contact + envoi via
 * Resend (remplace Netlify Forms).
 *
 * Variables d'environnement (Vercel → Settings → Environment Variables) :
 *   RESEND_API_KEY            clé API Resend
 *   CONTACT_EMAIL             adresse de destination (boîte de Roxane)
 *   RESEND_FROM               expéditeur vérifié, ex. "Portfolio <noreply@roxane-foare.com>"
 *   UPSTASH_REDIS_REST_URL    rate-limiting (voir ci-dessous) - optionnel
 *   UPSTASH_REDIS_REST_TOKEN  idem
 *
 * Le `from` doit appartenir à un domaine vérifié dans Resend (SPF/DKIM).
 *
 * Rate limiting (anti-spam) : 5 envois / 10 min par IP, via Upstash Redis
 * (@upstash/ratelimit). Nécessite une base Redis Upstash :
 *   - soit via l'intégration Vercel Marketplace "Upstash" (Storage → Browse
 *     Marketplace → Upstash) qui injecte automatiquement les 2 variables
 *     ci-dessus sur le projet ;
 *   - soit un compte upstash.com (offre gratuite) + copier les 2 valeurs
 *     "REST URL" / "REST TOKEN" de la base dans les env vars Vercel.
 * Tant que ces variables ne sont pas définies, le rate limiting est
 * simplement désactivé (le formulaire continue de fonctionner normalement,
 * protégé par le honeypot + délai anti-bot déjà en place côté client).
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    analytics: true,
    prefix: 'contact-form',
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (ratelimit) {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return res.status(429).json({ error: 'Trop de tentatives, réessayez plus tard.' });
    }
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const firstName = (body['first-name'] || '').toString().trim();
  const lastName = (body['last-name'] || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const message = (body.message || '').toString().trim();
  const honeypot = (body['bot-field'] || '').toString().trim();

  // Honeypot rempli => bot. On répond OK sans rien envoyer.
  if (honeypot) return res.status(200).json({ ok: true });

  if (!firstName || !lastName || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'Champs requis manquants ou email invalide.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_EMAIL;
  const from = process.env.RESEND_FROM || 'Portfolio <noreply@roxane-foare.com>';
  if (!apiKey || !to) {
    return res.status(500).json({ error: 'Service email non configuré.' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Nouveau message - ${firstName} ${lastName}`,
        text: `De : ${firstName} ${lastName} <${email}>\n\n${message || '(aucun message)'}`,
      }),
    });
    if (!r.ok) {
      return res.status(502).json({ error: 'Envoi impossible.' });
    }
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'Envoi impossible.' });
  }
}
