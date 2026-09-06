/**
 * Tests des métadonnées de page projet (src/lib/project-page.js).
 *
 * `formatDuration` et `buildBreadcrumb` produisent du contenu visible et des
 * données structurées lues par Google : une régression y est silencieuse.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDuration,
  buildBreadcrumb,
  embedUrl,
  relatedProjects,
  buildProjectMeta,
} from '../src/lib/project-page.js';
import { catGender } from '../src/i18n/strings.js';
import { PERSON_ID } from '../src/lib/schema-ids.js';
import { projectRoutes } from '../src/lib/slug.js';
import videos from '../src/data/videos.json' with { type: 'json' };

test('formatDuration rend le format des lecteurs vidéo', () => {
  assert.equal(formatDuration('PT1M23S'), '1:23');
  assert.equal(formatDuration('PT45S'), '0:45');
  assert.equal(formatDuration('PT1H2M5S'), '1:02:05');
  assert.equal(formatDuration('PT2H'), '2:00:00');
});

test('formatDuration complète à deux chiffres sous une unité supérieure', () => {
  // « 1:5 » se lirait comme 1 min 5, d'où le zéro.
  assert.equal(formatDuration('PT1M5S'), '1:05');
  assert.equal(formatDuration('PT1H5M'), '1:05:00');
});

test('formatDuration refuse une entrée absente, vide ou malformée', () => {
  assert.equal(formatDuration(null), null);
  assert.equal(formatDuration(undefined), null);
  assert.equal(formatDuration('PT0S'), null);
  assert.equal(formatDuration('1m23s'), null);
  assert.equal(formatDuration('P1DT2H'), null);
});

test('le fil d’Ariane a trois maillons, le dernier sans URL', () => {
  const b = buildBreadcrumb({ title: 'Hanro' }, 'en');
  assert.equal(b['@type'], 'BreadcrumbList');
  assert.equal(b.itemListElement.length, 3);
  assert.deepEqual(b.itemListElement.map((i) => i.position), [1, 2, 3]);
  assert.equal(b.itemListElement[0].item, 'https://roxane-foare.com/');
  assert.equal(b.itemListElement[1].item, 'https://roxane-foare.com/portfolio');
  assert.equal(b.itemListElement[2].name, 'Hanro');
  // Google demande de ne pas auto-référencer la page courante.
  assert.equal(b.itemListElement[2].item, undefined);
});

test('le fil d’Ariane est traduit et pointe vers les URL françaises', () => {
  const b = buildBreadcrumb({ title: 'Hanro' }, 'fr');
  assert.equal(b.itemListElement[0].name, 'Accueil');
  assert.equal(b.itemListElement[0].item, 'https://roxane-foare.com/fr');
  assert.equal(b.itemListElement[1].item, 'https://roxane-foare.com/fr/portfolio');
});

test("embedUrl n'ajoute le hash que pour une vidéo privée", () => {
  assert.equal(embedUrl({ id: '123' }), 'https://player.vimeo.com/video/123');
  assert.equal(embedUrl({ id: '123', hash: 'abc' }), 'https://player.vimeo.com/video/123?h=abc');
});

test('relatedProjects reste dans la catégorie et exclut le projet courant', () => {
  const a = { cat: 'pub', title: 'A' };
  const routes = [
    { project: a, slug: 'a' },
    { project: { cat: 'pub', title: 'B' }, slug: 'b' },
    { project: { cat: 'doc', title: 'C' }, slug: 'c' },
    { project: { cat: 'pub', title: 'D' }, slug: 'd' },
    { project: { cat: 'pub', title: 'E' }, slug: 'e' },
  ];
  const r = relatedProjects(a, routes);
  assert.equal(r.length, 3, 'limite par défaut');
  assert.ok(!r.some((x) => x.project === a), 'le projet courant est exclu');
  assert.ok(r.every((x) => x.project.cat === 'pub'), 'même catégorie uniquement');
});

/* ── Accord de genre de la description (SEO-02) ──────────────────────────
   « Publicité » est féminin : les 8 pages projet de cette catégorie
   affichaient « Publicité monté par Roxane Foare » dans leur meta description
   et dans le sitemap vidéo, c'est-à-dire dans le texte que Google montre sous
   le lien. Le suffixe est désormais accordé sur `catGender` (i18n/strings.js).

   Les sept catégories sont couvertes, pas seulement `pub` : une catégorie
   féminine ajoutée plus tard doit faire échouer ce test tant que son genre
   n'est pas déclaré. */
const CATEGORIES = ['pub', 'film', 'doc', 'corpo', 'event', 'teaser', 'live'];

test('la description française accorde le participe avec la catégorie', () => {
  for (const cat of CATEGORIES) {
    const { description } = buildProjectMeta({ cat, title: 'T' }, 't', 'fr');
    const attendu = catGender[cat] === 'f' ? 'montée par' : 'monté par';
    const interdit = catGender[cat] === 'f' ? 'monté par' : 'montée par';
    assert.ok(
      description.includes(attendu),
      `${cat} (${catGender[cat]}) devrait dire « ${attendu} » : ${description}`
    );
    assert.ok(!description.includes(interdit), `${cat} : « ${interdit} » ne doit pas apparaître`);
  }
});

test('« Publicité » est bien la catégorie féminine', () => {
  // Verrouille le cas qui était en défaut, en toutes lettres.
  const { description } = buildProjectMeta({ cat: 'pub', title: 'Hanro' }, 'hanro', 'fr');
  assert.match(description, /Publicité montée par Roxane Foare/);
});

test('chaque catégorie a un genre déclaré', () => {
  for (const cat of CATEGORIES) {
    assert.ok(['m', 'f'].includes(catGender[cat]), `catGender.${cat} manquant ou invalide`);
  }
  assert.equal(Object.keys(catGender).length, CATEGORIES.length, 'catégorie en trop ou en moins');
});

test("l'anglais ne s'accorde pas, quelle que soit la catégorie", () => {
  for (const cat of CATEGORIES) {
    const { description } = buildProjectMeta({ cat, title: 'T' }, 't', 'en');
    assert.match(description, /edited by Roxane Foare/);
  }
});

/* ── Distinctions (CONT-03) ──────────────────────────────────────────── */

test('les distinctions alimentent le VideoObject et non le crédit', () => {
  const p = {
    cat: 'film',
    title: 'En mille morceaux',
    credit: 'Director : Véronique Mériadec',
    year: '2024',
    awards: ['Best Editing Award - Cyprus International Film Festival'],
  };
  const { videoObject, description } = buildProjectMeta(p, 'en-mille-morceaux', 'fr');
  assert.deepEqual(videoObject.award, p.awards);
  // Elles ne doivent plus gonfler la description : c'est ce qui la portait à
  // 245 caractères quand elles vivaient dans le champ crédit.
  assert.ok(!description.includes('Best Editing Award'));
});

test('un projet sans distinction ne déclare pas de champ award vide', () => {
  const { videoObject } = buildProjectMeta({ cat: 'pub', title: 'T' }, 't', 'en');
  assert.equal(videoObject.award, undefined);
  const b = buildProjectMeta({ cat: 'pub', title: 'T', awards: [] }, 't', 'en');
  assert.equal(b.videoObject.award, undefined, 'un tableau vide ne doit rien déclarer');
});

/* ── Longueur des descriptions (SEO-03) ─────────────────────────────── */

test('aucune description de projet ne dépasse 160 caractères', () => {
  // Au-delà, Google tronque. Le seuil se mesure sur le TEXTE : dans le HTML,
  // chaque « & » compte 5 caractères (`&amp;`), ce qui fait paraître les
  // descriptions plus longues qu'elles ne sont à la lecture.
  const projets = /** @type {any[]} */ (videos.videos || videos);
  const trop = [];
  for (const p of projets) {
    if (!p.id) continue;
    for (const lang of ['en', 'fr']) {
      const { description } = buildProjectMeta(p, 'x', lang);
      if (description.length > 160) trop.push(`${p.title} (${lang}) : ${description.length}`);
    }
  }
  assert.deepEqual(
    trop,
    [],
    'descriptions trop longues - alléger le champ Crédit, pas le gabarit :\n' + trop.join('\n')
  );
});

/* ── Graphe JSON-LD : les blocs se référencent (GEO-04) ──────────────── */

test('le VideoObject porte un @id local et référence la Person globale', () => {
  const { videoObject } = buildProjectMeta({ cat: 'pub', title: 'Hanro' }, 'hanro', 'fr');
  assert.equal(videoObject['@id'], 'https://roxane-foare.com/fr/portfolio/hanro#video');
  assert.equal(videoObject.editor['@id'], PERSON_ID);
  // La référence reste lisible seule : un consommateur qui ne lirait que ce
  // bloc doit encore savoir de qui il s'agit.
  assert.equal(videoObject.editor['@type'], 'Person');
  assert.equal(videoObject.editor.name, 'Roxane Foare');
});

test("l'@id de la Person ne dépend pas de la page qui l'émet", () => {
  const en = buildProjectMeta({ cat: 'pub', title: 'Hanro' }, 'hanro', 'en');
  const fr = buildProjectMeta({ cat: 'pub', title: 'Hanro' }, 'hanro', 'fr');
  assert.equal(en.videoObject.editor['@id'], fr.videoObject.editor['@id']);
  // Les @id locaux, eux, doivent différer : ce sont deux pages distinctes.
  assert.notEqual(en.videoObject['@id'], fr.videoObject['@id']);
});

test("le fil d'Ariane porte un @id quand le slug est fourni, aucun sinon", () => {
  const avec = buildBreadcrumb({ title: 'Hanro' }, 'fr', 'hanro');
  assert.equal(avec['@id'], 'https://roxane-foare.com/fr/portfolio/hanro#breadcrumb');
  const sans = buildBreadcrumb({ title: 'Hanro' }, 'fr');
  assert.equal(sans['@id'], undefined, 'reste valide, simplement non adressable');
});

/* ── dateModified tenu par le contenu (GEO-03) ──────────────────────── */

test('chaque page projet porte une date de modification issue du registre', () => {
  const projets = /** @type {any[]} */ (videos.videos || videos);
  const routes = projectRoutes(projets);
  const sans = [];
  for (const { project, slug } of routes) {
    const { dateModified } = buildProjectMeta(project, slug, 'en');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateModified || '')) sans.push(slug);
  }
  assert.deepEqual(
    sans,
    [],
    'projets absents de content-dates.json - relancer `npm run thumbs` et committer le fichier :\n' +
      sans.join('\n')
  );
});

test('les dates de modification ne sont pas toutes identiques', () => {
  // Le défaut corrigé : `dateModified` valait la date du build partout, donc
  // republier pour une virgule faisait passer tout le site pour modifié le
  // même jour. Un signal uniformément neuf est un signal qu'on ignore.
  const projets = /** @type {any[]} */ (videos.videos || videos);
  const dates = new Set(
    projectRoutes(projets).map(({ project, slug }) => buildProjectMeta(project, slug, 'en').dateModified)
  );
  assert.ok(dates.size > 1, `une seule date pour toutes les pages projet : ${[...dates]}`);
});
