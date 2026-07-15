# Portfolio Roxane Foare - version Astro

Le site **Astro** déployé en production (Vercel). L'ancienne version HTML statique
est conservée dans `archive/` à titre de référence et n'est plus servie.

Site **bilingue** : anglais sur `/` (par défaut), français sur `/fr`. Tous les
textes d'interface sont centralisés dans `src/i18n/strings.js` ; les composants
reçoivent une prop `lang` et utilisent `useTranslations(lang)`.

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

> Le formulaire de contact et le lien email passent par des **fonctions
> serverless Vercel** (`api/contact.js` -> Resend, `api/email.js`). Ils ne
> fonctionnent donc pas en local pur (`npm run dev`) - utiliser `vercel dev` pour
> les tester. Tout le reste (grille, filtres, lightbox Vimeo, responsive) marche.

## Ce qui a changé par rapport à la version statique

- **Architecture en composants** (`src/components/`) : la page géante est
  découpée (Nav, Work, About, Contact, Footer, Lightbox).
- **La grille est rendue au build** depuis `src/data/videos.json` au lieu d'être
  construite en JS au chargement → plus de `fetch`, plus de flash/CLS, meilleur
  SEO (le contenu est dans le HTML).
- **Logique de pattern de grille partagée** (`src/lib/spans.js`) entre le build
  et le filtrage client - une seule source de vérité.
- Correctifs appliqués : catégorie **`clip` retirée**, fallback de police
  **`.otf` mort supprimé**, **`unpkg.com` retiré** de la CSP du site public
  (gardé uniquement pour `/admin/`).
- **Bilingue EN / FR** : layout partagé `src/layouts/Base.astro` paramétré par
  langue, pages `index.astro` (EN, `/`) et `fr/index.astro` (FR, `/fr`), balises
  `hreflang` + toggle de langue dans la nav.

## Optimisations - audit sécu / perf / SEO / a11y

- **Sécurité** : CSP durcie (`base-uri`, `form-action`, `object-src 'none'`,
  `frame-ancestors`), script CMS (`/admin`) épinglé + **SRI**, ouverture de liens
  externes restreinte aux URL `http(s)`.
- **Perf** : 1ʳᵉˢ vignettes en `loading="eager"` + `fetchpriority="high"` +
  **preload de l'image LCP**, images lourdes recompressées, **images responsive**
  (`srcset`/`sizes`).
- **Polices** : **DM Sans auto-hébergé** (plus de requête Google Fonts → perf +
  RGPD). `DalaFloda` **sous-ensemblée** aux glyphes de « Roxane Foare »
  (66 Ko → 2 Ko) - si le nom de marque change, régénérer le subset (fonttools).
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
│  ├─ pages/index.astro        # version EN (/)
│  ├─ pages/fr/index.astro     # version FR (/fr)
│  ├─ layouts/Base.astro       # document complet + <head> (SEO, OG, JSON-LD), paramétré par langue
│  ├─ i18n/strings.js          # dictionnaire de traductions EN / FR
│  ├─ components/              # Nav, Work, WorkItem, About, Contact, Footer, Lightbox
│  ├─ lib/spans.js            # pattern de grille (build + client)
│  ├─ lib/thumb.js            # résolution src/srcset miniature (Vimeo CDN ou override local)
│  ├─ scripts/app.js          # interactivité client (filtres, lightbox, form)
│  ├─ styles/styles.css       # CSS repris à l'identique
│  ├─ data/videos.json        # données projets (éditées via le CMS)
│  └─ data/vimeo-thumbs.json  # cache des URL de base Vimeo CDN (généré par fetch-thumbs.mjs)
├─ public/                    # live/, admin/, polices, favicons, og-image
├─ api/                       # fonctions serverless Vercel (contact, email)
├─ vercel.json                # headers / CSP / cache (déploiement Vercel)
└─ astro.config.mjs
```

## Édition du contenu (monteuse)

CMS **Sveltia** sur `/admin/` (auth GitHub OAuth). La config
(`public/admin/config.yml`) pointe sur :
- `file: astro/src/data/videos.json`
- `media_folder: astro/public/thumbs`
- `backend: github` (repo + branche `main`) + `base_url` du relais OAuth

## Miniatures automatiques ✅ (implémenté)

La monteuse n'a plus à produire d'image. Elle saisit seulement l'**ID Vimeo**
(+ **hash** si la vidéo est privée) et **laisse le champ Miniature vide** : la
miniature est servie **directement depuis le CDN Vimeo** (`i.vimeocdn.com`),
sans fichier local ni recompression.

- Script : `scripts/fetch-thumbs.mjs`, lancé automatiquement avant `dev` et
  `build` (hooks `predev` / `prebuild`).
- Pour chaque vidéo ayant un `id` (et sans override `thumb`), le script résout
  via l'API oEmbed Vimeo l'URL de base de sa miniature sur le CDN, et la
  stocke dans `src/data/vimeo-thumbs.json`. **Aucune image n'est téléchargée
  ni recompressée** : le CDN Vimeo sert l'image à la volée dans la largeur
  demandée (suffixe `_<largeur>` dans l'URL), avec une bien meilleure qualité
  qu'un double passage par `sharp`.
- Résolu à chaque `dev`/`build` (simples appels JSON, quasi instantané) pour
  rester synchronisé si la vignette change côté Vimeo. En cas d'échec réseau
  ponctuel, l'URL précédemment connue est conservée.
- **Variantes responsive** : `srcset` 640 / 1280 / 1920 construit directement
  depuis l'URL de base Vimeo (voir `src/lib/thumb.js`, utilisé par
  `WorkItem.astro` et `Base.astro`).
- Le champ `thumb` reste un **override manuel** prioritaire (affiche de film,
  image live) - fichier local sous `public/`, avec ses propres variantes
  `-640`/`-1280` générées par `sharp` (voir plus bas, `public/live/`).
- Régénérer manuellement : `npm run thumbs`.

### Vidéos privées restreintes par domaine

Les vidéos privées de Roxane sont restreintes au domaine `roxane-foare.com`.
Vimeo ne livre leur miniature que si la requête provient de ce domaine : le
script envoie donc un en-tête `Referer` correspondant. Si le domaine change,
définir la variable d'environnement **`SITE_DOMAIN`** (sur Vercel : *Settings →
Environment Variables*), ex. `SITE_DOMAIN=https://roxane-foare.com`.
Aucun token Vimeo n'est nécessaire.

## Déploiement Vercel - checklist de migration

Hébergement sur **Vercel** (Root Directory = `astro/`, framework Astro,
`npm run build`, sortie `dist/`). Étapes manuelles (comptes/infra) :

1. **Vercel** : importer le dépôt, Root Directory = `astro`. Variables d'env :
   `RESEND_API_KEY`, `CONTACT_EMAIL`, `RESEND_FROM`
   (ex. `Portfolio <noreply@roxane-foare.com>`), `SITE_DOMAIN`.
2. **Resend** : créer un compte, **vérifier le domaine** `roxane-foare.com`
   (DNS SPF/DKIM), générer la clé API.
3. **Analytics** : activer **Web Analytics** dans le projet Vercel
   (le script `/_vercel/insights/script.js` est servi automatiquement).
4. **CMS Sveltia / GitHub OAuth** :
   - créer une **GitHub OAuth App** (Authorization callback = URL du relais) ;
   - déployer un relais OAuth (`sveltia-cms-auth`, ex. Cloudflare Worker) avec
     `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` ;
   - renseigner `base_url` (et le domaine du relais dans la CSP `/admin` de
     `vercel.json`) dans `public/admin/config.yml`.
5. **DNS** : pointer `roxane-foare.com` vers Vercel, puis retirer le site Netlify.
6. **Upstash (rate limiting du formulaire de contact, optionnel)** : dans le
   projet Vercel, Storage → Browse Marketplace → **Upstash** (offre gratuite),
   créer une base Redis - les variables `UPSTASH_REDIS_REST_URL` et
   `UPSTASH_REDIS_REST_TOKEN` sont alors injectées automatiquement. Sans ça,
   `/api/contact` fonctionne normalement, juste sans limite de fréquence par IP
   (le honeypot + délai anti-bot restent actifs dans tous les cas).
```
