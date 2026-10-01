/* Synthesised UI sounds (Web Audio). No files, no downloads.
   CORE FILE: `npx prosicht update` overwrites it.

   Muted until the presenter presses M (or opens the deck with ?sound=1). The
   choice is remembered in localStorage. Browsers only allow audio after the
   first click or key press; the shell calls unlock() on that gesture. */

const STORE_KEY = 'prosicht-sound';

function readStored() {
  try { return localStorage.getItem(STORE_KEY); } catch { return null; }
}
function writeStored(value) {
  try { localStorage.setItem(STORE_KEY, value); } catch { /* private mode */ }
}

export function createSound({ muted } = {}) {
  let ctx = null;
  let master = null;
  let isMuted = muted ?? readStored() !== 'on';
  const lastPlayed = new Map();
  const listeners = new Set();

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    return ctx;
  }

  function tone({ freq, glide, type = 'sine', dur = 0.12, gain = 0.15, attack = 0.005, at = 0, pan = 0 }) {
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env);
    if (panner) { panner.pan.value = pan; env.connect(panner); panner.connect(master); } else env.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise({ dur = 0.3, gain = 0.1, from = 400, to = 2400 }) {
    const t0 = ctx.currentTime;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(from, t0);
    filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.35);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(env);
    env.connect(master);
    src.start(t0);
  }

  const voices = {
    tick: () => tone({ freq: 1900, type: 'triangle', dur: 0.035, gain: 0.05 }),
    pop: () => tone({ freq: 480, glide: 920, dur: 0.09, gain: 0.12 }),
    blip: (o = {}) => tone({ freq: 660 * 2 ** ((o.note ?? 0) / 12), type: 'triangle', dur: 0.1, gain: 0.1, pan: o.pan ?? 0 }),
    whoosh: () => noise({ dur: 0.28, gain: 0.07 }),
    chime: () => {
      tone({ freq: 784, dur: 0.5, gain: 0.1 });
      tone({ freq: 1175, dur: 0.65, gain: 0.07, at: 0.07 });
    },
    error: () => tone({ freq: 240, glide: 150, type: 'sawtooth', dur: 0.22, gain: 0.05 }),
  };

  const notify = () => listeners.forEach((fn) => fn(isMuted));

  return {
    play(name, opts) {
      if (isMuted || !voices[name] || !ensure() || ctx.state !== 'running') return null;
      const now = performance.now();
      if (now - (lastPlayed.get(name) || 0) < 40) return null;
      lastPlayed.set(name, now);
      voices[name](opts);
      return true;
    },
    unlock() {
      if (isMuted) return;
      const c = ensure();
      if (c?.state === 'suspended') c.resume();
    },
    isMuted: () => isMuted,
    setMuted(next) {
      isMuted = Boolean(next);
      writeStored(isMuted ? 'off' : 'on');
      if (!isMuted) this.unlock();
      notify();
    },
    toggle() { this.setMuted(!isMuted); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
