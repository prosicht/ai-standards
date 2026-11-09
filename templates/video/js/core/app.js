// Pro Sicht video kit: boot and player (core, do not edit).
//
// Two modes on the same page:
// - render: HyperFrames (`npx prosicht render`) creates window.__timelines before
//   this module runs and seeks the timeline frame by frame; no player UI.
// - player: js/core/player.js plays the timeline in real time with controls
//   (deck.prosicht.com, `python3 -m http.server`).
import { createFilm } from './motion.js';
import * as content from '../film.js';


const RENDER = typeof globalThis.__timelines === 'object' || new URLSearchParams(location.search).has('render');
const root = document.getElementById('film');
const spec = normalize(content.film || {});

document.documentElement.lang = spec.lang;
document.title = spec.title;
Object.assign(root.dataset, {
  compositionId: 'film',
  start: '0',
  width: String(spec.width),
  height: String(spec.height),
  duration: String(spec.duration),
  fps: String(spec.fps),
});
root.style.width = `${spec.width}px`;
root.style.height = `${spec.height}px`;
if (spec.background) root.style.background = spec.background;
root.innerHTML = typeof content.scenes === 'string' ? content.scenes : '';

if (RENDER && spec.music) {
  // HyperFrames mixes <audio id … data-start> into the MP4
  const audio = document.createElement('audio');
  Object.assign(audio, { id: 'film-music', preload: 'auto', src: spec.music.src });
  audio.dataset.start = String(spec.music.start);
  audio.dataset.volume = String(spec.music.volume);
  root.append(audio);
}

await document.fonts.ready;
const M = createFilm(root, spec);
try {
  if (typeof content.build !== 'function') throw new Error('js/film.js must export function build(M)');
  content.build(M);
} catch (error) {
  console.error('[film] build failed:', error);
  if (!RENDER) showError(error);
}
M.finalize();
globalThis.__filmEvents = M.events;
globalThis.__timelines = globalThis.__timelines || {};
globalThis.__timelines.film = M.tl;

if (RENDER) {
  document.body.classList.add('pv-render');
  M.tl.seek(0);
} else {
  // the player (real-time clock, controls) is never loaded by the renderer
  const { startPlayer } = await import('./player.js');
  startPlayer(M, spec, root);
}

function normalize(raw) {
  const num = (value, fallback, min, max) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback);
  const fps = Math.round(num(raw.fps, 30, 12, 60));
  const duration = num(raw.duration, 10, 1, 600);
  const music = raw.music && typeof raw.music.src === 'string'
    ? { src: raw.music.src, start: num(raw.music.start, 0, 0, duration), volume: num(raw.music.volume, 1, 0, 1) }
    : null;
  return {
    title: typeof raw.title === 'string' ? raw.title.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || 'Video' : 'Video',
    lang: typeof raw.lang === 'string' ? raw.lang : 'tr',
    fps,
    duration,
    width: Math.round(num(raw.width, 1920, 320, 3840)),
    height: Math.round(num(raw.height, 1080, 320, 3840)),
    poster: num(raw.poster, Math.round(duration * fps * 0.3), 0, Math.floor(duration * fps)),
    music,
    background: typeof raw.background === 'string' ? raw.background : null,
    mp4: typeof raw.mp4 === 'string' && /^assets\/[\w./-]+\.mp4$/.test(raw.mp4) ? raw.mp4 : null,
  };
}

function showError(error) {
  const box = document.createElement('pre');
  box.className = 'pv-error';
  box.textContent = `Film çalışmadı / film failed:\n${error && error.message ? error.message : error}`;
  document.body.append(box);
}
