# Portfolio Roxane Foare

Site portfolio de **Roxane Foare**, monteuse vidéo freelance (Paris / Angers).

🌐 **En ligne :** https://roxane-foare.com

Site **bilingue** : anglais sur `/` (par défaut), français sur `/fr`. Tous les
textes d'interface sont centralisés dans `src/i18n/strings.js` ; les composants
reçoivent une prop `lang` et utilisent `useTranslations(lang)`.

**3 pages fixes** par langue : Accueil (`/`, `/fr` - showreel + CTA), Portfolio
(`/portfolio`, `/fr/portfolio` - grille de projets + contact) et About
(`/about`, `/fr/about` - présentation + contact), **plus une page par projet
vidéo** (`/portfolio/[slug]`), générée au build depuis `videos.json` - soit 68
pages au total. Le build utilise
`build.format: 'directory'` (`astro.config.mjs`) : chaque page devient un
dossier avec son `index.html`, que Vercel sert nativement. **Une nouvelle page
n'a donc aucune règle de routage à déclarer.** `"trailingSlash": false` dans
`vercel.json` renvoie un 308 de `/portfolio/` vers `/portfolio`, pour qu'une
seule forme d'URL réponde.

### Pages projet et indexation vidéo

Chaque projet doté d'un `id` Vimeo a sa page, avec **un lecteur visible** et son
JSON-LD `VideoObject`. Ce n'est pas cosmétique : Google n'indexe une vidéo que
si la page qui la déclare contient un lecteur entièrement dans la zone rendue au
chargement, de plus de 140 px de haut, de plus de 140 px de large **et** d'au
moins un tiers de la largeur de page. Le CSS de `.project-player`
(`styles.css`) borne la largeur du lecteur par la hauteur disponible pour
respecter ces seuils - **le modifier sans revérifier ces contraintes fait
retomber les vidéos hors index.**

L'adresse est dérivée du titre (`src/lib/slug.js`). **Renommer un projet dans le
CMS change donc son URL** : pour figer une adresse déjà indexée, renseigner le
champ « Identifiant d'URL » avec l'ancienne valeur *avant* de renommer.

La grille de `/portfolio` reste inchangée : la vignette est un `<a>` vers la
page projet, dont `app.js` intercepte le clic simple pour ouvrir la lightbox
comme avant. Ctrl+clic, clic milieu et robots suivent le lien.

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
│  ├─ pages/index.astro        # Accueil EN (/)
│  ├─ pages/portfolio.astro    # Portfolio EN (/portfolio)
│  ├─ pages/portfolio/[slug].astro    # Pages projet EN (/portfolio/<slug>)
│  ├─ pages/about.astro        # About EN (/about)
│  ├─ pages/fr/index.astro     # Accueil FR (/fr)
│  ├─ pages/fr/portfolio.astro # Portfolio FR (/fr/portfolio)
│  ├─ pages/fr/portfolio/[slug].astro # Pages projet FR (/fr/portfolio/<slug>)
│  ├─ pages/fr/about.astro     # About FR (/fr/about)
│  ├─ pages/sitemap.xml.js     # sitemap généré au build (pages fixes + pages projet)
│  ├─ layouts/Base.astro       # document complet + <head> (SEO, OG, JSON-LD), paramétré par langue + page
│  ├─ i18n/strings.js          # dictionnaire de traductions EN / FR
│  ├─ components/              # Nav, Hero, Work, WorkItem, ProjectDetail, About, Contact, Footer, Lightbox
│  ├─ lib/spans.js             # pattern de grille (build + client)
│  ├─ lib/slug.js              # slugs des pages projet (dérivés du titre, unicité garantie)
│  ├─ lib/project-page.js      # métadonnées + JSON-LD VideoObject d'une page projet
│  ├─ lib/thumb.js             # résolution src/srcset miniature (Vimeo CDN ou override local)
│  ├─ scripts/app.js           # interactivité client (filtres, lightbox, form)
│  ├─ styles/styles.css        # feuille de style du site
│  ├─ data/videos.json         # données projets (éditées via le CMS)
│  └─ data/vimeo-thumbs.json   # cache des URL de base Vimeo CDN (généré par fetch-thumbs.mjs)
├─ public/                     # live/, admin/ (CMS + redeploy.html), polices, favicons, og-image
├─ api/                        # fonctions serverless Vercel (contact -> Resend, email, redeploy)
├─ tests/                      # tests fumée (node:test)
├─ scripts/fetch-thumbs.mjs    # résolution des miniatures Vimeo au build
├─ vercel.json                 # headers / CSP / cache (déploiement Vercel)
└─ astro.config.mjs
```

### Cache

`vercel.json` ne peut pas porter de commentaires (le schéma Vercel refuse toute
clé hors `source`/`headers`/`has`/`missing`), d'où cette note. Trois politiques :

| Ressource | Politique | Pourquoi |
|---|---|---|
| `/_astro/`, `*.woff2` | `immutable`, 1 an | Nom porteur d'une empreinte de contenu : un changement produit un nouveau nom. |
| `/live/`, `/brands/`, favicons, `og-image.jpg` | 7 jours + 30 jours de `stale-while-revalidate` | Noms **sans** empreinte : un fichier remplacé doit pouvoir se propager. |
| HTML | `max-age=0, must-revalidate` (défaut Vercel) | Le contenu change à chaque publication CMS. L'edge Vercel le met **déjà** en cache de lui-même (`X-Vercel-Cache: HIT`), il n'y a donc rien à ajouter côté CDN. |

Sans la règle `/brands/`, les 93 fichiers de logos étaient revalidés à chaque
visite de la page À propos.

## Déploiement

**Vercel** est connecté au dépôt Git : **un push sur `main` déclenche le build et
le déploiement** (Root Directory = racine du dépôt, framework Astro,
`npm run build`, sortie `dist/`). Les headers/CSP/cache sont définis dans
[`vercel.json`](vercel.json) et les fonctions serverless dans [`api/`](api/).
La CI (`.github/workflows/ci.yml`) fait build + tests + `npm audit` sur chaque
push/PR vers `main`.

Variables d'environnement à définir sur Vercel : `RESEND_API_KEY`,
`CONTACT_EMAIL`, `RESEND_FROM`, `SITE_DOMAIN`, `DEPLOY_HOOK_URL`. Rate
limiting du formulaire et du bouton de redéploiement (optionnel) :
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (intégration Vercel
Marketplace Upstash).

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

Tout enregistrement dans le CMS crée un commit GitHub, ce qui déclenche
automatiquement un nouveau build Vercel (donc une résolution fraîche des
miniatures Vimeo) - **aucune action supplémentaire à faire** dans ce cas.

### Redéployer sans passer par le CMS

Si un changement est fait **directement sur Vimeo** (ex. nouvelle miniature
choisie sur une vidéo existante) sans toucher au CMS, aucun commit n'est créé
donc aucun build ne se relance tout seul - le site reste sur l'ancienne
miniature tant qu'un nouveau build n'a pas lieu. Page dédiée pour forcer un
redéploiement dans ce cas : **`/admin/redeploy.html`** (lien "Retour au CMS"
pour y revenir). Fonctionne via un [Vercel Deploy
Hook](https://vercel.com/docs/deployments/deploy-hooks) : *Project Settings →
Git → Deploy Hooks*, créer un hook sur la branche `main`, coller son URL dans
la variable d'environnement `DEPLOY_HOOK_URL` (voir `api/redeploy.js`).

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
- `sharp` est en **`devDependencies`** : il ne sert qu'à ce script, au build.
  Les fonctions serverless de `api/` n'en font aucun usage. Vercel installe les
  devDependencies au moment du build, la génération des variantes fonctionne
  donc normalement. (À noter : Astro le déclare aussi en `optionalDependencies`
  pour son service d'images, donc il reste présent dans l'arbre installé même
  sans notre déclaration - celle-ci sert surtout à dire d'où vient le besoin.)

### Vidéos privées restreintes par domaine

Les vidéos privées de Roxane sont restreintes au domaine `roxane-foare.com`.
Vimeo ne livre leur miniature que si la requête provient de ce domaine : le
script envoie donc un en-tête `Referer` correspondant. Si le domaine change,
définir la variable d'environnement **`SITE_DOMAIN`** (sur Vercel : *Settings →
Environment Variables*), ex. `SITE_DOMAIN=https://roxane-foare.com`.
Aucun token Vimeo n'est nécessaire.
