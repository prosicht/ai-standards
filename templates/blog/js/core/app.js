/* Blog shell.
   CORE FILE: `npx prosicht update` overwrites it. Never edit it inside a post.

   Renders js/post.js (hero + blocks) into index.html and owns everything
   around the content: the mini-markdown, scroll reveals, reading progress,
   the top bar and table of contents, the image lightbox, compare / hotspot /
   stats / code / video blocks, sim figures (mounted when they come near,
   paused while off-screen, ‹ › stepper for staged sims), scrolly blocks
   (sticky figure driven by text steps), sources and footnotes. Each figure's
   live part comes from js/sims/<id>.js (+ css/sims/<id>.css). The contract
   between them is AGENTS.md.

   Published posts run inside a CSP sandbox (opaque origin): no storage, and a
   <base href> injected by the server, so in-page links are handled here with
   absolute URLs instead of bare '#id'. */

const KIT_VERSION = '1.0.0';
const WORDS_PER_MINUTE = 200;

/* ----------------------------------------------------------------- strings */

const STRINGS = {
  tr: {
    minRead: (n) => `${n} dk okuma`,
    minLeft: (n) => `${n} dk kaldı`,
    done: 'Bitti',
    toc: 'İçindekiler',
    sources: 'Kaynaklar',
    source: 'Kaynak',
    accessed: 'erişim',
    top: 'Başa dön',
    scroll: 'Kaydır',
    zoom: 'Büyüt',
    close: 'Kapat',
    prev: 'Önceki',
    next: 'Sonraki',
    replay: 'Baştan oynat',
    copy: 'Kopyala',
    copied: 'Kopyalandı',
    selected: 'Seçildi: Ctrl+C ile kopyalayın',
    link: 'Bağlantıyı kopyala',
    linkCopied: 'Bağlantı kopyalandı',
    before: 'Önce',
    after: 'Sonra',
    compare: 'Karşılaştırma',
    hotspots: 'Noktalara dokunun',
    simMissing: 'Simülasyon dosyası bulunamadı',
    simError: 'Simülasyon hata verdi',
    imageMissing: 'Görsel bulunamadı',
    unknownBlock: 'Bilinmeyen blok türü',
    postError: 'js/post.js yüklenemedi',
    postEmpty: 'js/post.js içinde blok yok',
    kit: 'Pro Sicht blog altyapısı',
  },
  en: {
    minRead: (n) => `${n} min read`,
    minLeft: (n) => `${n} min left`,
    done: 'Done',
    toc: 'Contents',
    sources: 'Sources',
    source: 'Source',
    accessed: 'accessed',
    top: 'Back to top',
    scroll: 'Scroll',
    zoom: 'Enlarge',
    close: 'Close',
    prev: 'Previous',
    next: 'Next',
    replay: 'Replay',
    copy: 'Copy',
    copied: 'Copied',
    selected: 'Selected: press Ctrl+C to copy',
    link: 'Copy link',
    linkCopied: 'Link copied',
    before: 'Before',
    after: 'After',
    compare: 'Comparison',
    hotspots: 'Tap the points',
    simMissing: 'Simulation file not found',
    simError: 'Simulation failed',
    imageMissing: 'Image not found',
    unknownBlock: 'Unknown block type',
    postError: 'Could not load js/post.js',
    postEmpty: 'js/post.js has no blocks',
    kit: 'Pro Sicht blog kit',
  },
};

/* ------------------------------------------------------------------ helpers */

const $ = (id) => document.getElementById(id);
const html = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const plain = (text) => String(text || '').replace(/<br\s*\/?>/gi, ' ').replace(/[*=`]/g, '').replace(/\[\^[\w-]+\]/g, '').replace(/\s+/g, ' ').trim();
const countWords = (text) => (String(text || '').match(/[\p{L}\p{N}]+/gu) || []).length;
const warn = (message) => console.warn(`[blog] ${message}`);
const easeOut = (k) => 1 - (1 - k) ** 3;
const easeInOut = (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);
const ID_PATTERN = /^[a-z0-9-]+$/;
let uidCounter = 0;
const uid = (prefix) => `${prefix}-${(uidCounter += 1)}`;

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function button(className, label, text = label) {
  const node = h('button', className, text);
  node.type = 'button';
  node.setAttribute('aria-label', label);
  node.title = label;
  return node;
}

/* rAF animation for shell-owned motion (sims use their engine instead).
   fn(k) with k from 0 to 1 after easing. Returns cancel(). */
function animate(duration, fn, { ease = easeOut, done } = {}) {
  let raf = 0;
  let start = 0;
  const tick = (now) => {
    start ||= now;
    const k = clamp((now - start) / duration);
    fn(ease(k));
    if (k < 1) raf = requestAnimationFrame(tick);
    else done?.();
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

const slug = (text) => plain(text)
  .toLocaleLowerCase('tr')
  .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c])
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  .slice(0, 48) || 'bolum';

/* In-page link that survives the <base href> of a published post. */
const anchorHref = (id) => `${location.pathname}${location.search}#${id}`;

/* ---------------------------------------------------------------- the post */

let post = {};
let blocks = [];
let loadError = null;
try {
  const mod = await import('../post.js');
  post = mod.post && typeof mod.post === 'object' ? mod.post : {};
  blocks = Array.isArray(mod.blocks) ? mod.blocks : [];
} catch (error) {
  loadError = error;
  console.error('[blog] js/post.js:', error);
}

const lang = STRINGS[post.lang] ? post.lang : 'tr';
const t = STRINGS[lang];
html.lang = post.lang || 'tr';
if (post.theme) html.dataset.theme = post.theme;

const sources = Array.isArray(post.sources) ? post.sources.filter((s) => s && typeof s === 'object') : [];
const sourceIndex = new Map(sources.map((s, i) => [String(s.id), i]));
const postInfo = Object.freeze({ title: plain(post.title), lang, author: post.author || '', date: post.date || '' });

/* ---------------------------------------------------------------- validate */

const TYPES = {
  text: ['md'],
  heading: ['title'],
  image: ['src', 'alt'],
  gallery: ['images'],
  compare: ['before', 'after'],
  hotspots: ['src', 'alt', 'points'],
  quote: ['text'],
  stats: ['items'],
  callout: ['md'],
  code: ['code'],
  video: ['src'],
  sim: ['sim'],
  scrolly: ['steps'],
  divider: [],
};
const SIZES = new Set(['column', 'wide', 'full']);
const DEFAULT_SIZE = {
  image: 'wide', gallery: 'wide', compare: 'wide', hotspots: 'wide', video: 'wide',
  sim: 'wide', stats: 'wide', scrolly: 'full',
};

function checkSrc(where, src) {
  if (!src) return;
  if (/^(https?:)?\/\//i.test(src)) warn(`${where}: "${src}" is remote. Published posts cannot load remote files; copy it into assets/`);
  else if (src.startsWith('/')) warn(`${where}: "${src}" starts with "/". Use a relative path such as assets/images/x.webp`);
}

function validate() {
  if (!post.title) warn('js/post.js: post.title is missing');
  const hero = post.hero || {};
  if (hero.layout === 'plain' && (hero.sim || hero.image)) warn('js/post.js post.hero: layout "plain" shows no media; use "full" or "split"');
  if (hero.image) checkSrc('post.hero.image', hero.image.src);
  if (hero.sim && !ID_PATTERN.test(hero.sim)) warn(`post.hero.sim "${hero.sim}" must use a-z, 0-9 and - only`);

  const seenSources = new Set();
  sources.forEach((s, i) => {
    if (!s.id) warn(`post.sources[${i}]: id is missing`);
    else if (seenSources.has(String(s.id))) warn(`post.sources[${i}]: duplicate id "${s.id}"`);
    seenSources.add(String(s.id));
    if (!s.title) warn(`post.sources[${i}]: title is missing`);
  });

  const seen = new Set();
  blocks.forEach((b, i) => {
    const where = `js/post.js blocks[${i}]${b?.type ? ` (${b.type})` : ''}`;
    if (!b || typeof b !== 'object') { warn(`${where} is not an object`); return; }
    if (!TYPES[b.type]) { warn(`${where}: unknown type "${b.type}"`); return; }
    for (const key of TYPES[b.type]) {
      if (b[key] == null || b[key] === '' || (Array.isArray(b[key]) && !b[key].length)) warn(`${where}: ${key} is missing`);
    }
    if (b.id != null) {
      if (!ID_PATTERN.test(b.id)) warn(`${where}: id "${b.id}" must use a-z, 0-9 and - only`);
      if (seen.has(b.id)) warn(`${where}: duplicate id "${b.id}"`);
      seen.add(b.id);
    }
    if (b.sim && !ID_PATTERN.test(b.sim)) warn(`${where}: sim "${b.sim}" must use a-z, 0-9 and - only`);
    if (b.size && !SIZES.has(b.size)) warn(`${where}: unknown size "${b.size}" (column | wide | full)`);
    checkSrc(where, b.src);
    for (const img of [b.before, b.after, ...(b.images || [])]) {
      if (!img) continue;
      checkSrc(where, img.src);
      if (!img.src) warn(`${where}: an image has no src`);
      if (img.alt == null) warn(`${where}: ${img.src || 'an image'} has no alt text`);
    }
    if (b.type === 'scrolly') {
      if (!b.sim && !b.images?.length) warn(`${where}: needs sim or images`);
      if (b.images && b.steps && b.images.length > b.steps.length) warn(`${where}: ${b.images.length} images but ${b.steps.length} steps`);
    }
    if (b.type === 'hotspots') {
      (b.points || []).forEach((p, k) => {
        if (!(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1)) warn(`${where}: points[${k}] needs x and y between 0 and 1`);
      });
    }
  });
}

/* -------------------------------------------------------------- rich text */

/* Titles: <br> line breaks and *accent* words, nothing else. words: wrap
   each word for the rise animation. */
function renderRich(node, raw, { words = false } = {}) {
  node.replaceChildren();
  let wordIndex = 0;
  String(raw || '').split(/<br\s*\/?>/i).forEach((line, lineIndex) => {
    if (lineIndex > 0) node.append(document.createElement('br'));
    for (const part of line.split(/(\*[^*]+\*)/g)) {
      if (!part) continue;
      const accent = part.length > 2 && part.startsWith('*') && part.endsWith('*');
      const text = accent ? part.slice(1, -1) : part;
      if (!words) {
        node.append(accent ? h('em', null, text) : text);
        continue;
      }
      for (const token of text.split(/(\s+)/)) {
        if (!token) continue;
        if (/^\s+$/.test(token)) { node.append(' '); continue; }
        const word = h('span', accent ? 'w em' : 'w');
        word.style.setProperty('--i', String(wordIndex));
        wordIndex += 1;
        word.append(h('span', null, token));
        node.append(word);
      }
    }
  });
  return node;
}

/* Inline markdown: `code`, **bold**, *italic*, ==highlight==, [label](url),
   [^source-id] footnotes and <br>. Everything else is text, never HTML. */
const INLINE = /`([^`]+)`|\*\*(.+?)\*\*|\*(\S(?:.*?\S)?)\*|==(.+?)==|\[\^([\w-]+)\]|\[([^\]]+)\]\(([^)\s]+)\)|<br\s*\/?>/g;

function inline(parent, text) {
  const src = String(text ?? '');
  let last = 0;
  for (const m of src.matchAll(INLINE)) {
    if (m.index > last) parent.append(src.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1] != null) parent.append(h('code', null, m[1]));
    else if (m[2] != null) inline(parent.appendChild(h('strong')), m[2]);
    else if (m[3] != null) inline(parent.appendChild(h('em')), m[3]);
    else if (m[4] != null) inline(parent.appendChild(h('mark')), m[4]);
    else if (m[5] != null) parent.append(footnote(m[5]));
    else if (m[6] != null) parent.append(link(m[6], m[7]));
    else parent.append(h('br'));
  }
  if (last < src.length) parent.append(src.slice(last));
  return parent;
}

function link(label, url) {
  const href = String(url).trim();
  if (/^(javascript|data|vbscript):/i.test(href)) return inline(h('span'), label);
  const a = inline(h('a'), label);
  if (href.startsWith('#')) {
    a.href = anchorHref(href.slice(1));
    a.dataset.anchor = href.slice(1);
  } else {
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  return a;
}

function footnote(id) {
  const i = sourceIndex.get(id);
  if (i == null) {
    warn(`footnote [^${id}] has no entry in post.sources`);
    return h('sup', 'fn fn--missing', '?');
  }
  const src = sources[i];
  const tip = [src.title, src.publisher].filter(Boolean).join(' · ');
  const a = h('a', null, String(i + 1));
  a.href = anchorHref(`src-${id}`);
  a.dataset.anchor = `src-${id}`;
  a.dataset.tip = tip;
  a.setAttribute('aria-label', `${t.source} ${i + 1}: ${tip}`);
  const sup = h('sup', 'fn');
  sup.append(a);
  return sup;
}

/* Block markdown: paragraphs (blank line between), ### / #### subheadings,
   - and 1. lists, > quotes and --- rules. */
function markdown(md) {
  const frag = document.createDocumentFragment();
  let para = [];
  let quote = [];
  let list = null;
  const flushPara = () => { if (para.length) frag.append(inline(h('p'), para.join(' '))); para = []; };
  const flushQuote = () => {
    if (quote.length) {
      const bq = h('blockquote');
      inline(bq.appendChild(h('p')), quote.join(' '));
      frag.append(bq);
    }
    quote = [];
  };
  const flushAll = () => { flushPara(); flushQuote(); list = null; };

  for (const raw of String(md ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { flushAll(); continue; }
    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      flushAll();
      if (heading[1].length === 2) warn('"## " inside a text block: use a { type: \'heading\' } block for sections (it feeds the table of contents)');
      frag.append(inline(h(heading[1].length === 4 ? 'h4' : 'h3'), heading[2]));
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line)) { flushAll(); frag.append(h('hr')); continue; }
    const ul = line.match(/^[-*•]\s+(.*)$/);
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      flushQuote();
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) {
        list = { ordered, node: h(ordered ? 'ol' : 'ul') };
        frag.append(list.node);
      }
      list.node.append(inline(h('li'), (ul || ol)[1]));
      continue;
    }
    if (line.startsWith('>')) { flushPara(); list = null; quote.push(line.replace(/^>\s?/, '')); continue; }
    if (list) { list.node.lastChild.append(' '); inline(list.node.lastChild, line); continue; }
    flushQuote();
    para.push(line);
  }
  flushAll();
  return frag;
}

/* ------------------------------------------------------------------ reveal */

const onReveal = new WeakMap();
const revealObserver = reducedMotion ? null : new IntersectionObserver((entries) => {
  let n = 0;
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const node = entry.target;
    revealObserver.unobserve(node);
    node.style.setProperty('--rv-delay', `${Math.min(n, 5) * 80}ms`);
    n += 1;
    node.classList.add('is-in');
    onReveal.get(node)?.();
  }
}, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

/* Adds the scroll-in animation to node; fn runs once when it first shows. */
function reveal(node, fn) {
  node.classList.add('rv');
  if (fn) onReveal.set(node, fn);
  if (revealObserver) revealObserver.observe(node);
  else { node.classList.add('is-in'); fn?.(); }
  return node;
}

/* Shows a not yet revealed node at once, without its entrance offset: an
   anchor jump must measure where the node will really sit. */
function revealNow(node) {
  if (!node || node.classList.contains('is-in')) return;
  revealObserver?.unobserve(node);
  node.style.transition = 'none';
  node.classList.add('is-in');
  void node.offsetWidth;
  node.style.transition = '';
  onReveal.get(node)?.();
}

/* ----------------------------------------------------------------- toast */

let toastTimer = 0;
function toast(message) {
  const node = $('toast');
  node.textContent = message;
  node.dataset.show = 'true';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.dataset.show = 'false'; }, 1800);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------- images */

function imageEl(img, { lazy = true, className = '' } = {}) {
  const node = h('img', className || null);
  node.alt = img?.alt || '';
  if (lazy) node.loading = 'lazy';
  node.decoding = 'async';
  node.draggable = false;
  if (img?.position) node.style.objectPosition = img.position;
  node.addEventListener('error', () => {
    console.error(`[blog] image not found: ${img?.src}`);
    node.hidden = true;
    const box = h('span', 'img-missing');
    box.append(h('strong', null, t.imageMissing), h('code', null, img?.src || '?'));
    node.after(box);
  }, { once: true });
  if (img?.src) node.src = img.src;
  return node;
}

function ratioOf(value) {
  if (value == null) return '';
  return String(value).replace(':', '/');
}

function caption(fig, b, extra) {
  if (!b.caption && !b.credit && !extra) return null;
  const cap = h('figcaption', 'cap');
  if (b.caption) inline(cap.appendChild(h('span', 'cap-text')), b.caption);
  if (b.credit) cap.append(h('span', 'cap-credit', b.credit));
  if (extra) cap.append(extra);
  fig.append(cap);
  return cap;
}

/* --------------------------------------------------------------- lightbox */

const lightbox = (() => {
  const root = $('lightbox');
  const img = $('lb-img');
  const cap = $('lb-cap');
  const count = $('lb-count');
  const closeBtn = $('lb-close');
  const prevBtn = $('lb-prev');
  const nextBtn = $('lb-next');
  closeBtn.setAttribute('aria-label', t.close);
  prevBtn.setAttribute('aria-label', t.prev);
  nextBtn.setAttribute('aria-label', t.next);
  let list = [];
  let origins = [];
  let index = 0;
  let lastFocus = null;
  let closing = false;

  function flip(from, reverse) {
    if (reducedMotion || !from) return Promise.resolve();
    const a = from.getBoundingClientRect();
    const b = img.getBoundingClientRect();
    if (!a.width || !b.width || a.bottom < 0 || a.top > innerHeight) return Promise.resolve();
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - (b.top + b.height / 2);
    const s = Math.max(a.width / b.width, a.height / b.height);
    const frames = [{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.4 }, { transform: 'none', opacity: 1 }];
    if (reverse) frames.reverse();
    return img.animate(frames, { duration: reverse ? 320 : 460, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }).finished.catch(() => {});
  }

  function show(i, dir = 0) {
    index = (i + list.length) % list.length;
    const item = list[index];
    img.getAnimations().forEach((a) => a.cancel());
    img.src = item.src;
    img.alt = item.alt || '';
    cap.replaceChildren();
    if (item.caption) inline(cap.appendChild(h('span', 'cap-text')), item.caption);
    if (item.credit) cap.append(h('span', 'cap-credit', item.credit));
    count.textContent = list.length > 1 ? `${index + 1} / ${list.length}` : '';
    prevBtn.hidden = nextBtn.hidden = list.length < 2;
    if (dir && !reducedMotion) {
      img.animate(
        [{ opacity: 0, transform: `translateX(${dir * 48}px) scale(.98)` }, { opacity: 1, transform: 'none' }],
        { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' },
      );
    }
  }

  async function open(items, i, froms = []) {
    list = items;
    origins = froms;
    lastFocus = document.activeElement;
    root.hidden = false;
    html.classList.add('is-locked');
    show(i);
    closeBtn.focus({ preventScroll: true });
    if (reducedMotion) return;
    root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    try { await img.decode(); } catch { /* shown anyway */ }
    flip(origins[index], false);
  }

  async function close() {
    if (root.hidden || closing) return;
    closing = true;
    if (!reducedMotion) {
      const fade = root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' });
      await Promise.all([flip(origins[index], true), fade.finished.catch(() => {})]);
      fade.cancel();
    }
    img.getAnimations().forEach((a) => a.cancel());
    root.hidden = true;
    html.classList.remove('is-locked');
    img.removeAttribute('src');
    closing = false;
    lastFocus?.focus?.({ preventScroll: true });
  }

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => show(index - 1, -1));
  nextBtn.addEventListener('click', () => show(index + 1, 1));
  root.addEventListener('click', (event) => { if (event.target === root || event.target.classList.contains('lb-figure')) close(); });

  /* swipe between images on touch screens */
  let touch = null;
  root.addEventListener('touchstart', (event) => { touch = event.touches.length === 1 ? event.touches[0].clientX : null; }, { passive: true });
  root.addEventListener('touchend', (event) => {
    if (touch == null || list.length < 2) return;
    const dx = event.changedTouches[0].clientX - touch;
    touch = null;
    if (Math.abs(dx) > 60) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });

  function key(event) {
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowLeft' && list.length > 1) show(index - 1, -1);
    else if (event.key === 'ArrowRight' && list.length > 1) show(index + 1, 1);
    else if (event.key === 'Tab') {
      const items = [closeBtn, prevBtn, nextBtn].filter((b) => !b.hidden);
      const at = items.indexOf(document.activeElement);
      event.preventDefault();
      items[(at + (event.shiftKey ? -1 : 1) + items.length) % items.length].focus();
    } else return;
    event.preventDefault();
  }

  return { open, close, key, get isOpen() { return !root.hidden; } };
})();

/* ---------------------------------------------------------------- figures */

/* Every live sim (hero, sim blocks, scrolly blocks) is a figure: mounted when
   it comes near the viewport, paused while it is off-screen. */
const figures = new Map();
const simCache = new Map();
const cssCache = new Map();

function loadCss(href) {
  if (!cssCache.has(href)) {
    cssCache.set(href, new Promise((resolve) => {
      const node = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
      node.onload = () => resolve();
      node.onerror = () => { warn(`${href} not found`); resolve(); };
      document.head.append(node);
    }));
  }
  return cssCache.get(href);
}

function loadSim(id) {
  if (!simCache.has(id)) {
    simCache.set(id, (async () => {
      try {
        const mod = await import(`../sims/${id}.js`);
        if (typeof mod.default !== 'function') return { error: new Error('missing `export default function mount(root, ctx)`') };
        if (mod.css) await loadCss(`css/sims/${id}.css`);
        return { mod };
      } catch (error) {
        /* Chrome, Firefox and Safari word a 404 on import() differently */
        const missing = /dynamically imported module|module script failed|error loading/i.test(String(error?.message));
        return { error, missing };
      }
    })());
  }
  return simCache.get(id);
}

const nearObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    nearObserver.unobserve(entry.target);
    mountFigure(figures.get(entry.target));
  }
}, { rootMargin: '600px 0px' });

const seenObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const f = figures.get(entry.target);
    if (!f) continue;
    f.visible = entry.isIntersecting;
    try { f.api?.setPaused?.(!f.visible); } catch { /* sim gone */ }
  }
}, { threshold: 0 });

function emptyBox() {
  const node = h('div', 'sim-empty');
  node.hidden = true;
  const title = h('p', 'sim-empty-title');
  const note = h('p', 'sim-empty-note');
  node.append(title, note);
  return { node, title, note };
}

/* f: { kind: 'hero' | 'sim' | 'scrolly', simId, block, watch, host, empty, steps?, step } */
function registerFigure(f) {
  f.visible = false;
  f.state = null;
  f.step ??= 0;
  figures.set(f.watch, f);
  nearObserver.observe(f.watch);
  seenObserver.observe(f.watch);
  return f;
}

function showEmpty(f, { error, missing } = {}) {
  const file = `js/sims/${f.simId}.js`;
  f.empty.title.textContent = missing ? t.simMissing : t.simError;
  f.empty.note.textContent = missing ? file : `${file}: ${error?.message || error}`;
  f.empty.node.hidden = false;
  console.error(`[blog] ${file}:`, error || t.simMissing);
}

async function mountFigure(f) {
  if (!f || f.state) return;
  f.state = 'loading';
  const loaded = await loadSim(f.simId);
  if (!loaded || loaded.error) {
    f.state = 'error';
    showEmpty(f, loaded || {});
    return;
  }
  try {
    f.api = loaded.mod.default(f.host, {
      block: Object.freeze({ ...f.block }),
      post: postInfo,
      lang,
      paused: !f.visible,
      reducedMotion,
      enter: 'start',
      scrolly: f.kind === 'scrolly',
      onStage: (i, count) => paintStages(f, i, count),
      onChange: (detail) => document.dispatchEvent(new CustomEvent('sim:change', { detail: { id: f.block.id || f.simId, detail } })),
    });
    if (!f.api || typeof f.api.destroy !== 'function') throw new Error('mount() must return sim.api({ reset, step })');
    f.state = 'live';
    if (f.kind === 'scrolly') f.api.goto?.(f.step);
    f.api.setPaused?.(!f.visible);
    if (f.replay) f.replay.hidden = false;
  } catch (error) {
    try { f.api?.destroy?.(); } catch { /* half mounted */ }
    f.api = null;
    f.host.replaceChildren();
    f.state = 'error';
    showEmpty(f, { error });
  }
}

function paintStages(f, i, count) {
  if (f.kind === 'scrolly' && !f.warnedCount && f.block.steps && count !== f.block.steps.length) {
    f.warnedCount = true;
    warn(`scrolly "${f.simId}": the sim has ${count} stages but the block has ${f.block.steps.length} steps`);
  }
  f.steps?.paint(i, count);
}

function stepper(f) {
  const node = h('span', 'fig-steps');
  node.hidden = true;
  const prev = button('fig-btn', t.prev, '‹');
  const next = button('fig-btn', t.next, '›');
  const dots = h('span', 'fig-dots');
  const count = h('span', 'fig-count');
  node.append(prev, dots, count, next);
  prev.addEventListener('click', () => { try { f.api?.step?.(-1); } catch (error) { console.error('[blog] step:', error); } });
  next.addEventListener('click', () => { try { f.api?.step?.(1); } catch (error) { console.error('[blog] step:', error); } });
  return {
    node,
    paint(i, n) {
      node.hidden = n < 2;
      if (n < 2) return;
      if (dots.children.length !== n) dots.replaceChildren(...Array.from({ length: n }, () => h('i')));
      [...dots.children].forEach((dot, k) => dot.classList.toggle('on', k <= i));
      count.textContent = `${i + 1}/${n}`;
      prev.disabled = i <= 0;
      next.disabled = i >= n - 1;
    },
  };
}

function heights(stage, b, fallback) {
  stage.style.setProperty('--h', `${Number(b.height) || fallback}px`);
  if (b.mobileHeight) stage.style.setProperty('--h-m', `${Number(b.mobileHeight)}px`);
}

/* ----------------------------------------------------------------- blocks */

const headings = [];
const parallax = [];
const playObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const video = entry.target;
    if (entry.isIntersecting) video.play?.().catch(() => {});
    else video.pause?.();
  }
}, { threshold: 0.25 });
const closers = new Set();

const RENDER = {
  text(b) {
    const node = h('div', `b-text${b.lead ? ' b-text--lead' : ''}`);
    node.append(markdown(b.md));
    for (const child of node.children) reveal(child);
    return node;
  },

  heading(b) {
    const id = b.id || slug(b.title);
    const node = h('h2', 'b-heading');
    node.id = id;
    if (b.kicker) node.append(h('span', 'h-kicker', b.kicker));
    node.append(renderRich(h('span', 'h-title'), b.title));
    const anchor = h('a', 'h-anchor', '#');
    anchor.href = anchorHref(id);
    anchor.dataset.anchor = id;
    anchor.dataset.copy = 'true';
    anchor.setAttribute('aria-label', t.link);
    anchor.title = t.link;
    node.append(anchor);
    headings.push({ id, title: plain(b.title), kicker: b.kicker || '', node });
    reveal(node);
    return node;
  },

  image(b) {
    const fig = h('figure', `b-image fx-${b.effect || 'wipe'}`);
    const zoomable = b.zoom !== false;
    const frame = zoomable ? button('img-frame', `${t.zoom}: ${b.alt || ''}`, null) : h('div', 'img-frame');
    const img = imageEl(b);
    const ratio = ratioOf(b.ratio) || (b.effect === 'parallax' ? '16/9' : '');
    if (ratio) { frame.style.aspectRatio = ratio; frame.classList.add('has-ratio'); }
    if (b.effect === 'parallax') parallax.push({ frame, img });
    frame.append(img);
    if (zoomable) frame.addEventListener('click', () => lightbox.open([b], 0, [frame]));
    fig.append(frame);
    caption(fig, b);
    reveal(fig);
    return fig;
  },

  gallery(b) {
    const list = (b.images || []).filter(Boolean);
    const fig = h('figure', 'b-gallery');
    const grid = h('div', 'gal-grid');
    grid.style.setProperty('--cols', String(b.columns || Math.min(3, list.length || 1)));
    const frames = list.map((img, i) => {
      const frame = button('img-frame gal-item', `${t.zoom}: ${img.alt || ''}`, null);
      frame.style.aspectRatio = ratioOf(img.ratio || b.ratio || '4/3');
      frame.style.setProperty('--d', `${i * 90}ms`);
      frame.append(imageEl(img));
      if (img.caption) frame.append(h('span', 'gal-cap', plain(img.caption)));
      grid.append(frame);
      return frame;
    });
    frames.forEach((frame, i) => frame.addEventListener('click', () => lightbox.open(list, i, frames)));
    fig.append(grid);
    caption(fig, b);
    reveal(fig);
    return fig;
  },

  compare(b) {
    const fig = h('figure', 'b-compare');
    const box = h('div', 'cmp');
    const after = imageEl(b.after, { className: 'cmp-after' });
    const beforeWrap = h('div', 'cmp-before');
    beforeWrap.append(imageEl(b.before));
    const handle = h('div', 'cmp-handle');
    handle.tabIndex = 0;
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-label', b.label || t.compare);
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    handle.append(h('i', 'cmp-knob'));
    box.append(
      after, beforeWrap,
      h('span', 'cmp-tag cmp-tag--before', b.before?.label || t.before),
      h('span', 'cmp-tag cmp-tag--after', b.after?.label || t.after),
      handle,
    );
    const start = clamp(b.start ?? 0.5);
    let x = start;
    let stopIntro = null;
    const set = (v) => {
      x = clamp(v);
      box.style.setProperty('--x', `${x * 100}%`);
      handle.setAttribute('aria-valuenow', String(Math.round(x * 100)));
    };
    const takeOver = () => { stopIntro?.(); stopIntro = null; };
    set(start);

    let dragging = false;
    const at = (event) => {
      const r = box.getBoundingClientRect();
      return (event.clientX - r.left) / (r.width || 1);
    };
    box.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      dragging = true;
      takeOver();
      box.setPointerCapture(event.pointerId);
      box.classList.add('is-drag');
      set(at(event));
    });
    box.addEventListener('pointermove', (event) => { if (dragging) set(at(event)); });
    const end = () => { dragging = false; box.classList.remove('is-drag'); };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);
    handle.addEventListener('keydown', (event) => {
      const step = event.shiftKey ? 0.1 : 0.02;
      const moves = { ArrowLeft: x - step, ArrowRight: x + step, Home: 0, End: 1 };
      if (moves[event.key] == null) return;
      event.preventDefault();
      takeOver();
      set(moves[event.key]);
    });

    fig.append(box);
    caption(fig, b);
    /* first view: one slow sweep shows the reader that the divider moves */
    reveal(fig, () => {
      if (reducedMotion) return;
      const path = [start, clamp(start - 0.22, 0.06, 0.94), clamp(start + 0.16, 0.06, 0.94), start];
      stopIntro = animate(2200, (k) => {
        const seg = Math.min(2, Math.floor(k * 3));
        const local = easeInOut(k * 3 - seg);
        set(path[seg] + (path[seg + 1] - path[seg]) * local);
      }, { ease: (k) => k, done: () => { stopIntro = null; } });
    });
    return fig;
  },

  hotspots(b) {
    const points = (b.points || []).filter(Boolean);
    const fig = h('figure', 'b-hotspots');
    const box = h('div', 'hs');
    const media = h('div', 'hs-media');
    media.append(imageEl(b));
    const card = h('div', 'hs-card');
    card.id = uid('hs');
    card.hidden = true;
    const cardNum = h('span', 'hs-card-num');
    const cardTitle = h('strong', 'hs-card-title');
    const cardText = h('p', 'hs-card-text');
    card.append(cardNum, cardTitle, cardText);
    let open = -1;

    const pins = points.map((p, i) => {
      const pin = h('button', 'hs-pin', String(i + 1));
      pin.type = 'button';
      pin.style.left = `${clamp(p.x) * 100}%`;
      pin.style.top = `${clamp(p.y) * 100}%`;
      pin.style.setProperty('--d', `${300 + i * 120}ms`);
      pin.setAttribute('aria-expanded', 'false');
      pin.setAttribute('aria-controls', card.id);
      pin.setAttribute('aria-label', `${i + 1}. ${plain(p.title)}`);
      pin.addEventListener('click', (event) => { event.stopPropagation(); toggle(i); });
      media.append(pin);
      return pin;
    });

    function toggle(i) {
      open = open === i ? -1 : i;
      pins.forEach((pin, k) => {
        pin.setAttribute('aria-expanded', String(k === open));
        pin.classList.toggle('is-open', k === open);
      });
      if (open < 0) { card.hidden = true; return; }
      const p = points[open];
      cardNum.textContent = String(open + 1);
      cardTitle.replaceChildren();
      inline(cardTitle, p.title || '');
      cardText.replaceChildren();
      inline(cardText, p.text || '');
      card.style.setProperty('--x', `${clamp(p.x) * 100}%`);
      card.style.setProperty('--y', `${clamp(p.y) * 100}%`);
      card.dataset.side = p.x > 0.56 ? 'left' : 'right';
      card.dataset.v = p.y > 0.7 ? 'up' : p.y < 0.22 ? 'down' : 'mid';
      card.hidden = false;
      if (!reducedMotion) card.animate([{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    const close = () => { if (open >= 0) toggle(open); };
    closers.add(close);
    document.addEventListener('click', (event) => { if (!box.contains(event.target)) close(); });

    box.append(media, card);
    fig.append(box);
    caption(fig, b, h('span', 'cap-hint', t.hotspots));
    reveal(fig);
    return fig;
  },

  quote(b) {
    const fig = h('figure', 'b-quote');
    const bq = h('blockquote');
    inline(bq.appendChild(h('p')), b.text);
    fig.append(h('span', 'q-mark', '“'), bq);
    if (b.cite) fig.append(inline(h('figcaption'), b.cite));
    reveal(fig);
    return fig;
  },

  stats(b) {
    const fig = h('figure', 'b-stats');
    const grid = h('div', 'stats-grid');
    const items = (b.items || []).filter(Boolean).map((it, i) => {
      const cell = h('div', 'stat');
      cell.style.setProperty('--d', `${i * 110}ms`);
      const num = h('span', 'stat-num');
      const val = h('span', 'stat-val');
      if (it.prefix) num.append(h('span', 'stat-affix', it.prefix));
      num.append(val);
      if (it.suffix) num.append(h('span', 'stat-affix', it.suffix));
      const label = inline(h('span', 'stat-label'), it.label || '');
      if (it.source) label.append(footnote(it.source));
      cell.append(num, label);
      grid.append(cell);
      const value = typeof it.value === 'number' ? it.value : null;
      const digits = it.decimals ?? 0;
      const nf = new Intl.NumberFormat(html.lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
      val.textContent = value == null ? String(it.value ?? '') : nf.format(reducedMotion ? value : 0);
      return { val, value, nf, delay: i * 110 };
    });
    fig.append(grid);
    caption(fig, b);
    reveal(fig, () => {
      for (const s of items) {
        if (s.value == null || reducedMotion) continue;
        setTimeout(() => animate(1500, (k) => { s.val.textContent = s.nf.format(s.value * k); }, { ease: (k) => 1 - (1 - k) ** 4 }), s.delay);
      }
    });
    return fig;
  },

  callout(b) {
    const node = h('aside', 'b-callout');
    node.dataset.tone = ['note', 'tip', 'warn'].includes(b.tone) ? b.tone : 'note';
    if (b.title) node.append(inline(h('p', 'callout-title'), b.title));
    node.append(markdown(b.md));
    reveal(node);
    return node;
  },

  code(b) {
    const fig = h('figure', 'b-code');
    const source = String(b.code ?? '').replace(/\n$/, '');
    const bar = h('div', 'code-bar');
    const copy = button('code-copy', t.copy);
    bar.append(h('span', 'code-lang', b.lang || ''), copy);
    const code = h('code');
    source.split('\n').forEach((line, i) => {
      if (i) code.append('\n');
      code.append(/^\s*(#|\/\/)/.test(line) ? h('span', 'code-comment', line) : line);
    });
    const pre = h('pre');
    pre.append(code);
    copy.addEventListener('click', async () => {
      if (await copyText(source)) {
        copy.textContent = t.copied;
        setTimeout(() => { copy.textContent = t.copy; }, 1600);
      } else {
        getSelection()?.selectAllChildren(code);
        toast(t.selected);
      }
    });
    fig.append(bar, pre);
    caption(fig, b);
    reveal(fig);
    return fig;
  },

  video(b) {
    const fig = h('figure', 'b-video');
    const frame = h('div', 'img-frame');
    const video = h('video');
    const auto = !b.controls && !reducedMotion;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.loop = b.loop !== false;
    video.preload = 'metadata';
    if (b.poster) video.poster = b.poster;
    if (b.alt) video.setAttribute('aria-label', b.alt);
    if (!auto) video.controls = true;
    video.addEventListener('error', () => {
      console.error(`[blog] video not found: ${b.src}`);
      const box = h('span', 'img-missing');
      box.append(h('strong', null, t.imageMissing), h('code', null, b.src));
      video.replaceWith(box);
    }, { once: true });
    video.src = b.src;
    if (b.ratio) frame.style.aspectRatio = ratioOf(b.ratio);
    frame.append(video);
    if (auto) playObserver.observe(video);
    fig.append(frame);
    caption(fig, b);
    reveal(fig);
    return fig;
  },

  sim(b) {
    const fig = h('figure', 'b-sim');
    const stage = h('div', `fig-stage${b.frame === false ? ' is-bare' : ''}`);
    heights(stage, b, 460);
    const host = h('div', 'sim-host');
    const empty = emptyBox();
    stage.append(host, empty.node);
    fig.append(stage);
    const f = { kind: 'sim', simId: b.sim, block: b, watch: stage, host, empty };
    f.steps = stepper(f);
    f.replay = button('fig-btn fig-replay', t.replay, '↺');
    f.replay.hidden = true;
    f.replay.addEventListener('click', () => { try { f.api?.reset?.(); } catch (error) { console.error('[blog] reset:', error); } });
    const tools = h('span', 'fig-tools');
    tools.append(f.steps.node, f.replay);
    const cap = caption(fig, b, tools);
    if (b.badge) cap.prepend(h('span', 'fig-badge', b.badge));
    registerFigure(f);
    reveal(fig);
    return fig;
  },

  scrolly(b) {
    const node = h('section', 'b-scrolly');
    node.dataset.side = b.side === 'left' ? 'left' : 'right';
    const figure = h('div', 'sc-figure');
    const sticky = h('div', 'sc-sticky');
    const stage = h('div', `fig-stage sc-stage${b.frame === false ? ' is-bare' : ''}`);
    heights(node, b, 580);
    sticky.append(stage);
    figure.append(sticky);

    const stepsWrap = h('div', 'sc-steps');
    const steps = (b.steps || []).map((md, i) => {
      const step = h('div', 'sc-step');
      const card = h('div', 'sc-card');
      card.append(markdown(typeof md === 'string' ? md : md?.md));
      step.append(card);
      stepsWrap.append(step);
      stepTargets.set(step, (active) => active && setStep(i));
      stepObserver.observe(step);
      return step;
    });
    node.append(figure, stepsWrap);

    let f = null;
    let images = null;
    if (b.sim) {
      const host = h('div', 'sim-host');
      const empty = emptyBox();
      stage.append(host, empty.node);
      f = registerFigure({ kind: 'scrolly', simId: b.sim, block: b, watch: node, host, empty });
      f.replay = button('fig-btn sc-replay', t.replay, '↺');
      f.replay.hidden = true;
      f.replay.addEventListener('click', () => {
        try { f.api?.reset?.(); f.api?.goto?.(f.step); } catch (error) { console.error('[blog] reset:', error); }
      });
      stage.append(f.replay);
    } else {
      const wrap = h('div', `sc-images${b.fit === 'contain' ? ' is-contain' : ''}`);
      images = (b.images || []).map((img, i) => {
        const layer = h('div', 'sc-img');
        layer.append(imageEl(img, { lazy: i > 1 }));
        if (img.caption || img.credit) layer.append(h('span', 'sc-img-cap', [plain(img.caption), img.credit].filter(Boolean).join(' · ')));
        wrap.append(layer);
        return layer;
      });
      stage.append(wrap);
    }

    function setStep(i) {
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      node.dataset.step = String(i);
      if (images) images.forEach((im, k) => im.classList.toggle('is-on', k === Math.min(i, images.length - 1)));
      if (f) {
        f.step = i;
        try { f.api?.goto?.(i); } catch (error) { console.error('[blog] goto:', error); }
      }
    }
    setStep(0);
    return node;
  },

  divider() {
    const node = h('div', 'b-divider');
    node.setAttribute('aria-hidden', 'true');
    node.append(h('i'), h('i'), h('i'));
    reveal(node);
    return node;
  },
};

/* Scrolly steps: the step crossing the middle band of the viewport is active. */
const stepTargets = new WeakMap();
const stepObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) stepTargets.get(entry.target)?.(entry.isIntersecting);
}, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

function unknownBlock(b, i) {
  const node = h('div', 'b-unknown');
  node.append(h('strong', null, `${t.unknownBlock}: ${b?.type ?? '?'}`), h('code', null, `js/post.js blocks[${i}]`));
  return node;
}

function renderBlock(b, i) {
  if (!b || typeof b !== 'object' || !RENDER[b.type]) return unknownBlock(b, i);
  try {
    const node = RENDER[b.type](b, i);
    const size = SIZES.has(b.size) ? b.size : DEFAULT_SIZE[b.type] || 'column';
    node.classList.add(`size-${size}`);
    node.dataset.block = b.type;
    if (b.id && !node.id) node.id = b.id;
    return node;
  } catch (error) {
    console.error(`[blog] js/post.js blocks[${i}] (${b.type}):`, error);
    return unknownBlock(b, i);
  }
}

/* ------------------------------------------------------------ reading time */

function readingMinutes() {
  if (Number(post.readingTime) > 0) return Math.round(post.readingTime);
  let words = countWords(plain(post.title)) + countWords(post.dek);
  let seconds = 0;
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;
    words += countWords(plain([b.md, b.title, b.text, b.caption, ...(b.steps || []).map((s) => (typeof s === 'string' ? s : s?.md))].filter(Boolean).join(' ')));
    if (b.type === 'image' || b.type === 'video') seconds += 10;
    if (b.type === 'gallery') seconds += 6 * (b.images?.length || 0);
    if (b.type === 'compare') seconds += 15;
    if (b.type === 'hotspots') seconds += 8 + 6 * (b.points?.length || 0);
    if (b.type === 'stats') seconds += 4 * (b.items?.length || 0);
    if (b.type === 'sim') seconds += 30;
    if (b.type === 'scrolly') seconds += 20;
  }
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE + seconds / 60));
}

function formatDate(value) {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(value || '');
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Intl.DateTimeFormat(html.lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

/* -------------------------------------------------------------------- hero */

function renderHero(minutes) {
  const hero = post.hero || {};
  const hasMedia = Boolean(hero.sim || hero.image);
  const layout = ['full', 'split', 'plain'].includes(hero.layout) ? hero.layout : hasMedia ? 'full' : 'plain';
  const node = h('header', 'hero');
  node.id = 'top';
  node.dataset.layout = layout;

  let media = null;
  if (layout !== 'plain' && hasMedia) {
    media = h('div', 'hero-media');
    if (hero.sim) {
      const stage = h('div', 'fig-stage hero-stage');
      const host = h('div', 'sim-host');
      const empty = emptyBox();
      stage.append(host, empty.node);
      media.append(stage);
      registerFigure({ kind: 'hero', simId: hero.sim, block: { type: 'hero', id: 'hero', sim: hero.sim }, watch: node, host, empty });
    } else {
      media.append(imageEl(hero.image, { lazy: false, className: 'hero-img' }));
      if (hero.image.credit) media.append(h('span', 'hero-credit', hero.image.credit));
    }
    node.append(media);
  }

  const inner = h('div', 'hero-inner');
  if (post.kicker) inner.append(h('p', 'hero-kicker', post.kicker));
  inner.append(renderRich(h('h1', 'hero-title'), post.title || '', { words: !reducedMotion }));
  if (post.dek) inner.append(inline(h('p', 'hero-dek'), post.dek));
  const meta = h('p', 'hero-meta');
  const parts = [post.author, formatDate(post.date), t.minRead(minutes)].filter(Boolean);
  parts.forEach((part, i) => {
    if (i) meta.append(h('span', 'hero-dot', '·'));
    meta.append(h('span', null, part));
  });
  inner.append(meta);
  if (Array.isArray(post.tags) && post.tags.length) {
    const tags = h('p', 'hero-tags');
    for (const tag of post.tags) tags.append(h('span', 'ui-chip', tag));
    inner.append(tags);
  }
  node.append(inner);

  if (layout === 'full') {
    const cue = button('hero-cue', t.scroll, null);
    cue.append(h('span', null, t.scroll), h('i'));
    cue.addEventListener('click', () => {
      $('article')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
    node.append(cue);
  }
  /* parallax and fade only for the full-bleed hero */
  return { node, media: layout === 'full' ? media : null, inner };
}

/* ----------------------------------------------------------- sources, end */

function renderSources() {
  const node = h('section', 'b-sources size-column');
  node.id = 'kaynaklar';
  node.append(h('h2', 'sources-title', t.sources));
  const list = h('ol', 'sources-list');
  for (const s of sources) {
    const li = h('li');
    li.id = `src-${s.id}`;
    const title = s.url ? link(s.title || s.url, s.url) : h('span', null, s.title || '');
    title.classList.add('src-title');
    li.append(title);
    const meta = [s.publisher, s.year, s.accessed ? `${t.accessed}: ${formatDate(s.accessed)}` : ''].filter(Boolean).join(' · ');
    if (meta) li.append(h('span', 'src-meta', meta));
    if (s.note) li.append(inline(h('span', 'src-note'), s.note));
    list.append(li);
  }
  node.append(list);
  reveal(node);
  return node;
}

function renderEnd() {
  const node = h('footer', 'post-end');
  const who = h('div', 'end-who');
  if (post.author) who.append(h('strong', null, post.author));
  if (post.date) who.append(h('span', null, formatDate(post.date)));
  const top = button('end-top', t.top, `↑ ${t.top}`);
  top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
  node.append(who, top, h('p', 'end-kit', `${t.kit} · ${KIT_VERSION}`));
  return node;
}

/* ---------------------------------------------------------------- chrome */

function startChrome({ hero, minutes }) {
  const bar = $('topbar');
  const fill = $('progress-fill');
  const left = $('topbar-left');
  const toc = $('toc');
  const tocList = $('toc-list');
  const tocToggle = $('toc-toggle');
  const article = $('article');

  const titleLink = $('topbar-title');
  titleLink.textContent = plain(post.title);
  titleLink.href = anchorHref('top');
  titleLink.dataset.anchor = 'top';
  $('toc-title').textContent = t.toc;
  tocToggle.setAttribute('aria-label', t.toc);
  tocToggle.title = t.toc;
  $('toc-label').textContent = t.toc;

  const tocLinks = headings.map((item, i) => {
    const a = h('a', 'toc-link');
    a.href = anchorHref(item.id);
    a.dataset.anchor = item.id;
    a.append(h('span', 'toc-num', item.kicker || String(i + 1).padStart(2, '0')), h('span', 'toc-text', item.title));
    const li = h('li');
    li.append(a);
    tocList.append(li);
    return a;
  });
  const hasToc = headings.length >= 2;
  toc.hidden = !hasToc;
  tocToggle.hidden = !hasToc;

  const setSheet = (open) => {
    document.body.dataset.toc = String(open);
    tocToggle.setAttribute('aria-expanded', String(open));
  };
  setSheet(false);
  tocToggle.addEventListener('click', () => setSheet(document.body.dataset.toc !== 'true'));
  closers.add(() => setSheet(false));
  document.addEventListener('click', (event) => {
    if (document.body.dataset.toc === 'true' && !toc.contains(event.target) && !tocToggle.contains(event.target)) setSheet(false);
  });

  let active = -1;
  let ticking = false;
  function update() {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const start = article.offsetTop - vh * 0.5;
    const end = article.offsetTop + article.offsetHeight - vh;
    const progress = clamp((y - start) / Math.max(1, end - start));
    fill.style.transform = `scaleX(${progress})`;

    const heroBottom = hero.node.offsetTop + hero.node.offsetHeight;
    document.body.dataset.past = String(y > heroBottom - 72);
    const leftMin = Math.ceil(minutes * (1 - progress));
    left.textContent = progress >= 0.995 ? t.done : t.minLeft(Math.max(1, leftMin));

    let current = -1;
    headings.forEach((item, i) => { if (item.node.getBoundingClientRect().top < vh * 0.32) current = i; });
    if (current !== active) {
      active = current;
      tocLinks.forEach((a, i) => {
        if (i === active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }

    if (reducedMotion) return;
    if (hero.media && y < heroBottom) {
      hero.media.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;
      hero.inner.style.transform = `translate3d(0, ${y * 0.12}px, 0)`;
      hero.inner.style.opacity = String(clamp(1 - y / (heroBottom * 0.75)));
    }
    for (const p of parallax) {
      const r = p.frame.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const k = (r.top + r.height / 2 - vh / 2) / vh;
      p.img.style.transform = `translate3d(0, ${(-k * 14).toFixed(2)}%, 0) scale(1.24)`;
    }
  }
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  new ResizeObserver(onScroll).observe(article);
  update();
  bar.hidden = false;
}

/* ------------------------------------------------------------- navigation */

/* Lazy images above the target may load while the page scrolls and push it
   down; once the scroll ends, land on the target again. */
let settleToken = 0;
function settle(target, block) {
  const token = ++settleToken;
  const fix = () => {
    if (token !== settleToken) return;
    settleToken += 1;
    const box = target.getBoundingClientRect();
    const want = block === 'center'
      ? (innerHeight - box.height) / 2
      : (parseFloat(getComputedStyle(html).scrollPaddingTop) || 0) + (parseFloat(getComputedStyle(target).scrollMarginTop) || 0);
    if (Math.abs(box.top - want) > 6) target.scrollIntoView({ behavior: 'auto', block });
  };
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', fix, { once: true });
    setTimeout(() => { if (token === settleToken) settleToken += 1; }, 3000);
  } else setTimeout(fix, 1200);
}

function goToId(id, { smooth = true } = {}) {
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) { warn(`#${id} not found`); return; }
  const block = id.startsWith('src-') ? 'center' : 'start';
  revealNow(target.closest('.rv'));
  target.scrollIntoView({ behavior: smooth && !reducedMotion ? 'smooth' : 'auto', block });
  settle(target, block);
  history.replaceState(null, '', id === 'top' ? `${location.pathname}${location.search}` : anchorHref(id));
  if (id.startsWith('src-')) {
    target.classList.remove('is-flash');
    void target.offsetWidth;
    target.classList.add('is-flash');
  }
}

function startNavigation() {
  document.addEventListener('click', async (event) => {
    const a = event.target.closest?.('a[data-anchor]');
    if (!a || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const id = a.dataset.anchor;
    closers.forEach((close) => close());
    goToId(id);
    if (a.dataset.copy && await copyText(location.href.split('#')[0] + '#' + id)) toast(t.linkCopied);
  });

  document.addEventListener('keydown', (event) => {
    if (lightbox.isOpen) { lightbox.key(event); return; }
    if (event.key === 'Escape') closers.forEach((close) => close());
  });

  window.addEventListener('hashchange', () => goToId(decodeURIComponent(location.hash.slice(1)), { smooth: true }));

  /* A click must not leave focus on a figure control, or the next Space
     would press it again instead of scrolling the page. */
  document.addEventListener('pointerup', (event) => {
    const control = event.target.closest?.('.fig-btn, .sim-host button');
    if (control) setTimeout(() => control.blur(), 0);
  });
}

/* -------------------------------------------------------------------- boot */

function fatal(title, detail) {
  const main = $('post');
  main.replaceChildren();
  const box = h('div', 'fatal');
  box.append(h('h1', null, title), h('pre', null, detail));
  main.append(box);
}

function start() {
  validate();
  const minutes = readingMinutes();
  document.title = plain(post.title) || document.title;

  const main = $('post');
  const hero = renderHero(minutes);
  const article = h('article', 'flow');
  article.id = 'article';
  blocks.forEach((b, i) => article.append(renderBlock(b, i)));
  if (sources.length) article.append(renderSources());
  main.replaceChildren(hero.node, article, renderEnd());

  startChrome({ hero, minutes });
  startNavigation();

  const id = decodeURIComponent(location.hash.slice(1));
  if (id && document.getElementById(id)) requestAnimationFrame(() => goToId(id, { smooth: false }));
}

if (loadError) fatal(t.postError, String(loadError.message || loadError));
else if (!blocks.length) fatal(t.postEmpty, 'export const blocks = [ … ]');
else start();
