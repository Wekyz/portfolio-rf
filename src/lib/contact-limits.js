/**
 * Longueurs maximales des champs du formulaire de contact, partagées par le
 * serveur (api/contact.js, qui refuse au-delà) et par le formulaire
 * (Contact.astro, qui pose `maxlength`).
 *
 * Seul le serveur les connaissait : le visiteur attendait le délai anti-robot
 * et le captcha avant de lire "L'un des champs est trop long", sans savoir
 * lequel. Les clés sont les attributs `name` des champs.
 */
export const CONTACT_LIMITS = {
  'first-name': 100,
  'last-name': 100,
  email: 254, // RFC 5321
  message: 5000,
};
