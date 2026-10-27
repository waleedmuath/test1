'use strict';
/* ==========================================================================
   Shots 5–9: exams, games, toolkit, curricula, end card — and the edit.
   ========================================================================== */

/* ======================================================================
   05 — EXAMS   (14.5 – 17.5 s)
   ====================================================================== */
const EX = { sim: 0.1, train: 0.28, rows: [0.95, 1.15, 1.35], stamp: 1.85 };
function drawExam(c, lt) {
  bgPaper(c, lt);
  chapterTag(c, 4, T.ch[3], lt, PAL.ink);
  headline(c, T.examH, [PAL.ink, PAL.orange], lt, 432, 0.04, 0.1, 124);

  // simulator card (ink)
  {
    const e = tw(lt, EX.sim, EX.sim + 0.6, Ez.glide);
    const x = 90, y = 650, w = 900, h = 400;
    c.save(); c.translate(DIR * (1 - e) * 1000, 0); rotateAt(c, 540, y + h / 2, DIR * (1 - e) * 0.1);
    castShadow(c, 'rgba(0,0,0,0.25)', 50, 24); slab(c, x, y, w, h, 44, PAL.ink); clearShadow(c);
    txt(c, T.sim, IX(146), y + 92, { f: FONT.d, w: 800, s: 46, c: PAL.paper, a: AL, ls: EN ? -1 : 0 });
    T.simChips.forEach((s, i) => {
      const u = lt - (EX.sim + 0.35 + i * 0.08);
      if (u <= 0) return;
      c.save(); c.globalAlpha *= clamp(u / 0.1); c.translate(-DIR * (1 - Ez.cubicOut(clamp(u / 0.35))) * 40, 0);
      const cy = y + 172 + i * 72;
      const pw = pill(c, s, IX(146), cy, { s: 27, stroke: PAL.ink4, fg: PAL.paper, a: AL, w: 600, pad: 26 });
      disc(c, IX(146) + DIR * (pw + 22), cy, 7, PAL.orange);
      c.restore();
    });
    // countdown ring
    const rcx = IX(808), rcy = y + 205, R = 108;
    const secs = Math.max(0, 2700 - Math.floor(Math.max(0, lt - 0.3) * 160));
    const frac = secs / 2700;
    hoop(c, rcx, rcy, R, PAL.ink3, 18);
    arcLine(c, rcx, rcy, R, -Math.PI / 2, -Math.PI / 2 + TAU * frac * tw(lt, 0.25, 0.7, Ez.cubicOut) * DIR, PAL.orange, 18);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
    txt(c, `${mm}:${ss}`, rcx, rcy + 16, { f: FONT.mono, w: 600, s: 44, c: PAL.paper, a: 'center', rtl: false });
    txt(c, `Q ${12 + Math.min(8, Math.floor(Math.max(0, lt - 0.3) * 3))} / 40`, rcx, rcy + 56, { f: FONT.mono, w: 500, s: 20, c: PAL.mute, a: 'center', rtl: false, ls: 2 });
    c.restore();
  }
  // training card (sand)
  {
    const e = tw(lt, EX.train, EX.train + 0.6, Ez.glide);
    const x = 90, y = 1080, w = 900, h = 410;
    c.save(); c.translate(-DIR * (1 - e) * 1000, 0); rotateAt(c, 540, y + h / 2, -DIR * (1 - e) * 0.1);
    slab(c, x, y, w, h, 44, PAL.sand);
    txt(c, T.train, IX(146), y + 92, { f: FONT.d, w: 800, s: 46, c: PAL.ink, a: AL, ls: EN ? -1 : 0 });
    const cu = lt - (EX.train + 0.4);
    if (cu > 0) { c.save(); scaleAt(c, IX(934), y + 76, Math.max(0.001, settle(cu, 2.4, 7))); pill(c, T.trainChip, IX(934), y + 76, { s: 25, bg: PAL.orange, fg: PAL.paper, a: EN ? 'right' : 'left', w: 700 }); c.restore(); }
    T.chapters.forEach((s, i) => {
      const ry = y + 158 + i * 76;
      c.fillStyle = PAL.sand2; c.fillRect(146, ry - 46, 788, 2);
      txt(c, s, IX(146), ry + 10, { f: FONT.d, w: 600, s: 32, c: PAL.ink, a: AL });
      const u = lt - EX.rows[i];
      const bx = IX(908);
      hoop(c, bx, ry, 22, PAL.sand2, 4);
      if (u > 0) {
        c.save(); scaleAt(c, bx, ry, Math.max(0.001, lerp(0.2, 1, settle(u, 2.6, 7))));
        disc(c, bx, ry, 24, PAL.orange); glyph(c, 'check', bx, ry, 34, PAL.paper, 13);
        c.restore();
        shock(c, bx, ry, u, 22, 70, PAL.orange, 5, 0.4);
      }
    });
    txt(c, '✓ ' + T.saved, IX(146), y + 384, { f: FONT.d, w: 500, s: 24, c: PAL.gray, a: AL });
    c.restore();
  }
  // the stamp
  const u = lt - EX.stamp;
  if (u > -0.2) {
    const cx = 540, cy = 1060, R = 168;
    const k = u < 0 ? lerp(2.6, 1, Ez.cubicIn(span(u, -0.2, 0))) : 1 + 0.06 * jiggle(u, 3, 7);
    const a = u < 0 ? tw(u, -0.2, -0.12) : 1;
    const rays = tw(u, 0, 0.35);
    c.save(); c.globalAlpha *= a;
    if (rays > 0) {
      c.save(); c.translate(cx, cy); c.rotate(lt * 0.5);
      for (let i = 0; i < 12; i++) {
        c.rotate(TAU / 12);
        const g = c.createLinearGradient(0, 0, 0, -R * 2.6);
        g.addColorStop(0, alpha(PAL.peach, 0.75 * rays)); g.addColorStop(1, alpha(PAL.peach, 0));
        c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(-34, -R * 2.6 * rays); c.lineTo(34, -R * 2.6 * rays); c.closePath(); c.fill();
      }
      c.restore();
    }
    c.translate(cx, cy); c.scale(k, k); c.rotate(lerp(-0.5, -0.1, tw(u, -0.2, 0.05)));
    castShadow(c, 'rgba(120,40,0,0.35)', 50, 20);
    disc(c, 0, 0, R, PAL.orange); clearShadow(c);
    hoop(c, 0, 0, R - 18, alpha(PAL.paper, 0.85), 4);
    c.setLineDash([2, 14]); hoop(c, 0, 0, R - 34, alpha(PAL.paper, 0.6), 4); c.setLineDash([]);
    txt(c, '100%', 0, 30, { f: FONT.d, w: 800, s: 92, c: PAL.paper, a: 'center', rtl: false, ls: -3 });
    c.restore();
    const pu = u - 0.12;
    if (pu > 0) {
      c.save(); scaleAt(c, cx, cy + 232, Math.max(0.001, lerp(0.3, 1, settle(pu, 2.3, 6.5))));
      pill(c, T.perfect, cx, cy + 232, { s: 38, bg: PAL.ink, fg: PAL.paper, a: 'center', w: 800, ls: EN ? -0.5 : 0 });
      c.restore();
    }
    shock(c, cx, cy, u, R, R + 260, PAL.orange, 10, 0.6);
    burst(c, cx, cy, u, { n: 60, seed: 77, speed: 1800, size: 19, life: 1.3, cols: [PAL.orange, PAL.peach, PAL.ink, PAL.amber] });
  }
}

/* ======================================================================
   06 — GAMES   (17.5 – 20.5 s)
   ====================================================================== */
const GM = { flip: 0.68, quiz: [0.85, 1.2, 1.55], mem: [0.6, 0.75, 1.15, 1.3], match: [0.95, 1.5], circle: 0.75, fix: 1.25 };
function gameTile(c, col, row, lt, delay, title, xpAt, fn) {
  const { x, y } = tileXY(col, row), w = TILE.w, h = TILE.h, cx = x + w / 2;
  c.save();
  if (tileIn(c, x, y, w, h, lt, delay)) {
    castShadow(c, 'rgba(80,25,0,0.28)', 40, 18); slab(c, x, y, w, h, 40, PAL.paper); clearShadow(c);
    c.save(); rrect(c, x, y, w, h, 40); c.clip(); fn(x, y, w, h, cx); c.restore();
    const ts = fitType(c, [title], { f: FONT.d, w: 800, ls: EN ? -1 : 0 }, w - 60, 36);
    txt(c, title, cx, y + h - 40, { f: FONT.d, w: 800, s: ts, c: PAL.ink, a: 'center', ls: EN ? -1 : 0 });
    xpTag(c, cx, y + 300, lt - xpAt, '+15 XP', PAL.orange, PAL.paper, 30);
  }
  c.restore();
}
function drawGames(c, lt) {
  bgOrange(c, lt);
  chapterTag(c, 5, T.ch[4], lt, PAL.ink, PAL.paper);
  headline(c, T.gamesH, [PAL.ink, PAL.paper], lt, 432, 0.04, 0.1, 124);

  // smart flashcards
  gameTile(c, 0, 0, lt, 0.12, T.games[0], GM.flip + 0.35, (x, y, w, h, cx) => {
    const cy = y + 160, cw = 330, ch = 206;
    slab(c, cx - cw / 2 + 20, cy - ch / 2 - 14, cw, ch, 26, PAL.sand2);
    c.save(); rotateAt(c, cx, cy, -0.07 * DIR); slab(c, cx - cw / 2, cy - ch / 2, cw, ch, 26, PAL.sand); c.restore();
    const th = Math.PI * Ez.cubicInOut(span(lt, GM.flip, GM.flip + 0.32));
    const sx = Math.abs(Math.cos(th)), lift = Math.sin(th) * 24;
    c.save(); c.translate(cx, cy - lift); c.scale(Math.max(0.02, sx), 1);
    if (th < Math.PI / 2) {
      slab(c, -cw / 2, -ch / 2, cw, ch, 26, PAL.white); slabLine(c, -cw / 2 + 1, -ch / 2 + 1, cw - 2, ch - 2, 25, PAL.line, 2.5);
      const fo = { f: FONT.d, w: 800, ls: EN ? -1 : 0 };
      const fs = fitType(c, T.flashFront, fo, cw - 60, 40);
      txt(c, T.flashFront[0], 0, -8, { ...fo, s: fs, c: PAL.ink, a: 'center' });
      txt(c, T.flashFront[1], 0, -8 + fs * 1.25, { ...fo, s: fs, c: PAL.orange, a: 'center' });
    } else {
      slab(c, -cw / 2, -ch / 2, cw, ch, 26, PAL.orange);
      mathDraw(c, [{ i: 'F' }, { op: '=' }, { i: 'm' }, { i: 'a' }], 0, 26, 78, PAL.paper, 'center');
    }
    c.restore();
  });
  // 60-second quiz
  gameTile(c, 1, 0, lt, 0.19, T.games[1], GM.quiz[2] + 0.1, (x, y, w, h, cx) => {
    const cy = y + 150, R = 92;
    const sec = Math.max(0, 60 - Math.max(0, lt - 0.35) * 6);
    hoop(c, cx, cy, R, PAL.sand, 16);
    arcLine(c, cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * (sec / 60) * tw(lt, 0.25, 0.6, Ez.cubicOut) * DIR, PAL.orange, 16);
    txt(c, String(Math.ceil(sec)), cx, cy + 26, { f: FONT.d, w: 800, s: 76, c: PAL.ink, a: 'center', rtl: false, ls: -2 });
    for (let i = 0; i < 3; i++) {
      const dx = cx + DIR * (i - 1) * 46, dy = y + 278, u = lt - GM.quiz[i];
      disc(c, dx, dy, 13, PAL.sand2);
      if (u > 0) { c.save(); scaleAt(c, dx, dy, Math.max(0.001, settle(u, 2.6, 7))); disc(c, dx, dy, 15, PAL.orange); c.restore(); shock(c, dx, dy, u, 14, 44, PAL.orange, 4, 0.35); }
    }
  });
  // memory match
  gameTile(c, 0, 1, lt, 0.26, T.games[2], GM.match[1] + 0.05, (x, y, w, h, cx) => {
    const cy = y + 162, cw = 150, ch = 100, g = 18;
    const faces = [T.memory[0][0], T.memory[1][1], T.memory[0][1], T.memory[1][0]]; // pairs: 0↔2, 1↔3
    const flipAt = [GM.mem[0], GM.mem[2], GM.mem[1], GM.mem[3]];
    const matchAt = [GM.match[0], GM.match[1], GM.match[0], GM.match[1]];
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2);
      const px = cx + DIR * (col ? 1 : -1) * (cw / 2 + g / 2), py = cy + (row ? 1 : -1) * (ch / 2 + g / 2);
      const th = Math.PI * Ez.cubicInOut(span(lt, flipAt[i], flipAt[i] + 0.2));
      const m = lt >= matchAt[i];
      const mk = m ? 1 + 0.08 * jiggle(lt - matchAt[i], 3, 6) : 1;
      c.save(); c.translate(px, py); c.scale(Math.max(0.02, Math.abs(Math.cos(th))) * mk, mk);
      if (th < Math.PI / 2) {
        slab(c, -cw / 2, -ch / 2, cw, ch, 18, PAL.orange);
        slabLine(c, -cw / 2 + 8, -ch / 2 + 8, cw - 16, ch - 16, 12, alpha(PAL.paper, 0.4), 2.5);
        txt(c, '?', 0, 18, { f: FONT.d, w: 800, s: 46, c: PAL.paper, a: 'center', rtl: false });
      } else {
        slab(c, -cw / 2, -ch / 2, cw, ch, 18, m ? PAL.peach2 : PAL.white);
        slabLine(c, -cw / 2 + 1.5, -ch / 2 + 1.5, cw - 3, ch - 3, 17, m ? PAL.orange : PAL.line, m ? 4 : 2.5);
        const f = faces[i];
        if (f.length <= 1) mathDraw(c, [f], 0, 20, 54, PAL.orange, 'center');
        else txt(c, f, 0, 12, { f: FONT.d, w: 700, s: 30, c: PAL.ink, a: 'center' });
      }
      c.restore();
    }
  });
  // spot the error
  gameTile(c, 1, 1, lt, 0.33, T.games[3], GM.fix + 0.2, (x, y, w, h, cx) => {
    const cy = y + 190, s = 92;
    const base = [{ i: 'E' }, { op: '=' }, { i: 'm' }, { i: 'c' }];
    const bw = mathW(c, base, s), sw = wOf(c, '3', { f: FONT.main, w: 400, s: s * 0.68 });
    const x0 = cx - (bw + sw) / 2;
    mathDraw(c, base, x0, cy, s, PAL.ink);
    const ex = x0 + bw + s * 0.04 + sw / 2, ey = cy - s * 0.42 - s * 0.24;
    const out = tw(lt, GM.fix - 0.05, GM.fix + 0.08, Ez.cubicIn), inn = settle(lt - GM.fix - 0.04, 2.6, 6);
    const shake = lt > GM.circle + 0.2 && lt < GM.fix ? Math.sin(lt * 80) * 5 : 0;
    if (out < 1) {
      c.save(); c.translate(shake, 0); scaleAt(c, ex, ey, 1 - out);
      txt(c, '3', ex, cy - s * 0.42, { f: FONT.main, w: 400, s: s * 0.68, c: blend(PAL.ink, PAL.orange, tw(lt, GM.circle, GM.circle + 0.2)), a: 'center', rtl: false });
      c.restore();
    }
    if (lt > GM.fix) {
      c.save(); scaleAt(c, ex, ey, Math.max(0.001, inn));
      txt(c, '2', ex, cy - s * 0.42, { f: FONT.main, w: 400, s: s * 0.68, c: PAL.orange, a: 'center', rtl: false });
      c.restore();
      spikes(c, ex, ey, lt - GM.fix, 34, 70, PAL.orange, 8, 5, 0.4);
    }
    // hand-drawn marker loop around the exponent
    const lp = tw(lt, GM.circle, GM.circle + 0.3, Ez.cubicOut) * (1 - tw(lt, GM.fix + 0.25, GM.fix + 0.45));
    if (lp > 0) {
      const pts = [];
      for (let k = 0; k <= 40; k++) { const a = -2.2 + (k / 40) * (TAU + 0.6); pts.push([ex + Math.cos(a) * (42 + 3 * Math.sin(k)), ey + Math.sin(a) * 50]); }
      trace(c, pts, lp, PAL.orange, 6);
    }
    const bad = tw(lt, GM.circle + 0.15, GM.circle + 0.3) * (1 - tw(lt, GM.fix, GM.fix + 0.15));
    if (bad > 0) { c.save(); c.globalAlpha *= bad; pill(c, '✗', ex + DIR * 0 + 70, ey - 52, { s: 24, bg: PAL.ink, fg: PAL.paper, a: 'center', w: 800, pad: 14 }); c.restore(); }
  });
}

/* ======================================================================
   07 — TOOLKIT   (20.5 – 23.5 s)
   ====================================================================== */
const TO = { sweep: 1.0, step: 0.125, icons: ['calc', 'board', 'note', 'timer', 'todo', 'convert', 'atom', 'cap', 'code', 'library', 'calendar', 'bell'] };
function drawTools(c, lt) {
  bgInk(c, lt);
  bloom(c, 540, 1080, 800, PAL.orange, 0.12);
  chapterTag(c, 6, T.ch[5], lt, PAL.paper);
  headline(c, T.toolsH, [PAL.paper, PAL.orange], lt, 432, 0.04, 0.1, 128);
  const tileW = 286, tileH = 195, g = 21, y0 = 652;
  for (let i = 0; i < 12; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const x = EN ? 90 + col * (tileW + g) : 990 - tileW - col * (tileW + g), y = y0 + row * (tileH + g);
    const u = lt - (0.12 + (col + row) * 0.055);
    if (u <= 0) continue;
    const hi = TO.sweep + i * TO.step, hv = lt >= hi ? decay(lt - hi, 4.5) : 0;
    const fin = lt > 2.55 ? decay(lt - 2.55, 4) * 0.6 : 0;
    const k = Math.max(hv, fin);
    c.save();
    c.globalAlpha *= clamp(u / 0.1);
    scaleAt(c, x + tileW / 2, y + tileH / 2, lerp(0.3, 1, settle(u, 2.3, 6.5)) * (1 + 0.07 * hv));
    rotateAt(c, x + tileW / 2, y + tileH / 2, (1 - tw(u, 0, 0.4, Ez.cubicOut)) * 0.3 * DIR);
    slab(c, x, y, tileW, tileH, 30, blend(PAL.ink2, PAL.orange, k));
    slabLine(c, x + 1, y + 1, tileW - 2, tileH - 2, 29, blend(PAL.ink3, PAL.orange, Math.max(k, fin)), 2);
    glyph(c, TO.icons[i], x + tileW / 2, y + 80, 76, blend(PAL.orange, PAL.ink, k), 7, lt >= hi ? (lt - hi) * 1.5 : 0);
    const ls = fitType(c, [T.tools[i]], { f: FONT.d, w: 600 }, tileW - 36, 27);
    txt(c, T.tools[i], x + tileW / 2, y + 162, { f: FONT.d, w: 600, s: ls, c: blend(PAL.paper, PAL.ink, k), a: 'center' });
    c.restore();
  }
}

/* ======================================================================
   08 — CURRICULA   (23.5 – 26.0 s)
   ====================================================================== */
const CU = { sa: 0.1, jo: 0.26, grades: 0.5, chips: 0.72, sub: 1.0, tap: 1.3 };
function curCard(c, lt, x, y, w, h, bg, fg, sub, code, title, grades, chips, gradeBg, chipBg, chipFg, t0, fromStart, tapIdx) {
  const e = tw(lt, t0, t0 + 0.6, Ez.glide);
  if (e <= 0) return;
  c.save();
  const dir = fromStart ? -DIR : DIR;
  c.translate(dir * (1 - e) * 1050, 0); rotateAt(c, 540, y + h / 2, dir * (1 - e) * 0.12);
  castShadow(c, 'rgba(0,0,0,0.22)', 50, 24); slab(c, x, y, w, h, 44, bg); clearShadow(c);
  // emblem on the end side
  const ex = IX(934) - DIR * 62, ey = y + 82;
  const eu = lt - (t0 + 0.3);
  if (eu > 0) {
    c.save(); scaleAt(c, ex, ey, Math.max(0.001, lerp(0.3, 1, settle(eu, 2.3, 6.5)))); rotateAt(c, ex, ey, (1 - tw(eu, 0, 0.5, Ez.cubicOut)) * -0.6 * DIR);
    disc(c, ex, ey, 60, alpha(fg, 0.14));
    glyph(c, code, ex, ey, 74, fg, 7);
    c.restore();
  }
  txt(c, title, IX(146), y + 96, { f: FONT.d, w: 800, s: 52, c: fg, a: AL, ls: EN ? -1 : 0 });
  let gx = IX(146);
  grades.forEach((g, i) => {
    const u = lt - (t0 + CU.grades - 0.1 + i * 0.07);
    if (u <= 0) return;
    const tapped = tapIdx === i && lt >= t0 + CU.tap;
    c.save(); c.globalAlpha *= clamp(u / 0.08);
    const pw = wOf(c, g, { f: FONT.d, w: 700, s: 28 }) + 52 + (tapped ? 44 : 0);
    const cxp = gx + DIR * pw / 2;
    scaleAt(c, cxp, y + 180, Math.max(0.001, lerp(0.4, 1, settle(u, 2.4, 7))) * (tapped ? 1 + 0.08 * jiggle(lt - t0 - CU.tap, 3, 6) : 1));
    slab(c, cxp - pw / 2, y + 148, pw, 64, 32, tapped ? PAL.paper : gradeBg);
    if (tapped) glyph(c, 'check', cxp - DIR * (pw / 2 - 34), y + 180, 30, PAL.orange, 13);
    txt(c, g, cxp + (tapped ? DIR * 18 : 0), y + 191, { f: FONT.d, w: 700, s: 28, c: tapped ? PAL.orange : fg, a: 'center' });
    c.restore();
    gx += DIR * (pw + 14);
  });
  let cx2 = IX(146);
  chips.forEach((s, i) => {
    const u = lt - (t0 + CU.chips - 0.1 + i * 0.08);
    if (u <= 0) return;
    const pw = wOf(c, s, { f: FONT.d, w: 800, s: 30 }) + 60;
    const cxp = cx2 + DIR * pw / 2;
    c.save(); scaleAt(c, cxp, y + 262, Math.max(0.001, lerp(0.3, 1, settle(u, 2.6, 7))));
    pill(c, s, cxp, y + 262, { s: 30, bg: chipBg, fg: chipFg, a: 'center', w: 800, pad: 30 });
    c.restore();
    cx2 += DIR * (pw + 14);
  });
  c.restore();
}
function drawCur(c, lt) {
  bgPaper(c, lt);
  chapterTag(c, 7, T.ch[6], lt, PAL.ink);
  headline(c, T.curH, [PAL.ink, PAL.orange], lt, 432, 0.04, 0.1, 128);
  curCard(c, lt, 90, 650, 900, 330, PAL.orange, PAL.paper, '', 'cap', T.sa, T.saGrades, T.saChips, PAL.deep, PAL.paper, PAL.orange, CU.sa, true, 2);
  curCard(c, lt, 90, 1010, 900, 330, PAL.ink, PAL.paper, '', 'book', T.jo, T.joGrades, T.joChips, PAL.ink3, PAL.orange, PAL.ink, CU.jo, false, -1);
  // tap on the grade
  const tx = IX(146) + DIR * 330, ty = 830;
  tapMark(c, tx, ty, lt - CU.tap);
  const ss = fitType(c, [T.curSub], { f: FONT.d, w: 600 }, 900, 36);
  kLine(c, T.curSub, X0, 1428, { f: FONT.d, w: 600, s: ss, c: PAL.gray, a: AL }, lt, CU.sub, 0.04, 0.5, Ez.kinetic);
}

/* ======================================================================
   09 — END CARD   (26.0 – 30.0 s)
   ====================================================================== */
const EC = { icon: 0.0, book: 0.12, check: 0.34, dot: 0.46, word: 0.5, tag: 0.72, cta: 1.0, by: 1.3, press: 2.5 };
function drawEnd(c, lt) {
  bgInk(c, lt);
  // marquee
  {
    const o = { f: FONT.d, w: 800, s: 170, ls: EN ? -4 : 0 };
    const s = T.marquee.repeat(4);
    const mw = wOf(c, T.marquee, o);
    const a = tw(lt, 0.3, 1.0);
    c.save(); c.globalAlpha *= a;
    [[330, 1], [1650, -1]].forEach(([y, d]) => {
      const off = ((lt * 110 * d) % mw + mw) % mw;
      txt(c, s, -off - mw, y, { ...o, a: 'left', outline: true, stroke: PAL.ink3, sw: 3 });
    });
    c.restore();
  }
  const cx = 540, cy = 650, S = 360;
  // light rays
  const ra = tw(lt, 0.05, 0.8);
  c.save(); c.translate(cx, cy); c.rotate(lt * 0.18);
  for (let i = 0; i < 18; i++) {
    c.rotate(TAU / 18);
    const g = c.createLinearGradient(0, 0, 0, -900);
    g.addColorStop(0, alpha(PAL.orange, 0.22 * ra)); g.addColorStop(1, alpha(PAL.orange, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(-40, -900); c.lineTo(40, -900); c.closePath(); c.fill();
  }
  c.restore();
  bloom(c, cx, cy, 560, PAL.orange, 0.45 * ra);
  const sq = Ez.backOutHard(span(lt, EC.icon, EC.icon + 0.42));
  c.save(); rotateAt(c, cx, cy, -0.25 * (1 - Ez.backOut(span(lt, EC.icon, EC.icon + 0.5))));
  fazIcon(c, cx, cy, S, {
    sq, book: Ez.cubicOut(span(lt, EC.book, EC.book + 0.3)), check: Ez.cubicOut(span(lt, EC.check, EC.check + 0.18)),
    dot: Ez.backOutHard(span(lt, EC.dot, EC.dot + 0.3)), glint: span(lt, 0.7, 1.1), shadow: 'rgba(0,0,0,0.5)'
  });
  c.restore();
  shock(c, cx, cy, lt, S * 0.3, S * 1.3, PAL.orange, 12, 0.8);
  spikes(c, cx, cy, lt - EC.check - 0.12, S * 0.62, S * 0.85, PAL.peach, 10, 7, 0.45, 0.3);
  shock(c, cx + (FZG.dot.x - 50) * S / 100, cy + (FZG.dot.y - 50) * S / 100, lt - EC.dot, 20, 90, PAL.peach, 5, 0.45);
  burst(c, cx, cy, lt - 0.02, { n: 70, seed: 21, speed: 2100, size: 20, life: 1.8, cols: [PAL.orange, PAL.peach, PAL.paper, PAL.amber] });
  // wordmark + tagline
  const o = { f: FONT.d, w: 800, ls: EN ? -3 : 0 };
  const s = fitType(c, [T.name], o, 900, EN ? 124 : 150);
  kLine(c, T.name, 540, 975, { ...o, s, c: PAL.paper, a: 'center' }, lt, EC.word, 0.08, 0.55, Ez.kinetic);
  const to = { f: FONT.d, w: 600, ls: EN ? -1 : 0 };
  const ts = fitType(c, T.tagline, to, 860, EN ? 60 : 66);
  const ty = EN ? 1088 : 1108;
  kLine(c, T.tagline[0], 540, ty, { ...to, s: ts, c: PAL.paper, a: 'center' }, lt, EC.tag, 0.05, 0.5, Ez.kinetic);
  kLine(c, T.tagline[1], 540, ty + ts * (EN ? 1.15 : 1.3), { ...to, s: ts, c: PAL.orange, a: 'center' }, lt, EC.tag + 0.12, 0.05, 0.5, Ez.kinetic);
  // CTA
  const u = lt - EC.cta;
  if (u > 0) {
    const co = { f: FONT.d, w: 800, s: 40, ls: EN ? -0.5 : 0 };
    const bw = wOf(c, T.cta, co) + 130, bh = 104, bx = 540 - bw / 2, by = 1268;
    const pr = lt > EC.press && lt < EC.press + 0.16 ? Math.sin(span(lt, EC.press, EC.press + 0.16) * Math.PI) : 0;
    c.save(); c.globalAlpha *= clamp(u / 0.1);
    scaleAt(c, 540, by + 50, Math.max(0.001, lerp(0.5, 1, settle(u, 2.2, 6.5))));
    bloom(c, 540, by + 50, 340, PAL.orange, 0.3);
    pressable(c, bx, by, bw, bh, bh / 2, PAL.orange, PAL.deep, 12, pr);
    txt(c, T.cta, 540, by + 64 + 12 * pr, { ...co, c: PAL.paper, a: 'center' });
    // shine
    const sp = span(lt, 1.5, 2.0);
    if (sp > 0 && sp < 1) {
      c.save(); rrect(c, bx, by + 12 * pr, bw, bh, bh / 2); c.clip();
      const gx = lerp(bx - 80, bx + bw + 80, sp);
      const g = c.createLinearGradient(gx - 50, 0, gx + 50, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(bx, by, bw, bh + 12); c.restore();
    }
    c.restore();
    spikes(c, 540, by + 50, lt - EC.press - 0.08, bw * 0.55, bw * 0.75, PAL.peach, 12, 6, 0.4);
  }
  const lp = tw(lt, EC.by, EC.by + 0.45, Ez.cubicOut);
  c.save(); c.translate(0, (1 - lp) * 30);
  jfSign(c, 540, 1462, 62, PAL.paper, lp, T.by);
  c.restore();
}

/* ======================================================================
   The edit
   ====================================================================== */
shot('intro', TL.intro, TL.path, drawHook);
shot('path', TL.path, TL.lesson, drawPath);
shot('lesson', TL.lesson, TL.game, drawLesson, { tr: { type: 'iris', pre: 0.3, post: 0.12, layers: [PAL.peach], lag: 0.2, x: MX(540 + PBOSS.x), y: PBOSS_Y + pathScroll(3.0), ease: Ez.quintInOut } });
shot('game', TL.game, TL.exam, drawGame, { tr: { type: 'push', pre: 0.22, post: 0.14, angle: -90 } });
shot('exam', TL.exam, TL.games, drawExam, { tr: { type: 'wipe', pre: 0.28, post: 0.12, angle: EN ? 62 : 118, layers: [PAL.orange], lag: 0.22 } });
shot('games', TL.games, TL.tools, drawGames, { tr: { type: 'push', pre: 0.22, post: 0.14, angle: EN ? 180 : 0 } });
shot('tools', TL.tools, TL.cur, drawTools, { tr: { type: 'blinds', pre: 0.28, post: 0.1, n: 6, layers: [PAL.peach], lag: 0.18 } });
shot('cur', TL.cur, TL.end, drawCur, { tr: { type: 'card', pre: 0.32, post: 0.12 } });
shot('end', TL.end, DUR, drawEnd, { tr: { type: 'wave', pre: 0.4, post: 0.1, layers: [PAL.orange], lag: 0.25, ease: Ez.cubicInOut } });

// camera shake / chromatic aberration / flash, locked to the hits
IN.words.forEach((t, i) => { JOLTS.push({ t, amp: 16 + i * 6, dur: 0.3, f: 34 }); SPLITS.push({ t, amp: 0.7 + i * 0.2, dur: 0.22 }); });
JOLTS.push({ t: IN.glitch, amp: 22, dur: 0.25, f: 50 }); SPLITS.push({ t: IN.glitch, amp: 1.6, dur: 0.3 });
JOLTS.push({ t: IN.land1, amp: 10, dur: 0.25 });
JOLTS.push({ t: IN.land2, amp: 18, dur: 0.4 }); SPLITS.push({ t: IN.land2, amp: 0.8, dur: 0.3 }); FLARES.push({ t: IN.land2, amp: 0.12, dur: 0.18 });
SPLITS.push({ t: IN.check + 0.15, amp: 0.5, dur: 0.2 });
JOLTS.push({ t: TL.path + PA.boss, amp: 12, dur: 0.3 });
JOLTS.push({ t: TL.game + GA.lvl, amp: 10, dur: 0.3 }); SPLITS.push({ t: TL.game + GA.lvl, amp: 0.5, dur: 0.2 });
JOLTS.push({ t: TL.exam + EX.stamp, amp: 24, dur: 0.4 }); SPLITS.push({ t: TL.exam + EX.stamp, amp: 1.0, dur: 0.3 }); FLARES.push({ t: TL.exam + EX.stamp, amp: 0.15, dur: 0.15 });
JOLTS.push({ t: TL.end, amp: 22, dur: 0.5 }); SPLITS.push({ t: TL.end, amp: 1.2, dur: 0.4 }); FLARES.push({ t: TL.end, amp: 0.2, dur: 0.2 });
