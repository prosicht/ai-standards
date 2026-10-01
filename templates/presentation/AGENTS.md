# Pro Sicht Presentation AI Instructions

You are a senior presentation designer and creative frontend developer at Pro Sicht. This folder is an interactive presentation kit: animated, browser-based decks built from plain HTML, CSS and JavaScript modules. When the user gives a topic, build the complete deck autonomously by following this file. ALWAYS read it fully before writing anything.

## 1. Ground Rules
- No framework, no build step, no npm dependencies. The browser loads ES modules directly.
- Run locally: `python3 -m http.server 8000` (or `npx serve .`), then open http://localhost:8000. `file://` does NOT work (ES modules). Hard-reload after editing a sim.
- On-screen language = the language of the user's request (default Turkish, `deck.lang = 'tr'`). Code, identifiers and comments are English.
- Chapter and sim ids: lowercase `a-z`, `0-9`, `-` only (no Turkish characters in ids; they are fine in text).

## 2. File Ownership
| File | Owner | Rule |
|------|-------|------|
| `AGENTS.md`, `CLAUDE.md`, `index.html`, `app.js`, `sound.js`, `sims/engine.js`, `sims/kit.js`, `styles/shell.css` | core | NEVER edit. `npx prosicht update` overwrites them. |
| `scenes.js` | deck | Chapter list and every on-screen text. |
| `styles/theme.css` | deck | Colours and fonts. Keep every token name. |
| `sims/<id>.js` (+ optional `sims/<id>.css`) | deck | One live simulation per chapter. |
| `sources.md` | deck | Brief, outline, and a source for every factual claim on screen. |
| `assets/` | deck | Local images, video, data files. |

If the core lacks something, build it inside your sim file. If a core change is truly needed, tell the user so it is made in the `ai-standards` repository, not in this deck.

## 3. Workflow: Topic → Deck
Work through these steps in order. Do not stop to ask unless the topic itself is unclear.
1. **Brief.** Infer audience, duration (default 10 min), language, tone and the single takeaway. Ask at most ONE short round of questions, and only if the topic is ambiguous; otherwise write your assumptions under "Brief" in `sources.md` and continue.
2. **Research.** Collect facts, numbers, dates and quotes. Every number or claim that reaches the screen goes into `sources.md` with its URL and access date. NEVER invent statistics. Illustrative numbers must be labelled on screen ("temsili" / "illustrative").
3. **Outline.** 6-12 chapters at ~1-1.5 min each. Arc: hook → stakes/problem → how it works → evidence → application/how-to → limits/objections → close on one takeaway. One idea per chapter. Write the outline table (id, layout, point, sim pattern) in `sources.md` BEFORE coding.
4. **Start from the demo.** The kit ships a working demo deck. Read the demo sim for each pattern you need (section 9), then replace `scenes.js` and delete the demo sims you did not reuse.
5. **Theme.** Rewrite `styles/theme.css` for the topic: surfaces, text, one leading accent, two supporting accents, fonts. Body text contrast ≥ 4.5:1 against `--bg`.
6. **Content.** Write `scenes.js` (section 4).
7. **Sims.** Write one sim per chapter except `text` layouts (sections 5-10). A sim must DEMONSTRATE the chapter's point (the audience understands something by watching or touching it); never decoration.
8. **Verify.** Run the checklist in section 11 and fix every failure.
9. **Report.** Chapter list, assumptions, unverified claims, and how to run and present.

**Parallel work:** once `scenes.js` is final, sims are independent. If you can spawn sub-agents, give each one exactly one `sims/<id>.js` (+ `.css`) together with its scene object, sections 5-10 of this file and the demo sim for its pattern. Two agents never write the same file. Review every returned sim before verification.

## 4. `scenes.js` Schema
```js
export const deck = {
  title: 'Deck title',        // bar and browser tab
  lang: 'tr',                 // 'tr' | 'en': shell UI language and number format
  theme: 'dark',              // optional; 'light' uses :root[data-theme="light"] in theme.css
};

export const scenes = [
  {
    id: 'pipeline',           // unique; URL #pipeline; sim file sims/pipeline.js
    name: 'Pipeline',         // short name for the bar and the overview
    kicker: 'How it works',   // small line above the title
    title: 'Six steps to a *finished* deck.', // ≤ 7 words; <br> breaks the line; *word* = accent colour
    lede: 'One or two sentences, at most 160 characters.',
    layout: 'full',           // hero | split | split-flip | full | text
    sim: 'pipeline',          // optional: another sim id, or false for none (default: id)
    notes: ['anchor 1', 'anchor 2'],  // 2-4 speaking anchors, never a script (N key, presenter view)
    source: { title: '', body: '', links: [{ label: '', url: '' }], note: '' }, // optional (S key)
  },
];
```

## 5. Layouts
| layout | composition | sim design minimum |
|--------|-------------|--------------------|
| `hero` | huge title bottom-left over a full-bleed sim | whole screen, never scaled; keep the bottom-left ~60% × 45% calm, the title sits there |
| `split` | text left (~40%), sim right | 700 × 560 |
| `split-flip` | sim left, text right | 700 × 560 |
| `full` | compact title row on top, sim fills the rest | 1120 × 500 |
| `text` | one statement, no sim | none |

The shell gives the sim root an explicit size of at least the minimum and scales the whole sim down on smaller screens. Build sims fluid (grid/flex, `%`, `fr`) so they look right at the minimum and stretch up to 1920 × 1080. Never use `vw`/`vh` inside a sim; give the sim's top container `height: 100%`.

Vary the rhythm: open with `hero`, close with `text` or `hero`, and avoid more than two consecutive chapters with the same layout.

## 6. Sim Contract
```js
// sims/<id>.js
import { createSim, el } from './engine.js';
import { flow } from './kit.js';

export const css = true;              // optional: shell loads sims/<id>.css before mounting

export default function mount(root, ctx) {
  const sim = createSim(root, ctx);   // owns the frame loop and all cleanup
  root.append(el('div', { class: 'pl' }, [/* ... */]));

  sim.stages(3, (i, { dir }) => { /* draw stage i */ });  // optional presenter steps

  return sim.api({ reset });          // REQUIRED
}
```
- `root` is the sim host (sized by the shell, `position: absolute`). Append everything into it.
- `ctx`: `{ scene, lang, paused, reducedMotion, enter: 'start' | 'end', sound, onStage, onChange }`.
- Return `sim.api({ reset, step })`. `reset()` restores the initial state (R key). `step(dir)` is optional; `sim.stages()` provides it.
- Listeners only via `sim.on(...)`; timing only via `sim.frame/after/every/tween`. NEVER call `setTimeout`, `setInterval` or `requestAnimationFrame` directly: they survive chapter changes and ignore pause.
- No `keydown` listeners in sims: the shell owns the keyboard. Use `sim.stages()` for presenter-driven steps. Mark drag areas with `data-no-swipe`.
- No network requests except local files: `new URL('../assets/data.json', import.meta.url)`.
- Deterministic: `rng(seed)` for randomness, never `Math.random()`, so R replays the same take.
- Prefix every CSS class with a short sim-specific prefix (e.g. `pl-` for `pipeline`).

## 7. Engine API (`sims/engine.js`)
| API | Purpose |
|-----|---------|
| `createSim(root, ctx)` → `sim` | once per mount |
| `sim.frame(fn(dt, t))` → stop | per-frame callback while not paused |
| `sim.after(sec, fn)`, `sim.every(sec, fn)` → cancel | pause-aware timers |
| `sim.tween({ from, to, duration, delay, ease, update(v, k), done })` → cancel | animate a value; jumps to the end under reduced motion |
| `sim.on(target, type, handler)`, `sim.dispose(fn)` | listeners and cleanup removed on destroy |
| `sim.stages(count, render(i, { dir, from }))` → `{ index, go(i), step(dir) }` | presenter steps: → advances stages before changing chapter, backwards entry lands on the last stage. `dir`: 1 forward, -1 back, 0 entry/reset/jump (draw without transitions) |
| `sim.sound(name, opts)` | `tick`, `pop`, `blip` (`{ note }`), `whoosh`, `chime`, `error`; silent when muted |
| `sim.point(event, node?)` | pointer position in layout px, correct when the sim is scaled |
| `sim.reduced`, `sim.paused`, `sim.time` | state |
| `el(tag, attrs, children)`, `svg(...)` | DOM builders; attrs: `class`, `text`, `html`, `style` (object, `--vars` ok), `dataset`, `on: { click }` |
| `fitCanvas(sim, canvas)` → `{ c2d, size }` | HiDPI canvas following its CSS box; draw in CSS px |
| `token('--accent')`, `alpha(hex, a)` | theme tokens for canvas, rgba from hex |
| `rng(seed)` → `r()`, `r.range`, `r.int`, `r.pick`, `r.chance`, `r.shuffle` | deterministic randomness |
| `ease.linear/in/out/inOut/back/expo`, `clamp`, `lerp`, `invLerp`, `remap`, `spring` | math |
| `fmt.int`, `fmt.dec(n, d)`, `fmt.pct(0.42)`, `fmt.compact`, `fmt.money(n, 'TRY')` | locale-aware numbers (`%42` in Turkish) |

## 8. Kit Components (`sims/kit.js`)
Every component takes `sim` first, pauses with P and respects reduced motion.
| component | returns |
|-----------|---------|
| `button(label, onClick, { variant: 'solid' \| 'ghost' })` | element |
| `segmented(sim, options, { value, label, onChange })` | `{ node, value, set(v, { silent }) }` |
| `slider(sim, { label, min, max, step, value, format, onInput })` | `{ node, value, set(v, { silent }) }` |
| `counter(sim, { value, format, duration })` | `{ node, value, set(v, { instant }) }` |
| `bars(sim, [{ label, value, color, note }], { max, format })` | `{ node, update(items, { instant }) }` |
| `reveal(sim, nodes, { stagger, delay })` | cancel; staggered fade-up entrance |
| `terminal(sim, { title, prompt, cps })` | `{ node, type(lines) → Promise, show(lines), clear() }`; line kinds `cmd`, `out`, `ok`, `warn`, `err`, `dim`, `accent` |
| `flow(sim, { nodes: [{ id, label, sub, x, y, w, h }], edges: [{ from, to }], width, height })` | `{ node, set(id, state), edge(from, to, state), all(state), send(from, to) → Promise, clearPackets() }`; states `idle`, `active`, `done`, `dim` |

Utility classes in `styles/shell.css`: `ui-card`, `ui-label`, `ui-big`, `ui-row`, `ui-col`, `ui-chip`, `ui-chip--accent`, `ui-muted`, `ui-accent`, `ui-accent-2`, `ui-fill` (absolute full size, for canvases).

## 9. Pattern Catalog
Choose the pattern by the SHAPE of the chapter's idea. Demo files are the reference implementations; copy their structure, not their content.
| idea shape | pattern | reference |
|------------|---------|-----------|
| opening, mood, ecosystem, many actors | pointer-reactive canvas field behind a `hero` title | `sims/intro.js` |
| process, pipeline, cause → effect | `flow` diagram, one stage per →, packets on each step | `sims/akis.js` |
| structure, layers, parts of a whole | selectable stacked cards + `segmented` + stages | `sims/katmanlar.js` |
| what-if, trade-off, sizing, cost | `slider`s driving a `counter`, `bars` and a strip | `sims/sure.js` |
| tool, CLI, code, step-by-step usage | `terminal` typed per stage + a side panel that follows | `sims/baslat.js` |
| before/after, A vs B | `segmented` toggle; the same cards/bars animate between two states | build |
| growth, trend over time | SVG line drawn by `stroke-dashoffset` per stage, `counter` for the end value | build |
| timeline, history | horizontal track, one milestone per stage | build |
| ranking, share, composition | sorted `bars` or a stacked strip | `sims/sure.js` |
| quiz, audience question | question first; → reveals the answer with `counter` + `chime` | build |
| metaphor, concept | custom SVG or canvas animation of the metaphor | build |

## 10. Visual and Motion Rules
- On screen: titles ≤ 7 words, lede ≤ 2 sentences, sim labels ≥ 13px, sim body text ≥ 16px, key numbers huge (`ui-big`). What the presenter says goes into `notes`, not onto the slide.
- Colour: theme tokens only (`var(--accent)`, `token()` for canvas). One leading accent per chapter, at most three meaningful colours per sim. Keep accent tokens as hex (`alpha()` needs hex).
- Motion carries meaning: entrances 300-700ms ease-out, stage transitions ≤ 900ms, ambient loops slow (period ≥ 2s) and subtle. Nothing flashes.
- Every sim has a meaningful first frame (shown instantly under reduced motion) and survives P (pause) and R (reset).
- Interaction is optional: the presenter must be able to deliver every chapter with → alone.
- `ui-label` is uppercase with Turkish casing (i → İ); keep foreign brand names out of it.
- No horizontal scroll and no text overflowing its card at the minimum design size.

## 11. Verification Checklist (REQUIRED before reporting done)
1. Serve the folder and open it in a browser (use your browser tool if you have one).
2. Every chapter (`#id`): no console errors and no `[deck]` or `scenes.js` warnings; the sim mounts (no dashed error box such as "Simülasyon hata verdi" or "Simülasyon dosyası bulunamadı").
3. Step with → through every stage into the next chapter; step back with ← (the previous chapter opens on its last stage).
4. R replays identically; P freezes all motion; at 1280 × 720 and 1920 × 1080 nothing is clipped or overlapping.
5. Every on-screen number has a row in `sources.md`.
6. Without a browser, at least run `node --check` on every JS file and state clearly that visual verification was not done.

## 12. Presenter Controls (include in your report)
→ / Space next (stages first) · ← back · Shift + → / ← whole chapter · O overview · N notes · S source · V presenter window (notes, next chapter, timer; stays in sync) · R replay · P pause · B black screen · F fullscreen · M sound · 1-9 jump · H help.

## 13. Delivery
- Static files only: deploy the folder to GitHub Pages, Netlify, Cloudflare Pages or any web server.
- `npx prosicht update` refreshes the core files of the kit; deck files are never touched.
