/* intro (hero): ambient constellation behind the title.
   Pattern: full-bleed canvas, seeded points, pointer reactive, pulse rings.
   Deterministic: R replays the same field. Reduced motion draws one still frame. */

import { createSim, el, fitCanvas, rng, token, alpha, clamp } from '../core/engine.js';

const SEED = 7;
const PULSE_EVERY = 1.4;

export default function mount(root, ctx) {
  const sim = createSim(root, ctx);
  const canvas = el('canvas', { class: 'ui-fill', 'aria-hidden': 'true' });
  root.append(canvas);
  const { c2d, size } = fitCanvas(sim, canvas);

  const colors = {
    fg: token('--fg', '#ffffff'),
    a: token('--accent', '#ffb547'),
    b: token('--accent-2', '#66c7ff'),
    c: token('--accent-3', '#b79cff'),
  };
  const pointer = { x: -1e4, y: -1e4 };
  let points = [];
  let pulses = [];
  let pulseRng = rng(SEED + 1);
  let sincePulse = 0;

  function seed() {
    const r = rng(SEED);
    const count = Math.round(clamp((size.width * size.height) / 13000, 60, 150));
    points = Array.from({ length: count }, () => ({
      /* denser on the right and top so the title area stays calm */
      x: 0.12 + 0.88 * r() ** 0.65,
      y: r() ** 1.15,
      phase: r.range(0, Math.PI * 2),
      speed: r.range(0.08, 0.22),
      amp: r.range(10, 30),
      size: r.range(1.1, 2.6),
      tint: r.chance(0.14) ? 'a' : r.chance(0.12) ? 'b' : r.chance(0.08) ? 'c' : 'fg',
      ox: 0,
      oy: 0,
    }));
    pulses = [];
    pulseRng = rng(SEED + 1);
    sincePulse = 0;
  }

  function draw(dt, time) {
    const W = size.width;
    const H = size.height;
    const tt = sim.reduced ? 0 : time;
    c2d.clearRect(0, 0, W, H);

    const pos = points.map((p) => {
      const bx = p.x * W + Math.cos(tt * p.speed + p.phase) * p.amp;
      const by = p.y * H + Math.sin(tt * p.speed * 1.3 + p.phase) * p.amp;
      const dx = bx - pointer.x;
      const dy = by - pointer.y;
      const d = Math.hypot(dx, dy);
      const R = 190;
      let tx = 0;
      let ty = 0;
      if (d < R && d > 0.01) {
        const f = (1 - d / R) ** 2 * 70;
        tx = (dx / d) * f;
        ty = (dy / d) * f;
      }
      const k = Math.min(1, dt * 6);
      p.ox += (tx - p.ox) * k;
      p.oy += (ty - p.oy) * k;
      return { x: bx + p.ox, y: by + p.oy, p, near: d < R ? 1 - d / R : 0 };
    });

    const link = Math.min(170, W * 0.12);
    c2d.lineWidth = 1;
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = i + 1; j < pos.length; j += 1) {
        const a = pos[i];
        const b = pos[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > link) continue;
        const near = Math.max(a.near, b.near);
        const strength = (1 - d / link) * (0.22 + near * 0.6);
        c2d.strokeStyle = alpha(near > 0.05 ? colors.a : colors.fg, strength);
        c2d.beginPath();
        c2d.moveTo(a.x, a.y);
        c2d.lineTo(b.x, b.y);
        c2d.stroke();
      }
    }

    for (const q of pos) {
      c2d.fillStyle = alpha(colors[q.p.tint], q.p.tint === 'fg' ? 0.55 + q.near * 0.4 : 0.95);
      c2d.beginPath();
      c2d.arc(q.x, q.y, q.p.size + q.near * 2.5, 0, Math.PI * 2);
      c2d.fill();
    }

    if (!sim.reduced) {
      sincePulse += dt;
      if (sincePulse >= PULSE_EVERY && pos.length) {
        sincePulse = 0;
        const src = pos[Math.floor(pulseRng() * pos.length)];
        pulses.push({ i: points.indexOf(src.p), t: 0, color: pulseRng.chance(0.5) ? colors.a : colors.b });
      }
      pulses = pulses.filter((pl) => (pl.t += dt) < 1.8);
      for (const pl of pulses) {
        const at = pos[pl.i];
        if (!at) continue;
        const k = pl.t / 1.8;
        c2d.strokeStyle = alpha(pl.color, (1 - k) * 0.7);
        c2d.lineWidth = 1.5;
        c2d.beginPath();
        c2d.arc(at.x, at.y, 6 + k * 110, 0, Math.PI * 2);
        c2d.stroke();
      }
    }
  }

  sim.on(root, 'pointermove', (event) => {
    const p = sim.point(event, canvas);
    pointer.x = p.x;
    pointer.y = p.y;
  });
  sim.on(root, 'pointerleave', () => { pointer.x = -1e4; pointer.y = -1e4; });

  seed();
  let drewStill = false;
  sim.frame((dt, time) => {
    /* reduced motion: one still frame, plus repaints on resize (dt = 0) */
    if (sim.reduced && drewStill && dt > 0) return;
    drewStill = true;
    draw(dt, time);
  });

  return sim.api({ reset: seed });
}
