/**
 * FAQ - questions fréquentes, en français et en anglais.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ BASE À VALIDER AVEC LA MONTEUSE.                                     │
 * │                                                                      │
 * │ Les réponses marquées « [vérifié] » ci-dessous se déduisent de ce    │
 * │ que le site affiche déjà (logiciels de la page À propos, villes,     │
 * │ langues, catégories de projets).                                     │
 * │                                                                      │
 * │ Celles marquées « [à confirmer] » sont des hypothèses de rédaction   │
 * │ plausibles mais invérifiables depuis le dépôt : délais, formats de   │
 * │ livraison, organisation du travail, étalonnage, tarification.        │
 * │ Ne pas les laisser en ligne sans accord.                             │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Pourquoi une FAQ : les moteurs génératifs reprennent massivement les paires
 * question/réponse, et c'est le meilleur rapport effort/visibilité disponible
 * ici. À noter que Google a restreint l'affichage des résultats enrichis FAQ
 * en 2023 (sites publics et santé uniquement) : le balisage FAQPage ne sert
 * donc plus l'affichage dans les résultats classiques, mais reste lu par les
 * moteurs de réponse. C'est ce dernier usage qui est visé.
 */

export const faq = {
  fr: [
    {
      // [vérifié] - liste des outils de la page À propos.
      q: 'Sur quels logiciels de montage travaillez-vous ?',
      a: "Adobe Premiere Pro, DaVinci Resolve et Avid Media Composer pour le montage. Pour le live : TriCaster, XPression by Ross, LSM by EVS et Blackmagic ATEM.",
    },
    {
      // [vérifié] - catégories réellement présentes dans videos.json.
      q: 'Quels types de projets montez-vous ?',
      a: "Publicités, longs métrages, documentaires, films corporate, événementiel, teasers et captation live. Le portfolio réunit ces sept catégories, filtrables par type.",
    },
    {
      // [vérifié] - Paris, Angers et « World » affichés sur la page Portfolio.
      q: 'Où intervenez-vous ?',
      a: "Paris et Angers principalement, et partout ailleurs selon les projets. Le montage se prête au travail à distance, ce qui permet de collaborer sans contrainte géographique.",
    },
    {
      // [vérifié] - knowsLanguage du JSON-LD, site bilingue.
      q: 'Dans quelles langues travaillez-vous ?',
      a: 'En français et en anglais.',
    },
    {
      // [à confirmer] - hypothèse de rédaction.
      q: 'Travaillez-vous à distance ou en salle de montage ?',
      a: "Les deux. À distance pour la majorité des projets, avec des points réguliers et des versions partagées en ligne. En présentiel quand le projet le demande, notamment pour les phases de validation ou le travail en équipe.",
    },
    {
      // [à confirmer] - hypothèse de rédaction.
      q: 'Quels formats de livraison proposez-vous ?',
      a: "Les masters aux formats et définitions demandés par la production, ainsi que les déclinaisons nécessaires : formats verticaux et carrés pour les réseaux sociaux, versions sous-titrées, versions courtes.",
    },
    {
      // [à confirmer] - hypothèse de rédaction.
      q: 'Prenez-vous en charge l’étalonnage et le montage son ?',
      a: "L'étalonnage est possible sur DaVinci Resolve. Pour le montage son et le mixage, le travail se fait en lien avec les prestataires habituels de la production.",
    },
    {
      // [à confirmer] - hypothèse de rédaction.
      q: 'Comment se déroule une collaboration ?',
      a: "Un premier échange permet de cerner le projet, son format et ses délais. Suivent le dérushage, un premier montage soumis à validation, puis les allers-retours jusqu'à la version finale. Les délais dépendent du volume de rushes et du format, et sont fixés ensemble dès le départ.",
    },
  ],

  en: [
    {
      q: 'Which editing software do you work with?',
      a: 'Adobe Premiere Pro, DaVinci Resolve and Avid Media Composer for editing. For live work: TriCaster, XPression by Ross, LSM by EVS and Blackmagic ATEM.',
    },
    {
      q: 'What kinds of projects do you edit?',
      a: 'Commercials, feature films, documentaries, corporate films, events, teasers and live broadcast. The portfolio covers these seven categories, filterable by type.',
    },
    {
      q: 'Where do you work?',
      a: 'Mainly Paris and Angers, and anywhere else depending on the project. Editing lends itself well to remote work, which makes collaboration possible regardless of location.',
    },
    {
      q: 'Which languages do you work in?',
      a: 'French and English.',
    },
    {
      q: 'Do you work remotely or in an edit suite?',
      a: 'Both. Remotely for most projects, with regular check-ins and versions shared online. On site when the project calls for it, particularly for approval stages or team work.',
    },
    {
      q: 'What delivery formats do you provide?',
      a: 'Masters in the formats and resolutions requested by the production, along with any versions needed: vertical and square formats for social media, subtitled versions, short cuts.',
    },
    {
      q: 'Do you handle colour grading and sound editing?',
      a: 'Colour grading is possible in DaVinci Resolve. For sound editing and mixing, the work is done alongside the production’s usual providers.',
    },
    {
      q: 'How does a collaboration work?',
      a: 'A first conversation establishes the project, its format and its deadlines. Then comes reviewing the rushes, a first cut submitted for approval, and rounds of feedback through to the final version. Timelines depend on the volume of footage and the format, and are agreed on from the start.',
    },
  ],
};

/**
 * Données structurées FAQPage. Les réponses doivent être présentes dans le
 * HTML de la page pour être valides - c'est le cas, l'accordéon `<details>`
 * n'en masque que l'affichage.
 */
export function buildFaqLd(lang) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq[lang].map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
