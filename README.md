# Portfolio Roxane Foare

Site portfolio de **Roxane Foare**, monteuse vidéo freelance (Paris / Angers).

🌐 **En ligne :** https://roxane-foare.com

Site **bilingue** : anglais sur `/` (par défaut), français sur `/fr`. Tous les
textes d'interface sont centralisés dans `src/i18n/strings.js` ; les composants
reçoivent une prop `lang` et utilisent `useTranslations(lang)`.

Application **Astro** (build statique), déployée sur Vercel.

## Développement

```bash
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

```bash
npm test         # tests fumée (node:test), ex. /api/contact
```

## Structure du dépôt

```
.
├─ src/
│  ├─ pages/index.astro        # version EN (/)
│  ├─ pages/fr/index.astro     # version FR (/fr)
│  ├─ layouts/Base.astro       # document complet + <head> (SEO, OG, JSON-LD), paramétré par langue
│  ├─ i18n/strings.js          # dictionnaire de traductions EN / FR
│  ├─ components/              # Nav, Work, WorkItem, About, Contact, Footer, Lightbox
│  ├─ lib/spans.js             # pattern de grille (build + client)
│  ├─ lib/thumb.js             # résolution src/srcset miniature (Vimeo CDN ou override local)
│  ├─ scripts/app.js           # interactivité client (filtres, lightbox, form)
│  ├─ styles/styles.css        # feuille de style du site
│  ├─ data/videos.json         # données projets (éditées via le CMS)
│  └─ data/vimeo-thumbs.json   # cache des URL de base Vimeo CDN (généré par fetch-thumbs.mjs)
├─ public/                     # live/, admin/, polices, favicons, og-image
├─ api/                        # fonctions serverless Vercel (contact -> Resend, email)
├─ tests/                      # tests fumée (node:test)
├─ scripts/fetch-thumbs.mjs    # résolution des miniatures Vimeo au build
├─ vercel.json                 # headers / CSP / cache (déploiement Vercel)
└─ astro.config.mjs
```

## Déploiement

**Vercel** est connecté au dépôt Git : **un push sur `main` déclenche le build et
le déploiement** (Root Directory = racine du dépôt, framework Astro,
`npm run build`, sortie `dist/`). Les headers/CSP/cache sont définis dans
[`vercel.json`](vercel.json) et les fonctions serverless dans [`api/`](api/).
La CI (`.github/workflows/ci.yml`) fait build + tests + `npm audit` sur chaque
push/PR vers `main`.

Variables d'environnement à définir sur Vercel : `RESEND_API_KEY`,
`CONTACT_EMAIL`, `RESEND_FROM`, `SITE_DOMAIN`. Rate limiting du formulaire
(optionnel) : `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (intégration
Vercel Marketplace Upstash).

## Workflow git

Depuis le 2026-07-20 : plus de push direct sur `main`. Chaque changement passe
par une branche + une Pull Request.

```bash
git checkout -b feat/nom-court     # ou fix/, chore/, perf/...
# ... commits ...
git push -u origin feat/nom-court
# ouvrir la PR sur GitHub (lien affiché par le push), merge une fois la CI verte
```

La CI (`.github/workflows/ci.yml` - build, tests, `npm audit`) tourne
automatiquement sur chaque push et chaque PR ; c'est le check requis avant
merge.

> **Protection de branche** (à activer une fois, côté GitHub - pas versionné
> dans le dépôt) : *Settings → Branches → Add rule* sur `main`, cocher
> *"Require a pull request before merging"* et *"Require status checks to
> pass before merging"* (check `Build & audit`).

## Édition du contenu (monteuse)

Via le CMS **Sveltia** sur `/admin/` (auth **GitHub OAuth**). La config
(`public/admin/config.yml`) pointe sur :
- `file: src/data/videos.json`
- `media_folder: public/live` (overrides manuels uniquement - les miniatures
  viennent du CDN Vimeo, voir plus bas)
- `backend: github` (repo + branche `main`) + `base_url` du relais OAuth

Pour une nouvelle vidéo, il suffit de l'**ID Vimeo** (+ hash si privée) : la
**miniature est récupérée automatiquement** depuis Vimeo au build - aucune
image à produire.

## Miniatures automatiques

- Script : `scripts/fetch-thumbs.mjs`, lancé automatiquement avant `dev` et
  `build` (hooks `predev` / `prebuild`).
- Pour chaque vidéo ayant un `id` (et sans override `thumb`), le script résout
  via l'API oEmbed Vimeo l'URL de base de sa miniature sur le CDN, et la
  stocke dans `src/data/vimeo-thumbs.json`. **Aucune image n'est téléchargée
  ni recompressée** : le CDN Vimeo sert l'image à la volée dans la largeur
  demandée (suffixe `_<largeur>` dans l'URL).
- Résolu à chaque `dev`/`build` (simples appels JSON, quasi instantané) pour
  rester synchronisé si la vignette change côté Vimeo. En cas d'échec réseau
  ponctuel, l'URL précédemment connue est conservée.
- **Variantes responsive** : `srcset` 640 / 1280 / 1920 construit directement
  depuis l'URL de base Vimeo (voir `src/lib/thumb.js`, utilisé par
  `WorkItem.astro` et `Base.astro`).
- Le champ `thumb` reste un **override manuel** prioritaire (affiche de film,
  image live) - fichier local sous `public/`, avec ses propres variantes
  `-640`/`-1280` générées par `sharp` (voir `public/live/`).
- Régénérer manuellement : `npm run thumbs`.

### Vidéos privées restreintes par domaine

Les vidéos privées de Roxane sont restreintes au domaine `roxane-foare.com`.
Vimeo ne livre leur miniature que si la requête provient de ce domaine : le
script envoie donc un en-tête `Referer` correspondant. Si le domaine change,
définir la variable d'environnement **`SITE_DOMAIN`** (sur Vercel : *Settings →
Environment Variables*), ex. `SITE_DOMAIN=https://roxane-foare.com`.
Aucun token Vimeo n'est nécessaire.
