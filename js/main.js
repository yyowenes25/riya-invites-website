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
  const map = { minimalistic: 'price-minimalistic', classicCinematic: 'price-classic-cinematic', filmyEdition: 'price-filmy-edition' };
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

// ---- Portfolio tabs ----
// Supports multiple independent tab groups on the same page (e.g. invite
// styles and gift categories both live on the Collections page). Each
// group is scoped by its shared ancestor with class "tab-group".
function initPortfolioTabs() {
  const groups = document.querySelectorAll('.tab-group');
  const scopes = groups.length > 0 ? groups : [document]; // fall back to whole page if no groups wrap tabs

  scopes.forEach((scope) => {
    const tabButtons = scope.querySelectorAll('.portfolio-tab-btn');
    const panels = scope.querySelectorAll('.portfolio-tab-panel');
    if (tabButtons.length === 0) return;

    function activate(tabId) {
      tabButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
      panels.forEach((panel) => {
        panel.classList.toggle('active', panel.id === tabId);
      });
    }

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        activate(btn.dataset.tab);
        history.replaceState(null, '', `#${btn.dataset.tab}`);
      });
    });

    const initial = window.location.hash.replace('#', '');
    const validInitial = Array.from(panels).some((p) => p.id === initial);
    activate(validInitial ? initial : panels[0].id);
  });
}

// ---- Hero slideshow (homepage only) ----
// Reads settings.heroImages (an array of image paths from the CMS). If none
// are set yet, shows a placeholder. If more than one, auto-rotates.
async function applyHeroSlideshow() {
  const container = document.getElementById('heroSlides');
  if (!container) return;
  const settings = await loadJSON('/content/settings.json');
  const images = settings && Array.isArray(settings.heroImages) ? settings.heroImages.filter(Boolean) : [];

  if (images.length === 0) {
    container.innerHTML = `<div class="hero-slide-placeholder"><p>Hero background image placeholder<br>(add via Site Settings → Hero Background Images)</p></div>`;
    return;
  }

  container.innerHTML = images.map((src, i) => `
    <div class="hero-slide${i === 0 ? ' active' : ''}" style="background-image:url('${src}');"></div>
  `).join('');

  if (images.length > 1) {
    let current = 0;
    const slides = container.querySelectorAll('.hero-slide');
    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 5000);
  }
}

// ---- Gift products (dynamic 15-slot catalog, editable via CMS) ----
async function loadGiftProducts() {
  const data = await loadJSON('/content/gifts/index.json');
  return data && Array.isArray(data.products) ? data.products : [];
}

function giftProductCardHTML(product, index) {
  const bg = product.image ? `style="background-image:url('${product.image}');"` : '';
  return `
    <div class="gift-product-card">
      <div class="gift-product-media" ${bg}>
        ${product.image ? '' : '<p class="placeholder-label">Product image<br>placeholder</p>'}
      </div>
      <div class="gift-product-body">
        <h3>${product.title}</h3>
        <p class="price">${product.price ? 'RM' + product.price : 'RM—'}</p>
        <a href="product-detail.html?id=${index}" class="btn btn-outline">Shop Now</a>
      </div>
    </div>
  `;
}

async function applyGiftsGrid() {
  const container = document.getElementById('giftsGrid');
  const emptyState = document.getElementById('giftsEmptyState');
  if (!container) return;
  const products = await loadGiftProducts();
  const visible = products
    .map((p, i) => ({ ...p, _index: i }))
    .filter((p) => p.title && p.title.trim() !== '');

  if (visible.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    container.innerHTML = '';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';
  container.innerHTML = visible.map((p) => giftProductCardHTML(p, p._index)).join('');
}

// Populates the 3 gift-category tabs on the Collections page, filtering the
// same product catalog by category so it stays in sync with the Gifts page.
async function applyGiftCollectionTabs() {
  const categoryMap = {
    'favors-tab': 'Wedding & Engagement Favors',
    'welcome-board-tab': 'Custom Welcome Board',
    'loved-ones-tab': 'Gifts for Loved Ones',
  };
  const anyContainer = document.getElementById('favors-tab');
  if (!anyContainer) return;

  const products = await loadGiftProducts();
  const withIndex = products.map((p, i) => ({ ...p, _index: i })).filter((p) => p.title && p.title.trim() !== '');

  Object.entries(categoryMap).forEach(([panelId, categoryName]) => {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const grid = panel.querySelector('.gift-category-grid');
    const empty = panel.querySelector('.gift-category-empty');
    const matches = withIndex.filter((p) => p.category === categoryName);
    if (matches.length === 0) {
      if (grid) grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';
    if (grid) grid.innerHTML = matches.map((p) => giftProductCardHTML(p, p._index)).join('');
  });
}

async function applyTestimonials() {
  const container = document.getElementById('testimonialsContainer');
  if (!container) return;
  const data = await loadJSON('/content/testimonials/index.json');
  const items = data && Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) return; // keep static placeholder markup
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
  if (items.length === 0) return; // keep static placeholder markup
  container.innerHTML = items.map((g) => `
    <div class="gallery-item" style="background-image:url('${g.image}'); background-size:cover; background-position:center;">
      ${g.caption ? `<span style="background:rgba(0,0,0,0.4); padding:0.3em 0.6em; font-size:0.8rem;">${g.caption}</span>` : ''}
    </div>
  `).join('');
}

// ---- Cart (persisted in localStorage so it survives page navigation) ----
// This is a real static multi-page site, so cart state must be saved to the
// browser's storage — an in-memory JS variable would reset on every page load.
const CART_KEY = 'riyaCart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCountBadge();
}

function addToCart(name, price, qty = 1) {
  const cart = getCart();
  const existing = cart.find((i) => i.name === name && i.price === price);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ name, price, qty });
  }
  saveCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function updateCartCountBadge() {
  const countEl = document.getElementById('cartCount');
  if (!countEl) return;
  const total = getCart().reduce((sum, i) => sum + i.qty, 0);
  countEl.textContent = total;
}

// Reads the live, currently-displayed price from the product card this
// button belongs to — so checkout always matches whatever price is showing
// on screen, even if it was changed via the CMS.
function getLivePriceFromButton(btn) {
  const card = btn.closest('.product-card') || btn.closest('.portfolio-item-card');
  if (!card) return null;
  const priceEl = card.querySelector('.product-price') || card.querySelector('.price');
  if (!priceEl) return null;
  const match = priceEl.textContent.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

document.addEventListener('DOMContentLoaded', () => {
  applySettings();
  applyPricing();
  applyHeroSlideshow();
  applyGiftsGrid();
  applyGiftCollectionTabs();
  applyTestimonials();
  applyGallery();
  initPortfolioTabs();
  updateCartCountBadge();

  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  document.querySelectorAll('[data-add-to-cart]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = (btn.dataset.name || 'Item').replace(/\s*\(RM[\d,.]+\)\s*/, '').trim();
      const price = getLivePriceFromButton(btn) || parseFloat((btn.dataset.name || '').match(/RM([\d,.]+)/)?.[1]?.replace(/,/g, '')) || 0;
      addToCart(name, price);
      btn.textContent = 'Added ✓';
      setTimeout(() => { btn.textContent = btn.dataset.label || 'Add to Cart'; }, 1400);
    });
  });

  // Basic client-side validation feedback for the inquiry form (no backend
  // wired yet — connect to Netlify Forms or a serverless function next).
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
