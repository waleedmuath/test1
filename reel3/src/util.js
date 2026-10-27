// Math, easing, randomness and colour helpers. Everything here is pure.

export const W = 1920, H = 1080, FPS = 60, DUR = 30;
export const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4; // 30 s = 60 beats = 15 bars
export const b2t = b => b * BEAT;
export const TAU = Math.PI * 2;

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = x => x * x * (3 - 2 * x);
export const fract = x => x - Math.floor(x);

// Cubic-bezier easing (CSS semantics), solved with Newton iterations.
export function cubic(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return x => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = ((ax * t + bx) * t + cx) * t - x;
      const d = (3 * ax * t + 2 * bx) * t + cx;
      if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
      t = clamp(t - e / d);
    }
    return ((ay * t + by) * t + cy) * t;
  };
}

export const ease = {
  lin: x => x,
  in2: x => x * x,
  out2: x => 1 - (1 - x) * (1 - x),
  in3: x => x * x * x,
  out3: x => 1 - (1 - x) ** 3,
  io3: x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  out5: x => 1 - (1 - x) ** 5,
  io5: x => (x < 0.5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2),
  inExp: x => (x <= 0 ? 0 : 2 ** (10 * x - 10)),
  outExp: x => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  ioExp: x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2),
  outBack: x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2,
  outBackHard: x => 1 + 3.6 * (x - 1) ** 3 + 2.6 * (x - 1) ** 2,
  inBack: x => 2.70158 * x ** 3 - 1.70158 * x * x,
  ioBack: x => {
    const c = 1.70158 * 1.525;
    return x < 0.5 ? ((2 * x) ** 2 * ((c + 1) * 2 * x - c)) / 2 : ((2 * x - 2) ** 2 * ((c + 1) * (x * 2 - 2) + c) + 2) / 2;
  },
  outElastic: x => (x <= 0 ? 0 : x >= 1 ? 1 : 2 ** (-10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1),
  outBounce: x => {
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  },
  // the house curves
  snap: cubic(0.75, 0, 0.1, 1),     // long anticipation, decisive landing
  glide: cubic(0.3, 0.7, 0.15, 1),  // quick start, feathered settle
  whip: cubic(0.85, 0, 0.15, 1),    // whip-pan: all the travel happens around the middle
  rise: cubic(0.5, 0, 0.75, 0)      // accelerate into the cut
};

// eased progress of x through [a, b]
export const ez = (x, a, b, fn = ease.out3) => fn(inv(a, b, x));
// damped spring 0 -> 1, x in seconds
export const spring = (x, f = 2.4, d = 7) => (x <= 0 ? 0 : 1 - Math.exp(-d * x) * Math.cos(TAU * f * x));
// decaying oscillation that starts and ends at 0
export const wobble = (x, f = 3, d = 6) => (x <= 0 ? 0 : Math.exp(-d * x) * Math.sin(TAU * f * x));
// exponential decay impulse
export const decay = (x, k = 6) => (x < 0 ? 0 : Math.exp(-k * x));
// a 0→1→0 window with eased edges
export const window01 = (x, a, b, fin = 0.2, fout = 0.2) => Math.min(ez(x, a, a + fin, ease.out3), 1 - ez(x, b - fout, b, ease.in3));

// sfc32 seeded generator
export function rng(seed = 1) {
  let a = 0x9e3779b9 ^ seed, b = 0x243f6a88 + seed * 7, c = 0xb7e15162 ^ (seed << 3), d = seed | 1;
  const next = () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) next();
  const r = () => next();
  r.range = (lo, hi) => lo + (hi - lo) * next();
  r.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  r.pick = arr => arr[Math.floor(next() * arr.length)];
  r.sign = () => (next() < 0.5 ? -1 : 1);
  return r;
}

export function hash1(n) { const x = Math.sin(n * 91.3458 + 47.853) * 24634.6345; return x - Math.floor(x); }
export function vnoise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(hash1(i + seed * 131), hash1(i + 1 + seed * 131), u) * 2 - 1;
}
// fractal value noise, roughly in [-1, 1]
export function fbm(x, seed = 0) { return (vnoise(x, seed) * 0.6 + vnoise(x * 2.1, seed + 7) * 0.3 + vnoise(x * 4.3, seed + 13) * 0.1); }

export function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mixHex(a, b, t) {
  const A = hex(a), B = hex(b);
  const c = i => Math.round(lerp(A[i], B[i], clamp(t))).toString(16).padStart(2, '0');
  return ('#' + c(0) + c(1) + c(2)).toUpperCase();
}
export function rgba(h, a) { const A = hex(h); return `rgba(${A[0]},${A[1]},${A[2]},${clamp(a)})`; }
export function luminance(h) { const [r, g, b] = hex(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
