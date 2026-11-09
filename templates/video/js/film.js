// The film: settings, scene markup and the timeline (FILM-OWNED; see AGENTS.md sections 4-6).
// This demo is the reference. Replace it completely for a real film.

export const film = {
  title: 'Pro Sicht video altyapısı',
  lang: 'tr',
  fps: 30,
  duration: 12, // seconds; the MP4 is exactly this long
  width: 1920,
  height: 1080,
  poster: 66, // frame shown before the viewer presses play
  // music: { src: 'assets/media/music.mp3', start: 0, volume: 1 },
  // mp4: 'assets/video.mp4', // written by `npx prosicht render`: adds the MP4 button to the player
};

// Every scene is a <section class="scene">; build() decides when each one is on screen.
export const scenes = `
<section class="scene dark" id="s1">
  <div class="cam" id="cam1">
    <div class="glow"></div>
    <h1 class="headline" id="t1">Bir konu ver.</h1>
    <h1 class="headline" id="t2">Video <em>hazır</em> olsun.</h1>
  </div>
</section>

<section class="scene light" id="s2">
  <div class="cam" id="cam2">
    <div class="track">
      <div class="clip">Fikir</div>
      <div class="clip">Sahneler</div>
      <div class="clip">Render</div>
      <div class="playhead" id="head"></div>
    </div>
    <p class="frames"><span id="frames">0</span> kare</p>
    <h2 class="line" id="l2">Her kare zamana bağlı.</h2>
  </div>
</section>

<section class="scene dark" id="s3">
  <h1 class="giant" id="mp4">MP4</h1>
  <p class="line" id="l3">Tarayıcıda oynar, <code>npx prosicht render</code> ile iner.</p>
</section>

<section class="scene dark" id="s4">
  <p class="mark" id="mark">Pro Sicht <strong>Deck</strong></p>
</section>
`;

/** Frames are the unit: 30 = one second at 30 fps. */
export function build(M) {
  // 1 · hook: the promise, word by word, on a slowly pushing camera
  M.show('#s1', 0);
  M.drift('#cam1', { prop: 'scale', from: 1, to: 1.06, start: 0, end: 96 });
  M.words('#t1', { at: 4, gap: 5 });
  M.exit('#t1', { at: 40, frames: 10 });
  M.words('#t2', { at: 46, gap: 5 });

  // 2 · proof: clips land on a track, the playhead runs, the frame count follows it
  M.cut(96, { hide: '#s1', show: '#s2' });
  M.camera('#cam2', [[96, { scale: 1.1 }], [216, { scale: 1 }, 'glide']]);
  M.cascade('#s2 .clip', {
    at: 98,
    gap: 6,
    fn: (el, frame) => M.enter(el, { at: frame, frames: 14, from: { x: 240, opacity: 0, blur: 8 } }),
  });
  M.enter('#head', { at: 124, frames: 6, from: { opacity: 0 } });
  M.kf('#head', 'x', [[124, 0], [208, 1180, 'glide']]);
  M.count('#frames', { at: 124, from: 0, to: 360, frames: 84, ease: 'glide' });
  M.words('#l2', { at: 150, gap: 4 });

  // 3 · result: the word arrives from oversize and settles
  M.cut(216, { hide: '#s2', show: '#s3' });
  M.enter('#mp4', { at: 216, frames: 18, from: { scale: 2.4, opacity: 0, blur: 14 }, ease: 'snap' });
  M.words('#l3', { at: 238, gap: 4 });

  // 4 · end: a small mark and about a second of calm
  M.cut(300, { hide: '#s3', show: '#s4' });
  M.enter('#mark', { at: 302, frames: 16, from: { y: 24, opacity: 0, blur: 8 } });
}
