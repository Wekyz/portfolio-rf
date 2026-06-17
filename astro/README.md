# Portfolio Roxane Foare — version Astro (build de test)

Migration du site statique vers **Astro**, **à l'identique visuellement**.
Ce dossier est **isolé** : tant qu'on n'a pas basculé le déploiement, le site en
production continue d'être servi par les fichiers à la racine du dépôt.

## Tester en local

```bash
cd astro
npm install      # une seule fois
npm run dev      # http://localhost:4321  (rechargement à chaud)
```

Pour tester le rendu final (build statique + serveur) :

```bash
npm run build    # génère dist/
npm run preview  # sert dist/ sur http://localhost:4321
```

> Le formulaire de contact et le lien email passent par Netlify (Forms +
> Function). Ils ne fonctionnent donc pas en local pur — comme sur l'ancien
> site. Tout le reste (grille, filtres, lightbox Vimeo, responsive) fonctionne.

## Ce qui a changé par rapport à la version statique

- **Architecture en composants** (`src/components/`) : la page géante est
  découpée (Nav, Work, About, Contact, Footer, Lightbox).
- **La grille est rendue au build** depuis `src/data/videos.json` au lieu d'être
  construite en JS au chargement → plus de `fetch`, plus de flash/CLS, meilleur
  SEO (le contenu est dans le HTML).
- **Logique de pattern de grille partagée** (`src/lib/spans.js`) entre le build
  et le filtrage client — une seule source de vérité.
- Correctifs appliqués : catégorie **`clip` retirée**, fallback de police
  **`.otf` mort supprimé**, **`unpkg.com` retiré** de la CSP du site public
  (gardé uniquement pour `/admin/`).
- `og:locale` laissé en **`en_US`** (cible confirmée).

## Optimisations — audit sécu / perf / SEO / a11y

- **Sécurité** : CSP durcie (`base-uri`, `form-action`, `object-src 'none'`,
  `frame-ancestors`), Decap CMS épinglé + **SRI**, ouverture de liens externes
  restreinte aux URL `http(s)`.
- **Perf** : 1ʳᵉˢ vignettes en `loading="eager"` + `fetchpriority="high"` +
  **preload de l'image LCP**, images lourdes recompressées, **images responsive**
  (`srcset`/`sizes`).
- **Polices** : **DM Sans auto-hébergé** (plus de requête Google Fonts → perf +
  RGPD). `DalaFloda` **sous-ensemblée** aux glyphes de « Roxane Foare »
  (66 Ko → 2 Ko) — si le nom de marque change, régénérer le subset (fonttools).
- **SEO** : `<h1>` (logo), `og:image` avec dimensions + `alt`, **données
  structurées `VideoObject`** pour les projets, **sitemap généré au build**
  (`src/pages/sitemap.xml.js`, `lastmod` automatique).
- **A11y** : contraste WCAG AA, titres visibles au tactile (`@media (hover:none)`),
  piège à focus + restitution du focus dans la lightbox, **lien d'évitement**,
  `<main>`, cibles tactiles des filtres, spinner de chargement du player.
- **Sécurité (suite)** : header `Cross-Origin-Opener-Policy`, widget Netlify
  Identity **retiré de la page publique** (ne reste que sur `/admin`).
- **Build** : version Node épinglée (`.nvmrc` = 20), `overrides` esbuild ≥ 0.28.1
  (`npm audit` = 0 vuln), **Dependabot** (`.github/dependabot.yml`).

## Structure

```
astro/
├─ src/
│  ├─ pages/index.astro        # page + <head> (SEO, OG, JSON-LD)
│  ├─ components/              # Nav, Work, WorkItem, About, Contact, Footer, Lightbox
│  ├─ lib/spans.js            # pattern de grille (build + client)
│  ├─ scripts/app.js          # interactivité client (filtres, lightbox, form)
│  ├─ styles/styles.css       # CSS repris à l'identique
│  └─ data/videos.json        # données projets (éditées via le CMS)
├─ public/                    # thumbs/, live/, admin/, polices, favicons, og-image
├─ netlify.toml               # config de déploiement (pour la bascule)
└─ astro.config.mjs
```

## Édition du contenu (monteuse)

Inchangé : le CMS Decap reste sur `/admin/`. La config (`public/admin/config.yml`)
a été adaptée aux nouveaux chemins :
- `file: astro/src/data/videos.json`
- `media_folder: astro/public/thumbs`

## Miniatures automatiques ✅ (implémenté)

La monteuse n'a plus à produire d'image. Elle saisit seulement l'**ID Vimeo**
(+ **hash** si la vidéo est privée) et **laisse le champ Miniature vide** : la
miniature est récupérée depuis Vimeo et convertie en WebP **au build**.

- Script : `scripts/fetch-thumbs.mjs`, lancé automatiquement avant `dev` et
  `build` (hooks `predev` / `prebuild`).
- Pour chaque vidéo ayant un `id`, si `public/thumbs/<id>.webp` n'existe pas, il
  est généré (oEmbed Vimeo → `sharp` → WebP, largeur plafonnée à 1280px).
- **Variantes responsive** : pour chaque image (`thumbs/` **et** `live/`), une
  variante `…-640.webp` est générée pour le `srcset` mobile (voir `sizes` dans
  `WorkItem.astro`). Les variantes déjà présentes ne sont pas réécrites.
- **Les miniatures déjà présentes ne sont jamais écrasées** : une image posée à
  la main (affiche de film, etc.) reste prioritaire. Pour forcer une
  régénération, supprimer le `.webp` correspondant.
- Le rendu retombe automatiquement sur `/thumbs/<id>.webp` quand le champ
  `thumb` est vide (voir `WorkItem.astro`).
- Régénérer manuellement : `npm run thumbs`.

### Vidéos privées restreintes par domaine

Les vidéos privées de Roxane sont restreintes au domaine `roxane-foare.com`.
Vimeo ne livre leur miniature que si la requête provient de ce domaine : le
script envoie donc un en-tête `Referer` correspondant. Si le domaine change,
définir la variable d'environnement **`SITE_DOMAIN`** (sur Netlify : *Site
settings → Environment variables*), ex. `SITE_DOMAIN=https://roxane-foare.com`.
Aucun token Vimeo n'est nécessaire.

## Basculer le déploiement (plus tard, après validation)

Sur Netlify, pointer le build sur ce dossier (voir `astro/netlify.toml` :
`base = "astro"`, `command = "npm run build"`, `publish = "dist"`). Le
`netlify.toml` à la racine du dépôt reste en place tant que la bascule n'est pas
décidée.
```
