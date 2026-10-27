'use strict';
/* ==========================================================================
   Score + sound design — synthesized with Web Audio, no samples.
   120 BPM in D major (the hook sits on a D-minor drone, then resolves).
   Every effect reads its time from the same constants the picture uses
   (IN, PA, LE, GA, EX, GM, TO, CU, EC, TL), so sound and picture can't drift.
   ========================================================================== */

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

async function renderScore(sampleRate = 48000) {
  const ac = new OfflineAudioContext(2, Math.ceil(DUR * sampleRate), sampleRate);
  buildScore(ac);
  return ac.startRendering();
}

function buildScore(ac) {
  const R = mulberry32(2027);
  const Bt = b => b * B; // beats → seconds

  /* ---------- buses ---------- */
  const out = ac.createGain();
  out.gain.setValueAtTime(1, 0);
  out.gain.setValueAtTime(1, 28.9);
  out.gain.linearRampToValueAtTime(0.0, DUR - 0.02);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 2.5; comp.attack.value = 0.006; comp.release.value = 0.14;
  const lim = ac.createDynamicsCompressor();
  lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.05;
  out.connect(comp); comp.connect(lim); lim.connect(ac.destination);
  const master = ac.createGain(); master.gain.value = 0.5; master.connect(out);
  const sfx = ac.createGain(); sfx.gain.value = 1.2; sfx.connect(master);

  const noise = ac.createBuffer(2, ac.sampleRate * 2, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = noise.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  const ir = ac.createBuffer(2, Math.floor(ac.sampleRate * 2.4), ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch), n = d.length;
    for (let i = 0; i < n; i++) { const x = i / n; d[i] = (R() * 2 - 1) * Math.pow(1 - x, 3.2) * (i < 300 ? i / 300 : 1); }
  }
  const rev = ac.createConvolver(); rev.normalize = true; rev.buffer = ir;
  const revLP = ac.createBiquadFilter(); revLP.type = 'lowpass'; revLP.frequency.value = 7000;
  const revOut = ac.createGain(); revOut.gain.value = 0.5;
  rev.connect(revLP); revLP.connect(revOut); revOut.connect(master);
  const dly = ac.createDelay(2); dly.delayTime.value = B * 0.75;
  const dfb = ac.createGain(); dfb.gain.value = 0.33;
  const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 3600;
  const dpan = ac.createStereoPanner(); dpan.pan.value = -0.4;
  const dOut = ac.createGain(); dOut.gain.value = 0.3;
  dly.connect(dlp); dlp.connect(dfb); dfb.connect(dly); dlp.connect(dpan); dpan.connect(dOut); dOut.connect(master);
  const duck = ac.createGain(); duck.connect(master);
  const duckTimes = [];

  /* ---------- primitives ---------- */
  const gainN = (v = 0) => { const g = ac.createGain(); g.gain.value = v; return g; };
  const osc = (type, f) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  const filt = (type, f, q = 0.707) => { const x = ac.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
  const pan = p => { const x = ac.createStereoPanner(); x.pan.value = clamp(p, -1, 1); return x; };
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

  /* ---------- drums ---------- */
  function kick(t, v = 1) {
    const o = osc('sine', 180), g = gainN();
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.055);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.35);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.003);
    g.gain.setValueAtTime(v, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.45);
    const n = nsrc(t, 0.03), hp = filt('highpass', 2800), ng = gainN();
    env(ng, t, 0.001, v * 0.2, 0.016);
    n.connect(hp); hp.connect(ng); ng.connect(master);
    duckTimes.push(t);
  }
  function clap(t, v = 0.4, revAmt = 0.28) {
    const n = nsrc(t, 0.35), hp = filt('highpass', 750), bp = filt('bandpass', 1400, 0.9), g = gainN();
    g.gain.setValueAtTime(0.0001, t);
    [0, 0.011, 0.022].forEach(o => { g.gain.setValueAtTime(v, t + o); g.gain.exponentialRampToValueAtTime(v * 0.12, t + o + 0.009); });
    g.gain.setValueAtTime(v * 0.85, t + 0.032);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
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
  function hat(t, v = 0.07, open = false, p = 0.25) {
    const n = nsrc(t, open ? 0.3 : 0.06), hp = filt('highpass', open ? 7200 : 9000), g = gainN(), pn = pan(p);
    env(g, t, 0.001, v, open ? 0.22 : 0.035);
    n.connect(hp); hp.connect(g); g.connect(pn); pn.connect(master);
  }
  function crash(t, v = 0.22, dec = 1.8) {
    const n = nsrc(t, dec + 0.1), hp = filt('highpass', 4500), g = gainN();
    env(g, t, 0.002, v, dec);
    n.connect(hp); hp.connect(g); g.connect(master); send(g, rev, 0.4);
  }
  function tom(t, f = 140, v = 0.3) {
    const o = osc('sine', f), g = gainN();
    o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    env(g, t, 0.002, v, 0.22);
    o.connect(g); g.connect(master); send(g, rev, 0.12); o.start(t); o.stop(t + 0.3);
  }

  /* ---------- sound design ---------- */
  function revSwell(t1, dur, v = 0.2) {
    const t0 = t1 - dur, n = nsrc(t0, dur), hp = filt('highpass', 3000), g = gainN();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t1 - 0.01); g.gain.linearRampToValueAtTime(0, t1);
    hp.frequency.setValueAtTime(1200, t0); hp.frequency.exponentialRampToValueAtTime(6500, t1);
    n.connect(hp); hp.connect(g); g.connect(sfx); send(g, rev, 0.3);
  }
  function riser(t0, t1, v = 0.15) {
    const n = nsrc(t0, t1 - t0), bp = filt('bandpass', 400, 1.3), g = gainN();
    bp.frequency.setValueAtTime(300, t0); bp.frequency.exponentialRampToValueAtTime(8000, t1);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t1 - 0.01); g.gain.linearRampToValueAtTime(0, t1 + 0.01);
    n.connect(bp); bp.connect(g); g.connect(sfx); send(g, rev, 0.35);
    const o = osc('sawtooth', 200), lp = filt('lowpass', 2000), og = gainN();
    o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(1200, t1);
    og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(v * 0.16, t1 - 0.01); og.gain.linearRampToValueAtTime(0, t1 + 0.01);
    o.connect(lp); lp.connect(og); og.connect(sfx); send(og, dly, 0.25); o.start(t0); o.stop(t1 + 0.05);
  }
  function whoosh(t, dur = 0.4, v = 0.15, f0 = 350, f1 = 5000, p0 = -0.7, p1 = 0.7) {
    const n = nsrc(t, dur), bp = filt('bandpass', f0, 1.2), g = gainN(), pn = pan(p0);
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7); bp.frequency.exponentialRampToValueAtTime(f0 * 2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    pn.pan.setValueAtTime(clamp(p0, -1, 1), t); pn.pan.linearRampToValueAtTime(clamp(p1, -1, 1), t + dur);
    n.connect(bp); bp.connect(g); g.connect(pn); pn.connect(sfx); send(pn, rev, 0.22);
  }
  function impact(t, v = 1) {
    const o = osc('sine', 100), g = gainN();
    o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    env(g, t, 0.004, v * 0.85, 1.4);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 1.5);
    const n = nsrc(t, 1.3), lp = filt('lowpass', 2500), ng = gainN();
    lp.frequency.setValueAtTime(3800, t); lp.frequency.exponentialRampToValueAtTime(180, t + 0.9);
    env(ng, t, 0.002, v * 0.42, 0.85);
    n.connect(lp); lp.connect(ng); ng.connect(sfx); send(ng, rev, 0.9);
    crash(t, v * 0.2, 2.0);
  }
  function subDrop(t, v = 0.5, dur = 0.8) {
    const o = osc('sine', 90), g = gainN();
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(34, t + dur);
    env(g, t, 0.005, v, dur);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  // cinematic low "braam" for the hook slams
  function braam(t, m, v = 0.3, dur = 0.55) {
    const lp = filt('lowpass', 900, 2), g = gainN();
    lp.frequency.setValueAtTime(2200, t); lp.frequency.exponentialRampToValueAtTime(260, t + dur);
    env(g, t, 0.006, v, dur);
    [-14, 0, 14].forEach(ct => { const o = osc('sawtooth', mtof(m)); o.detune.value = ct; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); });
    const o2 = osc('sawtooth', mtof(m + 12)); o2.detune.value = 7; o2.connect(lp); o2.start(t); o2.stop(t + dur + 0.05);
    lp.connect(g); g.connect(sfx); send(g, rev, 0.6);
  }
  function bell(t, m, v = 0.16, dec = 1.2, revAmt = 0.35, dlyAmt = 0.2, p = 0) {
    const f = mtof(m), pn = pan(p);
    pn.connect(sfx); send(pn, rev, revAmt); send(pn, dly, dlyAmt);
    [[1, 1, dec], [2, 0.42, dec * 0.55], [3.01, 0.2, dec * 0.3], [4.17, 0.09, dec * 0.18]].forEach(([r, a, d]) => {
      const o = osc('sine', f * r), g = gainN();
      env(g, t, 0.002, v * a, d);
      o.connect(g); g.connect(pn); o.start(t); o.stop(t + d + 0.05);
    });
  }
  function pluck(t, m, v = 0.05, dec = 0.16, type = 'square', p = 0, bus = duck) {
    const o = osc(type, mtof(m)), lp = filt('lowpass', 4000, 3), g = gainN(), pn = pan(p);
    lp.frequency.setValueAtTime(4500, t); lp.frequency.exponentialRampToValueAtTime(500, t + dec);
    env(g, t, 0.002, v, dec);
    o.connect(lp); lp.connect(g); g.connect(pn); pn.connect(bus); send(pn, dly, 0.3);
    o.start(t); o.stop(t + dec + 0.05);
  }
  function bass(t, m, dur = 0.2, v = 0.3) {
    const f = mtof(m), o1 = osc('sawtooth', f), o2 = osc('sine', f), lp = filt('lowpass', 300, 2), g = gainN();
    lp.frequency.setValueAtTime(160, t); lp.frequency.exponentialRampToValueAtTime(1400, t + 0.015); lp.frequency.exponentialRampToValueAtTime(240, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = gainN(0.75);
    o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(duck);
    o1.start(t); o2.start(t); o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }
  function pad(t, dur, notes, v = 0.03, cutoff = 1800, revAmt = 0.4, att = 0.2) {
    const g = gainN(), lp = filt('lowpass', cutoff, 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + att);
    g.gain.setValueAtTime(v, t + dur - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
    notes.forEach(m => [-8, 8].forEach((ct, i) => {
      const o = osc('sawtooth', mtof(m)); o.detune.value = ct;
      const pn = pan(i ? 0.45 : -0.45);
      o.connect(pn); pn.connect(lp); o.start(t); o.stop(t + dur + 0.4);
    }));
    lp.connect(g); g.connect(duck); send(g, rev, revAmt);
    return lp;
  }
  function pop(t, f, v = 0.1, p = 0) {
    const o = osc('sine', f * 1.8), g = gainN(), pn = pan(p);
    o.frequency.setValueAtTime(f * 1.8, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.035);
    env(g, t, 0.002, v, 0.1);
    o.connect(g); g.connect(pn); pn.connect(sfx); send(pn, rev, 0.15);
    o.start(t); o.stop(t + 0.14);
  }
  function tick(t, v = 0.08, f = 4000, dur = 0.008, p = 0) {
    const n = nsrc(t, dur + 0.01), hp = filt('highpass', f), g = gainN(), pn = pan(p);
    env(g, t, 0.0008, v, dur);
    n.connect(hp); hp.connect(g); g.connect(pn); pn.connect(sfx);
  }
  // wooden clock tick / tock
  function clockTick(t, hi = true, v = 0.2) {
    const o = osc('sine', hi ? 2100 : 1500), g = gainN();
    env(g, t, 0.001, v, 0.045);
    o.connect(g); g.connect(sfx); send(g, rev, 0.25); o.start(t); o.stop(t + 0.06);
    tick(t, v * 0.6, 3000, 0.006);
  }
  // UI tap: soft click with body
  function click(t, v = 0.16) {
    tick(t, v, 2500, 0.01);
    const o = osc('sine', 900), g = gainN();
    o.frequency.setValueAtTime(1300, t); o.frequency.exponentialRampToValueAtTime(600, t + 0.03);
    env(g, t, 0.001, v * 0.7, 0.05);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.08);
  }
  function thud(t, v = 0.45) {
    const o = osc('sine', 120), g = gainN();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.16);
    env(g, t, 0.002, v, 0.22);
    o.connect(g); g.connect(sfx); o.start(t); o.stop(t + 0.28);
    const n = nsrc(t, 0.18), lp = filt('lowpass', 1000), ng = gainN();
    env(ng, t, 0.001, v * 0.3, 0.1);
    n.connect(lp); lp.connect(ng); ng.connect(sfx);
  }
  function glitch(t, dur, v = 0.08) {
    const o = osc('square', 400), g = gainN(0), bp = filt('bandpass', 1600, 0.6);
    for (let x = 0; x < dur; x += 0.016) {
      o.frequency.setValueAtTime(lerp(90, 2600, R()), t + x);
      g.gain.setValueAtTime(R() < 0.7 ? v : 0, t + x);
    }
    g.gain.setValueAtTime(0, t + dur);
    o.connect(bp); bp.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.02);
    const n = nsrc(t, dur), ng = gainN(0), hp = filt('highpass', 2000);
    for (let x = 0; x < dur; x += 0.021) ng.gain.setValueAtTime(R() < 0.5 ? v * 0.8 : 0, t + x);
    ng.gain.setValueAtTime(0, t + dur);
    n.connect(hp); hp.connect(ng); ng.connect(sfx);
  }
  function zap(t, f0, f1, dur, v = 0.08, type = 'sine', p = 0) {
    const o = osc(type, f0), g = gainN(), pn = pan(p);
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.004, v, dur);
    o.connect(g); g.connect(pn); pn.connect(sfx); send(pn, rev, 0.25); o.start(t); o.stop(t + dur + 0.05);
  }
  // cartoon spring for the bouncing dot
  function boing(t, v = 0.12, dur = 0.42) {
    const o = osc('sine', 300), g = gainN(), lfo = osc('sine', 22), lg = gainN(0);
    o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(520, t + dur * 0.5); o.frequency.exponentialRampToValueAtTime(330, t + dur);
    lg.gain.setValueAtTime(60, t); lg.gain.exponentialRampToValueAtTime(2, t + dur);
    lfo.connect(lg); lg.connect(o.frequency);
    env(g, t, 0.004, v, dur);
    o.connect(g); g.connect(sfx); send(g, rev, 0.2);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }
  // paper / card swish
  function swish(t, v = 0.1, dur = 0.18, f = 3000) {
    const n = nsrc(t, dur), bp = filt('bandpass', f * 0.5, 0.9), g = gainN();
    bp.frequency.setValueAtTime(f * 0.4, t); bp.frequency.exponentialRampToValueAtTime(f * 1.6, t + dur);
    env(g, t, dur * 0.35, v, dur * 0.65);
    n.connect(bp); bp.connect(g); g.connect(sfx); send(g, rev, 0.12);
  }
  // XP coin: two quick square blips
  function coin(t, v = 0.06, p = 0) {
    pluck(t, 95, v, 0.07, 'square', p, sfx);
    pluck(t + 0.065, 100, v, 0.22, 'square', p, sfx);
  }
  // success chimes
  function correctChime(t, v = 0.16) { bell(t, 81, v, 0.9, 0.3, 0.2, -0.15); bell(t + 0.09, 86, v * 1.1, 1.3, 0.35, 0.25, 0.15); }
  function sonicLogo(t, v = 0.17) { [74, 78, 81, 86].forEach((m, i) => bell(t + i * 0.065, m, v * (0.85 + i * 0.08), 1.1 + i * 0.25, 0.4, 0.25, (i - 1.5) * 0.2)); }
  function fanfare(t, v = 0.12) { [74, 78, 81, 86, 90, 93].forEach((m, i) => { bell(t + i * 0.05, m, v, 0.9, 0.35, 0.2, (i / 5 - 0.5)); pluck(t + i * 0.05, m - 12, v * 0.35, 0.18, 'square', 0, sfx); }); }
  function shimmer(t, v = 0.05) { [98, 102, 105, 110].forEach((m, i) => bell(t + i * 0.04, m, v, 0.6, 0.5, 0.3, (i % 2 ? 0.5 : -0.5))); }
  function buzz(t, v = 0.07, dur = 0.18) {
    const o = osc('square', 110), o2 = osc('square', 116), lp = filt('lowpass', 900), g = gainN();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v, t + dur - 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(sfx); o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }
  function marker(t, dur = 0.3, v = 0.05) {
    const n = nsrc(t, dur), bp = filt('bandpass', 2600, 2.2), g = gainN(0);
    for (let x = 0; x < dur; x += 0.03) { g.gain.setValueAtTime(v * (0.4 + R() * 0.6), t + x); g.gain.linearRampToValueAtTime(v * 0.15, t + x + 0.025); }
    g.gain.setValueAtTime(0, t + dur);
    n.connect(bp); bp.connect(g); g.connect(sfx);
  }

  /* ---------- harmony (D major) ---------- */
  const CH = {
    D: { pad: [62, 66, 69, 74], bass: 38, arp: [74, 78, 81, 86] },
    A: { pad: [61, 64, 69, 73], bass: 33, arp: [73, 76, 81, 85] },
    Bm: { pad: [62, 66, 71, 74], bass: 35, arp: [74, 78, 83, 86] },
    G: { pad: [62, 67, 71, 74], bass: 31, arp: [74, 79, 83, 86] },
    Dadd9: { pad: [50, 57, 62, 64, 66, 69, 74], bass: 26, arp: [74, 76, 78, 81] }
  };
  // one chord per bar (2 s)
  const barChord = [null, 'D', 'Bm', 'G', 'A', 'D', 'A', 'Bm', 'G', 'D', 'A', 'Bm', 'G', 'Dadd9', 'Dadd9'];

  /* ================= HOOK  0.0 – 1.5 ================= */
  const drone = pad(0, 1.55, [38, 50, 53, 57], 0.05, 420, 0.5, 0.05); // D minor drone
  drone.frequency.setValueAtTime(380, 0); drone.frequency.exponentialRampToValueAtTime(1400, 1.5);
  CLOCK.forEach((t, i) => clockTick(t, i % 2 === 0, i < 3 ? 0.2 : 0.14));
  IN.words.forEach((t, i) => {
    braam(t, [38, 39, 40][i], 0.22 + i * 0.05, 0.5);
    kick(t, 0.85 + i * 0.05); subDrop(t, 0.35 + i * 0.08, 0.45);
    const n = nsrc(t, 0.2), bp = filt('bandpass', 1200, 0.7), g = gainN();
    env(g, t, 0.001, 0.22, 0.16); n.connect(bp); bp.connect(g); g.connect(sfx); send(g, rev, 0.5);
  });
  riser(1.0, 1.5, 0.12);
  for (let b = 1.0; b < 1.5; b += 0.0625) snare(b, 0.03 + 0.12 * ((b - 1) / 0.5), 1400 + 2400 * ((b - 1) / 0.5));
  // the cut: glitch + tape stop
  glitch(IN.glitch, 0.12, 0.09);
  zap(IN.glitch, 320, 40, 0.3, 0.12, 'sawtooth');

  /* ================= RELIEF + DOT  1.5 – 3.0 ================= */
  const relief = pad(IN.calm, 1.5, [62, 66, 69, 76], 0.055, 900, 0.6, 0.3);
  relief.frequency.setValueAtTime(700, IN.calm); relief.frequency.exponentialRampToValueAtTime(2600, 3.0);
  whoosh(IN.calm - 0.04, 0.35, 0.07, 1200, 6000, 0.4, -0.4);
  [86, 90, 93].forEach((m, i) => bell(IN.help + i * 0.06, m, 0.06, 0.8, 0.5, 0.3, (i - 1) * 0.4));
  whoosh(IN.help - 0.04, 0.35, 0.06, 1200, 6000, -0.4, 0.4);
  zap(IN.fall, 1500, 380, IN.land1 - IN.fall, 0.08, 'sine');
  revSwell(IN.land1, 0.45, 0.12);
  // land 1 + bounce
  thud(IN.land1, 0.4); pop(IN.land1, 320, 0.12); boing(IN.land1 + 0.02, 0.1, 0.45);
  revSwell(IN.land2, 0.5, 0.2);
  hat(IN.land1 + 0.25, 0.04, false); hat(IN.land1 + 0.375, 0.05, false);

  /* ================= LOGO  3.0 – 5.5 ================= */
  impact(IN.land2, 0.8); kick(IN.land2, 1); crash(IN.land2, 0.2, 2.2);
  bass(IN.land2, 38, 1.0, 0.24);
  pad(IN.land2, 2.0, CH.D.pad, 0.03, 2400, 0.5);
  pad(4.0, 1.5, CH.Bm.pad, 0.028, 2600, 0.5);
  swish(IN.book, 0.09, 0.3, 2400);
  sonicLogo(IN.check, 0.17);
  shimmer(3.66, 0.035);
  whoosh(IN.word - 0.06, 0.4, 0.07, 400, 4000, -0.5, 0.5);
  [74, 78].forEach((m, i) => pluck(IN.tag + i * 0.12, m, 0.04, 0.22, 'triangle', (i - 0.5) * 0.6, sfx));
  pop(IN.by, 700, 0.06);
  // half-time groove
  [3.0, 4.0, 4.75].forEach(t => kick(t, 0.72));
  [3.5, 4.5].forEach(t => clap(t, 0.32));
  for (let t = 3.0; t < 5.0; t += 0.25) hat(t + 0.125, t % 0.5 ? 0.03 : 0.05, false, 0.2);
  [3.25, 3.75, 4.25].forEach(t => bass(t, 38, 0.2, 0.2));
  // build + zoom-through
  for (let t = 5.0; t < 5.5; t += 0.0625) snare(t, 0.07 + 0.22 * ((t - 5) / 0.5), 1500 + 2500 * ((t - 5) / 0.5));
  riser(IN.zoom - 0.45, TL.path, 0.2);
  whoosh(IN.zoom, TL.path - IN.zoom, 0.16, 200, 9000, 0, 0);

  /* ================= GROOVE  5.5 – 25.0 ================= */
  const G0 = Math.round(TL.path / B), G1 = Math.round(25.0 / B); // beats 11 … 50
  for (let b = G0; b < G1; b++) {
    const t = Bt(b), bar = Math.floor(t / 2), beat = b % 4;
    const ch = CH[barChord[bar]];
    kick(t, 0.7);
    if (beat === 1 || beat === 3) clap(t, 0.3);
    hat(t + 0.25, 0.06, true, 0.15);
    for (const s of [0.125, 0.375]) hat(t + s, 0.028 + R() * 0.012, false, -0.25);
    bass(t + 0.25, ch.bass, 0.2, 0.22);
    if (beat % 2 === 1) bass(t + 0.375, ch.bass + 12, 0.1, 0.13);
    const pat = [0, 1, 2, 3, 2, 1, 3, 2];
    for (let s = 0; s < 4; s++) pluck(t + s * 0.125, ch.arp[pat[(beat * 4 + s) % 8]], s === 0 ? 0.032 : 0.022, 0.12, 'square', s % 2 ? 0.35 : -0.35);
  }
  for (let bar = 3; bar < 13; bar++) { const ch = CH[barChord[bar]]; pad(bar * 2, 2, ch.pad, 0.02, bar >= 10 ? 3200 : 2300); }
  pad(5.5, 0.5, CH.Bm.pad, 0.02, 2300);
  crash(TL.path, 0.2); impact(TL.path, 0.35);
  // fills into every cut
  [TL.lesson, TL.game, TL.exam, TL.games, TL.tools, TL.cur].forEach((t, i) => {
    tom(t - 0.25, 160, 0.18); tom(t - 0.125, 120, 0.2);
    crash(t, 0.14, 1.2);
  });

  /* ---------- 01 path ---------- */
  const P0 = TL.path;
  PNODES.forEach((_, i) => pop(P0 + 0.08 + i * 0.07, 500 + i * 60, 0.04, (i % 2 ? 0.3 : -0.3)));
  PA.done.forEach((d, i) => {
    const t = P0 + d;
    click(t - 0.06, 0.08);
    bell(t, [74, 76, 78, 81, 83, 86][i], 0.11, 0.6, 0.3, 0.2, (i % 2 ? 0.35 : -0.35));
    coin(t + 0.05, 0.022, i % 2 ? 0.4 : -0.4);
  });
  for (let i = 0; i < 6; i++) tick(P0 + PA.boss - 0.25 + i * 0.04, 0.06, 2200, 0.01);
  impact(P0 + PA.boss, 0.45); fanfare(P0 + PA.boss + 0.02, 0.1); crash(P0 + PA.boss, 0.18, 1.6);
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
  for (let i = 0; i < 8; i++) pop(L0 + LE.correct + 0.05 + R() * 0.4, 900 + R() * 900, 0.02, R() - 0.5);
  whoosh(TL.game - 0.24, 0.4, 0.16, 250, 7000, 0, 0);

  /* ---------- 03 gamification ---------- */
  const G = TL.game;
  [0.12, 0.19, 0.26, 0.33].forEach((d, i) => pop(G + d, 420 + i * 70, 0.07, (i % 2 ? 0.4 : -0.4)));
  for (let n = 1; n <= 16; n++) { const x = 1 - Math.pow(1 - n / 16, 1 / 3); tick(G + GA.xp0 + x * (GA.xp1 - GA.xp0), 0.05, 2000 + n * 150, 0.007, -0.3); }
  fanfare(G + GA.lvl, 0.11); shimmer(G + GA.lvl + 0.1, 0.04); subDrop(G + GA.lvl, 0.25, 0.4);
  for (let n = 1; n <= 12; n++) tick(G + GA.st0 + (n / 12) * (GA.st1 - GA.st0), 0.04, 3000, 0.006, 0.35);
  whoosh(G + GA.st1 - 0.1, 0.3, 0.06, 300, 1500, 0.3, 0.3);
  for (let i = 0; i < 5; i++) pop(G + 0.45 + i * 0.07, 700 + i * 90, 0.045, 0.3);
  zap(G + GA.heartLose, 600, 200, 0.2, 0.06, 'triangle');
  zap(G + GA.heartFill - 0.5, 300, 900, 0.5, 0.03, 'triangle'); pop(G + GA.heartFill, 900, 0.07);
  for (let i = 0; i < 4; i++) { tom(G + GA.badges + i * 0.1 + 0.2, 300 + i * 40, 0.08); }
  shimmer(G + 1.75, 0.03);
  whoosh(TL.exam - 0.28, 0.42, 0.13, 300, 6000, -0.7, 0.7);

  /* ---------- 04 exams ---------- */
  const X = TL.exam;
  swish(X + EX.sim, 0.1, 0.3, 2000); swish(X + EX.train, 0.1, 0.3, 2400);
  for (let i = 0; i < 3; i++) pop(X + EX.sim + 0.35 + i * 0.08, 650 + i * 80, 0.045, -0.3);
  for (let t = X + 0.4; t < X + EX.stamp - 0.25; t += 0.125) clockTick(t, Math.round((t - X) / 0.125) % 2 === 0, 0.07);
  EX.rows.forEach((d, i) => { pop(X + d, 900 + i * 120, 0.08); bell(X + d, [81, 83, 86][i], 0.05, 0.4, 0.25, 0.15); });
  revSwell(X + EX.stamp, 0.3, 0.14);
  impact(X + EX.stamp, 0.75); kick(X + EX.stamp, 0.9); correctChime(X + EX.stamp + 0.04, 0.15); shimmer(X + EX.stamp + 0.12, 0.04);
  pop(X + EX.stamp + 0.12, 500, 0.06);
  whoosh(TL.games - 0.22, 0.4, 0.15, 300, 7000, EN ? 0.7 : -0.7, EN ? -0.7 : 0.7);

  /* ---------- 05 games ---------- */
  const Gm = TL.games;
  [0.12, 0.19, 0.26, 0.33].forEach((d, i) => pop(Gm + d, 480 + i * 70, 0.07, (i % 2 ? 0.4 : -0.4)));
  swish(Gm + GM.flip, 0.1, 0.28, 3200); bell(Gm + GM.flip + 0.3, 86, 0.06, 0.5);
  GM.quiz.forEach((d, i) => { pop(Gm + d, 1000 + i * 150, 0.07, 0.35); });
  GM.mem.forEach(d => swish(Gm + d, 0.06, 0.16, 4200));
  GM.match.forEach(d => correctChime(Gm + d, 0.08));
  marker(Gm + GM.circle, 0.3, 0.05);
  buzz(Gm + GM.circle + 0.18, 0.06, 0.16);
  bell(Gm + GM.fix, 90, 0.1, 0.6, 0.3, 0.2); bell(Gm + GM.fix + 0.07, 93, 0.09, 0.8, 0.3, 0.2);
  [GM.flip + 0.35, GM.quiz[2] + 0.1, GM.match[1] + 0.05, GM.fix + 0.2].forEach((d, i) => coin(Gm + d, 0.025, (i % 2 ? 0.4 : -0.4)));
  whoosh(TL.tools - 0.28, 0.42, 0.13, 300, 6000, -0.6, 0.6);

  /* ---------- 06 toolkit ---------- */
  const To = TL.tools;
  for (let i = 0; i < 12; i++) { const col = i % 3, row = Math.floor(i / 3); pop(To + 0.12 + (col + row) * 0.055, 450 + (col + row) * 60, 0.04, (col - 1) * 0.5 * DIR); }
  const scale = [74, 76, 78, 79, 81, 83, 85, 86, 88, 90, 91, 93];
  for (let i = 0; i < 12; i++) pluck(To + TO.sweep + i * TO.step, scale[i], 0.045, 0.18, 'triangle', (i % 3 - 1) * 0.5 * DIR, sfx);
  shimmer(To + 2.55, 0.04);
  whoosh(TL.cur - 0.32, 0.45, 0.14, 200, 5000, 0, 0);

  /* ---------- 07 curricula ---------- */
  const Cu = TL.cur;
  [CU.sa, CU.jo].forEach((d, i) => { swish(Cu + d, 0.1, 0.3, 2200); thud(Cu + d + 0.35, 0.25); });
  for (let i = 0; i < 3; i++) pop(Cu + CU.sa + CU.grades - 0.1 + i * 0.07, 700 + i * 90, 0.05, -0.3);
  for (let i = 0; i < 2; i++) pop(Cu + CU.jo + CU.grades - 0.1 + i * 0.07, 700 + i * 90, 0.05, 0.3);
  for (let i = 0; i < 2; i++) pop(Cu + CU.sa + CU.chips - 0.1 + i * 0.08, 1000 + i * 120, 0.05, -0.3);
  pop(Cu + CU.jo + CU.chips - 0.1, 1100, 0.05, 0.3);
  click(Cu + CU.sa + CU.tap, 0.16); correctChime(Cu + CU.sa + CU.tap + 0.03, 0.08);
  // build into the end card
  for (let t = 25.0; t < 26.0; ) { const p = (t - 25) / 1; snare(t, 0.06 + 0.24 * p, 1300 + 2800 * p); t += p < 0.5 ? 0.125 : 0.0625; }
  riser(25.0, TL.end, 0.22);
  revSwell(TL.end, 0.8, 0.22);
  kick(25.0, 0.8); kick(25.5, 0.8);

  /* ================= END CARD  26.0 – 30.0 ================= */
  const Ec = TL.end;
  impact(Ec, 0.95); kick(Ec, 1); crash(Ec, 0.26, 2.6); subDrop(Ec, 0.5, 1.0);
  const pe = pad(Ec, 3.6, CH.Dadd9.pad, 0.04, 3200, 0.6);
  pe.frequency.setValueAtTime(3200, Ec); pe.frequency.exponentialRampToValueAtTime(1200, 29.6);
  bass(Ec, 26, 2.2, 0.16);
  swish(Ec + EC.book, 0.08, 0.28, 2400);
  sonicLogo(Ec + EC.check, 0.18);
  pop(Ec + EC.dot, 620, 0.08);
  whoosh(Ec + EC.word - 0.06, 0.4, 0.07, 400, 4000, 0.5, -0.5);
  pop(Ec + EC.cta, 520, 0.07);
  shimmer(Ec + 1.5, 0.035);
  pop(Ec + EC.by, 760, 0.05);
  click(Ec + EC.press, 0.16); shimmer(Ec + EC.press + 0.06, 0.05); coin(Ec + EC.press + 0.04, 0.03);
  [26.0, 27.0, 28.0].forEach(t => kick(t, 0.65));
  [26.5, 27.5, 28.5].forEach(t => clap(t, 0.22, 0.4));
  for (let t = 26.0; t < 29.0; t += 0.25) hat(t + 0.125, 0.03 * (1 - (t - 26) / 3.5), false, 0.2);
  [26.25, 26.75, 27.25, 27.75, 28.25].forEach(t => bass(t, 38, 0.2, 0.15));
  for (let i = 0; i < 8; i++) pluck(27.0 + i * 0.25, CH.Dadd9.arp[i % 4] + (i >= 4 ? 12 : 0), 0.02, 0.2, 'triangle', i % 2 ? 0.4 : -0.4);
  bell(29.0, 86, 0.06, 1.2, 0.5, 0.3); bell(29.0, 74, 0.05, 1.2, 0.5, 0.3);

  /* ---------- sidechain ---------- */
  duckTimes.sort((a, b) => a - b);
  duck.gain.setValueAtTime(1, 0);
  for (const t of duckTimes) { duck.gain.setValueAtTime(0.35, t); duck.gain.setTargetAtTime(1, t + 0.012, 0.07); }
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
