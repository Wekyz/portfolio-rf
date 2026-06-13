/* ============================================================
   Roxane Foare — Portfolio (Astro)
   Logique client : clic vignettes, filtres, lightbox, formulaire, email.
   La grille est désormais rendue au build ; ce script ne fait plus de fetch
   ni de construction du DOM — il ajoute l'interactivité par-dessus.
   ============================================================ */
import { applySpans } from '../lib/spans.js';

(() => {
  'use strict';

  const grid = document.getElementById('workGrid');
  const lightboxEl = document.getElementById('lightbox');
  const lightboxFrame = document.getElementById('lightboxFrame');
  const lightboxClose = document.getElementById('lightboxClose');
  const emailLink = document.getElementById('email-link');
  const contactForm = document.querySelector('.contact-form');
  const formLoadTime = Date.now();

  if (!grid) return;

  const originalOrder = Array.from(grid.querySelectorAll('.work-item'));

  // ── Lightbox ────────────────────────────────────────────────
  function openLightbox(vimeoId, hash) {
    const params = new URLSearchParams({ autoplay: '1', color: 'ffffff', title: '0', byline: '0' });
    if (hash) params.set('h', hash);
    lightboxFrame.src = `https://player.vimeo.com/video/${vimeoId}?${params}`;
    lightboxEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  }
  function closeLightbox() {
    lightboxEl.classList.remove('open');
    lightboxFrame.src = '';
    document.body.style.overflow = '';
  }
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxEl.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxEl.classList.contains('open')) closeLightbox();
  });

  // ── Clic sur une vignette ───────────────────────────────────
  originalOrder.forEach((item) => {
    const btn = item.querySelector('button.work-thumb-wrap');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const { external, id, hash } = item.dataset;
      if (external) {
        window.open(external, '_blank', 'noopener,noreferrer');
      } else if (id) {
        openLightbox(id, hash || '');
      }
    });
  });

  // ── Filtres ─────────────────────────────────────────────────
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach((btn) => {
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const wasActive = btn.classList.contains('active');
      buttons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });

      if (wasActive) {
        originalOrder.forEach((item) => item.classList.remove('hidden'));
        applySpans(originalOrder);
      } else {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        const f = btn.dataset.filter;
        const visible = [];
        originalOrder.forEach((item) => {
          if (item.dataset.cat === f) { item.classList.remove('hidden'); visible.push(item); }
          else { item.classList.add('hidden'); }
        });
        applySpans(visible);
      }
    });
  });

  // ── Contact form (Netlify Forms + honeypot + délai anti-bot) ─
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (Date.now() - formLoadTime < 3000) return; // soumission trop rapide => bot

      const form = e.target;
      const btn = form.querySelector('.form-submit');
      const originalHTML = btn.innerHTML;
      const encoded = new URLSearchParams(new FormData(form)).toString();

      btn.innerHTML = 'Sending…';
      btn.disabled = true;
      btn.classList.remove('is-success', 'is-error');

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encoded,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          btn.innerHTML = 'Sent ✓';
          btn.classList.add('is-success');
          form.reset();
        })
        .catch(() => {
          btn.innerHTML = 'Error — try again';
          btn.classList.add('is-error');
        })
        .finally(() => {
          setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('is-success', 'is-error');
            btn.disabled = false;
          }, 4000);
        });
    });
  }

  // ── Email link : redirection via Netlify Function (server-side) ─
  if (emailLink) {
    emailLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '/api/email';
    });
  }
})();
