// 2D drawing kit: brand typography, cached type sprites (script-agnostic kinetic type),
// draw-on line icons (the site's own icon language), and the JoFunction mark.
import { F, AR, C } from './config.js';
import { clamp, lerp, rgba } from './util.js';

/* ---------------- type ---------------- */
export function setFont(g, o) {
  g.font = `${o.w || 600} ${o.s || 40}px ${o.f || F.display}`;
  g.letterSpacing = (o.ls || 0) + 'px';
  g.direction = o.rtl ?? AR ? 'rtl' : 'ltr';
}
export function text(g, s, x, y, o = {}) {
  g.save();
  setFont(g, o);
  g.fillStyle = o.c || C.cream;
  g.textAlign = o.a || 'left';
  g.textBaseline = o.bl || 'alphabetic';
  if (o.alpha != null) g.globalAlpha *= clamp(o.alpha);
  g.fillText(s, x, y);
  g.restore();
}
const _m = new Map();
let _mg = null;
export function measure(s, o) {
  const k = `${o.w}|${o.s}|${o.f}|${o.ls}|${o.rtl}|${s}`;
  let v = _m.get(k);
  if (v === undefined) {
    if (!_mg) _mg = document.createElement('canvas').getContext('2d');
    setFont(_mg, o);
    v = _mg.measureText(s).width;
    _m.set(k, v);
  }
  return v;
}
export const clearMeasure = () => _m.clear();
export function fit(lines, o, maxW, maxS) {
  let w = 0;
  for (const l of lines) w = Math.max(w, measure(l, { ...o, s: 100 }));
  let s = Math.min(maxS, (maxW / w) * 100);
  while (s > 8 && Math.max(...lines.map(l => measure(l, { ...o, s }))) > maxW) s -= 1;
  return s;
}

// A rendered line of type as an image, so any effect works on Arabic and Latin alike.
const _sp = new Map();
export function sprite(s, o) {
  const k = `${o.w}|${o.s}|${o.f}|${o.ls}|${o.c}|${o.rtl}|${s}`;
  let sp = _sp.get(k);
  if (sp) return sp;
  const w = Math.ceil(measure(s, o)), pad = Math.ceil(o.s * 0.35), h = Math.ceil(o.s * 1.75), base = Math.ceil(o.s * 1.2);
  const cv = document.createElement('canvas');
  cv.width = w + pad * 2; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true });
  setFont(g, o);
  g.fillStyle = o.c || C.cream;
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  if (g.direction === 'rtl') { g.textAlign = 'right'; g.fillText(s, pad + w, base); } else g.fillText(s, pad, base);
  sp = { cv, w, h, pad, base };
  _sp.set(k, sp);
  return sp;
}
// draw a sprite so that its text box sits at (x, baseline y) with alignment a
export function spriteXY(sp, x, y, a = 'left') {
  const left = a === 'right' ? x - sp.w : a === 'center' ? x - sp.w / 2 : x;
  return { x: left - sp.pad, y: y - sp.base, cx: left + sp.w / 2, cy: y - sp.base * 0.4 };
}

/* ---------------- line icons (24-unit grid, 1.6 stroke — same language as jofunction.com) ---------------- */
export const ICONS = {
  // the site's own platform icons
  spark: ['M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z', 'M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z'],
  house: ['M4 20V10l8-6 8 6v10', 'M14.2 13a2.2 2.2 0 1 1-4.4 0a2.2 2.2 0 1 1 4.4 0', 'M12 15.2V20M8 20h8'],
  bag: ['M5 8h14l-1 12H6z', 'M9 8V6.5a3 3 0 0 1 6 0V8'],
  mega: ['M4 9.5h3.2L12 5.5v13l-4.8-4H4z', 'M15.5 9a4.2 4.2 0 0 1 0 6', 'M18.2 6.5a8 8 0 0 1 0 11'],
  cap: ['M2.5 9 12 4.5 21.5 9 12 13.5z', 'M6.5 11v4.5c1.5 1.4 3.4 2 5.5 2s4-.6 5.5-2V11'],
  pulse: ['M3 12h4l2.5-6 4 12 2.5-6H21'],
  // service icons drawn in the same style
  web: ['M3 5h18v14H3z', 'M3 8.8h18', 'M5.4 6.9h.2M7.4 6.9h.2M9.4 6.9h.2', 'M6 12.3h6.5M6 15.3h4', 'M15 11.8h3.4v4.2H15z'],
  mobile: ['M8 2.8h8a1.6 1.6 0 0 1 1.6 1.6v15.2a1.6 1.6 0 0 1-1.6 1.6H8a1.6 1.6 0 0 1-1.6-1.6V4.4A1.6 1.6 0 0 1 8 2.8z', 'M10.6 5.4h2.8', 'M13.8 13.2a1.8 1.8 0 1 1-3.6 0a1.8 1.8 0 1 1 3.6 0', 'M15.4 13.2a3.4 3.4 0 1 1-6.8 0a3.4 3.4 0 1 1 6.8 0'],
  cart: ['M5 8h14l-1 12H6z', 'M9 8V6.5a3 3 0 0 1 6 0V8', 'M8.6 16.4l2.4-2.6 2 1.6 2.8-3.4', 'M14.2 12h1.6v1.6'],
  dash: ['M3.5 4.5h17v15h-17z', 'M3.5 8.6h17', 'M9.6 8.6v10.9', 'M5.6 11.6h2M5.6 14.2h2M5.6 16.8h2', 'M12 16.8l2.4-2.8 2 1.6 2.6-3.4'],
  tree: ['M13.6 5a1.6 1.6 0 1 1-3.2 0a1.6 1.6 0 1 1 3.2 0', 'M12 6.6v3.2', 'M12 9.8L6.5 14M12 9.8l5.5 4.2', 'M8.1 15.6a1.6 1.6 0 1 1-3.2 0a1.6 1.6 0 1 1 3.2 0', 'M19.1 15.6a1.6 1.6 0 1 1-3.2 0a1.6 1.6 0 1 1 3.2 0', 'M17.5 17.2v3.3M16 19l1.5 1.5L19 19'],
  arm: ['M3.5 20.5h10', 'M8.5 20.5v-3', 'M10.1 16a1.6 1.6 0 1 1-3.2 0a1.6 1.6 0 1 1 3.2 0', 'M9.6 14.8l4.4-4.6', 'M16.6 9.3a1.6 1.6 0 1 1-3.2 0a1.6 1.6 0 1 1 3.2 0', 'M16.6 9.3h3', 'M19.6 7.2v4.2M19.6 7.2h1.2M19.6 11.4h1.2'],
  mark: ['M5 5h14v14H5z', 'M5 5l14 14', 'M17 12a5 5 0 1 1-10 0a5 5 0 1 1 10 0', 'M12 3v18M3 12h18'],
  curve: ['M4 19C9.5 19 9.5 5 20 5', 'M4 19h5.2M20 5h-5.2', 'M4 17.3l1.7 1.7L4 20.7 2.3 19z', 'M20 3.3l1.7 1.7L20 6.7 18.3 5z'],
  chat: ['M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.2 3.2a.5.5 0 0 1-.8-.4v-2.8h-.5a1 1 0 0 1-1-1z', 'M12 13.4l-2.3-2.2a1.35 1.35 0 0 1 2.3-1.7 1.35 1.35 0 0 1 2.3 1.7z'],
  shield: ['M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z', 'M8.8 12.2l2.2 2.2 4.4-4.6']
};
const _len = new Map();
function plen(d) {
  let v = _len.get(d);
  if (v === undefined) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d);
    v = p.getTotalLength();
    _len.set(d, v);
  }
  return v;
}
const _p2d = new Map();
const P2 = d => { let p = _p2d.get(d); if (!p) { p = new Path2D(d); _p2d.set(d, p); } return p; };

// draw icon `name` centred at (x,y) with size `size` px; p = draw-on progress 0..1 (paths stagger)
export function icon(g, name, x, y, size, p = 1, o = {}) {
  const paths = ICONS[name];
  if (!paths) return;
  const k = size / 24;
  g.save();
  g.translate(x - size / 2, y - size / 2);
  g.scale(k, k);
  g.lineWidth = o.lw || 1.6;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = o.c || C.cream;
  if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = 18 / k; }
  const n = paths.length;
  paths.forEach((d, i) => {
    const q = clamp((p * (1 + 0.35 * (n - 1)) - i * 0.35));
    if (q <= 0) return;
    const L = plen(d);
    g.setLineDash(q >= 1 ? [] : [L * q, L + 1]);
    g.stroke(P2(d));
  });
  g.restore();
}

/* ---------------- the JoFunction mark (from /icon.svg) ---------------- */
// polyline in 1024 units; stroke 73, round caps, mitre joins
export const MARK = {
  a: [[636.5, 380.5], [511.5, 380.5], [511.5, 636.5], [351.5, 636.5]],
  b: [[511.5, 526.5], [581.5, 526.5]],
  r: 245.76, sw: 73
};
const segLen = pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
MARK.la = segLen(MARK.a);
MARK.lb = segLen(MARK.b);
export function pointAt(pts, d) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0);
    if (d <= L || i === pts.length - 1) { const t = clamp(d / L); return [lerp(x0, x1, t), lerp(y0, y1, t)]; }
    d -= L;
  }
  return pts[pts.length - 1];
}
// draw the mark centred at (cx,cy) with box size `size`.
// o.box: 0..1 square scale, o.a / o.b: stroke progress, o.boxCol, o.ink, o.spark: glowing head
export function mark(g, cx, cy, size, o = {}) {
  const k = size / 1024;
  g.save();
  g.translate(cx - size / 2, cy - size / 2);
  g.scale(k, k);
  const bs = o.box ?? 1;
  if (bs > 0) {
    g.save();
    g.translate(512, 512); g.scale(bs, bs); g.translate(-512, -512);
    g.beginPath(); g.roundRect(0, 0, 1024, 1024, MARK.r * (o.rr ?? 1));
    g.fillStyle = o.boxCol || C.fn;
    if (o.boxGlow) { g.shadowColor = rgba(C.fn, 0.9); g.shadowBlur = o.boxGlow / k; }
    g.fill();
    g.restore();
  }
  g.lineWidth = MARK.sw * (o.swk ?? 1);
  g.lineCap = 'round';
  g.lineJoin = 'miter';
  g.strokeStyle = o.ink || C.ink;
  const seg = (pts, L, p) => {
    if (p <= 0) return;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.setLineDash(p >= 1 ? [] : [L * p, L + 10]);
    g.stroke();
  };
  seg(MARK.a, MARK.la, o.a ?? 1);
  seg(MARK.b, MARK.lb, o.b ?? 1);
  g.setLineDash([]);
  if (o.spark) {
    for (const [pts, L, p] of [[MARK.a, MARK.la, o.a ?? 1], [MARK.b, MARK.lb, o.b ?? 1]]) {
      if (p <= 0 || p >= 1) continue;
      const [hx, hy] = pointAt(pts, L * p);
      const gr = g.createRadialGradient(hx, hy, 0, hx, hy, 140);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,214,170,0.9)'); gr.addColorStop(1, 'rgba(255,92,0,0)');
      g.fillStyle = gr; g.fillRect(hx - 140, hy - 140, 280, 280);
    }
  }
  g.restore();
}
