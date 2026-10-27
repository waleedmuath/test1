'use strict';
/* ==========================================================================
   Faz3at E5tebar reel — engine
   1080×1920 · 60 fps · every pixel is a pure function of time t (seconds),
   so the live player and the offline export produce identical frames.
   ========================================================================== */

const W = 1080, H = 1920, FPS = 60, DUR = 30;
const LANG = (() => {
  try { return new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ar'; } catch (e) { return 'ar'; }
})();
const EN = LANG === 'en', AR = !EN;
const BPM = 120, BEAT = 60 / BPM; // 0.5 s — the whole edit is cut on this grid
const TAU = Math.PI * 2;

const PAL = {
  ink: '#0B0B0C', ink2: '#161618', ink3: '#232326', ink4: '#34343A',
  paper: '#F9F8F6', sand: '#EFEBE6', sand2: '#E3DED7', line: '#D9D3CC', mute: '#8B857D', gray: '#6E6961',
  orange: '#FF5C00', deep: '#C43D00', amber: '#FF8A3D', peach: '#FFC89F', peach2: '#FFE6D3', white: '#FFFFFF'
};
const FONT = {
  d: 'Alexandria, sans-serif',
  mono: '"JetBrains Mono", monospace',
  math: 'KaTeX_Math, serif',
  main: 'KaTeX_Main, serif'
};

/* ---------- reading direction (the Arabic cut is mirrored) ---------- */
const MX = x => (EN ? x : W - x);
const DIR = EN ? 1 : -1;
const AL = EN ? 'left' : 'right';
const M = 90;
const X0 = MX(M);

/* ---------- scalar helpers ---------- */
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a, b, k) => a * (1 - k) + b * k;
const span = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));

// CSS-style cubic-bezier, solved by bisection on x
function curve(x1, y1, x2, y2) {
  const bz = (p1, p2, u) => { const v = 1 - u; return 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u; };
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, u = x;
    for (let k = 0; k < 22; k++) {
      u = (lo + hi) / 2;
      if (bz(x1, x2, u) < x) lo = u; else hi = u;
    }
    return bz(y1, y2, u);
  };
}
const backOut = s => x => { const u = x - 1; return 1 + u * u * ((s + 1) * u + s); };
const Ez = {
  linear: x => x,
  quadIn: x => x * x,
  quadOut: x => x * (2 - x),
  cubicIn: x => x * x * x,
  cubicOut: x => { const u = 1 - x; return 1 - u * u * u; },
  cubicInOut: x => (x < 0.5 ? 4 * x * x * x : 1 - 4 * (1 - x) ** 3),
  quintOut: x => 1 - (1 - x) ** 5,
  quintInOut: x => (x < 0.5 ? 16 * x ** 5 : 1 - 16 * (1 - x) ** 5),
  expoIn: x => (x <= 0 ? 0 : 2 ** (10 * (x - 1))),
  expoOut: x => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  backOut: backOut(1.7),
  backOutHard: backOut(2.6),
  bounceOut: x => {
    // four parabolic arcs, each lower than the last
    const arcs = [[0, 0.3636, 1], [0.3636, 0.7273, 0.25], [0.7273, 0.9091, 0.0625], [0.9091, 1, 0.0156]];
    for (const [a, b, h] of arcs) {
      if (x > b) continue;
      if (a === 0) return (x / b) ** 2;
      const u = (x - (a + b) / 2) / ((b - a) / 2);
      return 1 - h * (1 - u * u);
    }
    return 1;
  },
  kinetic: curve(0.38, 0, 0.08, 1),  // type reveals: quick lift-off, long settle
  glide: curve(0.16, 0.9, 0.1, 1),   // fast entrances
  whip: curve(0.75, 0, 0.25, 1)      // whip pans
};
const tw = (t, a, b, ease = Ez.expoOut) => ease(span(t, a, b));

// damped spring 0 → 1, x in seconds since release
const settle = (x, f = 2.2, d = 6.5) => (x <= 0 ? 0 : 1 - Math.exp(-d * x) * Math.cos(TAU * f * x));
// decaying shake around 0
const jiggle = (x, f = 3, d = 7) => (x <= 0 ? 0 : Math.exp(-d * x) * Math.sin(TAU * f * x));
// exponential decay from 1
const decay = (x, k = 8) => (x < 0 ? 0 : Math.exp(-k * x));

/* ---------- deterministic randomness ---------- */
function seeded(seed) {
  // sfc32, seeded through splitmix32
  let s = seed >>> 0;
  const sm = () => { s = (s + 0x9E3779B9) >>> 0; let z = s; z = Math.imul(z ^ (z >>> 16), 0x85EBCA6B); z = Math.imul(z ^ (z >>> 13), 0xC2B2AE35); return (z ^ (z >>> 16)) >>> 0; };
  let a = sm(), b = sm(), c = sm(), d = sm();
  return () => {
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0; a = b ^ (b >>> 9); b = (c + (c << 3)) >>> 0; c = ((c << 21) | (c >>> 11)) >>> 0; c = (c + t) >>> 0;
    return t / 4294967296;
  };
}
function h1(n) {
  let x = Math.imul((Math.floor(n * 1000) | 0) ^ 0x27D4EB2D, 0x165667B1);
  x = Math.imul(x ^ (x >>> 15), 0x2C1B3C6D);
  x ^= x >>> 12;
  return (x >>> 0) / 4294967296;
}
function vnoise(x) {
  const i = Math.floor(x), f = x - i, k = (1 - Math.cos(f * Math.PI)) / 2;
  return lerp(h1(i), h1(i + 1), k) * 2 - 1;
}

/* ---------- colour ---------- */
const _hex = new Map();
function hexRGB(h) {
  let v = _hex.get(h);
  if (!v) { const n = parseInt(h.slice(1), 16); v = [n >> 16, (n >> 8) & 255, n & 255]; _hex.set(h, v); }
  return v;
}
function blend(a, b, k) {
  const A = hexRGB(a), Bc = hexRGB(b), u = clamp(k);
  return '#' + [0, 1, 2].map(i => Math.round(A[i] + (Bc[i] - A[i]) * u).toString(16).padStart(2, '0')).join('');
}
function alpha(h, a) { const [r, g, b] = hexRGB(h); return `rgba(${r},${g},${b},${clamp(a)})`; }

/* ---------- shapes ---------- */
function paint(c, col) { c.fillStyle = col; c.fillRect(-2 * W, -2 * H, 5 * W, 5 * H); }
function rrect(c, x, y, w, h, r) {
  const left = Math.min(x, x + w), top = Math.min(y, y + h), ww = Math.abs(w), hh = Math.abs(h);
  const cap = v => Math.max(0, Math.min(v, ww / 2, hh / 2));
  c.beginPath();
  c.roundRect(left, top, ww, hh, Array.isArray(r) ? r.map(cap) : cap(r));
}
function slab(c, x, y, w, h, r, col) { if (w > 0 && h > 0) { rrect(c, x, y, w, h, r); c.fillStyle = col; c.fill(); } }
function slabLine(c, x, y, w, h, r, col, lw) { if (w > 0 && h > 0) { rrect(c, x, y, w, h, r); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); } }
function circlePath(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); }
function disc(c, x, y, r, col) { if (r > 0) { circlePath(c, x, y, r); c.fillStyle = col; c.fill(); } }
function hoop(c, x, y, r, col, lw) { if (r > 0) { circlePath(c, x, y, r); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); } }
function arcLine(c, x, y, r, a0, a1, col, lw, cap = 'round') {
  if (r <= 0 || Math.abs(a1 - a0) < 1e-4) return;
  c.beginPath(); c.arc(x, y, r, a0, a1, a1 < a0);
  c.strokeStyle = col; c.lineWidth = lw; c.lineCap = cap; c.stroke();
}
function polyPath(c, pts, close = true) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (close) c.closePath();
}
// stroke a polyline from its start to fraction p of its length
function trace(c, pts, p, col, lw) {
  if (p <= 0) return;
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
  let left = total * clamp(p);
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const k = Math.min(1, left / (seg[i - 1] || 1));
    c.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
    left -= seg[i - 1];
  }
  c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function scaleAt(c, x, y, sx, sy = sx) { c.translate(x, y); c.scale(sx, sy); c.translate(-x, -y); }
function rotateAt(c, x, y, a) { c.translate(x, y); c.rotate(a); c.translate(-x, -y); }
function castShadow(c, col, blur, oy = 0) { c.shadowColor = col; c.shadowBlur = blur; c.shadowOffsetX = 0; c.shadowOffsetY = oy; }
function clearShadow(c) { c.shadowColor = 'rgba(0,0,0,0)'; c.shadowBlur = 0; c.shadowOffsetY = 0; }

/* ---------- type ---------- */
const hasArabic = s => /[؀-ۿ]/.test(s);
function applyFont(c, o, s) {
  const ar = hasArabic(s || '');
  c.font = `${o.it ? 'italic ' : ''}${o.w || 600} ${o.s || 32}px ${o.f || FONT.d}`;
  c.letterSpacing = `${ar ? 0 : o.ls || 0}px`; // tracking would break Arabic joins
  c.direction = o.rtl == null ? (ar ? 'rtl' : 'ltr') : o.rtl ? 'rtl' : 'ltr';
}
function txt(c, s, x, y, o = {}) {
  c.save();
  applyFont(c, o, s);
  c.textAlign = o.a || 'left';
  c.textBaseline = o.bl ?? 'alphabetic';
  if (o.alpha != null) c.globalAlpha *= clamp(o.alpha);
  if (o.stroke) { c.lineJoin = 'round'; c.lineWidth = o.sw || 3; c.strokeStyle = o.stroke; c.strokeText(s, x, y); }
  if (!o.outline) { c.fillStyle = o.c || PAL.ink; c.fillText(s, x, y); }
  c.restore();
}
const _wcache = new Map();
function wOf(c, s, o) {
  const key = [o.w || 600, o.s || 32, o.f || FONT.d, o.ls || 0, o.it ? 1 : 0, s].join('|');
  if (!_wcache.has(key)) { c.save(); applyFont(c, o, s); _wcache.set(key, c.measureText(s).width); c.restore(); }
  return _wcache.get(key);
}
// largest whole size ≤ maxS at which every line fits maxW
function fitType(c, lines, o, maxW, maxS) {
  let s = Math.floor(maxS);
  for (const l of lines) s = Math.min(s, Math.floor((maxW / wOf(c, l, { ...o, s: 100 })) * 100));
  while (s > 8 && lines.some(l => wOf(c, l, { ...o, s }) > maxW)) s--;
  return s;
}
const alignX = (a, x, w) => (a === 'right' ? x - w : a === 'center' ? x - w / 2 : x);

/* Kinetic line: every word rises out of its own mask with a little shear,
   staggered in reading order (right-to-left for Arabic). */
function kLine(c, s, x, y, o, lt, t0, stagger = 0.06, dur = 0.55, ease = Ez.kinetic, out = 0) {
  if (out >= 1) return 0;
  const rtl = hasArabic(s), words = s.split(' ');
  const gap = wOf(c, ' ', o), widths = words.map(w => wOf(c, w, o));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (words.length - 1);
  const left = alignX(o.a || 'left', x, total), sz = o.s;
  let pen = rtl ? left + total : left;
  words.forEach((word, i) => {
    const w = widths[i], wx = rtl ? pen - w : pen;
    pen += (rtl ? -1 : 1) * (w + gap);
    const p = tw(lt, t0 + i * stagger, t0 + i * stagger + dur, ease);
    if (p <= 0) return;
    c.save();
    c.beginPath(); c.rect(wx - sz * 0.3, y - sz * 1.25, w + sz * 0.6, sz * 1.75); c.clip();
    c.translate(wx, y + (1 - p) * sz * 1.4 - out * sz * 1.5);
    c.transform(1, 0, (p - 1) * 0.25 * DIR, 1, 0, 0);
    txt(c, word, 0, 0, { ...o, a: 'left', rtl });
    c.restore();
  });
  return total;
}

/* Chapter tag above each feature headline: "01 ── LEARN" */
function chapterTag(c, n, label, lt, col = PAL.ink, acc = PAL.orange, y = 300) {
  const a = tw(lt, 0, 0.45), b = tw(lt, 0.08, 0.6);
  if (a <= 0) return;
  const num = String(n).padStart(2, '0'), no = { f: FONT.mono, w: 700, s: 28, ls: 3 };
  const nw = wOf(c, num, no), rx = X0 + DIR * (nw + 22), rw = 56 * b;
  c.save();
  c.globalAlpha *= a;
  txt(c, num, X0, y, { ...no, c: acc, a: AL });
  c.fillStyle = acc; c.fillRect(EN ? rx : rx - rw, y - 11, rw, 3);
  const lo = AR ? { f: FONT.d, w: 600, s: 30 } : { f: FONT.mono, w: 600, s: 26, ls: 4 };
  const lx = rx + DIR * 78, lw = wOf(c, label, lo);
  c.beginPath(); c.rect(alignX(AL, lx, lw) - 20, y - 40, lw + 40, 56); c.clip();
  txt(c, label, lx, y + (1 - b) * 44, { ...lo, c: col, a: AL });
  c.restore();
}

/* ---------- KaTeX-style maths (always left-to-right) ----------
   tokens: 'text' upright · {i:'x'} italic · {sup:'2'} superscript · {op:'='} spaced operator */
function mathTokenW(c, t, s) {
  if (typeof t === 'string') return wOf(c, t, { f: FONT.main, w: 400, s });
  if (t.i) return wOf(c, t.i, { f: FONT.math, w: 400, s, it: true }) + s * 0.04;
  if (t.sup) return wOf(c, t.sup, { f: FONT.main, w: 400, s: s * 0.68 }) + s * 0.04;
  if (t.op) return wOf(c, t.op, { f: FONT.main, w: 400, s }) + s * 0.5;
  return 0;
}
const mathW = (c, toks, s) => toks.reduce((a, t) => a + mathTokenW(c, t, s), 0);
function mathDraw(c, toks, x, y, s, col, a = 'left') {
  const w = mathW(c, toks, s);
  let pen = alignX(a, x, w);
  for (const t of toks) {
    if (typeof t === 'string') txt(c, t, pen, y, { f: FONT.main, w: 400, s, c: col, rtl: false });
    else if (t.i) txt(c, t.i, pen, y, { f: FONT.math, w: 400, s, c: col, it: true, rtl: false });
    else if (t.sup) txt(c, t.sup, pen + s * 0.04, y - s * 0.42, { f: FONT.main, w: 400, s: s * 0.68, c: col, rtl: false });
    else if (t.op) txt(c, t.op, pen + s * 0.25, y, { f: FONT.main, w: 400, s, c: col, rtl: false });
    pen += mathTokenW(c, t, s);
  }
  return w;
}

/* ---------- brand marks, measured from the supplied artwork (100-unit box) ---------- */
// Faz3at E5tebar app icon
const FZG = {
  r: 23,
  check: [[43.0, 47.4], [47.9, 52.4], [57.3, 42.6]],
  dot: { x: 83.05, y: 16.9, r: 8.3, ring: 1.5 }
};
function bookmarkPath(c) {
  // inset outline; the round-join stroke below restores the soft corners
  const r = 5.8;
  c.beginPath();
  c.moveTo(31.8, 28.8 + r);
  c.arcTo(31.8, 28.8, 31.8 + r, 28.8, r);
  c.lineTo(68.4 - r, 28.8);
  c.arcTo(68.4, 28.8, 68.4, 28.8 + r, r);
  c.lineTo(68.4, 68.5); c.lineTo(50.1, 59.6); c.lineTo(31.8, 68.5);
  c.closePath();
}
/* o: sq 0–1 tile scale · book 0–1 unroll · check 0–1 draw · dot 0–1 pop · glint 0–1 sweep · bg/fg colours · shadow */
function fazIcon(c, cx, cy, size, o = {}) {
  const sq = o.sq ?? 1, bk = o.book ?? 1, ck = o.check ?? 1, dt = o.dot ?? 1;
  const bg = o.bg || PAL.orange, fg = o.fg || PAL.paper;
  c.save();
  c.translate(cx - size / 2, cy - size / 2);
  c.scale(size / 100, size / 100);
  if (sq > 0) {
    c.save();
    scaleAt(c, 50, 50, sq);
    if (o.shadow) castShadow(c, o.shadow, 40, 18);
    rrect(c, 0, 0, 100, 100, FZG.r); c.fillStyle = bg; c.fill();
    clearShadow(c);
    c.clip();
    if (bk > 0) {
      c.save();
      c.beginPath(); c.rect(0, 0, 100, lerp(28, 72, bk)); c.clip();
      c.translate(0, (bk - 1) * 6);
      bookmarkPath(c);
      c.fillStyle = fg; c.fill();
      c.lineJoin = 'round'; c.lineWidth = 2.4; c.strokeStyle = fg; c.stroke();
      c.restore();
    }
    if (ck > 0) trace(c, FZG.check, ck, bg, 5.5);
    if (o.glint > 0 && o.glint < 1) {
      const gx = lerp(-60, 160, o.glint), g = c.createLinearGradient(gx - 30, 0, gx + 30, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.save(); c.globalCompositeOperation = 'overlay'; c.fillStyle = g; c.transform(1, 0, -0.35, 1, 0, 0); c.fillRect(-100, 0, 300, 100); c.restore();
    }
    c.restore();
  }
  if (dt > 0) {
    const d = FZG.dot, r = d.r * dt;
    disc(c, d.x, d.y, r + d.ring / 2, o.ring || PAL.ink);
    disc(c, d.x, d.y, r - d.ring / 2, PAL.peach);
  }
  c.restore();
}
// JoFunction monogram: stem, top bar, middle bar and hook, with round caps
const JFG = {
  r: 25,
  stem: [44.2, 23.3, 55.7, 75.5],
  bars: [
    { x0: 44.2, x1: 75.5, y0: 23.3, y1: 34.9, cap: 'right' },
    { x0: 44.2, x1: 66.7, y0: 46.4, y1: 57.8, cap: 'right' },
    { x0: 18.8, x1: 55.7, y0: 63.9, y1: 75.5, cap: 'left' }
  ]
};
function jfIcon(c, cx, cy, size, o = {}) {
  c.save();
  c.translate(cx - size / 2, cy - size / 2);
  c.scale(size / 100, size / 100);
  if (o.bg !== null) { rrect(c, 0, 0, 100, 100, JFG.r); c.fillStyle = o.bg || PAL.orange; c.fill(); }
  c.fillStyle = o.fg || PAL.ink;
  const [sx0, sy0, sx1, sy1] = JFG.stem;
  c.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
  for (const b of JFG.bars) {
    const r = (b.y1 - b.y0) / 2;
    c.beginPath();
    c.roundRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, b.cap === 'right' ? [0, r, r, 0] : [r, 0, 0, r]);
    c.fill();
  }
  c.restore();
}
// "by [icon] JoFunction", centred on x; Arabic reads "من [icon] JoFunction" right to left
function jfSign(c, x, y, s, col, p = 1, pre = EN ? 'by' : 'من') {
  if (p <= 0) return;
  const o1 = { f: FONT.d, w: 500, s: s * 0.6 }, o2 = { f: FONT.d, w: 700, s: s * 0.72, ls: -0.5 };
  const parts = [['pre', wOf(c, pre, o1)], ['gap', s * 0.3], ['icon', s], ['gap', s * 0.26], ['name', wOf(c, 'JoFunction', o2)]];
  if (AR) parts.reverse();
  let pen = x - parts.reduce((a, q) => a + q[1], 0) / 2;
  c.save();
  c.globalAlpha *= p;
  for (const [k, w] of parts) {
    if (k === 'pre') txt(c, pre, pen, y + s * 0.2, { ...o1, c: col, rtl: false });
    if (k === 'icon') jfIcon(c, pen + s / 2, y, s);
    if (k === 'name') txt(c, 'JoFunction', pen, y + s * 0.25, { ...o2, c: col, rtl: false });
    pen += w;
  }
  c.restore();
}

/* ---------- line icons, drawn in a 100-unit box ---------- */
function glyph(c, name, cx, cy, size, col, lw = 7, t = 0) {
  c.save();
  c.translate(cx - size / 2, cy - size / 2);
  c.scale(size / 100, size / 100);
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  const st = () => c.stroke();
  const seg = (...p) => { c.beginPath(); for (let i = 0; i < p.length; i += 4) { c.moveTo(p[i], p[i + 1]); c.lineTo(p[i + 2], p[i + 3]); } st(); };
  switch (name) {
    case 'check': polyPath(c, [[24, 52], [42, 70], [77, 32]], false); st(); break;
    case 'x': seg(28, 28, 72, 72, 72, 28, 28, 72); break;
    case 'star': {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 19 : 40; pts.push([50 + Math.cos(a) * r, 54 + Math.sin(a) * r]); }
      polyPath(c, pts); c.fill(); c.lineWidth = lw * 0.6; st(); break;
    }
    case 'book': rrect(c, 18, 20, 64, 62, 8); st(); seg(50, 22, 50, 80, 28, 38, 40, 38, 60, 38, 72, 38); break;
    case 'pencil': rotateAt(c, 50, 50, -Math.PI / 4); rrect(c, 40, 12, 20, 62, 4); st(); polyPath(c, [[40, 74], [50, 90], [60, 74]], false); st(); seg(40, 26, 60, 26); break;
    case 'crown': polyPath(c, [[16, 72], [20, 32], [36, 50], [50, 24], [64, 50], [80, 32], [84, 72]]); c.fill(); c.lineWidth = lw * 0.8; st(); slab(c, 16, 76, 68, 10, 4, col); break;
    case 'lock': rrect(c, 24, 44, 52, 42, 8); st(); c.beginPath(); c.moveTo(34, 44); c.lineTo(34, 32); c.arc(50, 32, 16, Math.PI, 0); c.lineTo(66, 44); st(); break;
    case 'calc': rrect(c, 22, 12, 56, 76, 10); st(); rrect(c, 32, 22, 36, 14, 3); st(); for (let i = 0; i < 9; i++) disc(c, 36 + (i % 3) * 14, 50 + Math.floor(i / 3) * 12, 3.6, col); break;
    case 'board': rrect(c, 12, 18, 76, 52, 6); st(); seg(36, 70, 28, 88, 64, 70, 72, 88);
      c.beginPath(); c.moveTo(24, 50); c.bezierCurveTo(34, 30 + 8 * Math.sin(t * 6), 46, 58, 58, 38); c.lineTo(76, 32); st(); break;
    case 'note': polyPath(c, [[24, 12], [62, 12], [78, 28], [78, 88], [24, 88]]); st(); polyPath(c, [[62, 12], [62, 28], [78, 28]], false); st(); seg(34, 44, 68, 44, 34, 58, 68, 58, 34, 72, 54, 72); break;
    case 'timer': { circlePath(c, 50, 55, 32); st(); seg(42, 13, 58, 13, 50, 13, 50, 23); const a = -Math.PI / 2 + t * TAU; seg(50, 55, 50 + Math.cos(a) * 20, 55 + Math.sin(a) * 20); break; }
    case 'todo': for (let i = 0; i < 3; i++) { const y = 24 + i * 26; rrect(c, 14, y - 9, 18, 18, 4); st(); seg(44, y, 86, y); }
      polyPath(c, [[17, 24], [22, 29], [30, 19]], false); st(); polyPath(c, [[17, 50], [22, 55], [30, 45]], false); st(); break;
    case 'convert': seg(18, 36, 80, 36, 82, 66, 20, 66); polyPath(c, [[66, 22], [80, 36], [66, 50]], false); st(); polyPath(c, [[34, 52], [20, 66], [34, 80]], false); st(); break;
    case 'atom': rrect(c, 16, 16, 68, 68, 10); st(); txt(c, 'H', 50, 66, { f: FONT.d, w: 800, s: 44, c: col, a: 'center', rtl: false }); txt(c, '1', 26, 34, { f: FONT.mono, w: 700, s: 14, c: col, rtl: false }); break;
    case 'cap': polyPath(c, [[50, 22], [90, 40], [50, 58], [10, 40]]); st(); c.beginPath(); c.moveTo(28, 48); c.lineTo(28, 68); c.quadraticCurveTo(50, 82, 72, 68); c.lineTo(72, 48); st(); seg(86, 42, 86, 66); break;
    case 'code': polyPath(c, [[34, 30], [14, 50], [34, 70]], false); st(); polyPath(c, [[66, 30], [86, 50], [66, 70]], false); st(); seg(56, 24, 44, 76); break;
    case 'library': for (let i = 0; i < 3; i++) { rrect(c, 16 + i * 22, i === 2 ? 24 : 18, 16, i === 2 ? 60 : 66, 3); st(); } break;
    case 'calendar': rrect(c, 14, 20, 72, 66, 8); st(); seg(14, 38, 86, 38, 32, 12, 32, 26, 68, 12, 68, 26); for (let i = 0; i < 6; i++) slab(c, 26 + (i % 3) * 18, 50 + Math.floor(i / 3) * 16, 10, 8, 2, col); break;
    case 'bell': c.beginPath(); c.moveTo(24, 70); c.lineTo(24, 46); c.bezierCurveTo(24, 26, 36, 18, 50, 18); c.bezierCurveTo(64, 18, 76, 26, 76, 46); c.lineTo(76, 70); c.closePath(); c.moveTo(16, 70); c.lineTo(84, 70); st(); c.beginPath(); c.arc(50, 76, 8, 0, Math.PI); st(); break;
    case 'heart': heartShape(c, 50, 54, 40); c.fill(); break;
    case 'flame': flameShape(c, 50, 56, 44, t); c.fill(); break;
  }
  c.restore();
}
function heartShape(c, cx, cy, s) {
  const k = s / 40, P = (x, y) => [cx + x * k, cy + y * k];
  c.beginPath();
  c.moveTo(...P(0, 26));
  c.bezierCurveTo(...P(-6, 20), ...P(-40, 2), ...P(-40, -18));
  c.bezierCurveTo(...P(-40, -34), ...P(-26, -42), ...P(-16, -42));
  c.bezierCurveTo(...P(-6, -42), ...P(0, -34), ...P(0, -28));
  c.bezierCurveTo(...P(0, -34), ...P(6, -42), ...P(16, -42));
  c.bezierCurveTo(...P(26, -42), ...P(40, -34), ...P(40, -18));
  c.bezierCurveTo(...P(40, 2), ...P(6, 20), ...P(0, 26));
  c.closePath();
}
function flameShape(c, cx, cy, s, t = 0) {
  const k = s / 44, a = vnoise(t * 7) * 4, b = vnoise(t * 9 + 40) * 5, P = (x, y) => [cx + x * k, cy + y * k];
  c.beginPath();
  c.moveTo(...P(0, 40));
  c.bezierCurveTo(...P(-26, 40), ...P(-34, 18), ...P(-30, 2));
  c.bezierCurveTo(...P(-26, -14), ...P(-12, -18), ...P(-10 + a, -34));
  c.bezierCurveTo(...P(2, -26), ...P(4, -14), ...P(2, -6));
  c.bezierCurveTo(...P(10, -14), ...P(12 + b, -30), ...P(8 + b, -46));
  c.bezierCurveTo(...P(30, -30), ...P(36, 0), ...P(30, 16));
  c.bezierCurveTo(...P(26, 32), ...P(14, 40), ...P(0, 40));
  c.closePath();
}

/* ---------- effects ---------- */
// confetti burst with drag + gravity, deterministic in local time
function burst(c, x, y, lt, o = {}) {
  const life = o.life || 1.6;
  if (lt < 0 || lt > life) return;
  const rnd = seeded(o.seed || 7), cols = o.cols || [PAL.orange, PAL.peach, PAL.paper, PAL.amber];
  const n = o.n || 40, g = o.g ?? 520, speed = o.speed || 1300, spread = o.spread ?? TAU, dir = o.dir ?? -Math.PI / 2;
  const fade = 1 - span(lt, life * 0.6, life);
  for (let i = 0; i < n; i++) {
    const ang = dir + (rnd() - 0.5) * spread, v = speed * (0.35 + rnd() * 0.75), drag = 1.6 + rnd() * 1.4;
    const tt = lt * (0.9 + rnd() * 0.2), k = (1 - Math.exp(-drag * tt)) / drag;
    const px = x + Math.cos(ang) * v * k + vnoise(i * 3.3 + tt * 2) * 30 * tt;
    const py = y + Math.sin(ang) * v * k + g * tt * tt;
    const col = cols[Math.floor(rnd() * cols.length)], shape = rnd(), sz = (o.size || 16) * (0.6 + rnd() * 0.8);
    const rot = rnd() * TAU + tt * (rnd() - 0.5) * 18, flip = Math.cos(tt * (6 + rnd() * 10));
    c.save();
    c.globalAlpha *= fade;
    c.translate(px, py); c.rotate(rot); c.scale(1, flip);
    c.fillStyle = col;
    if (shape < 0.45) c.fillRect(-sz / 2, -sz * 0.3, sz, sz * 0.6);
    else if (shape < 0.8) { circlePath(c, 0, 0, sz * 0.38); c.fill(); }
    else { polyPath(c, [[0, -sz / 2], [sz * 0.45, sz * 0.4], [-sz * 0.45, sz * 0.4]]); c.fill(); }
    c.restore();
  }
}
// expanding shockwave ring
function shock(c, x, y, lt, r0, r1, col, lw = 6, dur = 0.6) {
  if (lt < 0 || lt > dur) return;
  const p = Ez.cubicOut(lt / dur);
  c.save(); c.globalAlpha *= 1 - p;
  hoop(c, x, y, lerp(r0, r1, p), col, lw * (1 - 0.7 * p));
  c.restore();
}
// radiating spark strokes
function spikes(c, x, y, lt, r0, r1, col, n = 8, lw = 6, dur = 0.45, rot = 0) {
  if (lt < 0 || lt > dur) return;
  const p = Ez.cubicOut(lt / dur), head = lerp(r0, r1, Math.min(1, p * 1.6 + 0.15)), tail = Math.min(lerp(r0, r1, p), head);
  c.save(); c.strokeStyle = col; c.lineWidth = lw * (1 - 0.6 * p); c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU, ca = Math.cos(a), sa = Math.sin(a);
    c.moveTo(x + ca * tail, y + sa * tail); c.lineTo(x + ca * head, y + sa * head);
  }
  c.stroke(); c.restore();
}
// chunky pressable button: a darker lip under a face that sinks when pressed
function pressable(c, x, y, w, h, r, face, lip, depth = 12, press = 0) {
  slab(c, x, y + depth, w, h, r, lip);
  slab(c, x, y + depth * press, w, h, r, face);
}
// floating "+10 XP" tag
function xpTag(c, x, y, lt, label = '+10 XP', bg = PAL.orange, fg = PAL.paper, s = 30) {
  if (lt < 0 || lt > 0.9) return;
  const k = Ez.backOutHard(span(lt, 0, 0.3)), fade = 1 - span(lt, 0.6, 0.9);
  const o = { f: FONT.d, w: 800, s, rtl: false }, w = wOf(c, label, o) + s, h = s * 1.6;
  c.save(); c.globalAlpha *= fade;
  c.translate(x, y - lt * 90); c.scale(k, k);
  slab(c, -w / 2, -h / 2, w, h, h / 2, bg);
  txt(c, label, 0, s * 0.36, { ...o, c: fg, a: 'center' });
  c.restore();
}
// finger-tap indicator: approach, press, release ripple
function tapMark(c, x, y, lt) {
  if (lt < -0.25 || lt > 0.5) return;
  const a = lt < 0 ? tw(lt, -0.25, -0.05, Ez.cubicOut) : 1 - span(lt, 0.15, 0.5);
  const s = lt < 0 ? lerp(1.25, 1, tw(lt, -0.25, 0)) : lerp(1, 0.86, tw(lt, 0, 0.08)) + 0.14 * tw(lt, 0.08, 0.3);
  c.save(); c.globalAlpha *= a;
  disc(c, x, y, 34 * s, alpha(PAL.ink, 0.18));
  hoop(c, x, y, 34 * s, alpha(PAL.white, 0.9), 4);
  c.restore();
  if (lt >= 0) shock(c, x, y, lt, 30, 90, PAL.white, 5, 0.45);
}
function bloom(c, x, y, r, col, a) {
  if (a <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, alpha(col, a)); g.addColorStop(1, alpha(col, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
}
function dotField(c, col, a, step = 54, ox = 0, oy = 0, r = 2.2) {
  if (a <= 0) return;
  const sx = ((ox % step) + step) % step, sy = ((oy % step) + step) % step;
  c.save(); c.globalAlpha *= a; c.fillStyle = col;
  c.beginPath();
  for (let y = sy - step; y < H + step; y += step) for (let x = sx - step; x < W + step; x += step) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
  c.fill(); c.restore();
}

/* ---------- the edit: shots + transitions ---------- */
const SHOTS = [];
function shot(id, t0, t1, draw, opt = {}) { SHOTS.push({ id, t0, t1, draw, ...opt }); }

// masks reveal the incoming shot; p is eased 0 → 1
const REVEAL = {
  iris(c, p, tr) {
    const x = tr.x ?? W / 2, y = tr.y ?? H / 2;
    const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([a, b]) => Math.hypot(a - x, b - y)));
    circlePath(c, x, y, far * p * 1.02); c.clip();
  },
  blinds(c, p, tr) {
    const n = tr.n || 6, lag = tr.st ?? 0.5, cw = W / n;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const k = EN ? i : n - 1 - i, q = Ez.cubicInOut(clamp((p - (lag * k) / (n - 1)) / (1 - lag)));
      if (q > 0) c.rect(i * cw - 1, i % 2 ? H * (1 - q) : 0, cw + 2, H * q);
    }
    c.clip();
  },
  wipe(c, p, tr) {
    // a half-plane whose edge travels across the frame along the given heading
    const rad = (tr.angle || 0) * (Math.PI / 180);
    const half = (Math.abs(Math.cos(rad)) * W + Math.abs(Math.sin(rad)) * H) / 2 + 60;
    c.save();
    c.translate(W / 2, H / 2); c.rotate(rad);
    c.beginPath(); c.rect(-4 * H, -4 * H, 4 * H + (2 * p - 1) * half, 8 * H);
    c.restore();
    c.clip();
  },
  wave(c, p) {
    const y0 = lerp(H + 160, -200, p), amp = 70 * Math.sin(p * Math.PI), ph = p * 9;
    c.beginPath(); c.moveTo(-10, H + 10);
    for (let x = -10; x <= W + 10; x += 20) c.lineTo(x, y0 + Math.sin(x / 170 + ph) * amp + Math.sin(x / 70 - ph * 1.3) * amp * 0.25);
    c.lineTo(W + 10, H + 10); c.closePath(); c.clip();
  }
};
function transition(c, tr, p, prev, next) {
  if (tr.type === 'push') {
    // whip pan: both shots travel together; motion blur sells the speed
    const e = Ez.whip(p), a = ((tr.angle ?? -90) * Math.PI) / 180;
    const dx = Math.cos(a), dy = Math.sin(a), dist = Math.abs(dx) * W + Math.abs(dy) * H;
    for (const [fn, k] of [[prev, e], [next, e - 1]]) {
      c.save(); c.translate(dx * dist * k, dy * dist * k);
      c.beginPath(); c.rect(0, 0, W, H); c.clip();
      fn(); c.restore();
    }
    return;
  }
  if (tr.type === 'card') {
    // outgoing shot shrinks into a card and is flicked away
    next();
    const e1 = Ez.cubicInOut(clamp(p / 0.55)), e2 = Ez.cubicIn(clamp((p - 0.4) / 0.6)), s = lerp(1, 0.78, e1);
    c.save();
    c.translate(W / 2 - DIR * e2 * W * 0.15, H / 2 - e2 * H * 1.05);
    c.rotate(-DIR * 0.08 * e2);
    c.scale(s, s);
    castShadow(c, 'rgba(0,0,0,0.35)', 80 * e1, 40 * e1);
    rrect(c, -W / 2, -H / 2, W, H, (70 * e1) / s); c.fillStyle = PAL.ink; c.fill();
    clearShadow(c);
    c.clip();
    c.translate(-W / 2, -H / 2);
    prev();
    c.restore();
    return;
  }
  prev();
  const layers = [...(tr.layers || []), null], lag = tr.lag ?? 0.14, run = 1 - lag * (layers.length - 1);
  layers.forEach((col, k) => {
    const q = clamp((p - lag * k) / run);
    if (q <= 0) return;
    c.save();
    REVEAL[tr.type](c, (tr.ease || Ez.cubicInOut)(q), tr);
    if (col) paint(c, col); else next();
    c.restore();
  });
}
function shotAt(t) {
  let j = 0;
  SHOTS.forEach((s, i) => { if (t >= s.t0 - (s.tr ? s.tr.pre : 0)) j = i; });
  return j;
}
function world(c, t) {
  const j = shotAt(t), s = SHOTS[j], tr = s.tr;
  const run = sh => () => { c.save(); sh.draw(c, t - sh.t0, t); c.restore(); };
  if (tr && j > 0 && t < s.t0 + tr.post) {
    const a = s.t0 - tr.pre, b = s.t0 + tr.post;
    transition(c, tr, (t - a) / (b - a), run(SHOTS[j - 1]), run(s));
    return;
  }
  run(s)();
}

/* camera jolts, RGB split and flashes, each {t, amp, dur} */
const JOLTS = [], SPLITS = [], FLARES = [];
function joltAt(t) {
  let x = 0, y = 0, r = 0;
  for (const j of JOLTS) {
    const d = t - j.t;
    if (d < 0 || d > j.dur) continue;
    const k = j.amp * (1 - d / j.dur) ** 2, f = j.f || 30;
    x += vnoise(d * f + j.t * 10) * k;
    y += vnoise(d * f + 50 + j.t * 10) * k;
    r += vnoise(d * f * 0.7 + 99) * k * 0.0012;
  }
  return { x, y, r };
}
function envAt(list, t) {
  return list.reduce((m, e) => { const d = t - e.t; return d >= 0 && d < e.dur ? Math.max(m, e.amp * (1 - d / e.dur) ** 1.5) : m; }, 0);
}

/* ---------- renderer ---------- */
let OUTC, outx, SUB, subx, RED, redx, CYAN, cyanx;
const GRAIN = [];
const OPTS = { grain: 0.05 };
function boot(canvas) {
  const make = () => { const k = document.createElement('canvas'); k.width = W; k.height = H; return k; };
  OUTC = canvas; outx = canvas.getContext('2d', { alpha: false });
  SUB = make(); subx = SUB.getContext('2d', { alpha: false });
  RED = make(); redx = RED.getContext('2d');
  CYAN = make(); cyanx = CYAN.getContext('2d');
  // four 256² tiles of soft monochrome grain
  const rnd = seeded(4242);
  while (GRAIN.length < 4) {
    const tile = document.createElement('canvas'); tile.width = tile.height = 256;
    const g = tile.getContext('2d'), img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.round(((rnd() + rnd() + rnd()) / 3) * 255);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    GRAIN.push(tile);
  }
}
// lens-style RGB split: red channel scaled outward, green+blue in place
function rgbSplit(c, amt) {
  for (const [ctx, tint] of [[redx, '#FF0000'], [cyanx, '#00FFFF']]) {
    ctx.globalCompositeOperation = 'copy'; ctx.drawImage(SUB, 0, 0);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H);
  }
  const k = 1 + 0.018 * amt;
  c.save();
  c.globalCompositeOperation = 'copy';
  c.setTransform(k, 0, 0, k, (W - W * k) / 2, (H - H * k) / 2);
  c.drawImage(RED, 0, 0);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'lighter';
  c.drawImage(CYAN, 0, 0);
  c.restore();
}
// one output frame = running average of `samples` sub-frames across a 180° shutter
function frame(t, samples = 1) {
  for (let s = 0; s < samples; s++) {
    const st = samples > 1 ? t + ((s + 0.5) / samples - 0.5) * (0.5 / FPS) : t;
    subx.save();
    subx.setTransform(1, 0, 0, 1, 0, 0);
    const j = joltAt(st);
    if (j.x || j.y) { subx.translate(W / 2 + j.x, H / 2 + j.y); subx.rotate(j.r); subx.translate(-W / 2, -H / 2); }
    world(subx, st);
    subx.restore();
    const split = envAt(SPLITS, st);
    if (split > 0.02) rgbSplit(subx, split);
    const flare = envAt(FLARES, st);
    if (flare > 0) { subx.fillStyle = alpha(PAL.white, flare); subx.fillRect(0, 0, W, H); }
    outx.globalAlpha = 1 / (s + 1);
    outx.drawImage(SUB, 0, 0);
  }
  outx.globalAlpha = 1;
  if (OPTS.grain > 0) {
    const f = Math.round(t * FPS), tile = GRAIN[f % GRAIN.length];
    const ox = Math.floor(h1(f + 0.5) * 256), oy = Math.floor(h1(f + 0.25) * 256);
    outx.save();
    outx.globalAlpha = OPTS.grain;
    outx.globalCompositeOperation = 'soft-light';
    for (let y = -oy; y < H; y += 256) for (let x = -ox; x < W; x += 256) outx.drawImage(tile, x, y);
    outx.restore();
  }
}
