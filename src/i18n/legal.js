/**
 * Contenu des pages légales, en français et en anglais.
 *
 * Séparé de `strings.js` : ce sont de longs blocs de prose, sans rapport avec
 * les libellés d'interface, et ils changent pour d'autres raisons.
 *
 * Chaque page est une liste de sections `{ title, facts?, paragraphs? }`.
 * `facts` produit une liste de définitions (terme / valeur), `paragraphs` de
 * la prose. Le rendu est assuré par LegalPage.astro.
 */
import { LEGAL } from '../data/legal.js';

/** Valeur manquante : rendue visible plutôt que silencieusement omise. */
const todo = (fr) => (fr ? '[à compléter]' : '[to be completed]');
const val = (v, fr) => v || todo(fr);

function editor(fr) {
  const status = fr
    ? 'Entrepreneur individuel (micro-entreprise)'
    : 'Sole trader (French micro-entreprise regime)';
  return [
    { term: fr ? 'Nom' : 'Name', value: LEGAL.name },
    { term: fr ? 'Statut' : 'Legal status', value: status },
    { term: fr ? 'Adresse' : 'Address', value: val(LEGAL.address, fr) },
    { term: fr ? 'Courriel' : 'Email', value: val(LEGAL.email, fr) },
    { term: 'SIRET', value: val(LEGAL.siret, fr) },
    {
      term: fr ? 'TVA' : 'VAT',
      value: fr
        ? 'TVA non applicable, article 293 B du Code général des impôts'
        : 'VAT not applicable, Article 293 B of the French General Tax Code',
    },
    { term: fr ? 'Directrice de la publication' : 'Publication director', value: LEGAL.name },
  ];
}

function host(fr) {
  return [
    { term: fr ? 'Hébergeur' : 'Hosting provider', value: LEGAL.host.name },
    { term: fr ? 'Adresse' : 'Address', value: LEGAL.host.address },
    { term: fr ? 'Site' : 'Website', value: LEGAL.host.url },
  ];
}

export const legalPages = {
  fr: {
    legal: {
      heading: 'Mentions légales',
      intro:
        "Informations prévues par l'article 6-III de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique.",
      sections: [
        { title: 'Éditrice du site', facts: editor(true) },
        { title: 'Hébergement', facts: host(true) },
        {
          title: 'Propriété intellectuelle',
          paragraphs: [
            "Les vidéos présentées sur ce site sont des travaux de montage réalisés pour le compte de tiers. Les droits de chaque œuvre demeurent la propriété de leurs auteurs, producteurs et ayants droit respectifs. Elles sont diffusées ici à titre de portfolio, avec l'autorisation de leurs auteurs.",
            "Toute reproduction, représentation, diffusion ou réutilisation de ces vidéos, en tout ou partie, est interdite sans l'accord préalable des titulaires des droits.",
            "Les marques, logos et dénominations commerciales apparaissant sur ce site appartiennent à leurs propriétaires respectifs et sont cités à seule fin d'illustrer des collaborations passées.",
            "La structure du site, ses textes et son code source sont protégés par le droit d'auteur. Toute reprise sans autorisation est interdite.",
          ],
        },
        {
          title: 'Liens externes',
          paragraphs: [
            "Ce site renvoie vers des contenus hébergés par des tiers, notamment le lecteur vidéo Vimeo. L'éditrice n'exerce aucun contrôle sur ces contenus et décline toute responsabilité quant à leur disponibilité ou à leur exactitude.",
          ],
        },
      ],
    },
    privacy: {
      heading: 'Politique de confidentialité',
      intro:
        'Traitement des données personnelles au sens du Règlement général sur la protection des données (RGPD).',
      sections: [
        {
          title: 'Aucun cookie',
          paragraphs: [
            "Ce site ne dépose aucun cookie et n'utilise aucun traceur publicitaire. Aucune bannière de consentement n'est donc nécessaire.",
            "La mesure d'audience repose sur Vercel Web Analytics, qui fonctionne sans cookie et sans identifiant persistant. Les polices de caractères sont hébergées sur le site lui-même : aucune requête n'est adressée à un service tiers de polices, et votre adresse IP n'est donc transmise à personne de ce fait.",
          ],
        },
        {
          title: 'Responsable du traitement',
          facts: [
            { term: 'Responsable', value: LEGAL.name },
            { term: 'Adresse', value: val(LEGAL.address, true) },
            { term: 'Contact', value: val(LEGAL.email, true) },
          ],
        },
        {
          title: 'Données collectées et finalité',
          paragraphs: [
            'Le formulaire de contact recueille votre prénom, votre nom, votre adresse électronique et le contenu de votre message. Ces informations servent uniquement à vous répondre.',
            "La base légale du traitement est l'exécution de mesures précontractuelles prises à votre demande, au sens de l'article 6.1.b du RGPD.",
            "Aucune donnée n'est collectée en dehors de ce formulaire. Il n'existe ni création de compte, ni profilage, ni décision automatisée, ni revente de données.",
          ],
        },
        {
          title: 'Destinataires',
          paragraphs: [
            "Vos messages sont acheminés par Resend, prestataire d'envoi de courriels, puis reçus dans la boîte de l'éditrice. Le site est hébergé par Vercel. Ces prestataires agissent en qualité de sous-traitants et n'utilisent pas vos données à d'autres fins.",
            "Un mécanisme de limitation de débit peut traiter temporairement votre adresse IP dans le seul but de prévenir les envois automatisés abusifs. Elle n'est ni conservée durablement, ni utilisée à d'autres fins.",
            "Ces prestataires étant établis aux États-Unis, un transfert de données hors de l'Union européenne peut avoir lieu, encadré par les clauses contractuelles types de la Commission européenne.",
          ],
        },
        {
          title: 'Durée de conservation',
          paragraphs: [
            `Les messages reçus sont conservés ${LEGAL.retentionYears} ans à compter du dernier échange, puis supprimés.`,
          ],
        },
        {
          title: 'Vos droits',
          paragraphs: [
            "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation et d'opposition sur les données vous concernant, ainsi que d'un droit à la portabilité. Pour l'exercer, écrivez à l'adresse indiquée ci-dessus.",
            "Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (www.cnil.fr).",
          ],
        },
      ],
    },
  },

  en: {
    legal: {
      heading: 'Legal notice',
      intro:
        'Information required by Article 6-III of French Act No. 2004-575 of 21 June 2004 on confidence in the digital economy.',
      sections: [
        { title: 'Site publisher', facts: editor(false) },
        { title: 'Hosting', facts: host(false) },
        {
          title: 'Intellectual property',
          paragraphs: [
            'The videos shown on this site are editing work carried out for third parties. The rights to each work remain the property of their respective authors, producers and rights holders. They appear here as a portfolio, with their authors’ permission.',
            'Any reproduction, display, distribution or reuse of these videos, in whole or in part, is prohibited without the prior consent of the rights holders.',
            'Brand names, logos and trade names appearing on this site belong to their respective owners and are mentioned solely to illustrate past collaborations.',
            'The structure of the site, its texts and its source code are protected by copyright. Any reuse without permission is prohibited.',
          ],
        },
        {
          title: 'External links',
          paragraphs: [
            'This site links to content hosted by third parties, in particular the Vimeo video player. The publisher has no control over such content and accepts no responsibility for its availability or accuracy.',
          ],
        },
      ],
    },
    privacy: {
      heading: 'Privacy policy',
      intro:
        'Processing of personal data under the General Data Protection Regulation (GDPR).',
      sections: [
        {
          title: 'No cookies',
          paragraphs: [
            'This site sets no cookies and uses no advertising trackers. No consent banner is therefore required.',
            'Audience measurement relies on Vercel Web Analytics, which works without cookies and without persistent identifiers. Fonts are hosted on the site itself: no request is made to a third-party font service, so your IP address is not shared with anyone on that account.',
          ],
        },
        {
          title: 'Data controller',
          facts: [
            { term: 'Controller', value: LEGAL.name },
            { term: 'Address', value: val(LEGAL.address, false) },
            { term: 'Contact', value: val(LEGAL.email, false) },
          ],
        },
        {
          title: 'Data collected and purpose',
          paragraphs: [
            'The contact form collects your first name, last name, email address and the content of your message. This information is used solely to reply to you.',
            'The legal basis is the performance of pre-contractual measures taken at your request, under Article 6.1.b of the GDPR.',
            'No data is collected outside this form. There is no account creation, no profiling, no automated decision-making and no sale of data.',
          ],
        },
        {
          title: 'Recipients',
          paragraphs: [
            'Your messages are delivered by Resend, an email delivery provider, and received in the publisher’s mailbox. The site is hosted by Vercel. These providers act as processors and do not use your data for any other purpose.',
            'A rate-limiting mechanism may temporarily process your IP address for the sole purpose of preventing automated abuse. It is neither stored long term nor used for any other purpose.',
            'As these providers are established in the United States, data may be transferred outside the European Union, governed by the European Commission’s standard contractual clauses.',
          ],
        },
        {
          title: 'Retention period',
          paragraphs: [
            `Messages received are kept for ${LEGAL.retentionYears} years from the last exchange, then deleted.`,
          ],
        },
        {
          title: 'Your rights',
          paragraphs: [
            'You have the right to access, rectify, erase, restrict and object to the processing of your data, as well as the right to data portability. To exercise these rights, write to the address given above.',
            'If, after contacting us, you believe your rights are not being respected, you may lodge a complaint with the CNIL, the French data protection authority (www.cnil.fr).',
          ],
        },
      ],
    },
  },
};
