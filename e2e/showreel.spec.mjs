import { test, expect } from '@playwright/test';

/**
 * Showreel de l'accueil.
 *
 * Le lecteur Vimeo tourne sans commande (la barre de position et le bouton
 * pause ont été retirés en octobre 2026). Ce qui reste à surveiller : le
 * lecteur remplace l'image d'ouverture une fois la lecture commencée, l'image
 * reste si le lecteur ne répond pas, et la vidéo ne démarre pas quand le
 * système demande de réduire les animations.
 *
 * On ne teste pas Vimeo. On remplace son lecteur par un faux qui parle le même
 * protocole postMessage (`playProgress` porte `seconds`, `percent` et
 * `duration`), ce qui rend la suite déterministe : pas de réseau, pas de vidéo
 * à charger.
 */
const DUREE = 60;

const FAUX_LECTEUR = `<!doctype html><html><body><script>
  var t = 0; window.joue = true;
  function envoyer(o) { parent.postMessage(JSON.stringify(o), '*'); }
  function tic() {
    envoyer({ event: 'playProgress', data: { seconds: t, percent: t / ${DUREE}, duration: ${DUREE} } });
  }
  addEventListener('message', function (e) {
    var m; try { m = JSON.parse(e.data); } catch (err) { return; }
    if (m.method === 'pause') { window.joue = false; envoyer({ event: 'pause' }); }
    else if (m.method === 'play') { window.joue = true; envoyer({ event: 'play' }); }
  });
  setInterval(function () { if (window.joue) { t = (t + 0.25) % ${DUREE}; tic(); } }, 250);
</script></body></html>`;

/** Route le lecteur Vimeo vers le faux lecteur ci-dessus. */
const brancherFauxLecteur = (page) =>
  page.route('**://player.vimeo.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: FAUX_LECTEUR })
  );

const cadre = (page) => page.locator('#showreel');

test('aucune commande sous le showreel', async ({ page }) => {
  await brancherFauxLecteur(page);
  await page.goto('/');
  await expect(cadre(page)).toHaveClass(/is-playing/);
  await expect(page.locator('#hero button, #hero input')).toHaveCount(0);
});

test("l'image d'ouverture reste en place tant que le lecteur ne répond pas", async ({ page }) => {
  // Lecteur muet (bloqueur de contenu, panne réseau, Vimeo injoignable).
  await page.route('**://player.vimeo.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' })
  );
  await page.goto('/');
  await page.waitForTimeout(2500);
  await expect(cadre(page)).not.toHaveClass(/is-playing/);
  await expect(page.locator('.showreel-poster')).toBeVisible();
});

test.describe('mouvement réduit', () => {
  test('la vidéo ne démarre pas quand le système le demande', async ({ page }) => {
    // `emulateMedia` plutôt que `test.use({ reducedMotion })` : l'option de
    // contexte n'était pas reprise dans ce bloc, là où cet appel est explicite
    // et posé avant la navigation, donc avant que le script ne lise la
    // préférence.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await brancherFauxLecteur(page);
    await page.goto('/');
    await expect
      .poll(async () => {
        const lecteur = page.frames().find((f) => f.url().includes('player.vimeo.com'));
        return lecteur ? lecteur.evaluate(() => globalThis.joue) : undefined;
      })
      .toBe(false);
  });
});
