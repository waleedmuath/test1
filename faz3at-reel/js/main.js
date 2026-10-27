'use strict';
/* Player and capture hooks. ?capture → bare 1080×1920 canvas for tools/render.cjs. */

const FACES = [
  ['800 40px Alexandria', 'فزعة اختبار Faz3at'], ['600 40px Alexandria', 'تعلّم Learn'], ['500 40px Alexandria', 'من by'],
  ['700 30px "JetBrains Mono"', '0123456789:'], ['400 40px KaTeX_Main', '=−±0123'], ['italic 400 40px KaTeX_Math', 'xabcEFm']
];

addEventListener('DOMContentLoaded', async () => {
  const q = new URLSearchParams(location.search);
  const capture = q.has('capture');
  document.body.classList.toggle('capture', capture);
  document.documentElement.setAttribute('lang', LANG);
  document.title = `Faz3at E5tebar Reel — ${EN ? 'English' : 'العربية'}`;

  await Promise.all(FACES.map(([f, s]) => document.fonts.load(f, s)));
  await document.fonts.ready.then(() => null);
  _wcache.clear();

  const canvas = document.getElementById('reel');
  boot(canvas);
  window.renderAt = (t, samples = 1) => frame(t, samples);
  window.framePNG = (i, samples = 4) => { frame(i / FPS, samples); return canvas.toDataURL('image/png'); };
  window.scoreWAV = () => wavB64(composeScore(48000));
  window.REEL = { W, H, FPS, DUR, LANG };
  window.READY = true;

  const startAt = q.has('t') ? clamp(Number(q.get('t')) || 0, 0, DUR) : null;
  if (capture) { frame(startAt ?? 0); return; }

  // ---------- interactive player ----------
  const toggle = document.getElementById('toggle'), seek = document.getElementById('seek');
  const clock = document.getElementById('clock'), start = document.getElementById('start');
  document.querySelectorAll('.langs a').forEach(a => {
    if (a.dataset.lang === LANG) a.setAttribute('aria-current', 'page');
    a.addEventListener('click', () => { a.href = `?lang=${a.dataset.lang}&t=${pos().toFixed(2)}`; });
  });
  let ac = null, buffer = null, node = null, origin = 0, held = startAt ?? 0, running = false;
  const pos = () => (running ? Math.min(DUR, ac.currentTime - origin) : held);
  const show = t => { frame(t); seek.value = t; clock.textContent = t.toFixed(2); };

  async function play() {
    ac = ac || new AudioContext();
    await ac.resume();
    if (!buffer) {
      start.textContent = 'Composing…';
      const mix = composeScore(ac.sampleRate);
      buffer = ac.createBuffer(2, mix.L.length, ac.sampleRate);
      buffer.copyToChannel(mix.L, 0); buffer.copyToChannel(mix.R, 1);
    }
    if (held >= DUR - 0.02) held = 0;
    node = ac.createBufferSource();
    node.buffer = buffer; node.connect(ac.destination); node.start(0, held);
    origin = ac.currentTime - held; running = true;
    start.hidden = true; toggle.textContent = 'Pause';
    requestAnimationFrame(tick);
  }
  function pause() {
    if (!running) return;
    held = pos(); running = false;
    try { node.stop(); } catch (e) { /* already ended */ }
    toggle.textContent = 'Play';
  }
  function tick() {
    if (!running) return;
    const t = pos();
    if (t >= DUR) { pause(); held = DUR; show(DUR - 1 / FPS); return; }
    show(t);
    requestAnimationFrame(tick);
  }
  const flip = () => (running ? pause() : play());
  toggle.addEventListener('click', flip);
  start.addEventListener('click', play);
  canvas.addEventListener('click', flip);
  seek.addEventListener('input', () => { const was = running; pause(); held = Number(seek.value); show(held); if (was) play(); });
  addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); flip(); } });
  show(held || 28.5);
});
