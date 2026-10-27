// Math, easing and colour helpers. Everything in the reel is a pure function of time.

export const TAU = Math.PI * 2;
export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = x => x * x * (3 - 2 * x);

function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t;
  const dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 12; i++) {
      const e = X(t) - x, d = dX(t);
      if (Math.abs(e) < 1e-7 || Math.abs(d) < 1e-7) break;
      t = clamp(t - e / d);
    }
    return Y(t);
  };
}

export const ease = {
  lin: x => x,
  inQ: x => x * x,
  outQ: x => 1 - (1 - x) * (1 - x),
  inC: x => x * x * x,
  outC: x => 1 - Math.pow(1 - x, 3),
  ioC: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQt: x => 1 - Math.pow(1 - x, 4),
  inX: x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outX: x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  ioX: x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outBk: x => { const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },
  inBk: x => { const s = 1.7; return (s + 1) * x * x * x - s * x * x; },
  // motion-design curves
  expoOut: cubicBezier(0.16, 1, 0.3, 1),
  snap: cubicBezier(0.85, 0, 0.15, 1),
  glide: cubicBezier(0.33, 0, 0.0, 1),
  punch: cubicBezier(0.2, 1.6, 0.35, 1)
};
export const E = (t, a, b, fn = ease.expoOut) => fn(prog(t, a, b));

// damped spring 0→1, x in seconds
export const spring = (x, f = 2.2, z = 0.42) => {
  if (x <= 0) return 0;
  const w = TAU * f, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + (z * w / wd) * Math.sin(wd * x));
};
export const decay = (x, k = 6) => (x < 0 ? 0 : Math.exp(-x * k));
export const bell = (t, a, b) => Math.sin(Math.PI * prog(t, a, b));

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = n => { const x = Math.sin(n * 91.3458 + 47.123) * 24634.6345; return x - Math.floor(x); };
export const vnoise = x => { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), smooth(f)) * 2 - 1; };

const _hex = {};
export function rgb(h) {
  if (_hex[h]) return _hex[h];
  const n = parseInt(h.slice(1), 16);
  return (_hex[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
export const rgba = (h, a) => { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${clamp(a)})`; };
export function mixc(a, b, t) {
  const A = rgb(a), B = rgb(b); t = clamp(t);
  return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
}
