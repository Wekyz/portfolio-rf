# Portfolio Roxane Foare

Site portfolio de **Roxane Foare**, monteuse vidéo freelance (Paris / Angers).

🌐 **En ligne :** https://roxane-foare.com

Site **bilingue** : anglais sur `/` (par défaut), français sur `/fr`.

## Structure du dépôt

```
.
├─ astro/              # ← LE SITE (Astro). C'est ce qui est construit et déployé.
│  ├─ api/             # fonctions serverless Vercel (contact -> Resend, email)
│  └─ vercel.json      # headers/CSP/cache (config de déploiement Vercel)
└─ archive/            # ancien site HTML statique (conservé, NON déployé)
```

Le site est désormais une application **Astro** (build statique). L'ancienne
version HTML/CSS/JS vanilla est conservée dans `archive/` à titre de référence ;
elle n'est plus servie.

## Développement

```bash
cd astro
npm install      # une seule fois
npm run dev      # http://localhost:4321
```

Voir [`astro/README.md`](astro/README.md) pour le détail (composants, miniatures
automatiques, CMS, bascule de déploiement).

## Déploiement

**Vercel** est connecté au dépôt Git : **un push sur `main` déclenche le build et
le déploiement** (Root Directory = `astro/`, framework Astro, `npm run build`,
sortie `dist/`). Les headers/CSP/cache sont définis dans
[`astro/vercel.json`](astro/vercel.json) et les fonctions serverless dans
`astro/api/`.

Variables d'environnement à définir sur Vercel : `RESEND_API_KEY`,
`CONTACT_EMAIL`, `RESEND_FROM`. Voir [`astro/README.md`](astro/README.md) pour la
checklist de migration complète.

## Édition du contenu (sans toucher au code)

Via le CMS **Sveltia** sur `/admin/` (auth **GitHub OAuth**). La monteuse ajoute /
modifie / réordonne les vidéos. Pour une nouvelle vidéo, il suffit de l'**ID Vimeo**
(+ hash si privée) : la **miniature est récupérée automatiquement** depuis Vimeo
au build - aucune image à produire.
