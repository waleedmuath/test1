'use strict';
/* Player + capture hooks. ?capture → bare 1080×1920 canvas for the renderer. */

async function loadFonts() {
  const specs = [];
  for (const w of [400, 500, 600, 700, 800]) specs.push([`${w} 40px Alexandria`, 'فزعة اختبار Faz3at E5tebar 0123']);
  for (const w of [500, 600]) specs.push([`${w} 20px "IBM Plex Mono"`, 'AB01:']);
  for (const w of [500, 700]) specs.push([`${w} 20px "Space Grotesk"`, 'JoFunction']);
  specs.push(['400 40px KaTeX_Main', '=−±0123']);
  specs.push(['italic 400 40px KaTeX_Math', 'xabcEFm']);
  await Promise.all(specs.map(([f, s]) => document.fonts.load(f, s)));
  await document.fonts.ready;
}

(async function () {
  const params = new URLSearchParams(location.search);
  const CAPTURE = params.has('capture');
  if (CAPTURE) document.body.classList.add('capture');
  document.documentElement.lang = LANG;
  document.title = EN ? 'Faz3at E5tebar Reel (EN)' : 'Faz3at E5tebar Reel';
  const langLink = document.querySelector(`.lang a[data-lang="${LANG}"]`);
  if (langLink) langLink.setAttribute('aria-current', 'true');
  const canvas = document.getElementById('c');
  await loadFonts();
  _mcache.clear();
  initEngine(canvas);

  window.renderAt = (t, samples = 1) => renderFrame(t, samples);
  window.frameDataURL = (i, samples = 4) => { renderFrame(i / FPS, samples); return canvas.toDataURL('image/png'); };
  window.captureAudio = async () => wavBase64(await renderScore(48000));
  window.REEL = { W, H, FPS, DUR, RENDER };
  window.READY = true;
  const tParam = params.has('t') ? clamp(+params.get('t') || 0, 0, DUR) : null;
  if (CAPTURE) { renderFrame(tParam ?? 0, 1); return; }

  const btn = document.getElementById('play'), scrub = document.getElementById('scrub');
  const tcEl = document.getElementById('tc'), overlay = document.getElementById('overlay');
  let actx = null, audioBuf = null, src = null, playing = false, startAt = 0, offset = 0;
  const cur = () => (playing ? actx.currentTime - startAt : offset);
  const langLinks = [...document.querySelectorAll('.lang a')];
  const syncLinks = t => langLinks.forEach(a => {
    const p = new URLSearchParams(location.search);
    p.set('lang', a.dataset.lang);
    p.set('t', t.toFixed(3));
    a.href = '?' + p.toString();
  });
  const show = t => { renderFrame(t, 1); scrub.value = t; tcEl.textContent = t.toFixed(2).padStart(5, '0'); syncLinks(t); };

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
  langLinks.forEach(a => a.addEventListener('click', () => syncLinks(cur())));
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
  show(tParam ?? 28.5);
  offset = tParam ?? 0;
})();
