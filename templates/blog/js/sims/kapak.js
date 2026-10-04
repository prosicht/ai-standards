/* kapak (hero): ink lines drifting through a flow field behind the title.
   Pattern: full-bleed canvas, seeded particles with short trails, the pointer
   bends the field around it. The bottom-left stays calm: the title sits there.
   Deterministic (same seed, same take). Reduced motion draws one still frame. */

import { createSim, el, fitCanvas, rng, token, alpha, clamp } from '../core/engine.js';

const SEED = 11;
const TRAIL = 64;
const WARMUP = 90;

export default function mount(root, ctx) {
  const sim = createSim(root, ctx);
  const canvas = el('canvas', { class: 'ui-fill', 'aria-hidden': 'true' });
  root.append(canvas);
  const { c2d, size } = fitCanvas(sim, canvas);

  const colors = {
    fg: token('--fg', '#1c1915'),
    a: token('--accent', '#b93a1d'),
    b: token('--accent-2', '#1f5f8f'),
    c: token('--accent-3', '#2f7a56'),
  };
  const pointer = { x: -1e4, y: -1e4 };
  let r = rng(SEED);
  let particles = [];
  let clock = 0;

  /* direction of the field at (x, y): a few slow sine waves */
  function flow(x, y, t) {
    const nx = x / size.width;
    const ny = y / size.height;
    const a = Math.sin(nx * 3.2 + t * 0.06) * 1.25
      + Math.cos(ny * 4.1 - t * 0.045) * 0.9
      + Math.sin((nx + ny) * 6.3 + t * 0.08) * 0.45;
    let vx = Math.cos(a);
    let vy = Math.sin(a) * 0.75;
    const dx = x - pointer.x;
    const dy = y - pointer.y;
    const d = Math.hypot(dx, dy);
    if (d < 240 && d > 1) {
      const k = (1 - d / 240) ** 2 * 2.4;
      vx += (-dy / d) * k;
      vy += (dx / d) * k;
    }
    const len = Math.hypot(vx, vy) || 1;
    return [vx / len, vy / len];
  }

  function spawn(p) {
    p.x = r() * size.width;
    p.y = r() * size.height;
    p.hist = [];
    p.age = 0;
    p.life = r.range(4, 9);
    p.speed = r.range(48, 110);
    p.width = r.range(0.6, 1.8);
    p.tint = r.chance(0.16) ? 'a' : r.chance(0.12) ? 'b' : r.chance(0.08) ? 'c' : 'fg';
    return p;
  }

  function seed() {
    r = rng(SEED);
    clock = 0;
    const count = Math.round(clamp((size.width * size.height) / 7000, 90, 260));
    particles = Array.from({ length: count }, () => spawn({}));
    /* stagger ages so lines do not all fade together, then pre-run the field */
    particles.forEach((p) => { p.age = r.range(0, p.life); });
    for (let i = 0; i < WARMUP; i += 1) step(1 / 60);
  }

  function step(dt) {
    clock += dt;
    const W = size.width;
    const H = size.height;
    for (const p of particles) {
      const [vx, vy] = flow(p.x, p.y, clock);
      p.x += vx * p.speed * dt;
      p.y += vy * p.speed * dt;
      p.age += dt;
      p.hist.push(p.x, p.y);
      if (p.hist.length > TRAIL * 2) p.hist.splice(0, 2);
      if (p.age > p.life || p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) spawn(p);
    }
  }

  /* fewer marks where the title sits: bottom-left */
  function calm(x, y) {
    const cx = clamp((0.64 - x / size.width) / 0.28);
    const cy = clamp((y / size.height - 0.46) / 0.22);
    return 1 - 0.85 * cx * cy;
  }

  function draw() {
    c2d.clearRect(0, 0, size.width, size.height);
    c2d.lineCap = 'round';
    c2d.lineJoin = 'round';
    for (const p of particles) {
      const n = p.hist.length / 2;
      if (n < 2) continue;
      const fade = Math.min(1, p.age / 0.8, (p.life - p.age) / 1.2);
      const base = p.tint === 'fg' ? 0.26 : 0.7;
      const a = clamp(base * fade * calm(p.x, p.y));
      if (a <= 0.01) continue;
      c2d.strokeStyle = alpha(colors[p.tint], a);
      c2d.lineWidth = p.width;
      c2d.beginPath();
      c2d.moveTo(p.hist[0], p.hist[1]);
      for (let i = 2; i < p.hist.length; i += 2) c2d.lineTo(p.hist[i], p.hist[i + 1]);
      c2d.stroke();
      if (p.tint !== 'fg') {
        c2d.fillStyle = alpha(colors[p.tint], a);
        c2d.beginPath();
        c2d.arc(p.x, p.y, p.width + 1.2, 0, Math.PI * 2);
        c2d.fill();
      }
    }
  }

  /* the hero text covers part of the canvas, so listen on the window */
  sim.on(window, 'pointermove', (event) => {
    const p = sim.point(event, canvas);
    pointer.x = p.x;
    pointer.y = p.y;
  });
  sim.on(document.documentElement, 'pointerleave', () => { pointer.x = -1e4; pointer.y = -1e4; });

  seed();
  let still = false;
  sim.frame((dt) => {
    if (sim.reduced) {
      /* one still frame, plus repaints on resize (dt = 0) */
      if (still && dt > 0) return;
      still = true;
    } else if (dt > 0) step(dt);
    draw();
  });

  return sim.api({ reset: seed });
}
