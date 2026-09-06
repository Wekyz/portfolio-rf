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
  // Turnstile aussi. `app.js` injecte désormais son script à la première
  // interaction avec le formulaire, donc les parcours qui remplissent des
  // champs le déclenchent : sans cette route, la suite partirait chercher un
  // script sur Internet, et le vrai widget écraserait le `window.turnstile`
  // simulé par le test du réarmement.
  await page.route('**://challenges.cloudflare.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
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

  // La confirmation prend la place du formulaire et y reste : le libellé du
  // bouton s'effaçait au bout de quatre secondes, quelqu'un qui détournait le
  // regard ne savait pas si son message était parti.
  await expect(page.locator('#formDone')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.contact-form')).toBeHidden();
  await expect(page.locator('#formDone')).toContainText(/Message envoyé/i);
  expect(recu).toMatchObject({
    'first-name': 'Marie',
    email: 'marie@studio.com',
    formToken: '1700000000000.signature',
  });

  // Et elle reste en place : plus d'effacement au bout de quatre secondes.
  await page.waitForTimeout(5000);
  await expect(page.locator('#formDone')).toBeVisible();
});

test('un second message repart avec un jeton captcha neuf', async ({ page }) => {
  // Le widget Turnstile n'est rendu qu'en présence de PUBLIC_TURNSTILE_SITE_KEY,
  // absente du build de test : on le simule. Ce qui est vérifié ici n'est pas
  // Cloudflare mais notre code - qu'il réarme bien le widget après un envoi,
  // sans quoi le deuxième message part avec un jeton déjà consommé.
  const jetons = [];
  await page.route('**/api/form-token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: '1700000000000.signature' }),
    })
  );
  await page.route('**/api/contact', (route) => {
    jetons.push(JSON.parse(route.request().postData() || '{}')['cf-turnstile-response']);
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await page.goto('/fr/contact');
  // Le corps de `evaluate` s'exécute dans la page : on passe par le formulaire
  // reçu en paramètre plutôt que par `document`/`window`, absents du contexte
  // Node dans lequel ESLint lit ce fichier.
  await page.locator('.contact-form').evaluate((form) => {
    const doc = form.ownerDocument;
    const boite = doc.createElement('div');
    boite.className = 'cf-turnstile';
    const champ = doc.createElement('input');
    champ.type = 'hidden';
    champ.name = 'cf-turnstile-response';
    champ.value = 'jeton-1';
    boite.appendChild(champ);
    form.appendChild(boite);
    let n = 1;
    doc.defaultView.turnstile = { reset: () => { champ.value = `jeton-${++n}`; } };
  });

  const bouton = page.locator('.form-submit');
  const remplir = async () => {
    await page.fill('#first-name', 'Marie');
    await page.fill('#last-name', 'Dupont');
    await page.fill('#email', 'marie@studio.com');
    await page.fill('#message', 'Bonjour, un projet à discuter.');
  };

  await remplir();
  await bouton.click();
  await expect(page.locator('#formDone')).toBeVisible({ timeout: 15_000 });

  // Le retour au formulaire passe par le bouton de la confirmation.
  await page.locator('#formAgain').click();
  await expect(page.locator('.contact-form')).toBeVisible();
  await expect(bouton).toBeEnabled({ timeout: 15_000 });
  await remplir();
  await bouton.click();
  await expect(page.locator('#formDone')).toBeVisible({ timeout: 15_000 });

  expect(jetons).toEqual(['jeton-1', 'jeton-2']);
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

test('un refus du serveur est expliqué, pas résumé à « Erreur »', async ({ page }) => {
  // Le client jetait la réponse et affichait « Erreur - réessayez » pour cinq
  // causes distinctes. Le serveur nomme la cause par un `code` stable ; le
  // client le traduit, ses messages étant en français et le site bilingue.
  await page.route('**/api/form-token', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: '1700000000000.signature' }),
    })
  );
  await page.route('**/api/contact', (route) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'invalid-fields', error: 'peu importe, le client traduit' }),
    })
  );

  await page.goto('/fr/contact');
  await page.fill('#first-name', 'Marie');
  await page.fill('#last-name', 'Dupont');
  await page.fill('#email', 'marie@studio.com');
  await page.locator('.form-submit').click();

  const erreur = page.locator('#formError');
  await expect(erreur).toBeVisible({ timeout: 15_000 });
  await expect(erreur).toContainText(/champs obligatoires/i);
  // Le formulaire reste là, avec la saisie : on ne perd pas ce qui a été écrit.
  await expect(page.locator('.contact-form')).toBeVisible();
  await expect(page.locator('#first-name')).toHaveValue('Marie');
});

test('la version anglaise affiche le refus en anglais', async ({ page }) => {
  await page.route('**/api/form-token', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"token":"1700000000000.sig"}' })
  );
  await page.route('**/api/contact', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'rate-limit', error: 'Trop de tentatives, réessayez plus tard.' }),
    })
  );
  await page.goto('/contact');
  await page.fill('#first-name', 'Marie');
  await page.fill('#last-name', 'Dupont');
  await page.fill('#email', 'marie@studio.com');
  await page.locator('.form-submit').click();
  const erreur = page.locator('#formError');
  await expect(erreur).toBeVisible({ timeout: 15_000 });
  // Surtout pas le texte français renvoyé par le serveur.
  await expect(erreur).toContainText(/Too many attempts/i);
});

test('le filtre de catégorie vit dans l’URL', async ({ page }, testInfo) => {
  // Le filtre n'existait que dans le JS : ni partageable, ni retrouvable par
  // le bouton Retour, et une page projet ne pouvait pas ramener à sa catégorie.
  //
  // Les deux commandes doivent produire le même effet : sous 900 px, les
  // boutons cèdent la place à un menu déroulant (voir la media query).
  const mobile = testInfo.project.name === 'mobile';
  const choisir = (v) =>
    mobile ? page.selectOption('#filterSelect', v) : page.locator(`.filter-btn[data-filter="${v}"]`).click();

  await page.goto('/fr/portfolio');
  await choisir('doc');
  await expect(page).toHaveURL(/\?cat=doc$/);

  // Rechargée telle quelle, la page revient sur le même filtre - y compris le
  // menu déroulant, qui doit rester synchronisé avec les boutons.
  await page.reload();
  await expect(page.locator('.filter-btn[data-filter="doc"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#filterSelect')).toHaveValue('doc');
  const visibles = page.locator('.work-item:not(.hidden)');
  await expect(visibles.first()).toHaveAttribute('data-cat', 'doc');

  // Revenir à « toutes » retire le paramètre plutôt que d'écrire ?cat=all.
  await choisir('all');
  await expect(page).not.toHaveURL(/cat=/);
});

test('un ?cat= inconnu retombe sur « toutes » sans effacer l’URL', async ({ page }) => {
  await page.goto('/fr/portfolio?cat=nimportequoi');
  await expect(page.locator('.filter-btn[data-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
  // L'URL n'est pas réécrite : un paramètre erroné qui disparaît tout seul est
  // plus déroutant qu'un filtre qui ne s'applique pas.
  await expect(page).toHaveURL(/cat=nimportequoi/);
});
