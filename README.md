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
npm test         # tests unitaires (node:test) : slugs, grille, miniatures,
                 # fonctions serverless, routes et budgets de poids
npm run test:e2e # parcours réels (Playwright) sur le build servi par preview
```

> `npm test` inclut des contrôles qui s'appuient sur `dist/` (cohérence
> sitemap, budgets de poids). Ils sont **ignorés** si le dossier n'existe pas,
> pour ne pas casser un `npm test` lancé sans build - en CI, les tests
> passent après le build, donc ils s'exécutent.

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

### Champs pilotés depuis le CMS

Deux champs par projet changent le site sans intervention technique :

- **Présentation du projet** (`description`) : texte libre affiché sur la page
  du projet et repris dans le `VideoObject`. La `<meta description>` reste, elle,
  la version courte générée, pour ne pas être tronquée par Google.
- **Mettre en avant sur l'accueil** (`featured`) : les projets cochés
  apparaissent sur l'accueil, dans l'ordre de la liste, 3 au maximum. Seuls les
  projets ayant une page (donc une vidéo Vimeo) sont retenus. Si aucun n'est
  coché, les 3 premiers de la liste s'affichent, pour que l'accueil ne soit
  jamais vide.

### Fichiers pour les moteurs de réponse

`llms.txt` et `llms-full.txt` sont **générés au build** (`src/pages/`), comme
les sitemaps. La version manuelle précédente ne nommait aucun projet et
affirmait que les miniatures étaient auto-hébergées, ce qui était devenu faux :
la génération supprime cette classe d'erreur. Ne pas les recréer dans
`public/`, la route l'emporterait ou entrerait en conflit.

La **FAQ** vit dans `src/i18n/faq.js` et alimente à la fois l'accordéon de la
page À propos, le schéma `FAQPage` et les deux fichiers `llms`. Plusieurs
réponses sont des hypothèses de rédaction, signalées `[à confirmer]` dans le
fichier.

### Pages légales

`src/data/legal.js` porte les données d'identité (adresse, courriel, SIRET),
saisies **une seule fois** pour les quatre pages (mentions légales et
confidentialité, deux langues). Tant qu'un champ vaut `null`, il s'affiche
« [à compléter] » sur le site et le build imprime un avertissement.

Le contenu rédactionnel est dans `src/i18n/legal.js`, séparé de `strings.js`.

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
`CONTACT_EMAIL`, `RESEND_FROM`, `SITE_DOMAIN`, `DEPLOY_HOOK_URL`,
**`REDEPLOY_TOKEN`**. Rate limiting du formulaire et du bouton de
redéploiement (optionnel) : `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` (intégration Vercel Marketplace Upstash).
Signature du jeton anti-bot du formulaire (recommandé) : `FORM_SECRET` - à
défaut, la clé se dérive de `RESEND_API_KEY`, de toute façon nécessaire pour
que le formulaire fonctionne (voir `api/_lib/form-token.js`).

**Version de Node.** `engines.node` (`package.json`) fait autorité : la
documentation Vercel précise qu'il **prime sur le réglage Node.js du projet**.
Le runtime des fonctions serverless est donc épinglé depuis le dépôt, et non
depuis le tableau de bord. `.nvmrc` porte la même valeur pour le poste de
développement et la CI ; `tests/routes.test.mjs` vérifie qu'elles ne divergent
pas. Ne pas déclarer de bloc `functions.runtime` dans `vercel.json` : ce champ
attend un nom de paquet de runtime personnalisé, pas une version de Node.

> **`REDEPLOY_TOKEN` est obligatoire pour que le bouton de redéploiement
> fonctionne.** Sans elle, `/api/redeploy` refuse tout (503) : l'endpoint
> déclenche un build de production, il vaut mieux qu'il soit condamné que
> laissé ouvert. Choisir une valeur longue et aléatoire, puis la
> communiquer à la monteuse - elle la saisit une fois par onglet sur
> `/admin/redeploy.html`. Elle n'est jamais écrite dans la page, qui est
> publique.

### Antispam

Trois couches, de la plus discrète à la plus visible :

1. **Honeypot** + **jeton horodaté signé** côté serveur (`api/_lib/form-token.js`).
2. **Limitation de débit** Upstash, 5 envois / 10 min par IP. Optionnelle : sans
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, elle est désactivée et
   la fonction l'écrit dans ses journaux (Vercel → Logs) - rien ne le disait
   auparavant. **Vérifier que ces deux variables existent bien sur
   l'environnement Production.**
3. **Cloudflare Turnstile**, *désactivé par défaut*. S'active en définissant
   `PUBLIC_TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET_KEY` : le widget, le domaine
   dans la CSP et le paragraphe de confidentialité apparaissent alors seuls.
   À n'activer qu'au vu des compteurs (ci-dessous). **Turnstile transmet
   l'adresse IP du visiteur à Cloudflare**, ce que le site évite partout
   ailleurs - c'est un arbitrage, pas une évidence.

Chaque rejet incrémente un compteur mensuel dans Upstash, sous
`abuse:AAAA-MM:<motif>` (`honeypot`, `rate-limit`, `too-fast`, `bad-token`,
`too-long`, `invalid-fields`, `captcha-*`). Sans ça, aucune trace ne permettait
de savoir si le dispositif était surdimensionné ou déjà dépassé.

### Mise à jour du CMS (Sveltia)

Sveltia est chargé depuis unpkg à une version épinglée, avec une empreinte SRI.
Dependabot ne voyant pas une balise `<script>`, le paquet est **aussi déclaré
en `devDependency`** à la version réellement chargée : il est donc surveillé
comme n'importe quelle dépendance.

`tests/cms-version.test.mjs` fait échouer la CI tant que
`public/admin/index.html` n'a pas suivi une montée de version - version **et**
empreinte, recalculée depuis le paquet npm (vérifié identique octet pour octet
au fichier servi par unpkg). La montée reste donc un geste conscient, à faire
avec le CMS testé.

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

La page demande une **phrase secrète** (`REDEPLOY_TOKEN`), retenue le temps de
l'onglet. Sans elle, l'endpoint était public : un simple `curl -X POST`
suffisait à relancer un build de production, brûler des minutes de build,
purger le cache edge et déclencher une cascade d'appels à l'API Vimeo. La page
est publique et contient l'appel en clair, le secret ne peut donc pas y être
écrit - il est saisi, jamais livré.

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
