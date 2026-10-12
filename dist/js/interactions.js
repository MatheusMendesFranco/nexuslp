/* Nexus — interactions.js
 *
 * ARQUITETURA: o site é um sistema que SENTE o visitante e responde em todas as camadas.
 *
 *   1. SINAIS (sense)      scroll (posição suavizada + VELOCIDADE + energia), ponteiro (posição + velocidade),
 *                          foco, seleção, toque  ─▶  objeto SIG, recalculado a cada frame
 *   2. LINHA DO TEMPO      scroll ─▶ progresso local q∈[0,1] de cada cena ─▶ coordenada de história (cena + voo)
 *   3. CAMADAS que consomem SIG + q:
 *        texto   revelação por máscara, faixa de gradiente (nasce/atravessa/sai), “escorrega” com a velocidade
 *                do scroll e acende por proximidade do cursor; paralaxe em camadas; CTA reage ao cursor
 *        campo   a MESMA matéria (glifos/nós) assume uma formação por cena; entre cenas sai da estrutura,
 *                voa em arco e forma a próxima. Reage a SIG: inércia por profundidade e elasticidade (scroll),
 *                lente + conexões ligadas ao cursor, arestas que se acendem com a energia da rolagem
 *
 * Posições são função determinística do scroll (voltar a rolagem desfaz exatamente o que foi feito).
 * Eventos só atualizam alvos; o desenho acontece em requestAnimationFrame e para quando nada muda.
 *
 * Gramática temporal (q): 0–.18 entrada · .18–.45 formação · .45–.72 pico · .72–.92 dissolução · .92–1 handoff.
 * Cenas sticky (hero, processo, final) mapeiam o progresso de permanência h∈[0,1] em q = .18 + .82·h.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const sstep = (a, b, x) => smooth(clamp((x - a) / (b - a)));
  const hq = q => clamp((q - 0.18) / 0.82); // progresso de permanência de cena sticky
  const TAU = Math.PI * 2;

  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = reduceMQ.matches;
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const DEBUG = /[?&]nxdebug\b/.test(location.search);

  /* ═════════════════════ UI básica (sempre ativa) ═════════════════════ */

  (function initMenu() {
    const btn = $('.nx-menu-btn');
    const menu = $('#menu');
    const main = $('#conteudo');
    const footer = $('.nx-footer');
    if (!btn || !menu) return;
    const set = open => {
      menu.classList.toggle('is-open', open);
      root.classList.toggle('nx-menu-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      if (main) main.inert = open;
      if (footer) footer.inert = open;
      if (open) { const first = $('a', menu); if (first) first.focus({ preventScroll: true }); }
    };
    btn.addEventListener('click', () => set(!menu.classList.contains('is-open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', e => {
      if (e.key === 'Tab' && menu.classList.contains('is-open')) {
        const items = [...$$('.nx-header a, .nx-menu-btn'), ...$$('a', menu)];
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { set(false); btn.focus(); }
    });
    matchMedia('(min-width: 861px)').addEventListener('change', e => { if (e.matches) set(false); });
  })();

  // Reduced motion: sem campo contínuo, sem sticky narrativo, sem magnetismo (o CSS apresenta tudo estático).
  // Se a preferência mudar durante a sessão, recarrega para aplicar o modo correto.
  reduceMQ.addEventListener('change', () => location.reload());
  if (reduce) return;

  const canvas = $('#narrative-canvas');
  if (!canvas || !canvas.getContext) return;
  // Keep the visible surface synchronized with DOM composition. A low-latency
  // desynchronized context can expose clearRect before its replacement is ready.
  const visibleCtx = canvas.getContext('2d', {alpha:true, desynchronized:false});
  if (!visibleCtx) return;
  const candidate = (!finePointer || innerWidth < 900) ? document.createElement('canvas') : null;
  const bufferedCtx = candidate ? candidate.getContext('2d', {alpha:true, desynchronized:false}) : null;
  const surface = bufferedCtx ? candidate : canvas;
  const ctx = bufferedCtx || visibleCtx;
  root.classList.add('nx-live');

  /* ═════════════════════ Estado global ═════════════════════ */

  // W/H = tamanho do canvas e das formações. H usa a altura ESTÁVEL (lvh): a barra de endereço do celular muda
  // innerHeight durante a rolagem e não pode realocar o canvas. VH usa a mesma altura estável no mobile para não saltar com a barra de endereço.
  let W = 0, H = 0, VH = 0, dpr = 1, mob = false, maxScroll = 0;
  const coarse = !finePointer;    // celular/tablet: sem cursor
  // Qualidade adaptativa: 2 alta · 1 média (padrão no celular) · 0 leve. Cai sozinha se os quadros ficarem lentos.
  let quality = (coarse || innerWidth < 900) ? 1 : 2, slowEma = 0, lastQ = 0, frameNo = 0;
  let ty = scrollY;            // alvo (evento de scroll)
  let sy = scrollY;            // scroll suavizado: tudo é função dele
  let raf = 0, lastT = 0, hidden = document.hidden;
  let introStart = -1, intro = 0;
  let layoutDirty = true;
  let drawCost = 0, frameCost = 0, draws = 0, presents = 0, thin = quality === 2 ? 1 : 2, havePrev = false;

  const ambientEl = $('.nx-ambient');

  /** Sinais de entrada, em números contínuos. Toda camada lê daqui. */
  const SIG = {
    v: 0,        // velocidade do scroll suavizada, px por frame de 60 Hz (com sinal: + = descendo)
    e: 0,        // energia do scroll 0..1: sobe rápido com a rolagem, decai devagar ao parar
    pe: 0,       // energia do ponteiro 0..1 (velocidade do cursor)
    lagBusy: 0,  // maior defasagem de inércia ainda a assentar (px)
  };
  let prevSy = scrollY, prevPx = 0, prevPy = 0;

  const ptr = { on: false, tx: 0, ty: 0, x: 0, y: 0, nx: 0.5, ny: 0.5, s: 0 };
  const foc = { x: 0, y: 0, s: 0, tgt: 0 };
  const sel = { x: 0, y: 0, s: 0, tgt: 0 };
  const ripples = [];
  const magnets = [];

  /* ═════════════════════ Cenas e medição ═════════════════════ */

  /** Tipografia: preserva os grupos de palavras (e trata cada texto-chave em gradiente como uma palavra) para a entrada
   *  em cascata. As palavras continuam sendo texto normal em linha. */
  function splitWords(root_) {
    let idx = 0;
    const walk = node => {
      for (const ch of Array.from(node.childNodes)) {
        if (ch.nodeType === 3) {
          const f = document.createDocumentFragment();
          for (const part of ch.textContent.split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { f.appendChild(document.createTextNode(part)); continue; }
            const w = document.createElement('span');
            w.className = 'nx-w'; w.style.setProperty('--i', String(idx++)); w.textContent = part;
            f.appendChild(w);
          }
          node.replaceChild(f, ch);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR' && !ch.classList.contains('nx-w')) {
          if (ch.classList.contains('nx-gradient-stack')) { ch.classList.add('nx-w'); ch.style.setProperty('--i', String(idx++)); }
          else walk(ch);
        }
      }
    };
    walk(root_);
  }

  const scenes = $$('[data-scene]').map((el, i) => {
    const content = $('.nx-scene-content', el) || el;
    const sc = {
      el, content, i, id: el.dataset.scene, stage: el.hasAttribute('data-stage'), flow: el.hasAttribute('data-flow'),
      a: 0, b: 0, lo: 0, hi: 0, q: 0, vis: i === 0,
      tx: { heat: 0, born: 0, leave: 0 },
      reveals: [], grads: [], words: [], ctas: [], anchor: null, kq: {}, ctaNear: 0,
    };
    $$('.nx-r', el).forEach(r => {
      if (!r.matches('.nx-body, .nx-eyebrow, .nx-founders, .nx-origin')) splitWords(r);   // títulos: palavra a palavra · parágrafos e eyebrow: um bloco só (menos camadas)
      sc.reveals.push({ el: r, value: -1 });
    });
    sc.par = [];   // paralaxe em camadas (desktop): deslocamentos escritos direto, sem variável herdada
    if (!coarse && innerWidth >= 900) {
      for (const [sel_, k] of [['.nx-eyebrow', 4], ['.nx-display, .nx-h2', -4], ['.nx-lead, .nx-statement', 6], ['.nx-body, .nx-cta', 5]]) {
        $$(sel_, el).forEach(e => sc.par.push({ el: e, k, v: 1e9 }));
      }
    }
    $$('.nx-gradient-stack[data-g]', el).forEach(g => {
      const t = g.dataset.g.split(/\s+/).map(Number);
      const o = { el: g, t, k: {}, prox: 0 };
      sc.grads.push(o);
      if (g.dataset.anchor) { sc.anchor = g; sc.anchorGrad = o; }
    });
    $$('.nx-word', el).forEach((w, k) => {
      sc.words.push({ el: w, k, stack: $('.nx-gradient-stack', w), k0: {}, prox: 0 });
    });
    sc.ctas = $$('.nx-cta:not(.nx-cta--ghost)', el);
    sc.steps = $$('[data-step]', el).map(e => ({el:e, index:Number(e.dataset.step), value:-1}));
    return sc;
  });
  const NS = scenes.length;
  const byId = Object.fromEntries(scenes.map(s => [s.id, s]));

  // Rectangles are measured only after resize/font/layout changes. Scroll and
  // pointer frames derive viewport coordinates from cached document geometry.
  const geometry = new WeakMap();
  function cacheRect(el, sc, pin) {
    const rect = el.getBoundingClientRect();
    const chain = [];
    let dx = 0, dy = 0;
    for (let e = el; e && e !== sc.el; e = e.parentElement) {
      chain.push(e);
      dx += e._nxMagX || 0;
      dy += (e._nxParY || 0) + (e._nxRevealY || 0) + (e._nxMagY || 0);
    }
    geometry.set(el, {sc, chain, left: rect.left - dx, top: rect.top + scrollY - pin - dy,
      width: rect.width, height: rect.height});
  }
  function rectAt(el) {
    const g = geometry.get(el);
    if (!g) return {left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0};
    let dx = 0, dy = 0;
    for (const e of g.chain) {
      dx += e._nxMagX || 0;
      dy += (e._nxParY || 0) + (e._nxRevealY || 0) + (e._nxMagY || 0);
    }
    const top = g.top - scrollY + (g.sc.stage ? clamp(scrollY - g.sc.top, 0, g.sc.travel) : 0) + dy;
    const left = g.left + dx;
    return {left, top, right: left + g.width, bottom: top + g.height, width: g.width, height: g.height};
  }

  function measure() {
    VH = mob ? H : innerHeight;
    const y0 = scrollY;
    maxScroll = Math.max(0, root.scrollHeight - innerHeight);
    for (const sc of scenes) {
      if (sc.anchor) sc.lineH = parseFloat(getComputedStyle(sc.anchor).fontSize) || 40;
      const r = sc.el.getBoundingClientRect();
      const top = r.top + y0;
      sc.top = top;
      const sticky = $('.nx-sticky', sc.el);
      sc.travel = sticky ? Math.max(0, r.height - sticky.offsetHeight) : 0;
      const pin = sc.stage ? clamp(y0 - top, 0, sc.travel) : 0;
      if (sc.stage) {
        sc.a = top;
        sc.b = top + sc.travel;
      } else if (sc.flow) {
        // Long editorial scenes have their own continuous timeline without pinning text.
        sc.a = Math.max(0, top - VH * .15);
        sc.b = Math.max(sc.a + VH * .35, top + r.height - VH * .6);
      } else {
        const cr = sc.content.getBoundingClientRect();
        sc.a = sc.b = cr.top + y0 + cr.height / 2 - VH * (mob ? 0.4 : 0.5); // mobile: conteúdo no terço superior, campo na metade inferior
      }
      const measured = new Set([sc.content, sc.anchor, ...sc.reveals.map(r => r.el),
        ...sc.grads.map(g => g.el), ...sc.words.map(w => w.stack), ...sc.ctas]);
      for (const el of measured) if (el) cacheRect(el, sc, pin);
    }
    for (let i = 0; i < NS; i++) {
      const sc = scenes[i];
      if (i > 0 && sc.a <= scenes[i - 1].b + 2) { const d = scenes[i - 1].b + 2 - sc.a; sc.a += d; sc.b += d; } // mantém a ordem (preserva o hold dos palcos)
      sc.lo = i === 0 ? sc.a - VH : (scenes[i - 1].b + sc.a) / 2;
    }
    for (let i = 0; i < NS; i++) {
      const sc = scenes[i];
      sc.hi = i === NS - 1 ? Math.max(maxScroll, sc.b + 1) : (sc.b + scenes[i + 1].a) / 2;
      if (sc.hi <= sc.a + 1) sc.hi = sc.a + VH;
    }
    layoutDirty = false;
  }

  /** q local de cada cena (a partir do scroll suavizado). */
  function updateProgress(y) {
    for (const sc of scenes) {
      if (sc.stage || sc.flow) {
        if (y < sc.a) sc.q = 0.18 * clamp((y - sc.lo) / Math.max(1, sc.a - sc.lo));
        else if (y <= sc.b) sc.q = 0.18 + 0.82 * ((y - sc.a) / Math.max(1, sc.b - sc.a));
        else sc.q = 1;
      } else if (y < sc.a) sc.q = 0.5 * clamp((y - sc.lo) / Math.max(1, sc.a - sc.lo));
      else sc.q = 0.5 + 0.5 * clamp((y - sc.a) / Math.max(1, sc.hi - sc.a));
    }
  }

  /** Coordenada de história: cena atual e fração do voo para a próxima. */
  let si = 0, st = 0;
  function updateStory(y) {
    si = NS - 1; st = 0;
    for (let i = 0; i < NS; i++) {
      if (y <= scenes[i].b) { si = i; st = 0; return; }
      if (i < NS - 1 && y < scenes[i + 1].a) {
        si = i; st = (y - scenes[i].b) / Math.max(1, scenes[i + 1].a - scenes[i].b); return;
      }
    }
  }

  /* ═════════════════════ Texto vivo ═════════════════════ */

  const UNIT = { '--ga': '', '--cta-glow': '', '--cta-near': '', '--sv': '' };
  const setVar = (el, cache, name, v, eps = 0.002) => {
    if (cache[name] === undefined || Math.abs(cache[name] - v) > eps) {
      cache[name] = v;
      const u = name in UNIT ? UNIT[name] : '%';
      el.style.setProperty(name, v.toFixed(u === '' ? 3 : 2) + u);
    }
  };

  /** Faixa de gradiente: nasce, atravessa, atinge o pico e sai. u = progresso na janela t[0..3]. */
  function gradState(t, q) {
    const born = sstep(t[0], t[1], q);
    const leave = sstep(t[2], t[3], q);
    const front = mix(-14, 118, born);
    const back = mix(-46, 122, leave);
    const on = q > t[0] && q < t[3] ? 1 : 0;
    const span = clamp((q - t[0]) / Math.max(0.001, t[3] - t[0]));
    return { born, leave, front, back, on, span };
  }

  /** Escreve a faixa de gradiente. `prox` (cursor perto do texto) abre a faixa a partir da esquerda, como no hover. */
  function applyGrad(el, k, s, prox, alphaOn, shift) {
    if (!s.on && prox < 0.01) {            // fora do seu momento: uma única escrita e silêncio (nada a repintar)
      if (!k.parked) { k.parked = true; setVar(el, k, '--ga', 0, 0); }
      return;
    }
    k.parked = false;
    setVar(el, k, '--gb', mix(s.back, -46, prox), 0.4);
    setVar(el, k, '--gf', Math.max(s.front, mix(-14, 118, prox * 0.92)), 0.4);
    setVar(el, k, '--ga', Math.max(s.on * alphaOn, prox * 0.9), 0.01);
    setVar(el, k, '--gx', mix(-6, 104, s.on ? s.span : 0.45) + shift, 0.5);
  }

  // Short, reversible scroll reveal. No delayed class animation: reverse scroll
  // and fast navigation always show the state corresponding to the viewport.
  function updateReveal(r) {
    const g = geometry.get(r.el);
    if (!g) return;
    const pin = g.sc.stage ? clamp(scrollY - g.sc.top, 0, g.sc.travel) : 0;
    const top = g.top - scrollY + pin;
    const v = sstep(VH * 1.04, VH * .94, top);
    if (Math.abs(v - r.value) < .002) return;
    r.value = v;
    r.el._nxRevealY = (1 - v) * (mob ? 3 : 5);
    r.el.style.opacity = (.78 + .22 * v).toFixed(3);
    r.el.style.transform = v > .998 ? 'none' : `translate3d(0,${r.el._nxRevealY.toFixed(2)}px,0)`;
    r.el.classList.toggle('is-in', v > .1);
  }

  function updateText() {
    // O gradiente acompanha o cursor (posição) e “escorrega” com a velocidade do scroll
    const shift = coarse ? 0 : (ptr.nx - 0.5) * 22 * ptr.s + clamp(SIG.v * .28, -14, 14);
    for (const sc of scenes) {
      if (!sc.vis && sc.i !== si && !(st > 0 && sc.i === si + 1)) continue;
      const q = sc.q;

      // paralaxe em camadas (desktop): escrita direta em poucos elementos, sem variável herdada pela subárvore
      for (const p of sc.par) {
        const v = (q - 0.5) * p.k;
        if (Math.abs(v - p.v) > 0.3) { p.v = v; p.el._nxParY = v; p.el.style.translate = '0 ' + v.toFixed(1) + 'px'; }
      }

      for (const r of sc.reveals) updateReveal(r);
      for (const step of sc.steps) {
        const v = sstep(.25 + step.index * .075, .46 + step.index * .075, q);
        if (Math.abs(v-step.value)>.004) { step.value=v; step.el.style.setProperty('--step-active',v.toFixed(3)); }
      }

      let heat = 0;
      for (const g of sc.grads) {
        const s = gradState(g.t, q);
        applyGrad(g.el, g.k, s, g.prox, 0.96, shift);
        if (g === sc.anchorGrad) {
          sc.tx.born = s.born; sc.tx.leave = s.leave;
          sc.tx.heat = s.on * sstep(0, 0.25, s.born) * (1 - sstep(0.55, 1, s.leave));
        }
        heat = Math.max(heat, s.on * s.born * (1 - s.leave));
      }
      if (!sc.anchorGrad) sc.tx.heat = heat;

      if (sc.id === 'process') updateWords(sc, hq(q) * 4);

      if (sc.ctas.length) {
        const x = (sc.id === 'contact' ? mix(-18, 100, sstep(0.5, 0.95, q)) : mix(0, 70, q)) + (ptr.nx - 0.5) * 24 * sc.ctaNear;
        for (const c of sc.ctas) {
          c._k = c._k || {};
          setVar(c, c._k, '--cta-x', x, 1.2);
          setVar(c, c._k, '--cta-near', sc.ctaNear, 0.03);
          if (sc.id === 'contact') setVar(c, c._k, '--cta-glow', sstep(0.6, 0.95, q), 0.03);
        }
      }
    }
  }

  const WORD_G = [[0, 0.55, 0.80, 1.30], [0, 0.55, 0.80, 1.30], [0, 0.55, 0.80, 1.30], [0, 0.62, 9, 10]];
  function updateWords(sc, stepF) {
    for (const w of sc.words) {
      const u = stepF - w.k;
      // All four verbs remain readable; emphasis passes continuously between them.
      const arrive = sstep(-.42, .12, u);
      const leave = w.k === 3 ? 0 : sstep(.72, 1.32, u);
      const opacity = mix(.78, 1, arrive) - .16 * leave;
      if (w.opacity === undefined || Math.abs(opacity - w.opacity) > .002) {
        w.opacity = opacity;
        w.el.style.opacity = opacity.toFixed(3);
      }
      const s = gradState(WORD_G[w.k], u);
      applyGrad(w.stack, w.k0, s, w.prox, w.k === 3 ? 0.98 : 0.92, coarse ? 0 : (ptr.nx - 0.5) * 22 * ptr.s + clamp(SIG.v * .28, -14, 14));
      if (w.k === 0) sc.tx.born = s.born;
    }
    sc.tx.heat = 1;
  }

  /* ═════════════════════ Campo narrativo ═════════════════════ */

  const GLYPHS = ['01', '10', '{}', '[]', '<>', '/', '+', '::', 'LEAD', 'SIGNAL', '•', '—', 'reply.pending', 'next_step', 'crm.updated', 'followup'];
  const TONES = [[32, 214, 231], [47, 123, 255], [139, 92, 246]];
  const PAL = Array.from({ length: 65 }, (_, i) => { // ciano → azul → violeta
    const t = i / 64, a = TONES[0], b = TONES[1], c = TONES[2];
    return t < 0.5
      ? [mix(a[0], b[0], t * 2), mix(a[1], b[1], t * 2), mix(a[2], b[2], t * 2)]
      : [mix(b[0], c[0], (t - 0.5) * 2), mix(b[1], c[1], (t - 0.5) * 2), mix(b[2], c[2], (t - 0.5) * 2)];
  });
  const pal = t => PAL[(clamp(t) * 64) | 0];

  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const MAXN = 144, MAXE = 420;
  let N = 0, V = { cx: 0, cy: 0, w: 0, h: 0 };

  // Dados estáticos por nó
  const nd = {
    rx: new Float32Array(MAXN), ry: new Float32Array(MAXN), ph1: new Float32Array(MAXN), ph2: new Float32Array(MAXN),
    amp: new Float32Array(MAXN), depth: new Float32Array(MAXN), st: new Float32Array(MAXN), sg: new Float32Array(MAXN),
    arc: new Float32Array(MAXN), tone: new Uint8Array(MAXN), glyph: new Uint8Array(MAXN), size: new Uint8Array(MAXN),
    tau: new Float32Array(MAXN), // constante de tempo da inércia de scroll (ms): longe = mais lento
    fs: new Uint8Array(MAXN),    // tamanho-base do glifo em px (9 para rótulos longos)
  };
  const GRP = [[[], [], [], []], [[], [], [], []], [[], [], [], []]];      // índices por [tom][classe de tamanho 9..12px]
  const SIZE_OF = [9, 10, 11, 12];
  const lag = new Float32Array(MAXN);                                   // scroll “atrasado” de cada nó (inércia por profundidade)
  const PROX = new Float32Array(MAXN);                                  // proximidade do cursor/foco por nó (0..1)
  const lx = new Float32Array(MAXN), ly = new Float32Array(MAXN);      // posição solta (estado disperso)
  const X = new Float32Array(MAXN), Y = new Float32Array(MAXN);        // posição final
  const PX = new Float32Array(MAXN), PY = new Float32Array(MAXN);      // frame anterior (rastro)
  const M = new Float32Array(MAXN), G = new Float32Array(MAXN);        // organização e brilho finais
  const TAUN = new Float32Array(MAXN);                                  // progresso do voo por nó
  const FS = new Float32Array(MAXN), FDX = new Float32Array(MAXN), FDY = new Float32Array(MAXN); // energia/direção do voo

  function makeF() {
    return {
      x: new Float32Array(MAXN), y: new Float32Array(MAXN), m: new Float32Array(MAXN), g: new Float32Array(MAXN),
      ne: 0, ea: new Uint16Array(MAXE), eb: new Uint16Array(MAXE), ew: new Float32Array(MAXE),
      ek: new Float32Array(MAXE), eh: new Float32Array(MAXE), et: new Float32Array(MAXE), er: new Float32Array(MAXE),
      nr: 0, rg: Array.from({ length: 8 }, () => ({ x: 0, y: 0, rx: 0, ry: 0, rot: 0, a: 0 })),
      peeled: false, ox: new Float32Array(MAXN), oy: new Float32Array(MAXN),
      ntr: 0, tr: Array.from({ length: 12 }, () => ({ idx: new Uint16Array(MAXN + 2), ni: 0, sp: null, ep: null, u: 0, tail: 0.2, a: 0, bend: 0, w: 1 })),
      halo: null,
    };
  }
  const FA = makeF(), FB = makeF(), PA = makeF(), PB = makeF();
  const tmpPt = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

  function initNodes(n) {
    N = n;
    const r = mulberry32(0x9E3779B1);
    const cols = Math.max(3, Math.round(Math.sqrt(n * (W / H))));
    const rows = Math.ceil(n / cols);
    const cells = Array.from({ length: cols * rows }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [cells[i], cells[j]] = [cells[j], cells[i]]; }
    for (let i = 0; i < n; i++) {
      const c = cells[i];
      nd.rx[i] = ((c % cols) + 0.15 + r() * 0.7) / cols;
      nd.ry[i] = (((c / cols) | 0) + 0.15 + r() * 0.7) / rows;
      nd.ph1[i] = r() * TAU; nd.ph2[i] = r() * TAU;
      nd.amp[i] = 26 + r() * 70; nd.depth[i] = 0.4 + r() * 0.6;
      nd.st[i] = r(); nd.sg[i] = r() < 0.5 ? -1 : 1; nd.arc[i] = 0.14 + r() * 0.3;
      const tn = r(); nd.tone[i] = tn < 0.42 ? 0 : tn < 0.82 ? 1 : 2;
      nd.glyph[i] = (r() * GLYPHS.length) | 0;
      nd.size[i] = 10 + ((r() * 3) | 0);
      nd.tau[i] = 60 + 300 * (1 - nd.depth[i]);
      lag[i] = sy;
    }
    for (const t of GRP) for (const c of t) c.length = 0;
    for (let i = 0; i < n; i++) {
      nd.fs[i] = GLYPHS[nd.glyph[i]].length > 3 ? 9 : nd.size[i];
      GRP[nd.tone[i]][SIZE_OF.indexOf(nd.fs[i])].push(i);
    }
  }

  // Tabelas de geometria por cena (dependem de N, viewport e V)
  const T = {};
  const CT = [
    { c: [-0.55, -0.62], p: [[0, -0.17], [0.15, 0.1], [-0.15, 0.1]], e: [[0, 1], [1, 2], [2, 0]] },
    { c: [0.5, -0.62], p: [[-0.12, -0.12], [0.12, -0.12], [0.12, 0.12], [-0.12, 0.12]], e: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 2]] },
    { c: [-0.58, 0.12], p: Array.from({ length: 5 }, (_, i) => [Math.cos(i * TAU / 5 - 1.57) * 0.17, Math.sin(i * TAU / 5 - 1.57) * 0.17]), e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] },
    { c: [0.52, 0.02], p: [[-0.2, 0.1], [-0.1, -0.08], [0.02, 0.08], [0.12, -0.1], [0.22, 0.06]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    { c: [-0.02, -0.2], p: [[0, 0], ...Array.from({ length: 5 }, (_, i) => [Math.cos(i * TAU / 5) * 0.19, Math.sin(i * TAU / 5) * 0.19])], e: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]] },
    { c: [0.0, 0.68], p: [[-0.14, -0.15], [-0.14, 0], [-0.14, 0.15], [0, 0.15], [0.16, 0.15]], e: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  ];

  function buildTables() {
    const r = mulberry32(0x51ED270B);
    const minV = Math.min(V.w, V.h);

    // Hero: "N" de conexão feito de nós ao longo de três traços
    {
      const Mh = Math.min(N, mob ? 38 : 62);
      const bh = V.h * (mob ? 0.92 : 0.9), bw = Math.min(V.w * 0.9, bh * 0.74), ar = bw / bh;
      const segs = [[-0.5, 0.5, -0.5, -0.5], [-0.5, -0.5, 0.5, 0.5], [0.5, 0.5, 0.5, -0.5]];
      const lens = [1, Math.hypot(ar, 1), 1];
      const total = lens[0] + lens[1] + lens[2];
      const hx = new Float32Array(Mh), hy = new Float32Array(Mh);
      for (let j = 0; j < Mh; j++) {
        let s = ((j + 0.5) / Mh) * total, k = 0;
        while (k < 2 && s > lens[k]) { s -= lens[k]; k++; }
        const u = s / lens[k], sg = segs[k];
        hx[j] = mix(sg[0], sg[2], u) * bw + (r() - 0.5) * bh * 0.022;
        hy[j] = mix(sg[1], sg[3], u) * bh + (r() - 0.5) * bh * 0.022;
      }
      T.hero = { M: Mh, hx, hy };
    }

    // Contexto: seis tentativas de estrutura + núcleo único (anéis concêntricos)
    {
      const sc = minV * (mob ? 0.5 : 0.62);
      const nodeCl = [], ox = new Float32Array(MAXN), oy = new Float32Array(MAXN), edges = [];
      let n = 0;
      CT.forEach((c, ci) => {
        const base = n;
        c.p.forEach(p => {
          nodeCl[n] = ci;
          ox[n] = c.c[0] * V.w * 0.62 + p[0] * sc;
          oy[n] = c.c[1] * V.h * 0.55 + p[1] * sc;
          n++;
        });
        c.e.forEach(e => edges.push([base + e[0], base + e[1], ci]));
      });
      const counts = [1, 6, 12, 18], slots = [];
      counts.forEach((cn, ring) => { for (let j = 0; j < cn; j++) slots.push([ring, j, cn]); });
      const nSlots = Math.min(slots.length, N);
      const perm = Array.from({ length: nSlots }, (_, i) => i);
      for (let i = perm.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [perm[i], perm[j]] = [perm[j], perm[i]]; }
      const slotOf = new Int16Array(MAXN).fill(-1);
      perm.forEach((node, s) => { slotOf[node] = s; });
      // Início de cada anel no espaço de slots
      const ringStart = [0, 1, 7, 19];
      T.ctx = { nCl: n, nodeCl, ox, oy, edges, slots, perm, slotOf, nSlots, ringStart, Rc: minV * 0.5 * (mob ? 1.0 : 1.12) };
    }

    // Processo: quatro estados da mesma matéria
    {
      const P = {};
      // s1 — identificar: rede orgânica (filotaxia) + vizinhança mais próxima
      const n1 = 24, p1x = new Float32Array(n1), p1y = new Float32Array(n1);
      for (let i = 0; i < n1; i++) {
        const a = i * 2.399963, rr = Math.sqrt((i + 0.6) / n1);
        p1x[i] = Math.cos(a) * rr * V.w * 0.47 + (r() - 0.5) * 12;
        p1y[i] = Math.sin(a) * rr * V.h * 0.42 + (r() - 0.5) * 12;
      }
      const e1 = [], seen = new Set();
      for (let i = 0; i < n1; i++) {
        const ds = [];
        for (let j = 0; j < n1; j++) if (j !== i) ds.push([Math.hypot(p1x[i] - p1x[j], p1y[i] - p1y[j]), j]);
        ds.sort((a, b) => a[0] - b[0]);
        for (let k = 0; k < 2; k++) {
          const j = ds[k][1], key = i < j ? i * 64 + j : j * 64 + i;
          if (!seen.has(key)) { seen.add(key); e1.push([Math.min(i, j), Math.max(i, j), ((i + j) % 3 === 0) ? 1 : 0]); }
        }
      }
      P.s1 = { n: n1, x: p1x, y: p1y, e: e1 };
      // s2 — construir: diagrama em colunas com conectores ortogonais
      const cols = mob ? [2, 3, 4, 3, 2] : [2, 4, 5, 4, 3];
      const n2 = cols.reduce((a, b) => a + b, 0), p2x = new Float32Array(MAXN), p2y = new Float32Array(MAXN);
      const colOf = [], e2 = [];
      let k = 0; const starts = [];
      const rowGap = (V.h * (mob ? 0.8 : 0.74)) / 4, W2 = V.w * 0.9;
      cols.forEach((cn, c) => {
        starts.push(k);
        for (let j = 0; j < cn; j++) {
          p2x[k] = -W2 / 2 + c * (W2 / 4);
          p2y[k] = (j - (cn - 1) / 2) * rowGap;
          colOf[k] = c; k++;
        }
      });
      cols.forEach((cn, c) => {
        if (c === cols.length - 1) return;
        const nn = cols[c + 1];
        for (let j = 0; j < cn; j++) {
          const t0 = Math.min(nn - 1, Math.floor((j * nn) / cn));
          e2.push([starts[c] + j, starts[c + 1] + t0, c]);
          if ((j + c) % 2 === 0 && t0 + 1 < nn) e2.push([starts[c] + j, starts[c + 1] + t0 + 1, c]);
        }
      });
      // satélites (anotações discretas nos cantos do diagrama)
      const sat = Math.min(6, N - n2 - 1);
      const corners = [[-0.5, -0.5], [0.5, -0.52], [-0.52, 0.5], [0.5, 0.5], [0, -0.58], [0, 0.58]];
      for (let s = 0; s < sat; s++) { p2x[n2 + s] = corners[s][0] * W2 * 1.02; p2y[n2 + s] = corners[s][1] * V.h * 0.78; }
      P.s2 = { n: n2, sat, x: p2x, y: p2y, e: e2, colOf, cols };
      // s3 — evoluir: árvore radial que abre caminhos
      const lv = [1, 3, 6, 10, 14], n3 = lv.reduce((a, b) => a + b, 0), lvl = [], par = [], idx = [];
      k = 0;
      lv.forEach((cn, l) => { idx.push(k); for (let j = 0; j < cn; j++) { lvl[k] = l; par[k] = l === 0 ? -1 : idx[l - 1] + Math.min(lv[l - 1] - 1, Math.floor((j * lv[l - 1]) / cn)); k++; } });
      P.s3 = { n: n3, lv, lvl, par, idx };
      T.proc = P;
    }

    // Sob medida: três órbitas que se ajustam
    {
      const counts = mob ? [6, 10, 14] : [8, 14, 20];
      const n = 1 + counts.reduce((a, b) => a + b, 0);
      const ringOf = new Int8Array(MAXN).fill(-1), jOf = new Int16Array(MAXN), irA = new Float32Array(MAXN), irR = new Float32Array(MAXN);
      let k = 1; const starts = [];
      counts.forEach((cn, ring) => { starts.push(k); for (let j = 0; j < cn; j++) { ringOf[k] = ring; jOf[k] = j; irA[k] = r() * 2 - 1; irR[k] = r() * 2 - 1; k++; } });
      T.fit = { counts, n, ringOf, jOf, irA, irR, starts, sc: [0.34, 0.64, 0.96], tilt0: [r() * 1.6 - 0.8, r() * 1.6 - 0.8, r() * 1.6 - 0.8], tiltFit: [-0.42, 0.1, 0.52], rotSp: [1.3, -0.9, 0.6] };
    }

    // Resultado: faixas que convergem em um fluxo limpo
    {
      const L = mob ? 4 : 5, K = mob ? 9 : 12, n = L * K;
      const h1 = new Float32Array(MAXN), h2 = new Float32Array(MAXN);
      for (let i = 0; i < n; i++) { h1[i] = r(); h2[i] = r(); }
      T.res = { L, K, n, h1, h2 };
    }

    // Final: portal de nós ao redor do CTA
    {
      const counts = mob ? [10, 14, 18] : [14, 20, 26];
      const n = counts.reduce((a, b) => a + b, 0);
      T.con = { counts, n, starts: [0, counts[0], counts[0] + counts[1]] };
    }
  }

  /** DPR do canvas: o custo do canvas em tela cheia é o maior item de cada frame no celular, então a resolução
   *  acompanha a qualidade. As linhas e glifos são finos e escuros; 1.25× é indistinguível a olho nu. */
  function pickDpr() {
    const d = devicePixelRatio || 1;
    return quality >= 2 ? Math.min(d, mob ? 1.5 : 2) : quality === 1 ? Math.min(d, 1.25) : 1;
  }

  function resizeCanvas() {
    W = innerWidth;
    H = canvas.clientHeight || innerHeight;          // 100lvh: não muda quando a barra de endereço aparece/some
    mob = W < 900;
    VH = mob ? H : innerHeight;
    dpr = pickDpr();
    const pixelW=Math.round(W*dpr), pixelH=Math.round(H*dpr);
    // Assigning width/height clears a canvas; do it only when resolution changes.
    if(canvas.width!==pixelW) canvas.width=pixelW;
    if(canvas.height!==pixelH) canvas.height=pixelH;
    if(surface!==canvas) {
      if(surface.width!==pixelW) surface.width=pixelW;
      if(surface.height!==pixelH) surface.height=pixelH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mob = W < 900;
    V = mob
      ? { cx: W * 0.5, cy: H * 0.77, w: W * 0.86, h: H * 0.36 }
      : { cx: W * 0.815, cy: H * 0.53, w: Math.min(W * 0.32, 540), h: H * 0.68 };
    if (!ptr.on) { ptr.tx = ptr.x = W / 2; ptr.ty = ptr.y = VH / 2; }
    const n = mob ? 52 : clamp(Math.round((W * H) / 15000), 64, 104);
    if (n !== N) initNodes(n);
    buildTables();
    layoutDirty = true;
  }

  function setQuality(q) {
    if (q === quality) return;
    quality = q; thin = q === 2 ? 1 : q === 1 ? 2 : 3;
    resizeCanvas();
  }

  /* ─── Construção de formações ─── */

  function fillLoose(F) {
    for (let i = 0; i < N; i++) { F.x[i] = lx[i]; F.y[i] = ly[i]; F.m[i] = 0; F.g[i] = 0; }
    F.ne = 0; F.nr = 0; F.ntr = 0; F.halo = null; F.peeled = false;
  }
  /** rl = comprimento de repouso (geometria-alvo). A aresta só “acende” quando os nós chegam perto dele. */
  function edge(F, a, b, w, ek = 0, eh = 0, et = 0, rl = -1) {
    if (w < 0.006 || F.ne >= MAXE || a >= N || b >= N) return;
    const k = F.ne++;
    F.ea[k] = a; F.eb[k] = b; F.ew[k] = w; F.ek[k] = ek; F.eh[k] = eh; F.et[k] = et;
    F.er[k] = rl > 0 ? rl : F.peeled ? Math.hypot(F.ox[b] - F.ox[a], F.oy[b] - F.oy[a]) : Math.hypot(F.x[b] - F.x[a], F.y[b] - F.y[a]);
  }
  function ring(F, x, y, rx, ry, rot, a) {
    if (a < 0.006 || F.nr >= 8) return;
    const r = F.rg[F.nr++]; r.x = x; r.y = y; r.rx = rx; r.ry = ry; r.rot = rot; r.a = a;
  }
  function tracer(F) {
    const t = F.tr[F.ntr++]; t.ni = 0; t.sp = null; t.ep = null; t.bend = 0; t.u = 0; t.tail = 0.2; t.a = 0; t.w = 1;
    return t;
  }
  /** Pulso de sinal que percorre uma estrutura; a fase `u` vem do scroll (flui ao rolar, volta ao rolar de volta). */
  function pulse(F, idx, count, u, a, tail = 0.13, closed = false) {
    if (a < 0.03 || F.ntr >= F.tr.length || (quality === 0)) return;
    const t = tracer(F);
    let n = 0;
    for (let j = 0; j < count; j++) t.idx[n++] = idx(j);
    if (closed) t.idx[n++] = idx(0);
    t.ni = n; t.u = u - Math.floor(u); t.tail = tail; t.a = a; t.w = 0.7;
  }
  /** Parte da estrutura se solta ao fim do palco e migra em direção à próxima cena. */
  function peel(F, rel, count) {
    if (rel <= 0.001) return;
    F.peeled = true;
    for (let i = 0; i < N; i++) { F.ox[i] = F.x[i]; F.oy[i] = F.y[i]; }
    for (let i = 0; i < count; i++) {
      const k = sstep(0, 1, rel * 1.6 - nd.st[i] * 0.6);
      if (k <= 0) continue;
      F.x[i] = mix(F.x[i], lx[i], k * 0.55) + k * 18 * nd.sg[i];
      F.y[i] = mix(F.y[i], ly[i], k * 0.55) + k * H * (0.05 + 0.1 * nd.st[i]);
      F.m[i] *= 1 - 0.8 * k;
    }
  }

  const textEnd = (sc) => {
    const el = sc && sc.anchor;
    if (!el) return null;
    const r = rectAt(el);
    const lineH = sc.lineH || 40;
    const multi = r.height > lineH * 1.6;
    return { x: multi ? r.left + r.width * 0.62 : r.right + 4, y: multi ? r.bottom - lineH * 0.45 : r.top + r.height * 0.5 };
  };
  const anchors = {};

  function buildHero(F, q) {
    fillLoose(F);
    const h = .09 + .91 * hq(q), tx = byId.hero.tx, H0 = T.hero, Mh = H0.M;
    const th = (h - 0.5) * 0.5, cs = Math.cos(th), breath = 1 + 0.03 * Math.sin(h * 5);
    const hot = tx.heat, front = tx.born;
    for (let j = 0; j < Mh; j++) {
      const c = sstep(0.02 + nd.st[j] * 0.09, 0.4 + nd.st[j] * 0.10, h);
      const tx_ = V.cx + H0.hx[j] * cs, ty_ = V.cy + H0.hy[j] * breath + Math.sin(H0.hx[j] * 0.02 + h * 7) * 3 * c;
      F.x[j] = mix(lx[j], tx_, c); F.y[j] = mix(ly[j], ty_, c);
      F.m[j] = c;
      const lit = clamp((front * 1.25 - j / Mh) / 0.18);
      F.g[j] = (j < 8 ? 0.35 + 0.5 * hot : 0) + lit * hot * 0.7;
    }
    peel(F, sstep(0.8, 1, h), Mh);
    const rl = (a, b) => Math.hypot(H0.hx[a] - H0.hx[b], H0.hy[a] - H0.hy[b]);
    for (let j = 0; j < Mh - 1; j++) {
      const w = Math.min(F.m[j], F.m[j + 1]);
      const lit = clamp((front * 1.25 - j / Mh) / 0.18);
      edge(F, j, j + 1, w * w, 0, hot * lit, j / Mh, rl(j, j + 1));
      if (j % 2 === 0 && j + 3 < Mh) edge(F, j, j + 3, Math.min(F.m[j], F.m[j + 3]) ** 2 * 0.3, 0, hot * lit * 0.6, j / Mh, rl(j, j + 3));
      if (j % 5 === 0 && j + 6 < Mh) edge(F, j, j + 6, Math.min(F.m[j], F.m[j + 6]) ** 2 * 0.2, 0, hot * lit * 0.4, j / Mh, rl(j, j + 6));
    }
    pulse(F, j => j, Mh, h * 2.4, sstep(0.38, 0.52, h) * (1 - sstep(0.8, 0.9, h)) * 0.5, 0.1);
    const a = sstep(0.6, 0.66, q) * (1 - sstep(0.9, 0.95, q));
    if (a > 0.01 && anchors.hero) {
      const t = tracer(F);
      for (let j = 0; j < Mh; j++) t.idx[j] = j;
      t.ni = Mh; t.sp = anchors.hero; t.u = sstep(0.62, 0.93, q) * 1.15 - 0.08; t.tail = 0.22; t.a = a;
    }
  }

  function buildContext(F, q) {
    fillLoose(F);
    const C = T.ctx, tx = byId.context.tx;
    const coreW0 = sstep(0.32, 0.46, q);
    const att = [];
    for (let k = 0; k < CT.length; k++) {
      const p = k * 0.016;
      att[k] = sstep(0.04 + p, 0.18 + p, q) * (1 - sstep(0.25 + p, 0.39 + p, q)) * (0.7 + 0.25 * ((k * 0.37) % 1));
    }
    const R = C.Rc, ringR = [0, 0.22, 0.45, 0.7];
    const slot = (s, out) => {
      const [rg, j, cn] = C.slots[s];
      if (rg === 0) { out[0] = V.cx; out[1] = V.cy; return; }
      const a = (j / cn) * TAU + q * (0.9 + 0.5 * rg) * (rg % 2 ? 1 : -1) + rg * 0.7;
      out[0] = V.cx + Math.cos(a) * R * ringR[rg];
      out[1] = V.cy + Math.sin(a) * R * ringR[rg] * 0.92;
    };
    const o = [0, 0];
    for (let i = 0; i < N; i++) {
      let x = lx[i], y = ly[i], m = 0, g = 0;
      if (i < C.nCl) {
        const k = C.nodeCl[i], at = att[k];
        const tr = 5 * at * (1 - at) * 4 * Math.sin(q * 46 + i * 1.7);
        x = mix(x, V.cx + C.ox[i] + tr, at); y = mix(y, V.cy + C.oy[i] + tr * 0.7, at);
        m = at; g = at * tx.heat * 0.8;
      }
      const s = C.slotOf[i];
      if (s >= 0) {
        const cw = sstep(0.28 + nd.st[i] * 0.06, 0.44 + nd.st[i] * 0.04, q);
        slot(s, o);
        x = mix(x, o[0], cw); y = mix(y, o[1], cw);
        m = Math.max(m, cw);
        g = Math.max(g, s === 0 ? 0.4 + 0.6 * sstep(0.46, 0.58, q) : (C.slots[s][0] === 1 ? 0.5 * sstep(0.48, 0.6, q) : 0));
      }
      F.x[i] = x; F.y[i] = y; F.m[i] = m; F.g[i] = g;
    }
    // tentativas (clusters) — rompem antes do núcleo
    for (const e of C.edges) {
      edge(F, e[0], e[1], att[e[2]] * (1 - coreW0) * 0.95, 0, tx.heat * 0.8, 0.0, Math.hypot(C.ox[e[0]] - C.ox[e[1]], C.oy[e[0]] - C.oy[e[1]]));
    }
    // núcleo: espinhas, anéis e radiais
    const nodeOf = s => C.perm[s];
    const counts3 = [1, 6, 12, 18];
    const cw2 = coreW0 * coreW0, heat = sstep(0.46, 0.6, q);
    for (let s = 1; s < C.nSlots; s++) {
      const [rg, j, cn] = C.slots[s];
      const next = C.ringStart[rg] + ((j + 1) % cn);
      const chord = 2 * R * ringR[rg] * Math.sin(Math.PI / cn) + 4, step = R * 0.24;
      edge(F, nodeOf(s), nodeOf(next), cw2 * 0.6, 0, heat * 0.5, 0.15 + rg * 0.2, chord);
      if (rg === 1) edge(F, nodeOf(0), nodeOf(s), cw2 * 0.7, 0, heat, 0.0, R * ringR[1]);
      if (rg === 2) edge(F, nodeOf(s), nodeOf(C.ringStart[1] + Math.floor((j * 6) / 12)), cw2 * 0.45, 0, heat * 0.5, 0.2, step);
      if (rg === 3) edge(F, nodeOf(s), nodeOf(C.ringStart[2] + Math.floor((j * 12) / 18)), cw2 * 0.35, 0, heat * 0.3, 0.3, step);
    }
    ring(F, V.cx, V.cy, R * 0.22, R * 0.2, 0, coreW0 * 0.16);
    for (let rg = 1; rg <= 3; rg++) {
      const cn = counts3[rg], st0 = C.ringStart[rg];
      pulse(F, j => nodeOf(st0 + (j % cn)), cn, (rg % 2 ? 1 : -1) * q * (3 + rg) + rg * 0.37, cw2 * 0.42, 0.12, true);
    }
    const a = sstep(0.34, 0.4, q) * (1 - sstep(0.62, 0.7, q));
    if (a > 0.01 && anchors.context) {
      const t = tracer(F);
      t.sp = anchors.context; t.ep = { x: V.cx, y: V.cy }; t.bend = 0.28;
      t.u = sstep(0.36, 0.58, q) * 1.12 - 0.06; t.tail = 0.3; t.a = a;
    }
  }

  function procCapture(F, f) {
    fillLoose(F);
    const cx = V.cx, cy = V.cy, mn = Math.min(V.w, V.h);
    const Rcap = mn * 0.2, maxD = Math.max(V.w, V.h) * 1.1;
    for (let j = 0; j < 8; j++) {
      const p = sstep(0.05 + nd.st[j] * 0.3, 0.7 + nd.st[j] * 0.28, f);
      const r0 = (0.55 + 0.45 * nd.st[j]) * maxD;
      const r = mix(r0, Rcap * (0.28 + 0.5 * nd.st[j]), p);
      const th = j * (TAU / 8) + 0.4 + (1 - p) * 1.5 + f * 0.7;
      F.x[j] = cx + Math.cos(th) * r; F.y[j] = cy + Math.sin(th) * r * 0.9;
      F.m[j] = 0.25 + 0.7 * p; F.g[j] = 0.35 + 0.65 * p;
      edge(F, j, 8, sstep(0.6, 0.98, p) * 0.85, 0, 0.9, 0.0);
    }
    F.x[8] = cx; F.y[8] = cy; F.m[8] = sstep(0.3, 0.8, f); F.g[8] = F.m[8];
    ring(F, cx, cy, Rcap, Rcap * 0.9, 0, 0.34 * sstep(0.08, 0.5, f));
    ring(F, cx, cy, Rcap * 1.7, Rcap * 1.53, 0, 0.14 * sstep(0.2, 0.7, f));
  }
  function procIdentify(F, f) {
    fillLoose(F);
    const P = T.proc.s1;
    for (let i = 0; i < P.n && i < N; i++) {
      const rise = sstep(0, 0.5, f + (1 - nd.st[i]) * 0.1);
      F.x[i] = V.cx + P.x[i] + Math.sin(f * 3 + i) * 3;
      F.y[i] = V.cy + P.y[i] + Math.cos(f * 3 + i * 1.3) * 3;
      F.m[i] = 0.55 + 0.4 * rise; F.g[i] = 0;
    }
    const ne = P.e.length;
    P.e.forEach((e, k) => {
      const hl = e[2] === 1;
      const reveal = sstep(0.1, 0.7, f * 1.25 - (k / ne) * 0.35);
      edge(F, e[0], e[1], hl ? 0.9 * reveal : 0.32, 0, hl ? reveal : 0, 0.0 + (k / ne) * 0.3, Math.hypot(P.x[e[0]] - P.x[e[1]], P.y[e[0]] - P.y[e[1]]));
      if (hl) { F.g[e[0]] = Math.max(F.g[e[0]], 0.7 * reveal); F.g[e[1]] = Math.max(F.g[e[1]], 0.7 * reveal); }
    });
  }
  function procBuild(F, f) {
    fillLoose(F);
    const P = T.proc.s2, nn = Math.min(P.n, N);
    for (let i = 0; i < nn; i++) {
      F.x[i] = V.cx + P.x[i]; F.y[i] = V.cy + P.y[i];
      F.m[i] = 0.9; F.g[i] = 0.25 * sstep(P.colOf[i] / 5, (P.colOf[i] + 1) / 5 + 0.2, f);
    }
    for (let s = 0; s < P.sat; s++) { const i = P.n + s; F.x[i] = V.cx + P.x[i]; F.y[i] = V.cy + P.y[i]; F.m[i] = 0.5; }
    P.e.forEach((e, k) => {
      const c = e[2], rev = sstep(c / 4.4, c / 4.4 + 0.3, f * 1.1);
      edge(F, e[0], e[1], 0.85 * rev, 1, 0.55 * rev, 0.5 + c * 0.1, Math.hypot(P.x[e[0]] - P.x[e[1]], P.y[e[0]] - P.y[e[1]]));
    });
    ring(F, V.cx, V.cy, V.w * 0.52, V.h * 0.46, 0, 0.05 * sstep(0.2, 0.9, f));
  }
  function procEvolve(F, f, h) {
    fillLoose(F);
    const P = T.proc.s3, n = Math.min(P.n, N);
    const x0 = V.cx - V.w * 0.43, dx = (V.w * 0.88) / 4;
    const sway = f + h * 2.2;
    for (let i = 0; i < n; i++) {
      const l = P.lvl[i], cn = P.lv[l], j = i - P.idx[l];
      const span = V.h * (0.1 + 0.2 * l) * (1 + 0.14 * Math.sin(sway * 1.4));
      const yy = cn === 1 ? 0 : (j - (cn - 1) / 2) * (span / (cn - 1));
      const wob = Math.sin(sway * 2.2 + j * 1.3 + l) * V.h * 0.018 * l;
      F.x[i] = x0 + l * dx + Math.sin(sway + j) * 3; F.y[i] = V.cy + yy + wob;
      const born = l <= 2 ? 1 : sstep(0.0, 0.8, f * 1.4 - (l - 2) * 0.22);
      F.m[i] = 0.9 * born + (i < 24 ? 0.1 : 0); F.g[i] = born * 0.3 + (i < 8 ? 0.3 : 0);
    }
    for (let i = 1; i < n; i++) {
      const l = P.lvl[i], born = l <= 2 ? 1 : sstep(0, 0.8, f * 1.4 - (l - 2) * 0.22);
      const lit = clamp(((f + h) * 1.1 - l * 0.22) / 0.3);
      edge(F, P.par[i], i, 0.8 * born, 0, 0.9 * lit * born, 0.75 + l * 0.06);
      const j = i - P.idx[l];
      if (l >= 3 && j + 1 < P.lv[l]) edge(F, i, i + 1, 0.4 * sstep(0.3, 1, f * 1.2 - (l - 3) * 0.2), 0, 0.6 * lit, 0.9);
    }
  }
  const procStates = [procCapture, procIdentify, procBuild, procEvolve];

  function buildProcess(F, q) {
    const h = hq(q), stepF = h * 4;
    const k = Math.min(3, Math.floor(stepF)), fr = clamp(stepF - k, 0, 1);
    const run = (S, st, f) => (st === 3 ? procEvolve(S, f, h) : procStates[st](S, f));
    run(PB, k, fr);
    if (k === 0) { copyF(F, PB); }
    else {
      run(PA, k - 1, 1);
      const e = sstep(0, 0.5, fr);
      fillLoose(F);
      for (let i = 0; i < N; i++) {
        F.x[i] = mix(PA.x[i], PB.x[i], e); F.y[i] = mix(PA.y[i], PB.y[i], e);
        F.m[i] = mix(PA.m[i], PB.m[i], e); F.g[i] = mix(PA.g[i], PB.g[i], e);
      }
      for (let i = 0; i < PA.ne; i++) edge(F, PA.ea[i], PA.eb[i], PA.ew[i] * (1 - sstep(0, 0.45, e)), PA.ek[i], PA.eh[i], PA.et[i], PA.er[i]);
      for (let i = 0; i < PB.ne; i++) edge(F, PB.ea[i], PB.eb[i], PB.ew[i] * sstep(0.5, 1, e), PB.ek[i], PB.eh[i], PB.et[i], PB.er[i]);
      for (let i = 0; i < PB.nr; i++) { const r = PB.rg[i]; ring(F, r.x, r.y, r.rx, r.ry, r.rot, r.a * sstep(0.4, 1, e)); }
      for (let i = 0; i < PA.nr; i++) { const r = PA.rg[i]; ring(F, r.x, r.y, r.rx, r.ry, r.rot, r.a * (1 - sstep(0, 0.6, e))); }
    }
    peel(F, sstep(0.88, 1, h), 34);
  }
  function copyF(dst, src) {
    for (let i = 0; i < N; i++) { dst.x[i] = src.x[i]; dst.y[i] = src.y[i]; dst.m[i] = src.m[i]; dst.g[i] = src.g[i]; }
    dst.ne = 0; dst.nr = 0; dst.ntr = 0; dst.halo = null; dst.peeled = false;
    for (let i = 0; i < src.ne; i++) edge(dst, src.ea[i], src.eb[i], src.ew[i], src.ek[i], src.eh[i], src.et[i], src.er[i]);
    for (let i = 0; i < src.nr; i++) { const r = src.rg[i]; ring(dst, r.x, r.y, r.rx, r.ry, r.rot, r.a); }
  }

  function buildFit(F, q) {
    fillLoose(F);
    const FT = T.fit, tx = byId.fit.tx;
    const fit = sstep(0.06, 0.4, q) * (1 - sstep(0.66, 0.92, q));
    const cx = V.cx, cy = V.cy;
    const rxB = V.w * 0.5, ryB = V.h * 0.5 * 0.7;
    F.x[0] = cx; F.y[0] = cy; F.m[0] = 0.4 + 0.6 * fit; F.g[0] = 0.5 + 0.4 * fit;
    const tilt = [0, 0, 0];
    for (let r = 0; r < 3; r++) tilt[r] = mix(FT.tilt0[r], FT.tiltFit[r], fit) + (q - 0.5) * 0.5;
    for (let i = 1; i < FT.n && i < N; i++) {
      const rg = FT.ringOf[i], cn = FT.counts[rg], j = FT.jOf[i];
      const a = (j / cn) * TAU + FT.rotSp[rg] * (q - 0.3) + FT.irA[i] * (1 - fit) * 0.9;
      const sc = FT.sc[rg] * (1 + FT.irR[i] * (1 - fit) * 0.32);
      const ex = Math.cos(a) * rxB * sc, ey = Math.sin(a) * ryB * sc, c = Math.cos(tilt[rg]), s = Math.sin(tilt[rg]);
      F.x[i] = cx + ex * c - ey * s; F.y[i] = cy + ex * s + ey * c;
      F.m[i] = Math.max(0.22, fit); F.g[i] = 0;
    }
    const heat = tx.heat, born = tx.born;
    for (let i = 1; i < FT.n && i < N; i++) {
      const rg = FT.ringOf[i], cn = FT.counts[rg], j = FT.jOf[i];
      const nxt = FT.starts[rg] + ((j + 1) % cn);
      const lit = clamp((born * 1.3 - j / cn) / 0.22);
      edge(F, i, nxt, 0.75 * Math.pow(fit, 1.2), 0, heat * lit, rg * 0.45);
      F.g[i] = Math.max(F.g[i], heat * lit * 0.6);
      if (rg === 0 && j % 2 === 0) edge(F, 0, i, 0.35 * fit, 0, heat * 0.4, 0.1);
    }
    for (let r = 0; r < 3; r++) {
      ring(F, cx, cy, rxB * FT.sc[r], ryB * FT.sc[r], tilt[r], 0.07 * fit + heat * 0.03);
      const st0 = FT.starts[r], cn = FT.counts[r];
      pulse(F, j => st0 + (j % cn), cn, (r % 2 ? -1 : 1) * q * (2.6 + r) + r * 0.31, fit * 0.45, 0.14, true);
    }
    // sinal percorre a órbita externa junto com a varredura do texto
    const a = heat * 0.95;
    if (a > 0.02) {
      const t = tracer(F), st0 = FT.starts[2], cn = FT.counts[2];
      for (let j = 0; j <= cn; j++) t.idx[j] = st0 + (j % cn);
      t.ni = cn + 1; t.u = clamp(tx.born * 1.0); t.tail = 0.24; t.a = a;
    }
  }

  function buildResult(F, q) {
    fillLoose(F);
    const R = T.res, tx = byId.result.tx;
    const org = sstep(0.06, 0.42, q);
    const x0 = mob ? W * 0.06 : W * 0.33, x1 = mob ? W * 0.94 : W * 0.95;
    const sp = V.h * (mob ? 0.16 : 0.17), cy = V.cy;
    const heat = tx.heat, born = tx.born;
    for (let l = 0; l < R.L; l++) {
      for (let k = 0; k < R.K; k++) {
        const i = l * R.K + k;
        if (i >= N) continue;
        const t = k / (R.K - 1), conv = sstep(0.58, 0.92, t);
        const off = (l - (R.L - 1) / 2) * sp * (1 - conv * 0.94);
        const wob = (1 - org) * (Math.sin(t * (5.5 + l * 0.9) + l * 1.7 + q * 6) * sp * 1.0 + (R.h1[i] - 0.5) * sp * 0.8);
        F.x[i] = x0 + t * (x1 - x0) + (1 - org) * (R.h2[i] - 0.5) * 44;
        F.y[i] = cy + off + wob;
        const lit = clamp((born * 1.2 - t) / 0.16);
        F.m[i] = 0.3 + 0.7 * org; F.g[i] = ((l === 1 || l === 3) ? heat * lit * 0.85 : heat * lit * 0.3);
      }
    }
    for (let l = 0; l < R.L; l++) {
      for (let k = 0; k < R.K - 1; k++) {
        const i = l * R.K + k, t = k / (R.K - 1);
        const lit = clamp((born * 1.2 - t) / 0.16), sel = (l === 1 || l === 3) ? 1 : 0.35;
        edge(F, i, i + 1, 0.18 + 0.52 * org, 0, heat * lit * sel, t);
        if (l < R.L - 1 && k % 2 === 0) edge(F, i, i + R.K + 1, (1 - org) * 0.28, 0, 0, 0);
      }
    }
    for (let l = 0; l < R.L; l++) pulse(F, k => l * R.K + k, R.K, q * 4.2 + l * 0.29, org * 0.42, 0.13);
    const a = heat;
    if (a > 0.02) {
      for (const l of [1, 3]) {
        if (l >= R.L) continue;
        const t = tracer(F);
        for (let k = 0; k < R.K; k++) t.idx[k] = l * R.K + k;
        t.ni = R.K; t.u = clamp(born * 1.04); t.tail = 0.28; t.a = a;
      }
    }
  }

  function buildContact(F, q) {
    fillLoose(F);
    const C = T.con, h = hq(q), tx = byId.contact.tx;
    const cta = anchors.cta || { x: V.cx, y: V.cy, w: 280, h: 52 };
    // anéis de espaçamento aditivo (halo), contidos pela margem esquerda da página
    const room = Math.max(cta.w * 0.5 + 14, cta.x - 10);
    const rxs = [cta.w * 0.5 + 22, cta.w * 0.5 + 52, cta.w * 0.5 + 84].map(v => Math.min(v, room));
    const rys = [cta.h * 0.5 + 20, cta.h * 0.5 + 46, cta.h * 0.5 + 76];
    let k = 0;
    for (let r = 0; r < 3; r++) {
      const cn = C.counts[r];
      for (let j = 0; j < cn; j++, k++) {
        if (k >= N) break;
        const conv = sstep(0.04 + nd.st[k] * 0.2, 0.46 + nd.st[k] * 0.2, h);
        const s = 1 + (1 - conv) * 0.3;
        const a = (j / cn) * TAU + (r % 2 ? -1 : 1) * h * 1.3 + r * 0.6;
        F.x[k] = mix(lx[k], cta.x + Math.cos(a) * rxs[r] * s, conv);
        F.y[k] = mix(ly[k], cta.y + Math.sin(a) * rys[r] * s, conv);
        F.m[k] = conv; F.g[k] = 0;
      }
    }
    const warm = sstep(0.5, 0.9, q);
    const gap = 30;
    for (let r = 0; r < 3; r++) {
      const cn = C.counts[r], st0 = C.starts[r];
      const chord = TAU * Math.sqrt((rxs[r] * rxs[r] + rys[r] * rys[r]) / 2) / cn;
      for (let j = 0; j < cn; j++) {
        const i = st0 + j, i2 = st0 + ((j + 1) % cn);
        if (i >= N || i2 >= N) continue;
        if (j % 6 !== 5) edge(F, i, i2, 0.5 * Math.min(F.m[i], F.m[i2]) ** 2, 0, warm * 0.8, 0.05 + r * 0.14, chord);
        if (r < 2 && j % 3 === 0) {
          const o = C.starts[r + 1] + Math.floor((j * C.counts[r + 1]) / cn);
          if (o < N) edge(F, i, o, 0.3 * Math.min(F.m[i], F.m[o]) ** 2, 0, warm * 0.5, 0.2 + r * 0.1, gap);
        }
      }
    }
    for (let r = 0; r < 3; r++) {
      const st0 = C.starts[r], cn = C.counts[r];
      pulse(F, j => st0 + (j % cn), cn, (r % 2 ? -1 : 1) * h * (2.2 + r) + r * 0.33, sstep(0.25, 0.6, h) * 0.4, 0.13, true);
    }
    const conv0 = sstep(0.2, 0.7, h);
    F.halo = { x: cta.x, y: cta.y, r: Math.max(cta.w, 240) * 0.95, a: 0.11 * conv0 };
    ring(F, cta.x, cta.y, rxs[0], rys[0], 0, 0.1 * conv0);
    const a = sstep(0.5, 0.56, q) * (1 - sstep(0.9, 0.98, q));
    if (a > 0.01 && anchors.contact) {
      const t = tracer(F);
      t.sp = anchors.contact; t.ep = { x: cta.x - cta.w * 0.46, y: cta.y }; t.bend = -0.22;
      t.u = sstep(0.52, 0.86, q) * 1.12 - 0.06; t.tail = 0.34; t.a = a;
    }
  }

  // Tool and execution: two independent tracks progressively connect, sharing
  // the same nodes and scroll energy as the rest of the page.
  function buildDifference(F, q) {
    fillLoose(F);
    const count = 18, formed = sstep(.06, .33, q), linked = sstep(.26, .72, q);
    const cx = mob ? W * .81 : W * .80;
    const cy = mob ? H * .7 : H * .40;
    const height = H * (mob ? .30 : .42), width = mob ? W * .18 : Math.min(W * .20, 300);
    for (let track = 0; track < 2; track++) {
      for (let j = 0; j < count; j++) {
        const i = track * count + j, u = j / (count - 1);
        const wave = Math.sin(u * TAU + q * 3) * width * .06 * (1 - linked);
        const x = cx + (track ? 1 : -1) * width * (.42 - linked * .22) + wave;
        const y = cy + (u - .5) * height;
        F.x[i] = mix(lx[i], x, formed); F.y[i] = mix(ly[i], y, formed);
        F.m[i] = formed; F.g[i] = formed * (.18 + linked * .35);
        if (j) edge(F, i-1, i, formed * .64, 0, linked * .65, track ? .8 : .08);
        if (track && j % 3 === 0) edge(F, j, i, linked * .55, 1, linked, u);
      }
      pulse(F, j => track * count + j, count, q * 2.2 + track * (1-linked) * .35, formed * .5);
    }
    if (anchors.difference && byId.difference.tx.heat > .05) {
      const t = tracer(F); t.sp = anchors.difference; t.ep = {x:cx,y:cy};
      t.bend = .12; t.u = sstep(.36,.88,q); t.tail = .18;
      t.a = byId.difference.tx.heat * .6;
    }
  }

  // History: two trajectories take different paths, then acquire a shared
  // direction. No dates, biography data or timelines are fabricated by the art.
  function buildAbout(F, q) {
    fillLoose(F);
    const count = 20, formed = sstep(.02, .22, q), join = sstep(.40,.84,q);
    const cx = mob ? W * .91 : W * .85;
    const cy = H * .66, width = mob ? W * .12 : W * .20, height = H * .48;
    for (let track = 0; track < 2; track++) {
      for (let j = 0; j < count; j++) {
        const i = track * count + j, u = j / (count - 1);
        const separate = 1 - join * sstep(.14,.88,u);
        const branch = Math.sin(u * Math.PI) * .16 * (1-join);
        const x = cx + (track ? 1 : -1) * width * (.32 + branch) * separate;
        const y = cy + (u-.5) * height;
        F.x[i] = mix(lx[i],x,formed); F.y[i] = mix(ly[i],y,formed);
        F.m[i] = formed; F.g[i] = formed * (.12 + join * u * .4);
        if (j) edge(F,i-1,i,formed * .65,0,join * u,track ? .8 : .02);
        if (track && j > 12 && j % 3 === 0) edge(F,j,i,join*.5,0,join,.4);
      }
      pulse(F,j=>track*count+j,count,q*2.5 + track*(1-join)*.24,formed*.5,.12);
    }
  }

  function buildJourney(F,q) {
    buildContext(F,q);
    const org = sstep(.18,.66,q), count=6;
    const left = mob ? W*.79 : W*.72, span=mob ? W*.13 : W*.24;
    const baseY = mob ? H*.68 : H*.48;
    for (let j=0;j<5;j++) {
      const cx=left+span*j/4, cy=baseY + Math.sin(j*.85)*H*.12;
      for (let k=0;k<count;k++) {
        const i=j*count+k, theta=k*TAU/count, radius=k===0?0:(mob?7:12);
        const x=cx+Math.cos(theta)*radius, y=cy+Math.sin(theta)*radius;
        F.x[i]=mix(F.x[i],x,org); F.y[i]=mix(F.y[i],y,org);
        F.m[i]=mix(F.m[i],.95,org); F.g[i]=Math.max(F.g[i]*(1-org),org*(.2+j*.06));
      }
    }
    for (let i=0;i<F.ne;i++) F.ew[i]*=1-org;
    for (let i=30;i<N;i++) {F.m[i]*=1-org*.85;F.g[i]*=1-org;}
    for (let j=0;j<5;j++) {
      for (let k=1;k<count;k++) edge(F,j*count,j*count+k,org*.3,0,org*.35,j/5);
      if (j<4) edge(F,j*count,(j+1)*count,org*.85,1,org*.7,j/4);
    }
    for (let i=0;i<F.nr;i++) F.rg[i].a*=1-org;
    pulse(F,j=>j*count,5,q*2.2,org*.7,.18);
  }

  const builderFor = id => ({ hero: buildHero, context: buildJourney, process: buildProcess, fit: buildFit, difference: buildDifference, result: buildResult, about: buildAbout, contact: buildContact }[id]);

  /* ─── Composição: voo entre formações ─── */

  /** Estado disperso. Além da deriva por posição de scroll, cada nó tem INÉRCIA própria (profundidade):
   *  ao rolar, a matéria próxima “avança” e a distante demora; ao parar, tudo volta elástico ao repouso. */
  function computeLoose() {
    const k = sy * 0.0018, off = (1 - intro) * 70, wind = clamp(SIG.v, -40, 40);
    for (let i = 0; i < N; i++) {
      const d = nd.depth[i], a = nd.amp[i];
      const lead = clamp((sy - lag[i]) * (0.10 + 0.22 * d), -50, 50);
      lx[i] = nd.rx[i] * W + Math.sin(k * (0.8 + d) + nd.ph1[i]) * a + Math.cos(nd.ph2[i]) * off
        + Math.sin(nd.ph1[i] * 2 + sy * 0.012) * wind * 0.5 * d;
      ly[i] = nd.ry[i] * H + Math.cos(k * (0.6 + d * 0.8) + nd.ph2[i]) * a * 0.8 + Math.sin(nd.ph1[i]) * off - lead;
    }
  }

  function compose(t, A, B) {
    if (!B || t <= 0) {
      for (let i = 0; i < N; i++) { X[i] = A.x[i]; Y[i] = A.y[i]; M[i] = A.m[i]; G[i] = A.g[i]; TAUN[i] = 0; FS[i] = 0; }
      return;
    }
    for (let i = 0; i < N; i++) {
      const tau = smooth(clamp((t - nd.st[i] * 0.16) / 0.80));
      TAUN[i] = tau;
      const ax = A.x[i], ay = A.y[i], dx = B.x[i] - ax, dy = B.y[i] - ay;
      const dist = Math.hypot(dx, dy) || 1, s = Math.sin(Math.PI * tau);
      const off = s * Math.min(mob ? 42 : 90, dist * nd.arc[i]) * nd.sg[i];
      X[i] = ax + dx * tau - (dy / dist) * off + Math.sin(nd.ph1[i] * 3 + t * 5) * s * 5;
      Y[i] = ay + dy * tau + (dx / dist) * off + Math.cos(nd.ph2[i] * 3 + t * 5) * s * 5;
      M[i] = mix(A.m[i], B.m[i], tau);
      FS[i] = s; FDX[i] = dx / dist; FDY[i] = dy / dist;
      G[i] = mix(A.g[i], B.g[i], tau) + (i < 8 ? s * 0.9 : s * 0.38 * (1 - nd.st[i]));
    }
  }

  /* ─── Reação aos sinais (scroll, ponteiro, foco, seleção, toque) ─── */

  const R_PTR = 190, R_FOC = 200, R_SEL = 230, PTR_MAX = 18;

  function react(now) {
    const pxn = ptr.nx - 0.5, pyn = ptr.ny - 0.5;
    const useP = ptr.s > 0.01, useF = foc.s > 0.01, useS = sel.s > 0.01, nR = ripples.length;
    for (let i = 0; i < N; i++) {
      let x = X[i], y = Y[i];
      const d = nd.depth[i], m = M[i], member = m > 0.5;
      // Scroll: a estrutura é elástica — estica com a velocidade e volta ao repouso (soltos já têm inércia própria)
      y -= clamp((sy - lag[i]) * 0.07, -14, 14) * m;

      // Cursor: paralaxe global + lente local. Deslocamento total limitado a 18 px, sem perseguição.
      let ox = pxn * 14 * d * ptr.s, oy = pyn * 10 * d * ptr.s, prox = 0;
      if (useP) {
        const dx = x - ptr.x, dy = y - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < R_PTR * R_PTR && d2 > 1) {
          const dd = Math.sqrt(d2), f = (1 - dd / R_PTR) ** 1.6 * ptr.s, amp = member ? -12 : 18;
          ox += dx / dd * amp * f; oy += dy / dd * amp * f; prox = f;
        }
      }
      const om = Math.hypot(ox, oy);
      if (om > PTR_MAX) { ox *= PTR_MAX / om; oy *= PTR_MAX / om; }
      x += ox; y += oy;

      // Foco de teclado: mesma resposta do cursor
      if (useF) {
        const dx = x - foc.x, dy = y - foc.y, d2 = dx * dx + dy * dy;
        if (d2 < R_FOC * R_FOC && d2 > 1) {
          const dd = Math.sqrt(d2), f = (1 - dd / R_FOC) ** 2 * foc.s, amp = member ? -8 : 14;
          x += dx / dd * amp * f; y += dy / dd * amp * f; prox = Math.max(prox, f);
        }
      }
      // Seleção de texto: a matéria se afasta do trecho selecionado
      if (useS) {
        const dx = x - sel.x, dy = y - sel.y, d2 = dx * dx + dy * dy;
        if (d2 < R_SEL * R_SEL && d2 > 1) { const dd = Math.sqrt(d2), f = (1 - dd / R_SEL) ** 2 * sel.s; x -= dx / dd * 10 * f; y -= dy / dd * 10 * f; }
      }
      // Toque / clique: onda local
      for (let r = 0; r < nR; r++) {
        const rp = ripples[r], age = now - rp.t0;
        const dx = x - rp.x, dy = y - rp.y, dd = Math.hypot(dx, dy) || 1, rad = age * 0.42;
        const w = Math.exp(-(((dd - rad) / 34) ** 2)) * (1 - age / 900);
        if (w > 0.01) { x += dx / dd * 12 * w; y += dy / dd * 12 * w; G[i] = Math.min(1, G[i] + w * 0.6); }
      }
      X[i] = x; Y[i] = y; PROX[i] = prox;
    }
  }

  /* ─── Desenho ─── */

  const spr = TONES.map(c => {
    const s = document.createElement('canvas'); s.width = s.height = 48;
    const g = s.getContext('2d'), gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},.55)`); gr.addColorStop(0.35, `rgba(${c[0]},${c[1]},${c[2]},.16)`); gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
    return s;
  });

  const nearSources = [];
  function gatherSources() {
    nearSources.length = 0;
    if (ptr.s > 0.02) nearSources.push([ptr.x, ptr.y, ptr.s, 170]);
    if (foc.s > 0.02) nearSources.push([foc.x, foc.y, foc.s, 190]);
    if (sel.s > 0.02) nearSources.push([sel.x, sel.y, sel.s, 240]);
  }

  // Cores de aresta pré-computadas: [posição na paleta 0..16][calor 0..4] → "rgb(...)"; a opacidade vai por globalAlpha.
  const ECOL = Array.from({ length: 17 }, (_, pi) => Array.from({ length: 5 }, (_, hi) => {
    const c = PAL[pi * 4], e = hi / 4;
    return `rgb(${(mix(47, c[0], e)) | 0},${(mix(123, c[1], e)) | 0},${(mix(255, c[2], e)) | 0})`;
  }));

  function drawEdges(F, wFn) {
    ctx.lineCap = 'round';
    let lw = -1, col = '';
    for (let k = 0; k < F.ne; k++) {
      const a = F.ea[k], b = F.eb[k];
      const wf = wFn(a, b);
      if (wf <= 0.01) continue;
      const ax = X[a], ay = Y[a], bx = X[b], by = Y[b];
      const L = Math.hypot(bx - ax, by - ay);
      const stretch = 1 - sstep(1.22, 1.95, L / (F.er[k] + 10));
      const w = F.ew[k] * wf * stretch;
      if (w <= 0.01) continue;
      let boost = 0;
      if (nearSources.length) {
        const mx = (ax + bx) * 0.5, my = (ay + by) * 0.5;
        for (const s of nearSources) { const d = Math.hypot(mx - s[0], my - s[1]); if (d < s[3]) boost = Math.max(boost, (1 - d / s[3]) * s[2]); }
      }
      const eh = clamp(F.eh[k] * wf + boost * 0.55 + SIG.e * 0.42 * wf);
      const hi = Math.round(eh * 4);
      const c = ECOL[Math.round(clamp(F.et[k] + boost * 0.15) * 16)][hi];
      if (c !== col) { ctx.strokeStyle = c; col = c; }
      const width = 0.8 + hi * 0.175;
      if (width !== lw) { ctx.lineWidth = width; lw = width; }
      ctx.globalAlpha = Math.min(0.9, w * (0.3 + 0.5 * eh + SIG.e * 0.18) + boost * 0.2 * w);
      ctx.beginPath(); ctx.moveTo(ax, ay);
      const ek = F.ek[k];
      if (ek > 0.02) {
        const mxe = (ax + bx) / 2;
        ctx.lineTo(mix(ax + (bx - ax) / 3, mxe, ek), mix(ay + (by - ay) / 3, ay, ek));
        ctx.lineTo(mix(ax + (bx - ax) * 2 / 3, mxe, ek), mix(ay + (by - ay) * 2 / 3, by, ek));
      }
      ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const path = new Float32Array(2 * (MAXN + 40)), cum = new Float32Array(MAXN + 40);
  const tail_ = { x: 0, y: 0 }, head_ = { x: 0, y: 0 };
  /** Ponto a distância `d` ao longo da polilinha (comprimentos acumulados em `cum`). */
  function pointAt(d, np, out) {
    let i = 1; while (i < np - 1 && cum[i] < d) i++;
    const seg = cum[i] - cum[i - 1] || 1, u = clamp((d - cum[i - 1]) / seg);
    out.x = mix(path[2 * i - 2], path[2 * i], u); out.y = mix(path[2 * i - 1], path[2 * i + 1], u);
  }
  function drawTracer(t, wgt) {
    const a = t.a * wgt;
    if (a < 0.01) return;
    let n = 0;
    if (t.sp) { path[n++] = t.sp.x; path[n++] = t.sp.y; }
    const firstNode = t.sp ? 1 : 0; // o primeiro trecho (texto → estrutura) pode ser longo
    if (t.ni) for (let i = 0; i < t.ni; i++) { path[n++] = X[t.idx[i]]; path[n++] = Y[t.idx[i]]; }
    if (t.ep) {
      if (t.sp && !t.ni && t.bend) { // curva suave texto → destino
        const sx = t.sp.x, sy_ = t.sp.y, ex = t.ep.x, ey = t.ep.y;
        const cx = (sx + ex) / 2 - (ey - sy_) * t.bend, cy = (sy_ + ey) / 2 + (ex - sx) * t.bend;
        n = 0;
        for (let k = 0; k <= 24; k++) { const u = k / 24, v = 1 - u; path[n++] = v * v * sx + 2 * v * u * cx + u * u * ex; path[n++] = v * v * sy_ + 2 * v * u * cy + u * u * ey; }
      } else { path[n++] = t.ep.x; path[n++] = t.ep.y; }
    }
    const np = n / 2;
    if (np < 2) return;
    let total = 0; cum[0] = 0;
    for (let i = 1; i < np; i++) { total += Math.hypot(path[2 * i] - path[2 * i - 2], path[2 * i + 1] - path[2 * i - 1]); cum[i] = total; }
    if (total < 4) return;
    const head = clamp(t.u) * total, tail = Math.max(0, head - t.tail * total);
    if (head <= 0.5) return;
    pointAt(tail, np, tail_); pointAt(head, np, head_);
    const grad = ctx.createLinearGradient(tail_.x, tail_.y, head_.x, head_.y);
    grad.addColorStop(0, 'rgba(139,92,246,0)');
    grad.addColorStop(0.35, `rgba(139,92,246,${(0.5 * a).toFixed(3)})`);
    grad.addColorStop(0.7, `rgba(47,123,255,${(0.8 * a).toFixed(3)})`);
    grad.addColorStop(1, `rgba(125,246,255,${(0.95 * a).toFixed(3)})`);
    ctx.strokeStyle = grad; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let pass = quality === 0 ? 1 : 0; pass < 2; pass++) {   // o halo largo é dispensável na qualidade leve
      ctx.globalAlpha = pass ? 1 : 0.22; ctx.lineWidth = (pass ? 1.7 : 6) * t.w;
      ctx.beginPath(); ctx.moveTo(tail_.x, tail_.y);
      for (let i = 1; i < np; i++) {
        if (cum[i] > tail && cum[i] < head) {
          const jump = (i > firstNode && t.ni) ? Math.hypot(path[2 * i] - path[2 * i - 2], path[2 * i + 1] - path[2 * i - 1]) : 0;
          if (jump > 150) ctx.moveTo(path[2 * i], path[2 * i + 1]); else ctx.lineTo(path[2 * i], path[2 * i + 1]);
        }
      }
      ctx.lineTo(head_.x, head_.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(230,252,255,${(0.9 * a).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(head_.x, head_.y, 2.4, 0, TAU); ctx.fill();
  }

  function drawRings(F, wgt) {
    for (let i = 0; i < F.nr; i++) {
      const r = F.rg[i], a = r.a * wgt;
      if (a < 0.006) continue;
      ctx.strokeStyle = `rgba(125,211,252,${a.toFixed(3)})`; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, Math.max(1, r.rx), Math.max(1, r.ry), r.rot, 0, TAU); ctx.stroke();
    }
    if (F.halo && F.halo.a * wgt > 0.004) {
      const h = F.halo, gr = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
      gr.addColorStop(0, `rgba(32,214,231,${(h.a * wgt).toFixed(3)})`);
      gr.addColorStop(0.5, `rgba(47,123,255,${(h.a * wgt * 0.45).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(47,123,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
    }
  }

  const TONE_RGB = TONES.map(t => `rgb(${t[0]},${t[1]},${t[2]})`);
  const FONT = {};
  const fontOf = px => FONT[px] || (FONT[px] = `${px}px ui-monospace,SFMono-Regular,Menlo,monospace`);
  const NA = new Float32Array(MAXN), NL = new Float32Array(MAXN);   // opacidade do glifo e “lente” por nó

  /** Rastros de inércia: cada nó solto deixa um cometa curto na direção REAL do seu movimento. Surge ao rolar
   *  e também no retorno elástico ao parar. Direções variadas — nunca colunas paralelas (sem “chuva de código”). */
  function drawScrollStreaks() {
    if (SIG.e < 0.02 || quality === 0) return;
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    ctx.globalAlpha = Math.min(0.26, 0.06 + SIG.e * 0.22);
    for (let t = 0; t < 3; t++) {
      ctx.strokeStyle = TONE_RGB[t];
      ctx.beginPath();
      for (const grp of GRP[t]) for (const i of grp) {
        if (i >= N || M[i] > 0.6) continue; // estruturas formadas permanecem nítidas
        const dx = X[i] - PX[i], dy = Y[i] - PY[i], sp = Math.hypot(dx, dy);
        if (sp < 0.8 || sp > 120) continue;
        const k = Math.min(34, sp * 5) / sp;
        ctx.moveTo(X[i] - dx * k, Y[i] - dy * k); ctx.lineTo(X[i], Y[i]);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Nós em duas passadas agrupadas por tom (e, nos glifos, por tamanho): fonte e cor mudam poucas vezes por frame
   *  e nenhuma string é montada por nó — era o maior custo de JavaScript no celular. */
  function drawNodes() {
    const flare = 1 + SIG.e * 0.7, grad = quality === 2;
    // Passada 1: brilho, trânsito, rastros e pontos
    for (let t = 0; t < 3; t++) {
      ctx.fillStyle = TONE_RGB[t]; ctx.strokeStyle = TONE_RGB[t];
      for (const grp of GRP[t]) for (const i of grp) {
        if (i >= N) continue;
        const m = M[i], lens = Math.sqrt(PROX[i]);
        const g = clamp(G[i] + SIG.e * 0.22 * m + lens * 0.55);
        const ambient = (0.15 + 0.14 * nd.depth[i]) * flare + lens * 0.5;
        const a = (ambient * (1 - m) + (0.62 + 0.3 * g) * m) * intro;
        NA[i] = a * (1 - 0.62 * m); NL[i] = lens;
        if (g > 0.25) { ctx.globalAlpha = Math.min(1, g * 0.9 * intro); ctx.drawImage(spr[t], X[i] - 14, Y[i] - 14, 28, 28); }
        const fs = FS[i];
        if (fs > 0.06) { // matéria em trânsito: rastro direcional, visível mesmo com o scroll parado
          const len = fs * (10 + 30 * nd.depth[i]), x0 = X[i] - FDX[i] * len, y0 = Y[i] - FDY[i] * len;
          ctx.lineWidth = 1.1;
          if (grad) { ctx.globalAlpha = 0.25 * fs * intro; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo((x0 + X[i]) / 2, (y0 + Y[i]) / 2); ctx.stroke(); }
          ctx.globalAlpha = 0.5 * fs * intro; ctx.beginPath(); ctx.moveTo(grad ? (x0 + X[i]) / 2 : x0, grad ? (y0 + Y[i]) / 2 : y0); ctx.lineTo(X[i], Y[i]); ctx.stroke();
          ctx.globalAlpha = 0.55 * fs * intro; ctx.beginPath(); ctx.arc(X[i], Y[i], 1.2 + fs * 0.9, 0, TAU); ctx.fill();
        }
        if (g > 0.2 || i < 8) { // rastro de sinal quando a matéria se move
          const dxp = X[i] - PX[i], dyp = Y[i] - PY[i], sp = Math.hypot(dxp, dyp);
          if (sp > 1.8 && sp < 180) {
            ctx.globalAlpha = Math.min(0.5, sp * 0.03 * Math.max(g, 0.4)); ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(X[i] - dxp * 2.6, Y[i] - dyp * 2.6); ctx.lineTo(X[i], Y[i]); ctx.stroke();
          }
        }
        if (m > 0.35) {
          ctx.globalAlpha = Math.min(0.95, a * (0.9 + g * 0.3));
          ctx.beginPath(); ctx.arc(X[i], Y[i], 1.5 + m * 0.9 + g * 1.4, 0, TAU); ctx.fill();
        }
      }
    }
    // Passada 2: glifos, um grupo (tom × tamanho) por vez
    ctx.textBaseline = 'middle';
    const step = thin;
    for (let t = 0; t < 3; t++) {
      ctx.fillStyle = TONE_RGB[t];
      for (let c = 0; c < 4; c++) {
        let fontSet = false;
        for (const i of GRP[t][c]) {
          if (i >= N) continue;
          const gA = NA[i], lens = NL[i], m = M[i];
          if (gA <= 0.02 || lens > 0.1) continue;                                       // lente: desenhado depois, ampliado
          if (!(m > 0.35 ? i % 3 === 0 : i % step === 0)) continue;
          if (!fontSet) { ctx.font = fontOf(SIZE_OF[c]); fontSet = true; }
          ctx.globalAlpha = Math.min(0.95, gA);
          ctx.fillText(GLYPHS[nd.glyph[i]], m > 0.35 ? X[i] + 6 : X[i], m > 0.35 ? Y[i] - 6 : Y[i]);
        }
      }
    }
    // Lente do cursor/foco: glifos revelados e ampliados
    for (let i = 0; i < N; i++) {
      const lens = NL[i], gA = NA[i];
      if (lens <= 0.1 || gA <= 0.02) continue;
      const m = M[i];
      ctx.fillStyle = TONE_RGB[nd.tone[i]]; ctx.font = fontOf(Math.round(nd.fs[i] + lens * 4));
      ctx.globalAlpha = Math.min(0.95, gA);
      ctx.fillText(GLYPHS[nd.glyph[i]], m > 0.35 ? X[i] + 6 : X[i], m > 0.35 ? Y[i] - 6 : Y[i]);
    }
    ctx.globalAlpha = 1;
  }

  /** Conexões ligadas ao cursor/foco: os nós mais próximos se conectam à fonte (alteram a “conexão” do campo). */
  const near4 = [[0, -1], [0, -1], [0, -1], [0, -1]];
  function linkSource(sx, sy_, strength, energy) {
    if (strength < 0.05) return;
    for (const n of near4) { n[0] = 0; n[1] = -1; }
    for (let i = 0; i < N; i++) {
      const p = PROX[i];
      if (p < 0.06) continue;
      let w = 0; // posição de menor proximidade entre os 4
      for (let k = 1; k < 4; k++) if (near4[k][0] < near4[w][0]) w = k;
      if (p > near4[w][0]) { near4[w][0] = p; near4[w][1] = i; }
    }
    for (const [p, i] of near4) {
      if (i < 0) continue;
      const a = Math.min(0.78, Math.sqrt(p) * strength * (0.62 + 0.45 * energy));
      const gr = ctx.createLinearGradient(sx, sy_, X[i], Y[i]);
      gr.addColorStop(0, `rgba(160,248,255,${Math.min(0.9, a * 0.9).toFixed(3)})`); // ponta clara no cursor
      gr.addColorStop(1, `rgba(139,92,246,${Math.min(0.9, a * 1.1).toFixed(3)})`);
      ctx.strokeStyle = gr; ctx.lineWidth = 1.15;
      ctx.beginPath(); ctx.moveTo(sx, sy_); ctx.lineTo(X[i], Y[i]); ctx.stroke();
    }
  }

  function drawInteraction(now) {
    linkSource(ptr.x, ptr.y, ptr.s, SIG.pe);
    if (foc.s > 0.05) linkSource(foc.x, foc.y, foc.s, 0.6);
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i], age = now - r.t0;
      if (age > 900) { ripples.splice(i, 1); continue; }
      const k = 1 - age / 900;
      const gr = ctx.createRadialGradient(r.x, r.y, Math.max(0, age * 0.42 - 6), r.x, r.y, age * 0.42 + 6);
      gr.addColorStop(0, 'rgba(32,214,231,0)'); gr.addColorStop(0.5, `rgba(125,211,252,${(0.38 * k).toFixed(3)})`); gr.addColorStop(1, 'rgba(139,92,246,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(r.x, r.y, age * 0.42 + 8, 0, TAU); ctx.fill();
    }
    if (sel.s > 0.03) { // seleção: sinal ligando o trecho aos nós mais próximos
      const cx = sel.x, cy = sel.y, best = [];
      for (let i = 0; i < N; i++) best.push([Math.hypot(X[i] - cx, Y[i] - cy), i]);
      best.sort((a, b) => a[0] - b[0]);
      for (let k = 0; k < 4; k++) {
        const i = best[k][1], gr = ctx.createLinearGradient(cx, cy, X[i], Y[i]);
        gr.addColorStop(0, `rgba(139,92,246,${(0.5 * sel.s).toFixed(3)})`); gr.addColorStop(1, `rgba(32,214,231,${(0.15 * sel.s).toFixed(3)})`);
        ctx.strokeStyle = gr; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(X[i], Y[i]); ctx.stroke();
      }
    }
  }

  // One signal remains between formations, crossing the lower edge of the
  // viewport. Its control point belongs to the same matter as the active scene.
  const signalPath = new Float32Array(98);
  function drawContinuity() {
    const end = si === NS - 1 ? 1 - sstep(.18, .65, scenes[si].q) : 1;
    if (end < .005) return;
    const edgeX = W - (mob ? 22 : Math.max(36, W * .035));
    const cx = clamp(mix(V.cx + V.w * .28, X[0], M[0] * .32),W*.55,W-22);
    const cy = clamp(Y[0], H * .3, H * .78);
    const strength = (mob ? .15 : .22) * end * intro;
    ctx.beginPath();
    for (let j = 0; j <= 48; j++) {
      const t = j / 48, u = 1 - t;
      const x = u*u*u*edgeX + 3*u*u*t*cx + 3*u*t*t*cx + t*t*t*edgeX;
      const y = u*u*u*(-40) + 3*u*u*t*(cy-H*.18) + 3*u*t*t*(cy+H*.3) + t*t*t*(H+70);
      signalPath[j*2] = x; signalPath[j*2+1] = y;
      if (j === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.lineWidth = .8; ctx.strokeStyle = 'rgb(47,123,255)';
    ctx.globalAlpha = strength; ctx.stroke();
    // Spatial phase is derived solely from scroll, including reverse movement.
    const phase = (sy / Math.max(1, VH * 1.35) + .76) % 1;
    const tip = phase * 48;
    for (let j = Math.max(1, Math.floor(tip)-7); j <= Math.min(48, Math.ceil(tip)); j++) {
      const heat = clamp(1 - Math.abs(j-tip)/8);
      ctx.globalAlpha = strength * heat * 2.6;
      ctx.strokeStyle = TONE_RGB[j % 3 === 0 ? 1 : 0]; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(signalPath[(j-1)*2],signalPath[(j-1)*2+1]);
      ctx.lineTo(signalPath[j*2],signalPath[j*2+1]); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawField(now) {
    const t0 = performance.now();
    ctx.clearRect(0, 0, W, H);
    gatherSources();
    const A = FA, B = st > 0 ? FB : null;
    const wA = B ? 1 - sstep(0, 0.35, st) : 1, wB = B ? sstep(0.65, 1, st) : 0;
    drawRings(A, wA); if (B) drawRings(B, wB);
    drawEdges(A, (a, b) => 1 - sstep(0, 0.3, Math.max(TAUN[a], TAUN[b])) * (B ? 1 : 0));
    if (B) drawEdges(B, (a, b) => sstep(0.7, 1, Math.min(TAUN[a], TAUN[b])));
    for (let i = 0; i < A.ntr; i++) drawTracer(A.tr[i], wA);
    if (B) for (let i = 0; i < B.ntr; i++) drawTracer(B.tr[i], wB);
    drawContinuity();
    drawScrollStreaks();
    drawNodes();
    drawInteraction(now);
    drawCost = drawCost * 0.9 + (performance.now() - t0) * 0.1;
  }

  /* ═════════════════════ Loop ═════════════════════ */

  function readAnchors() {
    const near = sc => sc.i === si || (st > 0 && sc.i === si + 1);
    for (const sc of scenes) if(sc.anchor) anchors[sc.id]=near(sc)?textEnd(sc):null;
    if (ctaEl && near(byId.contact)) {
      const r=rectAt(ctaEl);
      anchors.cta={x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};
    }
  }

  /** Proximidade do cursor a texto-chave e CTAs (leituras de layout, antes das escritas do frame). */
  const proxTo = (el, R) => {
    const r = rectAt(el);
    const dx = Math.max(r.left - ptr.x, 0, ptr.x - r.right), dy = Math.max(r.top - ptr.y, 0, ptr.y - r.bottom);
    return (1 - sstep(0, R, Math.hypot(dx, dy))) * ptr.s;
  };
  function readProximity() {
    const on = ptr.s > 0.02;
    for (const sc of scenes) {
      const near = on && (sc.i === si || (st > 0 && sc.i === si + 1));
      for (const g of sc.grads) g.prox = near ? proxTo(g.el, 170) : 0;
      for (const w of sc.words) w.prox = near ? proxTo(w.stack, 170) : 0;
      sc.ctaNear = near && sc.ctas.length ? proxTo(sc.ctas[0], 300) : 0;
    }
  }

  const ctaEl = $('[data-cta-origin="final"]');
  let navIdx = -1;
  const NAV_FOR = {hero:'#inicio', context:'#o-que-fazemos', process:'#como-funciona', about:'#quem-somos', contact:'#contato'};
  function syncNav() {
    const idx = st > 0.5 ? Math.min(NS - 1, si + 1) : si;
    if (idx === navIdx) return;
    navIdx = idx;
    const hash = NAV_FOR[scenes[idx].id] || null;
    $$('.nx-nav a').forEach(a => { if (a.getAttribute('href') === hash) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }

  /** 1 — SINAIS: transforma o que o visitante faz em números contínuos (SIG). */
  function sense(now, dt) {
    ty = scrollY;
    sy += (ty - sy) * (1 - Math.exp(-dt / (coarse ? 22 : 38)));
    if (Math.abs(ty - sy) < 0.25) sy = ty;

    // scroll: velocidade (px por frame de 60 Hz) e energia (sobe rápido, decai devagar)
    const v = (sy - prevSy) * (16.7 / dt); prevSy = sy;
    SIG.v += (v - SIG.v) * (1 - Math.exp(-dt / 110));
    if (Math.abs(SIG.v) < 0.02) SIG.v = 0;
    const eT = clamp(Math.abs(SIG.v) / 40);
    SIG.e += (eT - SIG.e) * (1 - Math.exp(-dt / (eT > SIG.e ? 70 : 420)));
    if (SIG.e < 0.003) SIG.e = 0;

    // inércia por profundidade: cada nó persegue o scroll com a sua própria constante de tempo
    let lagBusy = 0;
    for (let i = 0; i < N; i++) {
      lag[i] += (sy - lag[i]) * (1 - Math.exp(-dt / nd.tau[i]));
      const dl = Math.abs(sy - lag[i]);
      if (dl > lagBusy) lagBusy = dl;
    }
    SIG.lagBusy = lagBusy;

    // ponteiro: posição suavizada, presença e velocidade
    ptr.x += (ptr.tx - ptr.x) * (1 - Math.exp(-dt / 110)); ptr.y += (ptr.ty - ptr.y) * (1 - Math.exp(-dt / 110));
    ptr.nx = ptr.x / Math.max(1, W); ptr.ny = ptr.y / Math.max(1, VH);
    ptr.s += ((ptr.on ? 1 : 0) - ptr.s) * (1 - Math.exp(-dt / 160));
    const pv = Math.hypot(ptr.x - prevPx, ptr.y - prevPy); prevPx = ptr.x; prevPy = ptr.y;
    const pT = clamp(pv / 14);
    SIG.pe += (pT - SIG.pe) * (1 - Math.exp(-dt / (pT > SIG.pe ? 60 : 320)));
    if (SIG.pe < 0.004) SIG.pe = 0;

    foc.s += (foc.tgt - foc.s) * (1 - Math.exp(-dt / 140));
    sel.s += (sel.tgt - sel.s) * (1 - Math.exp(-dt / 160));
  }

  const journeyFill = $('.nx-reading-progress span');
  function frame(now) {
    raf = 0;
    if (hidden) return;
    const frameStart = performance.now();
    const dt = Math.max(1, Math.min(64, now - (lastT || now - 16))); lastT = now;
    if (introStart < 0) introStart = now;
    intro = sstep(0, 1, (now - introStart) / 800);

    if (layoutDirty) {                    // só realoca o canvas se a LARGURA ou a altura estável (lvh) mudou
      if (innerWidth !== W || Math.abs((canvas.clientHeight || innerHeight) - H) > 2) resizeCanvas();
      measure();
    }

    sense(now, dt);                       // 1. sinais
    if (Math.abs(SIG.v) > 1.5) {          // governor: se rolar está pesado, a qualidade cai sozinha (e fica)
      slowEma = slowEma * 0.9 + (dt > 26 ? 0.1 : 0);
      if (slowEma > 0.35 && quality > 0 && now - lastQ > 1200) { lastQ = now; slowEma = 0; setQuality(quality - 1); }
    }
    updateProgress(sy); updateStory(sy);  // 2. linha do tempo
    readAnchors(); readProximity();       //    posições derivadas da geometria em cache
    updateText();                         // 3a. camada de texto
    syncNav();
    if (ambientEl) {
      const quiet=coarse || mob;
      if(quiet) {
        if(!ambientEl._quiet) {ambientEl.style.transform='none';ambientEl.style.opacity='.85';ambientEl._quiet=true;}
      } else {
        ambientEl._quiet=false;
        const ax=(ptr.nx-.5)*26*ptr.s, ay=(ptr.ny-.5)*18*ptr.s;
        ambientEl.style.transform=`translate3d(${ax.toFixed(1)}px,${ay.toFixed(1)}px,0)`;
        ambientEl.style.opacity=(.7+SIG.e*.25).toFixed(2);
      }
    }
    if (journeyFill) journeyFill.style.transform = `scaleX(${clamp(scrollY / Math.max(1, maxScroll)).toFixed(4)})`;

    // 3c. campo narrativo: formações por cena → voo → reação aos sinais → desenho
    computeLoose();
    const sA = scenes[si], sB = st > 0 ? scenes[Math.min(NS - 1, si + 1)] : null;
    builderFor(sA.id)(FA, sA.q);
    if (sB) builderFor(sB.id)(FB, sB.q);
    compose(st, FA, sB ? FB : null);
    react(now);
    const aOpacity=sA.id==='about'?.42:1, bOpacity=sB&&sB.id==='about'?.42:1;
    const fieldOpacity=mix(aOpacity,bOpacity,smooth(st));
    if(surface===canvas && (canvas._opacity===undefined || Math.abs(canvas._opacity-fieldOpacity)>.01)) {
      canvas._opacity=fieldOpacity;canvas.style.opacity=fieldOpacity.toFixed(2);
    }
    if (!havePrev) { PX.set(X); PY.set(Y); havePrev = true; }
    frameNo++;
    // Preserve cadence at every quality level. Reduce DPR and glyph detail
    // before sacrificing frames; the narrative remains synchronized with text.
    drawField(now);
    if(surface!==canvas) {
      // A single copy publishes the finished bitmap, including transparency.
      // The visible canvas is never cleared between draws on the mobile path.
      visibleCtx.setTransform(1,0,0,1,0,0);
      visibleCtx.globalAlpha=fieldOpacity;
      visibleCtx.globalCompositeOperation='copy';
      visibleCtx.drawImage(surface,0,0);
      visibleCtx.globalCompositeOperation='source-over';
      visibleCtx.globalAlpha=1;
      presents++;
    }
    draws++;
    PX.set(X); PY.set(Y);

    // magnetismo do CTA
    let magBusy = false;
    for (const m of magnets) {
      const ma = 1 - Math.exp(-dt / 65);
      m.cx += (m.tx - m.cx) * ma; m.cy += (m.ty - m.cy) * ma;
      m.el._nxMagX = m.cx; m.el._nxMagY = m.cy;
      if (Math.abs(m.cx - m.px) > 0.02 || Math.abs(m.cy - m.py) > 0.02) { m.el.style.setProperty('--tx', m.cx.toFixed(2) + 'px'); m.el.style.setProperty('--ty', m.cy.toFixed(2) + 'px'); m.px = m.cx; m.py = m.cy; }
      if (Math.abs(m.cx - m.tx) > 0.05 || Math.abs(m.cy - m.ty) > 0.05) magBusy = true;
    }

    // O render só continua enquanto algo ainda está mudando (sem animação autônoma)
    const busy = Math.abs(ty - sy) > 0.01 || SIG.e > 0 || SIG.v !== 0 || SIG.pe > 0 || SIG.lagBusy > 0.08 ||
      Math.abs(ptr.x - ptr.tx) > 0.4 || Math.abs(ptr.y - ptr.ty) > 0.4 ||
      Math.abs(ptr.s - (ptr.on ? 1 : 0)) > 0.01 || Math.abs(foc.s - foc.tgt) > 0.01 || Math.abs(sel.s - sel.tgt) > 0.01 ||
      ripples.length > 0 || intro < 1 || magBusy;
    frameCost = frameCost * .9 + (performance.now() - frameStart) * .1;
    if (busy) raf = requestAnimationFrame(frame);
    else lastT = 0;
  }
  const kick = () => { if (!raf && !hidden) raf = requestAnimationFrame(frame); };

  /* ═════════════════════ Eventos ═════════════════════ */

  addEventListener('scroll', () => {
    for(const m of magnets) {m.tx=0;m.ty=0;}
    activeMag=null;
    kick();
  }, {passive:true});
  addEventListener('resize', () => {
    // An address-bar height change must not remap the story or rebuild formations.
    const stableH=canvas.clientHeight || innerHeight;
    if(innerWidth!==W || Math.abs(stableH-H)>2 || !mob) layoutDirty=true;
    maxScroll=Math.max(0,root.scrollHeight-innerHeight);
    kick();
  }, {passive:true});
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; if (!hidden) { lastT = 0; kick(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layoutDirty = true; kick(); });
  if (window.ResizeObserver) new ResizeObserver(() => { layoutDirty = true; kick(); }).observe(document.body);
  addEventListener('pageshow', () => { layoutDirty = true; lastT = 0; kick(); });
  addEventListener('load', () => { layoutDirty = true; kick(); });

  // IntersectionObserver: estados de seção e economia de escrita em estilos
  if (window.IntersectionObserver) {
    const io = new IntersectionObserver(es => {
      for (const e of es) { const sc = scenes.find(s => s.el === e.target); if (sc) { sc.vis = e.isIntersecting; e.target.classList.toggle('is-active', e.isIntersecting); } }
      kick();
    }, { rootMargin: '60% 0px 60% 0px' });
    scenes.forEach(s => io.observe(s.el));
  } else scenes.forEach(s => { s.vis = true; });

  // Ponteiro: apenas atualiza alvos
  if (finePointer) {
    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      ptr.tx = e.clientX; ptr.ty = e.clientY;
      if (!ptr.on) { ptr.on = true; ptr.x = ptr.tx; ptr.y = ptr.ty; }
      kick();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { ptr.on = false; kick(); });
    addEventListener('blur', () => { ptr.on = false; kick(); });
  }
  // Toque / clique: onda local + equivalência do hover em texto-chave
  addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') {           // toque no celular não gera onda: ele só inicia a rolagem
      ripples.push({ x: e.clientX, y: e.clientY, t0: performance.now() });
      if (ripples.length > 4) ripples.shift();
    }
    const key = e.target.closest && e.target.closest('.nx-gradient-stack');
    if (key) { key.classList.add('is-touched'); clearTimeout(key._tt); key._tt = setTimeout(() => key.classList.remove('is-touched'), 1800); }
    kick();
  }, { passive: true });

  // Foco de teclado: mesma resposta do hover
  document.addEventListener('focusin', e => {
    const t = e.target;
    if (!t || !t.matches || !t.matches('a, button')) return;
    const r = t.getBoundingClientRect();
    foc.x = r.left + r.width / 2; foc.y = r.top + r.height / 2; foc.tgt = 1; kick();
  });
  document.addEventListener('focusout', () => { foc.tgt = 0; kick(); });

  // Seleção de texto altera conexões
  document.addEventListener('selectionchange', () => {
    const s = getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) { sel.tgt = 0; kick(); return; }
    const r = s.getRangeAt(0).getBoundingClientRect();
    if (!r.width && !r.height) { sel.tgt = 0; kick(); return; }
    sel.x = r.left + r.width / 2; sel.y = r.top + r.height / 2; sel.tgt = 1; kick();
  });

  // Magnetismo do CTA (máx. ±4px) — somente ponteiro fino.
  // Medido contra o retângulo-base (sem o deslocamento) para não tremer na borda do botão.
  let activeMag = null;
  if (finePointer) {
    $$('.nx-cta').forEach(el => {
      const m = { el, tx: 0, ty: 0, cx: 0, cy: 0, px: 0, py: 0, base: null };
      magnets.push(m);
      el.addEventListener('pointerenter', e => {
        if (e.pointerType === 'touch') return;
        const r = el.getBoundingClientRect();
        m.base = { l: r.left - m.cx, t: r.top - m.cy, w: r.width, h: r.height };
        activeMag = m;
      });
    });
    addEventListener('pointermove', e => {
      const m = activeMag;
      if (!m) return;
      const b = m.base, x = e.clientX, y = e.clientY;
      if (x < b.l - 6 || x > b.l + b.w + 6 || y < b.t - 6 || y > b.t + b.h + 6) { m.tx = 0; m.ty = 0; activeMag = null; }
      else { m.tx = clamp(((x - b.l) / b.w - 0.5) * 8, -4, 4); m.ty = clamp(((y - b.t) / b.h - 0.5) * 8, -4, 4); }
      kick();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', () => { if (activeMag) { activeMag.tx = 0; activeMag.ty = 0; activeMag = null; kick(); } });
  }

  /* ═════════════════════ Início ═════════════════════ */

  resizeCanvas();
  measure();
  ty = sy = prevSy = scrollY;
  for (let i = 0; i < N; i++) lag[i] = sy;
  kick();

  if (DEBUG) window.NEXUS_DEBUG = { ripples, magnets, SIG, X, Y, PROX, ptr, scenes, get quality() { return quality; }, get dpr() { return dpr; }, get story() { return { si, st, sy }; }, get nodes() { return N; }, get cost() { return drawCost; }, get frameCost() { return frameCost; }, get draws() { return draws; }, get frames() { return frameNo; }, get buffered() { return surface!==canvas; }, get presents() { return presents; }, get idle() { return !raf; } };
})();
