// Frame engine: resolves shots and transitions for time t, draws both slots, adds impacts, composites.
import { W, H, FPS, DUR, B } from './config.js';
import { clamp, decay, vnoise, lerp } from './util.js';
import { FX } from './gfx.js';
import { Dust } from './particles.js';
import { SCENES, HITS } from './scenes.js';

let fx = null;
export function init(canvas) {
  fx = new FX(canvas);
  fx.slots.forEach((s, i) => (s.dustObj = new Dust(900, 7 + i)));
  return fx;
}

export function resolve(t) {
  const b = t / B;
  let j = 0;
  SCENES.forEach((s, i) => { const pre = s.tr ? s.tr.pre : 0; if (b >= s.b0 - pre) j = i; });
  const s = SCENES[j];
  if (s.tr && j > 0) {
    const a = s.b0 - s.tr.pre, z = s.b0 + s.tr.post;
    if (b < z) return { out: j - 1, in: j, p: (b - a) / (z - a), tr: s.tr, b };
  }
  return { out: j, in: -1, p: 1, tr: null, b };
}

const KEYS = ['bloom', 'threshold', 'vig', 'ca', 'zoom', 'leak', 'sat', 'lift', 'flash'];
function blend(a, c, p) {
  if (!c) return { ...a };
  const o = { ...(p < 0.5 ? a : c) };
  for (const k of KEYS) if (a[k] != null && c[k] != null) o[k] = lerp(a[k], c[k], p);
  return o;
}

function impacts(t, f) {
  let sx = 0, sy = 0, rot = 0;
  for (const h of HITS) {
    const d = t - h.b * B;
    if (d < 0 || d > 1.5) continue;
    const k = decay(d, 5.5);
    if (h.shake) { sx += (h.shake / W) * k * vnoise(d * 38 + h.b * 3); sy += (h.shake / H) * k * vnoise(d * 41 + h.b * 7 + 50); rot += 0.002 * (h.shake / 20) * k * vnoise(d * 23 + h.b); }
    if (h.ca) f.ca = (f.ca ?? 0.002) + h.ca * decay(d, 7);
    if (h.zoom) f.zoom = (f.zoom ?? 1) + h.zoom * decay(d, 6);
    if (h.flash) { const fl = h.flash * decay(d, 9); if (fl > (f.flash || 0)) { f.flash = fl; f.flashCol = h.flashCol; } }
  }
  f.sx = sx; f.sy = sy; f.rot = rot;
  f.zoom = Math.max(f.zoom ?? 1, 1 + 2.2 * Math.max(Math.abs(sx), Math.abs(sy)));
  return f;
}

export function renderFrame(t, samples = 1, grain = 0.03) {
  const shutter = 0.5 / FPS;
  for (let i = 0; i < samples; i++) {
    const st = clamp(samples === 1 ? t : t + ((i + 0.5) / samples - 0.5) * shutter, 0, DUR - 1e-4);
    const R = resolve(st), b = R.b;
    const [s0, s1] = fx.slots;
    s0.reset();
    const sa = SCENES[R.out];
    const fa = sa.draw(s0, b, (b - sa.b0) * B) || {};
    let fb = null;
    if (R.tr) {
      s1.reset();
      const sb = SCENES[R.in];
      fb = sb.draw(s1, b, (b - sb.b0) * B) || {};
    }
    fx.renderSlot(s0);
    if (R.tr) fx.renderSlot(s1);
    const tr = R.tr ? { ...R.tr, p: clamp(R.p), c: typeof R.tr.c === 'function' ? R.tr.c() : R.tr.c } : null;
    const f = impacts(st, blend(fa, fb, R.tr ? clamp(R.p) : 0));
    fx.compose(tr, f, st);
    fx.accumulate(i);
  }
  fx.present(t, grain);
}

export function labelAt(t) { const R = resolve(clamp(t, 0, DUR - 1e-4)); return SCENES[R.in >= 0 && R.p > 0.5 ? R.in : R.out].label; }
