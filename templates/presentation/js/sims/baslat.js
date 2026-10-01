/* baslat (full): from an empty folder to a running deck, one stage per →.
   Pattern: kit terminal typed per stage + a side panel that follows it.
   The AI run in stage 3 and the deck id in stage 4 are illustrative and
   labelled as such on screen. */

import { createSim, el } from '../core/engine.js';
import { terminal, reveal } from '../core/kit.js';

const STAGES = [
  [
    { kind: 'cmd', text: 'mkdir kobi-yapay-zeka && cd kobi-yapay-zeka' },
    { kind: 'cmd', text: 'npx prosicht init' },
    { kind: 'out', text: '? Ne yapmak istiyorsunuz? › Sunum' },
  ],
  [
    { kind: 'dim', text: '[Pro Sicht] Sunum altyapisi indiriliyor...' },
    { kind: 'ok', text: '  + AGENTS.md  index.html' },
    { kind: 'ok', text: '  + js/core/  app.js  engine.js  kit.js  sound.js' },
    { kind: 'ok', text: '  + css/core/shell.css  css/theme.css' },
    { kind: 'ok', text: '  + js/scenes.js  js/sims/  sources.md' },
    { kind: 'out', text: 'Basarili: 22 dosya yazildi (Sunum altyapisi v2.0.0).' },
  ],
  [
    { kind: 'cmd', text: 'claude "KOBİ’ler için yapay zekâ, 10 dakikalık sunum hazırla"' },
    { kind: 'accent', text: '● brief: KOBİ sahipleri · 10 dk · Türkçe' },
    { kind: 'accent', text: '● 8 bölüm planlandı → js/scenes.js, sources.md' },
    { kind: 'accent', text: '● 8 simülasyon yazıldı → js/sims/' },
    { kind: 'ok', text: '✓ kontrol: 8/8 bölüm açıldı, konsol temiz' },
  ],
  [
    { kind: 'cmd', text: 'npx prosicht publish' },
    { kind: 'out', text: '? Ne yayinlamak istiyorsunuz? › Sunum' },
    { kind: 'out', text: '? Yayin adresi › deck.prosicht.com' },
    { kind: 'out', text: '? Lutfen keyi giriniz › ********************************' },
    { kind: 'ok', text: 'Yayinlandi: https://deck.prosicht.com/v/k3x9p2m7qa' },
  ],
];

const CORE = ['AGENTS.md', 'index.html', 'js/core/app.js', 'js/core/engine.js', 'js/core/kit.js', 'js/core/sound.js', 'css/core/shell.css'];
const DECK = ['js/scenes.js', 'css/theme.css', 'sources.md', 'js/sims/<bölüm>.js'];

export const css = true;

export default function mount(root, ctx) {
  const sim = createSim(root, ctx);
  const term = terminal(sim, { title: 'zsh · temsili çıktı' });

  /* core files are compact chips, deck files full rows with a status tag */
  const coreRows = CORE.map((f) => el('li', { class: 'bs-chip', text: f }));
  const deckRows = DECK.map((f) => el('li', { class: 'bs-file' }, [
    el('span', { class: 'bs-file-name', text: f }),
    el('span', { class: 'bs-file-tag' }),
  ]));
  const empty = el('p', { class: 'bs-empty', text: 'Klasör boş.' });
  const ready = el('div', { class: 'bs-ready' }, [
    el('span', { class: 'ui-label', text: 'Yayında' }),
    el('span', { class: 'bs-url', text: 'deck.prosicht.com/v/k3x9p2m7qa' }),
  ]);
  const tree = el('div', { class: 'bs-tree' }, [
    el('p', { class: 'ui-label', text: 'Çekirdek · update yeniler' }),
    el('ul', { class: 'bs-chips' }, coreRows),
    el('p', { class: 'ui-label', text: 'Sunuma ait · AI yazar' }),
    el('ul', { class: 'bs-list' }, deckRows),
  ]);
  const panel = el('div', { class: 'bs-panel ui-card' }, [el('p', { class: 'bs-title', text: 'Klasörde ne var?' }), empty, tree, ready]);

  root.append(el('div', { class: 'bs' }, [term.node, panel]));

  function paintPanel(i, animate) {
    empty.hidden = i >= 1;
    tree.hidden = i < 1;
    ready.hidden = i < 3;
    for (const row of deckRows) {
      row.classList.toggle('is-written', i >= 2);
      row.lastChild.textContent = i >= 2 ? 'AI yazdı' : 'örnek';
    }
    if (!animate) return;
    if (i === 1) reveal(sim, [...coreRows, ...deckRows], { stagger: 0.05, delay: 0.35 });
    if (i === 2) reveal(sim, deckRows, { stagger: 0.12, delay: 0.8 });
    if (i === 3) reveal(sim, [ready], { delay: 0.6 });
  }

  sim.stages(STAGES.length, (i, { dir }) => {
    if (dir === 1) {
      term.type(STAGES[i]);
      paintPanel(i, true);
      return;
    }
    term.clear();
    term.show(STAGES.slice(0, i).flat());
    if (dir === 0 && i === 0) term.type(STAGES[0]);
    else term.show(STAGES[i]);
    paintPanel(i, false);
  });

  return sim.api();
}
