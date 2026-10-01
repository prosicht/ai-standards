/* katmanlar (split): the three layers of a deck. → walks the layers; the
   switch and the cards can be clicked too.
   Pattern: kit segmented + sim.stages driving one selected item. */

import { createSim, el } from '../core/engine.js';
import { segmented } from '../core/kit.js';

const LAYERS = [
  {
    id: 'kabuk',
    name: 'Kabuk',
    role: 'Gezinme, geçişler, ölçekleme, notlar ve sunucu görünümü.',
    files: ['index.html', 'js/core/app.js', 'js/core/sound.js', 'css/core/shell.css'],
    owner: 'çekirdek · update yeniler',
    core: true,
  },
  {
    id: 'icerik',
    name: 'İçerik',
    role: 'Bölüm sırası, başlıklar, notlar, kaynaklar ve renkler.',
    files: ['js/scenes.js', 'css/theme.css', 'sources.md'],
    owner: 'sunuma ait · update dokunmaz',
    core: false,
  },
  {
    id: 'sim',
    name: 'Simülasyon',
    role: 'Her bölümün canlı kısmı. mount(root, ctx) sözleşmesine uyar.',
    files: ['js/sims/<id>.js', 'css/sims/<id>.css', 'js/core/engine.js', 'js/core/kit.js'],
    owner: 'bölümler sunuma ait · engine ve kit çekirdek',
    core: false,
  },
];

export const css = true;

export default function mount(root, ctx) {
  const sim = createSim(root, ctx);
  let stages = null;

  const switcher = segmented(sim, LAYERS.map((l, i) => ({ value: i, label: l.name })), {
    label: 'Katman',
    onChange: (i) => stages.go(i),
  });

  /* drawn top to bottom: the shell is the foundation at the bottom */
  const cards = LAYERS.map((layer, i) => {
    const files = el('div', { class: 'kt-files' }, layer.files.map((f) => el('span', { class: 'ui-chip', text: f })));
    const card = el('button', { class: 'kt-layer', type: 'button', dataset: { layer: layer.id } }, [
      el('span', { class: 'kt-glyph', text: String(i + 1).padStart(2, '0') }),
      el('span', { class: 'kt-main' }, [
        el('span', { class: 'kt-name', text: layer.name }),
        el('span', { class: 'kt-role', text: layer.role }),
        files,
      ]),
      el('span', { class: `kt-owner ${layer.core ? 'is-core' : ''}`, text: layer.owner }),
    ]);
    sim.on(card, 'click', () => stages.go(i));
    return card;
  });

  root.append(el('div', { class: 'kt' }, [
    el('div', { class: 'kt-top' }, [el('span', { class: 'ui-label', text: 'Katman seç' }), switcher.node]),
    el('div', { class: 'kt-stack' }, cards.slice().reverse()),
  ]));

  stages = sim.stages(LAYERS.length, (i) => {
    cards.forEach((card, k) => {
      card.classList.toggle('is-on', k === i);
      card.classList.toggle('is-below', k < i);
    });
    switcher.set(i, { silent: true });
    sim.sound('pop');
  });

  return sim.api();
}
