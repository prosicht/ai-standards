/* kurulum (scrolly): a page assembling itself, one stage per text step.
   Pattern: stage-driven CSS states. Every element of the page is always in
   the layout; a stage only toggles classes, CSS transitions do the motion.
   dir 0 (entry, reset, jump while scrolling fast) applies the state without
   transitions. sim.resize() re-measures where the photos land. */

import { createSim, el } from '../core/engine.js';

const IMG = 'assets/images/demo';
const PHOTOS = [
  { src: `${IMG}/manzara.svg`, from: { x: '3%', y: '10%', w: '19%', r: '-8deg' } },
  { src: `${IMG}/palet.svg`, from: { x: '79%', y: '16%', w: '18%', r: '7deg' } },
  { src: `${IMG}/doku.svg`, from: { x: '5%', y: '64%', w: '17%', r: '5deg' } },
];
const STAGE_COUNT = 6;

export const css = true;

export default function mount(root, ctx) {
  const sim = createSim(root, ctx);

  /* at: the first stage an element is shown on */
  const part = (cls, at, children) => el('div', { class: `ku-part ${cls}`, dataset: { at } }, children);
  const lines = (n, cls) => Array.from({ length: n }, (_, i) => el('i', { class: cls, style: { '--i': i } }));

  const slotCells = PHOTOS.map(() => el('span', { class: 'ku-cell' }));
  const slot = part('ku-slot', 2, slotCells);
  slot.dataset.ghost = 'true';
  const bars = [0.45, 0.8, 0.6, 1, 0.7].map((v, i) => el('i', { class: 'ku-bar', style: { '--v': v, '--i': i } }));

  const page = el('div', { class: 'ku-page' }, [
    part('ku-hero', 1),
    part('ku-head', 1, [el('i', { class: 'ku-kicker' }), el('i', { class: 'ku-h1' }), el('i', { class: 'ku-h1 ku-h1--short' }), el('span', { class: 'ku-meta', text: '8 dk okuma' })]),
    part('ku-text', 2, lines(5, 'ku-line')),
    slot,
    part('ku-chart', 4, [el('span', { class: 'ku-chip', text: 'Dene' }), el('div', { class: 'ku-bars' }, bars)]),
    part('ku-sources', 5, lines(2, 'ku-src')),
    el('span', { class: 'ku-stamp', dataset: { at: 5 }, text: 'Hazır ✓' }),
  ]);

  const topic = el('div', { class: 'ku-topic', dataset: { at: 0 } }, [
    el('span', { class: 'ui-label', text: 'Konu' }),
    el('strong', { text: 'Ev kahvesi demleme yöntemleri' }),
    el('i', { class: 'ku-caret' }),
  ]);

  const thumbs = PHOTOS.map((p) => el('img', {
    class: 'ku-thumb',
    src: p.src,
    alt: '',
    draggable: 'false',
    style: { '--ax': p.from.x, '--ay': p.from.y, '--aw': p.from.w, '--ar': p.from.r },
  }));

  const wrap = el('div', { class: 'ku' }, [page, topic, ...thumbs]);
  root.append(wrap);

  /* where each photo lands: the slot cells, in .ku coordinates (offsets
     ignore transforms, so the hidden parts' offsets are already final) */
  const measure = () => {
    slotCells.forEach((cell, i) => {
      thumbs[i].style.setProperty('--bx', `${page.offsetLeft + slot.offsetLeft + cell.offsetLeft}px`);
      thumbs[i].style.setProperty('--by', `${page.offsetTop + slot.offsetTop + cell.offsetTop}px`);
      thumbs[i].style.setProperty('--bw', `${cell.offsetWidth}px`);
    });
  };
  sim.resize(measure);

  const shown = [...wrap.querySelectorAll('[data-at]')];

  sim.stages(STAGE_COUNT, (i, { dir }) => {
    if (dir === 0 || sim.reduced) wrap.classList.add('is-instant');
    wrap.dataset.stage = String(i);
    for (const node of shown) {
      const at = Number(node.dataset.at);
      node.classList.toggle('is-on', at === 0 ? i === 0 : i >= at);
    }
    slot.dataset.ghost = String(i < 3);
    if (i >= 3) measure(); /* web fonts may have moved the slot since mount */
    thumbs.forEach((t) => t.classList.toggle('is-placed', i >= 3));
    if (wrap.classList.contains('is-instant')) {
      void wrap.offsetWidth;
      wrap.classList.remove('is-instant');
    }
  });

  return sim.api();
}
