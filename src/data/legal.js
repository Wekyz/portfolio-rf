/**
 * Données d'identité des pages légales.
 *
 * Centralisées ici pour n'être saisies qu'une fois : les quatre pages
 * (mentions légales et confidentialité, en deux langues) s'y alimentent.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ À COMPLÉTER avant toute mise en ligne. Les champs laissés à `null`   │
 * │ s'affichent en clair comme « [à compléter] » sur le site, et le      │
 * │ build imprime un avertissement listant ce qui manque.                │
 * └──────────────────────────────────────────────────────────────────────┘
 */

export const LEGAL = {
  /** Prénom et nom de l'éditrice, tels qu'ils figurent au répertoire SIRENE. */
  name: 'Roxane Foare',

  /** Adresse postale de l'entreprise (celle déclarée à l'INSEE). */
  address: null,

  /**
   * Adresse de courrier électronique.
   *
   * ATTENTION : la publier ici la rend lisible par les robots collecteurs,
   * alors que le reste du site l'évite soigneusement (le lien « Send me an
   * email » passe par la fonction /api/email, qui redirige sans jamais
   * exposer l'adresse dans le HTML). La LCEN impose toutefois de la
   * mentionner. Deux options, à trancher :
   *  - la renseigner ici, en acceptant le risque de collecte ;
   *  - laisser `null` : la page renvoie alors vers le formulaire de contact,
   *    ce qui est une pratique répandue mais juridiquement moins sûre.
   */
  email: null,

  /** Numéro SIRET à 14 chiffres. */
  siret: null,

  /** Hébergeur - adresse relevée dans la politique de confidentialité de Vercel. */
  host: {
    name: 'Vercel Inc.',
    address: '440 N Barranca Avenue #4133, Covina, CA 91723, United States',
    url: 'https://vercel.com',
  },

  /**
   * Durée de conservation des messages du formulaire de contact.
   * Trois ans après le dernier échange est la durée que la CNIL retient pour
   * la prospection commerciale. À ajuster si vous préférez plus court.
   */
  retentionYears: 3,
};

/** Champs obligatoires encore vides, pour l'avertissement de build. */
export function missingLegalFields() {
  return Object.entries({ address: LEGAL.address, email: LEGAL.email, siret: LEGAL.siret })
    .filter(([, v]) => !v)
    .map(([k]) => k);
}
