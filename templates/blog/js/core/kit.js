/* Ready-made sim components. Styles live in css/core/shell.css under .kit-*.
   CORE FILE: `npx prosicht update` overwrites it. Never edit it inside a post;
   build anything missing inside your own sim file. Same components as the
   presentation kit.

   Every component takes the sim from createSim() first, so its motion pauses
   with P, honours reduced motion and is cleaned up on destroy. */

import { el, svg, clamp, lerp, ease, fmt } from './engine.js';

const asOptions = (list) => list.map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) }));

/* ------------------------------------------------------------- controls */

export function button(label, onClick, { variant = 'solid', title } = {}) {
  return el('button', { class: `kit-btn kit-btn--${variant}`, type: 'button', title, on: { click: onClick } }, label);
}

/* Pill switch between options. options: ['a', 'b'] or [{ value, label }]. */
export function segmented(sim, options, { value, label = '', onChange } = {}) {
  const opts = asOptions(options);
  let current = value ?? opts[0]?.value;
  const pill = el('i', { class: 'kit-seg-pill', 'aria-hidden': 'true' });
  const buttons = opts.map((o) => el('button', {
    class: 'kit-seg-opt', type: 'button', role: 'radio', dataset: { value: String(o.value) },
  }, o.label));
  const node = el('div', { class: 'kit-seg', role: 'radiogroup', 'aria-label': label }, [pill, ...buttons]);

  const paint = () => {
    buttons.forEach((b, i) => {
      const on = opts[i].value === current;
      b.setAttribute('aria-checked', String(on));
      b.classList.toggle('is-on', on);
      if (on && b.offsetWidth) {
        node.style.setProperty('--pill-x', `${b.offsetLeft}px`);
        node.style.setProperty('--pill-w', `${b.offsetWidth}px`);
      }
    });
  };
  buttons.forEach((b, i) => sim.on(b, 'click', () => api.set(opts[i].value)));
  const observer = new ResizeObserver(paint);
  observer.observe(node);
  sim.dispose(() => observer.disconnect());

  const api = {
    node,
    get value() { return current; },
    set(next, { silent = false } = {}) {
      if (next === current) return;
      current = next;
      paint();
      sim.sound('tick');
      if (!silent) onChange?.(current);
    },
  };
  paint();
  return api;
}

/* Labelled range input. format(value) renders the readout. */
export function slider(sim, { label = '', min = 0, max = 100, step = 1, value = min, format = fmt.int, onInput } = {}) {
  const input = el('input', { class: 'kit-range-input', type: 'range', min, max, step, value, 'aria-label': label });
  const out = el('output', { class: 'kit-range-value' });
  const node = el('label', { class: 'kit-range' }, [
    el('span', { class: 'kit-range-head' }, [el('span', { class: 'kit-range-label', text: label }), out]),
    input,
  ]);
  const paint = () => {
    const v = Number(input.value);
    out.textContent = format(v);
    node.style.setProperty('--p', String((v - min) / (max - min || 1)));
  };
  sim.on(input, 'input', () => { paint(); onInput?.(Number(input.value)); });
  paint();
  return {
    node,
    get value() { return Number(input.value); },
    set(v, { silent = false } = {}) {
      input.value = String(clamp(v, min, max));
      paint();
      if (!silent) onInput?.(Number(input.value));
    },
  };
}

/* ---------------------------------------------------------------- numbers */

/* Animated number. set(v) tweens from the shown value to v. */
export function counter(sim, { value = 0, format = fmt.int, duration = 0.9, className = '' } = {}) {
  const node = el('span', { class: `kit-num ${className}`.trim(), text: format(value) });
  let shown = value;
  let target = value;
  let stop = null;
  return {
    node,
    get value() { return target; },
    set(next, { instant = false } = {}) {
      target = next;
      stop?.();
      if (instant) { shown = next; node.textContent = format(next); return; }
      stop = sim.tween({
        from: shown, to: next, duration, ease: ease.out,
        update: (v) => { shown = v; node.textContent = format(v); },
      });
    },
  };
}

/* Horizontal bar chart. items: [{ label, value, color?, note? }].
   color is any CSS color or token, e.g. 'var(--accent-2)'. */
export function bars(sim, items, { max, format = fmt.int, duration = 0.8 } = {}) {
  const node = el('div', { class: 'kit-bars' });
  let rows = [];
  let shown = [];
  let stop = null;

  const layout = (list) => {
    node.replaceChildren();
    rows = list.map((item) => {
      const fill = el('i', { class: 'kit-bar-fill' });
      const value = el('span', { class: 'kit-bar-value' });
      const label = el('span', { class: 'kit-bar-label', text: item.label });
      node.append(el('div', { class: 'kit-bar' }, [label, el('span', { class: 'kit-bar-track' }, [fill]), value]));
      return { label, fill, value };
    });
    shown = list.map(() => 0);
  };

  const paint = (list, values, top) => {
    rows.forEach((r, i) => {
      const item = list[i];
      r.fill.style.transform = `scaleX(${clamp(values[i] / (top || 1))})`;
      r.fill.style.background = item.color || '';
      r.value.textContent = format(values[i]);
      r.label.textContent = item.label;
      r.label.title = item.note || '';
    });
  };

  const api = {
    node,
    update(list, { instant = false } = {}) {
      if (list.length !== rows.length) layout(list);
      const top = max ?? Math.max(...list.map((d) => d.value), 1);
      const from = shown.slice();
      const to = list.map((d) => d.value);
      stop?.();
      if (instant) { shown = to; paint(list, to, top); return; }
      stop = sim.tween({
        duration, ease: ease.out,
        update: (_, k) => {
          shown = from.map((f, i) => lerp(f, to[i], ease.out(k)));
          paint(list, shown, top);
        },
      });
    },
  };
  api.update(items, { instant: true });
  return api;
}

/* ---------------------------------------------------------------- reveal */

/* Staggered entrance: nodes fade and rise in one after another. */
export function reveal(sim, nodes, { stagger = 0.08, delay = 0 } = {}) {
  const list = [].concat(nodes).filter(Boolean);
  list.forEach((n) => { n.classList.add('kit-pre'); n.classList.remove('kit-in'); });
  const stops = list.map((n, i) => sim.after(delay + i * stagger, () => n.classList.add('kit-in')));
  if (sim.reduced) list.forEach((n) => n.classList.add('kit-in'));
  return () => stops.forEach((s) => s());
}

/* -------------------------------------------------------------- terminal */

/* Fake terminal. lines: [{ text, kind }] with kind one of
   cmd (typed, with prompt), out, ok, warn, err, dim, accent. */
export function terminal(sim, { title = 'terminal', prompt = '$', cps = 42 } = {}) {
  const body = el('div', { class: 'kit-term-body' });
  const node = el('div', { class: 'kit-term' }, [
    el('div', { class: 'kit-term-bar' }, [
      el('i'), el('i'), el('i'),
      el('span', { class: 'kit-term-title', text: title }),
    ]),
    body,
  ]);
  let job = null;
  let stopLoop = null;

  const lineNode = (line) => {
    const text = el('span', { class: 'kit-term-text' });
    const row = el('div', { class: `kit-term-line kit-term-line--${line.kind || 'out'}` }, [
      line.kind === 'cmd' ? el('span', { class: 'kit-term-prompt', text: `${prompt} ` }) : null,
      text,
    ]);
    body.append(row);
    body.scrollTop = body.scrollHeight;
    return text;
  };
  const caret = (textNode) => {
    body.querySelector('.kit-term-caret')?.remove();
    textNode?.after(el('i', { class: 'kit-term-caret', 'aria-hidden': 'true' }));
    body.scrollTop = body.scrollHeight;
  };

  const finish = () => {
    if (!job) return;
    const { lines, resolve } = job;
    if (job.cur) job.cur.textContent = lines[job.li].text;
    const start = job.cur ? job.li + 1 : job.li;
    let lastText = job.cur;
    for (const line of lines.slice(start)) {
      lastText = lineNode(line);
      lastText.textContent = line.text;
    }
    caret(lastText);
    job = null;
    stopLoop?.();
    stopLoop = null;
    resolve();
  };

  const loop = (dt) => {
    if (!job) return;
    job.wait -= dt;
    if (job.wait > 0) return;
    const line = job.lines[job.li];
    if (!line) { finish(); return; }
    if (!job.cur) {
      job.cur = lineNode(line);
      job.ci = 0;
      job.acc = 0;
      caret(job.cur);
      if (line.kind !== 'cmd') {
        job.cur.textContent = line.text;
        body.scrollTop = body.scrollHeight;
        job.li += 1;
        job.cur = null;
        job.wait = line.delay ?? 0.1;
        return;
      }
    }
    job.acc += dt * cps;
    const n = Math.floor(job.acc);
    if (n < 1) return;
    job.acc -= n;
    job.ci = Math.min(line.text.length, job.ci + n);
    job.cur.textContent = line.text.slice(0, job.ci);
    if (job.ci >= line.text.length) {
      if (n === 1) sim.sound('tick');
      job.li += 1;
      job.cur = null;
      job.wait = line.delay ?? 0.4;
    }
  };

  return {
    node,
    /* Types lines after the current content. Resolves when done. */
    type(lines) {
      finish();
      return new Promise((resolve) => {
        job = { lines, li: 0, cur: null, ci: 0, acc: 0, wait: 0.15, resolve };
        if (sim.reduced) { finish(); return; }
        stopLoop = sim.frame(loop);
      });
    },
    /* Prints lines at once (backwards entry, reset, reduced motion). */
    show(lines) {
      finish();
      let lastText = null;
      for (const line of lines) {
        lastText = lineNode(line);
        lastText.textContent = line.text;
      }
      caret(lastText);
    },
    clear() {
      if (job) { job = null; stopLoop?.(); stopLoop = null; }
      body.replaceChildren();
    },
  };
}

/* ------------------------------------------------------------------ flow */

/* Node-and-edge diagram in a fixed viewBox (default 1000 x 520).
   nodes: [{ id, label, sub?, x, y, w?, h? }] with x, y the node centre.
   edges: [{ from, to }]. States: 'idle' | 'active' | 'done' | 'dim'. */
export function flow(sim, { nodes, edges = [], width = 1000, height = 520 } = {}) {
  const root = svg('svg', { class: 'kit-flow', viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'xMidYMid meet', role: 'img' });
  const edgeLayer = svg('g', { class: 'kit-flow-edges' });
  const packetLayer = svg('g', { class: 'kit-flow-packets' });
  const nodeLayer = svg('g', { class: 'kit-flow-nodes' });
  root.append(edgeLayer, packetLayer, nodeLayer);

  const byId = new Map();
  for (const n of nodes) {
    const w = n.w ?? 176;
    const h = n.h ?? (n.sub ? 76 : 60);
    const g = svg('g', { class: 'kit-flow-node', dataset: { state: 'idle' }, transform: `translate(${n.x - w / 2} ${n.y - h / 2})` }, [
      svg('rect', { class: 'kit-flow-box', width: w, height: h, rx: 14 }),
      svg('text', { class: 'kit-flow-label', x: w / 2, y: n.sub ? h / 2 - 5 : h / 2 + 7, 'text-anchor': 'middle', text: n.label }),
      n.sub ? svg('text', { class: 'kit-flow-sub', x: w / 2, y: h / 2 + 20, 'text-anchor': 'middle', text: n.sub }) : null,
    ]);
    nodeLayer.append(g);
    byId.set(n.id, { ...n, w, h, g });
  }

  const edgeKey = (a, b) => `${a}->${b}`;
  const edgeMap = new Map();
  for (const e of edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    let d;
    if (horizontal) {
      const dir = Math.sign(b.x - a.x) || 1;
      const x1 = a.x + (dir * a.w) / 2;
      const x2 = b.x - (dir * b.w) / 2;
      const mx = (x1 + x2) / 2;
      d = `M${x1} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${x2} ${b.y}`;
    } else {
      const dir = Math.sign(b.y - a.y) || 1;
      const y1 = a.y + (dir * a.h) / 2;
      const y2 = b.y - (dir * b.h) / 2;
      const my = (y1 + y2) / 2;
      d = `M${a.x} ${y1} C${a.x} ${my} ${b.x} ${my} ${b.x} ${y2}`;
    }
    const path = svg('path', { class: 'kit-flow-edge', d, dataset: { state: 'idle' } });
    edgeLayer.append(path);
    edgeMap.set(edgeKey(e.from, e.to), path);
  }

  const node = el('div', { class: 'kit-flow-wrap' }, [root]);
  const packets = new Set();
  const clearPackets = () => {
    for (const stop of packets) stop();
    packets.clear();
    packetLayer.replaceChildren();
  };
  sim.dispose(clearPackets);

  return {
    node,
    set(id, state) {
      const n = byId.get(id);
      if (n) n.g.dataset.state = state;
    },
    edge(from, to, state) {
      const p = edgeMap.get(edgeKey(from, to));
      if (p) p.dataset.state = state;
    },
    /* Everything to one state, e.g. reset to 'idle'. */
    all(state) {
      for (const n of byId.values()) n.g.dataset.state = state;
      for (const p of edgeMap.values()) p.dataset.state = state;
    },
    /* Sends a dot along an edge. Resolves when it arrives; never resolves if
       clearPackets() or reset cancels it, so chained steps stop there too. */
    send(from, to, { duration = 0.8, color } = {}) {
      const path = edgeMap.get(edgeKey(from, to));
      if (!path || sim.reduced) return Promise.resolve();
      const length = path.getTotalLength();
      const dot = svg('circle', { class: 'kit-flow-packet', r: 7, style: color ? { fill: color } : null });
      packetLayer.append(dot);
      return new Promise((resolve) => {
        const stop = sim.tween({
          duration, ease: ease.inOut,
          update: (k) => {
            const p = path.getPointAtLength(k * length);
            dot.setAttribute('cx', p.x);
            dot.setAttribute('cy', p.y);
          },
          done: () => { packets.delete(stop); dot.remove(); resolve(); },
        });
        packets.add(stop);
      });
    },
    clearPackets,
  };
}
