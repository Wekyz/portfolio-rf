/**
 * Contraste des jetons de couleur (WCAG 1.4.3 pour le texte, 1.4.11 pour les
 * composants d'interface).
 *
 * Ces ratios ne sont couverts par rien d'autre. axe-core mesure bien le
 * contraste du TEXTE, mais il ne vérifie pas 1.4.11 - la limite d'un champ de
 * saisie, le contour d'un bouton, la piste d'un curseur - et c'est précisément
 * là que le site était en défaut : `--gray-light` sur le fond du site ne donne
 * que 1,18:1, pour un minimum de 3:1.
 *
 * Le test lit les jetons dans styles.css plutôt que de les recopier : une
 * valeur changée dans la feuille change donc le test, et non l'inverse.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../src/styles/styles.css', import.meta.url), 'utf8');

/** Valeur d'un jeton `--nom: #rrggbb;` déclaré dans :root. */
function token(nom, css = CSS) {
  const m = new RegExp(`--${nom}:\\s*(#[0-9a-fA-F]{6})`).exec(css);
  assert.ok(m, `jeton --${nom} introuvable dans styles.css`);
  return m[1];
}

/** Bloc du thème sombre : ses jetons redéfinissent ceux de :root. */
const DARK = (() => {
  const start = CSS.indexOf('@media (prefers-color-scheme: dark)');
  assert.ok(start !== -1, 'bloc prefers-color-scheme: dark introuvable');
  return CSS.slice(start, CSS.indexOf('\n}', start));
})();

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Luminance relative, formule WCAG 2.x. */
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const BLANC = token('white');

test('le ratio est calculé correctement (repères connus)', () => {
  // Deux valeurs vérifiables à la main : noir sur blanc pur, et une couleur
  // sur elle-même. Sans ça, un bug dans la formule rendrait tout le fichier
  // faussement vert.
  assert.equal(Math.round(ratio('#000000', '#ffffff') * 100) / 100, 21);
  assert.equal(ratio('#123456', '#123456'), 1);
});

test('1.4.11 : le contour des commandes atteint 3:1 sur le fond du site', () => {
  // Champs du formulaire de contact, boutons ronds pause/lecture, piste du
  // curseur du showreel. `--gray-light` (1,18:1) y était utilisé à tort.
  const r = ratio(token('border-ui'), BLANC);
  assert.ok(r >= 3, `--border-ui sur --white : ${r.toFixed(2)}:1, minimum 3:1`);
});

test('1.4.3 : le gris de texte secondaire atteint 4,5:1', () => {
  // Libellés de formulaire, textes d'exemple, méta des vignettes.
  const r = ratio(token('gray-mid'), BLANC);
  assert.ok(r >= 4.5, `--gray-mid sur --white : ${r.toFixed(2)}:1, minimum 4,5:1`);
});

test('1.4.3 : le gris de texte courant atteint 4,5:1', () => {
  const r = ratio(token('gray-dark'), BLANC);
  assert.ok(r >= 4.5, `--gray-dark sur --white : ${r.toFixed(2)}:1, minimum 4,5:1`);
});

test("1.4.3 : la variante texte de l'accent atteint 4,5:1", () => {
  // `--accent` lui-même ne tient que 1,86:1 : il reste décoratif, et tout
  // texte qui le porte doit passer par `--accent-text`.
  const r = ratio(token('accent-text'), BLANC);
  assert.ok(r >= 4.5, `--accent-text sur --white : ${r.toFixed(2)}:1, minimum 4,5:1`);
});

test("1.4.3 : le rouge des messages d'erreur atteint 4,5:1", () => {
  // Un message d'erreur est précisément ce qu'il ne faut pas rendre difficile
  // à lire : c'est le seul texte du formulaire qui explique quoi corriger.
  const r = ratio(token('error-text'), BLANC);
  assert.ok(r >= 4.5, `--error-text sur --white : ${r.toFixed(2)}:1, minimum 4,5:1`);
});

test('--gray-light reste réservé aux filets décoratifs', () => {
  // Il ne tient pas 3:1 et n'a pas à le tenir : bas de navigation, séparateurs
  // de section. Ce test fige l'intention - s'il devient conforme un jour, la
  // distinction avec --border-ui n'a plus lieu d'être et il faut les fusionner.
  const r = ratio(token('gray-light'), BLANC);
  assert.ok(
    r < 3,
    `--gray-light atteint désormais ${r.toFixed(2)}:1 : fusionner avec --border-ui plutôt que garder deux jetons.`
  );
  // Et il ne doit plus habiller aucune commande.
  const commandes = [
    /\.media-toggle\s*\{[^}]*border:[^;]*--gray-light/,
    /\.form-group input,\s*\.form-group textarea\s*\{[^}]*border-bottom:[^;]*--gray-light/,
    /::-(?:webkit-slider-runnable|moz-range)-track\s*\{[^}]*background:\s*var\(--gray-light\)/,
  ];
  for (const re of commandes) {
    assert.ok(!re.test(CSS), `--gray-light est réutilisé sur une commande : ${re}`);
  }
});

/* ── Thème sombre (UI-06) ───────────────────────────────────────────── */

test('thème sombre : chaque texte et chaque commande tient son seuil', () => {
  const fond = token('white', DARK);
  const seuils = {
    black: 4.5, // texte courant
    'gray-dark': 4.5,
    'gray-mid': 4.5,
    'accent-text': 4.5,
    'error-text': 4.5,
    'border-ui': 3, // 1.4.11, contour des commandes
  };
  for (const [nom, min] of Object.entries(seuils)) {
    const r = ratio(token(nom, DARK), fond);
    assert.ok(r >= min, `--${nom} sur le fond sombre : ${r.toFixed(2)}:1, minimum ${min}:1`);
  }
});

test('thème sombre : --gray-light reste un filet, sous 3:1', () => {
  const r = ratio(token('gray-light', DARK), token('white', DARK));
  assert.ok(r < 3, `--gray-light sombre : ${r.toFixed(2)}:1`);
});

test('le texte posé sur les images ne suit pas le thème', () => {
  // Les vignettes et la lightbox gardent un fond sombre dans les deux thèmes :
  // --white y deviendrait un texte sombre sur fond sombre.
  assert.ok(!/--on-media\s*:/.test(DARK), '--on-media ne doit pas être redéfini en sombre');
  assert.ok(!/\.work-title\s*\{[^}]*color:\s*var\(--white\)/.test(CSS), '.work-title doit utiliser --on-media');
});
