/* ============================================================
   Logique de pattern de grille - partagée entre le rendu au build
   (index.astro) et le filtrage côté client (app.js).

   Pattern de référence : 8 / 4 puis 4 / 8 (deux rangées de 12 cols).
   Au changement de catégorie, on FORCE l'item à démarrer en colonne 1
   (sinon CSS Grid auto-place et peut décaler le pattern indéfiniment).

   Le placement est exprimé en CLASSES CSS (statiques, définies dans
   styles.css) et non en `style="grid-column: …"` inline : la CSP du site
   n'autorise pas les styles inline (script-src/style-src sans
   'unsafe-inline'), donc un attribut `style` serait simplement ignoré par
   le navigateur. `fullWidth`/`portrait`/`live` sont déjà couverts par des
   sélecteurs CSS sur les data-attributes existants (`GRID_CLASSES.none`) ;
   seul le pattern cyclique 8/4 a besoin d'une classe dynamique.
   ============================================================ */

const SPANS = [8, 4, 4, 8];

// Classes CSS correspondant à chaque grid-column possible (voir styles.css).
export const GRID_CLASSES = {
  full: 'g-1-12', // fullWidth : 1 / span 12
  portrait: null, // déjà géré par [data-portrait="true"] en CSS
  live: null, // déjà géré par la règle .work-item par défaut (span 6)
  start8: 'g-start8', // 1 / span 8 (1er item d'une nouvelle catégorie)
  span8: 'g-8', // span 8
  span4: 'g-4', // span 4
};
// Toutes les classes dynamiques posées par applySpans, à retirer avant
// d'appliquer le nouveau pattern (cf. WorkItem.astro pour le rendu au build).
export const ALL_GRID_CLASSES = [GRID_CLASSES.full, GRID_CLASSES.start8, GRID_CLASSES.span8, GRID_CLASSES.span4];

/**
 * Calcule le placement de chaque item d'une liste ordonnée.
 * @param {{cat:string, fullWidth?:boolean, portrait?:boolean}[]} items
 * @returns {{cls: string|null, span: number}[]} classe CSS (ou null si déjà
 *   couverte par un sélecteur d'attribut statique) + largeur en colonnes
 *   (utilisée pour calculer `sizes` sur les images responsive).
 */
export function computeSpans(items) {
  let patternIndex = 0;
  let lastCat = null;

  return items.map((item) => {
    if (item.fullWidth) {
      patternIndex = 0;
      lastCat = item.cat;
      return { cls: GRID_CLASSES.full, span: 12 };
    }
    // Portrait : ne touche ni patternIndex ni lastCat (le pattern continue
    // comme si l'item portrait n'était pas là - comportement d'origine).
    if (item.portrait) {
      return { cls: GRID_CLASSES.portrait, span: 4 };
    }
    if (item.cat === 'live') {
      lastCat = 'live';
      return { cls: GRID_CLASSES.live, span: 6 };
    }
    // Changement de catégorie : on repart en colonne 1 avec SPANS[0]
    if (item.cat !== lastCat) {
      patternIndex = 1;
      lastCat = item.cat;
      return { cls: GRID_CLASSES.start8, span: SPANS[0] };
    }
    const width = SPANS[patternIndex % SPANS.length];
    patternIndex++;
    lastCat = item.cat;
    return { cls: width === 8 ? GRID_CLASSES.span8 : GRID_CLASSES.span4, span: width };
  });
}

/**
 * Applique le pattern à une liste d'éléments DOM `.work-item`.
 * Lit les data-attributes, calcule via computeSpans, pose la classe CSS.
 * @param {Element[]} elements
 */
export function applySpans(elements) {
  const descriptors = elements.map((el) => ({
    cat: el.dataset.cat,
    fullWidth: el.dataset.fullWidth === 'true',
    portrait: el.dataset.portrait === 'true',
  }));
  const placements = computeSpans(descriptors);
  elements.forEach((el, i) => {
    el.classList.remove(...ALL_GRID_CLASSES.filter(Boolean));
    if (placements[i].cls) el.classList.add(placements[i].cls);
  });
}
