// The score: an original 96 BPM cinematic-hybrid cue in D minor, plus every hit, whoosh and tick,
// synthesised offline with Web Audio and placed on the same beat grid the picture is cut to.
import { DUR, B, AR } from './config.js';
import { rng, E, ease, TAU } from './util.js';

const s = b => b * B;                                   // beats → seconds
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// chord voicings (MIDI) and bass roots
const CH = {
  Dm: { v: [50, 53, 57, 62, 64], r: 38 }, Bb: { v: [46, 53, 58, 62, 65], r: 34 }, F: { v: [48, 53, 57, 60, 65], r: 41 },
  C: { v: [48, 52, 55, 60, 64], r: 36 }, A: { v: [45, 52, 57, 61, 64], r: 33 }, D: { v: [50, 54, 57, 62, 66], r: 38 }
};

let ac, R, OUT, DR, FXB, MUS, DUCK, STUT, TONE, VIN, DIN, NZ;
const pumps = [];

/* ---------- plumbing ---------- */
function gain(v, dest) { const n = ac.createGain(); n.gain.value = v; if (dest) n.connect(dest); return n; }
function filt(type, f, Q = 0.7) { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = Q; return n; }
function panner(p, dest) { const n = ac.createStereoPanner(); n.pan.value = p; if (dest) n.connect(dest); return n; }
function osc(type, t0, t1, f = 440) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.start(t0); o.stop(t1); return o; }
const CURVES = {};
function shaper(k, dest) {
  const n = ac.createWaveShaper();
  n.curve = CURVES[k] || (CURVES[k] = Float32Array.from({ length: 2048 }, (_, i) => Math.tanh((i / 1023.5 - 1) * k) / Math.tanh(k)));
  n.oversample = '2x';
  if (dest) n.connect(dest);
  return n;
}
// automation: [t, v] sets, [t, v, 'l'] linear ramp, [t, v, 'e'] exponential ramp
function env(p, pts) {
  p.setValueAtTime(pts[0][1], pts[0][0]);
  for (let i = 1; i < pts.length; i++) {
    const [t, v, k] = pts[i];
    if (k === 'e') p.exponentialRampToValueAtTime(Math.max(v, 1e-4), t);
    else if (k === 'l') p.linearRampToValueAtTime(v, t);
    else p.setValueAtTime(v, t);
  }
}
function send(node, verb = 0, dly = 0) { if (verb) node.connect(gain(verb, VIN)); if (dly) node.connect(gain(dly, DIN)); }
function noise(kind, t0, dur, dest) {
  const n = ac.createBufferSource(); n.buffer = NZ[kind]; n.loop = true; n.connect(dest);
  n.start(t0, R() * 1.8); n.stop(t0 + dur + 0.02); return dest;
}
function noiseBuffers() {
  const sr = ac.sampleRate, len = Math.floor(sr * 2), out = {};
  for (const kind of ['white', 'pink', 'brown']) {
    const buf = ac.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < len; i++) {
        const w = R() * 2 - 1;
        if (kind === 'white') d[i] = w;
        else if (kind === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      }
    }
    out[kind] = buf;
  }
  return out;
}
// a dark, wide plate: decorrelated noise with a frequency-dependent decay
function impulse(sec, decay) {
  const sr = ac.sampleRate, n = Math.floor(sec * sr), buf = ac.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, k = Math.min(1, 0.9 * t / sec + 0.08);
      lp += (R() * 2 - 1 - lp) * (1 - k);
      d[i] = lp * Math.pow(1 - i / n, decay) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
    }
  }
  return buf;
}

/* ---------- instruments ---------- */
function pump(t, depth = 0.55) { pumps.push([t, depth]); }

function kick(t, v = 1, o = {}) {
  const dec = o.dec || 0.42, f0 = o.f0 || 165, f1 = o.f1 || 46;
  v *= 0.5;
  const k = osc('sine', t, t + dec + 0.05);
  env(k.frequency, [[t, f0], [t + 0.07, f1, 'e'], [t + dec, f1 * 0.82, 'e']]);
  const a = gain(0);
  env(a.gain, [[t, 0], [t + 0.002, v, 'l'], [t + 0.1, v * 0.75, 'e'], [t + dec, 0.0001, 'e']]);
  k.connect(a).connect(shaper(2.4, DR));
  const c = gain(0, DR); env(c.gain, [[t, v * 0.32], [t + 0.014, 0.0001, 'e']]);
  noise('white', t, 0.02, filt('highpass', 2200)).connect(c);
  if (o.pump !== false) pump(t, o.depth ?? 0.55);
}
function snare(t, v = 0.4, pan = 0) {
  const p = panner(pan, DR);
  const body = osc('triangle', t, t + 0.16);
  env(body.frequency, [[t, 260], [t + 0.05, 180, 'e']]);
  const ba = gain(0, p); env(ba.gain, [[t, v * 0.7], [t + 0.12, 0.0001, 'e']]); body.connect(ba);
  const bp = filt('bandpass', 2400, 0.8), na = gain(0, p);
  env(na.gain, [[t, v], [t + 0.17, 0.0001, 'e']]);
  noise('white', t, 0.2, bp).connect(na);
  send(na, 0.18);
}
function clap(t, v = 0.45) {
  const bp = filt('bandpass', 1250, 1.1), a = gain(0, DR);
  env(a.gain, [[t, 0], [t + 0.001, v, 'l'], [t + 0.009, v * 0.15, 'e'], [t + 0.0105, v * 0.9, 'l'], [t + 0.02, v * 0.15, 'e'],
    [t + 0.0215, v * 0.8, 'l'], [t + 0.22, 0.0001, 'e']]);
  noise('white', t, 0.25, bp); bp.connect(a);
  send(a, 0.3);
}
function hat(t, v = 0.1, open = false, pan = 0) {
  const dec = open ? 0.2 : 0.04, hp = filt('highpass', 7200, 0.9), pk = filt('peaking', 10500, 1.4);
  pk.gain.value = 5;
  const a = gain(0, panner(pan, DR)); env(a.gain, [[t, v], [t + dec, 0.0001, 'e']]);
  noise('white', t, dec + 0.02, hp); hp.connect(pk).connect(a);
}
function crash(t, v = 0.35, dur = 2.6) {
  const hp = filt('highpass', 3800, 0.5), pk = filt('peaking', 6800, 0.9); pk.gain.value = 7;
  const a = gain(0, FXB); env(a.gain, [[t, v], [t + 0.07, v * 0.55, 'e'], [t + dur, 0.0001, 'e']]);
  noise('white', t, dur, hp); hp.connect(pk).connect(a);
  send(a, 0.45);
}
function revCym(tEnd, len, v = 0.3) {
  const t0 = tEnd - len, hp = filt('highpass', 1600, 0.6);
  env(hp.frequency, [[t0, 1600], [tEnd, 7000, 'e']]);
  const a = gain(0, FXB); env(a.gain, [[t0, 0.0001], [tEnd - 0.012, v, 'e'], [tEnd, 0, 'l']]);
  noise('white', t0, len, hp); hp.connect(a);
  send(a, 0.35);
}
function boom(t, v = 1, f = 46, dec = 2.4) {
  v *= 0.8;
  const o = osc('sine', t, t + dec + 0.1);
  env(o.frequency, [[t, f * 2.8], [t + 0.11, f, 'e'], [t + dec, f * 0.72, 'e']]);
  const a = gain(0, FXB);
  env(a.gain, [[t, 0], [t + 0.004, v, 'l'], [t + 0.3, v * 0.6, 'e'], [t + dec, 0.0001, 'e']]);
  o.connect(shaper(3)).connect(a);
  const lp = filt('lowpass', 240, 0.9), th = gain(0, FXB);
  env(th.gain, [[t, v * 1.3], [t + 0.38, 0.0001, 'e']]);
  noise('brown', t, 0.42, lp); lp.connect(th);
  const bp = filt('bandpass', 1500, 0.6), cr = gain(0, FXB);
  env(cr.gain, [[t, v * 0.45], [t + 0.1, 0.0001, 'e']]);
  noise('white', t, 0.12, bp); bp.connect(cr);
  send(cr, 0.7); send(a, 0.18);
}
// brass-like low cluster with an opening filter, the "braam"
function braam(t, dur, notes, v = 0.6, o = {}) {
  const bus = gain(0, FXB);
  env(bus.gain, [[t, 0], [t + 0.03, v, 'l'], [t + Math.min(0.6, dur * 0.4), v * 0.65, 'e'], [t + dur, 0.0001, 'e']]);
  const lp = filt('lowpass', 150, 2.6);
  env(lp.frequency, [[t, 140], [t + 0.12, o.open || 2400, 'e'], [t + dur * 0.55, 420, 'e'], [t + dur, 220, 'e']]);
  lp.connect(shaper(2.2)).connect(bus);
  send(bus, o.verb ?? 0.45);
  const g = 0.5 / Math.sqrt(notes.length * 3);
  for (const m of notes) {
    for (const d of [-11, 0, 9]) {
      const w = osc('sawtooth', t, t + dur + 0.05, mtof(m));
      w.detune.value = d + (R() - 0.5) * 5;
      env(w.frequency, [[t, mtof(m) * 0.95], [t + 0.09, mtof(m), 'e']]);
      w.connect(panner(d / 16, gain(g, lp)));
    }
  }
}
function pad(t0, t1, notes, v = 0.14, o = {}) {
  const atk = o.atk ?? 0.8, rel = o.rel ?? 1.0;
  const bus = gain(0, o.dest || MUS);
  env(bus.gain, [[t0, 0], [t0 + atk, v, 'l'], [t1, v * 0.9, 'l'], [t1 + rel, 0.0001, 'e']]);
  const lp = filt('lowpass', o.cut ?? 1500, 0.9);
  const lfo = osc('sine', t0, t1 + rel, 0.11 + R() * 0.05);
  lfo.connect(gain(o.cutMod ?? 450, lp.frequency));
  lp.connect(bus);
  send(bus, o.verb ?? 0.55, o.dly ?? 0);
  const g = 0.32 / Math.sqrt(notes.length * 4);
  notes.forEach((m, i) => {
    [-13, -4, 5, 12].forEach((d, j) => {
      const w = osc(j % 2 ? 'sawtooth' : 'triangle', t0, t1 + rel + 0.05, mtof(m));
      w.detune.value = d;
      w.connect(panner(((i + j) % 4) / 1.5 - 1, gain(g, lp)));
    });
  });
}
function sub(t0, t1, m, v = 0.4, o = {}) {
  const w = osc('sine', t0, t1 + (o.rel ?? 0.3) + 0.05, mtof(m));
  const a = gain(0, o.dest || MUS);
  env(a.gain, [[t0, 0], [t0 + (o.atk ?? 0.4), v, 'l'], [t1, v, 'l'], [t1 + (o.rel ?? 0.3), 0.0001, 'e']]);
  w.connect(a);
}
function bass(t, dur, m, v = 0.32, bright = 1) {
  const f = mtof(m), lp = filt('lowpass', 200, 5);
  env(lp.frequency, [[t, 260 + 1300 * bright], [t + dur * 0.9, 170, 'e']]);
  const a = gain(0, MUS); env(a.gain, [[t, 0], [t + 0.004, v, 'l'], [t + dur, 0.0001, 'e']]);
  lp.connect(shaper(1.6)).connect(a);
  osc('sawtooth', t, t + dur + 0.02, f).connect(gain(0.5, lp));
  osc('sawtooth', t, t + dur + 0.02, f * 1.004).connect(gain(0.35, lp));
  const sb = osc('sine', t, t + dur + 0.02, f), sa = gain(0, MUS);
  env(sa.gain, [[t, 0], [t + 0.006, v * 0.6, 'l'], [t + dur, 0.0001, 'e']]); sb.connect(sa);
}
// FM: glass plucks, bells and a tine piano from one voice
function fm(t, m, v = 0.2, o = {}) {
  const f = mtof(m), dec = o.dec ?? 1.1;
  const car = osc('sine', t, t + dec + 0.05, f), mod = osc('sine', t, t + dec + 0.05, f * (o.ratio ?? 3.01));
  const mi = gain(0); env(mi.gain, [[t, f * (o.index ?? 2.2)], [t + (o.mdec ?? 0.3), f * 0.04, 'e']]);
  mod.connect(mi).connect(car.frequency);
  const p = panner(o.pan ?? 0, o.dest || MUS), a = gain(0, p);
  env(a.gain, [[t, 0], [t + (o.atk ?? 0.003), v, 'l'], [t + dec, 0.0001, 'e']]);
  car.connect(a);
  send(p, o.verb ?? 0.35, o.dly ?? 0.25);
}
function pluck(t, m, v = 0.07, pan = 0) {
  const f = mtof(m), lp = filt('lowpass', 3000, 3);
  env(lp.frequency, [[t, 4200], [t + 0.16, 380, 'e']]);
  const p = panner(pan, MUS), a = gain(0, p);
  env(a.gain, [[t, 0], [t + 0.003, v, 'l'], [t + 0.32, 0.0001, 'e']]);
  osc('sawtooth', t, t + 0.36, f).connect(lp); osc('square', t, t + 0.36, f * 2.003).connect(gain(0.25, lp));
  lp.connect(a);
  send(p, 0.2, 0.35);
}
function choir(t0, t1, notes, v = 0.2, o = {}) {
  const bus = gain(0, o.dest || MUS);
  env(bus.gain, [[t0, 0], [t0 + (o.atk ?? 0.35), v, 'l'], [t1, v * 0.85, 'l'], [t1 + (o.rel ?? 1.4), 0.0001, 'e']]);
  send(bus, 0.75);
  const src = gain(1);
  for (const [f, q, g] of [[800, 9, 1], [1150, 11, 0.55], [2900, 22, 0.28], [3900, 28, 0.12]]) {
    const bp = filt('bandpass', f, q); src.connect(bp); bp.connect(gain(g * 2.2, bus));
  }
  const vib = osc('sine', t0, t1 + 1.5, 5.1), vg = gain(7); vib.connect(vg);
  for (const m of notes) for (const d of [-8, 0, 8]) {
    const w = osc('sawtooth', t0, t1 + 1.5, mtof(m)); w.detune.value = d; vg.connect(w.detune);
    w.connect(panner(d / 12, gain(0.22 / Math.sqrt(notes.length), src)));
  }
}
function riser(t0, t1, v = 0.3, o = {}) {
  const bp = filt('bandpass', o.f0 || 300, o.q || 2.5);
  env(bp.frequency, [[t0, o.f0 || 300], [t1, o.f1 || 7500, 'e']]);
  const p = ac.createStereoPanner(); p.connect(FXB);
  const lfo = osc('sine', t0, t1, 0.5); env(lfo.frequency, [[t0, 0.4], [t1, 8, 'e']]); lfo.connect(gain(0.55, p.pan));
  const a = gain(0, p); env(a.gain, [[t0, 0.0001], [t1 - 0.01, v, 'e'], [t1 + 0.015, 0.0001, 'e']]);
  noise('pink', t0, t1 - t0, bp); bp.connect(a);
  send(a, 0.4);
  if (o.tone) {
    const w = osc('sawtooth', t0, t1 + 0.03, mtof(o.tone));
    env(w.frequency, [[t0, mtof(o.tone)], [t1, mtof(o.tone + (o.span ?? 24)), 'e']]);
    const lp = filt('lowpass', 500, 3); env(lp.frequency, [[t0, 400], [t1, 6000, 'e']]);
    const ta = gain(0, FXB); env(ta.gain, [[t0, 0.0001], [t1 - 0.01, v * 0.3, 'e'], [t1 + 0.015, 0.0001, 'e']]);
    w.connect(lp).connect(ta); send(ta, 0.4);
  }
}
function whoosh(t, dur, v = 0.35, o = {}) {
  const pk = t + dur * (o.peak ?? 0.6);
  const bp = filt('bandpass', o.f0 || 400, o.q || 1.3);
  env(bp.frequency, [[t, o.f0 || 400], [pk, o.f1 || 3800, 'e'], [t + dur, o.f2 || 700, 'e']]);
  const p = ac.createStereoPanner(); p.connect(FXB); env(p.pan, [[t, o.p0 ?? -0.7], [t + dur, o.p1 ?? 0.7, 'l']]);
  const a = gain(0, p); env(a.gain, [[t, 0.0001], [pk, v, 'e'], [t + dur, 0.0001, 'e']]);
  noise('pink', t, dur, bp); bp.connect(a);
  send(a, o.verb ?? 0.3);
}
// electric draw-on: resonant saw sweep with a crackle
function zap(t0, t1, v = 0.18, f0 = 220, f1 = 2000) {
  const w = osc('sawtooth', t0, t1 + 0.1, f0); env(w.frequency, [[t0, f0], [t1, f1, 'e']]);
  const bp = filt('bandpass', f0 * 3, 7); env(bp.frequency, [[t0, f0 * 3], [t1, f1 * 2.5, 'e']]);
  const a = gain(0, panner(0, FXB)); env(a.gain, [[t0, 0], [t0 + 0.03, v, 'l'], [t1, v * 0.8, 'l'], [t1 + 0.12, 0.0001, 'e']]);
  w.connect(bp).connect(a);
  const hp = filt('highpass', 4000), cg = gain(0.5), am = osc('square', t0, t1, 31);
  am.connect(gain(0.5, cg.gain));
  const ca = gain(0, FXB); env(ca.gain, [[t0, 0], [t0 + 0.05, v * 0.5, 'l'], [t1, v * 0.4, 'l'], [t1 + 0.05, 0.0001, 'e']]);
  noise('white', t0, t1 - t0 + 0.1, hp); hp.connect(cg).connect(ca);
  send(a, 0.4, 0.2);
}
function glitch(t0, t1, v = 0.22, seed = 5) {
  const r = rng(seed), crush = ac.createWaveShaper();
  crush.curve = Float32Array.from({ length: 1024 }, (_, i) => Math.round((i / 511.5 - 1) * 5) / 5);
  crush.connect(gain(v, FXB));
  for (let t = t0; t < t1;) {
    const d = 0.018 + r() * 0.05, k = r(), p = panner(r() * 1.6 - 0.8, crush), a = gain(0, p);
    env(a.gain, [[t, 0], [t + 0.002, 1, 'l'], [t + d - 0.003, 0.8, 'l'], [t + d, 0, 'l']]);
    if (k < 0.45) osc(r() < 0.5 ? 'square' : 'sawtooth', t, t + d, 180 * Math.pow(2, r() * 4.5)).connect(a);
    else if (k < 0.85) { const hp = filt('highpass', 500 + r() * 6000); noise('white', t, d, hp); hp.connect(a); }
    t += d + (r() < 0.25 ? r() * 0.04 : 0);
  }
}
function tick(t, v = 0.08, f = 3600, pan = 0) {
  const o = osc('sine', t, t + 0.03, f), a = gain(0, panner(pan, FXB));
  env(a.gain, [[t, v], [t + 0.014, 0.0001, 'e']]); o.connect(a);
  const c = gain(0, FXB); env(c.gain, [[t, v * 0.6], [t + 0.004, 0.0001, 'e']]);
  noise('white', t, 0.006, filt('highpass', 6000)).connect(c);
}
function heart(t, v = 0.7) {
  for (const [dt, f, k] of [[0, 64, 1], [0.16, 52, 0.7]]) {
    const o = osc('sine', t + dt, t + dt + 0.3); env(o.frequency, [[t + dt, f * 1.7], [t + dt + 0.05, f, 'e']]);
    const a = gain(0, FXB); env(a.gain, [[t + dt, 0], [t + dt + 0.008, v * k, 'l'], [t + dt + 0.24, 0.0001, 'e']]);
    o.connect(shaper(1.8)).connect(filt('lowpass', 220)).connect(a);
  }
  fm(t + 0.005, 86, 0.05, { ratio: 2, index: 0.4, dec: 0.35, dest: FXB, verb: 0.5, dly: 0.3 });
}
function uiClick(t, v = 0.3) {
  const o = osc('square', t, t + 0.03); env(o.frequency, [[t, 2400], [t + 0.012, 900, 'e']]);
  const a = gain(0, FXB); env(a.gain, [[t, v * 0.5], [t + 0.018, 0.0001, 'e']]); o.connect(filt('lowpass', 5000)).connect(a);
  const c = gain(0, FXB); env(c.gain, [[t, v], [t + 0.005, 0.0001, 'e']]);
  noise('white', t, 0.008, filt('highpass', 3000)).connect(c);
}

/* ---------- the cue ---------- */
const sectionChords = [
  [13, 17, 'Dm'], [17, 21, 'Dm'], [21, 24, 'Bb'], [24, 28, 'F'], [28, 29, 'A'], [29, 31, 'Dm'], [31, 33, 'Bb'],
  [33, 35, 'Bb'], [35, 37, 'C'], [37, 38, 'Dm'], [38, 38.65, 'Bb'], [38.65, 39.2, 'C']
];
const chordAt = b => (sectionChords.find(([a, z]) => b >= a && b < z) || [0, 0, 'Dm'])[2];

function arrange() {
  /* S1 · greetings (b0–3.5) */
  pad(s(0), s(3.3), [50, 57, 62, 64, 69], 0.13, { atk: 1.6, rel: 0.2, cut: 1100, verb: 0.75 });
  sub(s(0.5), s(3.35), 38, 0.1, { atk: 1.4, rel: 0.08 });
  const GN = [74, 81, 77, 84, 81, 88, 86, 93];
  GN.forEach((m, i) => {
    const t = s(0.5 + 0.25 * i);
    fm(t, m, i === 7 ? 0.2 : 0.14, { pan: i % 2 ? 0.4 : -0.4, dec: i === 7 ? 1.6 : 0.8, dly: 0.3 });
    tick(t, 0.035, 5200, i % 2 ? 0.3 : -0.3);
  });
  fm(s(2.25), 81, 0.1, { ratio: 2, dec: 1.5, pan: 0.2 });
  riser(s(0.4), s(3.0), 0.07, { f0: 400, f1: 6000, q: 4 });
  whoosh(s(2.4), s(0.8), 0.14, { f0: 900, f1: 5000, f2: 2000 });
  revCym(s(3.42), s(1.1), 0.22);
  // the word is sucked into a point of light: a falling tone, then a glint and silence
  { const t0 = s(3.05), t1 = s(3.42), o = osc('sine', t0, t1 + 0.02); env(o.frequency, [[t0, 900], [t1, 70, 'e']]);
    const a = gain(0, FXB); env(a.gain, [[t0, 0.0001], [t1 - 0.02, 0.12, 'e'], [t1, 0, 'l']]); o.connect(a); }
  fm(s(3.42), 98, 0.1, { ratio: 3.5, index: 1.2, dec: 0.5, dest: FXB, verb: 0.6, dly: 0.25 });

  /* S2 · hook — three slams (b4, 5, 6) + a ticking clock */
  [[26, 38, 45], [26, 38, 45, 53], [26, 38, 45, 50, 53, 57]].forEach((nt, i) => {
    const t = s(4 + i);
    boom(t, 0.85 + 0.12 * i, 46 - 3 * i, 1.6 + 0.5 * i);
    braam(t, i < 2 ? 0.95 : 1.9, nt, 0.48 + 0.1 * i, { open: 2000 + 500 * i });
    kick(t, 1, { pump: false, dec: 0.7, f1: 40 });
  });
  crash(s(6), 0.3, 2.8);
  for (let b = 4.5; b < 6.9; b += 0.5) if (b % 1) tick(s(b), 0.05, 2600, -0.2); else tick(s(b), 0.05, 3300, 0.2);
  for (let b = 6.25; b < 6.8; b += 0.25) tick(s(b), 0.035, 3300, 0.2);
  glitch(s(6.8), s(7.22), 0.16, 11);
  revCym(s(7.25), s(0.45), 0.18);

  /* S3 · particles → "We do." → the mark ignites (b7.25–12.4) */
  whoosh(s(7.15), s(1.05), 0.4, { f0: 300, f1: 6500, f2: 1600, peak: 0.85, p0: 0.8, p1: -0.6 });
  [62, 65, 69, 72, 74, 77, 81].forEach((m, i) => fm(s(7.3 + i * 0.125), m + 12, 0.07, { pan: (i % 2 ? 0.5 : -0.5), dec: 0.6, dly: 0.35 }));
  { const t = s(8.15);
    kick(t, 1, { pump: false }); clap(t, 0.4); boom(t, 0.55, 52, 1.2); crash(t, 0.16, 1.6);
    choir(t, s(9.1), [62, 65, 69], 0.13, { atk: 0.05, rel: 1.0 }); fm(t, 86, 0.1, { dec: 1.4, pan: 0.3 }); }
  for (let b = 8.5; b < 11; b += 0.5) bass(s(b), s(0.42), 38, 0.18 + 0.05 * (b - 8.5), 0.3 + 0.25 * (b - 8.5));
  pad(s(8.4), s(10.9), CH.Dm.v, 0.08, { atk: 1.2, rel: 0.2, cut: 1200 });
  riser(s(9.0), s(9.9), 0.12, { f0: 700, f1: 4200, tone: 62, span: 12 });
  zap(s(9.75), s(10.75), 0.16, 220, 1700);
  zap(s(10.55), s(10.95), 0.12, 700, 2600);
  revCym(s(11), s(1.3), 0.32);
  riser(s(10.0), s(11), 0.18, { f0: 500, f1: 9000, tone: 50 });
  { const t = s(11);
    boom(t, 1.05, 41, 3.2); kick(t, 1.1, { pump: false, dec: 0.85, f1: 38 });
    braam(t, 3.2, [26, 38, 45, 50, 53, 57], 0.72, { open: 3200, verb: 0.65 });
    crash(t, 0.42, 3.4); choir(s(11.05), s(12.5), [50, 57, 62, 65], 0.17, { atk: 0.08 });
    whoosh(s(10.9), s(0.8), 0.25, { f0: 200, f1: 2500, f2: 300, peak: 0.25, p0: 0, p1: 0 }); }
  pad(s(11.2), s(12.95), CH.Bb.v, 0.1, { atk: 0.5, rel: 0.15, cut: 1700 });

  /* portal → drop on b13 */
  riser(s(11.9), s(13), 0.3, { tone: 50 });
  [12, 12.5, 12.75, 12.875, 13 - 0.0625].forEach(b => snare(s(b), 0.16));
  for (let b = 12.5; b < 13; b += 0.0625) snare(s(b), 0.06 + 0.22 * (b - 12.5), (b * 8 % 2) ? 0.15 : -0.15);
  whoosh(s(12.45), s(0.95), 0.4, { f0: 200, f1: 6000, f2: 250, peak: 0.55, p0: -0.2, p1: 0.2 });
  { const t = s(13); boom(t, 0.75, 46, 1.6); crash(t, 0.3, 2.4); }

  /* the groove: b13 → 39.2 */
  sectionChords.forEach(([a, z, c]) => {
    pad(s(a), s(z), CH[c].v, c === 'A' ? 0.11 : 0.09, { atk: 0.12, rel: 0.12, cut: a >= 24 && a < 28 ? 2600 : 1800, verb: 0.45 });
  });
  for (let b = 13; b < 39.2 - 1e-6; b += 0.25) {
    const c = CH[chordAt(b)], q = Math.round((b % 1) * 4), bar = (b - 13) % 4;
    const oct = q === 2 ? 12 : 0;
    if (b >= 28 && b < 29) continue;                           // the breach beat belongs to the glitch
    bass(s(b), s(0.23), c.r + oct, q === 0 ? 0.24 : 0.16, b < 17 ? 0.35 + 0.15 * (b - 13) / 4 : 0.9);
    // drums
    if (q === 0) kick(s(b), b < 17 ? 0.85 : 1);
    if (b >= 15 && q === 0 && (Math.floor(b) - 13) % 2 === 1 && b < 37) clap(s(b), b < 17 ? 0.3 : 0.42);
    if (q === 2) hat(s(b), b < 17 ? 0.05 : 0.08, b >= 17, 0.25);
    else if (b >= 17) hat(s(b), q === 0 ? 0.035 : 0.028, false, -0.2);
    if (b >= 17 && bar === 3.75) kick(s(b), 0.55, { depth: 0.3 });
    // 16th arp (from the services onward)
    if (b >= 17 && b < 37) {
      const ARP = [0, 2, 1, 3, 2, 4, 3, 1], k = Math.round((b - 13) * 4) % 8;
      pluck(s(b), c.v[ARP[k] % c.v.length] + 12, b >= 24 && b < 28 ? 0.06 : 0.045, k % 2 ? 0.45 : -0.45);
    }
  }
  // stats: odometers tick, then lock with a ping
  [[13.25, '12'], [13.75, '11'], [14.25, '5']].forEach(([t0, n], i) => {
    const target = +n[n.length - 1] + 10;
    let last = 0;
    for (let b = t0; b <= t0 + 0.8; b += 0.004) {
      const v = Math.floor(target * E(b, t0, t0 + 0.8, ease.expoOut));
      if (v !== last) { tick(s(b), 0.045, 4200 + 300 * i, [-0.5, 0, 0.5][AR ? 2 - i : i]); last = v; }
    }
    fm(s(t0 + 0.55), [81, 84, 88][i], 0.1, { ratio: 1.4, index: 1.5, dec: 1.2, pan: [-0.5, 0, 0.5][AR ? 2 - i : i] });
  });
  whoosh(s(16.5), s(0.9), 0.3, { f0: 250, f1: 4000, f2: 400 });        // iris into the services
  // twelve services, one per beat: a swipe and a note each, a hit on every group change
  const SN = [74, 77, 81, 86, 77, 82, 86, 77, 81, 84, 89, 85];
  for (let i = 0; i < 12; i++) {
    const b = 17 + i;
    whoosh(s(b - 0.14), s(0.26), 0.12, { f0: 1200, f1: 6000, f2: 2500, p0: i % 2 ? 0.6 : -0.6, p1: i % 2 ? -0.2 : 0.2 });
    fm(s(b), SN[i], 0.11, { ratio: 3.01, index: 1.8, dec: 0.9, pan: i % 2 ? 0.3 : -0.3, dly: 0.3 });
  }
  [21, 24].forEach(b => { boom(s(b), 0.4, 50, 1.0); crash(s(b), 0.18, 1.6); });
  whoosh(s(20.7), s(0.65), 0.25, { f0: 200, f1: 2200, f2: 300, q: 0.9 });      // ink wipe
  whoosh(s(23.55), s(0.8), 0.25, { f0: 1500, f1: 9000, f2: 3000, p0: -0.9, p1: 0.9 }); // light streak
  fm(s(23.7), 93, 0.06, { ratio: 1.4, dec: 1.4, pan: 0.6 });
  // the breach: the groove stutters, then a broken, distorted downbeat
  for (let b = 27.5; b < 28; b += 0.125) STUT.gain.setValueAtTime((b * 8) % 2 < 1 ? 1 : 0.15, s(b));
  STUT.gain.setValueAtTime(1, s(28));
  glitch(s(27.8), s(28.25), 0.2, 23);
  { const t = s(28); boom(t, 0.6, 44, 1.0); kick(t, 1, { pump: false }); braam(t, 0.62, [33, 45, 52, 57], 0.45, { open: 2600 });
    for (let k = 0; k < 4; k++) snare(s(28.5 + k * 0.125), 0.08 + k * 0.04); }
  // products: whip, then a ratchet as each card passes the front
  whoosh(s(28.7), s(0.6), 0.45, { f0: 300, f1: 5000, f2: 400, peak: 0.5, p0: AR ? 0.9 : -0.9, p1: AR ? -0.9 : 0.9 });
  { const step = TAU / 11; let last = null;
    for (let b = 29; b <= 33; b += 0.002) {
      const ang = (1 - E(b, 29, 33, ease.outQt)) * TAU * 1.35, k = Math.floor(ang / step + 0.5);
      if (last !== null && k !== last) tick(s(b), 0.06, 1900, 0);
      last = k;
    } }
  fm(s(32.2), 86, 0.1, { ratio: 1.4, index: 1.8, dec: 1.6 });           // the AI card lands front
  whoosh(s(32.6), s(0.8), 0.25, { f0: 200, f1: 2000, f2: 300, q: 0.9 });  // ink wipe
  // platforms: a bell for each
  [77, 82, 86, 89, 91].forEach((m, i) => fm(s(33.6 + i * 0.4), m, 0.13, { ratio: 1.41, index: 2.6, mdec: 0.8, dec: 2.2, pan: (AR ? -1 : 1) * (i - 2) * 0.3, dly: 0.25 }));
  riser(s(35.4), s(37), 0.16, { f0: 500, f1: 7000 });
  whoosh(s(36.65), s(0.8), 0.28, { f0: 1500, f1: 9000, f2: 3000, p0: -0.9, p1: 0.9 });
  // process: one hit per word, the snare climbs to "Keep alive."
  [37.15, 37.65, 38.15, 38.65].forEach((b, i) => {
    boom(s(b), 0.4 + 0.07 * i, 52 - i, 0.8);
    braam(s(b), 0.42, [[38, 50], [41, 53], [43, 55], [45, 57]][i], 0.3 + 0.05 * i, { open: 1800 + 400 * i, verb: 0.3 });
  });
  for (let b = 37; b < 39.2; b += b < 38 ? 0.5 : b < 38.65 ? 0.25 : 0.125) snare(s(b), 0.1 + 0.12 * (b - 37) / 2.2, (b * 4) % 2 ? 0.2 : -0.2);
  riser(s(38.2), s(39.2), 0.22, { tone: 57, span: 12 });

  /* "Keep alive." — the beat drops away to a heartbeat (b39.2–43.5) */
  { const t = s(39.2);
    boom(t, 0.95, 40, 3); kick(t, 1, { pump: false, dec: 0.8 }); crash(t, 0.35, 3);
    braam(t, 2.0, [26, 38, 45, 50, 53], 0.55, { open: 2600 }); choir(t, s(41), [62, 65, 69], 0.12, { atk: 0.05 }); }
  pad(s(39.3), s(41), CH.Dm.v, 0.1, { atk: 0.4, rel: 0.3, cut: 1100 });
  pad(s(41), s(42.6), CH.Bb.v, 0.1, { atk: 0.4, rel: 0.3, cut: 1300 });
  pad(s(42.6), s(43.45), CH.A.v, 0.11, { atk: 0.3, rel: 0.05, cut: 1800 });
  sub(s(39.3), s(43.4), 38, 0.08, { atk: 1, rel: 0.05 });
  // heartbeats land on the ECG spikes as the trace sweeps the frame
  const spikes = (b0, b1) => [345, 905, 1465].map(x => b0 + ((AR ? 1920 - x : x) + 40) / 2000 * (b1 - b0));
  [...spikes(39.25, 41.5), ...spikes(41, 42.6)].sort((a, c) => a - c).forEach((b, i) => heart(s(b), 0.4 + 0.03 * i));
  fm(s(41.0), 69, 0.12, { ratio: 1, index: 1.4, mdec: 0.5, dec: 2.4, pan: -0.2 });
  fm(s(41.6), 74, 0.14, { ratio: 1, index: 1.4, mdec: 0.5, dec: 2.4, pan: 0.2 });
  fm(s(41.62), 77, 0.09, { ratio: 1, index: 1.2, mdec: 0.5, dec: 2.2, pan: 0.3 });
  riser(s(42.3), s(43.5), 0.3, { tone: 45 });
  revCym(s(43.5), s(1.2), 0.3);
  whoosh(s(42.6), s(0.9), 0.3, { f0: 300, f1: 5000, f2: 2000, peak: 0.9, p0: AR ? 0.8 : -0.8, p1: 0 });

  /* the end card: the lift into D major (b43.5–48) */
  { const t = s(43.5);
    boom(t, 1.15, 38, 3.6); kick(t, 1.15, { pump: false, dec: 0.9, f1: 36 });
    braam(t, 3.4, [26, 38, 45, 50, 54, 57], 0.75, { open: 3600, verb: 0.7 });
    crash(t, 0.45, 4); choir(s(43.55), s(47.4), [62, 66, 69, 74], 0.16, { atk: 0.15, rel: 0.8 }); }
  pad(s(43.5), s(47.5), CH.D.v.concat([69, 74]), 0.12, { atk: 0.25, rel: 0.5, cut: 2200, verb: 0.7 });
  sub(s(43.5), s(47.5), 38, 0.1, { atk: 0.05, rel: 0.4 });
  whoosh(s(43.7), s(0.8), 0.2, { f0: 600, f1: 5000, f2: 1500 });
  fm(s(44.4), 78, 0.09, { ratio: 3.01, dec: 1.2, pan: -0.3 });
  { const t = s(44.9); boom(t, 0.35, 50, 1.2); [74, 78, 81, 86].forEach((m, i) => fm(t + i * 0.035, m, 0.08, { pan: (i - 1.5) * 0.3, dec: 1.6 })); }
  [0, 1, 2, 3, 4, 5].forEach(i => tick(s(45.6) + i * 0.045, 0.03, 3800 + i * 120, 0));
  whoosh(s(45.7), s(0.75), 0.1, { f0: 2000, f1: 6000, f2: 3000, p0: AR ? -0.6 : 0.6, p1: 0 });
  uiClick(s(46.45), 0.32);
  fm(s(46.5), 86, 0.12, { ratio: 1.41, index: 1.6, dec: 1.4, pan: 0.15 });
  fm(s(46.56), 93, 0.09, { ratio: 1.41, index: 1.4, dec: 1.6, pan: -0.15 });
}

export async function renderScore(sr = 48000) {
  ac = new OfflineAudioContext(2, Math.ceil(DUR * sr), sr);
  R = rng(4242);
  pumps.length = 0;
  NZ = noiseBuffers();
  // master: glue compression → soft clip; final fade with the picture
  OUT = gain(0.8);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
  OUT.connect(comp).connect(shaper(1.2)).connect(ac.destination);
  env(OUT.gain, [[0, 0.8], [s(47.3), 0.8], [s(47.95), 0.0001, 'e']]);
  DR = gain(0.8, OUT);
  FXB = gain(0.85, OUT);
  DUCK = gain(1, OUT);
  STUT = gain(1, DUCK);
  TONE = filt('lowpass', 18000, 0.5); TONE.connect(STUT);
  MUS = gain(1, TONE);
  // the music bus opens during the intro, goes underwater for the heartbeat, opens for the finale
  env(TONE.frequency, [[0, 900], [s(3.3), 5000, 'e'], [s(3.45), 18000], [s(39.25), 18000], [s(39.5), 1300, 'e'],
    [s(42.5), 1500, 'e'], [s(43.45), 9000, 'e'], [s(43.5), 18000]]);
  // reverb + ping-pong delay (dotted eighth)
  const verb = ac.createConvolver(); verb.buffer = impulse(3.4, 2.8);
  VIN = gain(1); VIN.connect(filt('highpass', 180)).connect(verb).connect(gain(0.5, OUT));
  DIN = gain(1);
  const dl = ac.createDelay(2), dr = ac.createDelay(2), fb = gain(0.38), lp = filt('lowpass', 4200), merger = ac.createChannelMerger(2);
  dl.delayTime.value = s(0.75); dr.delayTime.value = s(0.75);
  DIN.connect(lp).connect(dl); dl.connect(dr); dr.connect(fb).connect(dl);
  dl.connect(merger, 0, 0); dr.connect(merger, 0, 1);
  merger.connect(gain(0.35, OUT)); merger.connect(gain(0.15, VIN));

  arrange();

  // sidechain pump on the music bus, in time order
  pumps.sort((a, b) => a[0] - b[0]).forEach(([t, d]) => {
    DUCK.gain.setTargetAtTime(1 - d, t, 0.004);
    DUCK.gain.setTargetAtTime(1, t + 0.03, 0.085);
  });
  return ac.startRendering();
}

// 32-bit float WAV (loudness is normalised later by the renderer)
export function wavBase64(buf) {
  const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, bytes = 44 + n * ch * 4;
  const v = new DataView(new ArrayBuffer(bytes));
  const str = (o, x) => [...x].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * ch * 4, true); v.setUint16(32, ch * 4, true); v.setUint16(34, 32, true);
  str(36, 'data'); v.setUint32(40, n * ch * 4, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++, o += 4) v.setFloat32(o, data[c][i], true);
  const u8 = new Uint8Array(v.buffer);
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(bin);
}
