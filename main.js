// Riya Invites — shared front-end behaviour
// Note: cart state below is in-memory only (resets on refresh) for this
// prototype. In production, wire this to Stripe Checkout sessions and/or
// a small serverless function so the cart persists and payment is real.

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Simple in-memory cart shared across the page (resets on navigation —
  // placeholder behaviour until real checkout/session logic is added).
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
