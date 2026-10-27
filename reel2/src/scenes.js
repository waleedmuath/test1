// The ten shots. Each draw(S, b, lt) paints one slot for global beat b (lt = seconds into the shot)
// and returns per-shot lens settings. Layout mirrors for Arabic (reading-start side = right).
import * as THREE from 'three';
import { W, H, B, AR, C, F, DISPLAY } from './config.js';
import { clamp, lerp, prog, E, ease, spring, decay, bell, rng, hash, vnoise, rgba, mixc, TAU } from './util.js';
import { text, measure, fit, sprite, spriteXY, icon, mark, MARK, pointAt } from './draw.js';
import { T } from './copy.js';
import { Morph, samplePoints } from './particles.js';

const XL = AR ? W - 160 : 160;       // reading-start margin
const AL = AR ? 'right' : 'left';
const DX = AR ? -1 : 1;              // reading direction
const TD = { f: DISPLAY, w: 700 };   // display type
const TS = { f: AR ? F.ar : F.sans, w: 500 };
const MONO = { f: F.mono, w: 500 };
const sec = b => b * B;

/* ---------------- shared painters ---------------- */
function bgInk(g, glow = 0.6, gx = W / 2, gy = H / 2, col = C.fn) {
  g.fillStyle = C.ink; g.fillRect(0, 0, W, H);
  if (glow > 0) {
    const r = g.createRadialGradient(gx, gy, 0, gx, gy, 1100);
    r.addColorStop(0, rgba(col, 0.16 * glow)); r.addColorStop(0.45, rgba(col, 0.05 * glow)); r.addColorStop(1, rgba(col, 0));
    g.fillStyle = r; g.fillRect(0, 0, W, H);
  }
}
function dust(S, b, a = 1) {
  const d = S.dustObj; S.stage.add(d.obj); d.obj.visible = a > 0;
  d.u.uTime.value = sec(b); d.u.uAlpha.value = a;
}
// draw a type sprite with transform; (x,y) = text anchor at baseline; origin for scale = anchor
function drawText(g, s, x, y, o, tf = {}) {
  const sp = sprite(s, o);
  const pos = spriteXY(sp, x, y, o.a || 'left');
  const ox = tf.ox ?? x, oy = tf.oy ?? y - o.s * 0.35;
  g.save();
  if (tf.clip) { g.beginPath(); g.rect(...tf.clip); g.clip(); }
  g.globalAlpha *= clamp(tf.alpha ?? 1);
  if (tf.comp) g.globalCompositeOperation = tf.comp;
  g.translate(ox + (tf.dx || 0), oy + (tf.dy || 0));
  if (tf.rot) g.rotate(tf.rot);
  g.scale(tf.sx ?? tf.s ?? 1, tf.sy ?? tf.s ?? 1);
  if (tf.skx) g.transform(1, 0, tf.skx, 1, 0, 0);
  if (tf.glow) { g.shadowColor = tf.glow; g.shadowBlur = tf.glowR || 40; }
  g.drawImage(sp.cv, pos.x - ox, pos.y - oy);
  g.restore();
  return sp;
}
// mask-reveal: text slides up from behind its own baseline
function reveal(g, s, x, y, o, p, extra = {}) {
  if (p <= 0) return;
  const w = measure(s, o), left = (o.a || 'left') === 'right' ? x - w : (o.a === 'center' ? x - w / 2 : x);
  drawText(g, s, x, y, o, { ...extra, clip: [left - o.s, y - o.s * 1.25, w + o.s * 2, o.s * 1.75], dy: (1 - p) * o.s * 1.35 });
}
function wrap(s, o, maxW) {
  const out = []; let cur = '';
  for (const w of s.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && measure(t, o) > maxW) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
function kicker(g, s, x, y, p, col = C.fn, a = AL) {
  if (p <= 0) return;
  const pw = 36 * ease.expoOut(p);
  const o = { ...MONO, s: 20, ls: AR ? 0 : 4, c: col };
  if (a === 'left') { g.fillStyle = col; g.fillRect(x, y - 8, pw, 3); reveal(g, s, x + 52, y, { ...o, a: 'left' }, p); }
  else { g.fillStyle = col; g.fillRect(x - pw, y - 8, pw, 3); reveal(g, s, x - 52, y, { ...o, a: 'right' }, p); }
}

/* =========================================================================
   S1 · Greetings — the site's own intro, reimagined (beats 0–3.5)
   ========================================================================= */
const GREET_SPEC = s => (s === 'ar' ? { f: F.ar, w: 600 } : s === 'ru' ? { f: F.sans, w: 600 } : { f: F.display, w: 600 });
function sGreet(S, b) {
  const g = S.back.begin();
  bgInk(g, 0.5 + 0.5 * bell(b, 0, 3.5), W / 2, 560);
  dust(S, b, 0.9);
  const f = S.front.begin();
  const RW = 640, ry = 712, rx = W / 2 - RW / 2;
  const collapse = E(b, 3.1, 3.45, ease.inC);
  const rp = E(b, 0, 0.7) * (1 - collapse);
  f.fillStyle = rgba(C.cream, 0.16);
  f.fillRect(W / 2 - (RW / 2) * rp, ry, RW * rp, 2);
  const steps = clamp((b - 0.5) * 4, 0, 8);
  const k = Math.min(7, Math.floor(steps));
  const fillp = (Math.floor(steps) + E(steps - Math.floor(steps), 0, 0.6)) / 8;
  const fw = RW * clamp(fillp) * (1 - collapse);
  f.fillStyle = C.fn;
  if (AR) f.fillRect(rx + RW - fw, ry - 0.5, fw, 3); else f.fillRect(rx, ry - 0.5, fw, 3);
  if (fw > 2 && fillp < 1) {
    const hx = AR ? rx + RW - fw : rx + fw, gr = f.createRadialGradient(hx, ry + 1, 0, hx, ry + 1, 40);
    gr.addColorStop(0, 'rgba(255,220,190,.95)'); gr.addColorStop(1, 'rgba(255,92,0,0)');
    f.fillStyle = gr; f.fillRect(hx - 40, ry - 40, 80, 80);
  }
  if (b >= 0.5) {
    const u = steps - k;
    const word = (i, dy, a, sc = 1) => {
      const gw = T.greet[i], o = { ...GREET_SPEC(gw.s), s: 200, c: C.cream, a: 'center', rtl: gw.s === 'ar' };
      drawText(f, gw.w, W / 2, 610, o, { dy, alpha: a, s: sc, ox: W / 2, oy: 540, glow: i === 7 ? rgba(C.fn, 0.55 * E(b, 2.5, 3.1)) : null, glowR: 60 });
    };
    if (b < 2.5) {
      word(k, (1 - E(u, 0, 0.55)) * 70, E(u, 0, 0.35, ease.lin));
      if (k > 0 && u < 0.5) word(k - 1, -E(u, 0, 0.5) * 70, 1 - E(u, 0, 0.4, ease.lin));
    } else {
      const push = 1 + 0.05 * E(b, 2.5, 3.1, ease.glide);
      const sc = push * (1 - E(b, 3.1, 3.42, ease.inBk) * 0.995);
      word(7, 0, 1, Math.max(0.001, sc));
    }
    const gw = T.greet[k];
    const lo = { ...MONO, s: 20, ls: 3, c: C.muted, a: 'center', rtl: gw.n === 'العربية' };
    text(f, gw.n, W / 2, 768, { ...lo, alpha: 1 - collapse });
    const cnt = `0${k + 1} / 08`;
    text(f, cnt, AR ? rx : rx + RW, 690, { ...MONO, s: 18, ls: 2, c: C.cream, a: AR ? 'left' : 'right', rtl: false, alpha: E(b, 0.4, 0.8) * (1 - collapse) });
    text(f, T.url, AR ? rx + RW : rx, 690, { ...MONO, s: 18, ls: 2, c: C.muted, a: AR ? 'right' : 'left', rtl: false, alpha: E(b, 0.4, 0.8) * (1 - collapse) });
  }
  const dot = bell(b, 3.2, 3.5);
  if (dot > 0) {
    const gr = f.createRadialGradient(W / 2, 540, 0, W / 2, 540, 220 * dot);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,170,110,.8)'); gr.addColorStop(1, 'rgba(255,92,0,0)');
    f.fillStyle = gr; f.fillRect(0, 0, W, H);
  }
  return { bloom: 0.8, threshold: 0.55, vig: 0.5, leak: 0.08 };
}

/* =========================================================================
   S2 · Hook — "The future doesn't build itself." (beats 3.5–7.25)
   ========================================================================= */
const HOOK = { base: [372, 617, 862] };
function hookLayout() {
  if (HOOK.o) return HOOK;
  const o = { ...TD, a: AL, c: C.cream, ls: AR ? 0 : -6 };
  o.s = fit(T.hook, o, 1560, AR ? 250 : 236);
  HOOK.o = o;
  const last = T.hook[2];
  HOOK.l3 = last.endsWith('.') ? last.slice(0, -1) : last;
  return HOOK;
}
function drawHookText(f, b, opts = {}) {
  const L = hookLayout(), o = L.o;
  for (let i = 0; i < 3; i++) {
    const t0 = 4 + i;
    if (b < t0 - 0.001 && !opts.all) continue;
    const q = opts.all ? 1 : prog(b, t0, t0 + 0.6);
    const sc = lerp(1.2, 1, ease.expoOut(q));
    const a = opts.all ? 1 : E(b, t0, t0 + 0.07, ease.lin);
    const flash = opts.all ? 0 : decay(sec(b - t0), 9);
    const s = i === 2 ? L.l3 : T.hook[i];
    const jit = opts.jit || 0;
    const tf = { s: sc, alpha: a * (opts.alpha ?? 1), ox: XL, oy: L.base[i] - o.s * 0.35, dx: jit * vnoise(b * 40 + i * 9) , dy: jit * vnoise(b * 37 + i * 3) };
    drawText(f, s, XL, L.base[i], o, tf);
    if (flash > 0.02) drawText(f, s, XL, L.base[i], { ...o, c: '#FFFFFF' }, { ...tf, alpha: flash * 0.9 * (opts.alpha ?? 1), glow: rgba(C.fn, 1), glowR: 80 });
    if (i === 2) {
      const w = measure(L.l3, o), d = o.s * 0.2;
      const px = AR ? XL - w - o.s * 0.06 - d : XL + w + o.s * 0.06;
      const sx = (px + d / 2 - XL) * sc + XL, syc = (L.base[i] - d / 2 - (L.base[i] - o.s * 0.35)) * sc + (L.base[i] - o.s * 0.35);
      f.save(); f.globalAlpha *= a * (opts.alpha ?? 1);
      f.fillStyle = C.fn; f.shadowColor = rgba(C.fn, 0.9); f.shadowBlur = 30;
      f.beginPath(); f.roundRect(sx - (d * sc) / 2 + tf.dx, syc - (d * sc) / 2 + tf.dy, d * sc, d * sc, d * sc * 0.24); f.fill();
      f.restore();
      HOOK.dot = { x: px + d / 2, y: L.base[i] - d / 2, d };
    }
  }
}
function sHook(S, b) {
  const g = S.back.begin();
  let pulse = 0;
  for (let i = 0; i < 3; i++) pulse += decay(sec(b - 4 - i), 3) * (b >= 4 + i ? 1 : 0);
  bgInk(g, 0.35 + 0.9 * pulse, AR ? W * 0.62 : W * 0.38, 600);
  dust(S, b, 0.8);
  const f = S.front.begin();
  drawHookText(f, b, { alpha: 1 - E(b, 7.05, 7.25, ease.lin), jit: 30 * E(b, 6.8, 7.25, ease.inC) });
  return { bloom: 0.6, threshold: 0.6, vig: 0.45, zoom: 1 + 0.045 * E(b, 4, 7.25, ease.glide), zcx: AR ? 0.62 : 0.38, zcy: 0.45, leak: 0.12 * pulse };
}

/* =========================================================================
   S3 · "We do." — particles re-form, the period becomes the mark (beats 7.25–13)
   ========================================================================= */
const WEDO = {};
function weDoLayout() {
  if (WEDO.o) return WEDO;
  const o = { ...TD, s: AR ? 290 : 300, c: C.fn, a: 'left', ls: AR ? 0 : -8 };
  const w = measure(T.weDo, o), d = o.s * 0.2, gap = o.s * 0.06;
  const total = w + gap + d, x0 = W / 2 - total / 2, base = 640;
  Object.assign(WEDO, { o, w, d, gap, base, textX: AR ? x0 + d + gap + w : x0, dotX: AR ? x0 : x0 + w + gap, a: AR ? 'right' : 'left' });
  return WEDO;
}
function drawWeDo(f, alpha, dx = 0, dotAlpha = alpha) {
  const L = weDoLayout();
  drawText(f, T.weDo, L.textX, L.base, { ...L.o, a: L.a }, { alpha, dx, glow: rgba(C.fn, 0.6), glowR: 50 });
  if (dotAlpha > 0) {
    f.save(); f.globalAlpha *= dotAlpha; f.fillStyle = C.fn;
    f.beginPath(); f.roundRect(L.dotX, L.base - L.d, L.d, L.d, L.d * 0.24); f.fill(); f.restore();
  }
}
let MORPH = null;
function morph() {
  if (MORPH) return MORPH;
  const A = samplePoints(g => { drawHookText(g, 99, { all: true }); }, 5, 26000, 11);
  const Bp = samplePoints(g => drawWeDo(g, 1), 4, 26000, 12);
  MORPH = new Morph(26000);
  MORPH.set(A, Bp);
  MORPH.u.uDir.value = DX;
  return MORPH;
}
const LOGO = { cx: W / 2, cy: 520, s: 340 };
function lockupLayout() {
  if (LOGO.lock) return LOGO.lock;
  const s = 236, wo = { f: F.display, w: 600, s: 150, ls: -4, rtl: false, c: C.cream }, gap = 54;
  const ww = measure('JoFunction', wo), total = s + gap + ww, x0 = W / 2 - total / 2;
  LOGO.lock = AR
    ? { cx: x0 + ww + gap + s / 2, cy: 500, s, wo, textEdge: x0 + ww, ww, a: 'right' }
    : { cx: x0 + s / 2, cy: 500, s, wo, textEdge: x0 + s + gap, ww, a: 'left' };
  return LOGO.lock;
}
function sWeDo(S, b, lt) {
  const g = S.back.begin();
  const hit = b >= 11 ? decay(sec(b - 11), 2.2) : 0;
  bgInk(g, 0.55 + 0.8 * E(b, 7.5, 8.3) + 1.6 * hit, W / 2, 520);
  dust(S, b, 1);
  const M = morph();
  const mp = prog(b, 7.25, 8.4);
  S.stage.add(M.obj); M.obj.visible = mp < 1;
  M.u.uT.value = mp; M.u.uTime.value = sec(b); M.u.uAlpha.value = 1 - E(b, 8.15, 8.45, ease.lin);
  const f = S.front.begin();
  const L = weDoLayout();
  const textIn = E(b, 8.1, 8.45, ease.lin), textOut = E(b, 9.0, 9.6, ease.ioC);
  // the period travels to centre and becomes the brand square
  const dp = E(b, 9.0, 9.9, ease.snap);
  const dsz = lerp(L.d, LOGO.s, b > 9.25 ? spring(sec(b - 9.25), 1.6, 0.5) : 0);
  if (b < 11.25) {
    if (textIn > 0) drawWeDo(f, textIn * (1 - textOut), -DX * 90 * textOut, b < 9 ? textIn : 0);
    if (b >= 9) {
      const dcx = lerp(L.dotX + L.d / 2, LOGO.cx, dp), dcy = lerp(L.base - L.d / 2, LOGO.cy, dp);
      const size = b < 9.25 ? L.d : dsz;
      const a = E(b, 9.75, 10.75, ease.ioC), bb = E(b, 10.55, 10.95, ease.ioC);
      mark(f, dcx, dcy, size, { box: 1, a, b: bb, spark: true, boxGlow: 40 + 120 * hit });
      LOGO.live = { cx: dcx, cy: dcy, s: size };
    }
  } else {
    const Lk = lockupLayout(), q = E(b, 11.25, 12.1, ease.snap);
    const cx = lerp(LOGO.cx, Lk.cx, q), cy = lerp(LOGO.cy, Lk.cy, q), s = lerp(LOGO.s, Lk.s, q);
    mark(f, cx, cy, s, { boxGlow: 40 + 120 * hit });
    LOGO.live = { cx, cy, s };
    const wp = E(b, 11.6, 12.4, ease.expoOut);
    if (wp > 0) {
      const clip = AR ? [Lk.textEdge - Lk.ww * wp - 20, 0, Lk.ww * wp + 40, H] : [Lk.textEdge - 20, 0, Lk.ww * wp + 40, H];
      drawText(f, 'JoFunction', Lk.textEdge, Lk.cy + 52, { ...Lk.wo, a: Lk.a }, { clip, dx: -DX * 60 * (1 - wp) });
      reveal(f, T.tagline, Lk.textEdge + DX * 4, Lk.cy + 140, { ...TS, s: 38, c: C.muted, a: Lk.a }, E(b, 12.0, 12.6));
      reveal(f, T.studio, Lk.textEdge + DX * 4, Lk.cy - 118, { ...MONO, s: 18, ls: AR ? 0 : 5, c: C.fn, a: Lk.a }, E(b, 12.1, 12.6));
    }
  }
  // impact: shockwave + anamorphic streak
  if (b >= 11 && b < 12.5) {
    const q = prog(b, 11, 12.2), cx = LOGO.live ? LOGO.live.cx : W / 2, cy = LOGO.live ? LOGO.live.cy : LOGO.cy;
    f.save();
    f.globalAlpha = (1 - q) * 0.9; f.strokeStyle = C.fn400; f.lineWidth = 3 + 10 * (1 - q);
    f.beginPath(); f.roundRect(cx - 170 - 700 * ease.outC(q), cy - 170 - 700 * ease.outC(q), 340 + 1400 * ease.outC(q), 340 + 1400 * ease.outC(q), 80 + 300 * q); f.stroke();
    const sk = decay(sec(b - 11), 3.2);
    const gr = f.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, 'rgba(255,92,0,0)'); gr.addColorStop(0.5, `rgba(255,236,220,${0.95 * sk})`); gr.addColorStop(1, 'rgba(255,92,0,0)');
    f.globalAlpha = 1; f.fillStyle = gr; f.fillRect(0, cy - 3, W, 6);
    f.fillStyle = `rgba(255,120,40,${0.35 * sk})`; f.fillRect(0, cy - 26, W, 52);
    f.restore();
  }
  return { bloom: 0.75 + 0.9 * hit, threshold: 0.5, vig: 0.45, leak: 0.1 + 0.35 * hit, zoom: 1 + 0.03 * E(b, 8.2, 11, ease.glide) * (1 - E(b, 11, 11.4)) };
}

/* =========================================================================
   S4 · Numbers — 12 services · 11 own products · 5 platforms (beats 13–17)
   ========================================================================= */
function rollDigits(g, str, x, y, o, p) {
  const ds = [...str], ws = ds.map(d => measure(d, o)), tot = ws.reduce((a, v) => a + v, 0);
  let cx = o.a === 'center' ? x - tot / 2 : x;
  const lh = o.s * 0.92;
  ds.forEach((d, i) => {
    const target = +d, cyc = ds.length - 1 - i + 1;
    const v = (target + 10 * cyc) * p;
    g.save(); g.beginPath(); g.rect(cx - 10, y - o.s * 0.8, ws[i] + 20, o.s * 0.92); g.clip();
    const n = Math.floor(v), fr = v - n;
    for (const m of [n, n + 1]) text(g, String(m % 10), cx, y + (m - v) * lh, { ...o, a: 'left', rtl: false });
    g.restore();
    cx += ws[i];
  });
}
function sStats(S, b) {
  S.bg.set(C.fn);
  const g = S.back.begin();
  g.fillStyle = C.fn; g.fillRect(0, 0, W, H);
  const sh = g.createRadialGradient(W / 2, -200, 0, W / 2, -200, 1500);
  sh.addColorStop(0, 'rgba(255,170,100,.35)'); sh.addColorStop(1, 'rgba(196,61,0,.25)');
  g.fillStyle = sh; g.fillRect(0, 0, W, H);
  const f = S.front.begin();
  kicker(f, T.statsKicker, XL, 196, E(b, 13.1, 13.6), C.ink);
  const cols = AR ? [1500, 960, 420] : [420, 960, 1500];
  const no = { f: F.display, w: 700, s: 300, ls: -10, c: C.ink, a: 'center' };
  T.stats.forEach((st, i) => {
    const t0 = 13.25 + i * 0.5, p = E(b, t0, t0 + 0.8, ease.expoOut);
    if (b < t0) return;
    const drop = (1 - E(b, t0, t0 + 0.35, ease.expoOut)) * -40;
    rollDigits(f, st.n, cols[i], 590 + drop, no, p);
    reveal(f, st.l, cols[i], 676, { ...(AR ? { f: F.ar, w: 600, s: 46 } : { f: F.display, w: 500, s: 40 }), c: C.ink, a: 'center' }, E(b, t0 + 0.15, t0 + 0.6));
    if (i > 0) {
      const lx = (cols[i] + cols[i - 1]) / 2, lp = E(b, t0, t0 + 0.5);
      f.fillStyle = rgba(C.ink, 0.25); f.fillRect(lx - 1, 520 - 170 * lp, 2, 340 * lp);
    }
  });
  const ho = { ...TD, s: AR ? 84 : 78, c: C.ink, a: AL, ls: AR ? 0 : -2 };
  T.statsHead.forEach((l, i) => reveal(f, l, XL, 860 + i * (ho.s * 1.12), ho, E(b, 15.1 + i * 0.2, 15.8 + i * 0.2)));
  // underline accent
  const up = E(b, 15.6, 16.3);
  f.fillStyle = C.ink; if (AR) f.fillRect(XL - 420 * up, 985, 420 * up, 5); else f.fillRect(XL, 985, 420 * up, 5);
  return { bloom: 0.25, threshold: 0.92, vig: 0.25, zoom: 1.0 + 0.025 * E(b, 13, 17, ease.glide) };
}

/* =========================================================================
   S5 · Twelve services, one per beat (beats 17–29) — four environments
   ========================================================================= */
const THEMES = [
  { bg: C.ink, fg: C.cream, sub: rgba(C.cream, 0.72), tile: C.surface, tileLine: C.line, icon: C.fn, glow: rgba(C.fn, 0.8), track: C.line },
  { bg: C.ink, fg: C.cream, sub: rgba(C.cream, 0.72), tile: '#120D0A', tileLine: '#3A2416', icon: C.fn400, glow: rgba(C.fn, 0.9), track: C.line },
  { bg: C.paper, fg: C.ink, sub: rgba(C.ink, 0.7), tile: C.sand, tileLine: C.sandLine, icon: C.ink, glow: null, track: C.sandLine },
  { bg: '#0C0707', fg: C.cream, sub: rgba(C.cream, 0.75), tile: '#1A0B08', tileLine: '#4A1A10', icon: '#FF4A2B', glow: rgba('#FF3B1F', 0.9), track: '#3A1A14' }
];
// environment painters
function envGrid(g, b, th) {
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  const vx = W / 2, vy = 330, t = sec(b);
  g.save(); g.lineWidth = 1.2;
  for (let i = -24; i <= 24; i++) {
    const x = vx + i * 160;
    g.strokeStyle = rgba(C.cream, 0.05 + 0.04 * (1 - Math.abs(i) / 24));
    g.beginPath(); g.moveTo(vx + i * 6, vy); g.lineTo(x * 3 - vx * 2, H + 200); g.stroke();
  }
  for (let k = 0; k < 18; k++) {
    const z = ((k + (t * 1.6) % 1) / 18), y = vy + Math.pow(z, 2.2) * (H - vy + 300);
    g.strokeStyle = rgba(C.cream, 0.02 + 0.09 * z);
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  // soft scanning glow travelling across the floor
  const sx = ((t * 520) % (W + 900)) - 450;
  g.translate(sx, H + 40); g.scale(1, 2.6);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 300);
  gr.addColorStop(0, 'rgba(255,92,0,.2)'); gr.addColorStop(0.5, 'rgba(255,92,0,.07)'); gr.addColorStop(1, 'rgba(255,92,0,0)');
  g.fillStyle = gr; g.fillRect(-300, -300, 600, 300);
  g.restore();
  const hz = g.createLinearGradient(0, vy - 200, 0, vy + 220);
  hz.addColorStop(0, rgba(th.bg, 1)); hz.addColorStop(0.5, rgba(th.bg, 0)); hz.addColorStop(1, rgba(th.bg, 0));
  g.fillStyle = hz; g.fillRect(0, 0, W, vy + 220);
}
const NET = (() => {
  const R = rng(42), n = 120, P = [];
  for (let i = 0; i < n; i++) P.push(new THREE.Vector3((R() - 0.5) * 2600, (R() - 0.5) * 1500, -900 - R() * 2400));
  const E2 = [];
  for (let i = 0; i < n; i++) {
    const d = P.map((q, j) => [j, q.distanceTo(P[i])]).filter(x => x[0] !== i).sort((a, c) => a[1] - c[1]).slice(0, 3);
    d.forEach(([j]) => { if (i < j) E2.push([i, j]); });
  }
  const pos = new Float32Array(n * 3); P.forEach((q, i) => q.toArray(pos, i * 3));
  const lpos = new Float32Array(E2.length * 6); E2.forEach(([i, j], k) => { P[i].toArray(lpos, k * 6); P[j].toArray(lpos, k * 6 + 3); });
  const grp = new THREE.Group();
  const nodes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)),
    new THREE.PointsMaterial({ color: '#FF7A2B', size: 9, sizeAttenuation: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  const lines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(lpos, 3)),
    new THREE.LineBasicMaterial({ color: '#7A3A18', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  const pp = new Float32Array(48 * 3);
  const pulses = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pp, 3)),
    new THREE.PointsMaterial({ color: '#FFD2B0', size: 16, sizeAttenuation: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  grp.add(lines, nodes, pulses);
  grp.position.z = 0;
  return { grp, P, E2, pulses, pp };
})();
function envNet(S, g, b, th) {
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, 1200);
  rg.addColorStop(0, 'rgba(255,92,0,.10)'); rg.addColorStop(1, 'rgba(255,92,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  S.stage.add(NET.grp); NET.grp.visible = true;
  const t = sec(b);
  NET.grp.rotation.y = t * 0.12; NET.grp.rotation.x = Math.sin(t * 0.3) * 0.08;
  NET.E2.slice(0, 48).forEach(([i, j], k) => {
    const ph = (t * 0.9 + hash(k) * 3) % 1;
    const p = NET.P[i].clone().lerp(NET.P[j], ph);
    p.toArray(NET.pp, k * 3);
  });
  NET.pulses.geometry.attributes.position.needsUpdate = true;
}
function envPaper(g, b, th) {
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  const t = sec(b);
  g.save();
  g.fillStyle = rgba(C.sandLine, 0.6);
  for (let y = 60; y < H; y += 60) for (let x = 60 + ((y / 60) % 2) * 30; x < W; x += 60) g.fillRect(x, y, 2, 2);
  g.strokeStyle = rgba(C.ink, 0.08); g.lineWidth = 2;
  const ox = AR ? 420 : W - 420;
  g.beginPath(); g.arc(ox + Math.sin(t * 0.5) * 30, 540, 470, 0, TAU); g.stroke();
  g.beginPath(); g.roundRect(ox - 330 + Math.cos(t * 0.4) * 24, 210, 660, 660, 160); g.stroke();
  g.beginPath(); g.moveTo(ox - 600, 1080); g.lineTo(ox + 600, 0); g.stroke();
  g.fillStyle = C.fn;
  g.beginPath(); g.arc(AR ? 1900 : 20, 1060, 180 + Math.sin(t) * 6, 0, TAU); g.fill();
  g.restore();
}
function envBreach(g, b, th) {
  g.fillStyle = th.bg; g.fillRect(0, 0, W, H);
  const t = sec(b), R = rng(Math.floor(t * 20));
  g.save();
  g.font = `500 18px ${F.mono}`;
  for (let c = 0; c < 40; c++) {
    const x = c * 48 + 12, sp = 80 + hash(c) * 220, off = (t * sp + hash(c + 9) * 900) % (H + 400) - 200;
    for (let r = 0; r < 14; r++) {
      const y = off - r * 26; if (y < -20 || y > H + 20) continue;
      g.fillStyle = r === 0 ? 'rgba(255,140,110,.6)' : `rgba(255,74,43,${0.18 * (1 - r / 14)})`;
      g.fillText(((hash(c * 31 + r + Math.floor(t * 12)) * 255) | 0).toString(16).toUpperCase().padStart(2, '0'), x, y);
    }
  }
  for (let y = 0; y < H; y += 4) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, W, 1); }
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,74,43,${0.06 + R() * 0.1})`; g.fillRect(0, R() * H, W, 2 + R() * 30); }
  g.restore();
}
const ENTRIES = ['mask', 'flip', 'slam', 'slats', 'decode', 'whip', 'steps', 'wipe', 'stretch', 'pop', 'zoom', 'glitch'];
function serviceName(f, i, s, x, y, o, lt, th) {
  const kind = ENTRIES[i], u = clamp(lt / 0.42);
  const e = ease.expoOut(u);
  const sp = sprite(s, o), pos = spriteXY(sp, x, y, o.a);
  const cx = pos.cx, cy = y - o.s * 0.35;
  switch (kind) {
    case 'mask': reveal(f, s, x, y, o, e); break;
    case 'flip': drawText(f, s, x, y, o, { sy: Math.max(0.02, Math.abs(Math.cos((1 - e) * Math.PI / 2))), skx: (1 - e) * 0.4 * DX, oy: cy, alpha: clamp(u * 3) }); break;
    case 'slam': drawText(f, s, x, y, o, { s: lerp(1.45, 1, e), alpha: clamp(u * 4), ox: cx, oy: cy }); break;
    case 'slats': {
      const n = 6, hh = (o.s * 1.3) / n, top = y - o.s * 1.0;
      for (let k = 0; k < n; k++) {
        const q = ease.expoOut(clamp((lt - k * 0.025) / 0.36));
        drawText(f, s, x, y, o, { clip: [0, top + k * hh, W, hh + 1], dx: (k % 2 ? 1 : -1) * 260 * (1 - q), alpha: q });
      }
      break;
    }
    case 'decode': {
      if (!AR) {
        const glyphs = '01<>/#*+=JOFUNCTION';
        const n = s.length, k = Math.floor(n * clamp(u * 1.25));
        const out = [...s].map((ch, j) => (j < k || ch === ' ' ? ch : glyphs[Math.floor(hash(j * 7 + Math.floor(lt * 40)) * glyphs.length)])).join('');
        text(f, out, x, y, { ...o });
      } else { for (let k = 0; k < 4; k++) drawText(f, s, x, y, o, { dx: (1 - e) * (k - 1.5) * 40, alpha: 0.25 + 0.75 * e }); }
      break;
    }
    case 'whip': drawText(f, s, x, y, o, { dx: DX * 420 * (1 - e), sx: lerp(1.5, 1, e), sy: 1, ox: x, oy: cy, alpha: clamp(u * 3) }); break;
    case 'steps': { const st = Math.floor(u * 4) / 4; drawText(f, s, x, y, o, { dy: (1 - ease.outC(st)) * 160, alpha: st > 0 ? 1 : 0.3 }); break; }
    case 'wipe': {
      const w = sp.w, left = pos.x + sp.pad;
      const bar = E(lt, 0, 0.32, ease.ioC), rev = E(lt, 0.08, 0.4, ease.ioC);
      const edge = AR ? left + w - w * rev : left + w * rev;
      drawText(f, s, x, y, o, { clip: AR ? [edge, 0, W, H] : [0, 0, edge, H] });
      if (rev < 1) { f.fillStyle = C.fn; const bx = AR ? left + w - (w + 60) * bar : left - 60 + (w + 60) * bar; f.fillRect(bx - 22, y - o.s * 0.95, 44, o.s * 1.2); }
      break;
    }
    case 'stretch': drawText(f, s, x, y, o, { sx: lerp(0.15, 1, spring(lt, 2.4, 0.38)), sy: lerp(1.6, 1, e), ox: x, oy: cy, alpha: clamp(u * 4) }); break;
    case 'pop': drawText(f, s, x, y, o, { s: Math.max(0.01, spring(lt, 2.2, 0.45)), ox: cx, oy: cy }); break;
    case 'zoom': drawText(f, s, x, y, o, { s: lerp(3.2, 1, e), alpha: clamp(u * 2.5), ox: cx, oy: cy }); break;
    case 'glitch': {
      const n = 9, top = y - o.s * 1.0, hh = (o.s * 1.3) / n, settle = 1 - E(lt, 0.05, 0.45, ease.outC);
      for (let k = 0; k < n; k++) {
        const off = (hash(k * 13 + Math.floor(lt * 30)) - 0.5) * 220 * settle;
        drawText(f, s, x, y, { ...o, c: '#FF2A2A' }, { clip: [0, top + k * hh, W, hh + 1], dx: off + 8 * settle, alpha: 0.7 * settle, comp: 'lighter' });
        drawText(f, s, x, y, { ...o, c: '#2AD4FF' }, { clip: [0, top + k * hh, W, hh + 1], dx: off - 8 * settle, alpha: 0.5 * settle, comp: 'lighter' });
        drawText(f, s, x, y, o, { clip: [0, top + k * hh, W, hh + 1], dx: off });
      }
      break;
    }
  }
}
const GROUP_RANGE = [[0, 3], [4, 6], [7, 10], [11, 11]];
function sServices(S, b, gi) {
  const th = THEMES[gi];
  S.bg.set(th.bg);
  const g = S.back.begin();
  if (gi === 0) envGrid(g, b, th);
  else if (gi === 1) envNet(S, g, b, th);
  else if (gi === 2) envPaper(g, b, th);
  else envBreach(g, b, th);
  if (gi !== 2) dust(S, b, gi === 3 ? 0.4 : 0.6);
  const f = S.front.begin();
  const i = clamp(Math.floor(b - 17), GROUP_RANGE[gi][0], GROUP_RANGE[gi][1]);
  const sv = T.services[i];
  const lt = sec(b - 17 - i);
  // header: counter + group
  const head = `${String(i + 1).padStart(2, '0')} / 12`;
  const ho = { ...MONO, s: 20, ls: 3, c: gi === 2 ? C.fn700 : C.fn, rtl: false };
  text(f, head, XL, 236, { ...ho, a: AL });
  const gw = measure(head, ho) + 28;
  text(f, T.groups[sv.g], XL + DX * gw, 236, { ...MONO, s: 20, ls: AR ? 0 : 3, c: th.sub, a: AL });
  // service name
  const no = { ...TD, c: th.fg, a: AL, ls: AR ? 0 : -4 };
  no.s = Math.min(150, fit([sv.name], no, 980, 150));
  serviceName(f, i, sv.name, XL, 560, no, lt, th);
  // headline
  const lo = { ...TS, s: 44, c: th.sub, a: AL };
  wrap(sv.line, lo, 980).forEach((ln, k) => reveal(f, ln, XL, 652 + k * 58, lo, E(lt, 0.1 + k * 0.05, 0.45 + k * 0.05)));
  // icon tile
  const tx = AR ? 470 : W - 470, ty = 520, ts = 420;
  const pop = spring(lt, 2.6, 0.5);
  f.save();
  f.translate(tx, ty); f.scale(lerp(0.86, 1, pop), lerp(0.86, 1, pop)); f.translate(-tx, -ty);
  f.fillStyle = th.tile; f.strokeStyle = th.tileLine; f.lineWidth = 2;
  f.beginPath(); f.roundRect(tx - ts / 2, ty - ts / 2, ts, ts, ts * 0.24); f.fill(); f.stroke();
  icon(f, sv.icon, tx, ty, 250, E(lt, 0.02, 0.42, ease.ioC), { c: th.icon, glow: th.glow, lw: 1.5 });
  f.restore();
  // progress rail
  const RX = 160, RW = W - 320, n = 12, gap = 10, sw = (RW - gap * (n - 1)) / n;
  for (let k = 0; k < n; k++) {
    const x = AR ? RX + RW - (k + 1) * sw - k * gap : RX + k * (sw + gap);
    f.fillStyle = th.track; f.fillRect(x, 940, sw, 4);
    const fp = k < i ? 1 : k === i ? E(lt, 0, 0.6, ease.outC) : 0;
    if (fp > 0) { f.fillStyle = gi === 2 ? C.fn : C.fn; f.fillRect(AR ? x + sw * (1 - fp) : x, 940, sw * fp, 4); }
  }
  const bump = decay(lt, 9);
  return {
    bloom: gi === 2 ? 0.2 : 0.65, threshold: gi === 2 ? 0.95 : 0.6, vig: gi === 2 ? 0.18 : 0.4,
    zoom: 1.0 + 0.018 * bump + 0.01 * prog(b, 17, 29), ca: 0.002 + 0.01 * bump + (gi === 3 ? 0.006 : 0),
    leak: gi === 1 ? 0.12 : 0, sat: gi === 3 ? 1.1 : 1
  };
}

/* =========================================================================
   S6 · Eleven products on a 3D carousel (beats 29–33)
   ========================================================================= */
const CAROUSEL = { R: 1180, cw: 560, ch: 340 };
function card(p, i) {
  const k = 2, cv = document.createElement('canvas');
  cv.width = CAROUSEL.cw * k; cv.height = CAROUSEL.ch * k;
  const g = cv.getContext('2d');
  g.scale(k, k);
  const w = CAROUSEL.cw, h = CAROUSEL.ch;
  g.fillStyle = C.raised; g.strokeStyle = C.line; g.lineWidth = 2;
  g.beginPath(); g.roundRect(1, 1, w - 2, h - 2, 34); g.fill(); g.stroke();
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(255,92,0,.10)'); gr.addColorStop(1, 'rgba(255,92,0,0)');
  g.fillStyle = gr; g.beginPath(); g.roundRect(1, 1, w - 2, h - 2, 34); g.fill();
  const tx = AR ? w - 40 - 104 : 40;
  g.fillStyle = C.fn; g.beginPath(); g.roundRect(tx, 40, 104, 104, 25); g.fill();
  text(g, p.n[0].toUpperCase(), tx + 52, 40 + 76, { f: F.display, w: 700, s: 64, c: C.ink, a: 'center', rtl: false });
  text(g, `${String(i + 1).padStart(2, '0')} / 11`, AR ? 40 : w - 40, 66, { ...MONO, s: 16, ls: 2, c: C.muted, a: AR ? 'left' : 'right', rtl: false });
  const nx = AR ? w - 40 : 40;
  text(g, p.n, nx, 220, { f: F.display, w: 600, s: 46, c: C.cream, a: AR ? 'right' : 'left', ls: -1, rtl: false });
  const to = { ...TS, w: 400, s: 23, c: C.muted, a: AR ? 'right' : 'left' };
  wrap(p.t, to, w - 80).slice(0, 2).forEach((ln, j) => text(g, ln, nx, 266 + j * 32, to));
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 8;
  return tex;
}
function carousel() {
  if (CAROUSEL.grp) return CAROUSEL;
  const grp = new THREE.Group();
  CAROUSEL.cards = T.products.map((p, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(CAROUSEL.cw, CAROUSEL.ch), new THREE.MeshBasicMaterial({ map: card(p, i), transparent: true, side: THREE.FrontSide }));
    grp.add(m);
    return m;
  });
  CAROUSEL.grp = grp;
  return CAROUSEL;
}
function sProducts(S, b) {
  const g = S.back.begin();
  bgInk(g, 0.9, W / 2, 700);
  dust(S, b, 0.7);
  const CS = carousel(), n = 11, step = TAU / n;
  S.stage.add(CS.grp); CS.grp.visible = true;
  const e = E(b, 29, 33, ease.outQt);
  const endRot = -4 * step;
  const rot = endRot - DX * (1 - e) * TAU * 1.35;
  CS.cards.forEach((m, i) => {
    const th = i * step + rot;
    m.position.set(Math.sin(th) * CS.R, -150, -CS.R + Math.cos(th) * CS.R);
    m.rotation.set(0, th, 0);
    const lit = 0.3 + 0.9 * Math.pow((Math.cos(th) + 1) / 2, 2.2);
    m.material.color.setScalar(lit);
  });
  CS.grp.rotation.x = 0.06;
  S.cam.position.set(0, 140, S.D + 260 - 200 * E(b, 29, 33, ease.glide));
  S.cam.lookAt(0, -40, 0);
  const f = S.front.begin();
  kicker(f, T.productsKicker, XL, 150, E(b, 29.1, 29.6));
  const to = { ...TD, s: AR ? 92 : 96, c: C.cream, a: AL, ls: AR ? 0 : -3 };
  reveal(f, T.productsHead, XL, 262, to, E(b, 29.2, 29.9));
  const cnt = { f: F.display, w: 700, s: 96, c: C.fn, a: AL, rtl: false };
  const hw = measure(T.productsHead, to);
  reveal(f, '11', XL + DX * (hw + 30), 262, { ...cnt, a: AL }, E(b, 29.4, 30.0));
  const so = { ...TS, w: 400, s: 30, c: C.muted, a: AL };
  reveal(f, T.productsSub, XL, 322, so, E(b, 29.6, 30.2));
  return { bloom: 0.55, threshold: 0.6, vig: 0.5, ca: 0.003 + 0.006 * (1 - e), leak: 0.08 };
}

/* =========================================================================
   S7 · Five platforms, line icons drawing on (beats 33–37)
   ========================================================================= */
function sPlatforms(S, b) {
  const g = S.back.begin();
  bgInk(g, 0.6, W / 2, 620);
  dust(S, b, 0.7);
  const f = S.front.begin();
  kicker(f, T.platformsKicker, XL, 150, E(b, 33.1, 33.6));
  const to = { ...TD, s: AR ? 92 : 96, c: C.cream, a: AL, ls: AR ? 0 : -3 };
  reveal(f, T.platformsHead, XL, 262, to, E(b, 33.2, 33.9));
  reveal(f, T.platformsSub, XL, 322, { ...TS, w: 400, s: 30, c: C.muted, a: AL }, E(b, 33.4, 34.0));
  const n = 5, ts = 250, gap = 70, total = n * ts + (n - 1) * gap, x0 = W / 2 - total / 2 + ts / 2, ty = 590;
  // connecting line through the tiles (reading direction)
  const lp = E(b, 33.5, 35.6, ease.ioC);
  f.fillStyle = rgba(C.fn, 0.55);
  const lx0 = x0 - ts / 2, lw = total;
  if (AR) f.fillRect(lx0 + lw * (1 - lp), ty - 1, lw * lp, 2); else f.fillRect(lx0, ty - 1, lw * lp, 2);
  T.platforms.forEach((p, i) => {
    const k = AR ? n - 1 - i : i;
    const cx = x0 + k * (ts + gap), t0 = 33.6 + i * 0.4;
    const pop = spring(sec(b - t0), 2.2, 0.5) * (b > t0 ? 1 : 0);
    if (pop <= 0) return;
    f.save();
    f.translate(cx, ty); f.scale(lerp(0.6, 1, pop), lerp(0.6, 1, pop)); f.translate(-cx, -ty);
    f.globalAlpha = clamp(pop * 2);
    f.fillStyle = C.surface; f.strokeStyle = C.line; f.lineWidth = 2;
    f.beginPath(); f.roundRect(cx - ts / 2, ty - ts / 2, ts, ts, ts * 0.24); f.fill(); f.stroke();
    icon(f, p.icon, cx, ty, 140, E(b, t0 + 0.05, t0 + 0.75, ease.ioC), { c: C.fn, glow: rgba(C.fn, 0.9), lw: 1.4 });
    f.restore();
    const no = { ...(AR ? { f: F.ar, w: 600, s: 30 } : { f: F.display, w: 600, s: 30 }), c: C.cream, a: 'center' };
    reveal(f, p.name, cx, ty + ts / 2 + 62, { ...no, rtl: AR && p.name !== 'JoFunction AI' }, E(b, t0 + 0.2, t0 + 0.7));
    const tl = { ...TS, w: 400, s: 20, c: C.muted, a: 'center' };
    wrap(p.t, tl, ts + 30).slice(0, 2).forEach((ln, j) => reveal(f, ln, cx, ty + ts / 2 + 102 + j * 28, tl, E(b, t0 + 0.35, t0 + 0.85)));
  });
  return { bloom: 0.7, threshold: 0.55, vig: 0.45, leak: 0.06, zoom: 1 + 0.02 * E(b, 33, 37, ease.glide) };
}

/* =========================================================================
   S8 · Think. Design. Build. Launch. Keep alive. (beats 37–41)
   ========================================================================= */
// ECG trace: spikes at fixed positions, revealed by a sweeping head
function ecgY(x, amp = 1) {
  const P = 560, u = ((x % P) + P) % P;
  const k = (c, w, h) => h * Math.exp(-Math.pow((u - c) / w, 2));
  return amp * (k(250, 22, -16) + k(330, 6, 34) + k(345, 7, -170) + k(362, 7, 64) + k(440, 34, -26));
}
function drawEcg(f, b, y, x0, x1, head, opts = {}) {
  f.save();
  f.lineWidth = opts.lw || 4; f.lineJoin = 'round'; f.lineCap = 'round';
  f.strokeStyle = opts.c || C.fn; f.shadowColor = rgba(C.fn, 0.9); f.shadowBlur = 24;
  f.beginPath();
  for (let x = x0; x <= Math.min(x1, head); x += 4) {
    const yy = y + ecgY(AR ? W - x : x, opts.amp ?? 1);
    if (x === x0) f.moveTo(AR ? W - x : x, yy); else f.lineTo(AR ? W - x : x, yy);
  }
  f.stroke();
  const hx = AR ? W - head : head, hy = y + ecgY(AR ? W - head : head, opts.amp ?? 1);
  const gr = f.createRadialGradient(hx, hy, 0, hx, hy, 60);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,150,80,.7)'); gr.addColorStop(1, 'rgba(255,92,0,0)');
  f.shadowBlur = 0; f.fillStyle = gr; f.fillRect(hx - 60, hy - 60, 120, 120);
  f.restore();
}
function sProcess(S, b) {
  const g = S.back.begin();
  bgInk(g, 0.5 + 0.6 * E(b, 39.2, 39.6), W / 2, 520);
  dust(S, b, 0.7);
  const f = S.front.begin();
  kicker(f, T.processKicker, XL, 150, E(b, 37.1, 37.6));
  const words = T.process;
  const times = [37.15, 37.65, 38.15, 38.65, 39.2];
  let k = -1; times.forEach((t0, i) => { if (b >= t0) k = i; });
  const wo = { ...TD, s: AR ? 210 : 200, c: C.cream, a: 'center', ls: AR ? 0 : -6 };
  if (k >= 0) {
    const t0 = times[k], u = sec(b - t0);
    const last = k === 4;
    const o = last ? { ...wo, c: C.fn, s: AR ? 190 : 210 } : wo;
    const enter = ease.expoOut(clamp(u / 0.3));
    drawText(f, words[k], W / 2, 590, o, { dy: (1 - enter) * 90, alpha: clamp(u * 8), glow: last ? rgba(C.fn, 0.7) : null, glowR: 60 });
    if (k > 0 && u < 0.18) drawText(f, words[k - 1], W / 2, 590, wo, { dy: -ease.outC(u / 0.18) * 90, alpha: 1 - u / 0.18 });
  }
  // stage rail with five nodes
  const RX = 360, RW = W - 720, ry = 846;
  const rp = E(b, 37.0, 37.7, ease.ioC);
  f.fillStyle = rgba(C.cream, 0.18);
  f.fillRect(W / 2 - (RW / 2) * rp, ry, RW * rp, 2);
  const ecgOn = b >= 39.2;
  times.forEach((t0, i) => {
    const x = AR ? RX + RW - (RW / 4) * i : RX + (RW / 4) * i;
    const on = b >= t0, a = E(b, t0 - 0.05, t0 + 0.2);
    f.fillStyle = on ? C.fn : C.line;
    f.beginPath(); f.arc(x, ry + 1, on ? 9 : 6, 0, TAU); f.fill();
    if (on) { f.strokeStyle = rgba(C.fn, 0.4 * (1 - prog(b, t0, t0 + 0.8))); f.lineWidth = 2; f.beginPath(); f.arc(x, ry + 1, 9 + 40 * prog(b, t0, t0 + 0.8), 0, TAU); f.stroke(); }
    text(f, words[i].replace(/\.$/, ''), x, ry + 56, { ...(AR ? { f: F.ar, w: 500, s: 24 } : { ...MONO, s: 18, ls: 3 }), c: on ? C.cream : C.muted, a: 'center', alpha: 0.4 + 0.6 * a });
  });
  if (ecgOn) {
    const head = lerp(-40, W + 40, prog(b, 39.25, 41.5));
    drawEcg(f, b, ry - 150, 0, W, head, { amp: 0.75 * E(b, 39.2, 39.5) });
  }
  reveal(f, T.processSub, W / 2, 700, { ...TS, s: 40, c: C.muted, a: 'center' }, E(b, 39.6, 40.2));
  return { bloom: 0.7, threshold: 0.55, vig: 0.45, leak: 0.1 * E(b, 39.2, 40) };
}

/* =========================================================================
   S9 · "We keep them alive." — the pulse becomes the mark (beats 41–43.5)
   ========================================================================= */
const END = { cx: W / 2, cy: 300, s: 210 };
function sStatement(S, b) {
  const g = S.back.begin();
  bgInk(g, 0.7 + 0.3 * Math.max(0, Math.sin((b - 41) * Math.PI)), W / 2, 560);
  dust(S, b, 0.8);
  const f = S.front.begin();
  const fade = 1 - E(b, 42.9, 43.3, ease.lin);
  const l1 = { ...TD, w: 600, s: AR ? 78 : 74, c: C.cream, a: 'center', ls: AR ? 0 : -2 };
  const l2 = { ...TD, s: AR ? 140 : 132, c: C.fn, a: 'center', ls: AR ? 0 : -5 };
  reveal(f, T.statement[0], W / 2, 430, l1, E(b, 41.0, 41.6), { alpha: fade });
  reveal(f, T.statement[1], W / 2, 600, l2, E(b, 41.6, 42.2), { alpha: fade, glow: rgba(C.fn, 0.6), glowR: 50 });
  // the pulse: sweeps, then gathers into the mark's stroke
  const gather = E(b, 42.6, 43.5, ease.snap);
  const y = 790;
  if (gather <= 0) {
    drawEcg(f, b, y, 0, W, lerp(-40, W + 40, prog(b, 41, 42.6)), { amp: 0.8 });
  } else {
    const N = 180, s = END.s, k = s / 1024, ox = END.cx - s / 2, oy = END.cy - s / 2;
    f.save();
    f.lineWidth = lerp(4, MARK.sw * k, gather); f.lineCap = 'round'; f.lineJoin = 'miter';
    f.strokeStyle = mixc(C.fn, C.ink, E(b, 43.2, 43.5, ease.lin)); f.shadowColor = rgba(C.fn, 0.9); f.shadowBlur = 24 * (1 - gather);
    f.beginPath();
    for (let i = 0; i <= N; i++) {
      const q = i / N, ex = q * W, ey = y + ecgY(ex, 0.8);
      const [mx, my] = pointAt(MARK.a, q * MARK.la);
      const px = lerp(AR ? W - ex : ex, ox + mx * k, gather), py = lerp(ey, oy + my * k, gather);
      if (i) f.lineTo(px, py); else f.moveTo(px, py);
    }
    f.stroke();
    f.restore();
    if (b > 43.2) {
      const sq = E(b, 43.2, 43.5, ease.outC);
      mark(f, END.cx, END.cy, END.s * lerp(0.2, 1, sq), { box: 1, a: 0, b: 0, boxGlow: 60 });
      mark(f, END.cx, END.cy, END.s, { box: 0, a: 1, b: sq });
    }
  }
  return { bloom: 0.75, threshold: 0.55, vig: 0.45, leak: 0.12 };
}

/* =========================================================================
   S10 · End card — "Have something worth building? Let's build it." (beats 43.5–48)
   ========================================================================= */
function sEnd(S, b) {
  const g = S.back.begin();
  const hit = decay(sec(b - 43.5), 2.5);
  bgInk(g, 0.8 + 1.4 * hit, W / 2, 380);
  dust(S, b, 0.9);
  const f = S.front.begin();
  // lockup: mark + wordmark
  const wo = { f: F.display, w: 600, s: 78, ls: -2, c: C.cream, rtl: false };
  const ww = measure('JoFunction', wo), ms = lerp(END.s, 128, E(b, 43.75, 44.5, ease.snap));
  const total = 128 + 34 + ww, lx0 = W / 2 - total / 2;
  const q = E(b, 43.75, 44.5, ease.snap);
  const mcx = AR ? lerp(END.cx, lx0 + ww + 34 + 64, q) : lerp(END.cx, lx0 + 64, q), mcy = lerp(END.cy, 236, q);
  const pop = 1 + 0.14 * Math.sin(Math.min(1, sec(b - 43.5) / 0.32) * Math.PI) * decay(sec(b - 43.5), 2);
  mark(f, mcx, mcy, ms * pop, { boxGlow: 60 + 140 * hit });
  const wp = E(b, 44.1, 44.8);
  if (wp > 0) {
    const edge = AR ? lx0 + ww : lx0 + 128 + 34;
    drawText(f, 'JoFunction', edge, 236 + 28, { ...wo, a: AR ? 'right' : 'left' }, { clip: AR ? [edge - ww * wp - 10, 0, ww * wp + 20, H] : [edge - 10, 0, ww * wp + 20, H] });
  }
  const qo = { ...TD, w: 600, s: AR ? 72 : 68, c: C.cream, a: 'center', ls: AR ? 0 : -2 };
  reveal(f, T.endQ, W / 2, 470, qo, E(b, 44.4, 45.0));
  const ao = { ...TD, s: AR ? 150 : 146, c: C.fn, a: 'center', ls: AR ? 0 : -6 };
  reveal(f, T.endA, W / 2, 640, ao, E(b, 44.9, 45.5), { glow: rgba(C.fn, 0.6), glowR: 50 });
  // CTA button with a press at beat 46.5
  const bp = spring(sec(b - 45.4), 2.2, 0.45) * (b > 45.4 ? 1 : 0);
  if (bp > 0) {
    const bo = { ...(AR ? { f: F.ar, w: 600, s: 32 } : { f: F.display, w: 600, s: 30 }), c: C.ink, a: 'center' };
    const label = `${T.cta}  ${AR ? '←' : '→'}`, bw = measure(label, bo) + 96, bh = 78, bx = W / 2, by = 778;
    const press = 1 - 0.05 * bell(b, 46.4, 46.8);
    f.save();
    f.translate(bx, by); f.scale(lerp(0.7, 1, bp) * press, lerp(0.7, 1, bp) * press); f.translate(-bx, -by);
    f.globalAlpha = clamp(bp * 2);
    f.fillStyle = C.fn; f.shadowColor = rgba(C.fn, 0.6); f.shadowBlur = 40;
    f.beginPath(); f.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2); f.fill();
    f.shadowBlur = 0;
    const rq = prog(b, 46.5, 47.4);
    if (rq > 0 && rq < 1) { f.save(); f.beginPath(); f.roundRect(bx - bw / 2, by - bh / 2, bw, bh, bh / 2); f.clip(); f.fillStyle = `rgba(255,255,255,${0.35 * (1 - rq)})`; f.beginPath(); f.arc(bx + bw * 0.18 * DX, by, bw * rq, 0, TAU); f.fill(); f.restore(); }
    text(f, label, bx, by + 11, bo);
    f.restore();
    // cursor glides in and clicks
    const cp = E(b, 45.7, 46.45, ease.snap);
    if (cp > 0) {
      const cx = lerp(bx + DX * 520, bx + DX * bw * 0.18, cp) + DX * 30 * E(b, 46.9, 47.6), cy = lerp(by + 190, by + 12, cp) + 40 * E(b, 46.9, 47.6);
      const cs = 1 - 0.15 * bell(b, 46.4, 46.7);
      f.save(); f.translate(cx, cy); f.scale(cs, cs);
      f.beginPath(); f.moveTo(0, 0); f.lineTo(0, 38); f.lineTo(10, 29); f.lineTo(17, 45); f.lineTo(24, 42); f.lineTo(17, 26); f.lineTo(29, 26); f.closePath();
      f.fillStyle = C.paper; f.fill(); f.strokeStyle = C.ink; f.lineWidth = 2.5; f.lineJoin = 'round'; f.stroke();
      f.restore();
    }
  }
  reveal(f, T.url, W / 2, 878, { ...MONO, s: 26, ls: 4, c: C.cream, a: 'center', rtl: false }, E(b, 45.6, 46.2));
  const fo = { ...MONO, s: 15, ls: AR ? 0 : 3, c: C.muted, a: 'center' };
  reveal(f, T.address, W / 2, 990, fo, E(b, 46.0, 46.6));
  reveal(f, T.credit, W / 2, 1024, { ...fo, c: rgba(C.muted, 0.8) }, E(b, 46.3, 46.9));
  const ff = E(b, 47.55, 48, ease.inC);
  return { bloom: 0.75 + 0.8 * hit, threshold: 0.55, vig: 0.45, leak: 0.12 + 0.3 * hit, zoom: 1 + 0.02 * E(b, 44, 48, ease.glide), flash: ff, flashCol: C.ink };
}

/* =========================================================================
   Timeline
   ========================================================================= */
export const SCENES = [
  { id: 'greet', b0: 0, draw: sGreet, label: 'Intro' },
  { id: 'hook', b0: 3.5, draw: sHook, label: 'Hook' },
  { id: 'wedo', b0: 7.25, draw: sWeDo, label: 'Identity' },
  { id: 'stats', b0: 13, draw: sStats, label: 'Numbers', tr: { type: 1, pre: 0.55, post: 0.45, c: () => [LOGO.live ? LOGO.live.cx / W : 0.3, LOGO.live ? 1 - LOGO.live.cy / H : 0.5] } },
  { id: 'svc0', b0: 17, draw: (S, b) => sServices(S, b, 0), label: 'Services', tr: { type: 2, pre: 0.45, post: 0.35, edge: '#FAF8F6' } },
  { id: 'svc1', b0: 21, draw: (S, b) => sServices(S, b, 1), label: 'Services', tr: { type: 3, pre: 0.3, post: 0.3, k: AR ? 1 : 0 } },
  { id: 'svc2', b0: 24, draw: (S, b) => sServices(S, b, 2), label: 'Services', tr: { type: 5, pre: 0.3, post: 0.3, k: AR ? 1 : 0, edge: '#FF7A2B' } },
  { id: 'svc3', b0: 28, draw: (S, b) => sServices(S, b, 3), label: 'Services', tr: { type: 6, pre: 0.2, post: 0.2 } },
  { id: 'products', b0: 29, draw: sProducts, label: 'Products', tr: { type: 4, pre: 0.3, post: 0.35, k: AR ? 1 : 0 } },
  { id: 'platforms', b0: 33, draw: sPlatforms, label: 'Platforms', tr: { type: 3, pre: 0.4, post: 0.4, k: AR ? 1 : 0 } },
  { id: 'process', b0: 37, draw: sProcess, label: 'Process', tr: { type: 5, pre: 0.3, post: 0.4, k: AR ? 1 : 0, edge: '#FF5C00' } },
  { id: 'statement', b0: 41, draw: sStatement, label: 'Promise' },
  { id: 'end', b0: 43.5, draw: sEnd, label: 'End card' }
];

// impacts (beats): camera shake, lens punch, flashes — mirrored by the score
export const HITS = [
  { b: 4, shake: 14, ca: 0.012, zoom: 0.02 }, { b: 5, shake: 14, ca: 0.012, zoom: 0.02 }, { b: 6, shake: 20, ca: 0.018, zoom: 0.03 },
  { b: 8.15, shake: 8, ca: 0.008, flash: 0.12, flashCol: '#FF5C00' },
  { b: 11, shake: 26, ca: 0.02, zoom: 0.04, flash: 0.55, flashCol: '#FFE2CC' },
  { b: 13, shake: 10, ca: 0.01, flash: 0.15, flashCol: '#FFFFFF' },
  { b: 17, shake: 8, ca: 0.008 }, { b: 21, shake: 10, ca: 0.012 }, { b: 24, shake: 8, ca: 0.008 }, { b: 28, shake: 18, ca: 0.03 },
  ...[18, 19, 20, 22, 23, 25, 26, 27].map(b => ({ b, shake: 4, ca: 0.005 })),
  { b: 29, shake: 8, ca: 0.01 }, { b: 33, shake: 6, ca: 0.006 }, { b: 37, shake: 6, ca: 0.006 },
  { b: 39.2, shake: 12, ca: 0.012, flash: 0.1, flashCol: '#FF5C00' },
  { b: 43.5, shake: 30, ca: 0.022, zoom: 0.05, flash: 0.6, flashCol: '#FFE2CC' }
];
