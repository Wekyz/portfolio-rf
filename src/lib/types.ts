/* ============================================================
   Forme d'un projet de `src/data/videos.json`.

   Le JSON est édité via le CMS (voir `public/admin/config.yml`, qui reste la
   source de vérité des champs proposés à la monteuse). Sans ce type,
   TypeScript déduit du fichier JSON une union de types littéraux : un champ
   absent de toutes les entrées actuelles - `portrait` par exemple - n'existe
   alors pour lui nulle part, et `astro check` signale une erreur sur du code
   pourtant valide. Déclarer la forme une bonne fois règle le sujet et
   documente au passage ce que le CMS peut produire.

   Fichier de types uniquement : il disparaît à la compilation, aucun coût au
   runtime.
   ============================================================ */

/** Les 7 catégories du filtre - même liste que le `widget: select` du CMS. */
export type Category = 'pub' | 'film' | 'doc' | 'corpo' | 'event' | 'teaser' | 'live';

export interface Project {
  cat: Category;
  title: string;
  /** Production et/ou réalisation, ex. « Production : Atelier B ». */
  credit?: string;
  /** Année d'exploitation, ex. « 2024 » ou « 2018-2022 ». */
  year?: string;
  /** ID Vimeo. Absent pour un item non cliquable (photo de plateau). */
  id?: string;
  /** Hash Vimeo, requis pour les vidéos privées. */
  hash?: string;
  /** Override manuel de miniature (affiche de film, photo live), sinon CDN Vimeo. */
  thumb?: string;
  /** URL externe, ouverte au clic à la place du lecteur Vimeo. */
  externalLink?: string;
  /** Texte de présentation affiché sur la page projet et repris dans le VideoObject. */
  description?: string;
  /** Mis en avant sur la page d'accueil. */
  featured?: boolean;
  /** Force le segment d'URL de la page projet (défaut : dérivé du titre). */
  slug?: string;
  /** Occupe les 12 colonnes de la grille. */
  fullWidth?: boolean;
  /** Désactive le clic même si un ID Vimeo est renseigné. */
  noClick?: boolean;
  /**
   * Vignette au format portrait (4 colonnes, ratio 2/3).
   * Géré par `lib/spans.js`, `WorkItem.astro` et `styles.css`, mais **absent
   * de `public/admin/config.yml`** : aucun projet ne peut le porter tant que
   * le champ n'est pas ajouté au CMS.
   */
  portrait?: boolean;
  /**
   * Vignette « affiche » : 6 colonnes centrées, et surtout un cadre qui épouse
   * le ratio de l'image au lieu de la recadrer. Prévu pour les images composées
   * (triptyque de photogrammes, affiche de film) dont le format ne tombe ni sur
   * le 16/10 de la grille ni sur le 2/3 du portrait. Suppose une image locale
   * (`thumb`) : ses dimensions sont mesurées au build.
   */
  poster?: boolean;
}
