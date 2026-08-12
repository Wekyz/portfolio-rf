import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Vérification d'accessibilité automatisée (axe-core).
 *
 * Les quinze correctifs d'accessibilité de la remise à niveau (contraste des
 * champs, focus dans la modale, bouton de pause du bandeau, `aria-pressed`,
 * hiérarchie des titres) ont été vérifiés une fois, à la main. Rien ne les
 * protégeait d'une régression : ce fichier s'en charge.
 *
 * Deux partis pris :
 *
 * 1. On ne teste que les règles WCAG A/AA. Les règles `best-practice` d'axe
 *    (`region`, `landmark-one-main`...) sont des conseils, pas des critères
 *    de conformité, et feraient échouer la CI sur des choix de structure
 *    délibérés.
 *
 * 2. On teste aussi les **états dynamiques**. Une page au repos passe
 *    facilement ; c'est la modale ouverte, le menu mobile déplié et le
 *    bandeau mis en pause qui posent problème, et c'est exactement là que
 *    nos correctifs sont intervenus. Un scan de pages statiques seul aurait
 *    validé un site dont la lightbox est inutilisable au clavier.
 *
 * axe ne détecte qu'environ un tiers des défauts d'accessibilité réels : ce
 * fichier est un garde-fou contre les régressions, pas un certificat.
 */
const NORMES = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Rend le rapport d'axe lisible dans la sortie de test. */
function rapport(violations) {
  return violations
    .map((v) => {
      const cibles = v.nodes.map((n) => `      ${n.target.join(' ')}`).join('\n');
      return `  [${v.impact}] ${v.id} : ${v.help}\n    ${v.helpUrl}\n${cibles}`;
    })
    .join('\n\n');
}

async function analyse(page, contexte, exclusions = []) {
  let axe = new AxeBuilder({ page }).withTags(NORMES);
  for (const sel of exclusions) axe = axe.exclude(sel);
  const { violations } = await axe.analyze();
  expect(violations.length, `${contexte}\n${rapport(violations)}`).toBe(0);
}

test.beforeEach(async ({ page }) => {
  // Même neutralisation que les parcours : le lecteur Vimeo oppose un
  // challenge Cloudflare aux navigateurs pilotés, et son iframe est hors
  // origine, donc hors de portée d'axe de toute façon.
  await page.route('**://player.vimeo.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' })
  );
});

// Une page par gabarit, dans les deux langues : les libellés traduits (et la
// bascule de langue elle-même) portent des attributs `lang`/`hreflang` qui
// n'existent que là.
const PAGES = [
  ['accueil EN', '/'],
  ['accueil FR', '/fr'],
  ['portfolio EN', '/portfolio'],
  ['portfolio FR', '/fr/portfolio'],
  ['à propos EN', '/about'],
  ['à propos FR', '/fr/about'],
  ['contact EN', '/contact'],
  ['contact FR', '/fr/contact'],
  ['page projet EN', '/portfolio/ol-tv'],
  ['page projet FR', '/fr/portfolio/ol-tv'],
  ['mentions légales FR', '/fr/legal'],
  ['confidentialité EN', '/privacy'],
  // Le « 404 » géant est du texte de pure décoration au sens de WCAG 1.4.3 :
  // il répète le code HTTP que le titre juste en dessous énonce en clair, et
  // il porte déjà `aria-hidden` dans 404.astro. Il faut néanmoins l'exclure
  // ici : la règle `color-contrast` d'axe évalue tout ce qui est visible à
  // l'écran, sans regarder l'arbre d'accessibilité, donc `aria-hidden` ne la
  // désarme pas. Exemption revendiquée, pas défaut ignoré.
  ['404', '/cette-page-nexiste-pas', ['.notfound-code']],
];

for (const [nom, url, exclusions] of PAGES) {
  test(`accessibilité : ${nom}`, async ({ page }) => {
    await page.goto(url);
    await analyse(page, `${nom} (${url})`, exclusions);
  });
}

test('accessibilité : lightbox ouverte', async ({ page }) => {
  await page.goto('/fr/portfolio');
  await page.locator('a.work-thumb-wrap').first().click();
  await expect(page.locator('#lightbox')).toHaveClass(/open/);
  await analyse(page, 'lightbox ouverte');
});

test('accessibilité : menu mobile déplié', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Le menu burger n’existe qu’en mobile.');
  await page.goto('/fr');
  await page.locator('#navBurger').click();
  await expect(page.locator('#navBurger')).toHaveAttribute('aria-expanded', 'true');
  await analyse(page, 'menu mobile déplié');
});

test('accessibilité : bandeau de logos mis en pause', async ({ page }) => {
  await page.goto('/fr/about');
  const bouton = page.locator('#brandsToggle');
  await bouton.click();
  await expect(bouton).toHaveAttribute('aria-pressed', 'true');
  await analyse(page, 'bandeau de logos en pause');
});
