/* sure (split-flip): what-if calculator for talk length.
   Pattern: kit sliders + segmented driving a counter, bars and a timeline.
   No external data: every number is computed from the sliders. */

import { createSim, el, fmt } from '../core/engine.js';
import { slider, segmented, counter, bars } from '../core/kit.js';

const OPENING = 1;
const CLOSING = 1;
const DEFAULTS = { chapters: 8, perChapter: 1.5, qa: 10, slot: 30 };

const minutes = (v) => `${Number.isInteger(v) ? fmt.int(v) : fmt.dec(v, 1)} dk`;

export const css = true;

export default function mount(root, ctx) {
  const sim = createSim(root, ctx);
  const state = { ...DEFAULTS };

  const chapters = slider(sim, { label: 'Bölüm sayısı', min: 3, max: 16, value: state.chapters, onInput: (v) => { state.chapters = v; update(); } });
  const perChapter = slider(sim, { label: 'Bölüm başına', min: 0.5, max: 4, step: 0.5, value: state.perChapter, format: minutes, onInput: (v) => { state.perChapter = v; update(); } });
  const qa = slider(sim, { label: 'Soru-cevap', min: 0, max: 20, step: 5, value: state.qa, format: minutes, onInput: (v) => { state.qa = v; update(); } });
  const slot = segmented(sim, [15, 30, 45].map((v) => ({ value: v, label: `${v} dk` })), {
    value: state.slot,
    label: 'Ayrılan süre',
    onChange: (v) => { state.slot = v; update(); },
  });

  const total = counter(sim, { value: 0, format: (v) => fmt.int(v) });
  const verdict = el('span', { class: 'ui-chip su-verdict' });
  const chart = bars(sim, [], { format: minutes });
  const strip = el('div', { class: 'su-strip' });
  const marker = el('i', { class: 'su-marker' }, [el('span')]);
  const timeline = el('div', { class: 'su-timeline' }, [el('span', { class: 'ui-label su-tl-label', text: 'Zaman çizelgesi' }), strip, marker]);

  root.append(el('div', { class: 'su' }, [
    el('div', { class: 'su-controls ui-card' }, [
      chapters.node, perChapter.node, qa.node,
      el('div', { class: 'su-slot' }, [el('span', { class: 'ui-label', text: 'Ayrılan süre' }), slot.node]),
    ]),
    el('div', { class: 'su-result ui-card' }, [
      el('div', { class: 'su-total' }, [
        el('span', { class: 'ui-label', text: 'Toplam' }),
        el('span', { class: 'ui-big' }, [total.node, el('small', { text: ' dk' })]),
        verdict,
      ]),
      chart.node,
      timeline,
    ]),
  ]));

  const breakdown = () => [
    { label: 'Bölümler', value: state.chapters * state.perChapter, color: 'var(--accent)' },
    { label: 'Soru-cevap', value: state.qa, color: 'var(--accent-2)' },
    { label: 'Açılış + kapanış', value: OPENING + CLOSING, color: 'var(--accent-3)' },
  ];

  function update({ instant = false } = {}) {
    const talk = state.chapters * state.perChapter;
    const sum = OPENING + talk + CLOSING + state.qa;
    const diff = state.slot - sum;
    total.set(sum, { instant });
    verdict.textContent = diff >= 0 ? `${minutes(diff)} boşluk` : `${minutes(-diff)} aşım`;
    verdict.dataset.tone = diff >= 0 ? 'good' : 'bad';

    chart.update(breakdown(), { instant });

    /* timeline: one segment per chapter, scaled to the larger of total and slot */
    const span = Math.max(sum, state.slot);
    const segs = [
      { m: OPENING, kind: 'edge' },
      ...Array.from({ length: state.chapters }, () => ({ m: state.perChapter, kind: 'chapter' })),
      { m: CLOSING, kind: 'edge' },
      ...(state.qa ? [{ m: state.qa, kind: 'qa' }] : []),
      ...(span > sum ? [{ m: span - sum, kind: 'free' }] : []),
    ];
    /* reuse segment nodes so flex-grow transitions instead of rebuilding */
    while (strip.children.length < segs.length) strip.append(el('i'));
    while (strip.children.length > segs.length) strip.lastChild.remove();
    segs.forEach((s, i) => {
      const node = strip.children[i];
      node.className = `su-seg su-seg--${s.kind}`;
      node.style.flexGrow = String(s.m);
    });
    marker.style.left = `${(state.slot / span) * 100}%`;
    marker.firstChild.textContent = `${state.slot} dk`;
    timeline.dataset.over = String(diff < 0);
  }

  /* entrance: lay everything out, then count the total up from zero */
  function intro() {
    update({ instant: true });
    total.set(0, { instant: true });
    chart.update(breakdown().map((d) => ({ ...d, value: 0 })), { instant: true });
    sim.after(0.25, () => update());
  }
  intro();

  return sim.api({
    reset() {
      Object.assign(state, DEFAULTS);
      chapters.set(state.chapters, { silent: true });
      perChapter.set(state.perChapter, { silent: true });
      qa.set(state.qa, { silent: true });
      slot.set(state.slot, { silent: true });
      intro();
    },
  });
}
