/* ============================================================
   Logique de pattern de grille — partagée entre le rendu au build
   (index.astro) et le filtrage côté client (app.js).

   Pattern de référence : 8 / 4 puis 4 / 8 (deux rangées de 12 cols).
   Au changement de catégorie, on FORCE l'item à démarrer en colonne 1
   (sinon CSS Grid auto-place et peut décaler le pattern indéfiniment).
   ============================================================ */

const SPANS = [8, 4, 4, 8];

/**
 * Calcule la valeur `grid-column` de chaque item d'une liste ordonnée.
 * @param {{cat:string, fullWidth?:boolean, portrait?:boolean}[]} items
 * @returns {string[]} une valeur grid-column par item (même ordre)
 */
export function computeSpans(items) {
  let patternIndex = 0;
  let lastCat = null;

  return items.map((item) => {
    if (item.fullWidth) {
      patternIndex = 0;
      lastCat = item.cat;
      return '1 / span 12';
    }
    // Portrait : ne touche ni patternIndex ni lastCat (le pattern continue
    // comme si l'item portrait n'était pas là — comportement d'origine).
    if (item.portrait) {
      return '5 / span 4';
    }
    if (item.cat === 'live') {
      lastCat = 'live';
      return 'span 6';
    }
    // Changement de catégorie : on repart en colonne 1 avec SPANS[0]
    if (item.cat !== lastCat) {
      patternIndex = 1;
      lastCat = item.cat;
      return `1 / span ${SPANS[0]}`;
    }
    const col = `span ${SPANS[patternIndex % SPANS.length]}`;
    patternIndex++;
    lastCat = item.cat;
    return col;
  });
}

/**
 * Applique le pattern à une liste d'éléments DOM `.work-item`.
 * Lit les data-attributes, calcule via computeSpans, écrit les styles.
 * @param {Element[]} elements
 */
export function applySpans(elements) {
  const descriptors = elements.map((el) => ({
    cat: el.dataset.cat,
    fullWidth: el.dataset.fullWidth === 'true',
    portrait: el.dataset.portrait === 'true',
  }));
  const cols = computeSpans(descriptors);
  elements.forEach((el, i) => {
    el.style.gridColumn = cols[i];
  });
}
