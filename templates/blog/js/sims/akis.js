/* akis (sim, wide): topic + images to a published post in seven stages.
   Pattern: sim.stages driving a progress rail, a caption card and a kit
   terminal that types the file each stage writes. The reader steps with the
   figure's ‹ › buttons. Container query (css/sims/akis.css) stacks the
   layout on phones. Terminal output is illustrative (said in the caption). */

import { createSim, el } from '../core/engine.js';
import { terminal } from '../core/kit.js';

const STAGES = [
  {
    name: 'Konu',
    title: 'Bir cümle, bir klasör görsel',
    text: 'Konu, okur ve görseller verilir. Eksik bilgi varsa AI varsayımını yazar ve devam eder.',
    file: 'sohbet',
    lines: [
      { kind: 'cmd', text: 'claude "Ev kahvesi demleme yöntemleri. Görseller: gorseller/"' },
      { kind: 'dim', text: '6 görsel bulundu: kapak.jpg, v60.jpg, french-press.jpg …' },
    ],
  },
  {
    name: 'Brief',
    title: 'Okur, ton ve tek mesaj',
    text: 'Yazının kime, hangi tonda ve hangi uzunlukta yazılacağı netleşir.',
    file: 'sources.md',
    lines: [
      { kind: 'accent', text: '## Brief' },
      { kind: 'out', text: '- Okur: evde kahve demlemeye yeni başlayanlar' },
      { kind: 'out', text: '- Uzunluk: ~8 dk · Dil: Türkçe · Ton: sıcak, net' },
      { kind: 'out', text: '- Tek mesaj: oran ve süre, ekipmandan önemlidir' },
    ],
  },
  {
    name: 'Araştırma',
    title: 'Her iddianın bir kaynağı var',
    text: 'Ekrana çıkacak her rakam ve iddia, bağlantısı ve erişim tarihiyle kaydedilir.',
    file: 'sources.md',
    lines: [
      { kind: 'accent', text: '## Claims' },
      { kind: 'out', text: '| demleme oranı | 1:15–1:17 | <kaynak url> | 2026-10-02 |' },
      { kind: 'out', text: '| su sıcaklığı  | 90–96 °C  | <kaynak url> | 2026-10-02 |' },
      { kind: 'dim', text: 'kaynağı bulunamayan iddia ekrana çıkmaz' },
    ],
  },
  {
    name: 'Görseller',
    title: 'Her görsel incelenir',
    text: 'Görseller assets/images/ altına kopyalanır, küçültülür; her birine alternatif metin yazılır.',
    file: 'assets/images/',
    lines: [
      { kind: 'cmd', text: 'cp gorseller/* assets/images/ && küçült --uzun-kenar 2400' },
      { kind: 'ok', text: '✓ kapak.webp       kapak (full)' },
      { kind: 'ok', text: '✓ v60.webp         scrolly, adım 2' },
      { kind: 'ok', text: '✓ french-press.webp karşılaştırma' },
    ],
  },
  {
    name: 'Plan',
    title: 'Bloklar sıraya girer',
    text: 'Kanca, sorun, yöntem, kanıt, uygulama ve kapanış: her bölüm için blok türü seçilir.',
    file: 'sources.md',
    lines: [
      { kind: 'accent', text: '## Outline' },
      { kind: 'out', text: '| 1 | kapak     | hero     | Sabah kahvesi bir oran işi |' },
      { kind: 'out', text: '| 2 | oran      | sim      | Oranı değiştir, tadı gör   |' },
      { kind: 'out', text: '| 3 | demleme   | scrolly  | Dört dakikada dört adım    |' },
    ],
  },
  {
    name: 'Yazı',
    title: 'Metin ve figürler yazılır',
    text: 'Metin js/post.js içine bloklar halinde, her figür js/sims/ altına ayrı bir dosya olarak girer.',
    file: 'js/post.js',
    lines: [
      { kind: 'out', text: "{ type: 'heading', id: 'oran', title: 'Her şey *oranda*' }," },
      { kind: 'out', text: "{ type: 'sim', sim: 'oran', badge: 'Dene' }," },
      { kind: 'out', text: "{ type: 'scrolly', sim: 'demleme', steps: [ … ] }," },
      { kind: 'dim', text: '+ js/sims/oran.js  + js/sims/demleme.js' },
    ],
  },
  {
    name: 'Yayın',
    title: 'Kontrol et, yayınla',
    text: 'Yazı tarayıcıda telefon ve masaüstü genişliğinde baştan sona gezilir; sonra tek komutla yayınlanır.',
    file: 'terminal',
    lines: [
      { kind: 'ok', text: '✓ 18 blok · konsol temiz · 390 px ve 1440 px' },
      { kind: 'cmd', text: 'npx prosicht publish' },
      { kind: 'ok', text: 'Yayinlandi: https://deck.prosicht.com/v/…' },
    ],
  },
];

const pad = (n) => String(n).padStart(2, '0');

export const css = true;

export default function mount(root, ctx) {
  const sim = createSim(root, ctx);

  const fill = el('i', { class: 'ak-fill' });
  const nodes = STAGES.map((s, i) => el('li', { class: 'ak-node', style: { '--i': i } }, [
    el('span', { class: 'ak-dot', text: String(i + 1) }),
    el('span', { class: 'ak-label', text: s.name }),
  ]));
  const rail = el('div', { class: 'ak-rail' }, [el('span', { class: 'ak-track' }, [fill]), el('ol', { class: 'ak-nodes' }, nodes)]);

  const num = el('span', { class: 'ak-num' });
  const title = el('h3', { class: 'ak-title' });
  const text = el('p', { class: 'ak-text' });
  const file = el('span', { class: 'ui-chip ak-file' });
  const card = el('div', { class: 'ak-card' }, [num, title, text, file]);

  const term = terminal(sim, { title: 'sohbet', cps: 60 });
  const termTitle = term.node.querySelector('.kit-term-title');

  root.append(el('div', { class: 'ak' }, [rail, el('div', { class: 'ak-body' }, [card, term.node])]));

  /* writes run one after another; a newer stage cancels the typing */
  sim.stages(STAGES.length, (i, { dir }) => {
    const s = STAGES[i];
    nodes.forEach((n, k) => {
      n.classList.toggle('is-done', k < i);
      n.classList.toggle('is-on', k === i);
    });
    fill.style.transform = `scaleX(${i / (STAGES.length - 1)})`;
    num.textContent = `${pad(i + 1)} / ${pad(STAGES.length)}`;
    title.textContent = s.title;
    text.textContent = s.text;
    file.textContent = s.file;
    card.classList.remove('is-swap');
    if (dir !== 0) {
      void card.offsetWidth;
      card.classList.add('is-swap');
    }
    termTitle.textContent = s.file;
    term.clear();
    if (dir > 0 && !sim.reduced) term.type(s.lines);
    else term.show(s.lines);
  });

  return sim.api();
}
