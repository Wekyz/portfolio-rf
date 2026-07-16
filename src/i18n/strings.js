/* ============================================================
   Traductions EN / FR du site (version bilingue).
   - `defaultLang` = 'en' : la page d'accueil "/" reste en anglais
     (clients internationaux), la version francaise est servie sur "/fr".
   - `useTranslations(lang)` renvoie une fonction t(cle) avec repli sur l'anglais.
   Les noms propres (marques, productions, outils) ne sont jamais traduits.
   ============================================================ */

export const defaultLang = 'en';

export const ui = {
  en: {
    // Document / SEO
    'head.title': 'Roxane Foare - Video Editor · Paris & Angers',
    'head.description': 'Roxane Foare - freelance video editor based in Paris & Angers. Film, documentary, commercial, corporate, live and event editing.',
    'head.keywords': 'video editor Paris, freelance editor France, film editing, documentary editing, commercial editing, post-production Paris, monteuse video, montage Paris',
    'head.ogTitle': 'Roxane Foare - Video Editor',
    'head.ogDescription': 'Freelance video editor specialised in film, documentary, corporate, commercial, live & events.',
    'head.ogImageAlt': 'Roxane Foare - Video Editor',
    'head.twitterDescription': 'Freelance video editor - film, documentary, corporate, commercial, live & events.',
    'head.ogLocale': 'en_US',
    'head.jobTitle': 'Video Editor',

    // A11y
    'a11y.skip': 'Skip to content',

    // Nav
    'nav.sub': 'Video Editor',
    'nav.work': 'Work',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.langLabel': 'FR',
    'nav.langAria': 'Voir le site en francais',

    // Work
    'work.title': 'Work',
    'work.location': 'Paris · Angers · World',
    'work.filterAria': 'Filter projects by category',
    'work.watch': 'Watch',
    'work.watchAria': 'Watch',

    // Categories (filtres + libelles de vignettes)
    'cat.pub': 'Commercial',
    'cat.film': 'Feature Film',
    'cat.doc': 'Documentary',
    'cat.corpo': 'Corporate',
    'cat.event': 'Event',
    'cat.teaser': 'Teaser',
    'cat.live': 'Live',

    // About
    'about.title': 'About',
    'about.subtitle': 'Roxane Foare - Video Editor for more than 10 years',
    'about.intro': 'Every cut is clean and precise; my experience, expertise and artistic vision will help you throughout your projects.',
    'about.productions': 'Productions',
    'about.brands': 'Brands',
    'brand.associations': 'Associations',
    'brand.automobile': 'Automobile',
    'brand.banks': 'Banks',
    'brand.beauty': 'Beauty',
    'brand.decoration': 'Decoration',
    'brand.event': 'Event',
    'brand.fashion': 'Fashion',
    'brand.foodDrinks': 'Food & Drinks',
    'brand.health': 'Health',
    'brand.jewelry': 'Jewelry',
    'brand.sports': 'Sports',
    'brand.youtubers': 'Youtubers',
    'brand.others': 'Others',

    // Contact
    'contact.title': 'Contact',
    'contact.tagline1': "Let's work",
    'contact.tagline2': 'together',
    'contact.desc': 'Open to new projects. I would be delighted to discuss your ideas and bring them to life.',
    'contact.emailLink': 'Send me an email',
    'contact.firstName': 'First name',
    'contact.lastName': 'Last name',
    'contact.email': 'Email',
    'contact.message': 'Message',
    'contact.firstNamePh': 'Marie',
    'contact.lastNamePh': 'Dupont',
    'contact.emailPh': 'marie@studio.com',
    'contact.messagePh': 'Tell me about your project…',
    'contact.send': 'Send',
    'contact.honeypot': "Don't fill this out:",

    // Footer
    'footer.rights': 'All rights reserved',

    // Lightbox
    'lb.dialog': 'Video player',
    'lb.close': 'Close video',
    'lb.frameTitle': 'Vimeo video player',
  },

  fr: {
    // Document / SEO
    'head.title': 'Roxane Foare - Monteuse vidéo · Paris & Angers',
    'head.description': 'Roxane Foare - monteuse vidéo freelance à Paris & Angers. Montage film, documentaire, publicité, corporate, live et événementiel.',
    'head.keywords': 'monteuse vidéo Paris, montage freelance France, montage film, montage documentaire, montage publicité, post-production Paris, monteuse vidéo Angers, montage Paris',
    'head.ogTitle': 'Roxane Foare - Monteuse vidéo',
    'head.ogDescription': 'Monteuse vidéo freelance spécialisée en film, documentaire, corporate, publicité, live & événementiel.',
    'head.ogImageAlt': 'Roxane Foare - Monteuse vidéo',
    'head.twitterDescription': 'Monteuse vidéo freelance - film, documentaire, corporate, publicité, live & événementiel.',
    'head.ogLocale': 'fr_FR',
    'head.jobTitle': 'Monteuse vidéo',

    // A11y
    'a11y.skip': 'Aller au contenu',

    // Nav
    'nav.sub': 'Monteuse vidéo',
    'nav.work': 'Projets',
    'nav.about': 'À propos',
    'nav.contact': 'Contact',
    'nav.langLabel': 'EN',
    'nav.langAria': 'View the site in English',

    // Work
    'work.title': 'Projets',
    'work.location': 'Paris · Angers · Monde',
    'work.filterAria': 'Filtrer les projets par catégorie',
    'work.watch': 'Voir',
    'work.watchAria': 'Regarder',

    // Categories
    'cat.pub': 'Publicité',
    'cat.film': 'Long métrage',
    'cat.doc': 'Documentaire',
    'cat.corpo': 'Corporate',
    'cat.event': 'Événementiel',
    'cat.teaser': 'Teaser',
    'cat.live': 'Live',

    // About
    'about.title': 'À propos',
    'about.subtitle': 'Roxane Foare - Monteuse vidéo depuis plus de 10 ans',
    'about.intro': 'Chaque montage est net et précis ; mon expérience, mon expertise et ma vision artistique vous accompagnent tout au long de vos projets.',
    'about.productions': 'Productions',
    'about.brands': 'Marques',
    'brand.associations': 'Associations',
    'brand.automobile': 'Automobile',
    'brand.banks': 'Banques',
    'brand.beauty': 'Beauté',
    'brand.decoration': 'Décoration',
    'brand.event': 'Événementiel',
    'brand.fashion': 'Mode',
    'brand.foodDrinks': 'Alimentation & Boissons',
    'brand.health': 'Santé',
    'brand.jewelry': 'Joaillerie',
    'brand.sports': 'Sport',
    'brand.youtubers': 'Youtubeurs',
    'brand.others': 'Autres',

    // Contact
    'contact.title': 'Contact',
    'contact.tagline1': 'Travaillons',
    'contact.tagline2': 'ensemble',
    'contact.desc': "Ouverte aux nouveaux projets. Je serais ravie d'échanger sur vos idées et de leur donner vie.",
    'contact.emailLink': 'Écrivez-moi un email',
    'contact.firstName': 'Prénom',
    'contact.lastName': 'Nom',
    'contact.email': 'Email',
    'contact.message': 'Message',
    'contact.firstNamePh': 'Marie',
    'contact.lastNamePh': 'Dupont',
    'contact.emailPh': 'marie@studio.com',
    'contact.messagePh': 'Parlez-moi de votre projet…',
    'contact.send': 'Envoyer',
    'contact.honeypot': 'Ne remplissez pas ce champ :',

    // Footer
    'footer.rights': 'Tous droits réservés',

    // Lightbox
    'lb.dialog': 'Lecteur vidéo',
    'lb.close': 'Fermer la vidéo',
    'lb.frameTitle': 'Lecteur vidéo Vimeo',
  },
};

/**
 * Renvoie une fonction de traduction pour la langue donnee (repli sur l'anglais).
 * @param {'en'|'fr'} lang
 */
export function useTranslations(lang) {
  const dict = ui[lang] || ui[defaultLang];
  return function t(key) {
    return dict[key] ?? ui[defaultLang][key] ?? key;
  };
}
