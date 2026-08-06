/**
 * Manifeste web, généré au build pour rester aligné sur les traductions.
 *
 * Aucune ambition d'application installable : le site n'a rien à faire hors
 * ligne. Le manifeste sert au cas où quelqu'un ajoute le site à son écran
 * d'accueil, et à la façon dont le lien se présente au partage - nom court,
 * icône, couleur de fond pendant le chargement.
 *
 * `display: browser` est délibéré : passer en `standalone` retirerait la barre
 * d'adresse, donc le bouton de partage et le nom de domaine, sur un site dont
 * tout l'intérêt est justement d'être partagé et identifié.
 */
import { ui } from '../i18n/strings.js';

export function GET() {
  const manifest = {
    name: 'Roxane Foare - ' + ui.en['head.jobTitle'],
    short_name: 'Roxane Foare',
    description: ui.en['head.home.description'],
    lang: 'en',
    start_url: '/',
    scope: '/',
    display: 'browser',
    // Mêmes valeurs que --white et <meta name="theme-color"> (styles.css).
    background_color: '#fafaf8',
    theme_color: '#fafaf8',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/favicon.png', sizes: '64x64', type: 'image/png' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
}
