'use strict';
/* ==========================================================================
   Score — synthesized entirely with Web Audio, scheduled on the same beat grid
   as the picture (128 BPM, 16 bars). Rendered offline for the export and for
   the live player, so sound and picture can never drift.
   Key: A minor → resolves to C major on the end card.
   ========================================================================== */

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

async function renderScore(sampleRate = 48000) {
  const ac = new OfflineAudioContext(2, Math.ceil(DUR * sampleRate), sampleRate);
  buildScore(ac);
  return ac.startRendering();
}

function buildScore(ac) {
  const R = mulberry32(2026);
  const T = b => b * B;

  /* ---------- buses ---------- */
  const out = ac.createGain();
  out.gain.setValueAtTime(0.9, 0);
  out.gain.setValueAtTime(0.9, T(62.4));
  out.gain.linearRampToValueAtTime(0.0, DUR - 0.02);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 2.2; comp.attack.value = 0.008; comp.release.value = 0.14;
  const lim = ac.createDynamicsCompressor();
  lim.threshold.value = -1.5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.05;
  out.connect(comp); comp.connect(lim); lim.connect(ac.destination);
  const master = ac.createGain(); master.gain.value = 0.5; master.connect(out);

  const noise = ac.createBuffer(2, ac.sampleRate * 2, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = noise.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }

  const ir = ac.createBuffer(2, Math.floor(ac.sampleRate * 2.8), ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch), n = d.length;
    for (let i = 0; i < n; i++) { const x = i / n; d[i] = (R() * 2 - 1) * Math.pow(1 - x, 3.4) * (i < 400 ? i / 400 : 1); }
  }
  const rev = ac.createConvolver(); rev.normalize = true; rev.buffer = ir;
  const revLP = ac.createBiquadFilter(); revLP.type = 'lowpass'; revLP.frequency.value = 6500;
  const revOut = ac.createGain(); revOut.gain.value = 0.55;
  rev.connect(revLP); revLP.connect(revOut); revOut.connect(master);

  const dly = ac.createDelay(2); dly.delayTime.value = B * 0.75;
  const dfb = ac.createGain(); dfb.gain.value = 0.38;
  const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3200;
  const dpan = ac.createStereoPanner(); dpan.pan.value = 0.45;
  const dOut = ac.createGain(); dOut.gain.value = 0.32;
  dly.connect(dlp); dlp.connect(dfb); dfb.connect(dly); dlp.connect(dpan); dpan.connect(dOut); dOut.connect(master);

  const duck = ac.createGain(); duck.connect(master);
  const duckTimes = [];

  /* ---------- primitives ---------- */
  const gainN = (v = 0) => { const g = ac.createGain(); g.gain.value = v; return g; };
  const osc = (type, f) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const filt = (type, f, q = 0.707) => { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
  const pan = p => { const x = ac.createStereoPanner(); x.pan.value = p; return x; };
  const send = (node, bus, amt) => { const g = gainN(amt); node.connect(g); g.connect(bus); };
  const env = (g, t, a, peak, d) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  };
  const nsrc = (t, dur) => {
    const s = ac.createBufferSource(); s.buffer = noise; s.loop = true;
    s.start(t, R() * 1.5); s.stop(t + dur + 0.05);
    return s;
  };

  /* ---------- instruments ---------- */
  function kick(t, v = 1) {
    const o = osc('sine', 180), g = gainN();
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.38);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.003);
    g.gain.setValueAtTime(v, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.46);
    const n = nsrc(t, 0.03), hp = filt('highpass', 2500), ng = gainN();
    env(ng, t, 0.001, v * 0.22, 0.018);
    n.connect(hp); hp.connect(ng); ng.connect(master);
    duckTimes.push(t);
  }
  function clap(t, v = 0.4, revAmt = 0.3) {
    const n = nsrc(t, 0.35), hp = filt('highpass', 700), bp = filt('bandpass', 1350, 0.9), g = gainN();
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.011, 0.022].forEach(o => { g.gain.setValueAtTime(v, t + o); g.gain.exponentialRampToValueAtTime(v * 0.12, t + o + 0.009); });
    g.gain.setValueAtTime(v * 0.85, t + 0.032);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    n.connect(hp); hp.connect(bp); bp.connect(g); g.connect(master); send(g, rev, revAmt);
  }
  function snare(t, v = 0.2, f = 1800) {
    const n = nsrc(t, 0.15), bp = filt('bandpass', f, 0.8), g = gainN();
    env(g, t, 0.001, v, 0.09);
    n.connect(bp); bp.connect(g); g.connect(master); send(g, rev, 0.15);
    const o = osc('triangle', 220), og = gainN();
    o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.05);
    env(og, t, 0.001, v * 0.5, 0.06);
    o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.1);
  }
  function hat(t, v = 0.08, open = false, p = 0.25) {
    const n = nsrc(t, open ? 0.35 : 0.07), hp = filt('highpass', open ? 7000 : 8500), g = gainN(), pn = pan(p);
    env(g, t, 0.001, v, open ? 0.26 : 0.04);
    n.connect(hp); hp.connect(g); g.connect(pn); pn.connect(master);
  }
  function crash(t, v = 0.25, dec = 1.8) {
    const n = nsrc(t, dec + 0.1), hp = filt('highpass', 4200), g = gainN();
    env(g, t, 0.002, v, dec);
    n.connect(hp); hp.connect(g); g.connect(master); send(g, rev, 0.4);
  }
  function revSwell(t1, dur, v = 0.22) {
    const t0 = t1 - dur, n = nsrc(t0, dur), hp = filt('highpass', 3500), g = gainN();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t1 - 0.01); g.gain.linearRampToValueAtTime(0, t1);
    hp.frequency.setValueAtTime(1500, t0); hp.frequency.exponentialRampToValueAtTime(6000, t1);
    n.connect(hp); hp.connect(g); g.connect(master); send(g, rev, 0.3);
  }
  function riser(t0, t1, v = 0.16) {
    const n = nsrc(t0, t1 - t0), bp = filt('bandpass', 400, 1.2), g = gainN();
    bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(7500, t1);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t1 - 0.01); g.gain.linearRampToValueAtTime(0, t1 + 0.01);
    n.connect(bp); bp.connect(g); g.connect(master); send(g, rev, 0.35);
    const o = osc('sawtooth', 200), lp = filt('lowpass', 1800), og = gainN();
    o.frequency.setValueAtTime(180, t0); o.frequency.exponentialRampToValueAtTime(1100, t1);
    og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(v * 0.18, t1 - 0.01); og.gain.linearRampToValueAtTime(0, t1 + 0.01);
    o.connect(lp); lp.connect(og); og.connect(master); send(og, dly, 0.3); o.start(t0); o.stop(t1 + 0.05);
  }
  function whoosh(t, dur = 0.42, v = 0.16, f0 = 350, f1 = 5000, p0 = -0.7, p1 = 0.7) {
    const n = nsrc(t, dur), bp = filt('bandpass', f0, 1.3), g = gainN(), pn = pan(p0);
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7); bp.frequency.exponentialRampToValueAtTime(f0 * 2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.62); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    pn.pan.setValueAtTime(p0, t); pn.pan.linearRampToValueAtTime(p1, t + dur);
    n.connect(bp); bp.connect(g); g.connect(pn); pn.connect(master); send(pn, rev, 0.25);
  }
  function impact(t, v = 1) {
    const o = osc('sine', 100), g = gainN();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.3);
    env(g, t, 0.004, v * 0.85, 1.5);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.6);
    const n = nsrc(t, 1.4), lp = filt('lowpass', 2500), ng = gainN();
    lp.frequency.setValueAtTime(3500, t); lp.frequency.exponentialRampToValueAtTime(180, t + 0.9);
    env(ng, t, 0.002, v * 0.45, 0.9);
    n.connect(lp); lp.connect(ng); ng.connect(master); send(ng, rev, 0.9);
    crash(t, v * 0.22, 2.2);
  }
  function subDrop(t, v = 0.6, dur = 0.9) {
    const o = osc('sine', 90), g = gainN();
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(34, t + dur);
    env(g, t, 0.005, v, dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function bell(t, m, v = 0.18, dec = 1.3, revAmt = 0.35, dlyAmt = 0.25, p = 0) {
    const f = mtof(m), pn = pan(p);
    pn.connect(master); send(pn, rev, revAmt); send(pn, dly, dlyAmt);
    [[1, 1, dec], [2, 0.45, dec * 0.55], [3.01, 0.22, dec * 0.3], [4.17, 0.1, dec * 0.18]].forEach(([r, a, d]) => {
      const o = osc('sine', f * r), g = gainN();
      env(g, t, 0.002, v * a, d);
      o.connect(g); g.connect(pn); o.start(t); o.stop(t + d + 0.05);
    });
  }
  function pluck(t, m, v = 0.05, dec = 0.16, type = 'square', p = 0) {
    const o = osc(type, mtof(m)), lp = filt('lowpass', 4000, 3), g = gainN(), pn = pan(p);
    lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + dec);
    env(g, t, 0.002, v, dec);
    o.connect(lp); lp.connect(g); g.connect(pn); pn.connect(duck); send(pn, dly, 0.35);
    o.start(t); o.stop(t + dec + 0.05);
  }
  function bass(t, m, dur = 0.2, v = 0.3) {
    const f = mtof(m), o1 = osc('sawtooth', f), o2 = osc('sine', f), lp = filt('lowpass', 300, 2), g = gainN();
    lp.frequency.setValueAtTime(160, t); lp.frequency.exponentialRampToValueAtTime(1300, t + 0.015); lp.frequency.exponentialRampToValueAtTime(240, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = gainN(0.7);
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(duck);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }
  function pad(t, dur, notes, v = 0.03, cutoff = 1800, revAmt = 0.4) {
    const g = gainN(), lp = filt('lowpass', cutoff, 0.6);
    lp.frequency.setValueAtTime(cutoff, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.18);
    g.gain.setValueAtTime(v, t + dur - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
    notes.forEach(m => [-9, 9].forEach((ct, i) => {
      const o = osc('sawtooth', mtof(m)); o.detune.value = ct;
      const pn = pan(i ? 0.5 : -0.5);
      o.connect(pn); pn.connect(lp); o.start(t); o.stop(t + dur + 0.4);
    }));
    lp.connect(g); g.connect(duck); send(g, rev, revAmt);
    return lp;
  }
  function pop(t, f, v = 0.12, p = 0) {
    const o = osc('sine', f * 1.7), g = gainN(), pn = pan(p);
    o.frequency.setValueAtTime(f * 1.7, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.035);
    env(g, t, 0.002, v, 0.11);
    o.connect(g); g.connect(pn); pn.connect(master); send(pn, rev, 0.18);
    o.start(t); o.stop(t + 0.15);
  }
  function tick(t, v = 0.08, f = 4000, dur = 0.008) {
    const n = nsrc(t, dur + 0.01), hp = filt('highpass', f), g = gainN();
    env(g, t, 0.0008, v, dur);
    n.connect(hp); hp.connect(g); g.connect(master);
  }
  function thud(t, v = 0.5) {
    const o = osc('sine', 120), g = gainN();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
    env(g, t, 0.002, v, 0.25);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
    const n = nsrc(t, 0.2), lp = filt('lowpass', 900), ng = gainN();
    env(ng, t, 0.001, v * 0.35, 0.12);
    n.connect(lp); lp.connect(ng); ng.connect(master);
  }
  function glitch(t, dur, v = 0.09) {
    const o = osc('square', 400), g = gainN(0), bp = filt('bandpass', 1600, 0.6);
    for (let x = 0; x < dur; x += 0.017) {
      o.frequency.setValueAtTime(lerp(90, 2600, R()), t + x);
      g.gain.setValueAtTime(R() < 0.7 ? v : 0, t + x);
    }
    g.gain.setValueAtTime(0, t + dur);
    o.connect(bp); bp.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    const n = nsrc(t, dur), ng = gainN(0), hp = filt('highpass', 2000);
    for (let x = 0; x < dur; x += 0.023) ng.gain.setValueAtTime(R() < 0.5 ? v * 0.8 : 0, t + x);
    ng.gain.setValueAtTime(0, t + dur);
    n.connect(hp); hp.connect(ng); ng.connect(master);
  }
  function zap(t, f0, f1, dur, v = 0.08, type = 'sine') {
    const o = osc(type, f0), g = gainN();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.004, v, dur);
    o.connect(g); g.connect(master); send(g, rev, 0.25); o.start(t); o.stop(t + dur + 0.05);
  }

  /* ---------- harmony ---------- */
  const CH = {
    Am: { pad: [57, 60, 64, 69], bass: 45, arp: [69, 72, 76, 81] },
    F: { pad: [53, 57, 60, 64], bass: 41, arp: [65, 69, 72, 76] },
    C: { pad: [55, 60, 64, 67], bass: 48, arp: [67, 72, 76, 79] },
    G: { pad: [55, 59, 62, 67], bass: 43, arp: [67, 71, 74, 79] },
    Cmaj9: { pad: [48, 55, 59, 62, 64], bass: 36, arp: [72, 76, 79, 83] }
  };
  const barChord = ['Am', 'Am', 'Am', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G', 'Cmaj9', 'Cmaj9'];

  /* ---------- INTRO: bars 0–2 ---------- */
  const p0 = pad(T(0), T(8), CH.Am.pad, 0.06, 520, 0.6);
  p0.frequency.setValueAtTime(420, T(0)); p0.frequency.exponentialRampToValueAtTime(1100, T(8));
  for (let k = 0; k < 4; k++) { bell(T(k), 93, 0.16, 0.7, 0.5, 0.45, k % 2 ? 0.4 : -0.4); subDrop(T(k), 0.22, 0.35); }
  for (let b = 0; b < 8; b += 0.5) hat(T(b), b % 1 ? 0.045 : 0.07, false, 0.35);
  // slate typing (matches the typewriter in drawIntro)
  const typeClicks = (s, b0, b1, v = 0.09) => { for (let i = 1; i <= s; i++) tick(T(b0 + (i / s) * (b1 - b0)), v * (0.7 + R() * 0.6), 3200, 0.006); };
  typeClicks(11, 0.35, 1.3); typeClicks(23, 1.35, 2.75, 0.07);
  for (let i = 0; i < 8; i++) tick(T(3.0 + i * 0.044), 0.035, 3000, 0.005);
  zap(T(3.35), 420, 1100, 0.14, 0.07); zap(T(3.35) + 0.14, 1100, 260, 0.16, 0.07);
  // the four monogram bars — sonic logo E A C E
  [76, 81, 84, 88].forEach((m, i) => {
    bell(T(4 + i), m, 0.24, 1.4, 0.4, 0.3, [-0.3, 0.3, -0.15, 0.15][i]);
    whoosh(T(4 + i) - 0.06, 0.32, 0.07, 800, 7000, i % 2 ? 0.5 : -0.5, 0);
    kick(T(4 + i), 0.6);
  });
  riser(T(6), T(8), 0.07);
  // icon forms
  impact(T(8), 0.55);
  pad(T(8), T(4), CH.Am.pad, 0.026, 2200);
  for (let b = 8; b < 11; b++) kick(T(b), 0.72);
  for (let b = 8; b < 11; b++) hat(T(b + 0.5), 0.07, true);
  clap(T(9), 0.3); clap(T(11), 0.32);
  for (let b = 8; b < 11; b++) { bass(T(b + 0.5), CH.Am.bass, 0.2, 0.24); }
  whoosh(T(9.5), 0.5, 0.06, 2500, 10000, 0.6, -0.6);
  bell(T(9.55), 100, 0.04, 0.8, 0.5, 0.4);
  bell(T(10.3), 88, 0.05, 0.9, 0.5, 0.4);
  // zoom-through
  whoosh(T(11), T(1), 0.2, 200, 7000, -0.2, 0.2);
  revSwell(T(12), T(1), 0.16);
  subDrop(T(11.75), 0.3, 0.4);

  /* ---------- INDEX / BUILD: bar 3 ---------- */
  kick(T(12), 0.9); clap(T(12), 0.38); crash(T(12), 0.16, 1.2);
  for (const b of [15, 15.25]) kick(T(b), 0.6);
  pad(T(12), T(3.5), CH.G.pad, 0.024, 380).frequency.exponentialRampToValueAtTime(6000, T(15.5));
  for (let b = 12.5; b < 15.5; b += 0.5) bass(T(b), CH.G.bass, 0.16, 0.06 + 0.16 * ((b - 12.5) / 3));
  // counter ticks (same easing as the picture)
  for (let n = 1; n <= 18; n++) {
    const x = n >= 18 ? 1 : -Math.log2(1 - n / 18) / 10;
    tick(T(12.25 + Math.min(1, x) * 2.25), 0.09, 2500 + n * 120, 0.007);
  }
  for (let n = 1; n <= 10; n++) tick(T(12.05 + (-Math.log2(1 - Math.min(n / 10, 0.999)) / 10) * 1.35), 0.05, 2000, 0.006);
  // snare roll
  for (let b = 12; b < 15.5; ) {
    const step = b < 13 ? 0.5 : b < 14.5 ? 0.25 : 0.125;
    const p = (b - 12) / 3.5;
    snare(T(b), 0.015 + 0.24 * p * p, 1100 + 2600 * p);
    b += step;
  }
  // pills filling
  [72, 74, 76, 79, 81, 84, 86, 88].forEach((m, i) => pluck(T(14 + i * 0.25), m, 0.05, 0.12, 'triangle', i % 2 ? 0.3 : -0.3));
  riser(T(12), T(15.5), 0.2);
  revSwell(T(16), T(1), 0.22);
  zap(T(15.2), 300, 60, T(0.7), 0.12, 'sine');

  /* ---------- GROOVE: bars 4–13 ---------- */
  impact(T(16), 0.75); subDrop(T(16), 0.5, 1.0);
  for (let b = 16; b < 56; b++) {
    const bar = Math.floor(b / 4), beat = b % 4;
    if (b >= 54) break;
    kick(T(b), 0.85);
    if (beat === 1 || beat === 3) clap(T(b), 0.36);
    hat(T(b + 0.5), 0.075, true, 0.15);
    for (const s of [0.25, 0.75]) hat(T(b + s), 0.035 + R() * 0.015, false, -0.25);
    const ch = CH[barChord[bar]];
    bass(T(b + 0.5), ch.bass, 0.19, 0.28);
    if (beat % 2 === 1) bass(T(b + 0.75), ch.bass + 12, 0.1, 0.16);
  }
  for (let bar = 4; bar < 14; bar++) {
    const ch = CH[barChord[bar]];
    pad(T(bar * 4), BAR, ch.pad, 0.022, bar >= 12 ? 3200 : 2300);
    if (bar >= 5) {
      const pat = [0, 1, 2, 3, 1, 2, 3, 2];
      for (let s = 0; s < 16; s++) pluck(T(bar * 4 + s * 0.25), ch.arp[pat[s % 8]] + (s >= 8 && bar >= 12 ? 12 : 0), s % 4 === 0 ? 0.045 : 0.03, 0.14, 'square', s % 2 ? 0.35 : -0.35);
    }
  }
  crash(T(32), 0.2); crash(T(48), 0.24);
  // division transitions
  [20, 24, 28, 36, 40, 44].forEach((b, i) => whoosh(T(b) - 0.24, 0.42, 0.13, 300, 6000, i % 2 ? 0.7 : -0.7, i % 2 ? -0.7 : 0.7));

  // 01 — UI pops + client re-skins
  for (let j = 0; j < 10; j++) pop(T(16.75 + j * 0.12), mtof([72, 74, 76, 79, 81, 84, 86, 88, 91, 93][j]) / 2, 0.06, (j / 9) * 1.2 - 0.6);
  whoosh(T(17.2), 0.4, 0.07, 200, 1500, 0, 0);
  [18, 18.5, 19, 19.5].forEach((b, i) => { tick(T(b), 0.1, 2500); bell(T(b), [81, 84, 88, 91][i], 0.05, 0.4, 0.3, 0.3); });

  // 02 — ten brands spring in
  for (let i = 0; i < 10; i++) {
    const col = i % 5, row = Math.floor(i / 5);
    pop(T(20) + 0.15 * B + col * 0.055 + row * 0.11, mtof([69, 72, 74, 76, 79][col] + row * 12) / 2, 0.08, col / 4 - 0.5);
  }
  whoosh(T(22.1), 0.4, 0.05, 4000, 11000, -0.6, 0.6);
  bell(T(22.8), 93, 0.06, 0.8);

  // 03 — car pass, billboard flaps
  whoosh(T(24), 0.5, 0.12, 150, 1200, -0.9, 0.2);
  for (const f of [1, 2, 3]) for (let j = 0; j < 6; j++) tick(T(24 + f + j * 0.045), 0.07, 1800, 0.012);

  // 04 — bag thud, products, add-to-cart
  thud(T(28.5), 0.55);
  for (let i = 0; i < 3; i++) pop(T(29 + i * 0.12), mtof(76 + i * 3), 0.08);
  [30, 30.5, 31].forEach((b, i) => { tick(T(b), 0.12, 1500, 0.01); pop(T(b), 600, 0.05); bell(T(b) + 0.25, 96 + [0, 2, 4][i], 0.06, 0.5, 0.3, 0.2); });

  // 05 — glitch, scan, lock clamp
  glitch(T(31.75), T(0.5), 0.08);
  zap(T(32.15), 200, 3200, T(1.3), 0.03, 'sawtooth');
  for (let i = 0; i < 14; i++) pluck(T(32.2 + i * 0.09), 96 + Math.floor(R() * 6), 0.012, 0.05, 'sine');
  thud(T(33.5), 0.6); tick(T(33.5), 0.2, 1200, 0.02); glitch(T(33.5), 0.12, 0.08);
  bell(T(33.75), 84, 0.08, 0.8); bell(T(34), 91, 0.07, 0.9);
  glitch(T(35.7), 0.1, 0.06);

  // 06 — sun rise + letters
  zap(T(36), 120, 520, T(1.1), 0.05, 'triangle');
  'BOOTCAMP'.split('').forEach((_, i) => pluck(T(36.7 + i * 0.16) + 0.08, [72, 74, 76, 79, 81, 84, 86, 88][i], 0.06, 0.2, 'triangle', i / 7 - 0.5));
  [1.4, 1.65, 1.9].forEach((b, i) => pop(T(36 + b), mtof(84 + i * 3), 0.06));
  for (let i = 0; i < 8; i++) tick(T(39 + i * 0.07), 0.05, 2500, 0.008);

  // 07 — network pulses, orb, typing
  for (let i = 0; i < 20; i++) pop(T(40 + 0.05 + i * 0.03), 1200 + i * 60, 0.025, i / 19 - 0.5);
  [1.0, 1.5, 2.0, 2.5, 3.0, 3.5].forEach(w => { for (let s = 0; s < 5; s++) pluck(T(40 + w) + s * 0.1, 91 + s * 2, 0.018, 0.05, 'sine', s / 4 - 0.5); });
  zap(T(42), 180, 90, 0.6, 0.12, 'sine'); bell(T(42), 76, 0.08, 1.4);
  for (let i = 1; i <= 15; i++) tick(T(42.55 + (i / 15) * 0.85), 0.05, 3500, 0.005);

  // 08 — toggle, dial, morphs, robot
  tick(T(44.75), 0.15, 1800, 0.012); zap(T(44.75), 300, 1200, 0.25, 0.05);
  for (let i = 0; i < 5; i++) tick(T(45 + i * 0.25), 0.05, 3000, 0.006);
  whoosh(T(45.5), 0.3, 0.06, 500, 3000, -0.3, 0.3); whoosh(T(46.5), 0.3, 0.06, 500, 3000, 0.3, -0.3);
  for (let i = 0; i < 12; i++) pop(T(45.9 + hash(i * 3.7) * 0.9), mtof(84 + (i % 5) * 2), 0.025);
  zap(T(46), 90, 110, T(1.8), 0.025, 'sawtooth');

  /* ---------- WALL: bars 12–13 ---------- */
  whoosh(T(48), 0.9, 0.16, 6000, 250, 0.5, -0.5);
  [67, 71, 74, 79, 83, 86, 91, 95].forEach((m, k) => { bell(T(52 + k * 0.25), m, 0.08, 0.6, 0.3, 0.25, k / 7 - 0.5); tick(T(52 + k * 0.25), 0.06, 2000, 0.01); });
  for (let b = 54; b < 55.5; b += 0.125) snare(T(b), 0.05 + 0.18 * ((b - 54) / 1.5), 1500 + 2500 * ((b - 54) / 1.5));
  riser(T(54), T(55.75), 0.14);
  for (let k = 0; k < 8; k++) whoosh(T(54) + (7 - k) * 0.07 * B, 0.25, 0.04, 1500, 6000, 0, 0);
  revSwell(T(56), T(1.5), 0.25);

  /* ---------- END CARD: bars 14–15 ---------- */
  impact(T(56), 0.85); kick(T(56), 0.9); crash(T(56), 0.28, 2.6);
  [76, 79, 84, 88].forEach((m, i) => bell(T(56.2 + i * 0.25), m, 0.17, 1.6, 0.45, 0.3, [-0.3, 0.3, -0.15, 0.15][i]));
  const pe = pad(T(56), T(7.5), CH.Cmaj9.pad, 0.042, 3200, 0.6);
  pe.frequency.setValueAtTime(3200, T(56)); pe.frequency.exponentialRampToValueAtTime(1300, T(63.5));
  bass(T(56), 36, T(2.5), 0.15);
  whoosh(T(58), 0.6, 0.05, 2500, 10000, 0.6, -0.6);
  bell(T(58.05), 100, 0.04, 1.0, 0.5, 0.4);
  pluck(T(59.5), 79, 0.04, 0.3, 'triangle'); pluck(T(60), 84, 0.035, 0.3, 'triangle');
  for (let b = 57; b < 62; b += 0.5) hat(T(b), 0.03 * (1 - (b - 57) / 6), b % 1 !== 0, 0.2);
  for (let b = 57; b < 61; b++) kick(T(b), 0.35 * (1 - (b - 57) / 5));
  whoosh(T(60.6), 0.5, 0.04, 400, 3000, 0.6, -0.6);

  /* ---------- sidechain ---------- */
  duckTimes.sort((a, b) => a - b);
  duck.gain.setValueAtTime(1, 0);
  for (const t of duckTimes) { duck.gain.setValueAtTime(0.32, t); duck.gain.setTargetAtTime(1, t + 0.012, 0.07); }
}

function wavBase64(buf) {
  const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
  data.setUint32(24, sr, true); data.setUint32(28, sr * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true);
  ws(36, 'data'); data.setUint32(40, len * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, chans[c][i])); data.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  const bytes = new Uint8Array(data.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
