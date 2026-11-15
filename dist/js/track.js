/* Small consent-aware event layer. A click is never reported as a Lead. */
(() => {
  'use strict';
  const allowed = new Set(['product_view', 'demo_interaction', 'pain_select', 'cta_click', 'whatsapp_exit']);
  function track(event, values = {}) {
    if (!allowed.has(event)) return false;
    const consent = window.NEXUS.consent.get();
    const payload = {page: location.pathname};
    // Only predefined identifiers; never message text, contact details or query strings.
    for (const key of ['product','origin','pain','demo','step','action']) {
      if (typeof values[key] === 'string') payload[key] = values[key].slice(0,80);
    }
    if (consent.measurement) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({event, ...payload});
    }
    if (consent.marketing && typeof window.fbq === 'function') window.fbq('trackCustom', event, payload);
    return consent.measurement || consent.marketing;
  }
  window.NEXUS.track = track;
  document.addEventListener('click', event => {
    const cta = event.target.closest('[data-cta-origin]');
    if (!cta) return;
    const product = cta.dataset.product || document.body.dataset.product || '';
    const values = {origin: cta.dataset.ctaOrigin, product: ({lf:'linha-de-frente', bd:'balcao-digital'})[product] || product};
    track('cta_click', values);
    if (cta.dataset.contact === 'whatsapp') track('whatsapp_exit', values);
  });
  const products = Array.from(document.querySelectorAll('[data-product-view]'));
  const seen = new Map();
  const visible = new Set();
  function record(el) {
    const consent = window.NEXUS.consent.get();
    const previous = seen.get(el) || {};
    const product = el.dataset.productView;
    // Each destination receives its own first view after its corresponding opt-in.
    const measurement = consent.measurement && !previous.measurement;
    const marketing = consent.marketing && !previous.marketing;
    if (!measurement && !marketing) return;
    const payload = {page: location.pathname, product};
    if (measurement) { window.dataLayer = window.dataLayer || []; window.dataLayer.push({event:'product_view', ...payload}); }
    if (marketing && typeof window.fbq === 'function') window.fbq('trackCustom','product_view',payload);
    seen.set(el, {measurement: previous.measurement || measurement, marketing: previous.marketing || marketing});
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { visible.add(entry.target); record(entry.target); } else visible.delete(entry.target); });
    }, {threshold: 0.1});
    products.forEach(el => observer.observe(el));
  } else products.forEach(el => { visible.add(el); record(el); });
  window.addEventListener('nexus:consent', () => visible.forEach(record));
})();
