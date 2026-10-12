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
  // Compté dans la page plutôt qu'écrit en dur : la monteuse ajoute des
  // projets depuis le CMS.
  const docs = await page.locator('.work-item[data-cat="doc"]').count();
  expect(docs).toBeGreaterThan(0);

  // Les boutons sont masqués sur mobile au profit du menu déroulant.
  if (testInfo.project.use.isMobile) {
    await page.selectOption('#filterSelect', 'doc');
  } else {
    await page.locator('.filter-btn[data-filter="doc"]').click();
  }

  const visibles = page.locator('.work-item:not(.hidden)');
  await expect(visibles).toHaveCount(docs);
  for (const el of await visibles.all()) {
    await expect(el).toHaveAttribute('data-cat', 'doc');
  }

  // Retour à « tous ».
  if (testInfo.project.use.isMobile) {
    await page.selectOption('#filterSelect', 'all');
  } else {
    await page.locator('.filter-btn[data-filter="all"]').click();
  }
  await expect(page.locator('.work-item:not(.hidden)')).toHaveCount(total);
});

test('la lightbox s’ouvre, informe, enchaîne et se ferme', async ({ page }, testInfo) => {
  test.skip(Boolean(testInfo.project.use.isMobile), 'écran tactile : la vignette mène à la fiche, pas à la lightbox');
  await page.goto('/fr/portfolio');

  const premier = page.locator('a.work-thumb-wrap').first();
  const titreVignette = await premier.locator('.work-title').textContent();
  await premier.click();

  const modale = page.locator('#lightbox');
  await expect(modale).toHaveClass(/open/);
  await expect(page.locator('#lightboxTitle')).toHaveText(titreVignette.trim());
  await expect(page.locator('#lightboxMeta')).not.toBeEmpty();
  await expect(page.locator('#lightboxSheet')).toHaveAttribute('href', /^\/fr\/portfolio\//);

  // Le clic simple n'a pas chargé de page, mais l'adresse est celle de la
  // fiche : elle se partage telle quelle.
  const fiche = await page.locator('#lightboxSheet').getAttribute('href');
  expect(new URL(page.url()).pathname).toBe(fiche);

  await page.locator('#lightboxNext').click();
  await expect(page.locator('#lightboxTitle')).not.toHaveText(titreVignette.trim());
  await expect(modale).toHaveClass(/open/);
  expect(new URL(page.url()).pathname).not.toBe(fiche);

  await page.keyboard.press('Escape');
  await expect(modale).not.toHaveClass(/open/);
  await expect(page).toHaveURL(/\/fr\/portfolio$/);
});

test('le bouton Retour ferme la vidéo au lieu de quitter le portfolio', async ({ page }, testInfo) => {
  test.skip(Boolean(testInfo.project.use.isMobile), 'écran tactile : la vignette mène à la fiche, pas à la lightbox');
  await page.goto('/fr/portfolio');
  await page.locator('a.work-thumb-wrap').first().click();
  await expect(page.locator('#lightbox')).toHaveClass(/open/);

  await page.goBack();
  await expect(page.locator('#lightbox')).not.toHaveClass(/open/);
  await expect(page).toHaveURL(/\/fr\/portfolio$/);
  await expect(page.locator('#workGrid')).toBeVisible();
});

test('ctrl+clic sur une vignette ouvre la page projet au lieu de la modale', async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(Boolean(testInfo.project.use.isMobile), 'pas de clic modifié au doigt');
  await page.goto('/fr/portfolio');
  const modificateur = browserName === 'webkit' ? 'Meta' : 'Control';
  await page.locator('a.work-thumb-wrap').first().click({ modifiers: [modificateur] });
  await expect(page.locator('#lightbox')).not.toHaveClass(/open/);
});

test('le menu mobile s’ouvre et mène à une autre page', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.isMobile, 'le burger n’existe qu’en dessous de 900 px');
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
    if (testInfo.project.use.isMobile) await page.locator('#navBurger').click();
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

  await page.locator('.project-crumbs a', { hasText: 'Portfolio' }).click();
  await expect(page).toHaveURL(/\/fr\/portfolio$/);
});

test('une URL inexistante affiche la page 404 du site', async ({ page }) => {
  // `astro preview` ne sert pas 404.html automatiquement : on la vise
  // directement, l'objet du test étant son contenu, pas le routage de Vercel.
  await page.goto('/404.html');
  await expect(page.locator('h1:visible')).toHaveCount(1);
  await expect(page.locator('.notfound:visible .notfound-links a')).toHaveCount(3);
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
  const mobile = Boolean(testInfo.project.use.isMobile);
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

/* ── Audit UX (UX-01 à UX-07) ───────────────────────────────────────── */

const jetonFactice = (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: '{"token":"1700000000000.sig"}' });

async function remplir(page) {
  await page.fill('#first-name', 'Marie');
  await page.fill('#last-name', 'Dupont');
  await page.fill('#email', 'marie@studio.com');
  await page.fill('#message', 'Bonjour, un projet à discuter.');
}

test('la confirmation d’envoi est rédigée en anglais sur la version anglaise', async ({ page }) => {
  await page.route('**/api/form-token', jetonFactice);
  await page.route('**/api/contact', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  );
  await page.goto('/contact');
  await remplir(page);
  await page.locator('.form-submit').click();
  const fait = page.locator('#formDone');
  await expect(fait).toBeVisible({ timeout: 15_000 });
  await expect(fait).toContainText('Message sent.');
  await expect(fait).not.toContainText('contact.');
});

test('un champ trop long est nommé et reçoit le focus', async ({ page }) => {
  await page.route('**/api/form-token', jetonFactice);
  await page.route('**/api/contact', (route) =>
    route.fulfill({
      status: 413,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'too-long', field: 'last-name', max: 100, error: 'trop long' }),
    })
  );
  await page.goto('/fr/contact');
  await remplir(page);
  await page.locator('.form-submit').click();
  // Le message est posé sous le champ et relié à lui (WCAG 3.3.1).
  const message = page.locator('#last-name + #fieldError');
  await expect(message).toContainText(/Nom : 100 caractères maximum/, { timeout: 15_000 });
  await expect(page.locator('#last-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#last-name')).toHaveAttribute('aria-describedby', /fieldError/);
  await expect(page.locator('#last-name')).toBeFocused();
  // Il disparaît dès que le champ est corrigé.
  await page.fill('#last-name', 'Dupond');
  await expect(message).toBeHidden();
  await expect(page.locator('#last-name')).not.toHaveAttribute('aria-invalid', 'true');
});

test('les champs portent leur longueur maximale', async ({ page }) => {
  await page.goto('/fr/contact');
  await expect(page.locator('#first-name')).toHaveAttribute('maxlength', '100');
  await expect(page.locator('#email')).toHaveAttribute('maxlength', '254');
  await expect(page.locator('#message')).toHaveAttribute('maxlength', '5000');
});

test('un jeton expiré est renouvelé sans perdre le message', async ({ page }) => {
  let jetons = 0;
  let envois = 0;
  await page.route('**/api/form-token', (route) => {
    jetons++;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: `jeton-${jetons}` }),
    });
  });
  await page.route('**/api/contact', (route) => {
    envois++;
    const { formToken } = JSON.parse(route.request().postData() || '{}');
    return formToken === 'jeton-1'
      ? route.fulfill({ status: 400, contentType: 'application/json', body: '{"code":"bad-token"}' })
      : route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto('/fr/contact');
  await remplir(page);
  await page.locator('.form-submit').click();
  await expect(page.locator('#formDone')).toBeVisible({ timeout: 20_000 });
  expect(jetons).toBe(2);
  expect(envois).toBe(2);
});

test('l’adresse e-mail est écrite à côté du lien, avec un bouton pour la copier', async ({ page }) => {
  await page.goto('/fr/contact');
  await expect(page.locator('#contactAddress')).toContainText('@');
  await expect(page.locator('#copyEmail')).toBeVisible();
});

test('une adresse française inexistante affiche la 404 en français', async ({ page }) => {
  // Même limite que plus haut : `astro preview` ne sert pas 404.html. On
  // le sert à la place d'une adresse /fr inexistante, comme le fait Vercel.
  const html = await (await page.request.get('/404.html')).text();
  await page.route('**/fr/page-inexistante', (route) =>
    route.fulfill({ status: 404, contentType: 'text/html; charset=utf-8', body: html })
  );
  const erreursCsp = [];
  page.on('console', (msg) => {
    if (/Content Security Policy/i.test(msg.text())) erreursCsp.push(msg.text());
  });
  await page.goto('/fr/page-inexistante');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('h1:visible')).toHaveText("Cette page n'existe pas");
  await expect(page.locator('#notfoundFr .notfound-links a').first()).toHaveAttribute('href', '/fr/portfolio');
  await expect(page.locator('footer')).toContainText('Mentions légales');
  expect(erreursCsp).toEqual([]);
});

test('la 404 reste en anglais hors de /fr', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1:visible')).toHaveText('This page does not exist');
});

test('le lien Contact du menu signale la page courante', async ({ page }) => {
  await page.goto('/fr/contact');
  await expect(page.locator('#navLinks a[href="/fr/contact"]')).toHaveAttribute('aria-current', 'page');
});

/* ── Accessibilité (A11Y-01 à A11Y-04) ──────────────────────────────── */

test('le focus ne sort pas de la lightbox au clavier', async ({ page }, testInfo) => {
  test.skip(Boolean(testInfo.project.use.isMobile), 'pas de tabulation au doigt');
  await page.route('**://player.vimeo.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' })
  );
  await page.goto('/fr/portfolio');
  await page.locator('a.work-thumb-wrap').first().click();
  await expect(page.locator('#lightbox')).toHaveClass(/open/);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    // Même convention que plus haut : le document vient de l'élément reçu.
    const dedans = await page.locator('#lightbox').evaluate((box) => {
      const doc = box.ownerDocument;
      const el = doc.activeElement;
      return !el || el === doc.body || box.contains(el);
    });
    expect(dedans, `tabulation ${i + 1} : le focus a quitté la lightbox`).toBe(true);
  }
});

test('la lightbox porte le titre du projet comme nom', async ({ page }, testInfo) => {
  test.skip(Boolean(testInfo.project.use.isMobile), 'écran tactile : la vignette mène à la fiche, pas à la lightbox');
  await page.goto('/fr/portfolio');
  const premier = page.locator('a.work-thumb-wrap').first();
  const titre = (await premier.locator('.work-title').textContent()).trim();
  await premier.click();
  await expect(page.locator('#lightbox')).toHaveAccessibleName(titre);
});

test('le nom d’une vignette reprend son texte visible', async ({ page }) => {
  await page.goto('/fr/portfolio');
  const premier = page.locator('a.work-thumb-wrap').first();
  const titre = (await premier.locator('.work-title').textContent()).trim();
  await expect(premier).not.toHaveAttribute('aria-label', /.*/);
  // Le nom commence par le verbe ajouté, puis reprend le titre tel qu'affiché.
  await expect(premier).toHaveAccessibleName(/^Regarder /);
  const nom = await premier.evaluate((el) => el.textContent.replace(/\s+/g, ' ').trim());
  expect(nom.startsWith(`Regarder ${titre}`)).toBe(true);
});

test('le champ message est signalé comme facultatif', async ({ page }) => {
  await page.goto('/fr/contact');
  await expect(page.locator('label[for="message"]')).toContainText('(facultatif)');
});

test('sur écran tactile, une vignette ouvre la fiche du projet', async ({ page }, testInfo) => {
  // MOB-04 : en portrait, la lightbox ne donnait au lecteur qu'un tiers de
  // l'écran. La fiche offre un lecteur pleine largeur et le plein écran natif.
  test.skip(!testInfo.project.use.isMobile, 'comportement propre aux écrans tactiles');
  await page.goto('/fr/portfolio');
  const premier = page.locator('a.work-thumb-wrap[href^="/fr/portfolio/"]').first();
  const fiche = await premier.getAttribute('href');
  await premier.tap();
  await expect(page).toHaveURL(new RegExp(`${fiche}$`));
  await expect(page.locator('.project-player iframe')).toBeVisible();
});
