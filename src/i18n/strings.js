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
    // Document / SEO - communs
    'head.ogImageAlt': 'Roxane Foare - Video Editor',
    'head.ogLocale': 'en_US',
    'head.jobTitle': 'Video Editor',

    // Document / SEO - par page (title/description utilisés aussi pour OG + Twitter)
    'head.home.title': 'Roxane Foare - Video Editor · Paris & Angers',
    'head.home.description': 'Roxane Foare - freelance video editor based in Paris & Angers. Film, documentary, commercial, corporate, live and event editing.',
    'head.portfolio.title': 'Portfolio - Roxane Foare, Video Editor',
    'head.portfolio.description': 'Selected work by Roxane Foare: feature films, documentaries, commercials, corporate videos, live broadcast and events.',
    'head.about.title': 'About - Roxane Foare, Video Editor',
    'head.about.description': "Meet Roxane Foare, freelance video editor based in Paris & Angers with over 10 years' experience across film, documentary, commercial and corporate projects.",

    // A11y
    'a11y.skip': 'Skip to content',
    'a11y.backToTop': 'Back to top',

    // Nav
    'nav.sub': 'Video Editor',
    'nav.home': 'Home',
    'nav.work': 'Portfolio',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.langLabel': 'FR',
    'nav.langAria': 'Voir le site en francais',
    'nav.menuAria': 'Menu',

    // Hero (Accueil)
    'hero.tagline': 'Freelance video editor based in Paris & Angers - film, documentary, commercial, corporate, live and event editing.',
    'hero.ctaPortfolio': 'View portfolio',
    'hero.ctaAbout': 'About',
    'hero.showreelLabel': 'Showreel',
    'featured.title': 'Selected work',
    'featured.all': 'See all projects',

    // Work
    'work.title': 'Portfolio',
    // « World » seul sonne étrangement en anglais, « Worldwide » est la
    // formulation attendue. Le français « Monde » fonctionne tel quel.
    'work.location': 'Paris · Angers · Worldwide',
    'work.filterAria': 'Filter projects by category',
    'work.watch': 'Watch',
    'work.watchAria': 'Watch',
    'work.stillImage': 'Illustration photo',

    // Distinctions (JSON-LD `award`) - reprises de la bio, section About
    'award.cyprus': 'Best Editing Award, Cyprus International Film Festival - En mille morceaux',
    'award.athens': 'Best Editing Award, Athens International Film Festival - En mille morceaux',

    // Page 404
    'notfound.title': 'Page not found - Roxane Foare',
    'notfound.description': 'This page does not exist. Browse the portfolio or get in touch.',
    'notfound.heading': 'This page does not exist',
    'notfound.text': 'The link may be outdated, or the address mistyped. Here is where to go next.',

    // Pages projet (/portfolio/[slug])
    'project.back': 'All projects',
    'project.breadcrumb': 'Breadcrumb',
    'project.production': 'Production',
    'project.year': 'Year',
    'project.duration': 'Duration',
    'project.category': 'Category',
    'project.watchFull': 'Watch the full film',
    'project.related': 'More in this category',
    'project.playerTitle': 'Video player',
    'project.titleSuffix': 'Roxane Foare, Video Editor',
    'project.descSuffix': 'edited by Roxane Foare, freelance video editor based in Paris & Angers.',

    // Categories (filtres + libelles de vignettes)
    'cat.all': 'All',
    'cat.pub': 'Commercial',
    'cat.film': 'Feature Film',
    'cat.doc': 'Documentary',
    'cat.corpo': 'Corporate',
    'cat.event': 'Event',
    'cat.teaser': 'Teaser',
    'cat.live': 'Live',

    // About
    'about.title': 'About',
    'about.introParagraphs': [
      'For over ten years, Roxane has been working with directors, agencies, brands, and production companies to create films in a variety of formats and genres. From feature films to documentaries, from commercials to corporate videos, from event coverage to social media content, she approaches every project with the same high standard: to captivate the audience by revealing the story’s intent through precise, sensitive, and masterful editing.',
      'Her career has also taken her into live editing, primarily at sporting events, where she has worked as a synth operator, LSM operator, and director.',
      'Her work on the feature film <em>En mille morceaux</em> was recognized with two Best Editing Awards, presented by the Cyprus International Film Festival and the Athens International Film Festival.',
      'Editing is much more than just a post-production step. Every cut is carefully considered, and every shot choice contributes to the construction of the narrative.',
      'Attentive to the needs of all types of productions, Roxane strives to foster a collaborative, fluid, and creative working relationship.',
    ],
    'about.productions': 'Productions',
    'about.brands': 'Brands',
    'about.awards': 'Awards',
    'faq.title': 'Frequently asked questions',

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
    'footer.creditPrefix': 'Website produced by',
    'footer.legal': 'Legal notice',
    'footer.privacy': 'Privacy',
    'footer.legalAria': 'Legal pages',

    // Lightbox
    'lb.dialog': 'Video player',
    'lb.close': 'Close video',
    'lb.frameTitle': 'Vimeo video player',
  },

  fr: {
    // Document / SEO - communs
    'head.ogImageAlt': 'Roxane Foare - Monteuse vidéo',
    'head.ogLocale': 'fr_FR',
    'head.jobTitle': 'Monteuse vidéo',

    // Document / SEO - par page (title/description utilisés aussi pour OG + Twitter)
    'head.home.title': 'Roxane Foare - Monteuse vidéo · Paris & Angers',
    'head.home.description': 'Roxane Foare - monteuse vidéo freelance à Paris & Angers. Montage film, documentaire, publicité, corporate, live et événementiel.',
    'head.portfolio.title': 'Portfolio - Roxane Foare, Monteuse vidéo',
    'head.portfolio.description': 'Sélection de projets montés par Roxane Foare : longs métrages, documentaires, publicités, corporate, live et événementiel.',
    'head.about.title': 'À propos - Roxane Foare, Monteuse vidéo',
    'head.about.description': "Roxane Foare, monteuse vidéo freelance à Paris & Angers, plus de 10 ans d'expérience en film, documentaire, publicité et corporate.",

    // A11y
    'a11y.skip': 'Aller au contenu',
    'a11y.backToTop': 'Haut de page',

    // Nav
    'nav.sub': 'Monteuse vidéo',
    'nav.home': 'Accueil',
    'nav.work': 'Projets',
    'nav.about': 'À propos',
    'nav.contact': 'Contact',
    'nav.langLabel': 'EN',
    'nav.langAria': 'View the site in English',
    'nav.menuAria': 'Menu',

    // Hero (Accueil)
    'hero.tagline': 'Monteuse vidéo freelance à Paris & Angers - montage film, documentaire, publicité, corporate, live et événementiel.',
    'hero.ctaPortfolio': 'Voir le portfolio',
    'hero.ctaAbout': 'À propos',
    'hero.showreelLabel': 'Showreel',
    'featured.title': 'Sélection',
    'featured.all': 'Voir tous les projets',

    // Work
    'work.title': 'Projets',
    'work.location': 'Paris · Angers · Monde',
    'work.filterAria': 'Filtrer les projets par catégorie',
    'work.watch': 'Voir',
    'work.watchAria': 'Regarder',
    'work.stillImage': "Photo d'illustration",

    // Distinctions (JSON-LD `award`) - reprises de la bio, section About
    'award.cyprus':
      'Prix du meilleur montage, Festival international du film de Chypre - En mille morceaux',
    'award.athens':
      "Prix du meilleur montage, Festival international du film d'Athènes - En mille morceaux",

    // Page 404
    'notfound.title': 'Page introuvable - Roxane Foare',
    'notfound.description': "Cette page n'existe pas. Parcourez le portfolio ou prenez contact.",
    'notfound.heading': "Cette page n'existe pas",
    'notfound.text': "Le lien est peut-être périmé, ou l'adresse mal saisie. Voici où aller.",

    // Pages projet (/portfolio/[slug])
    'project.back': 'Tous les projets',
    'project.breadcrumb': "Fil d'Ariane",
    'project.production': 'Production',
    'project.year': 'Année',
    'project.duration': 'Durée',
    'project.category': 'Catégorie',
    'project.watchFull': 'Voir le film complet',
    'project.related': 'Dans la même catégorie',
    'project.playerTitle': 'Lecteur vidéo',
    'project.titleSuffix': 'Roxane Foare, Monteuse vidéo',
    'project.descSuffix': 'monté par Roxane Foare, monteuse vidéo freelance à Paris & Angers.',

    // Categories
    'cat.all': 'Tous',
    'cat.pub': 'Publicité',
    'cat.film': 'Long métrage',
    'cat.doc': 'Documentaire',
    'cat.corpo': 'Corporate',
    'cat.event': 'Événementiel',
    'cat.teaser': 'Teaser',
    'cat.live': 'Live',

    // About
    'about.title': 'À propos',
    'about.introParagraphs': [
      "Depuis plus de dix ans, Roxane accompagne des réalisateurs, agences, marques et sociétés de production dans la création de films aux formats et univers variés. Du long métrage au documentaire, de la publicité aux films corporate, de l'événementiel aux contenus destinés aux réseaux sociaux, elle aborde chaque projet avec la même exigence : captiver l’attention en révélant l'intention du récit à travers un montage précis, sensible et maîtrisé.",
      "Son parcours l'a également menée vers le montage en live, principalement lors d'événements sportifs, où elle a exercé en tant qu'opératrice synthé, opératrice LSM et réalisatrice.",
      "Son travail sur le long métrage <em>En mille morceaux</em> a été récompensé par deux Prix du meilleur montage, décernés par le Festival international du film de Chypre et le Festival international du film d'Athènes.",
      "Le montage est bien plus qu'une étape de post-production. Chaque coupe est pensée avec précision et chaque choix de plan participe à la construction de la narration.",
      "À l'écoute des besoins de tout type de production, Roxane s'attache à instaurer une collaboration exigeante, fluide et créative.",
    ],
    'about.productions': 'Productions',
    'about.brands': 'Marques',
    'about.awards': 'Distinctions',
    'faq.title': 'Questions fréquentes',

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
    'footer.creditPrefix': 'Site conçu par',
    'footer.legal': 'Mentions légales',
    'footer.privacy': 'Confidentialité',
    'footer.legalAria': 'Pages légales',

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
