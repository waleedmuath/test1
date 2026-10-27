'use strict';
/* ==========================================================================
   Shots 1–4: hook + logo, learning path, lesson, gamification.
   All times are seconds; every hit sits on the 120 BPM grid (0.5 s beats).
   ========================================================================== */

const TL = { intro: 0, path: 5.5, lesson: 8.5, game: 11.5, exam: 14.5, games: 17.5, tools: 20.5, cur: 23.5, end: 26.0 };

/* ---------- shared layout helpers ---------- */
const HL = { f: FONT.d, w: 800, ls: EN ? -3 : 0 };
const LH = EN ? 1.02 : 1.2;
function headSize(c, lines, maxS = 124, maxW = 900) { return fitType(c, lines, HL, maxW, maxS); }
// stacked kinetic headline, start-aligned
function headline(c, lines, cols, lt, y0, t0 = 0.05, st = 0.12, maxS = 124, pout = 0) {
  const s = headSize(c, lines, maxS);
  lines.forEach((ln, i) => kLine(c, ln, X0, y0 + i * s * LH, { ...HL, s, c: cols[i], a: AL }, lt, t0 + i * st, 0.06, 0.6, Ez.kinetic, pout));
  return s;
}
// subtle push-in camera for the whole shot
function push(c, lt, dur, amt = 0.035) { const s = 1 + amt * (lt / dur); scaleAt(c, W / 2, H * 0.55, s); }
// spring pop transform about a point
function popAt(c, x, y, lt, f = 2.2, d = 6.5, from = 0.6) {
  const s = lerp(from, 1, settle(lt, f, d));
  scaleAt(c, x, y, Math.max(0.001, s));
  return clamp(lt / 0.12);
}
// a tile with spring entry: returns false if not visible yet
function tileIn(c, x, y, w, h, lt, delay) {
  const u = lt - delay;
  if (u <= 0) return false;
  const s = lerp(0.72, 1, settle(u, 2.0, 6.2));
  c.translate(0, (1 - tw(u, 0, 0.5, Ez.cubicOut)) * 70);
  scaleAt(c, x + w / 2, y + h / 2, s);
  c.globalAlpha *= clamp(u / 0.12);
  return true;
}
function pill(c, s, x, y, o) {
  // o: s (font size), bg, fg, a (anchor), pad, h, w (weight), stroke
  const fo = { f: o.f || FONT.d, w: o.w || 700, s: o.s || 28, ls: o.ls || 0 };
  const textW = wOf(c, s, fo), pad = o.pad ?? fo.s * 0.85, h = o.h || fo.s * 1.9, w = textW + pad * 2;
  const x0 = alignX(o.a || 'left', x, w);
  if (o.bg) slab(c, x0, y - h / 2, w, h, h / 2, o.bg);
  if (o.stroke) slabLine(c, x0 + 1, y - h / 2 + 1, w - 2, h - 2, h / 2, o.stroke, 2.5);
  txt(c, s, x0 + w / 2, y + fo.s * 0.36, { ...fo, c: o.fg, a: 'center' });
  return w;
}
function bgOrange(c, lt) {
  paint(c, PAL.orange);
  c.save(); c.globalAlpha = 0.5;
  for (let i = 0; i < 9; i++) hoop(c, W / 2, H * 1.08, 300 + i * 190 + (lt * 40) % 190, alpha(PAL.deep, 0.35 - i * 0.03), 2);
  c.restore();
}
function bgInk(c, lt, a = 1) {
  paint(c, PAL.ink);
  dotField(c, PAL.ink4, 0.55 * a, 54, 0, -lt * 18, 2);
}
function bgPaper(c, lt, oy = 0) {
  paint(c, PAL.paper);
  dotField(c, PAL.sand2, 0.9, 54, 0, oy - lt * 14, 2.2);
}

/* ======================================================================
   01 — HOOK + LOGO   (0.0 – 5.5 s)
   ====================================================================== */
const IN = { words: [0, 0.5, 1.0], glitch: 1.5, calm: 1.54, help: 2.0, out: 2.24, fall: 2.04, land1: 2.5, land2: 3.0, book: 3.14, check: 3.5, up: 3.72, word: 3.95, tag: 4.25, by: 4.62, zoom: 5.05 };
const CLOCK = [0, 0.5, 1.0, 1.125, 1.25, 1.3125, 1.375, 1.4375];
const ICON0 = { x: 540, y: 860, s: 520 }, ICON1 = { x: 540, y: 630, s: 400 };

function hookLayout(c) {
  const o = { f: FONT.d, w: 800, ls: EN ? -8 : 0 };
  const words = T.hook;
  const sizes = words.map((w, i) => fitType(c, [w], o, 900, EN ? 290 : (i === 1 ? 300 : 250)));
  const adv = sizes.map(s => s * (EN ? 0.84 : 1.08));
  const ys = [];
  let y = 0;
  for (let i = 0; i < words.length; i++) { y += adv[i]; ys.push(y); y += EN ? 26 : 10; }
  return { o, words, sizes, ys, adv };
}

function drawHook(c, lt) {
  const t = lt;
  bgInk(c, t, tw(t, 2.6, 3.4));
  // ---------- background clock (the pressure) ----------
  const clockA = tw(t, 0, 0.35, Ez.cubicOut) * (1 - tw(t, 1.5, 1.56, Ez.linear));
  if (clockA > 0) {
    const cx = 540, cy = 900, R = 440;
    let k = 0, e = 0;
    for (let i = 0; i < CLOCK.length; i++) if (t >= CLOCK[i]) { k = i; e = Ez.backOutHard(clamp((t - CLOCK[i]) / 0.09)); }
    const ang = -Math.PI / 2 + (k + e) * (TAU / 12);
    const stress = tw(t, 1.0, 1.45, Ez.quadIn);
    c.save();
    c.globalAlpha *= clockA;
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU - Math.PI / 2, big = i % 5 === 0;
      const r0 = R - (big ? 40 : 20);
      c.strokeStyle = big ? PAL.ink4 : PAL.ink3; c.lineWidth = big ? 6 : 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.stroke();
    }
    arcLine(c, cx, cy, R + 26, -Math.PI / 2, ang, alpha(PAL.orange, 0.85), 8);
    c.strokeStyle = PAL.orange; c.lineWidth = 8; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx - Math.cos(ang) * 50, cy - Math.sin(ang) * 50); c.lineTo(cx + Math.cos(ang) * (R - 70), cy + Math.sin(ang) * (R - 70)); c.stroke();
    disc(c, cx, cy, 16, PAL.orange);
    if (stress > 0) bloom(c, cx, cy, 900, PAL.orange, 0.12 * stress * (0.6 + 0.4 * Math.sin(t * 50)));
    c.restore();
  }

  // ---------- hook words: three slams, on the beat ----------
  if (t < IN.glitch + 0.14) {
    const L = hookLayout(c);
    const FLY = 0.14;
    const landed = IN.words.filter(w => t >= w - FLY).length;
    const centerOf = n => (n <= 0 ? 0 : L.ys[n - 1] / 2 + (L.ys[0] - L.adv[0]) / 2);
    let cy = 0;
    for (let n = 1; n <= 3; n++) cy = lerp(cy, centerOf(n), tw(t, IN.words[n - 1] - FLY, IN.words[n - 1] + 0.2, Ez.cubicOut));
    const y0 = 900 - cy;
    const glitching = t >= IN.glitch;
    const stress = tw(t, 1.0, 1.4, Ez.quadIn);
    const R = seeded(Math.floor(t * 30) * 13 + 5);
    for (let i = 0; i < landed; i++) {
      const u = t - IN.words[i];
      const s = L.sizes[i];
      const sc = u < 0 ? lerp(2.6, 1, Ez.quadIn(span(u, -FLY, 0))) : 1 - 0.05 * jiggle(u, 5, 10);
      const yb = y0 + L.ys[i];
      const jx = vnoise(t * 38 + i * 9) * 9 * stress, jy = vnoise(t * 41 + i * 5 + 50) * 6 * stress;
      c.save();
      c.globalAlpha *= clamp((u + FLY) / 0.05);
      c.translate(540 + jx, yb - s * 0.35 + jy);
      c.scale(sc, sc);
      if (glitching) { c.translate((R() - 0.5) * 140, 0); c.globalAlpha *= R() < 0.5 ? 1 : 0.3; }
      txt(c, L.words[i], 0, s * 0.35, { ...L.o, s, c: i === 2 ? PAL.orange : PAL.paper, a: 'center' });
      c.restore();
    }
  }

  // ---------- "Don't panic." / "Help is here." ----------
  {
    const o = { f: FONT.d, w: 800, ls: EN ? -3 : 0 };
    const s = fitType(c, [T.calm, T.help], o, 900, EN ? 128 : 140);
    const pout = tw(t, IN.out, IN.out + 0.24, Ez.cubicIn);
    const y1 = 860, y2 = 860 + s * (EN ? 1.15 : 1.3);
    if (t > IN.calm && pout < 1) {
      kLine(c, T.calm, 540, y1, { ...o, s, c: PAL.paper, a: 'center' }, t, IN.calm, 0.07, 0.4, Ez.glide, pout);
      kLine(c, T.help, 540, y2, { ...o, s, c: PAL.orange, a: 'center' }, t, IN.help, 0.07, 0.4, Ez.glide, pout);
    }
  }

  // ---------- the dot falls, lands, bounces — and becomes the logo ----------
  const icon = {
    x: lerp(ICON0.x, ICON1.x, tw(t, IN.up, IN.up + 0.45, Ez.cubicInOut)),
    y: lerp(ICON0.y, ICON1.y, tw(t, IN.up, IN.up + 0.45, Ez.cubicInOut)),
    s: lerp(ICON0.s, ICON1.s, tw(t, IN.up, IN.up + 0.45, Ez.cubicInOut))
  };
  // zoom-through camera into the bookmark (5.05 → 5.5)
  const zp = span(t, IN.zoom, 5.5);
  if (zp > 0) {
    const P = { x: icon.x, y: icon.y + (34 - 50) * icon.s / 100 };
    const z = Math.exp(Math.log(70) * Ez.cubicIn(zp));
    c.translate(lerp(0, 540 - P.x, Ez.cubicIn(zp)), lerp(0, 960 - P.y, Ez.cubicIn(zp)));
    scaleAt(c, P.x, P.y, z);
  }
  if (t >= IN.land2 - 0.02) {
    const sq = Ez.backOutHard(span(t, IN.land2, IN.land2 + 0.42));
    const glowA = tw(t, IN.land2, IN.land2 + 0.6) * (0.5 + 0.08 * Math.sin(t * 3));
    bloom(c, icon.x, icon.y, icon.s * 1.35, PAL.orange, 0.42 * glowA * (1 - zp));
    // floating motes
    const ma = tw(t, IN.land2, IN.land2 + 0.8);
    for (let i = 0; i < 46; i++) {
      const sp = 30 + h1(i * 3.1) * 70, px = h1(i * 7.7) * W, py = ((h1(i * 1.3) * H - (t - 3) * sp) % H + H) % H;
      const r = 1.5 + h1(i * 5.5) * 4.5;
      disc(c, px + Math.sin(t * 0.8 + i) * 12, py, r, alpha(i % 3 ? PAL.peach : PAL.orange, (0.18 + h1(i) * 0.4) * ma));
    }
    c.save();
    rotateAt(c, icon.x, icon.y, -0.22 * (1 - Ez.backOut(span(t, IN.land2, IN.land2 + 0.5))));
    fazIcon(c, icon.x, icon.y, icon.s, {
      sq, dot: 0,
      book: Ez.cubicOut(span(t, IN.book, IN.book + 0.34)),
      check: Ez.cubicOut(span(t, IN.check, IN.check + 0.2)),
      glint: span(t, 3.62, 4.05)
    });
    c.restore();
    spikes(c, icon.x, icon.y + icon.s * 0.02, t - (IN.check + 0.18), icon.s * 0.62, icon.s * 0.86, PAL.peach, 10, 7, 0.45, 0.3);
    shock(c, icon.x, icon.y, t - IN.land2, icon.s * 0.3, icon.s * 1.1, PAL.orange, 10, 0.7);
  }
  // the peach dot
  if (t >= IN.fall) {
    let x = 540, y, r = 44, sx = 1, sy = 1, ringA = 0;
    if (t < IN.land1) {
      const u = span(t, IN.fall, IN.land1);
      y = lerp(-140, ICON0.y, Ez.quadIn(u));
      sy = 1 + 0.55 * u * u; sx = 1 / sy;
    } else if (t < IN.land2) {
      const u = span(t, IN.land1, IN.land2);
      y = ICON0.y - 190 * 4 * u * (1 - u);
      const sqz = jiggle(t - IN.land1, 3.2, 9);
      sx = 1 + 0.5 * sqz; sy = 1 - 0.45 * sqz;
      const v = Math.abs(1 - 2 * u); if (u > 0.15) { sy *= 1 + 0.25 * v * v; sx /= 1 + 0.25 * v * v; }
    } else {
      const e = Ez.backOut(span(t, IN.land2, IN.land2 + 0.46));
      const tx = icon.x + (FZG.dot.x - 50) * icon.s / 100, ty = icon.y + (FZG.dot.y - 50) * icon.s / 100;
      // follow the icon's entry rotation so the dot sits exactly on the corner
      const rot = -0.22 * (1 - Ez.backOut(span(t, IN.land2, IN.land2 + 0.5)));
      const dx = tx - icon.x, dy = ty - icon.y;
      const rx = icon.x + dx * Math.cos(rot) - dy * Math.sin(rot), ry = icon.y + dx * Math.sin(rot) + dy * Math.cos(rot);
      x = lerp(ICON0.x, rx, e); y = lerp(ICON0.y, ry, e) - Math.sin(clamp(e) * Math.PI) * 120;
      r = lerp(44, FZG.dot.r * icon.s / 100, e);
      const sqz = jiggle(t - IN.land2, 3, 8); sx = 1 + 0.35 * sqz; sy = 1 - 0.3 * sqz;
      ringA = tw(t, IN.land2 + 0.1, IN.land2 + 0.3);
    }
    c.save();
    c.translate(x, y + r * (1 - sy)); c.scale(sx, sy);
    const rg = FZG.dot.ring * icon.s / 100;
    if (ringA > 0) disc(c, 0, 0, r + rg / 2, alpha(PAL.ink, ringA));
    disc(c, 0, 0, r - rg / 2 * ringA, PAL.peach);
    c.restore();
    shock(c, x, ICON0.y + 44, t - IN.land1, 40, 260, PAL.peach, 6, 0.5);
  }

  // ---------- wordmark, tagline, lockup ----------
  if (t >= IN.word) {
    const o = { f: FONT.d, w: 800, ls: EN ? -3 : 0 };
    const s = fitType(c, [T.name], o, 900, EN ? 124 : 150);
    kLine(c, T.name, 540, 990, { ...o, s, c: PAL.paper, a: 'center' }, t, IN.word, 0.08, 0.55, Ez.kinetic);
    const to = { f: FONT.d, w: 600, ls: EN ? -1 : 0 };
    const ts = fitType(c, T.tagline, to, 860, EN ? 66 : 72);
    const ty = EN ? 1112 : 1130;
    kLine(c, T.tagline[0], 540, ty, { ...to, s: ts, c: PAL.paper, a: 'center' }, t, IN.tag, 0.05, 0.5, Ez.kinetic);
    kLine(c, T.tagline[1], 540, ty + ts * (EN ? 1.15 : 1.3), { ...to, s: ts, c: PAL.orange, a: 'center' }, t, IN.tag + 0.12, 0.05, 0.5, Ez.kinetic);
    const lp = tw(t, IN.by, IN.by + 0.4, Ez.cubicOut);
    c.save(); c.translate(0, (1 - lp) * 30);
    jfSign(c, 540, 1352, 56, PAL.paper, lp, T.by);
    c.restore();
  }
  // land the zoom on clean paper — the next shot starts on the same paper
  if (zp > 0.75) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = tw(zp, 0.75, 0.9, Ez.quadIn); paint(c, PAL.paper); c.restore(); }
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
const pathScroll = lt => -260 + 200 * 5.5 * Ez.cubicInOut(span(lt, 0.25, 2.25));
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
  const s = lerp(0.3, 1, settle(u, 2.4, 7));
  const d = tw(lt, doneT, doneT + 0.16, Ez.cubicOut);
  const press = lt > doneT - 0.1 && lt < doneT + 0.12 ? Math.sin(span(lt, doneT - 0.1, doneT + 0.12) * Math.PI) : 0;
  const active = lt > doneT - 0.35 && lt < doneT;
  c.save();
  c.globalAlpha *= clamp(u / 0.1);
  scaleAt(c, x, y, s);
  if (active) { const k = span(lt, doneT - 0.35, doneT); hoop(c, x, y + 6, r + 18 + 6 * Math.sin(k * 8), alpha(PAL.orange, 0.35), 6); }
  const dep = 13, py = press * 9;
  disc(c, x, y + dep, r, d >= 1 ? PAL.deep : PAL.sand2);
  disc(c, x, y + py, r, PAL.sand);
  if (d > 0) {
    c.save(); circlePath(c, x, y + dep, r * d * 1.02); c.clip();
    disc(c, x, y + dep, r, PAL.deep);
    disc(c, x, y + py, r, PAL.orange);
    c.restore();
  }
  if (d < 0.5) glyph(c, iconName, x, y + py, r * 0.95, PAL.mute, 7);
  else {
    const k = settle(lt - doneT - 0.05, 2.6, 7);
    c.save(); scaleAt(c, x, y + py, Math.max(0.001, k));
    glyph(c, 'check', x, y + py, r * 1.05, PAL.paper, 10);
    c.restore();
  }
  // gloss
  c.save(); circlePath(c, x, y + py, r); c.clip();
  disc(c, x - r * 0.35, y + py - r * 0.45, r * 0.45, alpha(PAL.white, 0.16));
  c.restore();
  c.restore();
  shock(c, x, y, lt - doneT, r, r + 80, PAL.orange, 7, 0.5);
}
function drawPath(c, lt) {
  const sc = pathScroll(lt);
  bgPaper(c, lt, sc * 0.4);
  c.save();
  push(c, lt, 3, 0.02);
  // ---------- the path ----------
  const segs = pathPoints();
  const pa = tw(lt, 0.05, 0.6, Ez.cubicOut);
  for (let i = 0; i < segs.length; i++) dashedPart(c, segs[i], pa, PAL.sand2, 18, sc);
  for (let i = 0; i < segs.length; i++) {
    const t0 = PA.done[i] + 0.04, t1 = i < 5 ? PA.done[i] + 0.24 : PA.boss;
    dashedPart(c, segs[i], tw(lt, t0, t1, Ez.cubicInOut), PAL.orange, 18, sc);
  }
  for (let i = 0; i < PNODES.length; i++) {
    const x = MX(540 + PNODES[i].x), y = pnY(i) + sc;
    if (y < 520 || y > 2100) continue;
    lessonNode(c, x, y, 70, lt, 0.08 + i * 0.07, PA.done[i], PNODES[i].icon);
    xpTag(c, x + DIR * 160, y - 44, lt - PA.done[i] - 0.05, '+10 XP', PAL.ink, PAL.paper, 32);
  }
  // ---------- boss node ----------
  {
    const x = MX(540 + PBOSS.x), y = PBOSS_Y + sc, r = 104;
    const u = lt - 0.5;
    if (u > 0 && y < 2100) {
      const un = tw(lt, PA.boss, PA.boss + 0.2, Ez.cubicOut);
      const rays = tw(lt, PA.boss, PA.boss + 0.5);
      if (rays > 0) {
        c.save(); c.translate(x, y); c.rotate(lt * 0.6);
        c.fillStyle = alpha(PAL.peach, 0.55 * rays);
        for (let k = 0; k < 14; k++) { c.rotate(TAU / 14); c.beginPath(); c.moveTo(0, 0); c.lineTo(-26, -r * 2.5 * rays); c.lineTo(26, -r * 2.5 * rays); c.closePath(); c.fill(); }
        c.restore();
        bloom(c, x, y, 360, PAL.orange, 0.35 * rays);
      }
      c.save();
      const shakeX = lt > PA.boss - 0.25 && lt < PA.boss ? Math.sin(lt * 90) * 6 : 0;
      c.translate(shakeX, 0);
      scaleAt(c, x, y, lerp(0.5, 1, settle(u, 2, 7)) * (1 + 0.12 * jiggle(lt - PA.boss, 3, 6)));
      disc(c, x, y + 16, r, un > 0.5 ? PAL.deep : PAL.sand2);
      disc(c, x, y, r, PAL.sand);
      if (un > 0) { c.save(); circlePath(c, x, y, r * un * 1.02); c.clip(); disc(c, x, y + 16, r, PAL.deep); disc(c, x, y, r, PAL.orange); c.restore(); }
      hoop(c, x, y, r - 12, alpha(un > 0.5 ? PAL.paper : PAL.sand2, 0.6), 4);
      if (un < 0.5) glyph(c, 'lock', x, y, r * 0.95, PAL.mute, 8);
      else { c.save(); scaleAt(c, x, y, Math.max(0.001, settle(lt - PA.boss - 0.05, 2.4, 6))); glyph(c, 'crown', x, y - 4, r * 1.05, PAL.paper, 6); c.restore(); }
      c.restore();
      shock(c, x, y, lt - PA.boss, r, r + 160, PAL.orange, 9, 0.6);
      burst(c, x, y, lt - PA.boss, { n: 36, seed: 31, speed: 1400, size: 18, life: 1.2 });
      // label
      const lu = lt - PA.label;
      if (lu > 0) {
        const s = lerp(0.4, 1, settle(lu, 2.3, 6.5));
        const ly = y - r - 118;
        c.save(); c.globalAlpha *= clamp(lu / 0.1); scaleAt(c, x, ly + 60, s);
        const o1 = { f: FONT.d, w: 800, s: 42, ls: EN ? -1 : 0 }, o2 = { f: FONT.d, w: 600, s: 26 };
        const w = Math.max(wOf(c, T.boss, o1), wOf(c, T.bossSub, o2)) + 84;
        slab(c, x - w / 2, ly - 10, w, 132, 34, PAL.ink);
        polyPath(c, [[x - 18, ly + 120], [x + 18, ly + 120], [x, ly + 140]]); c.fillStyle = PAL.ink; c.fill();
        txt(c, T.boss, x, ly + 52, { ...o1, c: PAL.paper, a: 'center' });
        txt(c, T.bossSub, x, ly + 98, { ...o2, c: PAL.peach, a: 'center' });
        c.restore();
      }
    }
  }
  c.restore();
  // fade the path under the headline + at the bottom
  let g = c.createLinearGradient(0, 650, 0, 860);
  g.addColorStop(0, alpha(PAL.paper, 1)); g.addColorStop(1, alpha(PAL.paper, 0));
  c.fillStyle = g; c.fillRect(0, 0, W, 860);
  g = c.createLinearGradient(0, 1640, 0, 1900);
  g.addColorStop(0, alpha(PAL.paper, 0)); g.addColorStop(1, alpha(PAL.paper, 0.95));
  c.fillStyle = g; c.fillRect(0, 1640, W, 300);
  // ---------- copy ----------
  chapterTag(c, 1, T.ch[0], lt - 0.02, PAL.ink);
  const s = headline(c, T.pathH, [PAL.ink, PAL.orange], lt, 430, 0.04, 0.1, 128);
  kLine(c, T.pathSub, X0, 430 + s * LH + 92, { f: FONT.d, w: 500, s: 38, c: PAL.gray, a: AL }, lt, 0.32, 0.03, 0.5, Ez.kinetic);
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
  const wl = mathW(c, lhs, s), wn = mathW(c, num, s), wr = mathW(c, rad, s), wd = mathW(c, den, s);
  const radW = s * 0.62;
  const numW = wn + radW + wr;
  const fracW = Math.max(numW, wd) + s * 0.3;
  const total = wl + s * 0.15 + fracW;
  let x = cx - total / 2;
  mathDraw(c, lhs, x, cy + s * 0.32, s, col);
  x += wl + s * 0.15;
  const ny = cy - s * 0.42, dy = cy + s * 1.02;
  // fraction bar
  c.fillStyle = col; c.fillRect(x, cy - s * 0.04, fracW, Math.max(2, s * 0.05));
  let nx = x + (fracW - numW) / 2;
  mathDraw(c, num, nx, ny, s, col);
  nx += wn;
  // radical
  c.strokeStyle = col; c.lineWidth = s * 0.05; c.lineJoin = 'miter'; c.lineCap = 'butt';
  c.beginPath();
  c.moveTo(nx + s * 0.04, ny - s * 0.28); c.lineTo(nx + s * 0.16, ny - s * 0.36); c.lineTo(nx + s * 0.3, ny + s * 0.12);
  c.lineTo(nx + s * 0.52, ny - s * 0.86); c.lineTo(nx + radW + wr + s * 0.04, ny - s * 0.86);
  c.stroke();
  mathDraw(c, rad, nx + radW, ny, s, col);
  mathDraw(c, den, x + (fracW - wd) / 2, dy, s, col);
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
  const s = fitType(c, T.lessonH, ho, 900, EN ? 112 : 90);
  const acts = [0.05, LE.l2, LE.l3];
  T.lessonH.forEach((ln, i) => {
    const dim = i < 2 ? tw(lt, acts[i + 1], acts[i + 1] + 0.3) : 0;
    kLine(c, ln, X0, (EN ? 420 : 398) + i * s * (EN ? 1.0 : 1.27), { ...ho, s, c: blend(PAL.paper, PAL.deep, dim), a: AL }, lt, acts[i], 0.06, 0.5, Ez.kinetic);
  });
  chapterTag(c, 2, T.ch[1], lt, PAL.ink, PAL.paper);

  // ---------- the lesson card ----------
  const cin = tw(lt, 0.0, 0.55, Ez.glide);
  c.save();
  c.translate(0, (1 - cin) * 900);
  rotateAt(c, 540, 1100, (1 - cin) * 0.12 * DIR);
  castShadow(c, 'rgba(60,20,0,0.35)', 70, 34);
  slab(c, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r, PAL.paper);
  clearShadow(c);
  rrect(c, CARD.x, CARD.y, CARD.w, CARD.h, CARD.r); c.save(); c.clip();
  // header: close, progress, hearts
  glyph(c, 'x', IX(166), 792, 44, PAL.mute, 9);
  const prog1 = 0.18 + 0.27 * tw(lt, LE.swap, LE.swap + 0.4, Ez.cubicOut) + 0.3 * tw(lt, LE.correct, LE.correct + 0.5, Ez.backOut);
  const bx = EN ? 212 : 868, bw = 590;
  slab(c, EN ? bx : bx - bw, 781, bw, 24, 12, PAL.sand);
  const fw = bw * prog1;
  slab(c, EN ? bx : bx - fw, 781, fw, 24, 12, PAL.orange);
  slab(c, EN ? bx + 12 : bx - fw + 12, 786, Math.max(0, fw - 24), 6, 3, alpha(PAL.white, 0.35));
  glyph(c, 'heart', IX(848), 792, 46, PAL.orange);
  txt(c, '5', IX(886), 806, { f: FONT.d, w: 800, s: 38, c: PAL.orange, a: AL, rtl: false });

  const sw = tw(lt, LE.swap, LE.swap + 0.28, Ez.whip);
  // page A — explanation
  if (sw < 1) {
    c.save(); c.translate(-DIR * sw * W, 0);
    pill(c, T.lessonTag, IX(146), 878, { s: 24, bg: PAL.peach2, fg: PAL.orange, a: AL, w: 700, ls: EN ? 3 : 0 });
    txt(c, T.lessonTitle, IX(146), 990, { f: FONT.d, w: 800, s: 54, c: PAL.ink, a: AL, ls: EN ? -1 : 0 });
    slab(c, 146, 1032, 788, 236, 30, PAL.sand);
    const fp = tw(lt, 0.12, 0.5, Ez.cubicOut);
    c.save(); c.beginPath(); c.rect(146, 1032, 788 * fp, 236); c.clip();
    quadFormula(c, 540, 1140, 62, PAL.ink);
    c.restore();
    if (fp > 0 && fp < 1) slab(c, 146 + 788 * fp - 4, 1060, 6, 180, 3, PAL.orange);
    const pr = lt > LE.contTap && lt < LE.contTap + 0.14 ? Math.sin(span(lt, LE.contTap, LE.contTap + 0.14) * Math.PI) : 0;
    pressable(c, 146, 1350, 788, 96, 30, PAL.orange, PAL.deep, 10, pr);
    txt(c, T.cont, 540, 1350 + 10 * pr + 62, { f: FONT.d, w: 800, s: 38, c: PAL.paper, a: 'center', ls: EN ? 1 : 0 });
    c.restore();
  }
  // page B — question
  if (sw > 0) {
    c.save(); c.translate(DIR * (1 - sw) * W, 0);
    pill(c, T.qTag, IX(146), 878, { s: 24, bg: PAL.peach2, fg: PAL.orange, a: AL, w: 700, ls: EN ? 3 : 0 });
    txt(c, T.qText, IX(146), 980, { f: FONT.d, w: 700, s: 44, c: PAL.ink, a: AL });
    mathDraw(c, [{ i: 'x' }, { sup: '2' }, { op: '−' }, '5', { i: 'x' }, { op: '+' }, '6', { op: '=' }, '0'], 540, 1068, 70, PAL.ink, 'center');
    const sel = lt >= LE.optTap + 0.04, ok = lt >= LE.correct;
    for (let i = 0; i < 4; i++) {
      const R = optRect(i), u = lt - (LE.swap + 0.16 + i * 0.05);
      if (u <= 0) continue;
      const isSel = i === QRIGHT && sel;
      const press = i === QRIGHT && lt > LE.optTap && lt < LE.optTap + 0.14 ? Math.sin(span(lt, LE.optTap, LE.optTap + 0.14) * Math.PI) : 0;
      c.save(); c.globalAlpha *= clamp(u / 0.1);
      scaleAt(c, R.x + R.w / 2, R.y + R.h / 2, lerp(0.6, 1, settle(u, 2.4, 7)) * (isSel && ok ? 1 + 0.06 * jiggle(lt - LE.correct, 3, 6) : 1));
      const top = isSel ? (ok ? PAL.orange : PAL.peach2) : PAL.white, lip = isSel ? (ok ? PAL.deep : '#FFB27F') : PAL.sand2;
      pressable(c, R.x, R.y, R.w, R.h, 26, top, lip, 9, press);
      slabLine(c, R.x + 1.5, R.y + 1.5 + 9 * press, R.w - 3, R.h - 3, 25, isSel ? (ok ? PAL.orange : PAL.orange) : PAL.line, 3);
      mathDraw(c, QOPTS[i], R.x + R.w / 2, R.y + 64 + 9 * press, 46, isSel ? (ok ? PAL.paper : PAL.orange) : PAL.ink, 'center');
      c.restore();
    }
    // check button
    const cr = lt > LE.checkTap && lt < LE.checkTap + 0.14 ? Math.sin(span(lt, LE.checkTap, LE.checkTap + 0.14) * Math.PI) : 0;
    const on = tw(lt, LE.optTap + 0.04, LE.optTap + 0.2);
    pressable(c, 146, 1362, 788, 96, 30, blend(PAL.sand, PAL.orange, on), blend(PAL.sand2, PAL.deep, on), 10, cr);
    txt(c, T.check, 540, 1362 + 10 * cr + 62, { f: FONT.d, w: 800, s: 38, c: blend(PAL.mute, PAL.paper, on), a: 'center', ls: EN ? 1 : 0 });
    c.restore();
  }
  // feedback sheet
  const fb = tw(lt, LE.correct, LE.correct + 0.35, Ez.glide);
  if (fb > 0) {
    const sy = lerp(CARD.y + CARD.h, 1300, fb);
    slab(c, CARD.x, sy, CARD.w, 260, [44, 44, 0, 0], PAL.peach2);
    const k = settle(lt - LE.correct - 0.1, 2.4, 6);
    c.save(); scaleAt(c, IX(196), sy + 92, Math.max(0.001, k));
    disc(c, IX(196), sy + 92, 46, PAL.orange); glyph(c, 'check', IX(196), sy + 92, 60, PAL.paper, 12);
    c.restore();
    txt(c, T.correct, IX(268), sy + 110, { f: FONT.d, w: 800, s: 52, c: PAL.orange, a: AL, ls: EN ? -1 : 0 });
    const xk = settle(lt - LE.correct - 0.2, 2.2, 6);
    c.save(); scaleAt(c, IX(850), sy + 92, Math.max(0.001, xk));
    pill(c, '+10 XP', IX(850) + (EN ? 0 : 0), sy + 92, { s: 30, bg: PAL.orange, fg: PAL.paper, a: 'center', w: 800 });
    c.restore();
  }
  c.restore(); // clip
  c.restore();
  // taps
  tapMark(c, IX(700), 1398, lt - LE.contTap);
  const R = optRect(QRIGHT);
  tapMark(c, R.x + R.w * 0.62, R.y + 58, lt - LE.optTap);
  tapMark(c, IX(620), 1410, lt - LE.checkTap);
  burst(c, 540, 1330, lt - LE.correct - 0.05, { n: 46, seed: 12, speed: 1700, size: 18, dir: -Math.PI / 2, spread: 1.6, life: 1.4, cols: [PAL.orange, PAL.peach, PAL.ink, PAL.amber] });
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
  bloom(c, 540, 1100, 900, PAL.orange, 0.1);
  chapterTag(c, 3, T.ch[2], lt, PAL.paper);
  headline(c, T.gameH, [PAL.paper, PAL.orange], lt, 432, 0.04, 0.1, 128);

  // XP + level
  {
    const { x, y } = tileXY(0, 0), w = TILE.w, h = TILE.h, cx = x + w / 2;
    c.save();
    if (tileIn(c, x, y, w, h, lt, 0.12)) {
      slab(c, x, y, w, h, 44, PAL.orange);
      const v = 500 * Ez.cubicOut(span(lt, GA.xp0, GA.xp1));
      const lvUp = lt >= GA.lvl;
      const frac = lvUp ? 0.1 * Ez.cubicOut(span(lt, GA.lvl + 0.15, GA.lvl + 0.9)) : v / 500;
      const rcy = y + 172;
      hoop(c, cx, rcy, 112, alpha(PAL.ink, 0.16), 24);
      arcLine(c, cx, rcy, 112, -Math.PI / 2, -Math.PI / 2 + TAU * frac * DIR, PAL.ink, 24);
      const fl = decay(lt - GA.lvl, 5);
      if (fl > 0.01) hoop(c, cx, rcy, 112, alpha(PAL.paper, fl), 24);
      txt(c, T.level, cx, rcy - 34, { f: FONT.d, w: 700, s: 26, c: alpha(PAL.ink, 0.65), a: 'center', ls: EN ? 2 : 0 });
      const flip = span(lt, GA.lvl - 0.08, GA.lvl + 0.12);
      const sy = Math.abs(Math.cos(flip * Math.PI));
      c.save(); c.translate(cx, rcy + 52); c.scale(1, Math.max(0.02, sy));
      txt(c, flip < 0.5 ? '1' : '2', 0, 0, { f: FONT.d, w: 800, s: 100, c: PAL.ink, a: 'center', rtl: false });
      c.restore();
      txt(c, Math.round(v) + ' XP', cx, y + 352, { f: FONT.d, w: 800, s: 62, c: PAL.ink, a: 'center', rtl: false, ls: -1 });
    }
    c.restore();
    // LEVEL UP badge
    const u = lt - GA.lvl;
    if (u > 0) {
      const s = lerp(0.2, 1, settle(u, 2.4, 6));
      c.save(); c.globalAlpha *= clamp(u / 0.08) * (1 - tw(lt, 2.6, 2.85));
      scaleAt(c, cx, y + 6, s); rotateAt(c, cx, y + 6, -0.08 * DIR);
      pill(c, T.levelUp, cx, y + 6, { s: 36, bg: PAL.ink, fg: PAL.paper, a: 'center', w: 800, ls: EN ? 1 : 0 });
      c.restore();
      spikes(c, cx, y + 6, u, 150, 230, PAL.peach, 12, 7, 0.5);
      burst(c, cx, y + 40, u, { n: 40, seed: 3, speed: 1500, size: 17, life: 1.3, cols: [PAL.paper, PAL.peach, PAL.orange, PAL.amber] });
    }
  }
  // streak
  {
    const { x, y } = tileXY(1, 0), w = TILE.w, h = TILE.h, cx = x + w / 2;
    c.save();
    if (tileIn(c, x, y, w, h, lt, 0.19)) {
      slab(c, x, y, w, h, 44, PAL.ink2); slabLine(c, x + 1, y + 1, w - 2, h - 2, 43, PAL.ink3, 2);
      const vv = lerp(1, 30, Ez.cubicInOut(span(lt, GA.st0, GA.st1)));
      const n = Math.round(vv), bump = 1 + 0.07 * (1 - (vv % 1));
      bloom(c, cx, y + 160, 220, PAL.orange, 0.32);
      c.save(); scaleAt(c, cx, y + 210, bump * (1 + 0.1 * jiggle(lt - GA.st1, 3, 5)));
      const g = c.createLinearGradient(0, y + 60, 0, y + 250);
      g.addColorStop(0, PAL.amber); g.addColorStop(1, PAL.orange);
      c.fillStyle = g; flameShape(c, cx, y + 160, 78, lt); c.fill();
      c.fillStyle = PAL.peach; flameShape(c, cx, y + 196, 36, lt + 3); c.fill();
      c.restore();
      txt(c, String(n), cx, y + 322, { f: FONT.d, w: 800, s: 92, c: PAL.paper, a: 'center', rtl: false, ls: -2 });
      txt(c, T.streak, cx, y + 372, { f: FONT.d, w: 600, s: 30, c: PAL.mute, a: 'center' });
      shock(c, cx, y + 160, lt - GA.st1, 60, 200, PAL.orange, 8, 0.55);
    }
    c.restore();
  }
  // hearts
  {
    const { x, y } = tileXY(0, 1), w = TILE.w, h = TILE.h, cx = x + w / 2;
    c.save();
    if (tileIn(c, x, y, w, h, lt, 0.26)) {
      slab(c, x, y, w, h, 44, PAL.ink2); slabLine(c, x + 1, y + 1, w - 2, h - 2, 43, PAL.ink3, 2);
      let cnt = 5;
      for (let i = 0; i < 5; i++) {
        const hx = cx + DIR * (i - 2) * 78, hy = y + 150;
        const u = lt - (0.45 + i * 0.07);
        if (u <= 0) continue;
        c.save(); scaleAt(c, hx, hy, Math.max(0.001, lerp(0.2, 1, settle(u, 2.6, 7))));
        if (i === 4) {
          const lose = tw(lt, GA.heartLose, GA.heartLose + 0.15), fill = tw(lt, GA.heartFill - 0.6, GA.heartFill, Ez.cubicInOut);
          if (lose > 0) {
            cnt = fill >= 1 ? 5 : 4;
            c.translate(Math.sin(lt * 70) * 5 * (1 - span(lt, GA.heartLose, GA.heartLose + 0.3)) * (lt < GA.heartLose + 0.3 ? 1 : 0), 0);
            heartShape(c, hx, hy, 32); c.fillStyle = PAL.ink4; c.fill();
            c.save(); c.beginPath(); c.rect(hx - 40, hy + 30 - 70 * fill, 80, 80); c.clip();
            heartShape(c, hx, hy, 32); c.fillStyle = PAL.orange; c.fill(); c.restore();
            if (fill > 0 && fill < 1) { c.save(); heartShape(c, hx, hy, 32); c.strokeStyle = alpha(PAL.orange, 0.8); c.lineWidth = 3; c.stroke(); c.restore(); }
          } else { heartShape(c, hx, hy, 32); c.fillStyle = PAL.orange; c.fill(); }
        } else { heartShape(c, hx, hy, 32); c.fillStyle = PAL.orange; c.fill(); }
        c.restore();
        if (i === 4) shock(c, hx, hy, lt - GA.heartFill, 30, 110, PAL.orange, 6, 0.5);
      }
      txt(c, String(cnt), cx, y + 322, { f: FONT.d, w: 800, s: 92, c: PAL.paper, a: 'center', rtl: false });
      txt(c, T.hearts, cx, y + 372, { f: FONT.d, w: 600, s: 30, c: PAL.mute, a: 'center' });
    }
    c.restore();
  }
  // achievements
  {
    const { x, y } = tileXY(1, 1), w = TILE.w, h = TILE.h, cx = x + w / 2;
    c.save();
    if (tileIn(c, x, y, w, h, lt, 0.33)) {
      slab(c, x, y, w, h, 44, PAL.ink2); slabLine(c, x + 1, y + 1, w - 2, h - 2, 43, PAL.ink3, 2);
      const ics = ['book', 'flame', 'crown', 'star'];
      for (let i = 0; i < 4; i++) {
        const bx = cx + DIR * (i - 1.5) * 96, by = y + 150;
        const u = lt - (GA.badges + i * 0.1);
        if (u <= 0) continue;
        const dy = (1 - Ez.bounceOut(clamp(u / 0.42))) * -120;
        c.save(); c.globalAlpha *= clamp(u / 0.06); c.translate(0, dy);
        disc(c, bx, by + 6, 42, PAL.deep);
        disc(c, bx, by, 42, PAL.peach);
        hoop(c, bx, by, 34, alpha(PAL.orange, 0.5), 3);
        glyph(c, ics[i], bx, by, 46, PAL.orange, 8, lt);
        c.restore();
      }
      const gl = span(lt, 1.75, 2.15);
      if (gl > 0 && gl < 1) {
        c.save(); c.beginPath(); c.rect(x, y + 90, w, 130); c.clip();
        const gx = lerp(x - 100, x + w + 100, EN ? gl : 1 - gl);
        const g = c.createLinearGradient(gx - 60, 0, gx + 60, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.globalCompositeOperation = 'overlay'; c.fillStyle = g; c.fillRect(x, y + 90, w, 130); c.restore();
      }
      const ts = fitType(c, [T.ach], { f: FONT.d, w: 800, ls: EN ? -1 : 0 }, w - 60, 50);
      txt(c, T.ach, cx, y + 318, { f: FONT.d, w: 800, s: ts, c: PAL.paper, a: 'center', ls: EN ? -1 : 0 });
      const ss = fitType(c, [T.achSub], { f: FONT.d, w: 600 }, w - 50, 26);
      txt(c, T.achSub, cx, y + 368, { f: FONT.d, w: 600, s: ss, c: PAL.mute, a: 'center' });
    }
    c.restore();
  }
}
