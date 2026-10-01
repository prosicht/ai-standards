/* akis (full): the topic-to-deck pipeline, one stage per → press.
   Pattern: kit flow diagram + sim.stages + caption that follows the stage. */

import { createSim, el } from '../core/engine.js';
import { flow, reveal } from '../core/kit.js';

const NODES = [
  { id: 'konu', label: 'Konu', sub: 'tek cümle', x: 80, y: 210 },
  { id: 'brief', label: 'Brief', sub: 'kitle · süre', x: 245, y: 210 },
  { id: 'arastirma', label: 'Araştırma', sub: 'sources.md', x: 410, y: 210 },
  { id: 'plan', label: 'Plan', sub: 'scenes.js', x: 575, y: 210 },
  { id: 's1', label: 'Sim A', sub: 'agent 1', x: 745, y: 95 },
  { id: 's2', label: 'Sim B', sub: 'agent 2', x: 745, y: 210 },
  { id: 's3', label: 'Sim C', sub: 'agent 3', x: 745, y: 325 },
  { id: 'kontrol', label: 'Kontrol', sub: 'tarayıcıda', x: 915, y: 210 },
  { id: 'yayin', label: 'Yayın', sub: 'statik host', x: 1080, y: 210 },
].map((n) => ({ ...n, w: 140 }));

const EDGES = [
  ['konu', 'brief'], ['brief', 'arastirma'], ['arastirma', 'plan'],
  ['plan', 's1'], ['plan', 's2'], ['plan', 's3'],
  ['s1', 'kontrol'], ['s2', 'kontrol'], ['s3', 'kontrol'],
  ['kontrol', 'yayin'],
].map(([from, to]) => ({ from, to }));

const STAGES = [
  { ids: ['konu'], name: 'Konu', text: 'Tek cümle yeter: konu, kitle ve süre. Örnek: “KOBİ’ler için yapay zekâ, 10 dakika.”' },
  { ids: ['brief'], name: 'Brief', text: 'Kitle, süre, dil ve ton netleşir. Bilgi eksikse AI varsayımını yazar ve devam eder.' },
  { ids: ['arastirma'], name: 'Araştırma', text: 'Ekrana çıkacak her rakam ve iddia, kaynağıyla birlikte sources.md dosyasına girer.' },
  { ids: ['plan'], name: 'Plan', text: '6-12 bölümlük anlatı: kanca, sorun, mekanizma, kanıt, uygulama, kapanış.' },
  { ids: ['s1', 's2', 's3'], name: 'Simülasyonlar', text: 'Her bölüm bir sims/<id>.js dosyası. Dosyalar ayrık olduğu için agent’lar paralel çalışır.' },
  { ids: ['kontrol'], name: 'Kontrol', text: 'Her bölüm tarayıcıda açılır: konsol hatası, taşma, adımlar ve R ile tekrar oynatma denetlenir.' },
  { ids: ['yayin'], name: 'Yayın', text: 'Çıktı yalnızca statik dosyalar: GitHub Pages, Netlify, Cloudflare Pages veya herhangi bir sunucu.' },
];

const pad = (n) => String(n).padStart(2, '0');

export const css = true;

export default function mount(root, ctx) {
  const sim = createSim(root, ctx);
  const diagram = flow(sim, { nodes: NODES, edges: EDGES, width: 1160, height: 420 });

  const num = el('span', { class: 'ak-num' });
  const name = el('span', { class: 'ak-name' });
  const text = el('p', { class: 'ak-text' });
  const dots = el('div', { class: 'ak-dots' }, STAGES.map(() => el('i')));
  const caption = el('div', { class: 'ak-caption ui-card' }, [
    el('div', { class: 'ak-head' }, [num, name, dots]),
    text,
  ]);
  root.append(el('div', { class: 'ak' }, [el('div', { class: 'ak-diagram' }, [diagram.node]), caption]));

  const stageOf = new Map();
  STAGES.forEach((s, i) => s.ids.forEach((id) => stageOf.set(id, i)));
  let pending = [];

  function render(i, { dir }) {
    const last = STAGES.length - 1;
    for (const n of NODES) {
      const k = stageOf.get(n.id);
      const done = k < i || (i === last && k === last);
      diagram.set(n.id, done ? 'done' : k === i ? 'active' : 'idle');
    }
    for (const e of EDGES) {
      const k = stageOf.get(e.to);
      diagram.edge(e.from, e.to, k < i || (i === last && k === last) ? 'done' : k === i ? 'active' : 'idle');
    }

    pending.forEach((cancel) => cancel());
    pending = [];
    diagram.clearPackets();
    if (dir === 1) {
      const into = EDGES.filter((e) => stageOf.get(e.to) === i);
      into.forEach((e, n) => {
        pending.push(sim.after(n * 0.08, () => {
          sim.sound('blip', { note: n * 3 });
          diagram.send(e.from, e.to, { duration: 0.7 });
        }));
      });
      if (i === last) pending.push(sim.after(0.75, () => sim.sound('chime')));
    }

    num.textContent = `${pad(i + 1)}/${pad(STAGES.length)}`;
    name.textContent = STAGES[i].name;
    text.textContent = STAGES[i].text;
    [...dots.children].forEach((d, k) => d.classList.toggle('on', k <= i));
    reveal(sim, [name, text], { stagger: 0.06 });
  }

  sim.stages(STAGES.length, render);
  return sim.api({ reset: () => diagram.all('idle') });
}
