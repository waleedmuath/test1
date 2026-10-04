'use strict';
/* Player + capture hooks. ?capture → bare 1920×1080 canvas for the renderer. */

async function loadFonts() {
  const latin = [
    '400 20px "Space Grotesk"', '500 20px "Space Grotesk"', '600 20px "Space Grotesk"', '700 20px "Space Grotesk"',
    '400 20px "IBM Plex Mono"', '500 20px "IBM Plex Mono"', '600 20px "IBM Plex Mono"',
    '500 20px "IBM Plex Sans"'
  ];
  const ar = ['400', '500', '600', '700'].map(w => `${w} 20px "IBM Plex Sans Arabic"`);
  await Promise.all([
    ...latin.map(s => document.fonts.load(s, 'AaBb0123·—')),
    ...ar.map(s => document.fonts.load(s, 'جوفنكشن الأقسام')),
    ...ar.map(s => document.fonts.load(s, 'Aa'))
  ]);
  await document.fonts.ready;
}

(async function () {
  const params = new URLSearchParams(location.search);
  const CAPTURE = params.has('capture');
  if (CAPTURE) document.body.classList.add('capture');
  document.documentElement.lang = LANG;
  document.title = EN ? 'JoFunction Motion Reel (EN)' : 'JoFunction Motion Reel';
  const langLink = document.querySelector(`.lang a[data-lang="${LANG}"]`);
  if (langLink) langLink.setAttribute('aria-current', 'true');
  const canvas = document.getElementById('c');
  await loadFonts();
  initEngine(canvas);

  window.renderAt = (t, samples = 1) => renderFrame(t, samples);
  window.frameDataURL = (i, samples = 4) => { renderFrame(i / FPS, samples); return canvas.toDataURL('image/png'); };
  window.captureAudio = async () => wavBase64(await renderScore(48000));
  window.REEL = { W, H, FPS, DUR, RENDER };
  window.READY = true;
  if (CAPTURE) { renderFrame(+(params.get('t') || 0), 1); return; }

  const btn = document.getElementById('play'), scrub = document.getElementById('scrub');
  const tcEl = document.getElementById('tc'), overlay = document.getElementById('overlay');
  let actx = null, audioBuf = null, src = null, playing = false, startAt = 0, offset = 0;
  const cur = () => (playing ? actx.currentTime - startAt : offset);
  const show = t => { renderFrame(t, 1); scrub.value = t; tcEl.textContent = t.toFixed(2).padStart(5, '0'); };

  async function play() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    await actx.resume();
    if (!audioBuf) {
      overlay.textContent = 'Composing score…';
      audioBuf = await renderScore(actx.sampleRate);
    }
    overlay.classList.add('hide');
    if (offset >= DUR - 0.05) offset = 0;
    src = actx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(actx.destination);
    src.start(0, offset);
    startAt = actx.currentTime - offset;
    playing = true;
    btn.textContent = 'Pause';
    requestAnimationFrame(loop);
  }
  function pause() {
    if (!playing) return;
    offset = cur();
    playing = false;
    try { src.stop(); } catch (e) { /* already stopped */ }
    btn.textContent = 'Play';
  }
  function loop() {
    if (!playing) return;
    let t = cur();
    if (t >= DUR) { pause(); offset = DUR; show(DUR - 1 / FPS); return; }
    show(t);
    requestAnimationFrame(loop);
  }
  btn.addEventListener('click', () => (playing ? pause() : play()));
  overlay.addEventListener('click', () => play());
  canvas.addEventListener('click', () => (playing ? pause() : play()));
  scrub.addEventListener('input', () => {
    const was = playing;
    if (was) pause();
    offset = +scrub.value;
    show(offset);
    if (was) play();
  });
  document.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
  });
  show(params.has('t') ? +params.get('t') : 27.5);
  offset = 0;
})();
