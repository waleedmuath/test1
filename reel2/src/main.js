// Boot: fonts → engine → player (or capture hooks for the offline renderer).
import { FPS, DUR, LANG, AR } from './config.js';
import { clamp } from './util.js';
import { clearMeasure } from './draw.js';
import { init, renderFrame, labelAt } from './engine.js';
import { renderScore, wavBase64 } from './audio.js';

async function loadFonts() {
  const specs = [];
  for (const w of [400, 500, 600, 700]) specs.push([`${w} 40px "Space Grotesk"`, 'AaBb0123 —→']);
  for (const w of [400, 500, 600]) specs.push([`${w} 40px "IBM Plex Sans"`, 'AaBb Привет']);
  specs.push(['500 40px "IBM Plex Mono"', 'AaBb0123 /—·']);
  for (const w of [400, 500, 600, 700]) specs.push([`${w} 40px "IBM Plex Sans Arabic"`, 'مرحباً المستقبل لا يبني نفسه']);
  await Promise.all(specs.map(([f, s]) => document.fonts.load(f, s)));
  await document.fonts.ready;
}

(async () => {
  const q = new URLSearchParams(location.search);
  const CAPTURE = q.has('capture');
  document.documentElement.lang = LANG;
  document.documentElement.dir = AR ? 'rtl' : 'ltr';
  if (CAPTURE) document.body.classList.add('capture');
  const canvas = document.getElementById('c');
  await loadFonts();
  clearMeasure();
  init(canvas);
  window.renderAt = (t, s = 1) => renderFrame(t, s);
  window.frameData = (i, s = 2) => { renderFrame(i / FPS, s); return canvas.toDataURL('image/png'); };
  window.captureAudio = async () => wavBase64(await renderScore(48000));
  window.READY = true;
  const t0 = q.has('t') ? clamp(+q.get('t') || 0, 0, DUR) : null;
  if (CAPTURE) { renderFrame(t0 ?? 0, 1); return; }

  document.querySelectorAll('.lang a').forEach(a => { if (a.dataset.lang === LANG) a.setAttribute('aria-current', 'true'); });
  const btn = document.getElementById('play'), scrub = document.getElementById('scrub'), tc = document.getElementById('tc'), lab = document.getElementById('label'), ov = document.getElementById('overlay');
  let ac = null, buf = null, src = null, playing = false, start = 0, off = 0;
  const cur = () => (playing ? ac.currentTime - start : off);
  const show = t => { renderFrame(t, 1); scrub.value = t; tc.textContent = t.toFixed(2).padStart(5, '0'); lab.textContent = labelAt(t); };
  async function play() {
    ac = ac || new AudioContext();
    await ac.resume();
    if (!buf) { ov.textContent = AR ? 'جارٍ تأليف الموسيقى…' : 'Composing the score…'; buf = await renderScore(ac.sampleRate); }
    ov.classList.add('hide');
    if (off >= DUR - 0.05) off = 0;
    src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination); src.start(0, off);
    start = ac.currentTime - off; playing = true; btn.textContent = AR ? 'إيقاف' : 'Pause';
    requestAnimationFrame(loop);
  }
  function pause() { if (!playing) return; off = cur(); playing = false; try { src.stop(); } catch (e) {} btn.textContent = AR ? 'تشغيل' : 'Play'; }
  function loop() { if (!playing) return; const t = cur(); if (t >= DUR) { pause(); off = DUR; show(DUR - 1 / FPS); return; } show(t); requestAnimationFrame(loop); }
  btn.onclick = () => (playing ? pause() : play());
  ov.onclick = () => play();
  canvas.onclick = () => (playing ? pause() : play());
  scrub.oninput = () => { const w = playing; if (w) pause(); off = +scrub.value; show(off); if (w) play(); };
  document.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); } });
  document.querySelectorAll('.lang a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); const p = new URLSearchParams(location.search); p.set('lang', a.dataset.lang); p.set('t', cur().toFixed(2)); location.search = p.toString(); }));
  btn.textContent = AR ? 'تشغيل' : 'Play';
  ov.textContent = AR ? '▶ شغّل مع الصوت' : '▶ Play with sound';
  show(t0 ?? 13.2);
  off = t0 ?? 0;
})();
