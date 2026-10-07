/**
 * Indices de spam dans le contenu d'un message (ANT-03).
 *
 * Aucun rejet : un faux positif ferait perdre un vrai message, la pire issue
 * pour ce formulaire. Le message part quand même, avec « [suspect] » en tête
 * du sujet et les motifs en bas du texte ; Roxane trie dans sa boîte (un
 * filtre Gmail sur le sujet suffit) au lieu de ne jamais voir le message.
 *
 * Les indices retenus sont ceux du spam qui atteint réellement ce genre de
 * formulaire malgré le délai, le jeton et le captcha, c'est-à-dire écrit à la
 * main ou par un outil semi-automatique.
 */

/** Démarchage typique (référencement, crypto, casino). Mots entiers. */
const KEYWORDS =
  /\b(seo|backlinks?|link ?building|guest ?posts?|first page (of|on) google|crypto|bitcoin|forex|casino|viagra|cialis|loans?)\b/i;

/**
 * @param {{ firstName: string, lastName: string, email: string, message: string }} fields
 * @returns {string[]} motifs, vide si rien de suspect
 */
export function suspicionReasons({ firstName, lastName, message }) {
  const reasons = [];
  const text = `${firstName} ${lastName} ${message}`;
  if ((message.match(/https?:\/\/|www\./gi) || []).length > 2) reasons.push('liens');
  if (/[Ѐ-ӿ]/.test(text)) reasons.push('cyrillique');
  if (/[぀-ヿ㐀-鿿가-힯]/.test(text)) reasons.push('cjk');
  if (firstName && firstName.toLowerCase() === lastName.toLowerCase()) reasons.push('prenom-egal-nom');
  if (KEYWORDS.test(message)) reasons.push('mots-cles');
  return reasons;
}
