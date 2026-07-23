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

  // ── Retour en haut (Portfolio / About) ────────────────────────
  if (backToTop) {
    const toggle = () => backToTop.classList.toggle('visible', window.scrollY > 600);
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
    let lastFocused = null; // élément déclencheur, pour y revenir à la fermeture

    function openLightbox(vimeoId, hash) {
      lastFocused = document.activeElement;
      const params = new URLSearchParams({ autoplay: '1', color: 'ffffff', title: '0', byline: '0' });
      if (hash) params.set('h', hash);
      lightboxFrame.src = `https://player.vimeo.com/video/${vimeoId}?${params}`;
      lightboxEl.classList.add('open', 'loading'); // 'loading' : affiche le spinner
      document.body.style.overflow = 'hidden';
      lightboxClose.focus();
    }
    // Le player Vimeo a fini de charger -> on masque le spinner.
    lightboxFrame.addEventListener('load', () => lightboxEl.classList.remove('loading'));
    function closeLightbox() {
      lightboxEl.classList.remove('open');
      lightboxFrame.src = '';
      document.body.style.overflow = '';
      // Rend le focus à la vignette qui a ouvert la modale (a11y).
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
      lastFocused = null;
    }
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxEl.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
      if (!lightboxEl.classList.contains('open')) return;
      if (e.key === 'Escape') { closeLightbox(); return; }
      // Piège à focus : maintient la tabulation à l'intérieur de la modale.
      if (e.key === 'Tab') {
        const focusables = [lightboxClose, lightboxFrame];
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
    originalOrder.forEach((item) => {
      const btn = item.querySelector('button.work-thumb-wrap');
      if (!btn) return;
      btn.addEventListener('click', () => {
        const { external, id, hash } = item.dataset;
        // N'ouvre que des URL http(s) - empêche un schéma type `javascript:`
        // de s'exécuter via window.open si une donnée du CMS était malformée.
        if (external && /^https?:\/\//i.test(external)) {
          window.open(external, '_blank', 'noopener,noreferrer');
        } else if (id) {
          openLightbox(id, hash || '');
        }
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
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (Date.now() - formLoadTime < 3000) return; // soumission trop rapide => bot

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

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
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
