'use strict';
/* ==========================================================================
   Faz3at E5tebar — Reel engine (1080×1920, 60 fps)
   Everything is a pure function of time t (seconds), so the live player and
   the frame-accurate offline render are identical.
   ========================================================================== */

const W = 1080, H = 1920, FPS = 60, DUR = 30;
const LANG = (() => { try { return (new URLSearchParams(location.search).get('lang') || '').toLowerCase() === 'en' ? 'en' : 'ar'; } catch (e) { return 'ar'; } })();
const EN = LANG === 'en', AR = !EN;
const BPM = 120, B = 60 / BPM; // one beat = 0.5 s, every cut sits on this grid
const TAU = Math.PI * 2;

const C = {
  ink: '#0B0B0C', ink2: '#161618', ink3: '#232326', ink4: '#34343A',
  paper: '#F9F8F6', sand: '#EFEBE6', sand2: '#E3DED7', line: '#D9D3CC', mute: '#8B857D', gray: '#6E6961',
  orange: '#FF5C00', deep: '#C43D00', amber: '#FF8A3D', peach: '#FFC89F', peach2: '#FFE6D3', white: '#FFFFFF'
};
const F = {
  d: 'Alexandria, sans-serif',
  mono: '"IBM Plex Mono", monospace',
  grot: '"Space Grotesk", sans-serif',
  math: 'KaTeX_Math, serif',
  main: 'KaTeX_Main, serif'
};

/* ---------- mirroring: the Arabic cut reads right to left ---------- */
const MX = x => (EN ? x : W - x);          // mirror an x position
const DIR = EN ? 1 : -1;                    // reading direction
const AL = EN ? 'left' : 'right';           // start-aligned text
const M = 90;                               // side margin (Reels safe area)
const X0 = MX(M);                           // start edge for text

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
    for (let i = 0; i < 12; i++) {
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
  outB2: x => { const s = 2.6; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },
  inB: x => { const s = 1.70158; return (s + 1) * x * x * x - s * x * x; },
  outBounce: x => {
    const n1 = 7.5625, d1 = 2.75;
    if (x < 1 / d1) return n1 * x * x;
    if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
    if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
};
E.snap = bezier(0.38, 0, 0.08, 1);  // quick lift-off, long decisive settle
E.swift = bezier(0.16, 0.9, 0.1, 1); // fast-out, long settle
E.whip = bezier(0.75, 0, 0.25, 1);  // whip-pan

const ez = (t, a, b, fn = E.outE) => fn(prog(t, a, b));
// damped spring 0 → 1 (x in seconds)
const spring = (x, f = 2.2, d = 6.5) => (x <= 0 ? 0 : 1 - Math.exp(-d * x) * Math.cos(TAU * f * x));
// decaying oscillation starting at 0 (x in seconds)
const wobble = (x, f = 3, d = 7) => (x <= 0 ? 0 : Math.exp(-d * x) * Math.sin(TAU * f * x));
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
  const h = v => Math.round(v).toString(16).padStart(2, '0');
  return '#' + h(lerp(A[0], Bc[0], t)) + h(lerp(A[1], Bc[1], t)) + h(lerp(A[2], Bc[2], t));
}
function rgba(h, a) { const A = rgb(h); return `rgba(${A[0]},${A[1]},${A[2]},${clamp(a)})`; }

/* ---------- drawing helpers ---------- */
function fillBG(c, col) { c.fillStyle = col; c.fillRect(-W * 2, -H * 2, W * 5, H * 5); }
function rr(c, x, y, w, h, r) {
  c.beginPath();
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  c.roundRect(x, y, w, h, Array.isArray(r) ? r.map(v => Math.min(v, w / 2, h / 2)) : Math.min(r, w / 2, h / 2));
}
function fillRR(c, x, y, w, h, r, col) { if (w <= 0 || h <= 0) return; rr(c, x, y, w, h, r); c.fillStyle = col; c.fill(); }
function strokeRR(c, x, y, w, h, r, col, lw) { if (w <= 0 || h <= 0) return; rr(c, x, y, w, h, r); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); }
function fillCircle(c, x, y, r, col) { if (r <= 0) return; circle(c, x, y, r); c.fillStyle = col; c.fill(); }
function strokeCircle(c, x, y, r, col, lw) { if (r <= 0) return; circle(c, x, y, r); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); }
function arcStroke(c, x, y, r, a0, a1, col, lw, cap = 'round') {
  if (Math.abs(a1 - a0) < 1e-4 || r <= 0) return;
  c.beginPath(); c.arc(x, y, r, a0, a1, a1 < a0); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = cap; c.stroke();
}
function withAlpha(c, a, fn) { if (a <= 0.001) return; c.save(); c.globalAlpha *= clamp(a); fn(); c.restore(); }
function scaleAbout(c, x, y, sx, sy = sx) { c.translate(x, y); c.scale(sx, sy); c.translate(-x, -y); }
function rotAbout(c, x, y, r) { c.translate(x, y); c.rotate(r); c.translate(-x, -y); }
function poly(c, pts, close = true) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  if (close) c.closePath();
}
// polyline drawn on from 0 → p of its length
function strokePart(c, pts, p, col, lw) {
  if (p <= 0) return;
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let left = L * clamp(p);
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const k = Math.min(1, left / seg[i - 1]);
    c.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
    left -= seg[i - 1];
  }
  c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function shadow(c, col, blur, oy = 0, ox = 0) { c.shadowColor = col; c.shadowBlur = blur; c.shadowOffsetX = ox; c.shadowOffsetY = oy; }
function noShadow(c) { c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; }

/* ---------- type ---------- */
const isArabic = s => /[؀-ۿ]/.test(s);
function setFont(c, o, s) {
  const ar = isArabic(s || '');
  c.font = `${o.it ? 'italic ' : ''}${o.w || 600} ${o.s || 32}px ${o.f || F.d}`;
  c.letterSpacing = (ar ? 0 : o.ls || 0) + 'px'; // never track Arabic: it breaks the joins
  c.direction = o.rtl != null ? (o.rtl ? 'rtl' : 'ltr') : ar ? 'rtl' : 'ltr';
}
function text(c, s, x, y, o = {}) {
  c.save();
  setFont(c, o, s);
  c.fillStyle = o.c || C.ink;
  c.textAlign = o.a || 'left';
  c.textBaseline = o.bl || 'alphabetic';
  if (o.alpha != null) c.globalAlpha *= clamp(o.alpha);
  if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.sw || 3; c.lineJoin = 'round'; c.strokeText(s, x, y); }
  if (!o.outline) c.fillText(s, x, y);
  c.restore();
}
const _mcache = new Map();
function measure(c, s, o) {
  const key = `${o.w || 600}|${o.s || 32}|${o.f || F.d}|${o.ls || 0}|${o.it ? 1 : 0}|${s}`;
  let v = _mcache.get(key);
  if (v === undefined) {
    c.save(); setFont(c, o, s); v = c.measureText(s).width; c.restore();
    _mcache.set(key, v);
  }
  return v;
}
// largest size ≤ maxS at which every line fits maxW
function fitSize(c, lines, o, maxW, maxS) {
  let s = maxS;
  for (const l of lines) { const w = measure(c, l, { ...o, s: 100 }); s = Math.min(s, (maxW / w) * 100); }
  while (s > 8 && Math.max(...lines.map(l => measure(c, l, { ...o, s }))) > maxW) s -= 1;
  return Math.floor(s);
}
function ax(a, x, w) { return a === 'right' ? x - w : a === 'center' ? x - w / 2 : x; }

/* Kinetic words: each word slides up out of its own mask with a slight skew.
   Words are laid out in reading order (RTL for Arabic). p0 = start time of the
   line, st = stagger per word. Returns the line width. */
function kineticLine(c, s, x, y, o, lt, p0, st = 0.06, dur = 0.55, fn = E.snap, pout = 0) {
  if (pout >= 1) return 0;
  const words = s.split(' ');
  const rtl = isArabic(s);
  const sp = measure(c, ' ', o);
  const ws = words.map(w => measure(c, w, o));
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  const left = ax(o.a || 'left', x, total);
  let cur = rtl ? left + total : left;
  const sz = o.s;
  for (let i = 0; i < words.length; i++) {
    const w = ws[i];
    const wx = rtl ? cur - w : cur;
    cur = rtl ? cur - w - sp : cur + w + sp;
    const p = ez(lt, p0 + i * st, p0 + i * st + dur, fn);
    if (p <= 0) continue;
    c.save();
    c.beginPath();
    c.rect(wx - sz * 0.3, y - sz * 1.25, w + sz * 0.6, sz * 1.75);
    c.clip();
    const dy = (1 - p) * sz * 1.4 - pout * sz * 1.5;
    c.translate(wx, y + dy);
    c.transform(1, 0, (1 - p) * -0.25 * DIR, 1, 0, 0);
    text(c, words[i], 0, 0, { ...o, a: 'left', rtl: rtl });
    c.restore();
  }
  return total;
}
// Kinetic exit: whole line slides up and out of its mask.
function maskedLine(c, s, x, y, o, pin, pout = 0) {
  if (pin <= 0 || pout >= 1) return;
  const w = measure(c, s, o), sz = o.s, a = o.a || 'left';
  const x0 = ax(a, x, w);
  c.save();
  c.beginPath(); c.rect(x0 - sz * 0.4, y - sz * 1.25, w + sz * 0.8, sz * 1.8); c.clip();
  c.translate(0, (1 - pin) * sz * 1.4 - pout * sz * 1.5);
  text(c, s, x, y, o);
  c.restore();
}

/* Scene chapter label: "01 — LEARN", orange index + rule. */
function chapter(c, n, label, lt, col = C.ink, acc = C.orange, y = 300) {
  const p = ez(lt, 0.0, 0.45, E.outE), p2 = ez(lt, 0.08, 0.6, E.outE);
  if (p <= 0) return;
  const num = String(n).padStart(2, '0');
  const o = { f: F.mono, w: 600, s: 28, ls: 5 };
  const nw = measure(c, num, o);
  c.save();
  c.globalAlpha *= p;
  text(c, num, X0, y, { ...o, c: acc, a: AL });
  const rx = X0 + DIR * (nw + 22);
  c.fillStyle = acc;
  const rw = 56 * p2;
  c.fillRect(EN ? rx : rx - rw, y - 11, rw, 3);
  const lo = AR ? { f: F.d, w: 600, s: 30 } : { ...o, w: 500 };
  maskedLine(c, label, rx + DIR * 78, y, { ...lo, c: col, a: AL }, p2);
  c.restore();
}

/* ---------- KaTeX-style maths (always LTR) ----------
   tokens: strings (upright), {i:'x'} italic variable, {sup:'2'} superscript, {op:'−'} spaced operator */
function mathWidth(c, toks, s) {
  let w = 0;
  for (const t of toks) w += mathTokW(c, t, s);
  return w;
}
function mathTokW(c, t, s) {
  if (typeof t === 'string') return measure(c, t, { f: F.main, w: 400, s });
  if (t.i) return measure(c, t.i, { f: F.math, w: 400, s, it: true }) + s * 0.04;
  if (t.sup) return measure(c, t.sup, { f: F.main, w: 400, s: s * 0.68 }) + s * 0.04;
  if (t.op) return measure(c, t.op, { f: F.main, w: 400, s }) + s * 0.5;
  if (t.gap) return s * t.gap;
  return 0;
}
function drawMath(c, toks, x, y, s, col, a = 'left') {
  const w = mathWidth(c, toks, s);
  let cx = ax(a, x, w);
  for (const t of toks) {
    if (typeof t === 'string') text(c, t, cx, y, { f: F.main, w: 400, s, c: col, rtl: false });
    else if (t.i) text(c, t.i, cx, y, { f: F.math, w: 400, s, c: col, it: true, rtl: false });
    else if (t.sup) text(c, t.sup, cx + s * 0.04, y - s * 0.42, { f: F.main, w: 400, s: s * 0.68, c: col, rtl: false });
    else if (t.op) text(c, t.op, cx + s * 0.25, y, { f: F.main, w: 400, s, c: col, rtl: false });
    cx += mathTokW(c, t, s);
  }
  return w;
}

/* ---------- brand marks ---------- */
// Faz3at E5tebar app icon, measured from the supplied logo (100-unit space).
const FZ = {
  r: 23.5,
  book: [[31.8, 34.6], [31.8, 68.5], [50.1, 59.6], [68.4, 68.5], [68.4, 34.6]], // + rounded top (r 5.8) at y 28.8
  check: [[43.0, 47.4], [47.9, 52.4], [57.3, 42.6]],
  dot: { x: 83.05, y: 16.9, r: 8.3, ring: 1.5 }
};
function bookPath(c) {
  const r = 5.8, x0 = 31.8, x1 = 68.4, y0 = 28.8;
  c.beginPath();
  c.moveTo(x0, y0 + r);
  c.arcTo(x0, y0, x0 + r, y0, r);
  c.lineTo(x1 - r, y0);
  c.arcTo(x1, y0, x1, y0 + r, r);
  c.lineTo(68.4, 68.5); c.lineTo(50.1, 59.6); c.lineTo(31.8, 68.5);
  c.closePath();
}
/* o: sq (squircle scale 0–1), book (0–1 unroll), check (0–1 draw), dot (0–1 pop),
      dotAt {x,y,r} override in icon units, bg colour, glint (0–1 sweep) */
function drawFazIcon(c, cx, cy, size, o = {}) {
  const sq = o.sq ?? 1, bk = o.book ?? 1, ck = o.check ?? 1, dt = o.dot ?? 1;
  c.save();
  c.translate(cx, cy);
  c.scale(size / 100, size / 100);
  c.translate(-50, -50);
  if (sq > 0) {
    c.save();
    scaleAbout(c, 50, 50, sq);
    if (o.shadow) { shadow(c, o.shadow, 40, 18); }
    rr(c, 0, 0, 100, 100, FZ.r);
    c.fillStyle = o.bg || C.orange; c.fill();
    noShadow(c);
    c.clip();
    if (bk > 0) {
      c.save();
      // unroll from the top edge
      c.beginPath(); c.rect(0, 0, 100, lerp(28, 72, bk)); c.clip();
      c.translate(0, (1 - bk) * -6);
      bookPath(c);
      c.fillStyle = o.fg || C.paper; c.fill();
      c.lineJoin = 'round'; c.lineWidth = 2.4; c.strokeStyle = o.fg || C.paper; c.stroke();
      c.restore();
    }
    if (ck > 0) strokePart(c, FZ.check, ck, o.bg || C.orange, 5.5);
    if (o.glint > 0 && o.glint < 1) {
      const gx = lerp(-60, 160, o.glint);
      const g = c.createLinearGradient(gx - 30, 0, gx + 30, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.save(); c.globalCompositeOperation = 'overlay'; c.fillStyle = g;
      c.transform(1, 0, -0.35, 1, 0, 0); c.fillRect(-100, 0, 300, 100); c.restore();
    }
    c.restore();
  }
  if (dt > 0) {
    const d = o.dotAt || FZ.dot;
    const r = d.r * dt;
    fillCircle(c, d.x, d.y, r + FZ.dot.ring / 2, o.ring || C.ink);
    fillCircle(c, d.x, d.y, r - FZ.dot.ring / 2, C.peach);
  }
  c.restore();
}

// JoFunction monogram (100-unit space, from the brand SVG — same geometry as the supplied logo)
const LB = [
  { x: 44.25, y: 23.5, w: 11.5, h: 52, r: [5.75, 5.75, 0, 0], g: 'up' },
  { x: 19, y: 64, w: 36.75, h: 11.5, r: [5.75, 0, 0, 5.75], g: 'left' },
  { x: 44.25, y: 23.5, w: 31.25, h: 11.5, r: [0, 5.75, 5.75, 0], g: 'right' },
  { x: 44.25, y: 46.5, w: 22.5, h: 11.5, r: [0, 5.75, 5.75, 0], g: 'right' }
];
function drawJFIcon(c, cx, cy, size, o = {}) {
  c.save();
  c.translate(cx - size / 2, cy - size / 2);
  c.scale(size / 100, size / 100);
  if (o.bg !== null) { rr(c, 0, 0, 100, 100, 24); c.fillStyle = o.bg || C.orange; c.fill(); }
  for (let i = 0; i < 4; i++) {
    const b = LB[i], p = o.ps ? clamp(o.ps[i]) : 1;
    if (p <= 0) continue;
    let { x, y, w, h } = b;
    if (b.g === 'up') { const n = h * p; y = y + h - n; h = n; }
    else if (b.g === 'left') { const n = w * p; x = x + w - n; w = n; }
    else w = w * p;
    const m = Math.min(w, h) / 2;
    c.beginPath(); c.roundRect(x, y, w, h, b.r.map(v => Math.min(v, m)));
    c.fillStyle = o.fg || C.ink; c.fill();
  }
  c.restore();
}
// "by JoFunction" lockup; anchor is the start edge in reading direction
function jfLockup(c, x, y, s, col, p = 1, label) {
  if (p <= 0) return;
  const pre = label != null ? label : EN ? 'by' : 'من';
  const o1 = { f: AR ? F.d : F.grot, w: 500, s: s * 0.62 };
  const o2 = { f: F.grot, w: 700, s: s * 0.8, ls: -0.5 };
  const w1 = measure(c, pre, o1), w2 = measure(c, 'JoFunction', o2), g1 = s * 0.3, g2 = s * 0.26;
  // reading order [pre] [icon] [JoFunction], laid out right to left in the Arabic cut
  const items = [['pre', w1], ['gap', g1], ['icon', s], ['gap', g2], ['name', w2]];
  if (AR) items.reverse();
  const total = items.reduce((a, it) => a + it[1], 0);
  let cx = x - total / 2;
  c.save();
  c.globalAlpha *= p;
  for (const [k, w] of items) {
    if (k === 'pre') text(c, pre, cx, y + s * 0.2, { ...o1, c: col, a: 'left', rtl: false });
    if (k === 'icon') drawJFIcon(c, cx + s / 2, y, s, {});
    if (k === 'name') text(c, 'JoFunction', cx, y + s * 0.27, { ...o2, c: col, a: 'left', rtl: false });
    cx += w;
  }
  c.restore();
}

/* ---------- small vector icons (drawn in a 100-unit box, stroke style) ---------- */
function icon(c, name, cx, cy, size, col, lw = 7, t = 0) {
  c.save();
  c.translate(cx - size / 2, cy - size / 2);
  c.scale(size / 100, size / 100);
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  const S = () => c.stroke();
  switch (name) {
    case 'check': poly(c, [[24, 52], [42, 70], [77, 32]], false); S(); break;
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 19 : 40; pts.push([50 + Math.cos(a) * r, 54 + Math.sin(a) * r]); }
      poly(c, pts); c.fill(); c.lineWidth = lw * 0.6; S(); break;
    }
    case 'book': rr(c, 18, 20, 64, 62, 8); S(); c.beginPath(); c.moveTo(50, 22); c.lineTo(50, 80); S(); c.beginPath(); c.moveTo(28, 38); c.lineTo(40, 38); c.moveTo(60, 38); c.lineTo(72, 38); S(); break;
    case 'pencil': c.save(); rotAbout(c, 50, 50, -Math.PI / 4); rr(c, 40, 12, 20, 62, 4); S(); poly(c, [[40, 74], [50, 90], [60, 74]], false); S(); c.beginPath(); c.moveTo(40, 26); c.lineTo(60, 26); S(); c.restore(); break;
    case 'crown': poly(c, [[16, 72], [20, 32], [36, 50], [50, 24], [64, 50], [80, 32], [84, 72]]); c.fill(); c.lineWidth = lw * 0.8; S(); fillRR(c, 16, 76, 68, 10, 4, col); break;
    case 'calc': rr(c, 22, 12, 56, 76, 10); S(); rr(c, 32, 22, 36, 14, 3); S(); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) fillCircle(c, 36 + i * 14, 50 + j * 12, 3.6, col); break;
    case 'board': rr(c, 12, 18, 76, 52, 6); S(); c.beginPath(); c.moveTo(36, 70); c.lineTo(28, 88); c.moveTo(64, 70); c.lineTo(72, 88); S();
      c.beginPath(); c.moveTo(24, 50); c.bezierCurveTo(34, 30 + 8 * Math.sin(t * 6), 46, 58, 58, 38); c.lineTo(76, 32); S(); break;
    case 'note': poly(c, [[24, 12], [62, 12], [78, 28], [78, 88], [24, 88]]); S(); poly(c, [[62, 12], [62, 28], [78, 28]], false); S();
      c.beginPath(); for (const y of [44, 58, 72]) { c.moveTo(34, y); c.lineTo(y === 72 ? 54 : 68, y); } S(); break;
    case 'timer': circle(c, 50, 55, 32); S(); c.beginPath(); c.moveTo(42, 13); c.lineTo(58, 13); c.moveTo(50, 13); c.lineTo(50, 23); S();
      { const a = -Math.PI / 2 + t * TAU; c.beginPath(); c.moveTo(50, 55); c.lineTo(50 + Math.cos(a) * 20, 55 + Math.sin(a) * 20); S(); } break;
    case 'todo': for (let i = 0; i < 3; i++) { const y = 24 + i * 26; rr(c, 14, y - 9, 18, 18, 4); S(); c.beginPath(); c.moveTo(44, y); c.lineTo(86, y); S(); }
      poly(c, [[17, 24], [22, 29], [30, 19]], false); S(); poly(c, [[17, 50], [22, 55], [30, 45]], false); S(); break;
    case 'convert': c.beginPath(); c.moveTo(18, 36); c.lineTo(80, 36); S(); poly(c, [[66, 22], [80, 36], [66, 50]], false); S();
      c.beginPath(); c.moveTo(82, 66); c.lineTo(20, 66); S(); poly(c, [[34, 52], [20, 66], [34, 80]], false); S(); break;
    case 'atom': rr(c, 16, 16, 68, 68, 10); S(); text(c, 'H', 50, 66, { f: F.d, w: 800, s: 44, c: col, a: 'center', rtl: false });
      text(c, '1', 26, 34, { f: F.mono, w: 600, s: 14, c: col, rtl: false }); break;
    case 'cap': poly(c, [[50, 22], [90, 40], [50, 58], [10, 40]]); S(); c.beginPath(); c.moveTo(28, 48); c.lineTo(28, 68); c.quadraticCurveTo(50, 82, 72, 68); c.lineTo(72, 48); S();
      c.beginPath(); c.moveTo(86, 42); c.lineTo(86, 66); S(); break;
    case 'code': poly(c, [[34, 30], [14, 50], [34, 70]], false); S(); poly(c, [[66, 30], [86, 50], [66, 70]], false); S(); c.beginPath(); c.moveTo(56, 24); c.lineTo(44, 76); S(); break;
    case 'library': for (let i = 0; i < 3; i++) { rr(c, 16 + i * 22, 18 + (i === 2 ? 6 : 0), 16, 66 - (i === 2 ? 6 : 0), 3); S(); } break;
    case 'calendar': rr(c, 14, 20, 72, 66, 8); S(); c.beginPath(); c.moveTo(14, 38); c.lineTo(86, 38); c.moveTo(32, 12); c.lineTo(32, 26); c.moveTo(68, 12); c.lineTo(68, 26); S();
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) fillRR(c, 26 + i * 18, 50 + j * 16, 10, 8, 2, col); break;
    case 'bell': c.beginPath(); c.moveTo(24, 70); c.lineTo(24, 46); c.bezierCurveTo(24, 26, 36, 18, 50, 18); c.bezierCurveTo(64, 18, 76, 26, 76, 46); c.lineTo(76, 70); c.closePath(); c.moveTo(16, 70); c.lineTo(84, 70); S();
      c.beginPath(); c.arc(50, 76, 8, 0, Math.PI); S(); break;
    case 'flash': rr(c, 18, 26, 54, 40, 8); S(); rr(c, 28, 36, 54, 40, 8); c.fillStyle = col; c.globalAlpha *= 0.2; c.fill(); c.globalAlpha /= 0.2; S(); break;
    case 'search': circle(c, 44, 44, 22); S(); c.beginPath(); c.moveTo(60, 60); c.lineTo(80, 80); S(); break;
    case 'heart': heartPath(c, 50, 54, 40); c.fill(); break;
    case 'flame': flamePath(c, 50, 56, 44, t); c.fill(); break;
    case 'trophy': c.beginPath(); c.moveTo(30, 18); c.lineTo(70, 18); c.lineTo(68, 44); c.quadraticCurveTo(50, 64, 32, 44); c.closePath(); S();
      c.beginPath(); c.moveTo(30, 24); c.quadraticCurveTo(14, 26, 22, 40); c.moveTo(70, 24); c.quadraticCurveTo(86, 26, 78, 40); c.moveTo(50, 58); c.lineTo(50, 72); S(); rr(c, 34, 74, 32, 10, 3); S(); break;
    case 'x': c.beginPath(); c.moveTo(28, 28); c.lineTo(72, 72); c.moveTo(72, 28); c.lineTo(28, 72); S(); break;
    case 'lock': rr(c, 24, 44, 52, 42, 8); S(); c.beginPath(); c.moveTo(34, 44); c.lineTo(34, 32); c.arc(50, 32, 16, Math.PI, 0); c.lineTo(66, 44); S(); break;
  }
  c.restore();
}
function heartPath(c, cx, cy, s) {
  const k = s / 40;
  c.beginPath();
  c.moveTo(cx, cy + 26 * k);
  c.bezierCurveTo(cx - 6 * k, cy + 20 * k, cx - 40 * k, cy + 2 * k, cx - 40 * k, cy - 18 * k);
  c.bezierCurveTo(cx - 40 * k, cy - 34 * k, cx - 26 * k, cy - 42 * k, cx - 16 * k, cy - 42 * k);
  c.bezierCurveTo(cx - 6 * k, cy - 42 * k, cx, cy - 34 * k, cx, cy - 28 * k);
  c.bezierCurveTo(cx, cy - 34 * k, cx + 6 * k, cy - 42 * k, cx + 16 * k, cy - 42 * k);
  c.bezierCurveTo(cx + 26 * k, cy - 42 * k, cx + 40 * k, cy - 34 * k, cx + 40 * k, cy - 18 * k);
  c.bezierCurveTo(cx + 40 * k, cy + 2 * k, cx + 6 * k, cy + 20 * k, cx, cy + 26 * k);
  c.closePath();
}
function flamePath(c, cx, cy, s, t = 0) {
  const k = s / 44, f1 = noise1(t * 7) * 4 * k, f2 = noise1(t * 9 + 40) * 5 * k;
  c.beginPath();
  c.moveTo(cx, cy + 40 * k);
  c.bezierCurveTo(cx - 26 * k, cy + 40 * k, cx - 34 * k, cy + 18 * k, cx - 30 * k, cy + 2 * k);
  c.bezierCurveTo(cx - 26 * k, cy - 14 * k, cx - 12 * k, cy - 18 * k, cx - 10 * k + f1, cy - 34 * k);
  c.bezierCurveTo(cx + 2 * k, cy - 26 * k, cx + 4 * k, cy - 14 * k, cx + 2 * k, cy - 6 * k);
  c.bezierCurveTo(cx + 10 * k, cy - 14 * k, cx + 12 * k + f2, cy - 30 * k, cx + 8 * k + f2, cy - 46 * k);
  c.bezierCurveTo(cx + 30 * k, cy - 30 * k, cx + 36 * k, cy + 0 * k, cx + 30 * k, cy + 16 * k);
  c.bezierCurveTo(cx + 26 * k, cy + 32 * k, cx + 14 * k, cy + 40 * k, cx, cy + 40 * k);
  c.closePath();
}

/* ---------- FX ---------- */
// Confetti burst: deterministic physics as a function of local time.
function confetti(c, x, y, lt, o = {}) {
  if (lt < 0 || lt > (o.life || 1.6)) return;
  const n = o.n || 40, R = mulberry32(o.seed || 7), cols = o.cols || [C.orange, C.peach, C.paper, C.amber];
  const g = o.g ?? 2200, sp = o.speed || 1300, spread = o.spread ?? TAU, dir = o.dir ?? -Math.PI / 2;
  for (let i = 0; i < n; i++) {
    const a = dir + (R() - 0.5) * spread, v = sp * (0.35 + R() * 0.75);
    const drag = 1.6 + R() * 1.4;
    const tt = lt * (0.9 + R() * 0.2);
    const k = (1 - Math.exp(-drag * tt)) / drag;
    const px = x + Math.cos(a) * v * k + noise1(i * 3.3 + tt * 2) * 30 * tt;
    const py = y + Math.sin(a) * v * k + 0.5 * g * tt * tt * 0.45;
    const life = o.life || 1.6, fade = 1 - prog(lt, life * 0.6, life);
    const col = cols[Math.floor(R() * cols.length)], shape = R(), sz = (o.size || 16) * (0.6 + R() * 0.8);
    const rot = R() * TAU + tt * (R() - 0.5) * 18, flip = Math.cos(tt * (6 + R() * 10));
    c.save();
    c.globalAlpha *= fade;
    c.translate(px, py); c.rotate(rot); c.scale(1, flip);
    c.fillStyle = col;
    if (shape < 0.45) c.fillRect(-sz / 2, -sz * 0.3, sz, sz * 0.6);
    else if (shape < 0.8) { c.beginPath(); c.arc(0, 0, sz * 0.38, 0, TAU); c.fill(); }
    else { c.beginPath(); c.moveTo(0, -sz * 0.5); c.lineTo(sz * 0.45, sz * 0.4); c.lineTo(-sz * 0.45, sz * 0.4); c.closePath(); c.fill(); }
    c.restore();
  }
}
// Expanding ring shockwave
function ring(c, x, y, lt, r0, r1, col, lw = 6, dur = 0.6) {
  if (lt < 0 || lt > dur) return;
  const p = E.outC(lt / dur);
  c.save(); c.globalAlpha *= 1 - p;
  strokeCircle(c, x, y, lerp(r0, r1, p), col, lw * (1 - p * 0.7));
  c.restore();
}
// Sparkle lines radiating (the little "ding" accents)
function sparks(c, x, y, lt, r0, r1, col, n = 8, lw = 6, dur = 0.45, rot = 0) {
  if (lt < 0 || lt > dur) return;
  const p = E.outC(lt / dur);
  c.save(); c.strokeStyle = col; c.lineWidth = lw * (1 - p * 0.6); c.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU, ra = lerp(r0, r1, p), rb = lerp(r0, r1, Math.min(1, p * 1.6 + 0.15));
    c.beginPath(); c.moveTo(x + Math.cos(a) * Math.min(ra, rb), y + Math.sin(a) * Math.min(ra, rb));
    c.lineTo(x + Math.cos(a) * rb, y + Math.sin(a) * rb); c.stroke();
  }
  c.restore();
}
// Duolingo-style pressable 3D pill/button
function button3D(c, x, y, w, h, r, top, lip, depth = 12, press = 0) {
  const d = depth * (1 - press);
  fillRR(c, x, y + depth, w, h, r, lip);
  fillRR(c, x, y + depth - d, w, h, r, top);
}
// "+10 XP" floating chip
function xpChip(c, x, y, lt, label = '+10 XP', col = C.orange, fg = C.paper, s = 30) {
  if (lt < 0 || lt > 0.9) return;
  const p = ez(lt, 0, 0.3, E.outB2), f = 1 - prog(lt, 0.6, 0.9);
  const o = { f: F.d, w: 800, s, rtl: false };
  const w = measure(c, label, o) + s * 1.0, h = s * 1.6;
  c.save(); c.globalAlpha *= f;
  c.translate(x, y - lt * 90); c.scale(p, p);
  fillRR(c, -w / 2, -h / 2, w, h, h / 2, col);
  text(c, label, 0, s * 0.36, { ...o, c: fg, a: 'center' });
  c.restore();
}
// tap indicator (finger press ring)
function tapFX(c, x, y, lt) {
  if (lt < -0.25 || lt > 0.5) return;
  const a = lt < 0 ? ez(lt, -0.25, -0.05, E.outC) : 1 - prog(lt, 0.15, 0.5);
  const s = lt < 0 ? lerp(1.25, 1, ez(lt, -0.25, 0)) : lerp(1, 0.86, ez(lt, 0, 0.08)) + 0.14 * ez(lt, 0.08, 0.3);
  c.save(); c.globalAlpha *= a;
  fillCircle(c, x, y, 34 * s, rgba(C.ink, 0.18));
  strokeCircle(c, x, y, 34 * s, rgba(C.white, 0.9), 4);
  c.restore();
  if (lt >= 0) ring(c, x, y, lt, 30, 90, C.white, 5, 0.45);
}
function glow(c, x, y, r, col, a) {
  if (a <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
// dotted paper grid
function dotGrid(c, col, a, step = 54, ox = 0, oy = 0, r = 2.2) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.fillStyle = col;
  const sx = ((ox % step) + step) % step, sy = ((oy % step) + step) % step;
  for (let y = -step + sy; y < H + step; y += step) for (let x = -step + sx; x < W + step; x += step) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  c.restore();
}

/* ---------- scene engine ---------- */
const SC = [];
function addScene(id, t0, t1, draw, opt = {}) { SC.push({ id, t0, t1, draw, ...opt }); }
// transitions: between SC[i-1] and SC[i], window [t0 - pre, t0 + post]
const MASKS = {
  iris(c, p, tr) {
    const x = tr.x ?? W / 2, y = tr.y ?? H / 2;
    const R = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
    circle(c, x, y, R * p * 1.02); c.clip();
  },
  blinds(c, p, tr) {
    const n = tr.n || 6, st = tr.st ?? 0.5, cw = W / n;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const k = EN ? i : n - 1 - i;
      const q = E.ioC(clamp((p - (st * k) / (n - 1)) / (1 - st)));
      if (q <= 0) continue;
      const h = H * q;
      c.rect(i * cw - 1, i % 2 ? H - h : 0, cw + 2, h);
    }
    c.clip();
  },
  wipe(c, p, tr) {
    const a = ((tr.angle || 0) * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
    const R = (W * Math.abs(dx) + H * Math.abs(dy)) / 2 + 60;
    const off = lerp(-R, R, p), L = 5000;
    const px = W / 2 + dx * off, py = H / 2 + dy * off, nx = -dy, ny = dx;
    poly(c, [[px + nx * L, py + ny * L], [px - nx * L, py - ny * L], [px - nx * L - dx * L, py - ny * L - dy * L], [px + nx * L - dx * L, py + ny * L - dy * L]]);
    c.clip();
  },
  wave(c, p, tr) {
    const y0 = lerp(H + 160, -200, p), amp = 70 * Math.sin(p * Math.PI), ph = p * 9;
    c.beginPath(); c.moveTo(-10, H + 10);
    for (let x = -10; x <= W + 10; x += 20) c.lineTo(x, y0 + Math.sin(x / 170 + ph) * amp + Math.sin(x / 70 - ph * 1.3) * amp * 0.25);
    c.lineTo(W + 10, H + 10); c.closePath(); c.clip();
  }
};
function drawTransition(c, tr, p, drawPrev, drawNext, t) {
  if (tr.type === 'push') {
    // whip pan: both scenes travel together, motion blur sells the speed
    const e = E.whip(p), ang = ((tr.angle ?? -90) * Math.PI) / 180;
    const dx = Math.cos(ang), dy = Math.sin(ang), D = Math.abs(dx) * W + Math.abs(dy) * H;
    c.save(); c.translate(dx * D * e, dy * D * e); c.beginPath(); c.rect(0, 0, W, H); c.clip(); drawPrev(); c.restore();
    c.save(); c.translate(dx * D * (e - 1), dy * D * (e - 1)); c.beginPath(); c.rect(0, 0, W, H); c.clip(); drawNext(); c.restore();
    return;
  }
  if (tr.type === 'card') {
    // outgoing scene shrinks into a rounded card and flies off, revealing the next
    drawNext();
    const e1 = E.ioC(clamp(p / 0.55)), e2 = E.inC(clamp((p - 0.4) / 0.6));
    const s = lerp(1, 0.78, e1), r = lerp(0, 70, e1);
    c.save();
    c.translate(W / 2 + DIR * -e2 * W * 0.15, H / 2 - e2 * H * 1.05);
    c.rotate(DIR * -0.08 * e2);
    c.scale(s, s);
    shadow(c, 'rgba(0,0,0,0.35)', 80 * e1, 40 * e1);
    rr(c, -W / 2, -H / 2, W, H, r / s); c.fillStyle = C.ink; c.fill(); noShadow(c);
    c.clip();
    c.translate(-W / 2, -H / 2);
    drawPrev();
    c.restore();
    return;
  }
  drawPrev();
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
function activeScene(t) {
  let j = 0;
  for (let i = 0; i < SC.length; i++) {
    const pre = SC[i].tr ? SC[i].tr.pre : 0;
    if (t >= SC[i].t0 - pre) j = i;
  }
  return j;
}
function drawWorld(c, t) {
  const j = activeScene(t), s = SC[j], tr = s.tr;
  if (tr && j > 0) {
    const a = s.t0 - tr.pre, z = s.t0 + tr.post;
    if (t < z) {
      const prev = SC[j - 1];
      drawTransition(c, tr, (t - a) / (z - a),
        () => { c.save(); prev.draw(c, t - prev.t0, t); c.restore(); },
        () => { c.save(); s.draw(c, t - s.t0, t); c.restore(); }, t);
      return;
    }
  }
  c.save(); s.draw(c, t - s.t0, t); c.restore();
}

/* camera shake, chromatic aberration and flash events (seconds) */
const SHAKES = [], CAS = [], FLASHES = [];
function shakeAt(t) {
  let x = 0, y = 0, r = 0;
  for (const s of SHAKES) {
    const d = t - s.t;
    if (d < 0 || d > s.dur) continue;
    const k = s.amp * Math.pow(1 - d / s.dur, 2);
    x += noise1(d * (s.f || 30) + s.t * 10) * k;
    y += noise1(d * (s.f || 30) + 50 + s.t * 10) * k;
    r += noise1(d * (s.f || 30) * 0.7 + 99) * k * 0.0012;
  }
  return { x, y, r };
}
function eventAt(list, t) {
  let g = 0;
  for (const e of list) { const d = t - e.t; if (d >= 0 && d < e.dur) g = Math.max(g, e.amp * Math.pow(1 - d / e.dur, 1.5)); }
  return g;
}

/* ---------- renderer ---------- */
let VIEW, vctx, BUF, bctx, CR, crx, CG, cgx, GRAIN = [], VIG;
const RENDER = { grain: 0.045 };

function initEngine(canvas) {
  VIEW = canvas; vctx = canvas.getContext('2d', { alpha: false });
  const mk = () => { const k = document.createElement('canvas'); k.width = W; k.height = H; return k; };
  BUF = mk(); bctx = BUF.getContext('2d', { alpha: false });
  CR = mk(); crx = CR.getContext('2d');
  CG = mk(); cgx = CG.getContext('2d');
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
  VIG = mk();
  const v = VIG.getContext('2d'), g = v.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.38)');
  v.fillStyle = g; v.fillRect(0, 0, W, H);
}

// radial chromatic aberration: red channel scaled out, green+blue in place
function postCA(c, amt) {
  crx.globalCompositeOperation = 'copy'; crx.drawImage(BUF, 0, 0);
  crx.globalCompositeOperation = 'multiply'; crx.fillStyle = '#FF0000'; crx.fillRect(0, 0, W, H);
  cgx.globalCompositeOperation = 'copy'; cgx.drawImage(BUF, 0, 0);
  cgx.globalCompositeOperation = 'multiply'; cgx.fillStyle = '#00FFFF'; cgx.fillRect(0, 0, W, H);
  const k = 1 + 0.018 * amt;
  c.save();
  c.globalCompositeOperation = 'copy';
  c.setTransform(k, 0, 0, k, (W - W * k) / 2, (H - H * k) / 2);
  c.drawImage(CR, 0, 0);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'lighter';
  c.drawImage(CG, 0, 0);
  c.restore();
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
    const ca = eventAt(CAS, st);
    if (ca > 0.02) postCA(bctx, ca);
    const fl = eventAt(FLASHES, st);
    if (fl > 0) { bctx.fillStyle = rgba(C.white, fl); bctx.fillRect(0, 0, W, H); }
    vctx.globalAlpha = 1 / (i + 1);
    vctx.drawImage(BUF, 0, 0);
  }
  vctx.globalAlpha = 1;
  if (RENDER.grain > 0) {
    const f = Math.floor(t * FPS + 1e-6);
    const g = GRAIN[f % GRAIN.length];
    const ox = Math.floor(hash(f) * 256), oy = Math.floor(hash(f + 7) * 256);
    vctx.save();
    vctx.globalAlpha = RENDER.grain;
    vctx.globalCompositeOperation = 'overlay';
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) vctx.drawImage(g, x, y);
    vctx.restore();
  }
}
