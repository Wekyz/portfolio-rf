import { test, expect } from '@playwright/test';

/**
 * Les cinq parcours réels du site.
 *
 * Chacun a déjà cassé au moins une fois pendant la remise à niveau : le clic
 * sur une vignette (passage de <button> à <a>), le formulaire (délai anti-bot
 * qui annulait l'envoi en silence), la bascule de langue (chemin déduit du nom
 * de page). D'où ces tests.
 *
 * Vimeo est systématiquement neutralisé : le vrai lecteur oppose un challenge
 * Cloudflare aux navigateurs pilotés, ce qui rendrait la suite instable. Ce
 * qu'on vérifie est le comportement du site, pas celui de Vimeo.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**://player.vimeo.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' })
  );
});

test('filtrer par catégorie ne laisse que les projets concernés', async ({ page }, testInfo) => {
  await page.goto('/fr/portfolio');

  const total = await page.locator('.work-item').count();
  expect(total).toBeGreaterThan(10);

  // Les boutons sont masqués sur mobile au profit du menu déroulant.
  if (testInfo.project.name === 'mobile') {
    await page.selectOption('#filterSelect', 'doc');
  } else {
    await page.locator('.filter-btn[data-filter="doc"]').click();
  }

  const visibles = page.locator('.work-item:not(.hidden)');
  await expect(visibles).toHaveCount(3);
  for (const el of await visibles.all()) {
    await expect(el).toHaveAttribute('data-cat', 'doc');
  }

  // Retour à « tous ».
  if (testInfo.project.name === 'mobile') {
    await page.selectOption('#filterSelect', 'all');
  } else {
    await page.locator('.filter-btn[data-filter="all"]').click();
  }
  await expect(page.locator('.work-item:not(.hidden)')).toHaveCount(total);
});

test('la lightbox s’ouvre, informe, enchaîne et se ferme', async ({ page }) => {
  await page.goto('/fr/portfolio');

  const premier = page.locator('a.work-thumb-wrap').first();
  const titreVignette = await premier.locator('.work-title').textContent();
  await premier.click();

  const modale = page.locator('#lightbox');
  await expect(modale).toHaveClass(/open/);
  await expect(page.locator('#lightboxTitle')).toHaveText(titreVignette.trim());
  await expect(page.locator('#lightboxMeta')).not.toBeEmpty();
  await expect(page.locator('#lightboxSheet')).toHaveAttribute('href', /^\/fr\/portfolio\//);

  // Le clic simple ne doit pas avoir navigué.
  expect(new URL(page.url()).pathname).toBe('/fr/portfolio');

  await page.locator('#lightboxNext').click();
  await expect(page.locator('#lightboxTitle')).not.toHaveText(titreVignette.trim());
  await expect(modale).toHaveClass(/open/);

  await page.keyboard.press('Escape');
  await expect(modale).not.toHaveClass(/open/);
});

test('ctrl+clic sur une vignette ouvre la page projet au lieu de la modale', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'pas de clic modifié au doigt');
  await page.goto('/fr/portfolio');
  const modificateur = browserName === 'webkit' ? 'Meta' : 'Control';
  await page.locator('a.work-thumb-wrap').first().click({ modifiers: [modificateur] });
  await expect(page.locator('#lightbox')).not.toHaveClass(/open/);
});

test('le menu mobile s’ouvre et mène à une autre page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'le burger n’existe qu’en dessous de 900 px');
  await page.goto('/fr');

  const burger = page.locator('#navBurger');
  await expect(burger).toBeVisible();
  await expect(burger).toHaveAttribute('aria-expanded', 'false');

  await burger.click();
  await expect(burger).toHaveAttribute('aria-expanded', 'true');

  await page.locator('#navLinks a[href="/fr/about"]').click();
  await expect(page).toHaveURL(/\/fr\/about$/);
  await expect(page.locator('h1')).toHaveText('À propos');
});

test('le formulaire de contact annonce son envoi et transmet le jeton', async ({ page }) => {
  let recu = null;
  await page.route('**/api/form-token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: '1700000000000.signature' }),
    })
  );
  await page.route('**/api/contact', (route) => {
    recu = JSON.parse(route.request().postData() || '{}');
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await page.goto('/fr/contact');
  await page.fill('#first-name', 'Marie');
  await page.fill('#last-name', 'Dupont');
  await page.fill('#email', 'marie@studio.com');
  await page.fill('#message', 'Bonjour, un projet à discuter.');

  const bouton = page.locator('.form-submit');
  await bouton.click();

  // Le retour visuel doit être immédiat : c'est précisément ce qui manquait
  // quand le délai anti-bot annulait l'envoi sans rien afficher.
  await expect(bouton).toContainText(/Envoi/i);
  await expect(bouton).toBeDisabled();

  await expect(bouton).toContainText(/Envoyé/i, { timeout: 15_000 });
  expect(recu).toMatchObject({
    'first-name': 'Marie',
    email: 'marie@studio.com',
    formToken: '1700000000000.signature',
  });
});

test('la bascule de langue conserve la page courante', async ({ page }, testInfo) => {
  const ouvrirMenu = async () => {
    if (testInfo.project.name === 'mobile') await page.locator('#navBurger').click();
  };

  await page.goto('/about');
  await ouvrirMenu();
  await page.locator('.nav-lang').click();
  await expect(page).toHaveURL(/\/fr\/about$/);

  await ouvrirMenu();
  await page.locator('.nav-lang').click();
  await expect(page).toHaveURL(/\/about$/);
});

test('une page projet mène au portfolio par son fil d’Ariane', async ({ page }) => {
  await page.goto('/fr/portfolio/hanro');
  await expect(page.locator('h1')).toHaveText('Hanro');
  await expect(page.locator('.project-player iframe')).toBeVisible();

  await page.locator('.project-crumbs a', { hasText: 'Projets' }).click();
  await expect(page).toHaveURL(/\/fr\/portfolio$/);
});

test('une URL inexistante affiche la page 404 du site', async ({ page }) => {
  // `astro preview` ne sert pas 404.html automatiquement : on la vise
  // directement, l'objet du test étant son contenu, pas le routage de Vercel.
  await page.goto('/404.html');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.notfound-links a')).toHaveCount(3);
});
