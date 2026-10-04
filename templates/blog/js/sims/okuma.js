/* okuma (sim, wide): what-if calculator for reading time.
   Pattern: kit sliders driving a counter, bars and a stacked strip. The
   formula is the shell's own: words / speed + 10 s per image + 30 s per
   figure. No external data; the default speed is the shell's assumption. */

import { createSim, el, fmt } from '../core/engine.js';
import { slider, counter, bars } from '../core/kit.js';

const IMAGE_SEC = 10;
const FIGURE_SEC = 30;
const DEFAULTS = { words: 1800, images: 6, figures: 3, speed: 200 };

const minutes = (v) => `${v < 10 ? fmt.dec(v, 1) : fmt.int(v)} dk`;

export const css = true;

export default function mount(root, ctx) {
  const sim = createSim(root, ctx);
  const state = { ...DEFAULTS };
  const set = (key) => (v) => { state[key] = v; update(); };

  const controls = [
    slider(sim, { label: 'Kelime', min: 300, max: 5000, step: 100, value: state.words, onInput: set('words') }),
    slider(sim, { label: 'Görsel', min: 0, max: 24, value: state.images, onInput: set('images') }),
    slider(sim, { label: 'Etkileşimli figür', min: 0, max: 10, value: state.figures, onInput: set('figures') }),
    slider(sim, { label: 'Okuma hızı (kelime/dk)', min: 150, max: 300, step: 10, value: state.speed, onInput: set('speed') }),
  ];

  const total = counter(sim, { value: 0, format: (v) => (v < 10 ? fmt.dec(v, 1) : fmt.int(v)) });
  const verdict = el('span', { class: 'ui-chip ok-verdict' });
  const chart = bars(sim, [], { format: minutes });
  const strip = el('div', { class: 'ok-strip' }, ['text', 'images', 'figures'].map((k) => el('i', { class: `ok-seg ok-seg--${k}` })));

  root.append(el('div', { class: 'ok' }, [
    el('div', { class: 'ok-controls' }, controls.map((c) => c.node)),
    el('div', { class: 'ok-result' }, [
      el('div', { class: 'ok-total' }, [
        el('span', { class: 'ui-label', text: 'Okuma süresi' }),
        el('span', { class: 'ui-big' }, [total.node, el('small', { text: ' dk' })]),
        verdict,
      ]),
      chart.node,
      strip,
    ]),
  ]));

  const parts = () => [
    { label: 'Metin', value: state.words / state.speed, color: 'var(--accent)' },
    { label: 'Görseller', value: (state.images * IMAGE_SEC) / 60, color: 'var(--accent-2)' },
    { label: 'Figürler', value: (state.figures * FIGURE_SEC) / 60, color: 'var(--accent-3)' },
  ];

  function update({ instant = false } = {}) {
    const list = parts();
    const sum = list.reduce((a, p) => a + p.value, 0);
    total.set(sum, { instant });
    verdict.textContent = sum < 4 ? 'Kısa okuma' : sum < 10 ? 'Orta uzunlukta' : 'Uzun okuma';
    verdict.dataset.tone = sum < 4 ? 'short' : sum < 10 ? 'mid' : 'long';
    chart.update(list, { instant });
    [...strip.children].forEach((seg, i) => { seg.style.flexGrow = String(Math.max(list[i].value, 0.001)); });
  }

  /* entrance: lay out, then count up from zero once the figure is on screen */
  function intro() {
    update({ instant: true });
    total.set(0, { instant: true });
    chart.update(parts().map((p) => ({ ...p, value: 0 })), { instant: true });
    sim.after(0.3, () => update());
  }
  intro();

  return sim.api({
    reset() {
      Object.assign(state, DEFAULTS);
      controls[0].set(state.words, { silent: true });
      controls[1].set(state.images, { silent: true });
      controls[2].set(state.figures, { silent: true });
      controls[3].set(state.speed, { silent: true });
      intro();
    },
  });
}
