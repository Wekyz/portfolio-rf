/**
 * Jeton horodaté et signé pour le formulaire de contact.
 *
 * Le délai anti-bot de 3 secondes n'existait que dans app.js : un script qui
 * poste directement sur l'API ne le voyait jamais. Seul le honeypot était
 * vérifié côté serveur, et il se contourne en lisant le HTML.
 *
 * Le jeton est délivré par /api/form-token, transmis avec le formulaire et
 * vérifié ici. L'horodatage vient du serveur et est signé : un client ne peut
 * ni l'antidater ni le forger.
 *
 * Clé de signature : FORM_SECRET si elle est définie, sinon une dérivation de
 * RESEND_API_KEY. Ce repli est volontaire - sans RESEND_API_KEY le formulaire
 * ne peut de toute façon rien envoyer (contact.js répond 500), donc la
 * vérification est active exactement quand le formulaire l'est. Définir
 * FORM_SECRET reste préférable : une clé de signature et une clé d'API ne
 * devraient pas partager la même origine.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const MIN_AGE_MS = 3_000;
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 h : au-delà, l'onglet a dormi

function signingKey() {
  const raw = process.env.FORM_SECRET || process.env.RESEND_API_KEY;
  return raw ? createHmac('sha256', 'rf-form-token').update(raw).digest() : null;
}

/** `<horodatage>.<signature>` ou null si aucune clé n'est disponible. */
export function issueToken(now = Date.now()) {
  const key = signingKey();
  if (!key) return null;
  const ts = String(now);
  return `${ts}.${createHmac('sha256', key).update(ts).digest('base64url')}`;
}

/**
 * @returns {'ok'|'missing'|'invalid'|'too-fast'|'expired'|'disabled'}
 * `disabled` quand aucune clé n'est configurée : l'appelant laisse alors
 * passer plutôt que de bloquer un formulaire par ailleurs fonctionnel.
 */
export function verifyToken(token, now = Date.now()) {
  const key = signingKey();
  if (!key) return 'disabled';
  if (!token || typeof token !== 'string') return 'missing';

  const dot = token.indexOf('.');
  if (dot < 1) return 'invalid';
  const ts = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d{1,15}$/.test(ts)) return 'invalid';

  const expected = createHmac('sha256', key).update(ts).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return 'invalid';

  const age = now - Number(ts);
  if (age < MIN_AGE_MS) return 'too-fast';
  if (age > MAX_AGE_MS) return 'expired';
  return 'ok';
}
