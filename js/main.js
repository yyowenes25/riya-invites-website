// Riya Invites — shared front-end behaviour
// Note: cart state below is in-memory only (resets on refresh) for this
// prototype. In production, wire this to Stripe Checkout sessions and/or
// a small serverless function so the cart persists and payment is real.

// ---- CMS-driven content loading ----
// Pulls from /content/*.json (edited via the /admin CMS panel). Falls back
// silently to the static placeholder markup already in the HTML if a file
// is missing or empty, so the site never breaks before content is added.

async function loadJSON(path) {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function applySettings() {
  const settings = await loadJSON('/content/settings.json');
  if (!settings) return;
  if (settings.logoUrl) {
    document.querySelectorAll('.logo').forEach((el) => {
      el.innerHTML = `<img src="${settings.logoUrl}" alt="Riya Invites" style="height:4.5rem; display:block;">`;
    });
  }
  if (settings.tagline) {
    const heroTag = document.getElementById('heroTagline');
    if (heroTag) heroTag.textContent = settings.tagline;
  }
}

async function applyPricing() {
  const pricing = await loadJSON('/content/pricing.json');
  if (!pricing) return;
  const map = { minimalist: 'price-minimalist', standard: 'price-standard', custom: 'price-custom' };
  Object.entries(map).forEach(([key, id]) => {
    const data = pricing[key];
    if (!data) return;
    document.querySelectorAll(`[data-price-id="${id}"]`).forEach((el) => {
      const was = data.originalPrice ? `<span class="was">RM${data.originalPrice}</span>` : '';
      el.innerHTML = `${was}RM${data.price}`;
    });
    if (data.previewVideo) {
      document.querySelectorAll(`[data-video-id="${id}"]`).forEach((el) => {
        const placeholder = el.querySelector('.placeholder-label');
        if (placeholder) placeholder.style.display = 'none';
        if (!el.querySelector('video')) {
          const videoEl = document.createElement('video');
          videoEl.src = data.previewVideo;
          videoEl.autoplay = true;
          videoEl.muted = true;
          videoEl.loop = true;
          videoEl.playsInline = true;
          videoEl.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:1;';
          el.appendChild(videoEl);
        }
      });
    }
  });
}

async function applyTestimonials() {
  const container = document.getElementById('testimonialsContainer');
  if (!container) return;
  const data = await loadJSON('/content/testimonials/index.json');
  const items = data && Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return;
  container.innerHTML = items.map((t) => `
    <div class="quote-card">
      <p class="quote-text">"${t.quote}"</p>
      <p class="quote-attr">${t.name}</p>
    </div>
  `).join('');
}

async function applyGallery() {
  const container = document.getElementById('galleryContainer');
  if (!container) return;
  const data = await loadJSON('/content/gallery/index.json');
  const items = data && Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return;
  container.innerHTML = items.map((g) => `
    <div class="gallery-item" style="background-image:url('${g.image}'); background-size:cover; background-position:center;">
      ${g.caption ? `<span style="background:rgba(0,0,0,0.4); padding:0.3em 0.6em; font-size:0.8rem;">${g.caption}</span>` : ''}
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  applySettings();
  applyPricing();
  applyTestimonials();
  applyGallery();

  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  window.riyaCart = window.riyaCart || [];

  document.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name || 'Item';
      window.riyaCart.push(name);
      const countEl = document.getElementById('cartCount');
      if (countEl) countEl.textContent = window.riyaCart.length;
      btn.textContent = 'Added ✓';
      setTimeout(() => { btn.textContent = btn.dataset.label || 'Add to Cart'; }, 1400);
    });
  });

  const form = document.getElementById('inquiryForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = document.getElementById('formStatus');
      if (status) {
        status.textContent = 'Thank you — this is a placeholder confirmation. Connect this form to Netlify Forms or Stripe to go live.';
        status.style.display = 'block';
      }
      form.reset();
    });
  }
});
