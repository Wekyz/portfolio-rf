import { createHash } from 'node:crypto';

/**
 * Empreinte du contenu d'une fiche projet, pour le registre des dates de
 * modification (src/data/content-dates.json, voir scripts/fetch-thumbs.mjs).
 *
 * Elle ne compte que ce qui s'affiche. Les valeurs vides ("", null, false,
 * [], {}) sont ignorées, et l'ordre des clés aussi : le CMS réécrit chaque
 * fiche avec tous ses champs, vides compris, dans l'ordre de sa
 * configuration. En octobre 2026, un simple enregistrement avait ainsi fait
 * passer les 36 pages projet pour modifiées le même jour.
 *
 * @param {unknown} project
 * @returns {string} 12 caractères hexadécimaux
 */
export function contentHash(project) {
  return createHash('sha256').update(JSON.stringify(normalize(project) ?? null)).digest('hex').slice(0, 12);
}

/** Retire les valeurs vides, trie les clés ; `undefined` si rien ne reste. */
function normalize(value) {
  if (Array.isArray(value)) {
    const items = value.map(normalize).filter((v) => v !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === 'object') {
    const entries = Object.keys(value)
      .sort()
      .map((k) => [k, normalize(value[k])])
      .filter(([, v]) => v !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  if (value === '' || value === null || value === false || value === undefined) return undefined;
  return value;
}
