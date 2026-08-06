/**
 * Métadonnées d'une page projet (/portfolio/[slug]).
 *
 * Factorisé ici plutôt que dupliqué dans les deux routes EN/FR : les deux
 * pages ne diffèrent que par la langue, et tout le reste (titre, description,
 * JSON-LD) se dérive du même projet.
 *
 * Le VideoObject vit désormais ici, et non plus sur la page Portfolio. Google
 * n'indexe une vidéo que si la page qui la déclare contient un lecteur
 * réellement visible : dans la zone rendue au chargement, plus de 140 px de
 * haut, plus de 140 px de large et au moins un tiers de la largeur de page.
 * C'est ce que fait ProjectDetail.astro, et c'est ce que l'ancienne grille
 * (31 iframes clippés à 0x0) ne pouvait pas faire - Search Console
 * n'indexait effectivement aucune des 31 vidéos.
 */
import { resolveThumb, getUploadDate, getDuration } from './thumb.js';
import { useTranslations } from '../i18n/strings.js';

const SITE = 'https://roxane-foare.com';

/** URL absolue de la miniature (le CDN Vimeo en sert déjà une). */
function absThumb(p) {
  const { src } = resolveThumb(p);
  if (!src) return undefined;
  return src.startsWith('/') ? `${SITE}${src}` : src;
}

export function embedUrl(p) {
  return `https://player.vimeo.com/video/${p.id}${p.hash ? `?h=${p.hash}` : ''}`;
}

export function buildProjectMeta(project, slug, lang) {
  const t = useTranslations(lang);
  const p = project;
  const catLabel = t(`cat.${p.cat}`);
  const path = `/portfolio/${slug}`;
  const canonical = `${SITE}${lang === 'fr' ? '/fr' : ''}${path}`;

  // « Hanro, Publicité (2024). Publicité monté par Roxane Foare... »
  const bits = [p.title];
  if (p.credit) bits.push(p.credit);
  const head = bits.join(' - ') + (p.year ? ` (${p.year})` : '');
  const description = `${head}. ${catLabel} ${t('project.descSuffix')}`;

  const videoObject = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: p.title,
    description,
    thumbnailUrl: absThumb(p),
    // Date d'upload réelle résolue au build depuis Vimeo (fetch-thumbs.mjs) ;
    // repli sur le 1er janvier de `year` en UTC complet si indisponible.
    uploadDate:
      getUploadDate(p) ?? (/^\d{4}$/.test(p.year || '') ? `${p.year}-01-01T00:00:00Z` : undefined),
    duration: getDuration(p) ?? undefined,
    embedUrl: embedUrl(p),
    url: canonical,
    inLanguage: lang,
    editor: { '@type': 'Person', name: 'Roxane Foare', url: `${SITE}${lang === 'fr' ? '/fr' : '/'}` },
    genre: catLabel,
  };

  return {
    path,
    title: `${p.title} - ${t('project.titleSuffix')}`,
    description,
    keywords: [p.title, p.credit, catLabel, t('project.titleSuffix')].filter(Boolean).join(', '),
    ogImage: absThumb(p),
    videoObject,
  };
}

/**
 * Jusqu'à `limit` autres projets de la même catégorie, pour le maillage
 * interne en bas de page (et pour qu'aucune page projet ne soit orpheline).
 */
export function relatedProjects(project, routes, limit = 3) {
  return routes
    .filter((r) => r.project !== project && r.project.cat === project.cat)
    .slice(0, limit);
}
