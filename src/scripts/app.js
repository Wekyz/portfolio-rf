/* ============================================================
   Roxane Foare - Portfolio (Astro)
   Logique client : nav mobile, clic vignettes, filtres, lightbox, formulaire,
   retour en haut. La grille est rendue au build ; ce script ajoute
   l'interactivité par-dessus, il ne fait ni fetch ni construction du DOM.
   ============================================================ */
import { applySpans } from '../lib/spans.js';

(() => {
  'use strict';

  const grid = document.getElementById('workGrid');
  const contactForm = document.querySelector('.contact-form');
  const formStatus = document.getElementById('formStatus');
  const formLoadTime = Date.now();
  const navBurger = document.getElementById('navBurger');
  const navLinks = document.getElementById('navLinks');
  const backToTop = document.getElementById('backToTop');

  // Libellés du bouton d'envoi selon la langue de la page (en / fr).
  const lang = document.documentElement.lang === 'fr' ? 'fr' : 'en';
  const FORM_LABELS = {
    en: { sending: 'Sending…', sent: 'Sent ✓', error: 'Error - try again' },
    fr: { sending: 'Envoi…', sent: 'Envoyé ✓', error: 'Erreur - réessayez' },
  }[lang];

  // Le serveur distingue cinq causes de refus et rédige un message précis pour
  // chacune ; le client les jetait toutes et affichait « Erreur - réessayez ».
  // Quelqu'un dont l'adresse comporte une faute de frappe réessayait donc à
  // l'identique. Les messages du serveur sont en français : on traduit son
  // `code`, stable, plutôt que d'afficher son texte sur la version anglaise.
  const FORM_ERRORS = {
    en: {
      'rate-limit': 'Too many attempts. Please try again in a few minutes.',
      'too-long': 'One of the fields is too long.',
      'invalid-fields': 'Please check the required fields and your email address.',
      'too-fast': 'Sent a little too fast - please try again in a moment.',
      'bad-token': 'This form has expired. Please reload the page.',
      captcha: 'The anti-robot check failed. Please try again.',
      unavailable: 'The email service is unavailable. Please try again later.',
      'send-failed': 'The message could not be sent. Please try again in a moment.',
    },
    fr: {
      'rate-limit': 'Trop de tentatives. Réessayez dans quelques minutes.',
      'too-long': "L'un des champs est trop long.",
      'invalid-fields': 'Vérifiez les champs obligatoires et votre adresse e-mail.',
      'too-fast': 'Envoi un peu trop rapide - réessayez dans un instant.',
      'bad-token': 'Ce formulaire a expiré. Rechargez la page.',
      captcha: 'La vérification anti-robot a échoué. Réessayez.',
      unavailable: "Le service d'envoi est indisponible. Réessayez plus tard.",
      'send-failed': "Le message n'a pas pu être envoyé. Réessayez dans un instant.",
    },
  }[lang];

  // Quand le serveur nomme le champ fautif (`field`), le message le nomme
  // aussi, avec le libellé affiché à l'écran. « L'un des champs est trop
  // long » laissait chercher lequel.
  const FIELD_ERRORS = {
    en: {
      'too-long': (label, max) => `${label}: ${max} characters maximum.`,
      missing: (label) => `${label} is required.`,
      email: 'Please check your email address.',
    },
    fr: {
      'too-long': (label, max) => `${label} : ${max} caractères maximum.`,
      missing: (label) => `${label} : champ obligatoire.`,
      email: 'Vérifiez votre adresse e-mail.',
    },
  }[lang];

  // ── Menu burger (mobile) - présent sur les 3 pages ────────────
  if (navBurger && navLinks) {
    const closeMenu = () => {
      navBurger.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('open');
    };
    navBurger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      navBurger.setAttribute('aria-expanded', String(isOpen));
    });
    // Referme au clic sur un lien (utile pour le toggle de langue, qui reste
    // sur une page équivalente plutôt que de démonter la nav immédiatement).
    navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
    document.addEventListener('click', (e) => {
      if (!navLinks.classList.contains('open')) return;
      if (navLinks.contains(e.target) || navBurger.contains(e.target)) return;
      closeMenu();
    });
  }

  // ── Bandeau de logos : arrêt / reprise (page À propos) ────────
  // WCAG 2.2.2 : un mouvement automatique de plus de 5 secondes doit pouvoir
  // être arrêté. La classe `paused` fige l'animation, voir styles.css.
  const brandsToggle = document.getElementById('brandsToggle');
  if (brandsToggle) {
    const marquee = document.querySelector('.brand-marquee');
    brandsToggle.addEventListener('click', () => {
      const paused = marquee.classList.toggle('paused');
      brandsToggle.setAttribute('aria-pressed', String(paused));
      brandsToggle.setAttribute(
        'aria-label',
        brandsToggle.dataset[paused ? 'labelPlay' : 'labelPause']
      );
    });
  }

  // ── Showreel : arrêt, reprise, déplacement (page d'accueil) ───
  // Même exigence que le bandeau ci-dessus (WCAG 2.2.2), sur un contenu bien
  // plus lourd : la vidéo occupe toute la largeur et tourne indéfiniment.
  //
  // Le lecteur est un iframe Vimeo en `background=1` : aucune commande native,
  // et l'iframe est hors origine, donc son DOM est inaccessible. On lui parle
  // par postMessage, le protocole du lecteur Vimeo - qui répond bien dans ce
  // mode (vérifié sur la production : `pause`, `play` et `setCurrentTime`
  // aboutissent, y compris un déplacement pendant la pause). Aucun SDK n'est
  // chargé : ce sont trois messages JSON, zéro octet tiers de plus.
  //
  // À noter, l'événement s'appelle `playProgress` et non `timeupdate` : le
  // pont postMessage brut n'expose pas les mêmes noms que le SDK. Il porte
  // `seconds`, `percent` et `duration`, ce qui dispense d'interroger la durée.
  const showreel = document.querySelector('.showreel-frame[data-src]');
  const showreelControls = document.getElementById('showreelControls');
  if (showreel && showreelControls) {
    const showreelBox = document.getElementById('showreel');
    const showreelToggle = document.getElementById('showreelToggle');
    const seek = document.getElementById('showreelSeek');
    const VIMEO_ORIGIN = 'https://player.vimeo.com';

    const post = (method, value) => {
      const payload = value === undefined ? { method } : { method, value };
      try {
        showreel.contentWindow.postMessage(JSON.stringify(payload), VIMEO_ORIGIN);
      } catch {
        // Iframe pas encore navigable : la souscription est réémise plus bas.
      }
    };

    let duration = 0;
    let ready = false;
    let subscribeTimer = null;
    // Fenêtre pendant laquelle les positions renvoyées par le lecteur sont
    // ignorées : sans elle, un `playProgress` arrivé en plein glissement
    // repousserait le pouce sous le doigt de l'utilisateur.
    let holdUntil = 0;
    let lastSeekSent = 0;

    // Format « 1:23 », celui de tous les lecteurs vidéo : il ne demande
    // aucune traduction, contrairement à un « 1 min 23 s » (même raisonnement
    // que formatDuration dans lib/project-page.js).
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    // Un curseur annonce sa valeur brute (« 37 ») : sans ce texte, un lecteur
    // d'écran énoncerait un nombre sans unité ni repère.
    const describe = (seconds) => {
      if (duration) seek.setAttribute('aria-valuetext', `${fmt(seconds)} / ${fmt(duration)}`);
    };

    const setPaused = (paused) => {
      showreelToggle.setAttribute('aria-pressed', String(paused));
      showreelToggle.setAttribute(
        'aria-label',
        showreelToggle.dataset[paused ? 'labelPlay' : 'labelPause']
      );
    };

    showreelToggle.addEventListener('click', () => {
      // On commande, on n'affiche rien : l'état visible suit l'événement
      // renvoyé par le lecteur, seul à savoir ce qui se passe réellement.
      post(showreelToggle.getAttribute('aria-pressed') === 'true' ? 'play' : 'pause');
    });

    const sendSeek = () => {
      lastSeekSent = Date.now();
      post('setCurrentTime', Number(seek.value));
    };
    seek.addEventListener('input', () => {
      holdUntil = Date.now() + 600;
      describe(Number(seek.value));
      // Un glissement émet un `input` par pixel parcouru. On borne à ~7
      // messages par seconde ; `change` garantit que le dernier arrive.
      if (Date.now() - lastSeekSent > 150) sendSeek();
    });
    seek.addEventListener('change', sendSeek);

    window.addEventListener('message', (e) => {
      if (e.origin !== VIMEO_ORIGIN) return;
      let msg;
      try {
        msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (!msg) return;

      if (!ready) {
        // Le lecteur répond : les commandes pilotent vraiment quelque chose,
        // on peut les montrer. Un bouton de pause qui ne met rien en pause
        // vaudrait moins que pas de bouton.
        ready = true;
        showreelControls.hidden = false;
        if (subscribeTimer) clearInterval(subscribeTimer);
        // La lecture automatique reste la règle. `prefers-reduced-motion` est
        // l'exception que ce visiteur-là a posée dans son système ; il garde
        // le bouton pour relancer quand il veut.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) post('pause');
      }

      // Première image réellement jouée : le lecteur prend la place de
      // l'image d'ouverture, en fondu (voir .showreel-frame).
      if (msg.event === 'play' || (msg.event === 'playProgress' && msg.data && msg.data.seconds > 0)) {
        showreelBox.classList.add('is-playing');
      }

      if (msg.event === 'play') setPaused(false);
      else if (msg.event === 'pause') setPaused(true);
      else if (msg.event === 'playProgress' && msg.data) {
        if (msg.data.duration && msg.data.duration !== duration) {
          duration = msg.data.duration;
          // `max` en secondes : une flèche du clavier déplace alors d'une
          // seconde exactement, là où une échelle en pourcentage aurait rendu
          // la navigation clavier inutilisable.
          seek.max = String(Math.round(duration));
        }
        if (Date.now() >= holdUntil) {
          seek.value = String(Math.round(msg.data.seconds));
          describe(msg.data.seconds);
        }
      }
    });

    // Le lecteur ne met pas les souscriptions en file d'attente : on
    // s'abonne dès l'injection, encore au `load`, puis on réessaie jusqu'à la
    // première réponse.
    const subscribe = () => {
      post('addEventListener', 'playProgress');
      post('addEventListener', 'play');
      post('addEventListener', 'pause');
    };

    // Injection différée du lecteur (voir Hero.astro) : après le `load` de la
    // page, au premier temps mort, au plus tard deux secondes après.
    // `location.replace` plutôt que `src` : aucune entrée ajoutée à
    // l'historique (même raison que pour la lightbox).
    const startPlayer = () => {
      const src = showreel.dataset.src;
      try {
        showreel.contentWindow.location.replace(src);
      } catch {
        showreel.src = src;
      }
      subscribe();
      showreel.addEventListener('load', subscribe);
      subscribeTimer = setInterval(() => {
        if (ready) clearInterval(subscribeTimer);
        else subscribe();
      }, 600);
      // Lecteur injoignable (bloqueur, réseau) : on cesse d'insister, les
      // commandes restent cachées et l'image d'ouverture reste en place,
      // ce qui est la bonne façon d'échouer ici.
      setTimeout(() => clearInterval(subscribeTimer), 15000);
    };
    const whenIdle = () =>
      'requestIdleCallback' in window
        ? window.requestIdleCallback(startPlayer, { timeout: 2000 })
        : setTimeout(startPlayer, 200);
    if (document.readyState === 'complete') whenIdle();
    else window.addEventListener('load', whenIdle, { once: true });
  }

  // ── Retour en haut (Portfolio / About) ────────────────────────
  if (backToTop) {
    // Le bouton est fixé à 24 px du bas et de la droite : arrivé en bas de
    // page il recouvrait le crédit du pied de page. On l'efface dès que le
    // pied de page entre dans le champ - à ce moment-là le haut de page est
    // de toute façon à un coup de molette, le bouton n'a plus d'utilité.
    let footerVisible = false;
    const toggle = () =>
      backToTop.classList.toggle('visible', window.scrollY > 600 && !footerVisible);

    const footer = document.querySelector('footer');
    if (footer && 'IntersectionObserver' in window) {
      new IntersectionObserver(
        ([entry]) => {
          footerVisible = entry.isIntersecting;
          toggle();
        },
        { rootMargin: '0px 0px -24px 0px' }
      ).observe(footer);
    }

    toggle();
    window.addEventListener('scroll', toggle, { passive: true });
    backToTop.addEventListener('click', () => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  // ── Grille + lightbox + filtres (page Portfolio uniquement) ──
  // La page Accueil et la page About n'ont ni grille ni lightbox dans leur
  // HTML : ce bloc entier ne doit s'exécuter que quand #workGrid existe,
  // sinon les querySelector du lightbox renverraient null (le composant
  // Lightbox n'est présent que sur la page Portfolio).
  if (grid) {
    const lightboxEl = document.getElementById('lightbox');
    const lightboxFrame = document.getElementById('lightboxFrame');
    const lightboxClose = document.getElementById('lightboxClose');
    const originalOrder = Array.from(grid.querySelectorAll('.work-item'));

    // ── Lightbox ────────────────────────────────────────────────
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxMeta = document.getElementById('lightboxMeta');
    const lightboxSheet = document.getElementById('lightboxSheet');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    let lastFocused = null; // élément déclencheur, pour y revenir à la fermeture
    let currentItem = null; // vignette en cours d'affichage, pour prev/suivant

    /**
     * Adresse de la fiche d'une vignette, ou null (lien externe, pas de fiche).
     *
     * Ouvrir une vidéo ne changeait pas l'URL : copier l'adresse donnait la
     * grille, et le bouton Retour quittait la page Portfolio au lieu de fermer
     * la vidéo. L'URL passe désormais à celle de la fiche (pushState) : elle
     * se partage, et l'ouvrir dans un autre onglet mène à la page projet, qui
     * montre la même vidéo. Retour la referme.
     */
    /**
     * Charge une adresse dans le lecteur SANS toucher à l'historique.
     *
     * Changer `src` d'un iframe ajoute une entrée à l'historique de la page :
     * chaque vidéo ouverte, puis chaque fermeture (src vide), en empilait une.
     * Le bouton Retour reculait donc dans le lecteur au lieu de fermer la
     * vidéo ou de quitter la page. `location.replace` sur la fenêtre de
     * l'iframe navigue sans rien empiler ; c'est l'un des rares accès qu'un
     * navigateur autorise vers une fenêtre d'une autre origine.
     */
    function frameGo(url) {
      try {
        lightboxFrame.contentWindow.location.replace(url);
      } catch {
        lightboxFrame.src = url;
      }
    }

    function sheetHref(item) {
      const link = item.querySelector('a.work-thumb-wrap');
      return link && link.target !== '_blank' ? link.getAttribute('href') : null;
    }

    /**
     * Projets navigables : ceux qui ont une vidéo et qui sont visibles.
     * Recalculé à chaque ouverture parce que le filtre de catégorie change la
     * liste - enchaîner dans « Documentaire » ne doit pas ramener une pub.
     */
    function playable() {
      return originalOrder.filter((el) => el.dataset.id && !el.classList.contains('hidden'));
    }

    function fillInfo(item) {
      const title = item.querySelector('.work-title');
      const prod = item.querySelector('.work-prod');
      const year = item.querySelector('.work-year');
      const link = item.querySelector('a.work-thumb-wrap');
      lightboxTitle.textContent = title ? title.textContent : '';
      lightboxMeta.textContent = [prod && prod.textContent, year && year.textContent]
        .filter(Boolean)
        .join(' · ');
      // Le lien « voir la fiche » n'a de sens que vers une page projet, pas
      // vers un site externe (qui ouvre déjà son propre onglet).
      const href = link && link.target !== '_blank' ? link.getAttribute('href') : null;
      lightboxSheet.hidden = !href;
      if (href) lightboxSheet.setAttribute('href', href);

      const list = playable();
      const many = list.length > 1;
      lightboxPrev.hidden = !many;
      lightboxNext.hidden = !many;
    }

    function openLightbox(item, trigger) {
      // `trigger` explicite plutôt que document.activeElement : Safari ne
      // donne pas le focus à un <a> au clic, on perdrait le retour de focus
      // à la fermeture (a11y).
      if (trigger !== undefined) lastFocused = trigger || document.activeElement;
      currentItem = item;
      const { id, hash } = item.dataset;
      // `dnt=1` : pas de cookie de mesure d'audience Vimeo (voir embedUrl dans
      // lib/project-page.js).
      const params = new URLSearchParams({ autoplay: '1', color: 'ffffff', title: '0', byline: '0', dnt: '1' });
      if (hash) params.set('h', hash);
      frameGo(`https://player.vimeo.com/video/${id}?${params}`);
      fillInfo(item);
      lightboxEl.classList.add('open', 'loading'); // 'loading' : affiche le spinner
      if (!lightboxEl.open) lightboxEl.showModal();
      document.body.style.overflow = 'hidden';
      lightboxClose.focus();

      // Une seule entrée d'historique par ouverture : passer au projet voisin
      // remplace l'adresse, sinon il faudrait autant de Retour que de vidéos
      // vues pour quitter la lightbox.
      const href = sheetHref(item);
      if (href) {
        const state = { lightbox: href };
        if (history.state && history.state.lightbox) history.replaceState(state, '', href);
        else history.pushState(state, '', href);
      }
    }

    /** Passe au projet voisin, en bouclant aux extrémités. */
    function step(delta) {
      const list = playable();
      if (list.length < 2 || !currentItem) return;
      const i = list.indexOf(currentItem);
      if (i === -1) return;
      const next = list[(i + delta + list.length) % list.length];
      lightboxEl.classList.add('loading');
      openLightbox(next); // `trigger` omis : on garde la vignette d'origine
    }
    lightboxPrev.addEventListener('click', () => step(-1));
    lightboxNext.addEventListener('click', () => step(1));
    // Le player Vimeo a fini de charger -> on masque le spinner.
    lightboxFrame.addEventListener('load', () => lightboxEl.classList.remove('loading'));
    /**
     * Fermeture demandée par le visiteur (bouton, Échap, clic hors du
     * lecteur). Si l'ouverture a ajouté une entrée d'historique, on la retire
     * par `history.back()` : c'est `popstate` qui ferme réellement, comme
     * pour le bouton Retour du navigateur, et l'adresse redevient celle de la
     * grille.
     */
    function requestClose() {
      if (history.state && history.state.lightbox) history.back();
      else closeLightbox();
    }

    window.addEventListener('popstate', (e) => {
      const target = e.state && e.state.lightbox;
      if (!target) {
        if (lightboxEl.classList.contains('open')) closeLightbox();
        return;
      }
      // Avancer dans l'historique vers une vidéo déjà ouverte la rouvre.
      const item = originalOrder.find((el) => sheetHref(el) === target);
      if (item && item.dataset.id) openLightbox(item, item.querySelector('a.work-thumb-wrap'));
    });

    function closeLightbox() {
      if (!lightboxEl.classList.contains('open')) return;
      lightboxEl.classList.remove('open');
      if (lightboxEl.open) lightboxEl.close();
      frameGo('about:blank');
      document.body.style.overflow = '';
      currentItem = null;
      // Rend le focus à la vignette qui a ouvert la modale (a11y).
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
      lastFocused = null;
    }
    lightboxClose.addEventListener('click', requestClose);
    lightboxEl.addEventListener('click', (e) => { if (e.target === e.currentTarget) requestClose(); });
    // Échap : le <dialog> émet `cancel`. On le retient pour passer par
    // requestClose (retrait de l'entrée d'historique). Si le navigateur
    // ferme quand même (il ignore parfois l'annulation d'un second Échap),
    // `close` rattrape le nettoyage.
    lightboxEl.addEventListener('cancel', (e) => {
      e.preventDefault();
      requestClose();
    });
    lightboxEl.addEventListener('close', () => {
      if (lightboxEl.classList.contains('open')) requestClose();
    });
    document.addEventListener('keydown', (e) => {
      if (!lightboxEl.classList.contains('open')) return;
      // Flèches : enchaîner les projets sans fermer la modale. Ignorées quand
      // le focus est dans le lecteur, où Vimeo s'en sert pour la lecture.
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && document.activeElement !== lightboxFrame) {
        e.preventDefault();
        step(e.key === 'ArrowLeft' ? -1 : 1);
        return;
      }
    });

    // ── Clic sur une vignette ───────────────────────────────────
    // La vignette est un <a> vers sa page projet (voir WorkItem.astro). On
    // intercepte le clic simple pour ouvrir la lightbox, comportement
    // inchangé pour le visiteur ; toute autre forme de clic suit le lien.
    originalOrder.forEach((item) => {
      const link = item.querySelector('a.work-thumb-wrap');
      if (!link) return;
      link.addEventListener('click', (e) => {
        // Clic modifié = intention explicite de naviguer (nouvel onglet,
        // nouvelle fenêtre, téléchargement) : on ne s'interpose pas.
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;
        // Lien externe (projet sans vidéo Vimeo) : il ouvre déjà son onglet.
        if (link.target === '_blank') return;
        if (!item.dataset.id) return;
        e.preventDefault();
        openLightbox(item, link);
      });
    });

    // ── Filtres (boutons desktop + select mobile, mêmes valeurs) ──
    // "All" est le filtre par défaut (actif au chargement) ; les séparateurs
    // de catégorie (voir Work.astro) n'ont de sens qu'en vue "All" - ils sont
    // masqués dès qu'un filtre spécifique est actif.
    const buttons = document.querySelectorAll('.filter-btn');
    const select = document.getElementById('filterSelect');
    const dividers = document.querySelectorAll('.cat-divider');

    /**
     * Le filtre n'existait que dans le JS : `/portfolio` n'acceptait aucun
     * paramètre, un filtre choisi n'était donc ni partageable, ni retrouvable
     * par le bouton Retour, et une page projet ne pouvait pas ramener vers sa
     * catégorie. `replaceState` plutôt que `pushState` : empiler une entrée
     * d'historique par clic obligerait à appuyer sept fois sur Retour pour
     * quitter la page.
     */
    function syncUrl(f) {
      const url = new URL(window.location.href);
      if (f === 'all') url.searchParams.delete('cat');
      else url.searchParams.set('cat', f);
      window.history.replaceState(null, '', url);
    }

    function applyFilter(f, { url = true } = {}) {
      if (url) syncUrl(f);
      buttons.forEach((b) => {
        const isActive = b.dataset.filter === f;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-pressed', String(isActive));
      });
      if (select && select.value !== f) select.value = f;
      dividers.forEach((d) => d.classList.toggle('hidden', f !== 'all'));

      if (f === 'all') {
        originalOrder.forEach((item) => item.classList.remove('hidden'));
        applySpans(originalOrder);
      } else {
        const visible = [];
        originalOrder.forEach((item) => {
          if (item.dataset.cat === f) { item.classList.remove('hidden'); visible.push(item); }
          else { item.classList.add('hidden'); }
        });
        applySpans(visible);
      }
    }

    // Filtre initial : celui de l'URL s'il désigne une catégorie connue, sinon
    // « all ». On ne réécrit pas l'URL au chargement (`url: false`), sinon un
    // `?cat=` erroné disparaîtrait sans que le visiteur comprenne pourquoi.
    const voulu = new URLSearchParams(window.location.search).get('cat');
    const connu = voulu && [...buttons].some((b) => b.dataset.filter === voulu);
    applyFilter(connu ? voulu : 'all', { url: false });
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
    });
    if (select) {
      select.addEventListener('change', () => applyFilter(select.value));
    }
  }

  // ── Contact form (POST /api/contact -> Resend, honeypot + délai anti-bot) ─
  // Présent sur les pages Portfolio et About - indépendant de la grille.
  if (contactForm) {
    // Jeton horodaté signé par le serveur (voir api/_lib/form-token.js). Le
    // délai anti-bot est désormais vérifié côté serveur, qui ne peut pas se
    // fier à une horloge cliente. Il est demandé à la première interaction
    // avec le formulaire, pas au chargement : inutile d'invoquer une fonction
    // pour un visiteur qui ne remplira rien, ni pour un robot d'indexation.
    const formDone = document.getElementById('formDone');
    const formAgain = document.getElementById('formAgain');
    const formError = document.getElementById('formError');

    if (formAgain && formDone) {
      formAgain.addEventListener('click', () => {
        formDone.hidden = true;
        contactForm.hidden = false;
        const premier = contactForm.querySelector('#first-name');
        if (premier) premier.focus();
      });
    }

    let formToken = null;
    let tokenAt = 0;
    let tokenRequest = null;

    function ensureToken() {
      if (formToken) return Promise.resolve(formToken);
      if (tokenRequest) return tokenRequest;
      tokenRequest = fetch('/api/form-token')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          formToken = data && data.token;
          tokenAt = Date.now();
          return formToken;
        })
        .catch(() => null)
        .finally(() => { tokenRequest = null; });
      return tokenRequest;
    }

    // Turnstile, chargé à la demande lui aussi. Le script partait jusqu'ici
    // avec la page - donc sur les 62 fiches projet, la page À propos et le
    // portfolio, soit 68 pages sur 75 : sept requêtes vers Cloudflare, et
    // l'adresse IP du visiteur, pour un formulaire situé tout en bas que la
    // plupart ne touchent jamais. Il part maintenant au premier contact avec
    // le formulaire, exactement là où le jeton est déjà demandé.
    //
    // Rien à appeler pour le rendu : le script cherche `.cf-turnstile` au
    // chargement et s'installe tout seul, quel que soit le moment où il
    // arrive. `waitForCaptcha` couvre déjà le délai de résolution.
    //
    // Effet de bord voulu : la politique de confidentialité affirme que
    // Cloudflare reçoit l'IP « du formulaire de contact ». C'est désormais
    // vrai à la lettre - seul quelqu'un qui écrit déclenche le transfert.
    let captchaRequested = false;
    function ensureCaptcha() {
      if (captchaRequested || !contactForm.querySelector('.cf-turnstile')) return;
      captchaRequested = true;
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true;
      document.head.appendChild(s);
    }

    contactForm.addEventListener(
      'focusin',
      () => {
        ensureToken();
        ensureCaptcha();
      },
      { once: true }
    );

    /**
     * Attend que Turnstile ait rempli son champ caché, au plus `limit` ms.
     * Le widget résout en général en moins d'une seconde, largement couvert
     * par le délai anti-bot ; cette attente ne sert que sur connexion lente,
     * où l'on préfère patienter un peu plutôt que d'essuyer un refus.
     * Sans widget (captcha désactivé), retourne immédiatement.
     */
    function waitForCaptcha(limit = 5000) {
      if (!contactForm.querySelector('.cf-turnstile')) return Promise.resolve();
      const filled = () => {
        const f = contactForm.querySelector('[name="cf-turnstile-response"]');
        return f && f.value;
      };
      if (filled()) return Promise.resolve();
      const start = Date.now();
      return new Promise((resolve) => {
        const tick = setInterval(() => {
          if (filled() || Date.now() - start > limit) {
            clearInterval(tick);
            resolve();
          }
        }, 150);
      });
    }

    /**
     * Un envoi complet : jeton, délai anti-bot, captcha, POST.
     *
     * Le jeton vaut deux heures. Quelqu'un qui commençait un message,
     * s'interrompait puis revenait lisait « Ce formulaire a expiré. Rechargez
     * la page », et le rechargement vidait les champs. Sur `bad-token`, on
     * jette le jeton, on en demande un neuf et on renvoie une fois, sans rien
     * demander au visiteur. Le captcha n'a pas été consommé : le serveur
     * vérifie le jeton avant de l'interroger.
     */
    async function send(form) {
      for (let attempt = 0; ; attempt++) {
        await ensureToken();
        // Le décompte part du jeton et non du chargement de la page : c'est
        // son horodatage que le serveur vérifie. `ensureToken` couvre aussi le
        // cas où la première demande a échoué (réseau), en réessayant ici.
        const wait = Math.max(0, 3000 - (Date.now() - (tokenAt || formLoadTime)));
        await new Promise((resolve) => setTimeout(resolve, wait));
        await waitForCaptcha();
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Les champs sont relus MAINTENANT et non au clic : Turnstile
          // remplit son champ caché pendant le délai anti-bot, un instantané
          // pris plus tôt l'aurait perdu et le serveur aurait refusé l'envoi.
          body: JSON.stringify({
            ...Object.fromEntries(new FormData(form).entries()),
            formToken,
          }),
        });
        if (res.ok) {
          // Jeton à usage unique côté serveur : le prochain message en
          // demandera un neuf au lieu d'essuyer un refus puis de réessayer.
          formToken = null;
          return;
        }
        // Le serveur nomme la cause, et parfois le champ : on les lit avant
        // de lever.
        const data = await res.json().catch(() => null);
        if (data && data.code === 'bad-token' && attempt === 0) {
          formToken = null;
          continue;
        }
        const err = new Error(`HTTP ${res.status}`);
        err.code = data && data.code;
        err.field = data && data.field;
        err.max = data && data.max;
        throw err;
      }
    }

    const fieldError = document.getElementById('fieldError');

    /** aria-describedby d'un champ, avec ou sans le message d'erreur. */
    function describedBy(field, withError) {
      const ids = (field.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((id) => id && id !== 'fieldError');
      if (withError) ids.push('fieldError');
      return ids.join(' ');
    }

    /** Message nommant le champ fautif, ou null si le serveur n'en nomme pas. */
    function fieldMessage(err, field) {
      if (!err || !field) return null;
      const labelEl = contactForm.querySelector(`label[for="${field.id}"]`);
      // Premier nœud texte seulement : « Message (facultatif) » ne doit pas
      // donner « Message (facultatif) : 5 000 caractères maximum ».
      const label = labelEl && labelEl.firstChild && labelEl.firstChild.textContent.trim();
      if (!label) return null;
      if (err.code === 'too-long' && err.max) {
        return FIELD_ERRORS['too-long'](label, Number(err.max).toLocaleString(lang));
      }
      if (err.code === 'invalid-fields') {
        return field.name === 'email' && field.value.trim() ? FIELD_ERRORS.email : FIELD_ERRORS.missing(label);
      }
      return null;
    }

    function clearField(el) {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-errormessage');
      const rest = describedBy(el, false);
      if (rest) el.setAttribute('aria-describedby', rest);
      else el.removeAttribute('aria-describedby');
    }
    function clearInvalid() {
      contactForm.querySelectorAll('[aria-invalid]').forEach(clearField);
      if (fieldError) fieldError.hidden = true;
    }
    contactForm.addEventListener('input', (e) => {
      const el = e.target;
      if (el instanceof Element && el.hasAttribute('aria-invalid')) {
        clearField(el);
        if (fieldError) fieldError.hidden = true;
      }
    });

    // Compteur du message, affiché passé 80 % de la limite. `maxlength`
    // empêche déjà de la dépasser ; sans compteur, le texte s'arrêtait
    // simplement de s'écrire, sans explication.
    const messageField = contactForm.querySelector('#message');
    const messageCount = document.getElementById('messageCount');
    function updateCount() {
      if (!messageField || !messageCount) return;
      const max = Number(messageCount.dataset.max);
      const n = messageField.value.length;
      messageCount.hidden = n < max * 0.8;
      messageCount.textContent = `${n.toLocaleString(lang)} / ${max.toLocaleString(lang)}`;
      messageCount.classList.toggle('is-full', n >= max);
    }
    if (messageField) messageField.addEventListener('input', updateCount);

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Filet : un envoi sans qu'aucun champ n'ait jamais reçu le focus est
      // improbable (les champs sont obligatoires), mais le captcha ne doit
      // pas manquer pour autant.
      ensureCaptcha();

      const form = e.target;
      const btn = form.querySelector('.form-submit');
      const originalHTML = btn.innerHTML;

      btn.innerHTML = FORM_LABELS.sending;
      btn.disabled = true;
      btn.classList.remove('is-success', 'is-error');
      if (formError) formError.hidden = true;
      // Le libellé du bouton est visuel uniquement (innerHTML) : cette région
      // aria-live annonce le même statut aux lecteurs d'écran.
      if (formStatus) formStatus.textContent = FORM_LABELS.sending;

      // Délai anti-bot : l'envoi est DIFFÉRÉ jusqu'aux 3 secondes, il n'est
      // plus annulé. L'ancienne version faisait `return` en silence - clic sur
      // « Envoyer », rien ne bouge, aucun message. Ça ne gênait pas les bots,
      // qui postent directement sur l'API, et ça pénalisait l'humain le plus
      // motivé : celui qui arrive avec son texte déjà prêt. Le contrôle reste
      // actif, le visiteur voit simplement « Envoi… » un instant de plus.
      clearInvalid();
      send(form)
        .then(() => {
          form.reset();
          updateCount();
          // Confirmation persistante à la place du formulaire, plutôt qu'un
          // libellé de bouton effacé au bout de quatre secondes.
          if (formDone) {
            form.hidden = true;
            formDone.hidden = false;
            // Le focus suit, sinon un utilisateur au clavier ou de lecteur
            // d'écran reste posé sur un bouton qui vient de disparaître.
            formDone.focus();
          }
          if (formStatus) formStatus.textContent = FORM_LABELS.sent;
        })
        .catch((err) => {
          const field = err && err.field ? form.querySelector(`[name="${err.field}"]`) : null;
          const specific = fieldMessage(err, field);
          const message = specific || (err && FORM_ERRORS[err.code]) || FORM_LABELS.error;
          if (field && specific && fieldError) {
            // Message posé SOUS le champ et relié à lui : un lecteur d'écran
            // le lit en arrivant sur le champ, pas seulement une fois en bas
            // du formulaire (WCAG 3.3.1).
            field.after(fieldError);
            fieldError.textContent = message;
            fieldError.hidden = false;
            field.setAttribute('aria-invalid', 'true');
            field.setAttribute('aria-errormessage', 'fieldError');
            field.setAttribute('aria-describedby', describedBy(field, true));
          } else if (field) {
            field.setAttribute('aria-invalid', 'true');
          }
          btn.innerHTML = FORM_LABELS.error;
          btn.classList.add('is-error');
          // Le détail va dans la région annoncée ET sous le formulaire : le
          // bouton est trop étroit pour « Vérifiez les champs obligatoires ».
          if (formStatus) formStatus.textContent = message;
          if (formError && !(field && specific)) {
            formError.textContent = message;
            formError.hidden = false;
          }
          // Le focus va au champ à corriger : c'est là que se trouve la suite.
          if (field) field.focus();
        })
        .finally(() => {
          // Un jeton Turnstile ne vaut qu'un envoi : Cloudflare refuse le second
          // appel (`timeout-or-duplicate`). Or le champ caché survit à
          // `form.reset()` et le widget reste résolu à l'écran : sans ce
          // réarmement, un visiteur qui écrit un deuxième message sans recharger
          // la page repostait le jeton mort et se heurtait à un refus qu'aucun
          // élément de l'interface n'expliquait. Un formulaire posté nativement
          // repart d'un widget neuf ; ici l'envoi passe par fetch(), donc c'est
          // à nous de le faire. Vaut aussi après un échec : le jeton a été
          // consommé ou refusé dans les deux cas.
          try {
            window.turnstile?.reset();
          } catch { /* widget pas encore rendu : le prochain envoi l'attendra */ }
          setTimeout(() => {
            // Rien à rétablir si la confirmation a pris la place du formulaire.
            if (formDone && !formDone.hidden) return;
            btn.innerHTML = originalHTML;
            btn.classList.remove('is-success', 'is-error');
            btn.disabled = false;
            if (formStatus) formStatus.textContent = '';
          }, 4000);
        });
    });
  }

  // Le lien email est une ancre <a href="/api/email"> : la redirection
  // server-side (302 -> mailto:) est gérée nativement par le navigateur,
  // sans JS, ce qui rend le lien plus robuste (clic milieu, menu contextuel…).
  //
  // Bouton « Copier » à côté de l'adresse écrite : montré seulement si le
  // presse-papiers est disponible (contexte sécurisé), sinon l'adresse reste
  // sélectionnable à la main.
  // Même principe sur les fiches projet : copier l'adresse canonique de la
  // page, pour l'envoyer à une production sans passer par la barre d'adresse.
  const copyLink = document.getElementById('copyLink');
  const canonical = document.querySelector('link[rel="canonical"]');
  if (copyLink && navigator.clipboard) {
    copyLink.hidden = false;
    const label = copyLink.textContent;
    let resetTimer = null;
    copyLink.addEventListener('click', () => {
      navigator.clipboard
        .writeText(canonical ? canonical.href : window.location.href)
        .then(() => {
          copyLink.textContent = copyLink.dataset.copied;
          clearTimeout(resetTimer);
          resetTimer = setTimeout(() => { copyLink.textContent = label; }, 2000);
        })
        .catch(() => { /* refus du navigateur : l'adresse reste dans la barre */ });
    });
  }

  const copyEmail = document.getElementById('copyEmail');
  const contactAddress = document.getElementById('contactAddress');
  if (copyEmail && contactAddress && navigator.clipboard) {
    copyEmail.hidden = false;
    const label = copyEmail.textContent;
    let resetTimer = null;
    copyEmail.addEventListener('click', () => {
      navigator.clipboard
        .writeText(contactAddress.textContent.trim())
        .then(() => {
          copyEmail.textContent = copyEmail.dataset.copied;
          if (formStatus) formStatus.textContent = copyEmail.dataset.copied;
          clearTimeout(resetTimer);
          resetTimer = setTimeout(() => { copyEmail.textContent = label; }, 2000);
        })
        .catch(() => { /* refus du navigateur : l'adresse reste lisible */ });
    });
  }
})();
