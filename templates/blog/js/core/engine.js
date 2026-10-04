/* Simulation runtime shared by every js/sims/<id>.js module of a blog post.
   CORE FILE: `npx prosicht update` overwrites it. Never edit it inside a post.

   Same contract as the presentation kit's engine, so a sim moves between a
   deck and a post unchanged. Blog additions: api.goto(i) (scroll-driven
   stages in a scrolly block) and sim.resize(fn) (layouts that change with
   the figure's width, e.g. on phones).

   A sim module is `export default function mount(root, ctx)` and returns
   `sim.api({ reset, step })`. Full contract: AGENTS.md, "Sim contract".
   Deterministic and local: no network, no storage, no globals. */

/* ---------------------------------------------------------------- math */

export const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (a === b ? 0 : clamp((v - a) / (b - a)));
export const remap = (v, a, b, c, d) => lerp(c, d, invLerp(a, b, v));

export const ease = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
  },
  expo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
};

/* Seeded RNG (mulberry32). Same seed, same take: R replays identically. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(next.range(lo, hi + 1));
  next.pick = (list) => list[Math.floor(next() * list.length)];
  next.chance = (p) => next() < p;
  next.shuffle = (list) => {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  return next;
}

/* Damped spring for values that should feel physical. Call step(dt) per frame. */
export function spring(value = 0, { stiffness = 170, damping = 22 } = {}) {
  const s = { value, target: value, velocity: 0 };
  s.step = (dt) => {
    const force = -stiffness * (s.value - s.target) - damping * s.velocity;
    s.velocity += force * dt;
    s.value += s.velocity * dt;
    return s.value;
  };
  s.snap = (v) => { s.value = v; s.target = v; s.velocity = 0; };
  s.settled = (eps = 0.001) => Math.abs(s.value - s.target) < eps && Math.abs(s.velocity) < eps;
  return s;
}

/* ----------------------------------------------------------------- dom */

const SVG_NS = 'http://www.w3.org/2000/svg';

function build(node, attrs, children) {
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.setAttribute('class', value);
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, v] of Object.entries(value)) {
        if (prop.startsWith('--')) node.style.setProperty(prop, v);
        else node.style[prop] = v;
      }
    } else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'on') {
      for (const [type, handler] of Object.entries(value)) node.addEventListener(type, handler);
    } else node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of [].concat(children ?? [])) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

/* el('div', { class, text, style: { '--x': 1 }, dataset, on: { click } }, children) */
export const el = (tag, attrs, children) => build(document.createElement(tag), attrs, children);
export const svg = (tag, attrs, children) => build(document.createElementNS(SVG_NS, tag), attrs, children);

/* Reads a design token from css/theme.css, e.g. token('--accent'). */
export function token(name, fallback = '') {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

/* ------------------------------------------------------------- formats */

const locale = () => document.documentElement.lang || 'tr';
const nf = (opts) => new Intl.NumberFormat(locale(), opts);

export const fmt = {
  int: (n) => nf({ maximumFractionDigits: 0 }).format(Math.round(n)),
  dec: (n, digits = 1) => nf({ minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n),
  /* 0.42 -> "%42" in Turkish, "42%" in English */
  pct: (n, digits = 0) => nf({ style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n),
  compact: (n) => nf({ notation: 'compact', maximumFractionDigits: 1 }).format(n),
  money: (n, currency = 'TRY', digits = 0) => nf({ style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n),
};

/* ------------------------------------------------------------------ sim */

/* One sim per mounted chapter. Owns the frame loop and every disposable, so
   destroy() leaves nothing running. */
export function createSim(root, ctx = {}) {
  if (!root) throw new Error('createSim: root is required');
  const frames = new Set();
  const disposers = new Set();
  const reduced = Boolean(ctx.reducedMotion);
  let paused = Boolean(ctx.paused);
  let alive = true;
  let raf = 0;
  let last = 0;
  let clock = 0;
  let stageCtrl = null;

  root.classList.add('sim-root');
  root.dataset.simPaused = String(paused);

  function tick(now) {
    if (!alive) return;
    if (frames.size === 0) { raf = 0; last = 0; return; }
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
    last = now;
    if (paused) return;
    clock += dt;
    for (const fn of frames) fn(dt, clock);
  }

  const sim = {
    root,
    ctx,
    reduced,
    get paused() { return paused; },
    get time() { return clock; },

    /* fn(dt, elapsed) every frame while not paused. Returns stop(). */
    frame(fn) {
      frames.add(fn);
      if (!raf && alive) raf = requestAnimationFrame(tick);
      return () => frames.delete(fn);
    },

    /* Pause-aware timeout in seconds of sim time. Returns cancel(). */
    after(seconds, fn) {
      let left = seconds;
      const stop = sim.frame((dt) => {
        left -= dt;
        if (left <= 0) { stop(); fn(); }
      });
      return stop;
    },

    /* Pause-aware interval. Returns cancel(). */
    every(seconds, fn) {
      let acc = 0;
      return sim.frame((dt) => {
        acc += dt;
        while (acc >= seconds) { acc -= seconds; fn(); }
      });
    },

    /* Animates a number. update(value, progress) each frame; done() at the end.
       Reduced motion jumps straight to the end. Returns cancel(). */
    tween({ from = 0, to = 1, duration = 0.6, delay = 0, ease: curve = ease.out, update, done } = {}) {
      if (reduced || duration <= 0) {
        update?.(to, 1);
        done?.();
        return () => {};
      }
      let t = -delay;
      update?.(from, 0);
      const stop = sim.frame((dt) => {
        t += dt;
        if (t < 0) return;
        const k = clamp(t / duration);
        update?.(lerp(from, to, curve(k)), k);
        if (k >= 1) { stop(); done?.(); }
      });
      return stop;
    },

    /* addEventListener that is removed on destroy. Returns off(). */
    on(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      const off = () => target.removeEventListener(type, handler, options);
      disposers.add(off);
      return off;
    },

    dispose(fn) { disposers.add(fn); return fn; },

    /* Shell sound: tick, pop, blip ({ note }), whoosh, chime, error. Always safe. */
    sound(name, opts) {
      try { return ctx.sound?.play?.(name, opts) ?? null; } catch { return null; }
    },

    token,

    /* Steps inside one figure. render(index, { dir, from }) draws stage
       `index`; dir is 1 (forward), -1 (back) or 0 (entry, reset, jump: draw
       without transitions). In a `sim` block the reader steps with the
       figure's ‹ › buttons; in a `scrolly` block the scroll position picks the
       stage (one stage per text step). */
    stages(count, render) {
      let index = -1;
      const go = (next, dir) => {
        const i = clamp(Math.round(next), 0, count - 1);
        if (i === index) return false;
        const from = index;
        index = i;
        render(i, { dir, from });
        ctx.onStage?.(i, count);
        return true;
      };
      stageCtrl = {
        count,
        get index() { return index; },
        go: (i) => go(i, 0),
        step(dir) {
          if (dir > 0 && index < count - 1) return go(index + 1, 1);
          if (dir < 0 && index > 0) return go(index - 1, -1);
          return false;
        },
        /* direct jump: animated when it is the neighbouring stage */
        to(i) {
          const target = clamp(Math.round(i), 0, count - 1);
          return go(target, Math.abs(target - index) === 1 ? Math.sign(target - index) : 0);
        },
        restart() { index = -1; go(0, 0); },
        enter() { if (index < 0) go(ctx.enter === 'end' ? count - 1 : 0, 0); },
      };
      return stageCtrl;
    },

    /* Pointer position in the node's layout px. The shell may draw the sim
       scaled down, so raw clientX/clientY deltas are wrong; use this. */
    point(event, node = root) {
      const box = node.getBoundingClientRect();
      const kx = node.offsetWidth ? box.width / node.offsetWidth : 1;
      const ky = node.offsetHeight ? box.height / node.offsetHeight : kx;
      return { x: (event.clientX - box.left) / (kx || 1), y: (event.clientY - box.top) / (ky || 1) };
    },

    /* fn(width, height) now and whenever the sim root changes size. Use it
       to switch layouts (e.g. width < 560 on phones). Returns stop(). */
    resize(fn) {
      let last = '';
      const measure = () => {
        const w = root.clientWidth;
        const h = root.clientHeight;
        const key = `${w}x${h}`;
        if (key === last || !w) return;
        last = key;
        fn(w, h);
      };
      const observer = new ResizeObserver(measure);
      observer.observe(root);
      const stop = () => observer.disconnect();
      disposers.add(stop);
      measure();
      return stop;
    },

    /* Runs every frame callback once with dt = 0: repaint without advancing time. */
    redraw() { for (const fn of frames) fn(0, clock); },

    emit(detail) { ctx.onChange?.(detail); },

    api({ reset, step } = {}) {
      stageCtrl?.enter();
      return {
        reset() {
          clock = 0;
          reset?.();
          stageCtrl?.restart();
        },
        step(dir) {
          if (step) return Boolean(step(dir));
          return stageCtrl ? stageCtrl.step(dir) : false;
        },
        /* scrolly: jump to stage i (the shell calls it as the reader scrolls) */
        goto(i) { return stageCtrl ? stageCtrl.to(i) : false; },
        get stages() { return stageCtrl ? { index: stageCtrl.index, count: stageCtrl.count } : null; },
        setPaused(next) {
          paused = Boolean(next);
          root.dataset.simPaused = String(paused);
          if (paused) sim.redraw();
        },
        destroy() {
          alive = false;
          cancelAnimationFrame(raf);
          frames.clear();
          for (const off of disposers) {
            try { off(); } catch { /* already gone */ }
          }
          disposers.clear();
          root.classList.remove('sim-root');
          root.replaceChildren();
        },
      };
    },
  };
  return sim;
}

/* HiDPI canvas that follows its CSS box. Draw in CSS px with the returned c2d. */
export function fitCanvas(sim, canvas) {
  const c2d = canvas.getContext('2d');
  const size = { width: 1, height: 1, dpr: 1 };
  const measure = () => {
    size.dpr = Math.min(2, window.devicePixelRatio || 1);
    size.width = Math.max(1, canvas.clientWidth);
    size.height = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(size.width * size.dpr);
    canvas.height = Math.round(size.height * size.dpr);
    c2d.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    sim.redraw();
  };
  const observer = new ResizeObserver(measure);
  observer.observe(canvas);
  sim.dispose(() => observer.disconnect());
  measure();
  return { c2d, size };
}

/* rgba() from a hex token, for canvas drawing: alpha(token('--accent'), 0.4). */
export function alpha(color, a) {
  const hex = String(color).trim().replace('#', '');
  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) return color;
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
