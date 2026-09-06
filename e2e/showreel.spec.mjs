import { test, expect } from '@playwright/test';

/**
 * Commandes du showreel (WCAG 2.2.2).
 *
 * Ce fichier existe parce qu'axe ne peut structurellement pas couvrir ce
 * point : le lecteur vit dans un iframe hors origine, et les autres suites le
 * neutralisent - le critère « ce contenu animé peut être arrêté » passait donc
 * en silence, satisfait ou non.
 *
 * On ne teste pas Vimeo. On remplace son lecteur par un faux qui parle le même
 * protocole postMessage, ce qui rend la suite déterministe (pas de réseau, pas
 * de challenge Cloudflare, pas de vidéo à charger) et met sous surveillance la
 * seule chose qui peut régresser : notre code.
 *
 * Le protocole reproduit ici a été relevé sur le vrai lecteur : l'événement de
 * progression s'appelle `playProgress` (et non `timeupdate`), il porte
 * `seconds`, `percent` et `duration`, et `setCurrentTime` fonctionne aussi
 * pendant une pause.
 */
const DUREE = 60;

const FAUX_LECTEUR = `<!doctype html><html><body><script>
  var t = 0, joue = true;
  function envoyer(o) { parent.postMessage(JSON.stringify(o), '*'); }
  function tic() {
    envoyer({ event: 'playProgress', data: { seconds: t, percent: t / ${DUREE}, duration: ${DUREE} } });
  }
  addEventListener('message', function (e) {
    var m; try { m = JSON.parse(e.data); } catch (err) { return; }
    if (m.method === 'pause') { joue = false; envoyer({ event: 'pause' }); }
    else if (m.method === 'play') { joue = true; envoyer({ event: 'play' }); }
    else if (m.method === 'setCurrentTime') { t = Number(m.value); tic(); }
  });
  setInterval(function () { if (joue) t = (t + 0.25) % ${DUREE}; tic(); }, 250);
</script></body></html>`;

/** Route le lecteur Vimeo vers le faux lecteur ci-dessus. */
const brancherFauxLecteur = (page) =>
  page.route('**://player.vimeo.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: FAUX_LECTEUR })
  );

const commandes = (page) => page.locator('#showreelControls');
const bouton = (page) => page.locator('#showreelToggle');
const curseur = (page) => page.locator('#showreelSeek');

test('les commandes restent cachées tant que le lecteur ne répond pas', async ({ page }) => {
  // Lecteur muet (bloqueur de contenu, panne réseau, Vimeo injoignable). Un
  // bouton de pause qui ne met rien en pause vaut moins que pas de bouton :
  // il doit rester invisible.
  await page.route('**://player.vimeo.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' })
  );
  await page.goto('/');
  await page.waitForTimeout(2500);
  await expect(commandes(page)).toBeHidden();
});

test('les commandes apparaissent dès que le lecteur répond', async ({ page }) => {
  await brancherFauxLecteur(page);
  await page.goto('/');
  await expect(commandes(page)).toBeVisible();
  await expect(bouton(page)).toHaveAttribute('aria-pressed', 'false');
  // `max` passe à la durée réelle : c'est ce qui rend une flèche du clavier
  // égale à une seconde.
  await expect(curseur(page)).toHaveAttribute('max', String(DUREE));
});

test('le bouton met la lecture en pause et arrête réellement la progression', async ({ page }) => {
  await brancherFauxLecteur(page);
  await page.goto('/');
  await expect(commandes(page)).toBeVisible();

  const libellePause = await bouton(page).getAttribute('aria-label');
  await bouton(page).click();

  await expect(bouton(page)).toHaveAttribute('aria-pressed', 'true');
  // Le libellé annonce l'action à venir, pas l'état courant.
  const libellePlay = await bouton(page).getAttribute('aria-label');
  expect(libellePlay).not.toBe(libellePause);

  // La vraie vérification : la position cesse d'avancer. Sans elle, un bouton
  // qui change seulement d'icône passerait le test.
  const avant = await curseur(page).inputValue();
  await page.waitForTimeout(1200);
  expect(await curseur(page).inputValue()).toBe(avant);

  // Et la reprise repart.
  await bouton(page).click();
  await expect(bouton(page)).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(1200);
  expect(Number(await curseur(page).inputValue())).toBeGreaterThan(Number(avant));
});

test('le curseur déplace la lecture et annonce la position', async ({ page }) => {
  await brancherFauxLecteur(page);
  await page.goto('/');
  await expect(commandes(page)).toBeVisible();

  await curseur(page).evaluate((el) => {
    el.value = '30';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Un curseur nu annoncerait « 30 ». Le texte de valeur donne le repère.
  await expect(curseur(page)).toHaveAttribute('aria-valuetext', '0:30 / 1:00');

  // Passé la fenêtre de garde qui protège le glissement, c'est le lecteur qui
  // redonne la position : elle doit être repartie de 30, pas du début.
  await page.waitForTimeout(1000);
  expect(Number(await curseur(page).inputValue())).toBeGreaterThanOrEqual(30);
});

test.describe('mouvement réduit', () => {
  test('la lecture démarre en pause quand le système le demande', async ({ page }) => {
    // `emulateMedia` plutôt que `test.use({ reducedMotion })` : l'option de
    // contexte n'était pas reprise dans ce bloc (le réglage n'arrivait pas
    // jusqu'à la page, vérifié), là où cet appel est explicite et posé avant
    // la navigation, donc avant que le script ne lise la préférence.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await brancherFauxLecteur(page);
    await page.goto('/');
    await expect(commandes(page)).toBeVisible();
    await expect(bouton(page)).toHaveAttribute('aria-pressed', 'true');
    // Et le visiteur peut relancer s'il le souhaite.
    await bouton(page).click();
    await expect(bouton(page)).toHaveAttribute('aria-pressed', 'false');
  });
});
