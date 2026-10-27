'use strict';
/* ==========================================================================
   Shots 1–4: hook + logo, learning path, lesson, gamification.
   All times are seconds; every hit sits on the 120 BPM grid (0.5 s beats).
   ========================================================================== */

const TL = { intro: 0, path: 5.5, lesson: 8.5, game: 11.5, exam: 14.5, games: 17.5, tools: 20.5, cur: 23.5, end: 26.0 };

/* ---------- shared layout helpers ---------- */
const HL = { f: F.d, w: 800, ls: EN ? -3 : 0 };
const LH = EN ? 1.02 : 1.2;
function headSize(c, lines, maxS = 124, maxW = 900) { return fitSize(c, lines, HL, maxW, maxS); }
// stacked kinetic headline, start-aligned
function headline(c, lines, cols, lt, y0, t0 = 0.05, st = 0.12, maxS = 124, pout = 0) {
  const s = headSize(c, lines, maxS);
  lines.forEach((ln, i) => kineticLine(c, ln, X0, y0 + i * s * LH, { ...HL, s, c: cols[i], a: AL }, lt, t0 + i * st, 0.06, 0.6, E.snap, pout));
  return s;
}
// subtle push-in camera for the whole shot
function push(c, lt, dur, amt = 0.035) { const s = 1 + amt * (lt / dur); scaleAbout(c, W / 2, H * 0.55, s); }
// spring pop transform about a point
function popAt(c, x, y, lt, f = 2.2, d = 6.5, from = 0.6) {
  const s = lerp(from, 1, spring(lt, f, d));
  scaleAbout(c, x, y, Math.max(0.001, s));
  return clamp(lt / 0.12);
}
// a tile with spring entry: returns false if not visible yet
function tileIn(c, x, y, w, h, lt, delay) {
  const u = lt - delay;
  if (u <= 0) return false;
  const s = lerp(0.72, 1, spring(u, 2.0, 6.2));
  c.translate(0, (1 - ez(u, 0, 0.5, E.outC)) * 70);
  scaleAbout(c, x + w / 2, y + h / 2, s);
  c.globalAlpha *= clamp(u / 0.12);
  return true;
}
function pill(c, s, x, y, o) {
  // o: s (font size), bg, fg, a (anchor), pad, h, w (weight), stroke
  const fo = { f: o.f || F.d, w: o.w || 700, s: o.s || 28, ls: o.ls || 0 };
  const tw = measure(c, s, fo), pad = o.pad ?? fo.s * 0.85, h = o.h || fo.s * 1.9, w = tw + pad * 2;
  const x0 = ax(o.a || 'left', x, w);
  if (o.bg) fillRR(c, x0, y - h / 2, w, h, h / 2, o.bg);
  if (o.stroke) strokeRR(c, x0 + 1, y - h / 2 + 1, w - 2, h - 2, h / 2, o.stroke, 2.5);
  text(c, s, x0 + w / 2, y + fo.s * 0.36, { ...fo, c: o.fg, a: 'center' });
  return w;
}
function bgOrange(c, lt) {
  fillBG(c, C.orange);
  c.save(); c.globalAlpha = 0.5;
  for (let i = 0; i < 9; i++) strokeCircle(c, W / 2, H * 1.08, 300 + i * 190 + (lt * 40) % 190, rgba(C.deep, 0.35 - i * 0.03), 2);
  c.restore();
}
function bgInk(c, lt, a = 1) {
  fillBG(c, C.ink);
  dotGrid(c, C.ink4, 0.55 * a, 54, 0, -lt * 18, 2);
}
function bgPaper(c, lt, oy = 0) {
  fillBG(c, C.paper);
  dotGrid(c, C.sand2, 0.9, 54, 0, oy - lt * 14, 2.2);
}

/* ======================================================================
   01 — HOOK + LOGO   (0.0 – 5.5 s)
   ====================================================================== */
const IN = { words: [0, 0.5, 1.0], glitch: 1.5, calm: 1.54, help: 2.0, out: 2.24, fall: 2.04, land1: 2.5, land2: 3.0, book: 3.14, check: 3.5, up: 3.72, word: 3.95, tag: 4.25, by: 4.62, zoom: 5.05 };
const CLOCK = [0, 0.5, 1.0, 1.125, 1.25, 1.3125, 1.375, 1.4375];
const ICON0 = { x: 540, y: 860, s: 520 }, ICON1 = { x: 540, y: 630, s: 400 };

function hookLayout(c) {
  const o = { f: F.d, w: 800, ls: EN ? -8 : 0 };
  const words = T.hook;
  const sizes = words.map((w, i) => fitSize(c, [w], o, 900, EN ? 290 : (i === 1 ? 300 : 250)));
  const adv = sizes.map(s => s * (EN ? 0.84 : 1.08));
  const ys = [];
  let y = 0;
  for (let i = 0; i < words.length; i++) { y += adv[i]; ys.push(y); y += EN ? 26 : 10; }
  return { o, words, sizes, ys, adv };
}

function drawIntro(c, lt) {
  const t = lt;
  bgInk(c, t, ez(t, 2.6, 3.4));
  // ---------- background clock (the pressure) ----------
  const clockA = ez(t, 0, 0.35, E.outC) * (1 - ez(t, 1.5, 1.56, E.lin));
  if (clockA > 0) {
    const cx = 540, cy = 900, R = 440;
    let k = 0, e = 0;
    for (let i = 0; i < CLOCK.length; i++) if (t >= CLOCK[i]) { k = i; e = E.outB2(clamp((t - CLOCK[i]) / 0.09)); }
    const ang = -Math.PI / 2 + (k + e) * (TAU / 12);
    const stress = ez(t, 1.0, 1.45, E.inQ);
    c.save();
    c.globalAlpha *= clockA;
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU - Math.PI / 2, big = i % 5 === 0;
      const r0 = R - (big ? 40 : 20);
      c.strokeStyle = big ? C.ink4 : C.ink3; c.lineWidth = big ? 6 : 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.stroke();
    }
    arcStroke(c, cx, cy, R + 26, -Math.PI / 2, ang, rgba(C.orange, 0.85), 8);
    c.strokeStyle = C.orange; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - Math.cos(ang) * 50, cy - Math.sin(ang) * 50); c.lineTo(cx + Math.cos(ang) * (R - 70), cy + Math.sin(ang) * (R - 70)); c.stroke();
    fillCircle(c, cx, cy, 16, C.orange);
    if (stress > 0) glow(c, cx, cy, 900, C.orange, 0.12 * stress * (0.6 + 0.4 * Math.sin(t * 50)));
    c.restore();
  }

  // ---------- hook words: three slams, on the beat ----------
  if (t < IN.glitch + 0.14) {
    const L = hookLayout(c);
    const FLY = 0.14;
    const landed = IN.words.filter(w => t >= w - FLY).length;
    const centerOf = n => (n <= 0 ? 0 : L.ys[n - 1] / 2 + (L.ys[0] - L.adv[0]) / 2);
    let cy = 0;
    for (let n = 1; n <= 3; n++) cy = lerp(cy, centerOf(n), ez(t, IN.words[n - 1] - FLY, IN.words[n - 1] + 0.2, E.outC));
    const y0 = 900 - cy;
    const glitching = t >= IN.glitch;
    const stress = ez(t, 1.0, 1.4, E.inQ);
    const R = mulberry32(Math.floor(t * 30) * 13 + 5);
    for (let i = 0; i < landed; i++) {
      const u = t - IN.words[i];
      const s = L.sizes[i];
      const sc = u < 0 ? lerp(2.6, 1, E.inQ(prog(u, -FLY, 0))) : 1 - 0.05 * wobble(u, 5, 10);
      const yb = y0 + L.ys[i];
      const jx = noise1(t * 38 + i * 9) * 9 * stress, jy = noise1(t * 41 + i * 5 + 50) * 6 * stress;
      c.save();
      c.globalAlpha *= clamp((u + FLY) / 0.05);
      c.translate(540 + jx, yb - s * 0.35 + jy);
      c.scale(sc, sc);
      if (glitching) { c.translate((R() - 0.5) * 140, 0); c.globalAlpha *= R() < 0.5 ? 1 : 0.3; }
      text(c, L.words[i], 0, s * 0.35, { ...L.o, s, c: i === 2 ? C.orange : C.paper, a: 'center' });
      c.restore();
    }
  }

  // ---------- "Don't panic." / "Help is here." ----------
  {
    const o = { f: F.d, w: 800, ls: EN ? -3 : 0 };
    const s = fitSize(c, [T.calm, T.help], o, 900, EN ? 128 : 140);
    const pout = ez(t, IN.out, IN.out + 0.24, E.inC);
    const y1 = 860, y2 = 860 + s * (EN ? 1.15 : 1.3);
    if (t > IN.calm && pout < 1) {
      kineticLine(c, T.calm, 540, y1, { ...o, s, c: C.paper, a: 'center' }, t, IN.calm, 0.07, 0.4, E.swift, pout);
      kineticLine(c, T.help, 540, y2, { ...o, s, c: C.orange, a: 'center' }, t, IN.help, 0.07, 0.4, E.swift, pout);
    }
  }

  // ---------- the dot falls, lands, bounces — and becomes the logo ----------
  const icon = {
    x: lerp(ICON0.x, ICON1.x, ez(t, IN.up, IN.up + 0.45, E.ioC)),
    y: lerp(ICON0.y, ICON1.y, ez(t, IN.up, IN.up + 0.45, E.ioC)),
    s: lerp(ICON0.s, ICON1.s, ez(t, IN.up, IN.up + 0.45, E.ioC))
  };
  // zoom-through camera into the bookmark (5.05 → 5.5)
  const zp = prog(t, IN.zoom, 5.5);
  if (zp > 0) {
    const P = { x: icon.x, y: icon.y + (34 - 50) * icon.s / 100 };
    const z = Math.exp(Math.log(70) * E.inC(zp));
    c.translate(lerp(0, 540 - P.x, E.inC(zp)), lerp(0, 960 - P.y, E.inC(zp)));
    scaleAbout(c, P.x, P.y, z);
  }
  if (t >= IN.land2 - 0.02) {
    const sq = E.outB2(prog(t, IN.land2, IN.land2 + 0.42));
    const glowA = ez(t, IN.land2, IN.land2 + 0.6) * (0.5 + 0.08 * Math.sin(t * 3));
    glow(c, icon.x, icon.y, icon.s * 1.35, C.orange, 0.42 * glowA * (1 - zp));
    // floating motes
    const ma = ez(t, IN.land2, IN.land2 + 0.8);
    for (let i = 0; i < 46; i++) {
      const sp = 30 + hash(i * 3.1) * 70, px = hash(i * 7.7) * W, py = ((hash(i * 1.3) * H - (t - 3) * sp) % H + H) % H;
      const r = 1.5 + hash(i * 5.5) * 4.5;
      fillCircle(c, px + Math.sin(t * 0.8 + i) * 12, py, r, rgba(i % 3 ? C.peach : C.orange, (0.18 + hash(i) * 0.4) * ma));
    }
    c.save();
    rotAbout(c, icon.x, icon.y, -0.22 * (1 - E.outB(prog(t, IN.land2, IN.land2 + 0.5))));
    drawFazIcon(c, icon.x, icon.y, icon.s, {
      sq, dot: 0,
      book: E.outC(prog(t, IN.book, IN.book + 0.34)),
      check: E.outC(prog(t, IN.check, IN.check + 0.2)),
      glint: prog(t, 3.62, 4.05)
    });
    c.restore();
    sparks(c, icon.x, icon.y + icon.s * 0.02, t - (IN.check + 0.18), icon.s * 0.62, icon.s * 0.86, C.peach, 10, 7, 0.45, 0.3);
    ring(c, icon.x, icon.y, t - IN.land2, icon.s * 0.3, icon.s * 1.1, C.orange, 10, 0.7);
  }
  // the peach dot
  if (t >= IN.fall) {
    let x = 540, y, r = 44, sx = 1, sy = 1, ringA = 0;
    if (t < IN.land1) {
      const u = prog(t, IN.fall, IN.land1);
      y = lerp(-140, ICON0.y, E.inQ(u));
      sy = 1 + 0.55 * u * u; sx = 1 / sy;
    } else if (t < IN.land2) {
      const u = prog(t, IN.land1, IN.land2);
      y = ICON0.y - 190 * 4 * u * (1 - u);
      const sqz = wobble(t - IN.land1, 3.2, 9);
      sx = 1 + 0.5 * sqz; sy = 1 - 0.45 * sqz;
      const v = Math.abs(1 - 2 * u); if (u > 0.15) { sy *= 1 + 0.25 * v * v; sx /= 1 + 0.25 * v * v; }
    } else {
      const e = E.outB(prog(t, IN.land2, IN.land2 + 0.46));
      const tx = icon.x + (FZ.dot.x - 50) * icon.s / 100, ty = icon.y + (FZ.dot.y - 50) * icon.s / 100;
      // follow the icon's entry rotation so the dot sits exactly on the corner
      const rot = -0.22 * (1 - E.outB(prog(t, IN.land2, IN.land2 + 0.5)));
      const dx = tx - icon.x, dy = ty - icon.y;
      const rx = icon.x + dx * Math.cos(rot) - dy * Math.sin(rot), ry = icon.y + dx * Math.sin(rot) + dy * Math.cos(rot);
      x = lerp(ICON0.x, rx, e); y = lerp(ICON0.y, ry, e) - Math.sin(clamp(e) * Math.PI) * 120;
      r = lerp(44, FZ.dot.r * icon.s / 100, e);
      const sqz = wobble(t - IN.land2, 3, 8); sx = 1 + 0.35 * sqz; sy = 1 - 0.3 * sqz;
      ringA = ez(t, IN.land2 + 0.1, IN.land2 + 0.3);
    }
    c.save();
    c.translate(x, y + r * (1 - sy)); c.scale(sx, sy);
    const rg = FZ.dot.ring * icon.s / 100;
    if (ringA > 0) fillCircle(c, 0, 0, r + rg / 2, rgba(C.ink, ringA));
    fillCircle(c, 0, 0, r - rg / 2 * ringA, C.peach);
    c.restore();
    ring(c, x, ICON0.y + 44, t - IN.land1, 40, 260, C.peach, 6, 0.5);
  }

  // ---------- wordmark, tagline, lockup ----------
  if (t >= IN.word) {
    const o = { f: F.d, w: 800, ls: EN ? -3 : 0 };
    const s = fitSize(c, [T.name], o, 900, EN ? 124 : 150);
    kineticLine(c, T.name, 540, 990, { ...o, s, c: C.paper, a: 'center' }, t, IN.word, 0.08, 0.55, E.snap);
    const to = { f: F.d, w: 600, ls: EN ? -1 : 0 };
    const ts = fitSize(c, T.tagline, to, 860, EN ? 66 : 72);
    const ty = EN ? 1112 : 1130;
    kineticLine(c, T.tagline[0], 540, ty, { ...to, s: ts, c: C.paper, a: 'center' }, t, IN.tag, 0.05, 0.5, E.snap);
    kineticLine(c, T.tagline[1], 540, ty + ts * (EN ? 1.15 : 1.3), { ...to, s: ts, c: C.orange, a: 'center' }, t, IN.tag + 0.12, 0.05, 0.5, E.snap);
    const lp = ez(t, IN.by, IN.by + 0.4, E.outC);
    c.save(); c.translate(0, (1 - lp) * 30);
    jfLockup(c, 540, 1352, 56, C.paper, lp, T.by);
    c.restore();
  }
  // land the zoom on clean paper — the next shot starts on the same paper
  if (zp > 0.75) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = ez(zp, 0.75, 0.9, E.inQ); fillBG(c, C.paper); c.restore(); }
}

/* ======================================================================
   02 — LEARNING PATH   (5.5 – 8.5 s)
   ====================================================================== */
const PA = { done: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75], boss: 2.0, label: 2.12 };
const PNODES = [
  { x: 0, icon: 'star' }, { x: 160, icon: 'book' }, { x: 225, icon: 'pencil' },
  { x: 95, icon: 'star' }, { x: -110, icon: 'book' }, { x: -205, icon: 'pencil' }
];
const PBOSS = { x: -40 };
const pnY = i => 1450 - i * 200;
const PBOSS_Y = 1450 - 6 * 200 - 30;
const pathScroll = lt => -260 + 200 * 5.5 * E.ioC(prog(lt, 0.25, 2.25));
let _pathPts = null;
function pathPoints() {
  if (_pathPts) return _pathPts;
  const P = PNODES.map((n, i) => [MX(540 + n.x), pnY(i)]).concat([[MX(540 + PBOSS.x), PBOSS_Y]]);
  const segs = [];
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1], pts = [];
    for (let k = 0; k <= 24; k++) {
      const u = k / 24, v = 1 - u;
      const c1 = [a[0], a[1] - 95], c2 = [b[0], b[1] + 95];
      pts.push([v * v * v * a[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * b[0], v * v * v * a[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * b[1]]);
    }
    segs.push(pts);
  }
  return (_pathPts = segs);
}
function dashedPart(c, pts, p, col, lw, oy) {
  if (p <= 0) return;
  const n = Math.max(2, Math.ceil(pts.length * clamp(p)));
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1] + oy);
  for (let i = 1; i < n; i++) c.lineTo(pts[i][0], pts[i][1] + oy);
  c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.setLineDash([0.01, 38]); c.stroke(); c.setLineDash([]);
}
function lessonNode(c, x, y, r, lt, popT, doneT, iconName) {
  const u = lt - popT;
  if (u <= 0) return;
  const s = lerp(0.3, 1, spring(u, 2.4, 7));
  const d = ez(lt, doneT, doneT + 0.16, E.outC);
  const press = lt > doneT - 0.1 && lt < doneT + 0.12 ? Math.sin(prog(lt, doneT - 0.1, doneT + 0.12) * Math.PI) : 0;
  const active = lt > doneT - 0.35 && lt < doneT;
  c.save();
  c.globalAlpha *= clamp(u / 0.1);
  scaleAbout(c, x, y, s);
  if (active) { const k = prog(lt, doneT - 0.35, doneT); strokeCircle(c, x, y + 6, r + 18 + 6 * Math.sin(k * 8), rgba(C.orange, 0.35), 6); }
  const dep = 13, py = press * 9;
  fillCircle(c, x, y + dep, r, d >= 1 ? C.deep : C.sand2);
  fillCircle(c, x, y + py, r, C.sand);
  if (d > 0) {
    c.save(); circle(c, x, y + dep, r * d * 1.02); c.clip();
    fillCircle(c, x, y + dep, r, C.deep);
    fillCircle(c, x, y + py, r, C.orange);
    c.restore();
  }
  if (d < 0.5) icon(c, iconName, x, y + py, r * 0.95, C.mute, 7);
  else {
    const k = spring(lt - doneT - 0.05, 2.6, 7);
    c.save(); scaleAbout(c, x, y + py, Math.max(0.001, k));
    icon(c, 'check', x, y + py, r * 1.05, C.paper, 10);
    c.restore();
  }
  // gloss
  c.save(); circle(c, x, y + py, r); c.clip();
  fillCircle(c, x - r * 0.35, y + py - r * 0.45, r * 0.45, rgba(C.white, 0.16));
  c.restore();
  c.restore();
  ring(c, x, y, lt - doneT, r, r + 80, C.orange, 7, 0.5);
}
function drawPath(c, lt) {
  const sc = pathScroll(lt);
  bgPaper(c, lt, sc * 0.4);
  c.save();
  push(c, lt, 3, 0.02);
  // ---------- the path ----------
  const segs = pathPoints();
  const pa = ez(lt, 0.05, 0.6, E.outC);
  for (let i = 0; i < segs.length; i++) dashedPart(c, segs[i], pa, C.sand2, 18, sc);
  for (let i = 0; i < segs.length; i++) {
    const t0 = PA.done[i] + 0.04, t1 = i < 5 ? PA.done[i] + 0.24 : PA.boss;
    dashedPart(c, segs[i], ez(lt, t0, t1, E.ioC), C.orange, 18, sc);
  }
  for (let i = 0; i < PNODES.length; i++) {
    const x = MX(540 + PNODES[i].x), y = pnY(i) + sc;
    if (y < 520 || y > 2100) continue;
    lessonNode(c, x, y, 70, lt, 0.08 + i * 0.07, PA.done[i], PNODES[i].icon);
    xpChip(c, x + DIR * 160, y - 44, lt - PA.done[i] - 0.05, '+10 XP', C.ink, C.paper, 32);
  }
  // ---------- boss node ----------
  {
    const x = MX(540 + PBOSS.x), y = PBOSS_Y + sc, r = 104;
    const u = lt - 0.5;
    if (u > 0 && y < 2100) {
      const un = ez(lt, PA.boss, PA.boss + 0.2, E.outC);
      const rays = ez(lt, PA.boss, PA.boss + 0.5);
      if (rays > 0) {
        c.save(); c.translate(x, y); c.rotate(lt * 0.6);
        c.fillStyle = rgba(C.peach, 0.55 * rays);
        for (let k = 0; k < 14; k++) { c.rotate(TAU / 14); c.beginPath(); c.moveTo(0, 0); c.lineTo(-26, -r * 2.5 * rays); c.lineTo(26, -r * 2.5 * rays); c.closePath(); c.fill(); }
        c.restore();
        glow(c, x, y, 360, C.orange, 0.35 * rays);
      }
      c.save();
      const shakeX = lt > PA.boss - 0.25 && lt < PA.boss ? Math.sin(lt * 90) * 6 : 0;
      c.translate(shakeX, 0);
      scaleAbout(c, x, y, lerp(0.5, 1, spring(u, 2, 7)) * (1 + 0.12 * wobble(lt - PA.boss, 3, 6)));
      fillCircle(c, x, y + 16, r, un > 0.5 ? C.deep : C.sand2);
      fillCircle(c, x, y, r, C.sand);
      if (un > 0) { c.save(); circle(c, x, y, r * un * 1.02); c.clip(); fillCircle(c, x, y + 16, r, C.deep); fillCircle(c, x, y, r, C.orange); c.restore(); }
      strokeCircle(c, x, y, r - 12, rgba(un > 0.5 ? C.paper : C.sand2, 0.6), 4);
      if (un < 0.5) icon(c, 'lock', x, y, r * 0.95, C.mute, 8);
      else { c.save(); scaleAbout(c, x, y, Math.max(0.001, spring(lt - PA.boss - 0.05, 2.4, 6))); icon(c, 'crown', x, y - 4, r * 1.05, C.paper, 6); c.restore(); }
      c.restore();
      ring(c, x, y, lt - PA.boss, r, r + 160, C.orange, 9, 0.6);
      confetti(c, x, y, lt - PA.boss, { n: 36, seed: 31, speed: 1400, size: 18, life: 1.2 });
      // label
      const lu = lt - PA.label;
      if (lu > 0) {
        const s = lerp(0.4, 1, spring(lu, 2.3, 6.5));
        const ly = y - r - 118;
        c.save(); c.globalAlpha *= clamp(lu / 0.1); scaleAbout(c, x, ly + 60, s);
        const o1 = { f: F.d, w: 800, s: 42, ls: EN ? -1 : 0 }, o2 = { f: F.d, w: 600, s: 26 };
        const w = Math.max(measure(c, T.boss, o1), measure(c, T.bossSub, o2)) + 84;
        fillRR(c, x - w / 2, ly - 10, w, 132, 34, C.ink);
        poly(c, [[x - 18, ly + 120], [x + 18, ly + 120], [x, ly + 140]]); c.fillStyle = C.ink; c.fill();
        text(c, T.boss, x, ly + 52, { ...o1, c: C.paper, a: 'center' });
        text(c, T.bossSub, x, ly + 98, { ...o2, c: C.peach, a: 'center' });
        c.restore();
      }
    }
  }
  c.restore();
  // fade the path under the headline + at the bottom
  let g = c.createLinearGradient(0, 650, 0, 860);
  g.addColorStop(0, rgba(C.paper, 1)); g.addColorStop(1, rgba(C.paper, 0));
  c.fillStyle = g; c.fillRect(0, 0, W, 860);
  g = c.createLinearGradient(0, 1640, 0, 1900);
  g.addColorStop(0, rgba(C.paper, 0)); g.addColorStop(1, rgba(C.paper, 0.95));
  c.fillStyle = g; c.fillRect(0, 1640, W, 300);
  // ---------- copy ----------
  chapter(c, 1, T.ch[0], lt - 0.02, C.ink);
  const s = headline(c, T.pathH, [C.ink, C.orange], lt, 430, 0.04, 0.1, 128);
  kineticLine(c, T.pathSub, X0, 430 + s * LH + 92, { f: F.d, w: 500, s: 38, c: C.gray, a: AL }, lt, 0.32, 0.03, 0.5, E.snap);
}

/* ======================================================================
   03 — LESSON   (8.5 – 11.5 s)
   ====================================================================== */
const LE = { l2: 0.78, l3: 1.62, contTap: 0.56, swap: 0.68, optTap: 1.18, checkTap: 1.45, correct: 1.55 };
const CARD = { x: 90, y: 722, w: 900, h: 768, r: 56 };
const IX = x => MX(x); // inner positions, mirrored
function quadFormula(c, cx, cy, s, col) {
  // x = (−b ± √(b² − 4ac)) / 2a
  const lhs = [{ i: 'x' }, { op: '=' }];
  const num = ['−', { i: 'b' }, { op: '±' }];
  const rad = [{ i: 'b' }, { sup: '2' }, { op: '−' }, '4', { i: 'a' }, { i: 'c' }];
  const den = ['2', { i: 'a' }];
  const wl = mathWidth(c, lhs, s), wn = mathWidth(c, num, s), wr = mathWidth(c, rad, s), wd = mathWidth(c, den, s);
  const radW = s * 0.62;
  const numW = wn + radW + wr;
  const fracW = Math.max(numW, wd) + s * 0.3;
  const total = wl + s * 0.15 + fracW;
  let x = cx - total / 2;
  drawMath(c, lhs, x, cy + s * 0.32, s, col);
  x += wl + s * 0.15;
  const ny = cy - s * 0.42, dy = cy + s * 1.02;
  // fraction bar
  c.fillStyle = col; c.fillRect(x, cy - s * 0.04, fracW, Math.max(2, s * 0.05));
  let nx = x + (fracW - numW) / 2;
  drawMath(c, num, nx, ny, s, col);
  nx += wn;
  // radical
  c.strokeStyle = col; c.lineWidth = s * 0.05; c.lineJoin = 'miter'; c.lineCap = 'butt';
  c.beginPath();
  c.moveTo(nx + s * 0.04, ny - s * 0.28); c.lineTo(nx + s * 0.16, ny - s * 0.36); c.lineTo(nx + s * 0.3, ny + s * 0.12);
  c.lineTo(nx + s * 0.52, ny - s * 0.86); c.lineTo(nx + radW + wr + s * 0.04, ny - s * 0.86);
  c.stroke();
  drawMath(c, rad, nx + radW, ny, s, col);
  drawMath(c, den, x + (fracW - wd) / 2, dy, s, col);
}
const QOPTS = [
  [{ i: 'x' }, { op: '=' }, '1, 6'], [{ i: 'x' }, { op: '=' }, '2, 3'],
  [{ i: 'x' }, { op: '=' }, '−2, −3'], [{ i: 'x' }, { op: '=' }, '5, 6']
];
const QRIGHT = 1;
function optRect(i) {
  const col = i % 2, row = Math.floor(i / 2);
  const w = 382, h = 96, x = EN ? 146 + col * (w + 24) : 934 - w - col * (w + 24);
  return { x, y: 1112 + row * 122, w, h };
}
function drawLesson(c, lt) {
  bgOrange(c, lt);
  // headline: three verbs that land with the story
  const ho = { ...HL };
  const s = fitSize(c, T.lessonH, ho, 900, EN ? 112 : 90);
  const acts = [0.05, LE.l2, LE.l3];
  T.lessonH.forEach((ln, i) => {
    const dim = i < 2 ? ez(lt, acts[i + 1], acts[i + 1] + 0.3) : 0;
    kineticLine(c, ln, X0, (EN ? 420 : 398) + i * s * (EN ? 1.0 : 1.27), { ...ho, s, c: mix(C.paper, C.deep, dim), a: AL }, lt, acts[i], 0.06, 0.5, E.snap);
  });
  chapter(c, 2, T.ch[1], lt, C.ink, C.paper);

  // ---------- the lesson card ----------
  const cin = ez(lt, 0.0, 0.55, E.swift);
  c.save();
  c.translate(0, (1 - cin) * 900);
  rotAbout(c, 540, 1100, (1 - cin) * 0.12 * DIR);
  shadow(c, 'rgba(60,20,0,0.35)', 70, 34);
  fillRR(c, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r, C.paper);
  noShadow(c);
  rr(c, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r); c.save(); c.clip();
  // header: close, progress, hearts
  icon(c, 'x', IX(166), 792, 44, C.mute, 9);
  const prog1 = 0.18 + 0.27 * ez(lt, LE.swap, LE.swap + 0.4, E.outC) + 0.3 * ez(lt, LE.correct, LE.correct + 0.5, E.outB);
  const bx = EN ? 212 : 868, bw = 590;
  fillRR(c, EN ? bx : bx - bw, 781, bw, 24, 12, C.sand);
  const fw = bw * prog1;
  fillRR(c, EN ? bx : bx - fw, 781, fw, 24, 12, C.orange);
  fillRR(c, EN ? bx + 12 : bx - fw + 12, 786, Math.max(0, fw - 24), 6, 3, rgba(C.white, 0.35));
  icon(c, 'heart', IX(848), 792, 46, C.orange);
  text(c, '5', IX(886), 806, { f: F.d, w: 800, s: 38, c: C.orange, a: AL, rtl: false });

  const sw = ez(lt, LE.swap, LE.swap + 0.28, E.whip);
  // page A — explanation
  if (sw < 1) {
    c.save(); c.translate(-DIR * sw * W, 0);
    pill(c, T.lessonTag, IX(146), 878, { s: 24, bg: C.peach2, fg: C.orange, a: AL, w: 700, ls: EN ? 3 : 0 });
    text(c, T.lessonTitle, IX(146), 990, { f: F.d, w: 800, s: 54, c: C.ink, a: AL, ls: EN ? -1 : 0 });
    fillRR(c, 146, 1032, 788, 236, 30, C.sand);
    const fp = ez(lt, 0.12, 0.5, E.outC);
    c.save(); c.beginPath(); c.rect(146, 1032, 788 * fp, 236); c.clip();
    quadFormula(c, 540, 1140, 62, C.ink);
    c.restore();
    if (fp > 0 && fp < 1) fillRR(c, 146 + 788 * fp - 4, 1060, 6, 180, 3, C.orange);
    const pr = lt > LE.contTap && lt < LE.contTap + 0.14 ? Math.sin(prog(lt, LE.contTap, LE.contTap + 0.14) * Math.PI) : 0;
    button3D(c, 146, 1350, 788, 96, 30, C.orange, C.deep, 10, pr);
    text(c, T.cont, 540, 1350 + 10 * pr + 62, { f: F.d, w: 800, s: 38, c: C.paper, a: 'center', ls: EN ? 1 : 0 });
    c.restore();
  }
  // page B — question
  if (sw > 0) {
    c.save(); c.translate(DIR * (1 - sw) * W, 0);
    pill(c, T.qTag, IX(146), 878, { s: 24, bg: C.peach2, fg: C.orange, a: AL, w: 700, ls: EN ? 3 : 0 });
    text(c, T.qText, IX(146), 980, { f: F.d, w: 700, s: 44, c: C.ink, a: AL });
    drawMath(c, [{ i: 'x' }, { sup: '2' }, { op: '−' }, '5', { i: 'x' }, { op: '+' }, '6', { op: '=' }, '0'], 540, 1068, 70, C.ink, 'center');
    const sel = lt >= LE.optTap + 0.04, ok = lt >= LE.correct;
    for (let i = 0; i < 4; i++) {
      const R = optRect(i), u = lt - (LE.swap + 0.16 + i * 0.05);
      if (u <= 0) continue;
      const isSel = i === QRIGHT && sel;
      const press = i === QRIGHT && lt > LE.optTap && lt < LE.optTap + 0.14 ? Math.sin(prog(lt, LE.optTap, LE.optTap + 0.14) * Math.PI) : 0;
      c.save(); c.globalAlpha *= clamp(u / 0.1);
      scaleAbout(c, R.x + R.w / 2, R.y + R.h / 2, lerp(0.6, 1, spring(u, 2.4, 7)) * (isSel && ok ? 1 + 0.06 * wobble(lt - LE.correct, 3, 6) : 1));
      const top = isSel ? (ok ? C.orange : C.peach2) : C.white, lip = isSel ? (ok ? C.deep : '#FFB27F') : C.sand2;
      button3D(c, R.x, R.y, R.w, R.h, 26, top, lip, 9, press);
      strokeRR(c, R.x + 1.5, R.y + 1.5 + 9 * press, R.w - 3, R.h - 3, 25, isSel ? (ok ? C.orange : C.orange) : C.line, 3);
      drawMath(c, QOPTS[i], R.x + R.w / 2, R.y + 64 + 9 * press, 46, isSel ? (ok ? C.paper : C.orange) : C.ink, 'center');
      c.restore();
    }
    // check button
    const cr = lt > LE.checkTap && lt < LE.checkTap + 0.14 ? Math.sin(prog(lt, LE.checkTap, LE.checkTap + 0.14) * Math.PI) : 0;
    const on = ez(lt, LE.optTap + 0.04, LE.optTap + 0.2);
    button3D(c, 146, 1362, 788, 96, 30, mix(C.sand, C.orange, on), mix(C.sand2, C.deep, on), 10, cr);
    text(c, T.check, 540, 1362 + 10 * cr + 62, { f: F.d, w: 800, s: 38, c: mix(C.mute, C.paper, on), a: 'center', ls: EN ? 1 : 0 });
    c.restore();
  }
  // feedback sheet
  const fb = ez(lt, LE.correct, LE.correct + 0.35, E.swift);
  if (fb > 0) {
    const sy = lerp(CARD.y + CARD.h, 1300, fb);
    fillRR(c, CARD.x, sy, CARD.w, 260, [44, 44, 0, 0], C.peach2);
    const k = spring(lt - LE.correct - 0.1, 2.4, 6);
    c.save(); scaleAbout(c, IX(196), sy + 92, Math.max(0.001, k));
    fillCircle(c, IX(196), sy + 92, 46, C.orange); icon(c, 'check', IX(196), sy + 92, 60, C.paper, 12);
    c.restore();
    text(c, T.correct, IX(268), sy + 110, { f: F.d, w: 800, s: 52, c: C.orange, a: AL, ls: EN ? -1 : 0 });
    const xk = spring(lt - LE.correct - 0.2, 2.2, 6);
    c.save(); scaleAbout(c, IX(850), sy + 92, Math.max(0.001, xk));
    pill(c, '+10 XP', IX(850) + (EN ? 0 : 0), sy + 92, { s: 30, bg: C.orange, fg: C.paper, a: 'center', w: 800 });
    c.restore();
  }
  c.restore(); // clip
  c.restore();
  // taps
  tapFX(c, IX(700), 1398, lt - LE.contTap);
  const R = optRect(QRIGHT);
  tapFX(c, R.x + R.w * 0.62, R.y + 58, lt - LE.optTap);
  tapFX(c, IX(620), 1410, lt - LE.checkTap);
  confetti(c, 540, 1330, lt - LE.correct - 0.05, { n: 46, seed: 12, speed: 1700, size: 18, dir: -Math.PI / 2, spread: 1.6, life: 1.4, cols: [C.orange, C.peach, C.ink, C.amber] });
}

/* ======================================================================
   04 — GAMIFICATION   (11.5 – 14.5 s)
   ====================================================================== */
const GA = { xp0: 0.38, xp1: 1.2, lvl: 1.25, st0: 0.5, st1: 1.5, heartLose: 1.6, heartFill: 2.35, badges: 0.62 };
const TILE = { w: 435, h: 405, g: 30, y0: 660 };
function tileXY(col, row) {
  const x = EN ? 90 + col * (TILE.w + TILE.g) : 990 - TILE.w - col * (TILE.w + TILE.g);
  return { x, y: TILE.y0 + row * (TILE.h + TILE.g) };
}
function drawGame(c, lt) {
  bgInk(c, lt);
  glow(c, 540, 1100, 900, C.orange, 0.1);
  chapter(c, 3, T.ch[2], lt, C.paper);
  headline(c, T.gameH, [C.paper, C.orange], lt, 432, 0.04, 0.1, 128);

  // XP + level
  {
    const { x, y } = tileXY(0, 0), w = TILE.w, h = TILE.h, cx = x + w / 2;
    c.save();
    if (tileIn(c, x, y, w, h, lt, 0.12)) {
      fillRR(c, x, y, w, h, 44, C.orange);
      const v = 500 * E.outC(prog(lt, GA.xp0, GA.xp1));
      const lvUp = lt >= GA.lvl;
      const frac = lvUp ? 0.1 * E.outC(prog(lt, GA.lvl + 0.15, GA.lvl + 0.9)) : v / 500;
      const rcy = y + 172;
      strokeCircle(c, cx, rcy, 112, rgba(C.ink, 0.16), 24);
      arcStroke(c, cx, rcy, 112, -Math.PI / 2, -Math.PI / 2 + TAU * frac * DIR, C.ink, 24);
      const fl = pulse(lt - GA.lvl, 5);
      if (fl > 0.01) strokeCircle(c, cx, rcy, 112, rgba(C.paper, fl), 24);
      text(c, T.level, cx, rcy - 34, { f: F.d, w: 700, s: 26, c: rgba(C.ink, 0.65), a: 'center', ls: EN ? 2 : 0 });
      const flip = prog(lt, GA.lvl - 0.08, GA.lvl + 0.12);
      const sy = Math.abs(Math.cos(flip * Math.PI));
      c.save(); c.translate(cx, rcy + 52); c.scale(1, Math.max(0.02, sy));
      text(c, flip < 0.5 ? '1' : '2', 0, 0, { f: F.d, w: 800, s: 100, c: C.ink, a: 'center', rtl: false });
      c.restore();
      text(c, Math.round(v) + ' XP', cx, y + 352, { f: F.d, w: 800, s: 62, c: C.ink, a: 'center', rtl: false, ls: -1 });
    }
    c.restore();
    // LEVEL UP badge
    const u = lt - GA.lvl;
    if (u > 0) {
      const s = lerp(0.2, 1, spring(u, 2.4, 6));
      c.save(); c.globalAlpha *= clamp(u / 0.08) * (1 - ez(lt, 2.6, 2.85));
      scaleAbout(c, cx, y + 6, s); rotAbout(c, cx, y + 6, -0.08 * DIR);
      pill(c, T.levelUp, cx, y + 6, { s: 36, bg: C.ink, fg: C.paper, a: 'center', w: 800, ls: EN ? 1 : 0 });
      c.restore();
      sparks(c, cx, y + 6, u, 150, 230, C.peach, 12, 7, 0.5);
      confetti(c, cx, y + 40, u, { n: 40, seed: 3, speed: 1500, size: 17, life: 1.3, cols: [C.paper, C.peach, C.orange, C.amber] });
    }
  }
  // streak
  {
    const { x, y } = tileXY(1, 0), w = TILE.w, h = TILE.h, cx = x + w / 2;
    c.save();
    if (tileIn(c, x, y, w, h, lt, 0.19)) {
      fillRR(c, x, y, w, h, 44, C.ink2); strokeRR(c, x + 1, y + 1, w - 2, h - 2, 43, C.ink3, 2);
      const vv = lerp(1, 30, E.ioC(prog(lt, GA.st0, GA.st1)));
      const n = Math.round(vv), bump = 1 + 0.07 * (1 - (vv % 1));
      glow(c, cx, y + 160, 220, C.orange, 0.32);
      c.save(); scaleAbout(c, cx, y + 210, bump * (1 + 0.1 * wobble(lt - GA.st1, 3, 5)));
      const g = c.createLinearGradient(0, y + 60, 0, y + 250);
      g.addColorStop(0, C.amber); g.addColorStop(1, C.orange);
      c.fillStyle = g; flamePath(c, cx, y + 160, 78, lt); c.fill();
      c.fillStyle = C.peach; flamePath(c, cx, y + 196, 36, lt + 3); c.fill();
      c.restore();
      text(c, String(n), cx, y + 322, { f: F.d, w: 800, s: 92, c: C.paper, a: 'center', rtl: false, ls: -2 });
      text(c, T.streak, cx, y + 372, { f: F.d, w: 600, s: 30, c: C.mute, a: 'center' });
      ring(c, cx, y + 160, lt - GA.st1, 60, 200, C.orange, 8, 0.55);
    }
    c.restore();
  }
  // hearts
  {
    const { x, y } = tileXY(0, 1), w = TILE.w, h = TILE.h, cx = x + w / 2;
    c.save();
    if (tileIn(c, x, y, w, h, lt, 0.26)) {
      fillRR(c, x, y, w, h, 44, C.ink2); strokeRR(c, x + 1, y + 1, w - 2, h - 2, 43, C.ink3, 2);
      let cnt = 5;
      for (let i = 0; i < 5; i++) {
        const hx = cx + DIR * (i - 2) * 78, hy = y + 150;
        const u = lt - (0.45 + i * 0.07);
        if (u <= 0) continue;
        c.save(); scaleAbout(c, hx, hy, Math.max(0.001, lerp(0.2, 1, spring(u, 2.6, 7))));
        if (i === 4) {
          const lose = ez(lt, GA.heartLose, GA.heartLose + 0.15), fill = ez(lt, GA.heartFill - 0.6, GA.heartFill, E.ioC);
          if (lose > 0) {
            cnt = fill >= 1 ? 5 : 4;
            c.translate(Math.sin(lt * 70) * 5 * (1 - prog(lt, GA.heartLose, GA.heartLose + 0.3)) * (lt < GA.heartLose + 0.3 ? 1 : 0), 0);
            heartPath(c, hx, hy, 32); c.fillStyle = C.ink4; c.fill();
            c.save(); c.beginPath(); c.rect(hx - 40, hy + 30 - 70 * fill, 80, 80); c.clip();
            heartPath(c, hx, hy, 32); c.fillStyle = C.orange; c.fill(); c.restore();
            if (fill > 0 && fill < 1) { c.save(); heartPath(c, hx, hy, 32); c.strokeStyle = rgba(C.orange, 0.8); c.lineWidth = 3; c.stroke(); c.restore(); }
          } else { heartPath(c, hx, hy, 32); c.fillStyle = C.orange; c.fill(); }
        } else { heartPath(c, hx, hy, 32); c.fillStyle = C.orange; c.fill(); }
        c.restore();
        if (i === 4) ring(c, hx, hy, lt - GA.heartFill, 30, 110, C.orange, 6, 0.5);
      }
      text(c, String(cnt), cx, y + 322, { f: F.d, w: 800, s: 92, c: C.paper, a: 'center', rtl: false });
      text(c, T.hearts, cx, y + 372, { f: F.d, w: 600, s: 30, c: C.mute, a: 'center' });
    }
    c.restore();
  }
  // achievements
  {
    const { x, y } = tileXY(1, 1), w = TILE.w, h = TILE.h, cx = x + w / 2;
    c.save();
    if (tileIn(c, x, y, w, h, lt, 0.33)) {
      fillRR(c, x, y, w, h, 44, C.ink2); strokeRR(c, x + 1, y + 1, w - 2, h - 2, 43, C.ink3, 2);
      const ics = ['book', 'flame', 'crown', 'star'];
      for (let i = 0; i < 4; i++) {
        const bx = cx + DIR * (i - 1.5) * 96, by = y + 150;
        const u = lt - (GA.badges + i * 0.1);
        if (u <= 0) continue;
        const dy = (1 - E.outBounce(clamp(u / 0.42))) * -120;
        c.save(); c.globalAlpha *= clamp(u / 0.06); c.translate(0, dy);
        fillCircle(c, bx, by + 6, 42, C.deep);
        fillCircle(c, bx, by, 42, C.peach);
        strokeCircle(c, bx, by, 34, rgba(C.orange, 0.5), 3);
        icon(c, ics[i], bx, by, 46, C.orange, 8, lt);
        c.restore();
      }
      const gl = prog(lt, 1.75, 2.15);
      if (gl > 0 && gl < 1) {
        c.save(); c.beginPath(); c.rect(x, y + 90, w, 130); c.clip();
        const gx = lerp(x - 100, x + w + 100, EN ? gl : 1 - gl);
        const g = c.createLinearGradient(gx - 60, 0, gx + 60, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalCompositeOperation = 'overlay'; c.fillStyle = g; c.fillRect(x, y + 90, w, 130); c.restore();
      }
      const ts = fitSize(c, [T.ach], { f: F.d, w: 800, ls: EN ? -1 : 0 }, w - 60, 50);
      text(c, T.ach, cx, y + 318, { f: F.d, w: 800, s: ts, c: C.paper, a: 'center', ls: EN ? -1 : 0 });
      const ss = fitSize(c, [T.achSub], { f: F.d, w: 600 }, w - 50, 26);
      text(c, T.achSub, cx, y + 368, { f: F.d, w: 600, s: ss, c: C.mute, a: 'center' });
    }
    c.restore();
  }
}
