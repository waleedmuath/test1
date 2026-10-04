'use strict';
/* ==========================================================================
   JoFunction Motion Reel — core engine
   Everything is a pure function of time t (seconds), so the same code drives
   the live player and the frame-accurate offline render.
   ========================================================================== */

const W = 1920, H = 1080, FPS = 60, DUR = 30;
// Language cut: ?lang=en renders the English version; Arabic is the default.
const LANG = (() => { try { return new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ar'; } catch (e) { return 'ar'; } })();
const EN = LANG === 'en';
const BPM = 128, B = 60 / BPM, BAR = 4 * B; // 30s = 64 beats = 16 bars
const TAU = Math.PI * 2;

const C = {
  ink: '#0B0B0C', ink2: '#151517', ink3: '#232326', paper: '#FAF8F6', white: '#FFFFFF',
  sand: '#EAE6E0', line: '#DDD8D2', mute: '#8B857D', gray: '#6E6961', body: '#514D48',
  orange: '#FF5C00', deep: '#C43D00', amber: '#FF8A3D'
};
const F = {
  grot: '"Space Grotesk", sans-serif',
  ar: '"IBM Plex Sans Arabic", sans-serif',
  mono: '"IBM Plex Mono", monospace',
  plex: '"IBM Plex Sans", sans-serif'
};

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));

function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t;
  const sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 10; i++) {
      const e = sx(t) - x, d = dx(t);
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t = clamp(t - e / d);
    }
    return sy(t);
  };
}

const E = {
  lin: x => x,
  inQ: x => x * x,
  outQ: x => 1 - (1 - x) * (1 - x),
  inC: x => x * x * x,
  outC: x => 1 - Math.pow(1 - x, 3),
  ioC: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQn: x => 1 - Math.pow(1 - x, 5),
  ioQn: x => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  inE: x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outE: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  ioE: x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outB: x => { const s = 1.70158; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },
  outB2: x => { const s = 2.4; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },
  inB: x => { const s = 1.70158; return (s + 1) * x * x * x - s * x * x; },
  outBounce: x => {
    const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
};
E.snap = bezier(0.7, 0, 0.15, 1);   // anticipation-heavy, decisive landing
E.swift = bezier(0.2, 0.9, 0.1, 1); // fast-out
E.pull = bezier(0.45, 0, 0.1, 1);

const ez = (t, a, b, fn = E.outE) => fn(prog(t, a, b));
// damped spring 0 -> 1 (x in seconds)
const spring = (x, f = 2.2, d = 6.5) => (x <= 0 ? 0 : 1 - Math.exp(-d * x) * Math.cos(TAU * f * x));
// decaying oscillation starting at 0 (x in seconds)
const wobble = (x, f = 3, d = 7) => (x <= 0 ? 0 : Math.exp(-d * x) * Math.sin(TAU * f * x));
// decaying impulse
const pulse = (x, k = 8) => (x < 0 ? 0 : Math.exp(-x * k));

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }

/* ---------- colour ---------- */
const _rgb = {};
function rgb(h) {
  if (_rgb[h]) return _rgb[h];
  const n = parseInt(h.slice(1), 16);
  return (_rgb[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
function mix(a, b, t) {
  const A = rgb(a), Bc = rgb(b);
  t = clamp(t);
  return `rgb(${Math.round(lerp(A[0], Bc[0], t))},${Math.round(lerp(A[1], Bc[1], t))},${Math.round(lerp(A[2], Bc[2], t))})`;
}
function rgba(h, a) { const A = rgb(h); return `rgba(${A[0]},${A[1]},${A[2]},${clamp(a)})`; }

/* ---------- drawing helpers ---------- */
function fillBG(c, col) { c.fillStyle = col; c.fillRect(-W * 2, -H * 2, W * 5, H * 5); }
function rr(c, x, y, w, h, r) {
  c.beginPath();
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  c.roundRect(x, y, w, h, r);
}
function fillRR(c, x, y, w, h, r, col) { if (w <= 0 || h <= 0) return; rr(c, x, y, w, h, r); c.fillStyle = col; c.fill(); }
function strokeRR(c, x, y, w, h, r, col, lw) { if (w <= 0 || h <= 0) return; rr(c, x, y, w, h, r); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); }
function fillCircle(c, x, y, r, col) { if (r <= 0) return; circle(c, x, y, r); c.fillStyle = col; c.fill(); }
function rrPerimeter(w, h, r) { r = Math.min(r, w / 2, h / 2); return 2 * (w + h) - 8 * r + TAU * r; }
function withAlpha(c, a, fn) { if (a <= 0) return; c.save(); c.globalAlpha *= clamp(a); fn(); c.restore(); }
function scaleAbout(c, x, y, sx, sy = sx) { c.translate(x, y); c.scale(sx, sy); c.translate(-x, -y); }
function poly(c, pts, close = true) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  if (close) c.closePath();
}

/* ---------- type ---------- */
function setFont(c, o) {
  c.font = `${o.w || 500} ${o.s || 32}px ${o.f || F.grot}`;
  c.letterSpacing = (o.ls || 0) + 'px';
  c.direction = o.rtl ? 'rtl' : 'ltr';
}
function text(c, s, x, y, o = {}) {
  c.save();
  setFont(c, o);
  c.fillStyle = o.c || C.ink;
  c.textAlign = o.a || 'left';
  c.textBaseline = o.bl || 'alphabetic';
  if (o.alpha != null) c.globalAlpha *= clamp(o.alpha);
  c.fillText(s, x, y);
  c.restore();
}
const _mcache = new Map();
function measure(c, s, o) {
  const key = `${o.w || 500}|${o.s || 32}|${o.f || F.grot}|${o.ls || 0}|${o.rtl ? 1 : 0}|${s}`;
  let v = _mcache.get(key);
  if (v === undefined) {
    c.save(); setFont(c, o); v = c.measureText(s).width; c.restore();
    _mcache.set(key, v);
  }
  return v;
}
function fitSize(c, lines, o, maxW, maxS) {
  let w = 0;
  for (const l of lines) w = Math.max(w, measure(c, l, { ...o, s: 100 }));
  return Math.min(maxS, (maxW / w) * 100);
}
// Line slides up from behind a mask (classic kinetic-type reveal).
function revealText(c, s, x, y, o, p) {
  if (p <= 0) return;
  const w = measure(c, s, o), sz = o.s;
  const x0 = o.a === 'right' ? x - w : o.a === 'center' ? x - w / 2 : x;
  c.save();
  c.beginPath();
  c.rect(x0 - sz * 0.4, y - sz * 1.2, w + sz * 0.8, sz * 1.75);
  c.clip();
  c.translate(0, (1 - p) * sz * 1.8);
  text(c, s, x, y, o);
  c.restore();
}
// Right-to-left wipe with a leading orange cursor (for Arabic wordmarks).
function wipeRTL(c, xr, y, w, sz, p, drawFn, cursorCol = C.orange) {
  if (p <= 0) return;
  c.save();
  c.beginPath();
  c.rect(xr - w * p - 4, y - sz * 1.3, w * p + sz * 0.5 + 4, sz * 1.9);
  c.clip();
  drawFn();
  c.restore();
  const ca = 1 - prog(p, 0.85, 1);
  if (ca > 0 && p < 1) fillRR(c, xr - w * p - 10, y - sz * 0.95, 10, sz * 1.25, 5, rgba(cursorCol === C.orange ? C.orange : cursorCol, ca));
}
// Left-to-right wipe with a trailing orange cursor (for Latin wordmarks).
function wipeLTR(c, xl, y, w, sz, p, drawFn, cursorCol = C.orange) {
  if (p <= 0) return;
  c.save();
  c.beginPath();
  c.rect(xl - sz * 0.5, y - sz * 1.3, w * p + sz * 0.5 + 4, sz * 1.9);
  c.clip();
  drawFn();
  c.restore();
  const ca = 1 - prog(p, 0.85, 1);
  if (ca > 0 && p < 1) fillRR(c, xl + w * p, y - sz * 0.95, 10, sz * 1.25, 5, rgba(cursorCol, ca));
}
function wrapLines(c, s, o, maxW) {
  const lines = [];
  let cur = '';
  for (const word of s.split(' ')) {
    const t = cur ? cur + ' ' + word : word;
    if (cur && measure(c, t, o) > maxW) { lines.push(cur); cur = word; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/*+<>';
function scramble(s, p, seed = 0, tq = 0) {
  let out = '';
  const n = s.length;
  for (let i = 0; i < n; i++) {
    const ch = s[i];
    const thr = (i / n) * 0.75;
    if (p >= thr + 0.25 || ch === ' ') out += ch;
    else if (p > thr) out += GLYPHS[Math.floor(hash(i * 13.1 + seed + tq * 7.7) * GLYPHS.length)];
    else out += ' ';
  }
  return out;
}

/* ---------- the JoFunction monogram (100-unit space, from the brand SVG) ---------- */
const LB = [
  { x: 44.25, y: 23.5, w: 11.5, h: 52, r: [5.75, 5.75, 0, 0], g: 'up', cap: [50, 29.25] },      // stem
  { x: 19, y: 64, w: 36.75, h: 11.5, r: [5.75, 0, 0, 5.75], g: 'left', cap: [24.75, 69.75] },  // hook
  { x: 44.25, y: 23.5, w: 31.25, h: 11.5, r: [0, 5.75, 5.75, 0], g: 'right', cap: [69.75, 29.25] }, // top
  { x: 44.25, y: 46.5, w: 22.5, h: 11.5, r: [0, 5.75, 5.75, 0], g: 'right', cap: [61, 52.25] }   // middle
];
function barRect(b, p) {
  let { x, y, w, h } = b;
  p = Math.max(0, p);
  if (b.g === 'up') { const n = h * p; y = y + h - n; h = n; }
  else if (b.g === 'left') { const n = w * p; x = x + w - n; w = n; }
  else w = w * p;
  return { x, y, w, h };
}
function drawBar(c, b, p, col, rOverride) {
  const R = barRect(b, p);
  if (R.w <= 0.05 || R.h <= 0.05) return;
  const m = Math.min(R.w, R.h) / 2;
  const r = (rOverride || b.r).map(v => Math.min(v, m));
  c.beginPath();
  c.roundRect(R.x, R.y, R.w, R.h, r);
  c.fillStyle = col;
  c.fill();
}
function drawGlyph(c, ps, col, cols) {
  for (let i = 0; i < 4; i++) drawBar(c, LB[i], ps ? ps[i] : 1, cols ? cols[i] : col);
}
function drawIcon(c, cx, cy, size, o = {}) {
  c.save();
  c.translate(cx - size / 2, cy - size / 2);
  c.scale(size / 100, size / 100);
  if (o.bg !== null) { rr(c, 0, 0, 100, 100, 24); c.fillStyle = o.bg || C.ink; c.fill(); }
  drawGlyph(c, o.ps, o.fg || C.paper, o.cols);
  c.restore();
}

/* ---------- shared scene furniture ---------- */
function settle(c, lt, amt = 0.05, dur = BAR * 0.7) {
  const s = 1 + amt * (1 - ez(lt, 0, dur, E.outE));
  scaleAbout(c, W / 2, H / 2, s);
}
function bigNum(c, n, lt, col, alpha = 0.07) {
  const a = alpha * ez(lt, -0.1, 0.5, E.outC);
  if (a <= 0) return;
  c.save();
  c.globalAlpha = a;
  setFont(c, { f: F.grot, w: 700, s: 640, ls: -24 });
  c.textAlign = 'right';
  c.strokeStyle = col;
  c.lineWidth = 2.5;
  c.strokeText(n, 1905 - lt * 18, 1150 - lt * 26);
  c.restore();
}

/* ---------- scene engine ---------- */
const SC = [];
function addScene(id, b0, b1, draw, opt = {}) { SC.push({ id, t0: b0 * B, t1: b1 * B, draw, ...opt }); }

const MASKS = {
  iris(c, p, tr) {
    const x = tr.x ?? W / 2, y = tr.y ?? H / 2;
    const R = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
    circle(c, x, y, R * p * 1.02);
    c.clip();
  },
  blindsV(c, p, tr) {
    const n = tr.n || 8, st = tr.st ?? 0.5, cw = W / n;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const q = E.ioC(clamp((p - (st * i) / (n - 1)) / (1 - st)));
      if (q <= 0) continue;
      const h = H * q;
      const fromTop = !tr.alt || i % 2 === 0;
      c.rect(i * cw - 1, fromTop ? 0 : H - h, cw + 2, h);
    }
    c.clip();
  },
  blindsH(c, p, tr) {
    const n = tr.n || 6, st = tr.st ?? 0.45, rh = H / n;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const q = E.ioC(clamp((p - (st * i) / (n - 1)) / (1 - st)));
      if (q <= 0) continue;
      const w = W * q;
      const fromLeft = !tr.alt || i % 2 === 0;
      c.rect(fromLeft ? 0 : W - w, i * rh - 1, w, rh + 2);
    }
    c.clip();
  },
  wipe(c, p, tr) {
    const a = ((tr.angle || 0) * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
    const R = (W * Math.abs(dx) + H * Math.abs(dy)) / 2 + 40;
    const off = lerp(-R, R, p), L = 4000;
    const px = W / 2 + dx * off, py = H / 2 + dy * off, nx = -dy, ny = dx;
    poly(c, [
      [px + nx * L, py + ny * L], [px - nx * L, py - ny * L],
      [px - nx * L - dx * L, py - ny * L - dy * L], [px + nx * L - dx * L, py + ny * L - dy * L]
    ]);
    c.clip();
  },
  pill(c, p, tr) {
    const cx = tr.x ?? W / 2, cy = tr.y ?? H / 2, h0 = tr.h0 || 18;
    const p1 = E.outE(clamp(p / 0.5)), p2 = E.ioC(clamp((p - 0.38) / 0.62));
    const w = lerp(0, W * 1.25, p1), h = lerp(h0, H * 1.3, p2), r = lerp(h0 / 2, 0, p2);
    rr(c, cx - w / 2, cy - h / 2, w, h, Math.min(r, h / 2));
    c.clip();
  },
  halftone(c, p, tr) {
    const cell = tr.cell || 120, cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
    c.beginPath();
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const d = (i / cols) * 0.55 + hash(i * 7 + j * 13) * 0.08;
        const q = clamp((p - d) / 0.37);
        if (q <= 0) continue;
        const r = cell * 0.75 * E.inQ(q);
        c.moveTo(i * cell + r, j * cell);
        c.arc(i * cell, j * cell, r, 0, TAU);
      }
    }
    c.clip();
  }
};

function drawTransition(c, tr, p, drawNext, t) {
  if (tr.type === 'glitch') return drawGlitchTransition(c, p, drawNext, t);
  const layers = tr.layers || [];
  const n = layers.length + 1, lag = tr.lag ?? 0.14, span = 1 - lag * (n - 1);
  for (let k = 0; k < n; k++) {
    const pk = clamp((p - lag * k) / span);
    if (pk <= 0) continue;
    const ep = (tr.ease || E.ioC)(pk);
    c.save();
    MASKS[tr.type](c, ep, tr);
    if (k < layers.length) fillBG(c, layers[k]);
    else drawNext();
    c.restore();
  }
}

function drawGlitchTransition(c, p, drawNext, t) {
  const q = Math.floor(t * 40);
  const R = mulberry32(q * 977 + 13);
  const bands = 14;
  for (let i = 0; i < bands; i++) {
    const y = R() * H, h = 12 + R() * 140;
    const show = R() < p * 1.25 || p > 0.85;
    if (!show) continue;
    const dx = (R() - 0.5) * 260 * (1 - p);
    c.save();
    c.beginPath(); c.rect(0, y, W, h); c.clip();
    c.translate(dx, 0);
    drawNext();
    c.restore();
  }
  if (p > 0.85) { c.save(); c.globalAlpha = (p - 0.85) / 0.15; drawNext(); c.restore(); }
  // signal blocks
  for (let i = 0; i < 6; i++) {
    if (R() > 0.65) continue;
    c.fillStyle = R() < 0.5 ? C.orange : C.paper;
    c.globalAlpha = 0.9 * (1 - p);
    c.fillRect(R() * W, R() * H, 40 + R() * 300, 4 + R() * 18);
  }
  c.globalAlpha = 1;
}

function activeScene(t) {
  let j = 0;
  for (let i = 0; i < SC.length; i++) {
    const pre = SC[i].tr ? SC[i].tr.pre * B : 0;
    if (t >= SC[i].t0 - pre) j = i;
  }
  return j;
}

function drawWorld(c, t) {
  const j = activeScene(t), s = SC[j], tr = s.tr;
  if (tr && j > 0) {
    const a = s.t0 - tr.pre * B, z = s.t0 + tr.post * B;
    if (t < z) {
      const prev = SC[j - 1];
      c.save(); prev.draw(c, t - prev.t0); c.restore();
      drawTransition(c, tr, (t - a) / (z - a), () => { c.save(); s.draw(c, t - s.t0); c.restore(); }, t);
      return;
    }
  }
  c.save(); s.draw(c, t - s.t0); c.restore();
}

/* camera shake + glitch events (seconds) */
const SHAKES = [];
const GLITCHES = [];
function shakeAt(t) {
  let x = 0, y = 0, r = 0;
  for (const s of SHAKES) {
    const d = t - s.t;
    if (d < 0 || d > s.dur) continue;
    const k = s.amp * Math.pow(1 - d / s.dur, 2);
    x += noise1(d * s.f + s.t * 10) * k;
    y += noise1(d * s.f + 50 + s.t * 10) * k;
    r += noise1(d * s.f * 0.7 + 99) * k * 0.0009;
  }
  return { x, y, r };
}
function glitchAt(t) {
  let g = 0;
  for (const e of GLITCHES) { const d = t - e.t; if (d >= 0 && d < e.dur) g = Math.max(g, e.amp * (1 - d / e.dur)); }
  return g;
}

/* ---------- renderer ---------- */
let VIEW, vctx, BUF, bctx, TMP, tctx, GRAIN = [];
const RENDER = { grain: 0.03, hud: true };

function initEngine(canvas) {
  VIEW = canvas; vctx = canvas.getContext('2d', { alpha: false });
  BUF = document.createElement('canvas'); BUF.width = W; BUF.height = H; bctx = BUF.getContext('2d', { alpha: false });
  TMP = document.createElement('canvas'); TMP.width = W; TMP.height = H; tctx = TMP.getContext('2d', { alpha: false });
  const R = mulberry32(99);
  for (let k = 0; k < 4; k++) {
    const g = document.createElement('canvas'); g.width = g.height = 256;
    const gc = g.getContext('2d'), id = gc.createImageData(256, 256);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = R() < 0.5 ? 0 : 255;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
      id.data[i + 3] = Math.floor(R() * 255);
    }
    gc.putImageData(id, 0, 0);
    GRAIN.push(g);
  }
}

function postGlitch(c, amt, t) {
  tctx.drawImage(BUF, 0, 0);
  const R = mulberry32(Math.floor(t * 50) * 31 + 7);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const y = R() * H, h = 6 + R() * 90, dx = (R() - 0.5) * 220 * amt;
    c.drawImage(TMP, 0, y, W, h, dx, y, W, h);
  }
  c.globalAlpha = 0.85 * amt;
  for (let i = 0; i < 5; i++) {
    c.fillStyle = R() < 0.6 ? C.orange : C.paper;
    c.fillRect(R() * W, R() * H, 30 + R() * 260, 3 + R() * 14);
  }
  c.globalAlpha = 1;
}

function renderFrame(t, samples = 1) {
  const shutter = 0.5 / FPS; // 180° shutter
  for (let i = 0; i < samples; i++) {
    const st = samples === 1 ? t : t + ((i + 0.5) / samples - 0.5) * shutter;
    bctx.save();
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    const sh = shakeAt(st);
    if (sh.x || sh.y) { bctx.translate(W / 2 + sh.x, H / 2 + sh.y); bctx.rotate(sh.r); bctx.translate(-W / 2, -H / 2); }
    drawWorld(bctx, st);
    bctx.restore();
    const g = glitchAt(st);
    if (g > 0) postGlitch(bctx, g, st);
    vctx.globalAlpha = 1 / (i + 1);
    vctx.drawImage(BUF, 0, 0);
  }
  vctx.globalAlpha = 1;
  if (RENDER.hud) drawHUD(vctx, t);
  if (RENDER.grain > 0) {
    const g = GRAIN[Math.floor(t * FPS) % GRAIN.length];
    const ox = Math.floor(hash(Math.floor(t * FPS)) * 256), oy = Math.floor(hash(Math.floor(t * FPS) + 7) * 256);
    vctx.save();
    vctx.globalAlpha = RENDER.grain;
    vctx.globalCompositeOperation = 'overlay';
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) vctx.drawImage(g, x, y);
    vctx.restore();
  }
}

/* ---------- HUD: the reel's frame furniture ---------- */
function hudSceneAt(t) {
  const j = activeScene(t), s = SC[j];
  let use = s, lt = t - s.t0;
  if (s.tr && j > 0) {
    const a = s.t0 - s.tr.pre * B, z = s.t0 + s.tr.post * B;
    if (t < z && (t - a) / (z - a) < 0.5) { use = SC[j - 1]; lt = t - use.t0; }
  }
  const col = typeof use.hud === 'function' ? use.hud(lt) : use.hud || C.paper;
  return { col, bottom: use.hudBottom || col, acc: use.hudAcc || C.orange };
}
function labelAt(t) {
  const j = activeScene(t);
  return SC[Math.max(0, j - (SC[j].tr && t < SC[j].t0 ? 1 : 0))].label || '';
}
function tc(t) {
  const f = Math.floor(t * FPS + 1e-6), s = Math.floor(f / FPS), ff = f % FPS;
  const p2 = n => String(n).padStart(2, '0');
  return `${p2(Math.floor(s / 60))}:${p2(s % 60)}:${p2(ff)}`;
}
function drawHUD(c, t) {
  const a = ez(t, 0.25, 0.9, E.outC) * (1 - ez(t, 26.1, 26.3, E.lin));
  if (a <= 0) return;
  const hs = hudSceneAt(t), col = hs.col, colB = hs.bottom;
  c.save();
  c.globalAlpha = a * 0.78;
  c.strokeStyle = col;
  c.lineWidth = 2;
  const m = 40, L = 22 * ez(t, 0.25, 1.1, E.outE);
  c.beginPath();
  c.moveTo(m, m + L); c.lineTo(m, m); c.lineTo(m + L, m);
  c.moveTo(W - m - L, m); c.lineTo(W - m, m); c.lineTo(W - m, m + L);
  c.stroke();
  c.strokeStyle = colB;
  c.beginPath();
  c.moveTo(m, H - m - L); c.lineTo(m, H - m); c.lineTo(m + L, H - m);
  c.moveTo(W - m - L, H - m); c.lineTo(W - m, H - m); c.lineTo(W - m, H - m - L);
  c.stroke();
  const o = { f: F.mono, w: 500, s: 13, ls: 2.5, c: col };
  text(c, 'JOFUNCTION — MOTION REEL', m + 34, m + 18, o);
  text(c, labelAt(t), W - m - 34, m + 18, { ...o, a: 'right' });
  text(c, 'TC ' + tc(t), m + 34, H - m - 8, { ...o, c: colB });
  text(c, '128 BPM · 60 FPS', W - m - 34 - 190, H - m - 8, { ...o, c: colB, a: 'right' });
  c.globalAlpha = a * 0.3;
  c.fillStyle = colB;
  c.fillRect(W - m - 34 - 170, H - m - 13, 170, 2);
  c.globalAlpha = a;
  c.fillStyle = colB === col ? hs.acc : C.orange;
  c.fillRect(W - m - 34 - 170, H - m - 13, 170 * clamp(t / DUR), 2);
  c.restore();
}
