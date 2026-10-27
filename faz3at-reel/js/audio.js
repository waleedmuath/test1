'use strict';
/* ==========================================================================
   Score + sound design — a small offline synthesizer in plain JavaScript.
   Every voice is computed sample by sample (oscillators, Karplus–Strong
   strings, FM bells, biquad filters), mixed on stereo buses, sent through
   a Freeverb-style reverb and a ping-pong delay, sidechained to the kick and
   mastered to −14 LUFS (BS.1770 gated loudness) with a peak limiter.
   120 BPM, D major (the hook sits on a D-minor drone, then resolves).
   Cue times come from the same constants the picture uses.
   ========================================================================== */

const midiHz = m => 440 * 2 ** ((m - 69) / 12);

/* ---------- DSP building blocks ---------- */
class Biquad {
  constructor(sr) { this.sr = sr; this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  set(type, f, q = 0.707) {
    const w = (TAU * clamp(f, 10, this.sr * 0.45)) / this.sr, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
    else { b0 = al; b1 = 0; b2 = -al; } // band-pass, 0 dB peak
    const a0 = 1 + al;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * cs) / a0; this.a2 = (1 - al) / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}
// band-limited saw / square via polyBLEP
const blep = (p, dt) => (p < dt ? ((p /= dt), p + p - p * p - 1) : p > 1 - dt ? ((p = (p - 1) / dt), p * p + p + p + 1) : 0);
const sawAt = (p, dt) => 2 * p - 1 - blep(p, dt);
const sqrAt = (p, dt) => (p < 0.5 ? 1 : -1) + blep(p, dt) - blep((p + 0.5) % 1, dt);
const expEnv = (t, att, rate) => (t < att ? t / att : Math.exp(-(t - att) * rate));

function composeScore(sr = 48000) {
  const N = Math.ceil(DUR * sr);
  const rnd = seeded(0xFA23E5);
  const mk = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
  const BUS = { music: mk(), drums: mk(), fx: mk() };
  const VERB = new Float32Array(N), ECHO = new Float32Array(N);
  const kicks = [];

  // place a mono voice: equal-power pan, optional reverb / delay sends
  function put(t, buf, { bus = 'fx', gain = 1, pan = 0, rev = 0, dly = 0, panTo = null } = {}) {
    const i0 = Math.round(t * sr), out = BUS[bus];
    for (let k = 0; k < buf.length; k++) {
      const i = i0 + k;
      if (i < 0) continue;
      if (i >= N) break;
      const p = panTo == null ? pan : lerp(pan, panTo, k / buf.length);
      const a = ((clamp(p, -1, 1) + 1) * Math.PI) / 4, v = buf[k] * gain;
      out.L[i] += v * Math.cos(a); out.R[i] += v * Math.sin(a);
      if (rev) VERB[i] += v * rev;
      if (dly) ECHO[i] += v * dly;
    }
  }
  const len = d => Math.max(1, Math.round(d * sr));
  const noise = () => rnd() * 2 - 1;

  /* ---------- voices (each returns a mono Float32Array) ---------- */
  function kickV(v = 1) {
    const b = new Float32Array(len(0.42));
    let ph = 0, hp = 0, prev = 0;
    for (let i = 0; i < b.length; i++) {
      const t = i / sr, f = 44 + 150 * Math.exp(-t * 34) + 30 * Math.exp(-t * 9);
      ph += f / sr;
      const body = Math.sin(TAU * ph) * expEnv(t, 0.002, 7.5);
      const n = noise(); hp = n - prev; prev = n;
      b[i] = Math.tanh((body + hp * 0.35 * Math.exp(-t * 450)) * 1.6) * v;
    }
    return b;
  }
  function filteredNoise(d, type, f, q, envFn, sweep) {
    const b = new Float32Array(len(d)), bq = new Biquad(sr).set(type, f, q);
    for (let i = 0; i < b.length; i++) {
      const t = i / sr;
      if (sweep && i % 32 === 0) bq.set(type, sweep(t), q);
      b[i] = bq.run(noise()) * envFn(t);
    }
    return b;
  }
  const clapV = v => filteredNoise(0.3, 'bp', 1450, 0.9, t => v * ([0, 0.011, 0.022].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) * 190) : 0), 0) + (t > 0.03 ? 0.75 * Math.exp(-(t - 0.03) * 16) : 0)));
  const hatV = (v, open) => filteredNoise(open ? 0.32 : 0.07, 'hp', open ? 7200 : 9000, 0.8, t => v * Math.exp(-t * (open ? 14 : 65)));
  const crashV = (v, dec) => filteredNoise(dec, 'hp', 5200, 0.6, t => v * expEnv(t, 0.002, 3 / dec));
  function snareV(v, f) {
    const b = filteredNoise(0.16, 'bp', f, 0.8, t => v * Math.exp(-t * 30));
    for (let i = 0; i < b.length; i++) { const t = i / sr; b[i] += Math.sin(TAU * (200 * t - 40 * t * t)) * v * 0.45 * Math.exp(-t * 45); }
    return b;
  }
  function sweepSine(d, f0, f1, att, rate, v, curveK = 1) {
    const b = new Float32Array(len(d));
    let ph = 0;
    for (let i = 0; i < b.length; i++) {
      const t = i / sr, u = (t / d) ** curveK;
      ph += (f0 * (f1 / f0) ** u) / sr;
      b[i] = Math.sin(TAU * ph) * expEnv(t, att, rate) * v;
    }
    return b;
  }
  const tomV = (f, v) => sweepSine(0.3, f * 1.5, f, 0.002, 14, v, 0.25);
  const popV = (f, v) => sweepSine(0.13, f * 1.8, f, 0.002, 34, v, 0.3);
  const thudV = v => { const b = sweepSine(0.28, 150, 48, 0.002, 13, v, 0.5), n = filteredNoise(0.18, 'lp', 900, 0.7, t => v * 0.3 * Math.exp(-t * 40)); for (let i = 0; i < n.length; i++) b[i] += n[i]; return b; };
  const tickV = (v, f = 3500, d = 0.01) => filteredNoise(d + 0.006, 'hp', f, 0.7, t => v * Math.exp(-t * (5 / d)));
  function clockV(hi, v) { const b = sweepSine(0.06, hi ? 2100 : 1500, hi ? 2050 : 1480, 0.001, 70, v), n = tickV(v * 0.6, 3000, 0.006); for (let i = 0; i < n.length; i++) b[i] += n[i]; return b; }
  function clickV(v) { const b = sweepSine(0.07, 1300, 600, 0.001, 60, v * 0.7, 0.4), n = tickV(v, 2500, 0.01); for (let i = 0; i < n.length; i++) b[i] += n[i]; return b; }
  function subDropV(v, d) { return sweepSine(d + 0.05, 95, 34, 0.004, 4 / d, v, 0.6); }
  function impactV(v) {
    const b = sweepSine(1.5, 115, 30, 0.004, 3.2, v * 0.85, 0.5);
    const n = filteredNoise(1.2, 'lp', 3800, 0.7, t => v * 0.42 * expEnv(t, 0.002, 4.5), t => 3800 * (200 / 3800) ** Math.min(1, t / 0.9));
    for (let i = 0; i < n.length; i++) b[i] += n[i];
    return b;
  }
  // stack of detuned saws through a falling low-pass, lightly driven
  function braamV(m, v, d) {
    const b = new Float32Array(len(d + 0.05)), f = midiHz(m), bq = new Biquad(sr);
    const parts = [[f * 0.992, 1], [f, 1], [f * 1.008, 1], [f * 2.004, 0.6]], ph = parts.map(() => rnd());
    for (let i = 0; i < b.length; i++) {
      const t = i / sr;
      if (i % 32 === 0) bq.set('lp', 2200 * (260 / 2200) ** Math.min(1, t / d), 2);
      let s = 0;
      parts.forEach(([pf, a], k) => { ph[k] = (ph[k] + pf / sr) % 1; s += sawAt(ph[k], pf / sr) * a; });
      b[i] = Math.tanh(bq.run(s * 0.35) * 1.8) * v * expEnv(t, 0.006, 5 / d);
    }
    return b;
  }
  // FM bell: carrier + inharmonic modulator with a decaying index
  function bellV(m, v, dec = 1.2) {
    const f = midiHz(m), b = new Float32Array(len(dec + 0.05));
    let pc = 0, pm = 0, p2 = 0;
    for (let i = 0; i < b.length; i++) {
      const t = i / sr, idx = 2.4 * Math.exp(-t * 6 / dec);
      pm += (f * 3.5) / sr; pc += f / sr; p2 += (f * 2.76) / sr;
      b[i] = (Math.sin(TAU * pc + idx * Math.sin(TAU * pm)) * expEnv(t, 0.002, 4 / dec) + 0.18 * Math.sin(TAU * p2) * Math.exp(-t * 9 / dec)) * v;
    }
    return b;
  }
  // Karplus–Strong plucked string
  function pluckV(m, v, dec = 0.35, bright = 0.5) {
    const f = midiHz(m), P = Math.max(2, Math.round(sr / f)), line = new Float32Array(P);
    let lp = 0;
    for (let k = 0; k < P; k++) { lp += (noise() - lp) * bright; line[k] = lp; }
    const b = new Float32Array(len(dec)), fb = Math.exp(Math.log(0.001) / (dec * f));
    let idx = 0;
    for (let i = 0; i < b.length; i++) {
      const nx = (idx + 1) % P, y = 0.5 * (line[idx] + line[nx]) * fb;
      b[i] = line[idx] * v * (i < 40 ? i / 40 : 1);
      line[idx] = y; idx = nx;
    }
    return b;
  }
  function bassV(m, d, v) {
    const f = midiHz(m), b = new Float32Array(len(d + 0.02)), bq = new Biquad(sr);
    let p = 0;
    for (let i = 0; i < b.length; i++) {
      const t = i / sr;
      if (i % 16 === 0) bq.set('lp', t < 0.015 ? lerp(160, 1400, t / 0.015) : 1400 * (240 / 1400) ** Math.min(1, (t - 0.015) / d), 2);
      p = (p + f / sr) % 1;
      const amp = Math.min(1, t / 0.006) * (t > d * 0.7 ? Math.exp(-(t - d * 0.7) * 25) : 1);
      b[i] = (bq.run(sawAt(p, f / sr) * 0.6 + Math.sin(TAU * p) * 0.5)) * amp * v;
    }
    return b;
  }
  // pad: two detuned saw layers per note, one per side, through a low-pass that can sweep
  function padV(notes, d, v, cut0, cut1 = cut0, att = 0.2, detune = 0.006) {
    const sides = [-1, 1].map(side => {
      const b = new Float32Array(len(d + 0.4)), bq = new Biquad(sr), ph = notes.map(() => rnd());
      for (let i = 0; i < b.length; i++) {
        const t = i / sr;
        if (i % 64 === 0) bq.set('lp', cut0 * (cut1 / cut0) ** Math.min(1, t / d), 0.6);
        let s = 0;
        notes.forEach((m, k) => { const f = midiHz(m) * (1 + side * detune); ph[k] = (ph[k] + f / sr) % 1; s += sawAt(ph[k], f / sr); });
        const env = Math.min(1, t / att) * (t > d ? Math.exp(-(t - d) * 9) : 1);
        b[i] = bq.run(s / Math.sqrt(notes.length)) * env * v;
      }
      return b;
    });
    return sides;
  }
  function squareBlipV(m, v, d) {
    const f = midiHz(m), b = new Float32Array(len(d)), bq = new Biquad(sr).set('lp', 5000, 0.7);
    let p = 0;
    for (let i = 0; i < b.length; i++) { p = (p + f / sr) % 1; b[i] = bq.run(sqrAt(p, f / sr)) * v * expEnv(i / sr, 0.002, 4 / d); }
    return b;
  }
  function boingV(v, d = 0.45) {
    const b = new Float32Array(len(d));
    let ph = 0;
    for (let i = 0; i < b.length; i++) {
      const t = i / sr, u = t / d, base = u < 0.5 ? 230 * (520 / 230) ** (u * 2) : 520 * (330 / 520) ** ((u - 0.5) * 2);
      ph += (base + 60 * Math.exp(-t * 7) * Math.sin(TAU * 22 * t)) / sr;
      b[i] = Math.sin(TAU * ph) * expEnv(t, 0.004, 5 / d) * v;
    }
    return b;
  }
  const swishV = (v, d, f) => filteredNoise(d, 'bp', f, 0.9, t => v * Math.sin(Math.PI * Math.min(1, t / d)) ** 2, t => f * 0.4 * 4 ** (t / d));
  const whooshV = (v, d, f0, f1) => filteredNoise(d, 'bp', f0, 1.2, t => v * Math.sin(Math.PI * Math.min(1, t / d)) ** 1.5, t => (t < d * 0.7 ? f0 * (f1 / f0) ** (t / (d * 0.7)) : f1));
  function riserV(v, d) {
    const n = filteredNoise(d, 'bp', 300, 1.3, t => v * (t / d) ** 2, t => 300 * (8000 / 300) ** (t / d));
    const s = new Float32Array(n.length), bq = new Biquad(sr).set('lp', 2000, 0.7);
    let p = 0;
    for (let i = 0; i < s.length; i++) { const t = i / sr, f = 150 * 8 ** (t / d); p = (p + f / sr) % 1; s[i] = n[i] + bq.run(sawAt(p, f / sr)) * v * 0.15 * (t / d) ** 2; }
    return s;
  }
  const swellV = (v, d) => filteredNoise(d, 'hp', 1200, 0.7, t => v * (t / d) ** 3, t => 1200 * 5.4 ** (t / d));
  function glitchV(v, d) {
    const b = new Float32Array(len(d));
    let p = 0, f = 400, on = 1;
    for (let i = 0; i < b.length; i++) {
      if (i % Math.round(0.016 * sr) === 0) { f = lerp(90, 2600, rnd()); on = rnd() < 0.7 ? 1 : 0; }
      p = (p + f / sr) % 1;
      b[i] = (sqrAt(p, f / sr) * 0.6 + noise() * 0.4 * (rnd() < 0.5 ? 1 : 0)) * on * v;
    }
    return b;
  }
  const zapV = (f0, f1, d, v) => sweepSine(d + 0.04, f0, f1, 0.004, 4 / d, v);
  function buzzV(v, d) {
    const b = new Float32Array(len(d)), bq = new Biquad(sr).set('lp', 900, 0.8);
    let p1 = 0, p2 = 0;
    for (let i = 0; i < b.length; i++) { p1 = (p1 + 110 / sr) % 1; p2 = (p2 + 116 / sr) % 1; const t = i / sr; b[i] = bq.run(sqrAt(p1, 110 / sr) + sqrAt(p2, 116 / sr)) * v * Math.min(1, t / 0.01) * Math.min(1, (d - t) / 0.03); }
    return b;
  }
  const markerV = (v, d) => filteredNoise(d, 'bp', 2600, 2.2, t => v * (0.4 + 0.6 * Math.abs(Math.sin(t * 105))) * Math.min(1, (d - t) / 0.03));

  /* ---------- placement helpers ---------- */
  const kick = (t, v = 0.9) => { put(t, kickV(v), { bus: 'drums' }); kicks.push(t); };
  const clap = (t, v = 0.35) => put(t, clapV(v), { bus: 'drums', rev: 0.25 });
  const hat = (t, v = 0.08, open = false, pan = 0.25) => put(t, hatV(v, open), { bus: 'drums', pan });
  const snare = (t, v = 0.2, f = 1800) => put(t, snareV(v, f), { bus: 'drums', rev: 0.12 });
  const tom = (t, f = 140, v = 0.3) => put(t, tomV(f, v), { bus: 'drums', rev: 0.1 });
  const crash = (t, v = 0.2, dec = 1.8) => put(t, crashV(v, dec), { bus: 'drums', rev: 0.35, pan: 0.15 });
  const bell = (t, m, v = 0.16, dec = 1.2, rev = 0.35, dly = 0.2, pan = 0) => put(t, bellV(m, v, dec), { pan, rev, dly });
  const pluck = (t, m, v = 0.1, dec = 0.3, pan = 0, bus = 'music') => put(t, pluckV(m, v, dec), { bus, pan, dly: 0.25 });
  const bass = (t, m, d = 0.2, v = 0.3) => put(t, bassV(m, d, v), { bus: 'music' });
  const pad = (t, d, notes, v = 0.05, c0 = 1800, c1 = c0, rev = 0.4, att = 0.2) => { const [l, r] = padV(notes, d, v, c0, c1, att); put(t, l, { bus: 'music', pan: -0.6, rev }); put(t, r, { bus: 'music', pan: 0.6, rev }); };
  const pop = (t, f, v = 0.1, pan = 0) => put(t, popV(f, v), { pan, rev: 0.12 });
  const tick = (t, v = 0.08, f = 3500, d = 0.008, pan = 0) => put(t, tickV(v, f, d), { pan });
  const clockTick = (t, hi, v) => put(t, clockV(hi, v), { rev: 0.2 });
  const click = (t, v = 0.16) => put(t, clickV(v));
  const thud = (t, v = 0.45) => put(t, thudV(v));
  const impact = (t, v = 1) => { put(t, impactV(v), { rev: 0.5 }); crash(t, v * 0.2, 2.0); };
  const subDrop = (t, v = 0.5, d = 0.8) => put(t, subDropV(v, d));
  const braam = (t, m, v, d) => put(t, braamV(m, v, d), { rev: 0.5 });
  const whoosh = (t, d = 0.4, v = 0.15, f0 = 350, f1 = 5000, p0 = -0.7, p1 = 0.7) => put(t, whooshV(v, d, f0, f1), { pan: p0, panTo: p1, rev: 0.2 });
  const swish = (t, v = 0.1, d = 0.2, f = 3000) => put(t, swishV(v, d, f), { rev: 0.1 });
  const riser = (t0, t1, v = 0.15) => put(t0, riserV(v, t1 - t0), { rev: 0.3, dly: 0.15 });
  const revSwell = (t1, d, v = 0.2) => put(t1 - d, swellV(v, d), { rev: 0.3 });
  const glitch = (t, d, v = 0.08) => put(t, glitchV(v, d));
  const zap = (t, f0, f1, d, v = 0.08, pan = 0) => put(t, zapV(f0, f1, d, v), { pan, rev: 0.2 });
  const boing = (t, v = 0.12) => put(t, boingV(v), { rev: 0.15 });
  const buzz = (t, v = 0.07, d = 0.18) => put(t, buzzV(v, d));
  const marker = (t, d = 0.3, v = 0.05) => put(t, markerV(v, d));
  const coin = (t, v = 0.06, pan = 0) => { put(t, squareBlipV(95, v, 0.07), { pan }); put(t + 0.065, squareBlipV(100, v, 0.22), { pan, dly: 0.2 }); };
  const correctChime = (t, v = 0.16) => { bell(t, 81, v, 0.9, 0.3, 0.2, -0.15); bell(t + 0.09, 86, v * 1.1, 1.3, 0.35, 0.25, 0.15); };
  const sonicLogo = (t, v = 0.17) => [74, 78, 81, 86].forEach((m, i) => bell(t + i * 0.065, m, v * (0.85 + i * 0.08), 1.1 + i * 0.25, 0.4, 0.25, (i - 1.5) * 0.2));
  const fanfare = (t, v = 0.12) => [74, 78, 81, 86, 90, 93].forEach((m, i) => { bell(t + i * 0.05, m, v, 0.9, 0.35, 0.2, i / 5 - 0.5); pluck(t + i * 0.05, m - 12, v * 0.8, 0.25, 0, 'fx'); });
  const shimmer = (t, v = 0.05) => [98, 102, 105, 110].forEach((m, i) => bell(t + i * 0.04, m, v, 0.6, 0.5, 0.3, i % 2 ? 0.5 : -0.5));

  /* ---------- harmony ---------- */
  const CH = {
    D: { pad: [62, 66, 69, 74], bass: 38, arp: [74, 78, 81, 86] },
    A: { pad: [61, 64, 69, 73], bass: 33, arp: [73, 76, 81, 85] },
    Bm: { pad: [62, 66, 71, 74], bass: 35, arp: [74, 78, 83, 86] },
    G: { pad: [62, 67, 71, 74], bass: 31, arp: [74, 79, 83, 86] },
    Dadd9: { pad: [50, 57, 62, 64, 66, 69, 74], bass: 26, arp: [74, 76, 78, 81] }
  };
  const barChord = [null, 'D', 'Bm', 'G', 'A', 'D', 'A', 'Bm', 'G', 'D', 'A', 'Bm', 'G', 'Dadd9', 'Dadd9']; // one per 2 s bar

  /* ================= HOOK 0.0 – 1.5 ================= */
  pad(0, 1.55, [38, 50, 53, 57], 0.07, 380, 1400, 0.5, 0.05); // D-minor drone
  CLOCK.forEach((t, i) => clockTick(t, i % 2 === 0, i < 3 ? 0.4 : 0.28));
  IN.words.forEach((t, i) => {
    braam(t, [38, 39, 40][i], 0.3 + i * 0.05, 0.5); braam(t, [50, 51, 52][i], 0.14, 0.45);
    kick(t, 0.8); subDrop(t, 0.25 + i * 0.06, 0.45);
    put(t, filteredNoise(0.25, 'bp', 1500, 0.6, u => 0.55 * Math.exp(-u * 20)), { rev: 0.6 });
    clap(t, 0.35);
  });
  riser(1.0, 1.5, 0.14);
  for (let t = 1.0; t < 1.5; t += 0.0625) snare(t, 0.06 + 0.25 * ((t - 1) / 0.5), 1400 + 2400 * ((t - 1) / 0.5));
  glitch(IN.glitch, 0.12, 0.09);
  zap(IN.glitch, 320, 40, 0.3, 0.1);

  /* ================= RELIEF + DOT 1.5 – 3.0 ================= */
  pad(IN.calm, 1.5, [62, 66, 69, 76], 0.11, 900, 3200, 0.6, 0.25);
  whoosh(IN.calm - 0.04, 0.35, 0.07, 1200, 6000, 0.4, -0.4);
  [86, 90, 93].forEach((m, i) => bell(IN.help + i * 0.06, m, 0.12, 0.8, 0.5, 0.3, (i - 1) * 0.4));
  whoosh(IN.help - 0.04, 0.35, 0.06, 1200, 6000, -0.4, 0.4);
  zap(IN.fall, 1500, 380, IN.land1 - IN.fall, 0.08);
  revSwell(IN.land1, 0.45, 0.12);
  thud(IN.land1, 0.4); pop(IN.land1, 320, 0.12); boing(IN.land1 + 0.02, 0.1);
  revSwell(IN.land2, 0.5, 0.2);
  hat(IN.land1 + 0.25, 0.05); hat(IN.land1 + 0.375, 0.06);

  /* ================= LOGO 3.0 – 5.5 ================= */
  impact(IN.land2, 0.8); kick(IN.land2, 1); crash(IN.land2, 0.2, 2.2);
  bass(IN.land2, 38, 1.0, 0.24);
  pad(IN.land2, 2.0, CH.D.pad, 0.08, 2800);
  pad(4.0, 1.5, CH.Bm.pad, 0.08, 3000);
  swish(IN.book, 0.09, 0.3, 2400);
  sonicLogo(IN.check, 0.17);
  shimmer(3.66, 0.035);
  whoosh(IN.word - 0.06, 0.4, 0.07, 400, 4000, -0.5, 0.5);
  [74, 78].forEach((m, i) => pluck(IN.tag + i * 0.12, m, 0.12, 0.4, (i - 0.5) * 0.6, 'fx'));
  pop(IN.by, 700, 0.06);
  [3.0, 4.0, 4.75].forEach(t => kick(t, 0.75));
  [3.5, 4.5].forEach(t => clap(t, 0.32));
  for (let t = 3.0; t < 5.0; t += 0.25) hat(t + 0.125, t % 0.5 ? 0.035 : 0.06, false, 0.2);
  [3.25, 3.75, 4.25].forEach(t => bass(t, 38, 0.2, 0.2));
  for (let t = 5.0; t < 5.5; t += 0.0625) snare(t, 0.15 + 0.4 * ((t - 5) / 0.5), 1500 + 2500 * ((t - 5) / 0.5));
  riser(IN.zoom - 0.45, TL.path, 0.32);
  whoosh(IN.zoom, TL.path - IN.zoom, 0.16, 200, 9000, 0, 0);

  /* ================= GROOVE 5.5 – 25.0 ================= */
  for (let b = Math.round(TL.path / BEAT); b < Math.round(25 / BEAT); b++) {
    const t = b * BEAT, beat = b % 4, ch = CH[barChord[Math.floor(t / 2)]];
    kick(t, 0.55);
    if (beat % 2 === 1) clap(t, 0.5);
    hat(t + 0.25, 0.13, true, 0.15);
    hat(t + 0.125, 0.06 + rnd() * 0.02, false, -0.25); hat(t + 0.375, 0.06 + rnd() * 0.02, false, -0.25);
    bass(t + 0.25, ch.bass, 0.2, 0.15);
    if (beat % 2 === 1) bass(t + 0.375, ch.bass + 12, 0.1, 0.1);
    const pat = [0, 1, 2, 3, 2, 1, 3, 2];
    for (let s = 0; s < 4; s++) pluck(t + s * 0.125, ch.arp[pat[(beat * 4 + s) % 8]], s ? 0.2 : 0.28, 0.3, s % 2 ? 0.45 : -0.45);
  }
  for (let bar = 3; bar < 13; bar++) pad(bar * 2, 2, CH[barChord[bar]].pad, 0.07, bar >= 10 ? 3600 : 2800);
  pad(5.5, 0.5, CH.Bm.pad, 0.07, 2800);
  crash(TL.path, 0.2); impact(TL.path, 0.35);
  [TL.lesson, TL.game, TL.exam, TL.games, TL.tools, TL.cur].forEach(t => { tom(t - 0.25, 160, 0.2); tom(t - 0.125, 120, 0.22); crash(t, 0.14, 1.2); });

  /* ---------- 01 path ---------- */
  const P0 = TL.path;
  PNODES.forEach((_, i) => pop(P0 + 0.08 + i * 0.07, 500 + i * 60, 0.045, i % 2 ? 0.3 : -0.3));
  PA.done.forEach((d, i) => {
    click(P0 + d - 0.06, 0.08);
    bell(P0 + d, [74, 76, 78, 81, 83, 86][i], 0.12, 0.6, 0.3, 0.2, i % 2 ? 0.35 : -0.35);
    coin(P0 + d + 0.05, 0.025, i % 2 ? 0.4 : -0.4);
  });
  for (let i = 0; i < 6; i++) tick(P0 + PA.boss - 0.25 + i * 0.04, 0.07, 2200, 0.01);
  impact(P0 + PA.boss, 0.45); fanfare(P0 + PA.boss + 0.02, 0.11); crash(P0 + PA.boss, 0.18, 1.6);
  pop(P0 + PA.label, 520, 0.08);
  whoosh(TL.lesson - 0.3, 0.42, 0.13, 300, 6000, -0.6, 0.6);

  /* ---------- 02 lesson ---------- */
  const L0 = TL.lesson;
  whoosh(L0, 0.4, 0.08, 200, 2000, 0, 0);
  marker(L0 + 0.12, 0.36, 0.035);
  click(L0 + LE.contTap, 0.18);
  swish(L0 + LE.swap, 0.12, 0.25, 3000);
  for (let i = 0; i < 4; i++) pop(L0 + LE.swap + 0.16 + i * 0.05, 600 + i * 80, 0.05, i % 2 ? 0.3 : -0.3);
  click(L0 + LE.optTap, 0.18);
  click(L0 + LE.checkTap, 0.18);
  correctChime(L0 + LE.correct, 0.17);
  coin(L0 + LE.correct + 0.22, 0.04);
  for (let i = 0; i < 8; i++) pop(L0 + LE.correct + 0.05 + rnd() * 0.4, 900 + rnd() * 900, 0.02, rnd() - 0.5);
  whoosh(TL.game - 0.24, 0.4, 0.16, 250, 7000, 0, 0);

  /* ---------- 03 gamification ---------- */
  const G = TL.game;
  [0.12, 0.19, 0.26, 0.33].forEach((d, i) => pop(G + d, 420 + i * 70, 0.07, i % 2 ? 0.4 : -0.4));
  for (let n = 1; n <= 16; n++) tick(G + GA.xp0 + (1 - (1 - n / 16) ** (1 / 3)) * (GA.xp1 - GA.xp0), 0.05, 2000 + n * 150, 0.007, -0.3);
  fanfare(G + GA.lvl, 0.11); shimmer(G + GA.lvl + 0.1, 0.04); subDrop(G + GA.lvl, 0.25, 0.4);
  for (let n = 1; n <= 12; n++) tick(G + GA.st0 + (n / 12) * (GA.st1 - GA.st0), 0.045, 3000, 0.006, 0.35);
  whoosh(G + GA.st1 - 0.1, 0.3, 0.06, 300, 1500, 0.3, 0.3);
  for (let i = 0; i < 5; i++) pop(G + 0.45 + i * 0.07, 700 + i * 90, 0.045, 0.3);
  zap(G + GA.heartLose, 600, 200, 0.2, 0.06);
  zap(G + GA.heartFill - 0.5, 300, 900, 0.5, 0.03); pop(G + GA.heartFill, 900, 0.07);
  for (let i = 0; i < 4; i++) tom(G + GA.badges + i * 0.1 + 0.2, 300 + i * 40, 0.08);
  shimmer(G + 1.75, 0.03);
  whoosh(TL.exam - 0.28, 0.42, 0.13, 300, 6000, -0.7, 0.7);

  /* ---------- 04 exams ---------- */
  const X = TL.exam;
  swish(X + EX.sim, 0.1, 0.3, 2000); swish(X + EX.train, 0.1, 0.3, 2400);
  for (let i = 0; i < 3; i++) pop(X + EX.sim + 0.35 + i * 0.08, 650 + i * 80, 0.045, -0.3);
  for (let k = 0, t = X + 0.4; t < X + EX.stamp - 0.25; k++, t += 0.125) clockTick(t, k % 2 === 0, 0.08);
  EX.rows.forEach((d, i) => { pop(X + d, 900 + i * 120, 0.08); bell(X + d, [81, 83, 86][i], 0.05, 0.4, 0.25, 0.15); });
  revSwell(X + EX.stamp, 0.3, 0.14);
  impact(X + EX.stamp, 0.75); kick(X + EX.stamp, 0.9); correctChime(X + EX.stamp + 0.04, 0.15); shimmer(X + EX.stamp + 0.12, 0.04);
  pop(X + EX.stamp + 0.12, 500, 0.06);
  whoosh(TL.games - 0.22, 0.4, 0.15, 300, 7000, EN ? 0.7 : -0.7, EN ? -0.7 : 0.7);

  /* ---------- 05 games ---------- */
  const Gm = TL.games;
  [0.12, 0.19, 0.26, 0.33].forEach((d, i) => pop(Gm + d, 480 + i * 70, 0.07, i % 2 ? 0.4 : -0.4));
  swish(Gm + GM.flip, 0.1, 0.28, 3200); bell(Gm + GM.flip + 0.3, 86, 0.06, 0.5);
  GM.quiz.forEach((d, i) => pop(Gm + d, 1000 + i * 150, 0.07, 0.35));
  GM.mem.forEach(d => swish(Gm + d, 0.06, 0.16, 4200));
  GM.match.forEach(d => correctChime(Gm + d, 0.08));
  marker(Gm + GM.circle, 0.3, 0.05);
  buzz(Gm + GM.circle + 0.18, 0.06, 0.16);
  bell(Gm + GM.fix, 90, 0.1, 0.6, 0.3, 0.2); bell(Gm + GM.fix + 0.07, 93, 0.09, 0.8, 0.3, 0.2);
  [GM.flip + 0.35, GM.quiz[2] + 0.1, GM.match[1] + 0.05, GM.fix + 0.2].forEach((d, i) => coin(Gm + d, 0.028, i % 2 ? 0.4 : -0.4));
  whoosh(TL.tools - 0.28, 0.42, 0.13, 300, 6000, -0.6, 0.6);

  /* ---------- 06 toolkit ---------- */
  const To = TL.tools;
  for (let i = 0; i < 12; i++) { const col = i % 3, row = Math.floor(i / 3); pop(To + 0.12 + (col + row) * 0.055, 450 + (col + row) * 60, 0.04, (col - 1) * 0.5 * DIR); }
  [74, 76, 78, 79, 81, 83, 85, 86, 88, 90, 91, 93].forEach((m, i) => pluck(To + TO.sweep + i * TO.step, m, 0.13, 0.35, (i % 3 - 1) * 0.5 * DIR, 'fx'));
  shimmer(To + 2.55, 0.04);
  whoosh(TL.cur - 0.32, 0.45, 0.14, 200, 5000, 0, 0);

  /* ---------- 07 curricula ---------- */
  const Cu = TL.cur;
  [CU.sa, CU.jo].forEach(d => { swish(Cu + d, 0.1, 0.3, 2200); thud(Cu + d + 0.35, 0.25); });
  for (let i = 0; i < 3; i++) pop(Cu + CU.sa + CU.grades - 0.1 + i * 0.07, 700 + i * 90, 0.05, -0.3);
  for (let i = 0; i < 2; i++) pop(Cu + CU.jo + CU.grades - 0.1 + i * 0.07, 700 + i * 90, 0.05, 0.3);
  for (let i = 0; i < 2; i++) pop(Cu + CU.sa + CU.chips - 0.1 + i * 0.08, 1000 + i * 120, 0.05, -0.3);
  pop(Cu + CU.jo + CU.chips - 0.1, 1100, 0.05, 0.3);
  click(Cu + CU.sa + CU.tap, 0.16); correctChime(Cu + CU.sa + CU.tap + 0.03, 0.08);
  for (let t = 25.0; t < 26.0;) { const p = t - 25; snare(t, 0.12 + 0.38 * p, 1300 + 2800 * p); t += p < 0.5 ? 0.125 : 0.0625; }
  riser(25.0, TL.end, 0.32);
  revSwell(TL.end, 0.8, 0.22);
  kick(25.0, 0.75); kick(25.5, 0.75);

  /* ================= END CARD 26.0 – 30.0 ================= */
  const Ec = TL.end;
  impact(Ec, 0.95); kick(Ec, 1); crash(Ec, 0.26, 2.6); subDrop(Ec, 0.5, 1.0);
  pad(Ec, 3.6, CH.Dadd9.pad, 0.09, 3600, 1400, 0.6);
  bass(Ec, 26, 2.2, 0.16);
  swish(Ec + EC.book, 0.08, 0.28, 2400);
  sonicLogo(Ec + EC.check, 0.18);
  pop(Ec + EC.dot, 620, 0.08);
  whoosh(Ec + EC.word - 0.06, 0.4, 0.07, 400, 4000, 0.5, -0.5);
  pop(Ec + EC.cta, 520, 0.07);
  shimmer(Ec + 1.5, 0.035);
  pop(Ec + EC.by, 760, 0.05);
  click(Ec + EC.press, 0.16); shimmer(Ec + EC.press + 0.06, 0.05); coin(Ec + EC.press + 0.04, 0.03);
  [26.0, 27.0, 28.0].forEach(t => kick(t, 0.6));
  [26.5, 27.5, 28.5].forEach(t => clap(t, 0.22));
  for (let t = 26.0; t < 29.0; t += 0.25) hat(t + 0.125, 0.035 * (1 - (t - 26) / 3.5), false, 0.2);
  [26.25, 26.75, 27.25, 27.75, 28.25].forEach(t => bass(t, 38, 0.2, 0.15));
  for (let i = 0; i < 12; i++) pluck(26.5 + i * 0.25, CH.Dadd9.arp[i % 4] + (i >= 4 ? 12 : 0), 0.2 * (1 - i / 14), 0.45, i % 2 ? 0.45 : -0.45);
  bell(29.0, 86, 0.06, 1.2, 0.5, 0.3); bell(29.0, 74, 0.05, 1.2, 0.5, 0.3);

  return master(BUS, VERB, ECHO, kicks, sr);
}

/* ---------- effects + mastering ---------- */
// Freeverb-style reverb: 8 damped combs in parallel → 4 allpasses in series, per side
function reverb(input, sr) {
  const k = sr / 44100, combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], alls = [556, 441, 341, 225];
  const side = spread => {
    const out = new Float32Array(input.length);
    const cs = combs.map(d => ({ buf: new Float32Array(Math.round((d + spread) * k)), i: 0, lp: 0 }));
    const as = alls.map(d => ({ buf: new Float32Array(Math.round((d + spread) * k)), i: 0 }));
    for (let n = 0; n < input.length; n++) {
      const x = input[n] * 0.015;
      let y = 0;
      for (const cb of cs) {
        const o = cb.buf[cb.i];
        cb.lp = o * 0.8 + cb.lp * 0.2;
        cb.buf[cb.i] = x + cb.lp * 0.84;
        cb.i = (cb.i + 1) % cb.buf.length;
        y += o;
      }
      for (const ap of as) {
        const o = ap.buf[ap.i];
        ap.buf[ap.i] = y + o * 0.5;
        ap.i = (ap.i + 1) % ap.buf.length;
        y = o - y;
      }
      out[n] = y;
    }
    return out;
  };
  return { L: side(0), R: side(23) };
}
// ping-pong delay, dotted eighth, darkening repeats
function pingPong(input, sr) {
  const d = Math.round(BEAT * 0.75 * sr), L = new Float32Array(input.length), R = new Float32Array(input.length);
  let lpL = 0, lpR = 0;
  for (let n = 0; n < input.length; n++) {
    const fromR = n >= d ? R[n - d] : 0, fromL = n >= d ? L[n - d] : 0;
    lpL += (input[n] + fromR * 0.42 - lpL) * 0.35;
    lpR += (fromL * 0.42 - lpR) * 0.35;
    L[n] = lpL; R[n] = lpR;
  }
  return { L, R };
}
// BS.1770 integrated loudness (K-weighted, 400 ms blocks, absolute + relative gates)
function lufs(L, R, sr) {
  const kw = x => {
    const a = new Biquad(sr), b = new Biquad(sr), y = new Float32Array(x.length);
    // stage 1: high-shelf +4 dB @ 1.68 kHz; stage 2: RLB high-pass @ 38 Hz (coefficients from the spec's analog prototypes)
    const shelf = (() => { const f0 = 1681.97, G = 3.99984, Q = 0.7071752, K = Math.tan((Math.PI * f0) / sr), Vh = 10 ** (G / 20), Vb = Vh ** 0.4996667741545416, a0 = 1 + K / Q + K * K;
      return { b0: (Vh + (Vb * K) / Q + K * K) / a0, b1: (2 * (K * K - Vh)) / a0, b2: (Vh - (Vb * K) / Q + K * K) / a0, a1: (2 * (K * K - 1)) / a0, a2: (1 - K / Q + K * K) / a0 }; })();
    Object.assign(a, shelf);
    b.set('hp', 38.13547, 0.5003270373238773);
    for (let i = 0; i < x.length; i++) y[i] = b.run(a.run(x[i]));
    return y;
  };
  const l = kw(L), r = kw(R), blk = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), z = [];
  for (let s = 0; s + blk <= l.length; s += hop) { let e = 0; for (let i = s; i < s + blk; i++) e += l[i] * l[i] + r[i] * r[i]; z.push(e / blk); }
  const L_ = e => -0.691 + 10 * Math.log10(e);
  const abs = z.filter(e => L_(e) > -70), rel = L_(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter(e => L_(e) > rel);
  return L_(gated.reduce((a, b) => a + b, 0) / gated.length);
}
function master(BUS, VERB, ECHO, kicks, sr) {
  const N = VERB.length, rv = reverb(VERB, sr), ec = pingPong(ECHO, sr);
  // sidechain: the music bus ducks under every kick
  const duck = new Float32Array(N).fill(1), rel = Math.round(0.28 * sr);
  for (const t of kicks) { const i0 = Math.round(t * sr); for (let k = 0; k < rel && i0 + k < N; k++) duck[i0 + k] = Math.min(duck[i0 + k], 1 - 0.62 * Math.exp(-k / (0.07 * sr))); }
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    L[i] = BUS.music.L[i] * duck[i] + BUS.drums.L[i] + BUS.fx.L[i] * 1.5 + rv.L[i] * 2.5 + ec.L[i] * 0.6;
    R[i] = BUS.music.R[i] * duck[i] + BUS.drums.R[i] + BUS.fx.R[i] * 1.5 + rv.R[i] * 2.5 + ec.R[i] * 0.6;
  }
  // tail-out over the last second
  for (let i = Math.round(28.9 * sr); i < N; i++) { const g = clamp((DUR - 0.02 - i / sr) / 1.08); L[i] *= g; R[i] *= g; }
  // loudness to −14 LUFS integrated (the −13 target offsets this simplified K-filter against ffmpeg ebur128),
  // then a 5 ms look-ahead peak limiter at −2 dBFS so the AAC encode stays under −1 dBTP
  const gain = 10 ** ((-13 - lufs(L, R, sr)) / 20), ceil = 10 ** (-2 / 20), look = Math.round(0.005 * sr), relK = Math.exp(-1 / (0.06 * sr));
  const peak = new Float32Array(N);
  for (let i = 0; i < N; i++) peak[i] = Math.max(Math.abs(L[i]), Math.abs(R[i])) * gain;
  let g = 1;
  const outL = new Float32Array(N), outR = new Float32Array(N);
  const q = new Int32Array(N); // monotonic deque of indices: running max over the look-ahead window
  let qh = 0, qt = 0;
  for (let k = 0; k < Math.min(N, look); k++) { while (qt > qh && peak[q[qt - 1]] <= peak[k]) qt--; q[qt++] = k; }
  for (let i = 0; i < N; i++) {
    const add = i + look - 1;
    if (add >= look && add < N) { while (qt > qh && peak[q[qt - 1]] <= peak[add]) qt--; q[qt++] = add; }
    while (q[qh] < i) qh++;
    const p = peak[q[qh]];
    const want = p > ceil ? ceil / p : 1;
    g = want < g ? want : want + (g - want) * relK;
    outL[i] = L[i] * gain * g; outR[i] = R[i] * gain * g;
  }
  return { L: outL, R: outR, sr };
}

// 16-bit PCM WAV, base64 (handed to the renderer through Playwright)
function wavB64({ L, R, sr }) {
  const n = L.length, bytes = new Uint8Array(44 + n * 4), v = new DataView(bytes.buffer);
  const tag = (o, s) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  tag(0, 'RIFF'); v.setUint32(4, 36 + n * 4, true); tag(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  tag(36, 'data'); v.setUint32(40, n * 4, true);
  for (let i = 0, o = 44; i < n; i++, o += 4) {
    v.setInt16(o, Math.round(clamp(L[i], -1, 1) * 32767), true);
    v.setInt16(o + 2, Math.round(clamp(R[i], -1, 1) * 32767), true);
  }
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
