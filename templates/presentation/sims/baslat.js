/* baslat (full): from an empty folder to a running deck, one stage per →.
   Pattern: kit terminal typed per stage + a side panel that follows it.
   The AI run in stage 3 is illustrative and labelled as such on screen. */

import { createSim, el } from './engine.js';
import { terminal, reveal } from './kit.js';

const STAGES = [
  [
    { kind: 'cmd', text: 'mkdir kobi-yapay-zeka && cd kobi-yapay-zeka' },
    { kind: 'cmd', text: 'npx prosicht init' },
    { kind: 'out', text: '? Ne yapmak istiyorsunuz? › Sunum' },
  ],
  [
    { kind: 'dim', text: '[Pro Sicht] Sunum altyapisi indiriliyor...' },
    { kind: 'ok', text: '  + AGENTS.md' },
    { kind: 'ok', text: '  + index.html  app.js  sound.js' },
    { kind: 'ok', text: '  + sims/engine.js  sims/kit.js' },
    { kind: 'ok', text: '  + scenes.js  styles/theme.css  sources.md' },
    { kind: 'out', text: 'Basarili: 20 dosya yazildi (Sunum altyapisi v1.0.0).' },
  ],
  [
    { kind: 'cmd', text: 'claude "KOBİ’ler için yapay zekâ, 10 dakikalık sunum hazırla"' },
    { kind: 'accent', text: '● brief: KOBİ sahipleri · 10 dk · Türkçe' },
    { kind: 'accent', text: '● 8 bölüm planlandı → scenes.js, sources.md' },
    { kind: 'accent', text: '● 8 simülasyon yazıldı → sims/' },
    { kind: 'ok', text: '✓ kontrol: 8/8 bölüm açıldı, konsol temiz' },
  ],
  [
    { kind: 'cmd', text: 'python3 -m http.server 8000' },
    { kind: 'dim', text: 'Serving HTTP on :: port 8000 ...' },
    { kind: 'ok', text: '→ http://localhost:8000' },
  ],
];

const CORE = ['AGENTS.md', 'index.html', 'app.js', 'sound.js', 'sims/engine.js', 'sims/kit.js', 'styles/shell.css'];
const DECK = ['scenes.js', 'styles/theme.css', 'sources.md', 'sims/<bölüm>.js'];

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
    el('span', { class: 'ui-label', text: 'Hazır' }),
    el('span', { class: 'bs-url', text: 'localhost:8000' }),
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
