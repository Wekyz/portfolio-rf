/**
 * Initialisation Sentry partagée par les fonctions serverless (contact.js,
 * email.js). Le DSN n'est pas un secret au sens strict (il ne permet que
 * d'envoyer des événements, pas d'en lire) mais reste en variable
 * d'environnement pour rester configurable par environnement sans toucher
 * au code - voir Vercel → Settings → Environment Variables : SENTRY_DSN.
 *
 * Pas de tracing de performance (tracesSampleRate: 0) : uniquement le
 * suivi d'erreurs, seul besoin ici (détecter un envoi Resend qui échoue).
 * Si SENTRY_DSN est absent (ex. en local sans .env), le SDK reste inactif
 * et captureException()/flush() ne font rien - aucun impact sur le reste.
 */
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  tracesSampleRate: 0,
});

export default Sentry;
