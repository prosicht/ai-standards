/* Presentation shell.
   CORE FILE: `npx prosicht update` overwrites it. Never edit it inside a deck.

   Owns routing (#chapter-id), keys, transitions, sim mounting and fitting, the
   chapter overview, the notes / source / help drawer, the presenter window,
   sound, pause and blackout. Content comes from scenes.js; each chapter's live
   part from sims/<id>.js. The contract between them is AGENTS.md. */

import { createSound } from './sound.js';

const KIT_VERSION = '1.1.0';

/* ----------------------------------------------------------------- strings */

const STRINGS = {
  tr: {
    overview: 'Bölümler',
    overviewHint: 'Tıkla, ok tuşlarıyla seç veya numara yaz · Esc kapat',
    notes: 'Konuşma notları',
    source: 'Kaynak',
    help: 'Kısayollar',
    noNotes: 'Bu bölüm için not yok.',
    noSource: 'Bu bölüm için kaynak notu yok.',
    simMissing: 'Simülasyon dosyası bulunamadı',
    simError: 'Simülasyon hata verdi',
    paused: 'Duraklatıldı',
    resumed: 'Devam ediyor',
    reset: 'Baştan oynatılıyor',
    soundOn: 'Ses açık',
    soundOff: 'Ses kapalı',
    fullscreenFail: 'Tam ekran açılamadı',
    popupBlocked: 'Açılır pencere engellendi',
    now: 'Şimdi',
    next: 'Sıradaki',
    end: 'Son bölüm',
    step: 'adım',
    timerHint: 'Sıfırlamak için tıkla',
    waiting: 'Ana sunum penceresi bekleniyor…',
    scenesError: 'scenes.js yüklenemedi',
    scenesEmpty: 'scenes.js içinde bölüm yok',
    kit: 'Altyapı sürümü',
    keys: [
      ['→  Space', 'İleri: önce bölüm içi adımlar, sonra sıradaki bölüm'],
      ['←', 'Geri'],
      ['Shift + → / ←', 'Doğrudan sonraki / önceki bölüm'],
      ['Home / End', 'İlk / son bölüm'],
      ['1-9', 'Numarayla bölüme git'],
      ['O', 'Bölüm listesi'],
      ['N', 'Konuşma notları'],
      ['S', 'Kaynak notu'],
      ['V', 'Sunucu görünümü (ayrı pencere)'],
      ['R', 'Simülasyonu baştan oynat'],
      ['P', 'Hareketi duraklat / devam ettir'],
      ['B', 'Ekranı karart'],
      ['F', 'Tam ekran'],
      ['M', 'Ses aç / kapa'],
      ['H  ?', 'Bu panel'],
      ['Esc', 'Paneli kapat'],
    ],
  },
  en: {
    overview: 'Chapters',
    overviewHint: 'Click, use arrows or type a number · Esc to close',
    notes: 'Speaker notes',
    source: 'Source',
    help: 'Shortcuts',
    noNotes: 'No notes for this chapter.',
    noSource: 'No source note for this chapter.',
    simMissing: 'Simulation file not found',
    simError: 'Simulation failed',
    paused: 'Paused',
    resumed: 'Resumed',
    reset: 'Replaying',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    fullscreenFail: 'Fullscreen unavailable',
    popupBlocked: 'Pop-up blocked',
    now: 'Now',
    next: 'Next',
    end: 'Last chapter',
    step: 'step',
    timerHint: 'Click to reset',
    waiting: 'Waiting for the main deck window…',
    scenesError: 'Could not load scenes.js',
    scenesEmpty: 'scenes.js has no chapters',
    kit: 'Kit version',
    keys: [
      ['→  Space', 'Forward: steps inside the chapter first, then the next chapter'],
      ['←', 'Back'],
      ['Shift + → / ←', 'Next / previous chapter directly'],
      ['Home / End', 'First / last chapter'],
      ['1-9', 'Jump to chapter number'],
      ['O', 'Chapter overview'],
      ['N', 'Speaker notes'],
      ['S', 'Source note'],
      ['V', 'Presenter view (separate window)'],
      ['R', 'Replay the simulation'],
      ['P', 'Pause / resume motion'],
      ['B', 'Black screen'],
      ['F', 'Fullscreen'],
      ['M', 'Sound on / off'],
      ['H  ?', 'This panel'],
      ['Esc', 'Close panel'],
    ],
  },
};

/* ------------------------------------------------------------------ helpers */

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const plain = (text) => String(text || '').replace(/<br\s*\/?>/gi, ' ').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const query = new URLSearchParams(location.search);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/* Title and lede markup: one or more <br> line breaks and *accent* words.
   Everything else is text, never HTML. words: wrap each word for the rise animation. */
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
}

/* ------------------------------------------------------------------- scenes */

const LAYOUTS = new Set(['hero', 'split', 'split-flip', 'full', 'text']);

function validate(list) {
  const seen = new Set();
  list.forEach((s, i) => {
    const where = `scenes.js scenes[${i}]`;
    if (!s || typeof s !== 'object') { console.warn(`${where} is not an object`); return; }
    if (!s.id) console.warn(`${where}: id is missing`);
    else if (!/^[a-z0-9-]+$/.test(s.id)) console.warn(`${where}: id "${s.id}" must use a-z, 0-9 and - only`);
    if (seen.has(s.id)) console.warn(`${where}: duplicate id "${s.id}"`);
    seen.add(s.id);
    if (s.layout && !LAYOUTS.has(s.layout)) console.warn(`${where}: unknown layout "${s.layout}"`);
    if (!s.title) console.warn(`${where}: title is missing`);
  });
}

function normalize(raw, i) {
  const s = raw && typeof raw === 'object' ? raw : {};
  const id = String(s.id || `chapter-${i + 1}`);
  const layout = LAYOUTS.has(s.layout) ? s.layout : 'split';
  const sim = layout === 'text' || s.sim === false ? null : (typeof s.sim === 'string' ? s.sim : id);
  return {
    id,
    n: i + 1,
    name: s.name || plain(s.title) || id,
    kicker: s.kicker || '',
    title: s.title || id,
    lede: s.lede || '',
    layout,
    sim,
    notes: Array.isArray(s.notes) ? s.notes.filter(Boolean).map(String) : [],
    source: s.source || null,
  };
}

let deck = {};
let scenes = [];
let loadError = null;
try {
  const mod = await import('./scenes.js');
  deck = mod.deck && typeof mod.deck === 'object' ? mod.deck : {};
  const list = Array.isArray(mod.scenes) ? mod.scenes : [];
  validate(list);
  scenes = list.map(normalize);
} catch (error) {
  loadError = error;
  console.error('[deck] scenes.js:', error);
}

const lang = STRINGS[deck.lang] ? deck.lang : 'tr';
const t = STRINGS[lang];
document.documentElement.lang = deck.lang || 'tr';
if (deck.theme) document.documentElement.dataset.theme = deck.theme;

const indexOf = (target) => {
  const key = String(target ?? '');
  const byId = scenes.findIndex((s) => s.id === key);
  if (byId >= 0) return byId;
  return /^\d+$/.test(key) ? Number(key) - 1 : -1;
};

/* ------------------------------------------------------------------ channel */

/* Main window and presenter window talk over a BroadcastChannel scoped to
   this deck's path. */
const channel = 'BroadcastChannel' in window ? new BroadcastChannel(`prosicht-deck:${location.pathname}`) : null;

/* ==================================================================== deck */

function startDeck() {
  const stage = $('stage');
  const head = $('head');
  const kickerNum = $('kicker-num');
  const kickerText = $('kicker-text');
  const titleEl = $('title');
  const ledeEl = $('lede');
  const simArea = $('sim-area');
  const simHost = $('sim-host');
  const simEmpty = $('sim-empty');
  const bar = $('bar');
  const overview = $('overview');
  const overviewGrid = $('overview-grid');
  const drawer = $('drawer');
  const drawerBody = $('drawer-body');
  const toast = $('toast');
  const live = $('live');

  let index = -1;
  let active = null;
  let navToken = 0;
  let paused = false;
  let blackout = false;
  let drawerKind = null;
  let stageState = { index: 0, count: 0 };

  /* ---------------------------------------------------------------- sound */

  const soundParam = query.get('sound');
  const sound = createSound({ muted: soundParam === '1' ? false : soundParam === '0' ? true : undefined });
  const soundApi = Object.freeze({
    play: (name, opts) => sound.play(name, opts),
    isMuted: () => sound.isMuted(),
  });
  const unlock = () => sound.unlock();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  /* ---------------------------------------------------------------- toast */

  let toastTimer = 0;
  function flash(message) {
    toast.textContent = message;
    toast.dataset.show = 'true';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.dataset.show = 'false'; }, 1500);
  }

  /* ---------------------------------------------------------- sim fitting */

  /* Design minimum per layout. A smaller area keeps this logical size and is
     drawn scaled down, so a sim is never clipped on a small laptop. */
  const FIT = { split: [700, 560], 'split-flip': [700, 560], full: [1120, 500] };

  function fitSim() {
    const scene = scenes[index];
    const w = simArea.clientWidth;
    const hgt = simArea.clientHeight;
    if (!scene || !w || !hgt) return;
    const min = FIT[scene.layout];
    const scale = min ? Math.min(1, w / min[0], hgt / min[1]) : 1;
    simHost.style.width = `${w / scale}px`;
    simHost.style.height = `${hgt / scale}px`;
    simHost.style.transform = scale < 1 ? `scale(${scale})` : '';
    simHost.dataset.scale = scale.toFixed(3);
  }
  new ResizeObserver(fitSim).observe(simArea);

  /* ------------------------------------------------------------ sim load */

  const simCache = new Map();
  const cssCache = new Map();

  function loadCss(href) {
    if (!cssCache.has(href)) {
      cssCache.set(href, new Promise((resolve) => {
        const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
        link.onload = () => resolve();
        link.onerror = () => { console.warn(`[deck] ${href} not found`); resolve(); };
        document.head.append(link);
      }));
    }
    return cssCache.get(href);
  }

  function loadSim(scene) {
    if (!scene?.sim) return Promise.resolve(null);
    if (!simCache.has(scene.sim)) {
      simCache.set(scene.sim, (async () => {
        try {
          const mod = await import(`./sims/${scene.sim}.js`);
          if (typeof mod.default !== 'function') {
            return { error: new Error('missing `export default function mount(root, ctx)`') };
          }
          if (mod.css) await loadCss(`sims/${scene.sim}.css`);
          return { mod };
        } catch (error) {
          /* Chrome, Firefox and Safari word a 404 on import() differently */
          const missing = /dynamically imported module|module script failed/i.test(String(error?.message));
          return { error, missing };
        }
      })());
    }
    return simCache.get(scene.sim);
  }

  function unmountSim() {
    if (active) {
      try { active.destroy(); } catch (error) { console.error('[deck] destroy:', error); }
    }
    active = null;
    simHost.replaceChildren();
    simHost.className = 'sim-host';
  }

  function showEmpty(scene, error, missing = !error) {
    $('sim-empty-title').textContent = missing ? t.simMissing : t.simError;
    $('sim-empty-note').textContent = missing ? `sims/${scene.sim}.js` : `sims/${scene.sim}.js: ${error.message || error}`;
    simEmpty.hidden = false;
    console.error(`[deck] sims/${scene.sim}.js:`, error || t.simMissing);
  }

  function paintStages(i, count) {
    stageState = { index: i, count };
    const dots = $('bar-stages');
    dots.replaceChildren();
    if (count > 1) {
      for (let k = 0; k < count; k += 1) {
        const dot = h('i');
        if (k <= i) dot.className = 'on';
        dots.append(dot);
      }
    }
    broadcast();
  }

  function mountSim(scene, loaded, enter) {
    simEmpty.hidden = true;
    if (!scene.sim) return;
    if (!loaded || loaded.error) { showEmpty(scene, loaded?.error, loaded?.missing); return; }
    try {
      active = loaded.mod.default(simHost, {
        scene: Object.freeze({ ...scene, notes: [...scene.notes] }),
        lang,
        paused,
        reducedMotion,
        enter,
        sound: soundApi,
        onStage: paintStages,
        onChange: (detail) => document.dispatchEvent(new CustomEvent('sim:change', { detail: { id: scene.id, detail } })),
      });
      if (!active || typeof active.destroy !== 'function') {
        throw new Error('mount() must return sim.api({ reset, step })');
      }
      active.setPaused?.(paused);
    } catch (error) {
      unmountSim();
      showEmpty(scene, error);
    }
    /* warm the next chapter while the presenter talks */
    loadSim(scenes[index + 1]);
  }

  /* ---------------------------------------------------------- transitions */

  function animateOut(dir) {
    if (reducedMotion) return Promise.resolve();
    const dx = -dir * 40;
    const opts = { duration: 170, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' };
    const frames = [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${dx}px)` }];
    return Promise.all([head, simArea].map((n) => n.animate(frames, opts).finished.catch(() => {})));
  }

  function animateIn(dir) {
    for (const n of [head, simArea, ledeEl]) n.getAnimations().forEach((a) => a.cancel());
    if (reducedMotion) return;
    const dx = dir * 40;
    head.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
    ledeEl.animate(
      [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 520, delay: 260, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
    );
    simArea.animate(
      [{ opacity: 0, transform: `translateX(${dx}px) scale(.985)` }, { opacity: 1, transform: 'none' }],
      { duration: 560, delay: 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
    );
  }

  /* --------------------------------------------------------------- router */

  function applyScene(scene) {
    stage.dataset.layout = scene.layout;
    kickerNum.textContent = pad(scene.n);
    kickerText.textContent = scene.kicker;
    renderRich(titleEl, scene.title, { words: !reducedMotion });
    renderRich(ledeEl, scene.lede);
    ledeEl.hidden = !scene.lede;

    $('bar-deck').textContent = deck.title || '';
    $('bar-num').textContent = pad(scene.n);
    $('bar-name').textContent = scene.name;
    $('bar-count').textContent = `${pad(scene.n)}/${pad(scenes.length)}`;
    $('bar-fill').style.transform = `scaleX(${scene.n / scenes.length})`;
    document.title = deck.title ? `${scene.name} · ${deck.title}` : scene.name;
    live.textContent = `${scene.n}/${scenes.length}: ${plain(scene.title)}`;

    if (location.hash.slice(1) !== scene.id) history.replaceState(null, '', `#${scene.id}`);
    paintStages(0, 0);
    if (drawerKind && !drawer.hidden) renderDrawer();
    overviewGrid.querySelectorAll('.ov-card').forEach((card, i) => {
      if (i === index) card.setAttribute('aria-current', 'true');
      else card.removeAttribute('aria-current');
    });
  }

  async function goTo(target, { dir, enter = 'start', instant = false } = {}) {
    const i = typeof target === 'number' ? target : indexOf(target);
    if (i < 0 || i >= scenes.length || i === index) return;
    const direction = dir ?? Math.sign(i - index);
    const token = ++navToken;
    const scene = scenes[i];
    const loading = loadSim(scene);

    if (index >= 0 && !instant) {
      sound.play('whoosh');
      await animateOut(direction);
      if (token !== navToken) return;
    }
    unmountSim();
    index = i;
    applyScene(scene);
    fitSim();
    animateIn(direction);

    const loaded = await loading;
    if (token !== navToken) return;
    mountSim(scene, loaded, enter);
  }

  function next() {
    try { if (active?.step?.(1)) { sound.play('tick'); return; } } catch (error) { console.error('[deck] step:', error); }
    goTo(index + 1, { dir: 1 });
  }

  function prev() {
    try { if (active?.step?.(-1)) { sound.play('tick'); return; } } catch (error) { console.error('[deck] step:', error); }
    goTo(index - 1, { dir: -1, enter: 'end' });
  }

  /* --------------------------------------------------------------- states */

  function setPaused(next) {
    paused = next;
    try { active?.setPaused?.(paused); } catch { /* sim gone */ }
    document.body.dataset.paused = String(paused);
    $('bar-state').hidden = !paused;
    $('bar-state').textContent = t.paused;
    flash(paused ? t.paused : t.resumed);
    broadcast();
  }

  function setBlackout(next) {
    blackout = next;
    document.body.dataset.blackout = String(blackout);
  }

  function replay() {
    try { active?.reset?.(); } catch (error) { console.error('[deck] reset:', error); }
    sound.play('pop');
    flash(t.reset);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => flash(t.fullscreenFail));
  }

  function toggleSound() {
    sound.toggle();
    flash(sound.isMuted() ? t.soundOff : t.soundOn);
    sound.play('pop');
  }

  function openPresenter() {
    const url = new URL(location.href);
    url.searchParams.set('presenter', '');
    url.hash = '';
    const win = window.open(url.href, 'prosicht-presenter', 'popup,width=1120,height=720');
    if (!win) flash(t.popupBlocked);
  }

  /* -------------------------------------------------------------- drawer */

  function renderDrawer() {
    const scene = scenes[index];
    $('drawer-eyebrow').textContent = drawerKind === 'help' ? (deck.title || '') : `${pad(scene.n)} · ${scene.name}`;
    $('drawer-title').textContent = t[drawerKind];
    drawerBody.replaceChildren();

    if (drawerKind === 'notes') {
      if (!scene.notes.length) drawerBody.append(h('p', 'drawer-muted', t.noNotes));
      else {
        const list = h('ul', 'drawer-notes');
        for (const note of scene.notes) list.append(h('li', null, note));
        drawerBody.append(list);
      }
    } else if (drawerKind === 'source') {
      const src = scene.source;
      if (!src) drawerBody.append(h('p', 'drawer-muted', t.noSource));
      else if (typeof src === 'string') drawerBody.append(h('p', null, src));
      else {
        if (src.title) drawerBody.append(h('h3', 'drawer-sub', src.title));
        if (src.body) drawerBody.append(h('p', null, src.body));
        if (Array.isArray(src.links) && src.links.length) {
          const list = h('ul', 'drawer-links');
          for (const link of src.links) {
            const li = h('li');
            const a = h('a', null, link.label || link.url);
            a.href = link.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            li.append(a);
            list.append(li);
          }
          drawerBody.append(list);
        }
        if (src.note) drawerBody.append(h('p', 'drawer-muted', src.note));
      }
    } else {
      const table = h('dl', 'drawer-keys');
      for (const [keys, label] of t.keys) {
        const dt = h('dt');
        for (const k of keys.split(/\s{2,}| \/ /)) dt.append(h('kbd', null, k.trim()));
        table.append(dt, h('dd', null, label));
      }
      drawerBody.append(table, h('p', 'drawer-muted', `${t.kit}: ${KIT_VERSION}`));
    }
  }

  function toggleDrawer(kind) {
    if (drawerKind === kind && !drawer.hidden) { closeDrawer(); return; }
    drawerKind = kind;
    renderDrawer();
    drawer.hidden = false;
  }

  function closeDrawer() {
    drawer.hidden = true;
    drawerKind = null;
  }

  /* ------------------------------------------------------------- overview */

  $('overview-title').textContent = t.overview;
  $('overview-hint').textContent = t.overviewHint;
  scenes.forEach((scene, i) => {
    const card = h('button', 'ov-card');
    card.type = 'button';
    card.append(
      h('span', 'ov-num', pad(scene.n)),
      h('span', 'ov-name', scene.name),
      h('span', 'ov-title', plain(scene.title)),
      h('span', 'ov-layout', scene.layout),
    );
    card.addEventListener('click', () => { closeOverview(); goTo(i); });
    overviewGrid.append(card);
  });

  function openOverview() {
    closeDrawer();
    overview.hidden = false;
    const cards = overviewGrid.querySelectorAll('.ov-card');
    cards[Math.max(0, index)]?.focus();
  }

  function closeOverview() {
    overview.hidden = true;
    document.activeElement?.blur?.();
  }

  function overviewKey(event) {
    const cards = [...overviewGrid.querySelectorAll('.ov-card')];
    const at = cards.indexOf(document.activeElement);
    const cols = getComputedStyle(overviewGrid).gridTemplateColumns.split(' ').length || 1;
    const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    if (moves[event.key] != null) {
      event.preventDefault();
      const nextAt = Math.min(cards.length - 1, Math.max(0, (at < 0 ? index : at) + moves[event.key]));
      cards[nextAt]?.focus();
    } else if (/^[0-9]$/.test(event.key)) {
      typeDigit(event.key);
    } else if (event.key.toLowerCase() === 'o') {
      closeOverview();
    }
  }

  /* -------------------------------------------------------------- digits */

  let digits = '';
  let digitTimer = 0;
  function typeDigit(d) {
    digits += d;
    flash(`→ ${digits}`);
    clearTimeout(digitTimer);
    digitTimer = setTimeout(() => {
      const target = Number(digits) - 1;
      digits = '';
      if (target >= 0 && target < scenes.length) {
        closeOverview();
        goTo(target);
      }
    }, 650);
  }

  /* ---------------------------------------------------------------- keys */

  const typing = (node) => {
    if (!node || node === document.body) return false;
    if (node.isContentEditable) return true;
    if (node.tagName === 'TEXTAREA' || node.tagName === 'SELECT') return true;
    return node.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button'].includes(node.type);
  };

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (typing(target)) return;
    const key = event.key;
    if (target?.type === 'range' && key.startsWith('Arrow')) return;
    if (key === ' ' && target?.tagName === 'BUTTON' && simHost.contains(target)) return;

    if (key === 'Escape') {
      if (blackout) setBlackout(false);
      else if (!overview.hidden) closeOverview();
      else if (!drawer.hidden) closeDrawer();
      return;
    }
    if (!overview.hidden) { overviewKey(event); return; }
    if (blackout && key.toLowerCase() !== 'b') { setBlackout(false); event.preventDefault(); return; }

    switch (key.toLowerCase()) {
      case 'arrowright': case 'pagedown': case ' ':
        event.preventDefault();
        if (event.shiftKey) goTo(index + 1, { dir: 1 });
        else next();
        break;
      case 'arrowleft': case 'pageup':
        event.preventDefault();
        if (event.shiftKey) goTo(index - 1, { dir: -1 });
        else prev();
        break;
      case 'home': event.preventDefault(); goTo(0); break;
      case 'end': event.preventDefault(); goTo(scenes.length - 1); break;
      case 'o': event.preventDefault(); openOverview(); break;
      case 'n': toggleDrawer('notes'); break;
      case 's': toggleDrawer('source'); break;
      case 'h': case '?': toggleDrawer('help'); break;
      case 'v': openPresenter(); break;
      case 'r': replay(); break;
      case 'p': setPaused(!paused); break;
      case 'b': setBlackout(!blackout); break;
      case 'f': toggleFullscreen(); break;
      case 'm': toggleSound(); break;
      default:
        if (/^[0-9]$/.test(key)) typeDigit(key);
    }
  });

  /* --------------------------------------------------------------- pointer */

  $('bar-prev').addEventListener('click', prev);
  $('bar-next').addEventListener('click', next);
  $('bar-help').addEventListener('click', () => toggleDrawer('help'));
  $('drawer-close').addEventListener('click', closeDrawer);
  overview.addEventListener('click', (event) => { if (event.target === overview) closeOverview(); });

  /* A mouse click must not leave focus on a control, or the next Space or
     arrow press would go to that control instead of the deck. */
  document.addEventListener('pointerup', (event) => {
    const control = event.target.closest?.('button, input, [tabindex]');
    if (control && (simHost.contains(control) || bar.contains(control))) setTimeout(() => control.blur(), 0);
  });

  /* Swipe on touch screens, except on controls and [data-no-swipe] areas. */
  let touch = null;
  stage.addEventListener('touchstart', (event) => {
    const skip = event.touches.length !== 1 || event.target.closest('button, input, a, [data-no-swipe]');
    touch = skip ? null : { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  stage.addEventListener('touchend', (event) => {
    if (!touch) return;
    const dx = event.changedTouches[0].clientX - touch.x;
    const dy = event.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else prev();
    }
  });

  /* Cursor and bar fade out while the presenter is not using the mouse. */
  let idleTimer = 0;
  const wake = () => {
    if (document.body.dataset.idle === 'true') document.body.dataset.idle = 'false';
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { document.body.dataset.idle = 'true'; }, 2600);
  };
  window.addEventListener('pointermove', wake, { passive: true });
  wake();

  window.addEventListener('hashchange', () => {
    const i = indexOf(decodeURIComponent(location.hash.slice(1)));
    if (i >= 0 && i !== index) goTo(i);
  });

  /* ------------------------------------------------------------ presenter */

  function broadcast() {
    channel?.postMessage({ type: 'state', index, stage: stageState, paused });
  }

  if (channel) {
    channel.onmessage = (event) => {
      const msg = event.data || {};
      if (msg.type === 'hello') broadcast();
      if (msg.type !== 'cmd') return;
      if (msg.cmd === 'next') next();
      else if (msg.cmd === 'prev') prev();
      else if (msg.cmd === 'goto') goTo(msg.index);
      else if (msg.cmd === 'reset') replay();
      else if (msg.cmd === 'pause') setPaused(!paused);
      else if (msg.cmd === 'black') setBlackout(!blackout);
    };
  }

  /* ---------------------------------------------------------------- start */

  const start = indexOf(decodeURIComponent(location.hash.slice(1)));
  goTo(start >= 0 ? start : 0, { instant: true });
}

/* =============================================================== presenter */

function startPresenter() {
  document.body.className = 'is-presenter';
  document.title = `${t.notes} · ${deck.title || ''}`;
  document.body.replaceChildren();

  const timer = h('button', 'pv-timer', '00:00');
  timer.type = 'button';
  timer.title = t.timerHint;
  const clock = h('span', 'pv-clock');
  const nowLabel = h('p', 'pv-label', t.waiting);
  const nowTitle = h('h1', 'pv-title');
  const notes = h('ul', 'pv-notes');
  const nextTitle = h('h2', 'pv-next-title');
  const nextName = h('p', 'pv-next-name');

  const control = (label, cmd) => {
    const b = h('button', 'pv-btn', label);
    b.type = 'button';
    b.addEventListener('click', () => channel?.postMessage({ type: 'cmd', cmd }));
    return b;
  };

  const root = h('div', 'pv');
  const headEl = h('header', 'pv-head');
  headEl.append(h('span', 'pv-deck', deck.title || ''), timer, clock);
  const nowEl = h('section', 'pv-now');
  nowEl.append(nowLabel, nowTitle, notes);
  const nextEl = h('aside', 'pv-next');
  nextEl.append(h('p', 'pv-label', t.next), nextTitle, nextName);
  const controls = h('footer', 'pv-controls');
  controls.append(control('‹', 'prev'), control('›', 'next'), control('R', 'reset'), control('P', 'pause'), control('B', 'black'));
  root.append(headEl, nowEl, nextEl, controls);
  document.body.append(root);

  let started = Date.now();
  timer.addEventListener('click', () => { started = Date.now(); });
  const tickClock = () => {
    const s = Math.floor((Date.now() - started) / 1000);
    timer.textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
    clock.textContent = new Date().toLocaleTimeString(document.documentElement.lang, { hour: '2-digit', minute: '2-digit' });
  };
  setInterval(tickClock, 1000);
  tickClock();

  function render(state) {
    const scene = scenes[state.index];
    if (!scene) return;
    const step = state.stage?.count > 1 ? ` · ${t.step} ${state.stage.index + 1}/${state.stage.count}` : '';
    nowLabel.textContent = `${t.now} · ${pad(scene.n)}/${pad(scenes.length)}${step}${state.paused ? ` · ${t.paused}` : ''}`;
    nowTitle.textContent = plain(scene.title);
    notes.replaceChildren();
    for (const note of scene.notes) notes.append(h('li', null, note));
    if (!scene.notes.length) notes.append(h('li', 'pv-muted', t.noNotes));
    const upcoming = scenes[state.index + 1];
    nextTitle.textContent = upcoming ? plain(upcoming.title) : t.end;
    nextName.textContent = upcoming ? `${pad(upcoming.n)} · ${upcoming.name}` : '';
  }

  if (channel) {
    channel.onmessage = (event) => { if (event.data?.type === 'state') render(event.data); };
    channel.postMessage({ type: 'hello' });
  }

  document.addEventListener('keydown', (event) => {
    const cmd = { ArrowRight: 'next', ' ': 'next', PageDown: 'next', ArrowLeft: 'prev', PageUp: 'prev', r: 'reset', p: 'pause', b: 'black' }[event.key];
    if (!cmd) return;
    event.preventDefault();
    channel?.postMessage({ type: 'cmd', cmd });
  });
}

/* ==================================================================== boot */

function fatal(title, detail) {
  const titleEl = $('title');
  if (!titleEl) return;
  $('stage').dataset.layout = 'text';
  titleEl.textContent = title;
  $('lede').textContent = detail;
}

if (loadError) fatal(t.scenesError, String(loadError.message || loadError));
else if (!scenes.length) fatal(t.scenesEmpty, 'export const scenes = [ … ]');
else if (query.has('presenter')) startPresenter();
else startDeck();
