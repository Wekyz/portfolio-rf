/**
 * Crédits d'un projet, rendus dans la langue de la page.
 *
 * Le champ unique `credit` mélangeait quatre informations : la production
 * ("Production : Atelier B"), la réalisation ("Director : Thomas Gérard"), le
 * format ("5 episodes of 14 min") et le rôle de Roxane sur les lives ("LSM
 * Operator"). La fiche projet l'affichait sous le libellé "Production" : on y
 * lisait "Production : Episodes of 30 min", avec en plus la typographie
 * française sur la version anglaise.
 *
 * Chaque information a désormais son champ. Les libellés viennent des
 * traductions, les valeurs restent telles que saisies (noms propres, intitulés
 * de poste au générique), sauf le format, saisi dans les deux langues.
 */
import { useTranslations } from '../i18n/strings.js';

/** @typedef {import('./types').Project} Project */

/**
 * @param {Project} p
 * @param {'en' | 'fr'} lang
 * @returns {{ key: 'production' | 'director' | 'format' | 'role', label: string, value: string }[]}
 */
export function creditParts(p, lang) {
  const t = useTranslations(lang);
  const parts = [];
  if (p.production) parts.push({ key: 'production', label: t('project.production'), value: p.production });
  if (p.director) parts.push({ key: 'director', label: t('project.director'), value: p.director });
  const format = p.format?.[lang] || p.format?.en || p.format?.fr;
  if (format) parts.push({ key: 'format', label: t('project.format'), value: format });
  if (p.role) parts.push({ key: 'role', label: t('project.role'), value: p.role });
  return /** @type {any} */ (parts);
}

/**
 * Version courte sur une ligne, pour la grille, la sélection de l'accueil, les
 * projets liés et les descriptions : "Production : WBA", "Director: Thomas
 * Gérard", "5 épisodes de 14 min", "LSM Operator".
 *
 * Production et réalisation gardent leur libellé, sans quoi on ne sait pas si
 * le nom est celui d'une société ou d'une personne. Le format et le rôle se
 * lisent seuls.
 *
 * @param {Project} p
 * @param {'en' | 'fr'} lang
 */
export function creditLine(p, lang) {
  const colon = useTranslations(lang)('ui.colon');
  return creditParts(p, lang)
    .map(({ key, label, value }) =>
      key === 'production' || key === 'director' ? `${label}${colon}${value}` : value
    )
    .join(' · ');
}
