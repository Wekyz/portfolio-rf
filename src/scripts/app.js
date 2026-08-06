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
      const params = new URLSearchParams({ autoplay: '1', color: 'ffffff', title: '0', byline: '0' });
      if (hash) params.set('h', hash);
      lightboxFrame.src = `https://player.vimeo.com/video/${id}?${params}`;
      fillInfo(item);
      lightboxEl.classList.add('open', 'loading'); // 'loading' : affiche le spinner
      document.body.style.overflow = 'hidden';
      lightboxClose.focus();
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
    function closeLightbox() {
      lightboxEl.classList.remove('open');
      lightboxFrame.src = '';
      document.body.style.overflow = '';
      currentItem = null;
      // Rend le focus à la vignette qui a ouvert la modale (a11y).
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
      lastFocused = null;
    }
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxEl.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
      if (!lightboxEl.classList.contains('open')) return;
      if (e.key === 'Escape') { closeLightbox(); return; }
      // Flèches : enchaîner les projets sans fermer la modale. Ignorées quand
      // le focus est dans le lecteur, où Vimeo s'en sert pour la lecture.
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && document.activeElement !== lightboxFrame) {
        e.preventDefault();
        step(e.key === 'ArrowLeft' ? -1 : 1);
        return;
      }
      // Piège à focus : maintient la tabulation à l'intérieur de la modale.
      if (e.key === 'Tab') {
        const focusables = [lightboxClose, lightboxPrev, lightboxNext, lightboxFrame].filter(
          (el) => !el.hidden
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
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

    function applyFilter(f) {
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

    applyFilter('all');
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

    contactForm.addEventListener('focusin', ensureToken, { once: true });

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const form = e.target;
      const btn = form.querySelector('.form-submit');
      const originalHTML = btn.innerHTML;
      const payload = Object.fromEntries(new FormData(form).entries());

      btn.innerHTML = FORM_LABELS.sending;
      btn.disabled = true;
      btn.classList.remove('is-success', 'is-error');
      // Le libellé du bouton est visuel uniquement (innerHTML) : cette région
      // aria-live annonce le même statut aux lecteurs d'écran.
      if (formStatus) formStatus.textContent = FORM_LABELS.sending;

      // Délai anti-bot : l'envoi est DIFFÉRÉ jusqu'aux 3 secondes, il n'est
      // plus annulé. L'ancienne version faisait `return` en silence - clic sur
      // « Envoyer », rien ne bouge, aucun message. Ça ne gênait pas les bots,
      // qui postent directement sur l'API, et ça pénalisait l'humain le plus
      // motivé : celui qui arrive avec son texte déjà prêt. Le contrôle reste
      // actif, le visiteur voit simplement « Envoi… » un instant de plus.
      //
      // Le décompte part du jeton et non du chargement de la page : c'est son
      // horodatage que le serveur vérifie. `ensureToken` couvre aussi le cas
      // où la première demande a échoué (réseau), en réessayant à l'envoi.
      ensureToken()
        .then(() => {
          const from = tokenAt || formLoadTime;
          const wait = Math.max(0, 3000 - (Date.now() - from));
          return new Promise((resolve) => setTimeout(resolve, wait));
        })
        .then(() =>
          fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, formToken }),
          })
        )
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          btn.innerHTML = FORM_LABELS.sent;
          btn.classList.add('is-success');
          if (formStatus) formStatus.textContent = FORM_LABELS.sent;
          form.reset();
        })
        .catch(() => {
          btn.innerHTML = FORM_LABELS.error;
          btn.classList.add('is-error');
          if (formStatus) formStatus.textContent = FORM_LABELS.error;
        })
        .finally(() => {
          setTimeout(() => {
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
})();
