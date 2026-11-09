// Pro Sicht video kit: seek-safe motion helpers (core, do not edit).
//
// Everything is a GSAP property tween or set on ONE paused timeline, so any
// frame can be rendered by jumping straight to it: the browser player plays the
// timeline in real time, `npx prosicht render` (HyperFrames) seeks it frame by
// frame. Frames are the unit (film.fps, default 30). Never use timers,
// Math.random(), Date or CSS animations in a film; build every move here.

const gsap = globalThis.gsap;

/** Named eases. Arrivals decelerate (land), departures accelerate (leave). */
export const EASES = {
  land: 'power3.out',
  soft: 'power2.out',
  snap: 'expo.out',
  swing: 'back.out(1.4)',
  leave: 'power2.in',
  glide: 'sine.inOut',
  linear: 'none',
};

const easeOf = (name) => (name ? EASES[name] || name : EASES.land);

// GSAP property names for the short keys a `from` / `to` pose may use
const POSE = { x: 'x', y: 'y', scale: 'scale', scaleX: 'scaleX', scaleY: 'scaleY', rotation: 'rotation', opacity: 'opacity' };

function poseVars(pose, neutral) {
  const vars = {};
  for (const [key, value] of Object.entries(pose || {})) {
    if (key === 'blur') vars.filter = `blur(${value}px)`;
    else if (POSE[key]) vars[POSE[key]] = value;
    else vars[key] = value;
  }
  if (!neutral) return vars;
  const rest = {};
  for (const key of Object.keys(vars)) {
    if (key === 'filter') rest.filter = 'blur(0px)';
    else if (key === 'opacity' || key === 'scale' || key === 'scaleX' || key === 'scaleY') rest[key] = 1;
    else if (typeof vars[key] === 'number') rest[key] = 0;
  }
  return rest;
}

/**
 * The film's motion API. `root` is the 1920×1080 stage (#film), `fps` its frame
 * rate. Call finalize() once after build(M); app.js does that.
 */
export function createFilm(root, { fps = 30, duration }) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  const s = (frame) => frame / fps;
  const visibility = new Map(); // element → [{ frame, on }] in authoring order
  const events = [];

  const els = (target) => {
    if (!target) return [];
    if (typeof target === 'string') {
      const found = [...root.querySelectorAll(target)];
      if (!found.length) console.warn(`[film] "${target}" matches nothing`);
      return found;
    }
    if (target instanceof Element) return [target];
    return [...target].flatMap(els);
  };

  const vis = (target, frame, on) => {
    for (const el of els(target)) {
      if (!visibility.has(el)) visibility.set(el, []);
      visibility.get(el).push({ frame, on });
    }
  };

  const M = {
    tl,
    fps,
    duration,
    /** frames → seconds */
    f: s,
    /** seconds → nearest frame */
    frame: (seconds) => Math.round(seconds * fps),
    events,

    /** Visible from `from` (frame) until `to` (exclusive, optional). */
    show(target, from = 0, to) {
      vis(target, from, true);
      if (to !== undefined) vis(target, to, false);
      return M;
    },
    /** Hidden from `at` on. */
    hide(target, at) {
      vis(target, at, false);
      return M;
    },
    /** A hard cut: hide some elements and show others on the same frame. */
    cut(at, { hide, show } = {}) {
      if (hide) vis(hide, at, false);
      if (show) vis(show, at, true);
      events.push({ frame: at, type: 'cut' });
      return M;
    },

    /** Arrive from a pose (default: 40 px lower, transparent) and land on the element's own pose. */
    enter(target, { at = 0, frames = 14, from = { y: 40, opacity: 0 }, ease = 'land' } = {}) {
      const list = els(target);
      vis(list, at, true);
      tl.fromTo(list, poseVars(from), { ...poseVars(from, true), duration: s(frames), ease: easeOf(ease), immediateRender: false }, s(at));
      return M;
    },
    /** Leave towards a pose (default: 30 px up, transparent); hidden afterwards unless hide: false. */
    exit(target, { at, frames = 12, to = { y: -30, opacity: 0 }, ease = 'leave', hide = true } = {}) {
      const list = els(target);
      tl.to(list, { ...poseVars(to), duration: s(frames), ease: easeOf(ease), immediateRender: false }, s(at));
      if (hide) vis(list, at + frames, false);
      return M;
    },

    /**
     * Split each element's text into words and bring them in one after another,
     * `gap` frames apart. Inline markup (<em>, <strong>, <span>) is kept.
     * Returns the frame on which the last word starts.
     */
    words(target, { at = 0, gap = 4, frames = 13, from = { y: 36, opacity: 0, blur: 6 }, ease = 'land' } = {}) {
      let frame = at;
      for (const el of els(target)) {
        vis(el, at, true);
        const words = splitWords(el);
        words.forEach((word, i) => {
          const start = at + i * gap;
          // the resting pose before its turn: set first, so a tween on the same frame wins
          tl.set(word, poseVars(from), 0);
          tl.fromTo(word, poseVars(from), { ...poseVars(from, true), duration: s(frames), ease: easeOf(ease), immediateRender: false }, s(start));
          frame = Math.max(frame, start);
        });
      }
      return frame;
    },

    /**
     * Keyframes of one property: [[frame, value, ease?], ...]. The ease belongs
     * to the segment that ends at that key; a repeated frame is a hard step.
     * The first value also holds before the first key.
     */
    kf(target, prop, keys, { unit = '' } = {}) {
      const list = els(target);
      const val = (v) => (unit && typeof v === 'number' ? `${v}${unit}` : v);
      tl.set(list, { [prop]: val(keys[0][1]) }, 0);
      for (let i = 1; i < keys.length; i += 1) {
        const [f0, v0] = keys[i - 1];
        const [f1, v1, ease] = keys[i];
        if (f1 === f0) tl.set(list, { [prop]: val(v1) }, s(f1));
        else tl.fromTo(list, { [prop]: val(v0) }, { [prop]: val(v1), duration: s(f1 - f0), ease: ease ? easeOf(ease) : 'none', immediateRender: false }, s(f0));
      }
      return M;
    },
    /** Camera moves on a wrapper: [[frame, { x, y, scale, rotation }, ease?], ...]. */
    camera(target, keys, { origin = '50% 50%' } = {}) {
      const list = els(target);
      tl.set(list, { transformOrigin: origin }, 0);
      const props = new Set(keys.flatMap(([, pose]) => Object.keys(pose)));
      for (const prop of props) {
        const track = [];
        let last;
        for (const [frame, pose, ease] of keys) {
          if (pose[prop] !== undefined) last = pose[prop];
          if (last !== undefined) track.push([frame, last, ease]);
        }
        M.kf(list, POSE[prop] || prop, track);
      }
      return M;
    },
    /** A slow, linear, never-freezing move (prop: scale | x | y | rotation | opacity). */
    drift(target, { prop = 'scale', from = 1, to = 1.04, start = 0, end }) {
      return M.kf(target, POSE[prop] || prop, [[start, from], [end ?? M.frame(duration), to]]);
    },
    /** A number that counts from `from` to `to` (integers), e.g. 0 → 1250. */
    count(target, { at = 0, from = 0, to, frames = 24, ease = 'soft' }) {
      const list = els(target);
      tl.set(list, { innerText: from }, 0);
      tl.fromTo(list, { innerText: from }, { innerText: to, snap: { innerText: 1 }, duration: s(frames), ease: easeOf(ease), immediateRender: false }, s(at));
      return M;
    },
    /** Run `fn(el, frame, i)` for each target, `gap` frames apart. */
    cascade(target, { at = 0, gap = 4, fn }) {
      els(target).forEach((el, i) => fn(el, at + i * gap, i));
      return M;
    },
    /** A labelled moment (logged to window.__filmEvents for timing music and checks). */
    mark(frame, label) {
      events.push({ frame, type: 'mark', label });
      return M;
    },

    /** Turns the visibility tracks into sets; called once by app.js after build(M). */
    finalize() {
      for (const [el, ops] of visibility) {
        const ordered = ops.map((op, i) => ({ ...op, i })).sort((a, b) => a.frame - b.frame || a.i - b.i);
        // before its first "on" an element is hidden; before its first "off" it is visible
        tl.set(el, { visibility: ordered[0].on ? 'hidden' : 'visible' }, 0);
        for (const op of ordered) tl.set(el, { visibility: op.on ? 'visible' : 'hidden' }, s(op.frame));
      }
      // make the timeline exactly as long as the film
      tl.set({}, {}, duration);
      events.sort((a, b) => a.frame - b.frame);
      return M;
    },
  };
  return M;
}

/** Wraps every word of `el` (inside inline elements too) in <span class="w">; returns the spans. */
function splitWords(el) {
  const spans = [];
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/).filter((part) => part.length);
        if (parts.every((part) => /^\s+$/.test(part))) continue;
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (/^\s+$/.test(part)) frag.append(document.createTextNode(part));
          else {
            const span = document.createElement('span');
            span.className = 'w';
            span.textContent = part;
            frag.append(span);
            spans.push(span);
          }
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') walk(child);
    }
  };
  walk(el);
  return spans;
}
