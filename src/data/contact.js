/**
 * Moyens de contact affichés sur la page /contact.
 *
 * Le formulaire et le lien e-mail (via /api/email) sont toujours là ; ce
 * fichier ne sert qu'aux canaux optionnels.
 */

export const CONTACT = {
  /**
   * Lien WhatsApp cliquable. Renseigner pour faire apparaître le bouton ;
   * laisser `null` ne rend rien.
   *
   * ATTENTION au format. Les pseudos WhatsApp (déployés depuis juin 2026)
   * NE SONT PAS liables : WhatsApp ne fournit aucune URL de type
   * `wa.me/@pseudo`, le pseudo se partage à l'oral ou par écrit. Un lien
   * `wa.me/33XXXXXXXXX` classique exposerait donc le numéro dans le HTML,
   * ce que tout le reste du site évite (voir /api/email).
   *
   * Le seul format qui masque le numéro est le « lien court » d'un compte
   * WhatsApp Business (Réglages > Outils professionnels > Lien court), de la
   * forme https://wa.me/message/XXXXXXXXXXXX. C'est celui-là qu'il faut
   * coller ici, et aucun autre.
   */
  whatsapp: null,

  /** Profil IMDb - seule présence externe existante. */
  imdb: 'https://www.imdb.com/fr/name/nm8663077/',
};
