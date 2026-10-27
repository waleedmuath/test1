// Boot: fonts → stage → reel → typography layer. Exposes renderFrame(t) for
// the offline renderer and a small scrub/play UI for previewing in a browser.
import * as THREE from 'three';
import { W, H, FPS, DUR, clamp, decay, luminance } from './util.js';
import { C } from './brand.js';
import { createStage, RS } from './stage.js';
import { buildReel, T } from './reel.js';
import { createOverlay } from './overlay.js';

async function loadFonts() {
  const faces = [
    ['400', 'Plex Arabic', 'جوفنكشن Aa'], ['500', 'Plex Arabic', 'جوفنكشن Aa'], ['600', 'Plex Arabic', 'جوفنكشن Aa'], ['700', 'Plex Arabic', 'جوفنكشن Aa'],
    ['400', 'Grotesk', 'Aa'], ['500', 'Grotesk', 'Aa'], ['700', 'Grotesk', 'Aa'],
    ['400', 'Plex Mono', 'Aa'], ['500', 'Plex Mono', 'Aa'], ['600', 'Plex Mono', 'Aa']
  ];
  await Promise.all(faces.map(([w, f, s]) => document.fonts.load(`${w} 32px "${f}"`, s)));
  await document.fonts.ready;
}

const params = new URLSearchParams(location.search);
const CAPTURE = params.has('capture');
if (CAPTURE) document.body.classList.add('capture');

await loadFonts();
const canvas = document.getElementById('c');
const stage = createStage(canvas);
const reel = buildReel(stage);
const overlay = createOverlay();
const U = stage.final.uniforms;
U.tOverlay.value = overlay.tex;

const prevCam = new THREE.PerspectiveCamera(32, W / H, 0.1, 500);
// flash colours are mixed after the sRGB encode, so they stay in display space
const paper = [250 / 255, 248 / 255, 246 / 255], orange = [1, 92 / 255, 0];

const PROF = { js: 0, ov: 0, gpu: 0, n: 0 };
window.PROF = PROF;
function renderFrame(t) {
  t = clamp(t, 0, DUR - 1e-4);
  const p0 = performance.now();
  const info = reel.update(t);
  const p1 = performance.now();
  info.look = info.cam.getWorldDirection(new THREE.Vector3()).multiplyScalar(14).add(info.cam.position);
  const ov = overlay.draw(t, info);
  const p2 = performance.now();
  // whip blur: how far the point we look at moved on screen since the previous frame
  prevCam.position.copy(info.prev.pos); prevCam.fov = info.cam.fov; prevCam.updateProjectionMatrix();
  prevCam.lookAt(info.prev.look); prevCam.updateMatrixWorld();
  const p = info.look.clone().project(prevCam);
  const blur = new THREE.Vector2(-p.x / 2, -p.y / 2).multiplyScalar(1.1);
  if (blur.length() < 0.0015) blur.set(0, 0);
  if (blur.length() > 0.25) blur.setLength(0.25);
  U.uBlur.value.copy(blur);
  U.uBlurOv.value.copy(ov.blurOv.length() < 0.001 ? new THREE.Vector2() : ov.blurOv);
  const light = luminance(info.bg) > 0.45;
  const imp = t >= T.impact ? decay(t - T.impact, 7) : 0;
  const burst = t >= T.burst ? decay(t - T.burst, 7) : 0;
  U.uFlash.value = 0.9 * imp + 0.22 * burst;
  U.uFlashCol.value.fromArray(imp > burst ? paper : orange);
  U.uCA.value = 2.4 * imp + 1.8 * burst + Math.min(1.4, blur.length() * 16);
  U.uVig.value = light ? 0.05 : 0.28;
  U.uGrain.value = light ? 0.028 : 0.04;
  U.uSeed.value = (Math.round(t * FPS) % 97) * 0.731;
  stage.composer.render();
  if (PROF.on) { const px = new Uint8Array(4); const gl2 = stage.renderer.getContext(); gl2.readPixels(0, 0, 1, 1, gl2.RGBA, gl2.UNSIGNED_BYTE, px); }
  const p3 = performance.now();
  PROF.js += p1 - p0; PROF.ov += p2 - p1; PROF.gpu += p3 - p2; PROF.n++;
  return info;
}

window.renderFrame = t => { renderFrame(t); };
const gl = stage.renderer.getContext();
const PW = Math.round(W * RS), PH = Math.round(H * RS);
const pixels = new Uint8Array(PW * PH * 4);
window.captureFrame = async (i, url, fps = FPS) => {
  renderFrame(i / fps);
  gl.readPixels(0, 0, PW, PH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const r = await fetch(url, { method: 'POST', body: pixels });
  if (!r.ok) throw new Error('frame upload failed ' + r.status);
  return i;
};
window.REEL = { W: PW, H: PH, FPS, DUR, pills: reel.N };
window.READY = true;

if (!CAPTURE) {
  const scrub = document.getElementById('scrub'), btn = document.getElementById('play'), tc = document.getElementById('tc');
  const audio = new Audio('out/score.wav');
  let playing = false, raf = 0;
  const show = t => { renderFrame(t); scrub.value = t; tc.textContent = t.toFixed(2); };
  const loop = () => { if (!playing) return; const t = audio.currentTime; if (t >= DUR - 0.02 || audio.ended) { playing = false; btn.textContent = 'Play'; return; } show(t); raf = requestAnimationFrame(loop); };
  btn.onclick = async () => {
    if (playing) { audio.pause(); playing = false; btn.textContent = 'Play'; return; }
    if (audio.currentTime >= DUR - 0.05) audio.currentTime = 0;
    try { await audio.play(); } catch (e) { /* no score rendered yet: play silently */ }
    playing = true; btn.textContent = 'Pause'; loop();
  };
  scrub.oninput = () => { audio.currentTime = +scrub.value; show(+scrub.value); };
  show(+(params.get('t') || 26));
}
