/* ============================================================
   Roxane Foare — Portfolio
   App logic : grid, filters, lightbox, contact form, email link
   ============================================================ */
(() => {
  'use strict';

  // ── Constantes ──────────────────────────────────────────────
  const CAT_LABELS = {
    film:   'Feature Film',
    pub:    'Commercial',
    doc:    'Documentary',
    corpo:  'Corporate',
    clip:   'Music Video',
    event:  'Event',
    teaser: 'Teaser',
    live:   'Live'
  };
  const SPANS = [8, 4, 4, 8];

  const grid             = document.getElementById('workGrid');
  const lightboxEl       = document.getElementById('lightbox');
  const lightboxFrame    = document.getElementById('lightboxFrame');
  const lightboxClose    = document.getElementById('lightboxClose');
  const emailLink        = document.getElementById('email-link');
  const contactForm      = document.querySelector('.contact-form');
  const formLoadTime     = Date.now();
  let   originalOrder    = [];

  // ── SVG snippets ────────────────────────────────────────────
  const SVG_PLAY = `
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
      <path d="M1 1L13 8L1 15V1Z" fill="white"/>
    </svg>`;
  const SVG_EXT = `
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M7 3H3a1 1 0 00-1 1v11a1 1 0 001 1h11a1 1 0 001-1v-4M10 2h6v6M15 3l-7 7"
            stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  // ── Construction d'une vignette ─────────────────────────────
  function buildItem(p) {
    const wrapper = document.createElement('div');
    wrapper.className     = 'work-item';
    wrapper.dataset.cat       = p.cat;
    wrapper.dataset.id        = p.id || '';
    wrapper.dataset.hash      = p.hash || '';
    wrapper.dataset.fullWidth = p.fullWidth ? 'true' : '';
    wrapper.dataset.portrait  = p.portrait  ? 'true' : '';

    // Élément cliquable : <button> si interactif, <div> sinon (live)
    const interactive = !p.noClick && (p.id || p.externalLink);
    const tag         = interactive ? 'button' : 'div';
    const inner       = document.createElement(tag);
    inner.className   = 'work-thumb-wrap';
    if (interactive) {
      inner.type        = 'button';
      inner.setAttribute('aria-label', `Watch — ${p.title}`);
    }

    // Image (avec dimensions par défaut pour éviter le CLS)
    if (p.thumb) {
      const img = document.createElement('img');
      img.className = 'work-thumb';
      img.src       = p.thumb;
      img.alt       = p.title;
      img.loading   = 'lazy';
      img.decoding  = 'async';
      img.width     = p.portrait ? 600  : 1280;
      img.height    = p.portrait ? 900  : 800;
      inner.appendChild(img);
    }

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'work-overlay';
    overlay.innerHTML = `
      <div class="work-play">${p.externalLink ? SVG_EXT : SVG_PLAY}</div>
      <div class="work-info">
        <div class="work-title"></div>
        <div class="work-meta"><span class="work-prod"></span></div>
        ${p.externalLink ? '<span class="work-badge">Watch &rarr;</span>' : ''}
      </div>`;
    overlay.querySelector('.work-title').textContent = p.title;
    overlay.querySelector('.work-prod').textContent  = p.credit || CAT_LABELS[p.cat] || p.cat;
    inner.appendChild(overlay);

    wrapper.appendChild(inner);

    if (interactive) {
      inner.addEventListener('click', () => {
        if (p.externalLink) {
          window.open(p.externalLink, '_blank', 'noopener,noreferrer');
        } else if (p.id) {
          openLightbox(p.id, p.hash || '');
        }
      });
    }
    return wrapper;
  }

  // ── Application du pattern de grille ────────────────────────
  function applySpans(items) {
    let patternIndex = 0;
    let lastCat      = null;

    items.forEach(item => {
      if (item.dataset.fullWidth === 'true') {
        item.style.gridColumn = '1 / span 12';
        patternIndex = 0;
        lastCat      = item.dataset.cat;
        return;
      }
      if (item.dataset.portrait === 'true') {
        item.style.gridColumn = '5 / span 4';
        patternIndex = 0;
        lastCat      = item.dataset.cat;
        return;
      }
      if (item.dataset.cat === 'live') {
        item.style.gridColumn = 'span 6';
        patternIndex = 0;
        lastCat      = 'live';
        return;
      }
      // Pattern 8 / 4 / 4 / 8 — reset au changement de catégorie
      if (item.dataset.cat !== lastCat) {
        patternIndex = 0;
      }
      item.style.gridColumn = `span ${SPANS[patternIndex % SPANS.length]}`;
      patternIndex++;
      lastCat = item.dataset.cat;
    });
  }

  // ── Filtres ─────────────────────────────────────────────────
  function initFilters() {
    const buttons = document.querySelectorAll('.filter-btn');

    buttons.forEach(btn => {
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        const wasActive = btn.classList.contains('active');
        buttons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });

        if (wasActive) {
          // Reset : on rend tout visible, sans toucher au DOM (l'ordre est préservé)
          originalOrder.forEach(item => item.classList.remove('hidden'));
          applySpans(originalOrder);
        } else {
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          const f = btn.dataset.filter;
          const visible = [];
          originalOrder.forEach(item => {
            if (item.dataset.cat === f) { item.classList.remove('hidden'); visible.push(item); }
            else                         { item.classList.add('hidden'); }
          });
          applySpans(visible);
        }
      });
    });
  }

  // ── Chargement des vidéos ───────────────────────────────────
  fetch('videos.json')
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      const projects = data.videos || data;
      const fragment = document.createDocumentFragment();
      projects.forEach(p => {
        const el = buildItem(p);
        fragment.appendChild(el);
        originalOrder.push(el);
      });
      grid.appendChild(fragment);
      applySpans(originalOrder);
      initFilters();
    })
    .catch(err => {
      console.error('Impossible de charger videos.json :', err);
      grid.innerHTML = '<p style="grid-column:1/-1;padding:24px;color:var(--gray-dark);font-family:var(--font-hennessy)">Sorry, the projects could not be loaded.</p>';
    });

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
  lightboxEl.addEventListener('click', e => { if (e.target === e.currentTarget) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightboxEl.classList.contains('open')) closeLightbox();
  });

  // ── Contact form (Netlify Forms + honeypot + délai anti-bot) ─
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      if (Date.now() - formLoadTime < 3000) return; // soumission trop rapide => bot

      const form = e.target;
      const btn  = form.querySelector('.form-submit');
      const originalHTML = btn.innerHTML;
      const encoded = new URLSearchParams(new FormData(form)).toString();

      btn.innerHTML = 'Sending…';
      btn.disabled  = true;
      btn.classList.remove('is-success', 'is-error');

      fetch('/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    encoded
      })
        .then(res => {
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
    emailLink.addEventListener('click', e => {
      e.preventDefault();
      window.location.href = '/api/email';
    });
  }
})();
