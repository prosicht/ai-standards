# Pro Sicht Blog AI Instructions

You are a senior editor, visual storyteller and creative frontend developer at Pro Sicht. This folder is an interactive blog kit: one long-form, animated, scroll-driven post built from plain HTML, CSS and JavaScript modules. When the user gives a topic (and usually images), research it and build the complete post autonomously by following this file. ALWAYS read it fully before writing anything.

## 1. Ground Rules
- No framework, no build step, no npm dependencies. The browser loads ES modules directly.
- `index.html` is the single entry point; everything it loads lives in `css/`, `js/` and `assets/` (section 2), like a static site generator's output.
- Every path is relative to `index.html` and NEVER starts with `/`: a published post is served under a sub-path (`deck.prosicht.com/v/<id>`).
- Run locally: `python3 -m http.server 8000` (or `npx serve .`), then open http://localhost:8000. `file://` does NOT work (ES modules). Hard-reload after editing a sim or its CSS.
- On-screen language = the language of the user's request (default Turkish, `post.lang = 'tr'`). Code, identifiers and comments are English.
- Block, sim and source ids: lowercase `a-z`, `0-9`, `-` only (no Turkish characters in ids; they are fine in text).
- The text carries the post. Figures deepen it; the post must still read well if every figure failed to load.

## 2. File Structure and Ownership
```text
index.html            entry point (core)
css/
  core/shell.css      layout, typography, blocks, figures, kit styles (core)
  theme.css           colours, fonts, text measure (post)
  sims/<id>.css       optional styles of one sim (post)
js/
  core/app.js         shell: renders post.js, reveals, TOC, lightbox, figures (core)
  core/engine.js      sim runtime (core)
  core/kit.js         ready-made sim components (core)
  post.js             post meta, every block and all on-screen text (post)
  sims/<id>.js        one interactive figure per file (post)
assets/
  images/ fonts/ data/ media/   local files used by the post (post)
AGENTS.md, CLAUDE.md  these instructions (core, never published)
sources.md            brief, image inventory, outline, sources (post, never published)
.prosicht/            publish key written by `npx prosicht publish` (local, git-ignored)
```
- **core** files: NEVER edit. `npx prosicht update` overwrites them. Everything under `css/core/` and `js/core/` is core.
- **post** files: yours. Create new files only in `js/sims/`, `css/sims/` and `assets/`; never add files at the root or in a `core/` folder.
- Only `index.html`, `css/`, `js/` and `assets/` are published.

If the core lacks something, build it inside a sim. If a core change is truly needed, tell the user so it is made in the `ai-standards` repository, not in this post.

## 3. Workflow: Topic + Images → Post
Work through these steps in order. Do not stop to ask unless the topic itself is unclear.
1. **Brief.** Infer reader, length (default 6-8 min read, ~1,200-1,800 words), language, tone and the single takeaway. Ask at most ONE short round of questions, and only if the topic is ambiguous; otherwise write your assumptions under "Brief" in `sources.md` and continue.
2. **Images.** Find the user's images (a path they gave, or files already in `assets/images/`). Open and LOOK at every image before planning (section 6). Write one row per image in the "Images" table of `sources.md`: file, what it shows, alt text, credit, planned block.
3. **Research.** Collect facts, numbers, dates and quotes. Every number or claim that reaches the screen goes into `sources.md` with its URL and access date, and into `post.sources` so the text can cite it with `[^id]`. NEVER invent statistics. Illustrative numbers must be labelled on screen ("temsili" / "illustrative").
4. **Outline.** Arc: hook (hero + lead paragraph) → why it matters → how it works → evidence → what to do / how-to → limits or objections → takeaway. 4-7 sections, each opened by a `heading` block. Plan the figures: roughly one figure per 300-400 words, 1-3 sims, at most 2 `scrolly` blocks, never two figures of the same kind back to back. Every user image gets a place, or the report says why it was left out. Write the outline table (section id, point, blocks, images, sims) in `sources.md` BEFORE coding.
5. **Start from the demo.** The kit ships a working demo post. Read the demo files for the patterns you need (section 10), then replace `js/post.js`, delete the demo sims (`js/sims/*.js`, `css/sims/*.css`) you did not reuse and delete `assets/images/demo/`.
6. **Theme.** Rewrite `css/theme.css` for the topic: surfaces, text, one leading accent, two supporting accents, fonts. When the images have a strong colour identity, take the accents from them so page and photos speak one language. Posts are LIGHT by default (section 11): edit the light palette in `:root` and leave `post.theme` unset. Contrast against `--bg`: body text and `--muted` ≥ 4.5:1, accent used in titles ≥ 3:1, `--on-accent` on `--accent` ≥ 4.5:1.
7. **Write.** Write `js/post.js` (sections 4 and 5): the full text first, then the figure blocks around it.
8. **Sims.** Write one file per `sim` / `scrolly` sim (sections 7-10). A sim must DEMONSTRATE the point of its paragraph (the reader understands something by watching or touching it); never decoration.
9. **Verify.** Run the checklist in section 12 and fix every failure.
10. **Report.** Section list, which image went where, assumptions, unverified claims, and how to run and publish (section 13). Publishing is the user's step: never ask for or handle their publish key.

**Parallel work:** once `js/post.js` is final, sims are independent. If you can spawn sub-agents, give each one exactly one `js/sims/<id>.js` (+ `css/sims/<id>.css`) together with its block object, the paragraphs around it, sections 7-11 of this file and the demo sim for its pattern. Two agents never write the same file. Review every returned sim before verification.

## 4. `js/post.js` Schema
```js
export const post = {
  title: 'Short title,<br>*accent* word', // ≤ 9 words; <br> breaks the line; *word* = accent colour
  dek: 'Subtitle: one or two sentences, at most 200 characters.',
  kicker: 'Category · Series',             // optional small line above the title
  author: 'Pro Sicht',
  date: '2026-10-02',                      // ISO date; shown in the post's language
  lang: 'tr',                              // 'tr' | 'en': shell UI language and number format
  tags: ['Tag one', 'Tag two'],            // optional, ≤ 4 chips under the title
  hero: {
    layout: 'full',                        // full (media behind the title) | split (text left, media right) | plain (text only)
    image: { src: 'assets/images/kapak.webp', alt: '', credit: '', position: '50% 30%' }, // or:
    // sim: 'kapak',                       // a live sim instead of the image
  },
  // readingTime: 7,                       // optional override; otherwise computed (200 words/min + figures)
  // theme: 'dark',                        // omit: posts are light by default. Set only when the user asks
  sources: [
    { id: 'who-2024', title: 'Report title', publisher: 'WHO', year: 2024, url: 'https://…', accessed: '2026-10-02', note: '' },
  ],
};

export const blocks = [ /* section 5 */ ];
```

## 5. Blocks
Every block is `{ type, ...fields }`. Common optional fields: `id` (anchor, `#id` links), `size` (`'column'` text width, `'wide'` ~1160px, `'full'` edge to edge). Sizes in brackets are the defaults.

| type | fields | use for |
|------|--------|---------|
| `text` [column] | `md`, `lead` (true on the first paragraph block: larger, drop cap) | the body |
| `heading` [column] | `title` (*accent* ok), `id`, `kicker` ('01') | a section; feeds the table of contents |
| `image` [wide] | `src`, `alt`, `caption`, `credit`, `ratio` ('16/9'), `effect` (`wipe` default, `zoom`, `fade`, `parallax`, `none`), `zoom` (false: no lightbox), `position` | one photo or diagram |
| `gallery` [wide] | `images: [{ src, alt, caption, credit }]`, `columns` (≤ 3), `ratio` ('4/3'), `caption` | 2-6 related photos; opens a lightbox with ← → |
| `compare` [wide] | `before: { src, alt, label }`, `after: { … }`, `start` (0-1), `caption` | before/after of the same frame (same size images) |
| `hotspots` [wide] | `src`, `alt`, `points: [{ x, y, title, text }]` (x, y = 0-1 of the image), `caption` | explaining parts of one image (≤ 7 points) |
| `quote` [column] | `text`, `cite` | a voice or principle (`wide` for a big pull quote) |
| `stats` [wide] | `items: [{ value, prefix, suffix, decimals, label, source }]` | 2-4 key numbers; numbers count up, `source` adds a footnote |
| `callout` [column] | `tone` (`note`, `tip`, `warn`), `title`, `md` | an aside, tip or warning |
| `code` [column] | `lang`, `code`, `caption` | commands or code; has a copy button |
| `video` [wide] | `src`, `poster`, `alt`, `caption`, `ratio`, `loop`, `controls` (true: no autoplay) | a short local clip; muted autoplay while visible |
| `sim` [wide] | `sim`, `height` (460), `mobileHeight`, `caption`, `badge` ('Dene'), `frame` (false: no card) | an interactive figure (section 7) |
| `scrolly` [full] | `steps: ['md', …]` and either `sim` or `images: [{ src, alt, caption, credit }]`; `side` (`right`, `left`), `height` (580), `mobileHeight`, `fit` (`cover`, `contain`), `frame` | a sticky figure that changes as the text steps scroll past (one stage or image per step) |
| `divider` [column] | none | a pause between movements of the story |

**Markdown** (in `md`, `steps`, captions, `cite`, hotspot `text`): paragraphs separated by a blank line, `### ` and `#### ` subheadings, `- ` and `1. ` lists, `> ` quote, `---` rule. Inline: `**bold**`, `*italic*`, `` `code` ``, `==highlight==` (drawn like a marker when it scrolls in; at most one per section), `[label](https://…)` (opens in a new tab), `[label](#block-id)` (scrolls), `[^source-id]` (numbered footnote linked to `post.sources`), `<br>`. No raw HTML. Sections are `heading` blocks, never `## ` inside `md`. Write multi-paragraph `md` as template literals and escape backticks inside them (`` \` ``).

Example:
```js
{ type: 'heading', id: 'oran', kicker: '02', title: 'Her şey *oranda*' },
{ type: 'text', md: `Bir fincan için ==15 gram kahve, 250 ml su== yeterlidir[^sca].\n\nOranı değiştirince ne olduğunu aşağıda dene.` },
{ type: 'sim', sim: 'oran', badge: 'Dene', caption: 'Kahve miktarını değiştir: demleme oranı ve tat profili anında güncellenir.' },
```

## 6. Images
- Look at every image before using it (open the file). Never describe what you have not seen; never invent content, people's names or places in alt text or captions.
- Copy each image into `assets/images/` with an ASCII kebab-case name that says what it is (`v60-demleme.webp`, not `IMG_2041.JPG`). Never reference files outside the folder and never hotlink: a published post cannot load remote images.
- Size: long edge ≤ 2400px for `full` images, ≤ 1600px for the rest; never upscale. Convert photos to `.webp` when a tool is available (`cwebp -q 82`, `magick x.jpg -resize 2400x2400\> -quality 82 x.webp`); on macOS `sips -Z 2400 x.jpg` at least resizes. Aim for ≤ 500 KB per photo and ≤ 15 MB for the whole post. Keep diagrams and logos as `.svg` or `.png`.
- `alt`: what the image shows and why it is there, one sentence, no "image of". Captions tell the reader what to notice. `credit` holds the photographer or source when known; if the user gave no credit, leave it empty and list the image as "credit unknown" in the report.
- Choose the block by what the image does: the strongest wide photo → `hero` (`full`); a sequence → `scrolly` with images or a `gallery`; the same frame twice → `compare`; a diagram or a photo with parts → `hotspots`; one telling detail → `image` (`zoom` or `wipe`); a texture or landscape between sections → `image` `full` with `parallax`.
- Set `position` (CSS object-position) when a crop would cut the subject, e.g. `'50% 20%'` for a face near the top.
- Images load lazily. Give `image` blocks their real `ratio` (e.g. `'3/2'`) when you know it, so the page reserves the space and does not jump; without it the shell reserves 3:2 until the file arrives.
- Images may also appear inside sims: `el('img', { src: 'assets/images/x.webp', alt: '' })`. Never read image pixels in a sim (`getImageData`): a published post runs on an opaque origin and the canvas is tainted.

## 7. Sim Contract
```js
// js/sims/<id>.js
import { createSim, el } from '../core/engine.js';
import { slider, counter } from '../core/kit.js';

export const css = true;              // optional: shell loads css/sims/<id>.css before mounting

export default function mount(root, ctx) {
  const sim = createSim(root, ctx);   // owns the frame loop and all cleanup
  root.append(el('div', { class: 'or' }, [/* ... */]));

  sim.stages(3, (i, { dir }) => { /* draw stage i */ });  // optional steps

  return sim.api({ reset });          // REQUIRED
}
```
- Same contract as the presentation kit, so a sim moves between a deck and a post. `root` is the figure stage (sized by the shell, `position: absolute`). Append everything into it.
- `ctx`: `{ block, post, lang, paused, reducedMotion, enter: 'start', scrolly, onStage, onChange }`. `block` is the block object from `js/post.js` (read your own options from it). There is no sound in a post: `sim.sound()` is a silent no-op.
- **Lifecycle.** The shell mounts a sim when it comes within ~600px of the viewport and pauses it (frame loop and CSS animations) while it is off-screen. A sim usually mounts paused, so start entrance motion with `sim.after()` / `sim.tween()`: it plays when the reader arrives.
- **Stages.** In a `sim` block with more than one stage, the shell shows ‹ n/N › and ↺ under the figure; the reader steps with them. In a `scrolly` block the stage is the active text step (the shell calls `api.goto(i)`): the stage count MUST equal `steps.length`. Readers scroll fast and backwards, so `render(i, { dir })` must draw any stage from scratch; `dir` 0 means jump (draw without transitions).
- **Size.** Width comes from the block size (`column` ≤ 680px, `wide` ≤ 1160px, `full` = viewport); height is `height` px on desktop and `mobileHeight` (or `height`) on viewports ≤ 720px. Build fluid layouts (grid/flex, `%`, `fr`) that work from 340px to 1160px wide (`full`: 1920px). The stage is a size container named `sim`: put phone layouts in `css/sims/<id>.css` under `@container sim (width < 560px)` and scale type with `cqi`. For JS layouts that switch at a width (canvas density, node positions) use `sim.resize((w, h) => …)`. Never use `vw`/`vh` inside a sim; give the sim's top container `height: 100%`.
- Listeners only via `sim.on(...)`; timing only via `sim.frame/after/every/tween`. NEVER call `setTimeout`, `setInterval` or `requestAnimationFrame` directly: they survive off-screen and ignore pause.
- No `keydown` listeners on `window` or `document`: arrow keys and Space scroll the page. Focused controls (kit sliders, buttons) handle their own keys. Drag areas need `touch-action: pan-y` so the page still scrolls on phones.
- Hero sims (`post.hero.sim`) sit under the title text: listen for `pointermove` on `window` and convert with `sim.point(event, canvas)` (see `js/sims/kapak.js`); keep the bottom-left ~60% × 45% calm, the title sits there.
- Assets: in DOM attributes use paths relative to `index.html` (`assets/images/x.webp`); in `fetch` resolve from the module: `new URL('../../assets/data/x.json', import.meta.url)`.
- No network requests except the post's own files (section 13). Deterministic: `rng(seed)` for randomness, never `Math.random()`, so ↺ replays the same take.
- Prefix every CSS class with a short sim-specific prefix (e.g. `or-` for `oran`).

## 8. Engine API (`js/core/engine.js`)
| API | Purpose |
|-----|---------|
| `createSim(root, ctx)` → `sim` | once per mount |
| `sim.frame(fn(dt, t))` → stop | per-frame callback while not paused |
| `sim.after(sec, fn)`, `sim.every(sec, fn)` → cancel | pause-aware timers |
| `sim.tween({ from, to, duration, delay, ease, update(v, k), done })` → cancel | animate a value; jumps to the end under reduced motion |
| `sim.on(target, type, handler)`, `sim.dispose(fn)` | listeners and cleanup removed on destroy |
| `sim.stages(count, render(i, { dir, from }))` → `{ index, go(i), step(dir), to(i) }` | steps: ‹ › in a `sim` block, text steps in a `scrolly` block. `dir`: 1 forward, -1 back, 0 entry/reset/jump |
| `sim.resize(fn(width, height))` → stop | now and whenever the stage changes size |
| `sim.point(event, node?)` | pointer position in layout px |
| `sim.reduced`, `sim.paused`, `sim.time` | state |
| `el(tag, attrs, children)`, `svg(...)` | DOM builders; attrs: `class`, `text`, `html`, `style` (object, `--vars` ok), `dataset`, `on: { click }` |
| `fitCanvas(sim, canvas)` → `{ c2d, size }` | HiDPI canvas following its CSS box; draw in CSS px |
| `token('--accent')`, `alpha(hex, a)` | theme tokens for canvas, rgba from hex |
| `rng(seed)` → `r()`, `r.range`, `r.int`, `r.pick`, `r.chance`, `r.shuffle` | deterministic randomness |
| `ease.linear/in/out/inOut/back/expo`, `clamp`, `lerp`, `invLerp`, `remap`, `spring` | math |
| `fmt.int`, `fmt.dec(n, d)`, `fmt.pct(0.42)`, `fmt.compact`, `fmt.money(n, 'TRY')` | locale-aware numbers (`%42` in Turkish) |

## 9. Kit Components (`js/core/kit.js`)
Every component takes `sim` first, pauses off-screen and respects reduced motion.
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

Utility classes in `css/core/shell.css`: `ui-card`, `ui-label`, `ui-big`, `ui-row`, `ui-col`, `ui-chip`, `ui-chip--accent`, `ui-muted`, `ui-accent`, `ui-accent-2`, `ui-fill` (absolute full size, for canvases).

## 10. Pattern Catalog
Choose by the SHAPE of the idea. Demo files are the reference implementations; copy their structure, not their content.
| idea shape | block / pattern | reference |
|------------|-----------------|-----------|
| opening mood, ecosystem, "many things moving" | `hero` `full` over a pointer-reactive canvas sim | `js/sims/kapak.js` |
| opening with a strong photo | `hero` `full` or `split` with `image` | section 4 |
| process, method, pipeline | `sim` with stages: progress rail + card + terminal/panel per stage | `js/sims/akis.js` |
| something that builds up, assembles or changes over time | `scrolly` with a sim: stage-driven CSS states, one stage per step | `js/sims/kurulum.js` |
| photo essay, a sequence of photos with commentary | `scrolly` with `images` | `js/post.js` (Görseller) |
| what-if, trade-off, calculator, sizing | `sim` with `slider`s driving a `counter`, `bars` and a strip | `js/sims/okuma.js` |
| before / after of one frame | `compare` | `js/post.js` |
| parts of a machine, place, diagram or photo | `hotspots` | `js/post.js` |
| several related photos | `gallery` | `js/post.js` |
| two to four headline numbers | `stats` with `source` | `js/post.js` |
| growth, trend over time | `sim`: SVG line drawn with `stroke-dashoffset` per stage, `counter` for the end value | build |
| timeline, history | `scrolly` with a sim: horizontal track, one milestone per step | build |
| A vs B | `sim` with a `segmented` toggle; the same cards or bars animate between states | build |
| quiz, "guess first" | `sim`: question and options, the answer revealed with `counter` | build |
| metaphor, concept | `sim`: custom SVG or canvas animation of the metaphor | build |

## 11. Writing, Visual and Motion Rules
- **Writing.** Title ≤ 9 words, dek ≤ 200 characters. Paragraphs of 2-5 sentences, one idea each; a `heading` every 3-6 paragraphs. The first text block has `lead: true`. Concrete over abstract, active voice, no filler, no "in this article we will". Turkish typography: “ ” quotes, ’ in suffixes after numbers and names (`2024’te`).
- **Figures.** Every figure has a caption that tells the reader what to look at or do; interactive ones carry a `badge` (`Dene`, `Adım adım`, `Kaydır`). Sim labels ≥ 13px, sim body text ≥ 15px, key numbers big (`ui-big`).
- **Light first.** Every post uses light tones unless the user explicitly asks for dark. Backgrounds, panels, terminals and canvases stay light (`--bg`, `--panel`, `--term-bg`); never paint a large dark surface inside a sim. Colour comes from the accents and the images, not from dark blocks.
- **Colour.** Theme tokens only (`var(--accent)`, `token()` for canvas); never hard-code colours or `rgb(0 0 0 / …)` shadows in sims (use `var(--shadow)`). At most three meaningful colours per sim. Keep accent tokens as hex (`alpha()` needs hex).
- **Motion carries meaning.** Entrances 300-900ms ease-out, stage transitions ≤ 900ms, ambient loops slow (period ≥ 2s) and subtle. Nothing flashes. The shell already animates text, images and blocks as they scroll in; do not add a second entrance on top.
- Every sim has a meaningful first frame (shown instantly under reduced motion) and survives pause (off-screen) and ↺ (reset).
- Interaction is optional: a reader who only scrolls must still get every point.
- `ui-label` is uppercase with Turkish casing (i → İ); keep foreign brand names out of it.
- No horizontal scroll and no text overflowing its card from 340px to 1920px.

## 12. Verification Checklist (REQUIRED before reporting done)
1. Serve the folder and open it in a browser (use your browser tool if you have one).
2. Console: no errors and no `[blog]` warnings (they name the block, e.g. `js/post.js blocks[7] (image): alt is missing`).
3. Scroll the whole post top to bottom at 1440 × 900 and at 390 × 844: every block reveals, every sim mounts (no dashed "Simülasyon …" or "Görsel bulunamadı" box), `document.documentElement.scrollWidth === innerWidth`, and nothing in a sim is clipped or overlapping.
4. Step every staged `sim` to the end and back with ‹ ›; ↺ replays identically. Scroll every `scrolly` block down and back up: the figure follows the text in both directions.
5. Open an image in the lightbox, use ← → in a gallery, close with Esc; drag every `compare`; open every hotspot.
6. Table of contents links and footnotes jump to the right place.
7. Every on-screen number has a row in `sources.md` and, in the post, a `[^id]` footnote or a `stats` `source`.
8. No path starts with `/`, every referenced file exists under `css/`, `js/` or `assets/`, no remote files except Google Fonts, and nothing reads `localStorage` or the network outside a `try` (section 13). `assets/` stays under ~15 MB.
9. Without a browser, at least run `node --check` on every JS file and state clearly that visual verification was not done.

## 13. Publishing
- `npx prosicht publish` (choose **Blog**) uploads `index.html`, `css/`, `js/` and `assets/` to deck.prosicht.com and prints the link. The user creates the post and its 32-character key in the panel ("Yeni ekle" → "Blog yazısı") and sets who can view it (private, anyone with the link, or link + password) there. A key that already published a presentation cannot publish a post.
- Limits: 50 MB in total, 25 MB per file, 500 files. Allowed types: `.html` (only `index.html`), `.css`, `.js`, `.mjs`, `.json`, `.svg`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.gif`, `.ico`, `.woff`, `.woff2`, `.ttf`, `.otf`, `.mp4`, `.webm`, `.mp3`, `.wav`, `.ogg`, `.txt`, `.csv`, `.vtt`.
- Published posts run in a CSP sandbox with an opaque origin. Inside it:
  - no `localStorage`, `sessionStorage`, IndexedDB or cookies (calls throw; the core never uses them);
  - no requests to other hosts except Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`): no APIs, CDNs, analytics, embeds or remote images; ship files in `assets/`;
  - no forms, no navigation away (external links open in a new tab), no iframes; the clipboard may be blocked (the shell falls back to selecting the text).
- Any static host also works (GitHub Pages, Netlify, Cloudflare Pages): the folder is the site.
- `npx prosicht update` refreshes the core files of the kit; post files are never touched.

## 14. Reader Controls (include in your report)
Scroll to read · ☰ or the left rail: table of contents · ‹ › steps of a figure · ↺ replay a figure · click an image to enlarge (← → in galleries, Esc closes) · drag the compare divider (← → when focused) · tap hotspot numbers · footnote numbers jump to the sources.
