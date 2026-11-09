// Pro Sicht video kit: boot and player (core, do not edit).
//
// Two modes on the same page:
// - render: HyperFrames (`npx prosicht render`) creates window.__timelines before
//   this module runs and seeks the timeline frame by frame; no player UI.
// - player: the browser plays the timeline in real time with controls
//   (deck.prosicht.com, `python3 -m http.server`).
import { createFilm } from './motion.js';
import * as content from '../film.js';

const ICON = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
  replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a7 7 0 1 1-6.6 4.7l1.9.6A5 5 0 1 0 12 7v3L7.5 6 12 2z"/></svg>',
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="1.8"/></svg>',
  full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};

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
  startPlayer(M, spec);
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



function startPlayer(M, spec) {
  const tr = spec.lang === 'tr';
  const T = tr
    ? { play: 'Oynat', pause: 'Duraklat', replay: 'Yeniden oynat', mute: 'Sesi kapat', unmute: 'Sesi aç', full: 'Tam ekran', seek: 'Zaman', mp4: 'MP4 indir' }
    : { play: 'Play', pause: 'Pause', replay: 'Replay', mute: 'Mute', unmute: 'Unmute', full: 'Full screen', seek: 'Time', mp4: 'Download MP4' };
  const { tl, fps } = M;
  const D = spec.duration;
  const body = document.body;
  body.classList.add('pv-player');

  const fit = () => {
    const scale = Math.min(innerWidth / spec.width, innerHeight / spec.height);
    const x = (innerWidth - spec.width * scale) / 2;
    const y = (innerHeight - spec.height * scale) / 2;
    root.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };
  addEventListener('resize', fit);
  fit();

  const ui = document.createElement('div');
  ui.className = 'pv-ui';
  ui.innerHTML = `
    <button class="pv-big" type="button" aria-label="${T.play}">${ICON.play}</button>
    <div class="pv-bar">
      <button class="pv-btn pv-play" type="button" aria-label="${T.play}">${ICON.play}</button>
      <span class="pv-time"></span>
      <input class="pv-seek" type="range" min="0" max="${D}" step="${1 / fps}" value="0" aria-label="${T.seek}">
      <button class="pv-btn pv-mute" type="button" hidden aria-label="${T.mute}">${ICON.sound}</button>
      <a class="pv-btn pv-mp4" hidden target="_blank" rel="noopener" aria-label="${T.mp4}">MP4</a>
      <button class="pv-btn pv-full" type="button" aria-label="${T.full}">${ICON.full}</button>
    </div>`;
  body.append(ui);
  const $ = (selector) => ui.querySelector(selector);
  const big = $('.pv-big');
  const playBtn = $('.pv-play');
  const time = $('.pv-time');
  const seek = $('.pv-seek');
  const muteBtn = $('.pv-mute');
  const mp4 = $('.pv-mp4');

  // music: loaded as a blob so seeking works on servers without Range support
  let audio = null;
  if (spec.music) {
    audio = new Audio();
    audio.preload = 'auto';
    audio.volume = spec.music.volume;
    fetch(spec.music.src)
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => { audio.src = URL.createObjectURL(blob); })
      .catch(() => { audio.src = spec.music.src; });
    muteBtn.hidden = false;
  }

  // film.mp4: the MP4 made with `npx prosicht render` (it sets this field)
  if (spec.mp4) {
    mp4.href = spec.mp4;
    mp4.hidden = false;
  }

  const fmt = (seconds) => {
    const whole = Math.floor(seconds + 1e-6);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  };

  let t = 0;
  let playing = false;
  let started = false;
  let raf = 0;
  let clockT = 0;
  let clockAt = 0;

  const render = (seconds) => {
    t = Math.min(D, Math.max(0, seconds));
    tl.seek(t, false);
    seek.value = String(t);
    seek.style.setProperty('--p', `${(t / D) * 100}%`);
    time.textContent = `${fmt(t)} / ${fmt(D)}`;
  };

  const syncAudio = (force) => {
    if (!audio || !audio.src) return;
    const local = t - spec.music.start;
    const inside = local >= 0 && (!Number.isFinite(audio.duration) || local < audio.duration);
    if (!playing || !inside) {
      if (!audio.paused) audio.pause();
      return;
    }
    if (force || Math.abs(audio.currentTime - local) > 0.15) audio.currentTime = local;
    if (audio.paused) audio.play().catch(() => {});
  };

  const setButtons = () => {
    const ended = !playing && t >= D - 1 / fps;
    const icon = playing ? ICON.pause : ended ? ICON.replay : ICON.play;
    const label = playing ? T.pause : ended ? T.replay : T.play;
    playBtn.innerHTML = icon;
    playBtn.setAttribute('aria-label', label);
    big.innerHTML = ended ? ICON.replay : ICON.play;
    big.setAttribute('aria-label', label);
    body.classList.toggle('pv-playing', playing);
    body.classList.toggle('pv-started', started);
  };

  const loop = (now) => {
    const next = clockT + (now - clockAt) / 1000;
    if (next >= D) {
      render(D);
      pause();
      return;
    }
    render(next);
    syncAudio(false);
    raf = requestAnimationFrame(loop);
  };

  function play() {
    if (!started || t >= D - 1 / fps) render(0);
    started = true;
    playing = true;
    clockT = t;
    clockAt = performance.now();
    syncAudio(true);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    setButtons();
    poke();
  }

  function pause() {
    playing = false;
    cancelAnimationFrame(raf);
    if (audio) audio.pause();
    setButtons();
    poke();
  }

  const toggle = () => (playing ? pause() : play());

  const jump = (seconds) => {
    started = true;
    render(seconds);
    clockT = t;
    clockAt = performance.now();
    syncAudio(true);
    setButtons();
    poke();
  };

  // controls fade out while playing and the pointer rests
  let idle = 0;
  function poke() {
    body.classList.remove('pv-idle');
    clearTimeout(idle);
    if (playing) idle = setTimeout(() => body.classList.add('pv-idle'), 2500);
  }

  big.addEventListener('click', play);
  playBtn.addEventListener('click', toggle);
  root.addEventListener('click', toggle);
  seek.addEventListener('input', () => jump(Number(seek.value)));
  muteBtn.addEventListener('click', () => {
    audio.muted = !audio.muted;
    muteBtn.innerHTML = audio.muted ? ICON.muted : ICON.sound;
    muteBtn.setAttribute('aria-label', audio.muted ? T.unmute : T.mute);
  });
  $('.pv-full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen?.().catch(() => {});
  });
  addEventListener('pointermove', poke);
  addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement && event.key !== ' ') return;
    const step = event.shiftKey ? 5 : 1;
    const keys = {
      ' ': toggle,
      k: toggle,
      ArrowRight: () => jump(t + step),
      ArrowLeft: () => jump(t - step),
      '.': () => jump(t + 1 / fps),
      ',': () => jump(t - 1 / fps),
      Home: () => jump(0),
      '0': () => jump(0),
      f: () => $('.pv-full').click(),
      m: () => !muteBtn.hidden && muteBtn.click(),
    };
    const action = keys[event.key] || keys[event.key.toLowerCase()];
    if (!action) return;
    event.preventDefault();
    action();
  });

  // ?t=12.5 opens the film at that second (checks and screenshots)
  const at = Number(new URLSearchParams(location.search).get('t'));
  if (Number.isFinite(at) && at > 0) {
    started = true;
    render(at);
  } else render(spec.poster / fps);
  setButtons();
  globalThis.film = { play, pause, seek: jump, get time() { return t; }, duration: D, fps };
}
