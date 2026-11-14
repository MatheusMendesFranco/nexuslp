/* No third-party resource is requested until an explicit marketing opt-in. */
(() => {
  'use strict';
  const KEY = 'nexus-consent';
  const LEGACY_KEY = 'nexus.consent.v1';
  const VERSION = 1;
  const empty = () => ({version: VERSION, measurement: false, marketing: false});
  function expiresAt(value) {
    const issued = new Date(value.updatedAt);
    const expires = new Date(issued);
    expires.setUTCFullYear(issued.getUTCFullYear() + 1);
    // Twelve calendar months: February 29 expires on February 28 next year.
    if (expires.getUTCMonth() !== issued.getUTCMonth()) expires.setUTCDate(0);
    return expires.getTime();
  }
  function parse(raw) {
    try {
      const value = JSON.parse(raw);
      if (value && value.version === VERSION && typeof value.measurement === 'boolean' &&
          typeof value.marketing === 'boolean' && typeof value.updatedAt === 'string' &&
          Number.isFinite(Date.parse(value.updatedAt)) && Date.parse(value.updatedAt) <= Date.now() &&
          Date.now() < expiresAt(value)) return value;
    } catch (_) { /* Unavailable or invalid storage always defaults to no consent. */ }
    return null;
  }
  let stored;
  try {
    const current = localStorage.getItem(KEY);
    stored = parse(current === null ? localStorage.getItem(LEGACY_KEY) : current);
    // Preserve valid previous choices under the name disclosed in the table.
    if (stored && current === null) {
      try { localStorage.setItem(KEY, JSON.stringify(stored)); localStorage.removeItem(LEGACY_KEY); } catch (_) { /* Keep the original timestamp and in-memory choice. */ }
    }
  } catch (_) { stored = null; }
  let state = stored || empty();
  let pixelStarted = false;
  let previousFocus;
  let toastTimer;
  let expiryTimer;
  const host = document.createElement('div');
  host.className = 'nx-consent';
  host.innerHTML = `
    <section class="nx-cookie-banner" aria-labelledby="cookie-title" hidden>
      <div><h2 id="cookie-title">Sua privacidade</h2>
      <p>Usamos cookies essenciais para o site funcionar. Com a sua permissão, usamos também cookies de medição e marketing (Meta Pixel) para entender como o site é usado e avaliar nossos anúncios. Você escolhe e pode mudar de ideia quando quiser.</p>
      <a href="/privacidade/">Política de Privacidade</a></div>
      <div class="nx-cookie-actions"><button type="button" data-consent="accept">Aceitar todos</button><button type="button" data-consent="reject">Rejeitar não essenciais</button><button type="button" data-consent="configure">Configurar</button></div>
    </section>
    <dialog class="nx-cookie-dialog" aria-labelledby="preferences-title" aria-describedby="preferences-intro">
      <div class="nx-cookie-dialog-head"><h2 id="preferences-title">Preferências de cookies</h2><button type="button" data-consent="close" aria-label="Fechar preferências de cookies">Fechar</button></div>
      <p id="preferences-intro">Você escolhe e pode mudar de ideia quando quiser.</p>
      <div class="nx-cookie-option"><h3>Essenciais · sempre ativos</h3><p>Necessários para o funcionamento e a segurança do site. Não coletam dados para publicidade.</p></div>
      <div class="nx-cookie-option"><label for="consent-measurement"><input id="consent-measurement" type="checkbox"> Medição e interação</label><p>Ajudam a entender quais conteúdos e botões são usados (por exemplo, cliques em demonstrações e no WhatsApp), de forma agregada.</p></div>
      <div class="nx-cookie-option"><label for="consent-marketing"><input id="consent-marketing" type="checkbox"> Marketing (Meta Pixel)</label><p>Permitem à Meta registrar visitas e interações para medir e otimizar anúncios. Pode envolver transferência de dados para fora do Brasil.</p></div>
      <table class="nx-cookie-table"><caption>Armazenamento e prazos</caption><thead><tr><th scope="col">Nome</th><th scope="col">Finalidade</th><th scope="col">Prazo</th></tr></thead><tbody>
        <tr><th scope="row">nexus-consent (armazenamento local)</th><td>Guarda sua escolha</td><td>12 meses</td></tr>
        <tr><th scope="row">_fbp / _fbc (Meta, só com marketing)</th><td>Medição de anúncios</td><td>Até 90 dias, conforme a Meta</td></tr>
      </tbody></table>
      <a href="/privacidade/">Política de Privacidade</a>
      <div class="nx-cookie-actions"><button type="button" data-consent="save">Salvar preferências</button><button type="button" data-consent="accept">Aceitar todos</button><button type="button" data-consent="reject">Rejeitar não essenciais</button></div>
    </dialog>
    <p class="nx-cookie-toast" role="status" aria-live="polite"></p>`;
  document.body.appendChild(host);
  const banner = host.querySelector('.nx-cookie-banner');
  const dialog = host.querySelector('dialog');
  const measurement = host.querySelector('#consent-measurement');
  const marketing = host.querySelector('#consent-marketing');
  const toast = host.querySelector('.nx-cookie-toast');

  function startPixel() {
    if (!state.marketing || pixelStarted) return;
    pixelStarted = true;
    if (!window.fbq) {
      const fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
      fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
      window.fbq = fbq; window._fbq = fbq;
    }
    window.fbq('consent', 'grant');
    window.fbq('init', '2029304481102334');
    window.fbq('track', 'PageView');
    const script = document.createElement('script');
    script.id = 'nexus-meta-pixel'; script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  function clearMarketingCookies() {
    const labels = location.hostname.split('.');
    for (const name of ['_fbp', '_fbc']) {
      document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
      for (let i=0;i<labels.length-1;i++) {
        const domain = labels.slice(i).join('.');
        document.cookie = name + '=; Max-Age=0; path=/; domain=.' + domain + '; SameSite=Lax';
      }
    }
  }
  function close() {
    if (dialog.open) dialog.close();
  }
  function review(opener) {
    expire();
    const menuButton = document.querySelector('.nx-menu-btn[aria-expanded="true"]');
    if (menuButton) menuButton.click();
    previousFocus = opener || document.activeElement;
    measurement.checked = state.measurement; marketing.checked = state.marketing;
    dialog.showModal();
    dialog.querySelector('[data-consent="close"]').focus({preventScroll:true});
  }
  function expire() {
    if (!state.updatedAt || Date.now() < expiresAt(state)) return false;
    apply(empty(), false);
    measurement.checked = false; marketing.checked = false;
    banner.hidden = false;
    return true;
  }
  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    if (!state.updatedAt) return;
    // Browser timers cannot wait a full year in a single interval.
    const remaining = Math.max(0, expiresAt(state) - Date.now());
    expiryTimer = setTimeout(() => { if (!expire()) scheduleExpiry(); }, Math.min(remaining, 2147483647));
  }
  function apply(next, persist) {
    const revoked = state.marketing && !next.marketing;
    state = {...empty(), measurement: next.measurement === true, marketing: next.marketing === true};
    if (persist || next.updatedAt) state.updatedAt = persist ? new Date().toISOString() : next.updatedAt;
    let saved = false;
    if (persist) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state)); saved = true;
        try { localStorage.removeItem(LEGACY_KEY); } catch (_) { /* The current key takes precedence. */ }
      }
      catch (_) {
        // Quota may prevent writes while still allowing deletion of stale consent.
        if (revoked) { try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); saved = true; } catch (_) { /* Current page remains revoked. */ } }
      }
    }
    banner.hidden = true;
    if (revoked) {
      if (typeof window.fbq === 'function') window.fbq('consent', 'revoke');
      clearMarketingCookies();
    } else startPixel();
    scheduleExpiry();
    window.dispatchEvent(new CustomEvent('nexus:consent', {detail: {...state}}));
    if (persist) {
      close(); toast.textContent = 'Preferências salvas.';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.textContent = ''; }, 4500);
    }
    // Reload removes all already-loaded marketing code after revocation.
    // Never reload into stale accepted storage if a write failed (e.g. quota).
    // The already-loaded library remains revoked and our event layer is gated.
    if (revoked && (!persist || saved)) location.reload();
  }
  dialog.addEventListener('close', () => { if (previousFocus && previousFocus.isConnected) previousFocus.focus(); });
  host.addEventListener('click', event => {
    const action = event.target.closest('[data-consent]');
    if (!action) return;
    switch(action.dataset.consent) {
      case 'accept': apply({measurement:true, marketing:true}, true); break;
      case 'reject': apply({measurement:false, marketing:false}, true); break;
      case 'save': apply({measurement:measurement.checked, marketing:marketing.checked}, true); break;
      case 'configure': review(action); break;
      case 'close': close(); break;
    }
  });
  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-cookie-preferences], [data-consent-open]');
    if (opener) { event.preventDefault(); review(opener); }
  });
  window.addEventListener('storage', event => {
    if (event.key !== KEY && event.key !== null) return;
    const next = parse(event.newValue);
    apply(next || empty(), false);
    if (!next) banner.hidden = false;
  });
  window.NEXUS = window.NEXUS || {};
  window.NEXUS.consent = Object.freeze({get: () => { expire(); return {...state}; }, review});
  window.addEventListener('pageshow', expire);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) expire(); });
  scheduleExpiry();
  if (stored) startPixel(); else banner.hidden = false;
})();
