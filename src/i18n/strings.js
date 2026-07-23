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
    'head.home.keywords': 'video editor Paris, freelance editor France, film editing, documentary editing, commercial editing, post-production Paris, monteuse video, montage Paris',
    'head.portfolio.title': 'Portfolio - Roxane Foare, Video Editor',
    'head.portfolio.description': 'Selected work by Roxane Foare: feature films, documentaries, commercials, corporate videos, live broadcast and events.',
    'head.portfolio.keywords': 'video editing portfolio, film editing reel, documentary editing, commercial editing, corporate video editing, montage Paris',
    'head.about.title': 'About - Roxane Foare, Video Editor',
    'head.about.description': "Meet Roxane Foare, freelance video editor based in Paris & Angers with over 10 years' experience across film, documentary, commercial and corporate projects.",
    'head.about.keywords': 'freelance video editor Paris, monteuse video experience, video editor bio, editing software Premiere DaVinci Avid',

    // A11y
    'a11y.skip': 'Skip to content',

    // Nav
    'nav.sub': 'Video Editor',
    'nav.work': 'Portfolio',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.langLabel': 'FR',
    'nav.langAria': 'Voir le site en francais',

    // Hero (Accueil)
    'hero.tagline': 'Freelance video editor based in Paris & Angers - film, documentary, commercial, corporate, live and event editing.',
    'hero.ctaPortfolio': 'View portfolio',
    'hero.ctaAbout': 'About',
    'hero.showreelLabel': 'Showreel',

    // Work
    'work.title': 'Portfolio',
    'work.location': 'Paris · Angers · World',
    'work.filterAria': 'Filter projects by category',
    'work.watch': 'Watch',
    'work.watchAria': 'Watch',

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
      'Her career has also taken her into live editing, primarily at sporting events, where she has worked as a video mixer, LSM operator, and director.',
      'Her work on the feature film <em>En mille morceaux</em> was recognized with two Best Editing Awards, presented by the Cyprus International Film Festival and the Athens International Film Festival.',
      'Editing is much more than just a post-production step. Every cut is carefully considered, and every shot choice contributes to the construction of the narrative.',
      'Attentive to the needs of all types of productions, Roxane strives to foster a collaborative, fluid, and creative working relationship.',
    ],
    'about.productions': 'Productions',
    'about.brands': 'Brands',

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
    'head.home.keywords': 'monteuse vidéo Paris, montage freelance France, montage film, montage documentaire, montage publicité, post-production Paris, monteuse vidéo Angers, montage Paris',
    'head.portfolio.title': 'Portfolio - Roxane Foare, Monteuse vidéo',
    'head.portfolio.description': 'Sélection de projets montés par Roxane Foare : longs métrages, documentaires, publicités, corporate, live et événementiel.',
    'head.portfolio.keywords': 'portfolio montage vidéo, showreel monteuse, montage documentaire, montage publicité, montage corporate, montage Paris',
    'head.about.title': 'À propos - Roxane Foare, Monteuse vidéo',
    'head.about.description': "Roxane Foare, monteuse vidéo freelance à Paris & Angers, plus de 10 ans d'expérience en film, documentaire, publicité et corporate.",
    'head.about.keywords': 'monteuse vidéo Paris expérience, logiciels montage Premiere DaVinci Avid, parcours monteuse',

    // A11y
    'a11y.skip': 'Aller au contenu',

    // Nav
    'nav.sub': 'Monteuse vidéo',
    'nav.work': 'Projets',
    'nav.about': 'À propos',
    'nav.contact': 'Contact',
    'nav.langLabel': 'EN',
    'nav.langAria': 'View the site in English',

    // Hero (Accueil)
    'hero.tagline': 'Monteuse vidéo freelance à Paris & Angers - montage film, documentaire, publicité, corporate, live et événementiel.',
    'hero.ctaPortfolio': 'Voir le portfolio',
    'hero.ctaAbout': 'À propos',
    'hero.showreelLabel': 'Showreel',

    // Work
    'work.title': 'Projets',
    'work.location': 'Paris · Angers · Monde',
    'work.filterAria': 'Filtrer les projets par catégorie',
    'work.watch': 'Voir',
    'work.watchAria': 'Regarder',

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
