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
  chapter(c, 4, T.ch[3], lt, C.ink);
  headline(c, T.examH, [C.ink, C.orange], lt, 432, 0.04, 0.1, 124);

  // simulator card (ink)
  {
    const e = ez(lt, EX.sim, EX.sim + 0.6, E.swift);
    const x = 90, y = 650, w = 900, h = 400;
    c.save(); c.translate(DIR * (1 - e) * 1000, 0); rotAbout(c, 540, y + h / 2, DIR * (1 - e) * 0.1);
    shadow(c, 'rgba(0,0,0,0.25)', 50, 24); fillRR(c, x, y, w, h, 44, C.ink); noShadow(c);
    text(c, T.sim, IX(146), y + 92, { f: F.d, w: 800, s: 46, c: C.paper, a: AL, ls: EN ? -1 : 0 });
    T.simChips.forEach((s, i) => {
      const u = lt - (EX.sim + 0.35 + i * 0.08);
      if (u <= 0) return;
      c.save(); c.globalAlpha *= clamp(u / 0.1); c.translate(-DIR * (1 - E.outC(clamp(u / 0.35))) * 40, 0);
      const cy = y + 172 + i * 72;
      const pw = pill(c, s, IX(146), cy, { s: 27, stroke: C.ink4, fg: C.paper, a: AL, w: 600, pad: 26 });
      fillCircle(c, IX(146) + DIR * (pw + 22), cy, 7, C.orange);
      c.restore();
    });
    // countdown ring
    const rcx = IX(808), rcy = y + 205, R = 108;
    const secs = Math.max(0, 2700 - Math.floor(Math.max(0, lt - 0.3) * 160));
    const frac = secs / 2700;
    strokeCircle(c, rcx, rcy, R, C.ink3, 18);
    arcStroke(c, rcx, rcy, R, -Math.PI / 2, -Math.PI / 2 + TAU * frac * ez(lt, 0.25, 0.7, E.outC) * DIR, C.orange, 18);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0'), ss = String(secs % 60).padStart(2, '0');
    text(c, `${mm}:${ss}`, rcx, rcy + 16, { f: F.mono, w: 600, s: 44, c: C.paper, a: 'center', rtl: false });
    text(c, `Q ${12 + Math.min(8, Math.floor(Math.max(0, lt - 0.3) * 3))} / 40`, rcx, rcy + 56, { f: F.mono, w: 500, s: 20, c: C.mute, a: 'center', rtl: false, ls: 2 });
    c.restore();
  }
  // training card (sand)
  {
    const e = ez(lt, EX.train, EX.train + 0.6, E.swift);
    const x = 90, y = 1080, w = 900, h = 410;
    c.save(); c.translate(-DIR * (1 - e) * 1000, 0); rotAbout(c, 540, y + h / 2, -DIR * (1 - e) * 0.1);
    fillRR(c, x, y, w, h, 44, C.sand);
    text(c, T.train, IX(146), y + 92, { f: F.d, w: 800, s: 46, c: C.ink, a: AL, ls: EN ? -1 : 0 });
    const cu = lt - (EX.train + 0.4);
    if (cu > 0) { c.save(); scaleAbout(c, IX(934), y + 76, Math.max(0.001, spring(cu, 2.4, 7))); pill(c, T.trainChip, IX(934), y + 76, { s: 25, bg: C.orange, fg: C.paper, a: EN ? 'right' : 'left', w: 700 }); c.restore(); }
    T.chapters.forEach((s, i) => {
      const ry = y + 158 + i * 76;
      c.fillStyle = C.sand2; c.fillRect(146, ry - 46, 788, 2);
      text(c, s, IX(146), ry + 10, { f: F.d, w: 600, s: 32, c: C.ink, a: AL });
      const u = lt - EX.rows[i];
      const bx = IX(908);
      strokeCircle(c, bx, ry, 22, C.sand2, 4);
      if (u > 0) {
        c.save(); scaleAbout(c, bx, ry, Math.max(0.001, lerp(0.2, 1, spring(u, 2.6, 7))));
        fillCircle(c, bx, ry, 24, C.orange); icon(c, 'check', bx, ry, 34, C.paper, 13);
        c.restore();
        ring(c, bx, ry, u, 22, 70, C.orange, 5, 0.4);
      }
    });
    text(c, '✓ ' + T.saved, IX(146), y + 384, { f: F.d, w: 500, s: 24, c: C.gray, a: AL });
    c.restore();
  }
  // the stamp
  const u = lt - EX.stamp;
  if (u > -0.2) {
    const cx = 540, cy = 1060, R = 168;
    const k = u < 0 ? lerp(2.6, 1, E.inC(prog(u, -0.2, 0))) : 1 + 0.06 * wobble(u, 3, 7);
    const a = u < 0 ? ez(u, -0.2, -0.12) : 1;
    const rays = ez(u, 0, 0.35);
    c.save(); c.globalAlpha *= a;
    if (rays > 0) {
      c.save(); c.translate(cx, cy); c.rotate(lt * 0.5);
      for (let i = 0; i < 12; i++) {
        c.rotate(TAU / 12);
        const g = c.createLinearGradient(0, 0, 0, -R * 2.6);
        g.addColorStop(0, rgba(C.peach, 0.75 * rays)); g.addColorStop(1, rgba(C.peach, 0));
        c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(-34, -R * 2.6 * rays); c.lineTo(34, -R * 2.6 * rays); c.closePath(); c.fill();
      }
      c.restore();
    }
    c.translate(cx, cy); c.scale(k, k); c.rotate(lerp(-0.5, -0.1, ez(u, -0.2, 0.05)));
    shadow(c, 'rgba(120,40,0,0.35)', 50, 20);
    fillCircle(c, 0, 0, R, C.orange); noShadow(c);
    strokeCircle(c, 0, 0, R - 18, rgba(C.paper, 0.85), 4);
    c.setLineDash([2, 14]); strokeCircle(c, 0, 0, R - 34, rgba(C.paper, 0.6), 4); c.setLineDash([]);
    text(c, '100%', 0, 30, { f: F.d, w: 800, s: 92, c: C.paper, a: 'center', rtl: false, ls: -3 });
    c.restore();
    const pu = u - 0.12;
    if (pu > 0) {
      c.save(); scaleAbout(c, cx, cy + 232, Math.max(0.001, lerp(0.3, 1, spring(pu, 2.3, 6.5))));
      pill(c, T.perfect, cx, cy + 232, { s: 38, bg: C.ink, fg: C.paper, a: 'center', w: 800, ls: EN ? -0.5 : 0 });
      c.restore();
    }
    ring(c, cx, cy, u, R, R + 260, C.orange, 10, 0.6);
    confetti(c, cx, cy, u, { n: 60, seed: 77, speed: 1800, size: 19, life: 1.3, cols: [C.orange, C.peach, C.ink, C.amber] });
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
    shadow(c, 'rgba(80,25,0,0.28)', 40, 18); fillRR(c, x, y, w, h, 40, C.paper); noShadow(c);
    c.save(); rr(c, x, y, w, h, 40); c.clip(); fn(x, y, w, h, cx); c.restore();
    const ts = fitSize(c, [title], { f: F.d, w: 800, ls: EN ? -1 : 0 }, w - 60, 36);
    text(c, title, cx, y + h - 40, { f: F.d, w: 800, s: ts, c: C.ink, a: 'center', ls: EN ? -1 : 0 });
    xpChip(c, cx, y + 300, lt - xpAt, '+15 XP', C.orange, C.paper, 30);
  }
  c.restore();
}
function drawGames(c, lt) {
  bgOrange(c, lt);
  chapter(c, 5, T.ch[4], lt, C.ink, C.paper);
  headline(c, T.gamesH, [C.ink, C.paper], lt, 432, 0.04, 0.1, 124);

  // smart flashcards
  gameTile(c, 0, 0, lt, 0.12, T.games[0], GM.flip + 0.35, (x, y, w, h, cx) => {
    const cy = y + 160, cw = 330, ch = 206;
    fillRR(c, cx - cw / 2 + 20, cy - ch / 2 - 14, cw, ch, 26, C.sand2);
    c.save(); rotAbout(c, cx, cy, -0.07 * DIR); fillRR(c, cx - cw / 2, cy - ch / 2, cw, ch, 26, C.sand); c.restore();
    const th = Math.PI * E.ioC(prog(lt, GM.flip, GM.flip + 0.32));
    const sx = Math.abs(Math.cos(th)), lift = Math.sin(th) * 24;
    c.save(); c.translate(cx, cy - lift); c.scale(Math.max(0.02, sx), 1);
    if (th < Math.PI / 2) {
      fillRR(c, -cw / 2, -ch / 2, cw, ch, 26, C.white); strokeRR(c, -cw / 2 + 1, -ch / 2 + 1, cw - 2, ch - 2, 25, C.line, 2.5);
      const fo = { f: F.d, w: 800, ls: EN ? -1 : 0 };
      const fs = fitSize(c, T.flashFront, fo, cw - 60, 40);
      text(c, T.flashFront[0], 0, -8, { ...fo, s: fs, c: C.ink, a: 'center' });
      text(c, T.flashFront[1], 0, -8 + fs * 1.25, { ...fo, s: fs, c: C.orange, a: 'center' });
    } else {
      fillRR(c, -cw / 2, -ch / 2, cw, ch, 26, C.orange);
      drawMath(c, [{ i: 'F' }, { op: '=' }, { i: 'm' }, { i: 'a' }], 0, 26, 78, C.paper, 'center');
    }
    c.restore();
  });
  // 60-second quiz
  gameTile(c, 1, 0, lt, 0.19, T.games[1], GM.quiz[2] + 0.1, (x, y, w, h, cx) => {
    const cy = y + 150, R = 92;
    const sec = Math.max(0, 60 - Math.max(0, lt - 0.35) * 6);
    strokeCircle(c, cx, cy, R, C.sand, 16);
    arcStroke(c, cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * (sec / 60) * ez(lt, 0.25, 0.6, E.outC) * DIR, C.orange, 16);
    text(c, String(Math.ceil(sec)), cx, cy + 26, { f: F.d, w: 800, s: 76, c: C.ink, a: 'center', rtl: false, ls: -2 });
    for (let i = 0; i < 3; i++) {
      const dx = cx + DIR * (i - 1) * 46, dy = y + 278, u = lt - GM.quiz[i];
      fillCircle(c, dx, dy, 13, C.sand2);
      if (u > 0) { c.save(); scaleAbout(c, dx, dy, Math.max(0.001, spring(u, 2.6, 7))); fillCircle(c, dx, dy, 15, C.orange); c.restore(); ring(c, dx, dy, u, 14, 44, C.orange, 4, 0.35); }
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
      const th = Math.PI * E.ioC(prog(lt, flipAt[i], flipAt[i] + 0.2));
      const m = lt >= matchAt[i];
      const mk = m ? 1 + 0.08 * wobble(lt - matchAt[i], 3, 6) : 1;
      c.save(); c.translate(px, py); c.scale(Math.max(0.02, Math.abs(Math.cos(th))) * mk, mk);
      if (th < Math.PI / 2) {
        fillRR(c, -cw / 2, -ch / 2, cw, ch, 18, C.orange);
        strokeRR(c, -cw / 2 + 8, -ch / 2 + 8, cw - 16, ch - 16, 12, rgba(C.paper, 0.4), 2.5);
        text(c, '?', 0, 18, { f: F.d, w: 800, s: 46, c: C.paper, a: 'center', rtl: false });
      } else {
        fillRR(c, -cw / 2, -ch / 2, cw, ch, 18, m ? C.peach2 : C.white);
        strokeRR(c, -cw / 2 + 1.5, -ch / 2 + 1.5, cw - 3, ch - 3, 17, m ? C.orange : C.line, m ? 4 : 2.5);
        const f = faces[i];
        if (f.length <= 1) drawMath(c, [f], 0, 20, 54, C.orange, 'center');
        else text(c, f, 0, 12, { f: F.d, w: 700, s: 30, c: C.ink, a: 'center' });
      }
      c.restore();
    }
  });
  // spot the error
  gameTile(c, 1, 1, lt, 0.33, T.games[3], GM.fix + 0.2, (x, y, w, h, cx) => {
    const cy = y + 190, s = 92;
    const base = [{ i: 'E' }, { op: '=' }, { i: 'm' }, { i: 'c' }];
    const bw = mathWidth(c, base, s), sw = measure(c, '3', { f: F.main, w: 400, s: s * 0.68 });
    const x0 = cx - (bw + sw) / 2;
    drawMath(c, base, x0, cy, s, C.ink);
    const ex = x0 + bw + s * 0.04 + sw / 2, ey = cy - s * 0.42 - s * 0.24;
    const out = ez(lt, GM.fix - 0.05, GM.fix + 0.08, E.inC), inn = spring(lt - GM.fix - 0.04, 2.6, 6);
    const shake = lt > GM.circle + 0.2 && lt < GM.fix ? Math.sin(lt * 80) * 5 : 0;
    if (out < 1) {
      c.save(); c.translate(shake, 0); scaleAbout(c, ex, ey, 1 - out);
      text(c, '3', ex, cy - s * 0.42, { f: F.main, w: 400, s: s * 0.68, c: mix(C.ink, C.orange, ez(lt, GM.circle, GM.circle + 0.2)), a: 'center', rtl: false });
      c.restore();
    }
    if (lt > GM.fix) {
      c.save(); scaleAbout(c, ex, ey, Math.max(0.001, inn));
      text(c, '2', ex, cy - s * 0.42, { f: F.main, w: 400, s: s * 0.68, c: C.orange, a: 'center', rtl: false });
      c.restore();
      sparks(c, ex, ey, lt - GM.fix, 34, 70, C.orange, 8, 5, 0.4);
    }
    // hand-drawn marker loop around the exponent
    const lp = ez(lt, GM.circle, GM.circle + 0.3, E.outC) * (1 - ez(lt, GM.fix + 0.25, GM.fix + 0.45));
    if (lp > 0) {
      const pts = [];
      for (let k = 0; k <= 40; k++) { const a = -2.2 + (k / 40) * (TAU + 0.6); pts.push([ex + Math.cos(a) * (42 + 3 * Math.sin(k)), ey + Math.sin(a) * 50]); }
      strokePart(c, pts, lp, C.orange, 6);
    }
    const bad = ez(lt, GM.circle + 0.15, GM.circle + 0.3) * (1 - ez(lt, GM.fix, GM.fix + 0.15));
    if (bad > 0) { c.save(); c.globalAlpha *= bad; pill(c, '✗', ex + DIR * 0 + 70, ey - 52, { s: 24, bg: C.ink, fg: C.paper, a: 'center', w: 800, pad: 14 }); c.restore(); }
  });
}

/* ======================================================================
   07 — TOOLKIT   (20.5 – 23.5 s)
   ====================================================================== */
const TO = { sweep: 1.0, step: 0.125, icons: ['calc', 'board', 'note', 'timer', 'todo', 'convert', 'atom', 'cap', 'code', 'library', 'calendar', 'bell'] };
function drawTools(c, lt) {
  bgInk(c, lt);
  glow(c, 540, 1080, 800, C.orange, 0.12);
  chapter(c, 6, T.ch[5], lt, C.paper);
  headline(c, T.toolsH, [C.paper, C.orange], lt, 432, 0.04, 0.1, 128);
  const tw = 286, th = 195, g = 21, y0 = 652;
  for (let i = 0; i < 12; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const x = EN ? 90 + col * (tw + g) : 990 - tw - col * (tw + g), y = y0 + row * (th + g);
    const u = lt - (0.12 + (col + row) * 0.055);
    if (u <= 0) continue;
    const hi = TO.sweep + i * TO.step, hv = lt >= hi ? pulse(lt - hi, 4.5) : 0;
    const fin = lt > 2.55 ? pulse(lt - 2.55, 4) * 0.6 : 0;
    const k = Math.max(hv, fin);
    c.save();
    c.globalAlpha *= clamp(u / 0.1);
    scaleAbout(c, x + tw / 2, y + th / 2, lerp(0.3, 1, spring(u, 2.3, 6.5)) * (1 + 0.07 * hv));
    rotAbout(c, x + tw / 2, y + th / 2, (1 - ez(u, 0, 0.4, E.outC)) * 0.3 * DIR);
    fillRR(c, x, y, tw, th, 30, mix(C.ink2, C.orange, k));
    strokeRR(c, x + 1, y + 1, tw - 2, th - 2, 29, mix(C.ink3, C.orange, Math.max(k, fin)), 2);
    icon(c, TO.icons[i], x + tw / 2, y + 80, 76, mix(C.orange, C.ink, k), 7, lt >= hi ? (lt - hi) * 1.5 : 0);
    const ls = fitSize(c, [T.tools[i]], { f: F.d, w: 600 }, tw - 36, 27);
    text(c, T.tools[i], x + tw / 2, y + 162, { f: F.d, w: 600, s: ls, c: mix(C.paper, C.ink, k), a: 'center' });
    c.restore();
  }
}

/* ======================================================================
   08 — CURRICULA   (23.5 – 26.0 s)
   ====================================================================== */
const CU = { sa: 0.1, jo: 0.26, grades: 0.5, chips: 0.72, sub: 1.0, tap: 1.3 };
function curCard(c, lt, x, y, w, h, bg, fg, sub, code, title, grades, chips, gradeBg, chipBg, chipFg, t0, fromStart, tapIdx) {
  const e = ez(lt, t0, t0 + 0.6, E.swift);
  if (e <= 0) return;
  c.save();
  const dir = fromStart ? -DIR : DIR;
  c.translate(dir * (1 - e) * 1050, 0); rotAbout(c, 540, y + h / 2, dir * (1 - e) * 0.12);
  shadow(c, 'rgba(0,0,0,0.22)', 50, 24); fillRR(c, x, y, w, h, 44, bg); noShadow(c);
  // emblem on the end side
  const ex = IX(934) - DIR * 62, ey = y + 82;
  const eu = lt - (t0 + 0.3);
  if (eu > 0) {
    c.save(); scaleAbout(c, ex, ey, Math.max(0.001, lerp(0.3, 1, spring(eu, 2.3, 6.5)))); rotAbout(c, ex, ey, (1 - ez(eu, 0, 0.5, E.outC)) * -0.6 * DIR);
    fillCircle(c, ex, ey, 60, rgba(fg, 0.14));
    icon(c, code, ex, ey, 74, fg, 7);
    c.restore();
  }
  text(c, title, IX(146), y + 96, { f: F.d, w: 800, s: 52, c: fg, a: AL, ls: EN ? -1 : 0 });
  let gx = IX(146);
  grades.forEach((g, i) => {
    const u = lt - (t0 + CU.grades - 0.1 + i * 0.07);
    if (u <= 0) return;
    const tapped = tapIdx === i && lt >= t0 + CU.tap;
    c.save(); c.globalAlpha *= clamp(u / 0.08);
    const pw = measure(c, g, { f: F.d, w: 700, s: 28 }) + 52 + (tapped ? 44 : 0);
    const cxp = gx + DIR * pw / 2;
    scaleAbout(c, cxp, y + 180, Math.max(0.001, lerp(0.4, 1, spring(u, 2.4, 7))) * (tapped ? 1 + 0.08 * wobble(lt - t0 - CU.tap, 3, 6) : 1));
    fillRR(c, cxp - pw / 2, y + 148, pw, 64, 32, tapped ? C.paper : gradeBg);
    if (tapped) icon(c, 'check', cxp - DIR * (pw / 2 - 34), y + 180, 30, C.orange, 13);
    text(c, g, cxp + (tapped ? DIR * 18 : 0), y + 191, { f: F.d, w: 700, s: 28, c: tapped ? C.orange : fg, a: 'center' });
    c.restore();
    gx += DIR * (pw + 14);
  });
  let cx2 = IX(146);
  chips.forEach((s, i) => {
    const u = lt - (t0 + CU.chips - 0.1 + i * 0.08);
    if (u <= 0) return;
    const pw = measure(c, s, { f: F.d, w: 800, s: 30 }) + 60;
    const cxp = cx2 + DIR * pw / 2;
    c.save(); scaleAbout(c, cxp, y + 262, Math.max(0.001, lerp(0.3, 1, spring(u, 2.6, 7))));
    pill(c, s, cxp, y + 262, { s: 30, bg: chipBg, fg: chipFg, a: 'center', w: 800, pad: 30 });
    c.restore();
    cx2 += DIR * (pw + 14);
  });
  c.restore();
}
function drawCur(c, lt) {
  bgPaper(c, lt);
  chapter(c, 7, T.ch[6], lt, C.ink);
  headline(c, T.curH, [C.ink, C.orange], lt, 432, 0.04, 0.1, 128);
  curCard(c, lt, 90, 650, 900, 330, C.orange, C.paper, '', 'cap', T.sa, T.saGrades, T.saChips, C.deep, C.paper, C.orange, CU.sa, true, 2);
  curCard(c, lt, 90, 1010, 900, 330, C.ink, C.paper, '', 'book', T.jo, T.joGrades, T.joChips, C.ink3, C.orange, C.ink, CU.jo, false, -1);
  // tap on the grade
  const tx = IX(146) + DIR * 330, ty = 830;
  tapFX(c, tx, ty, lt - CU.tap);
  const ss = fitSize(c, [T.curSub], { f: F.d, w: 600 }, 900, 36);
  kineticLine(c, T.curSub, X0, 1428, { f: F.d, w: 600, s: ss, c: C.gray, a: AL }, lt, CU.sub, 0.04, 0.5, E.snap);
}

/* ======================================================================
   09 — END CARD   (26.0 – 30.0 s)
   ====================================================================== */
const EC = { icon: 0.0, book: 0.12, check: 0.34, dot: 0.46, word: 0.5, tag: 0.72, cta: 1.0, by: 1.3, press: 2.5 };
function drawEnd(c, lt) {
  bgInk(c, lt);
  // marquee
  {
    const o = { f: F.d, w: 800, s: 170, ls: EN ? -4 : 0 };
    const s = T.marquee.repeat(4);
    const mw = measure(c, T.marquee, o);
    const a = ez(lt, 0.3, 1.0);
    c.save(); c.globalAlpha *= a;
    [[330, 1], [1650, -1]].forEach(([y, d]) => {
      const off = ((lt * 110 * d) % mw + mw) % mw;
      text(c, s, -off - mw, y, { ...o, a: 'left', outline: true, stroke: C.ink3, sw: 3 });
    });
    c.restore();
  }
  const cx = 540, cy = 650, S = 360;
  // light rays
  const ra = ez(lt, 0.05, 0.8);
  c.save(); c.translate(cx, cy); c.rotate(lt * 0.18);
  for (let i = 0; i < 18; i++) {
    c.rotate(TAU / 18);
    const g = c.createLinearGradient(0, 0, 0, -900);
    g.addColorStop(0, rgba(C.orange, 0.22 * ra)); g.addColorStop(1, rgba(C.orange, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0); c.lineTo(-40, -900); c.lineTo(40, -900); c.closePath(); c.fill();
  }
  c.restore();
  glow(c, cx, cy, 560, C.orange, 0.45 * ra);
  const sq = E.outB2(prog(lt, EC.icon, EC.icon + 0.42));
  c.save(); rotAbout(c, cx, cy, -0.25 * (1 - E.outB(prog(lt, EC.icon, EC.icon + 0.5))));
  drawFazIcon(c, cx, cy, S, {
    sq, book: E.outC(prog(lt, EC.book, EC.book + 0.3)), check: E.outC(prog(lt, EC.check, EC.check + 0.18)),
    dot: E.outB2(prog(lt, EC.dot, EC.dot + 0.3)), glint: prog(lt, 0.7, 1.1), shadow: 'rgba(0,0,0,0.5)'
  });
  c.restore();
  ring(c, cx, cy, lt, S * 0.3, S * 1.3, C.orange, 12, 0.8);
  sparks(c, cx, cy, lt - EC.check - 0.12, S * 0.62, S * 0.85, C.peach, 10, 7, 0.45, 0.3);
  ring(c, cx + (FZ.dot.x - 50) * S / 100, cy + (FZ.dot.y - 50) * S / 100, lt - EC.dot, 20, 90, C.peach, 5, 0.45);
  confetti(c, cx, cy, lt - 0.02, { n: 70, seed: 21, speed: 2100, size: 20, life: 1.8, cols: [C.orange, C.peach, C.paper, C.amber] });
  // wordmark + tagline
  const o = { f: F.d, w: 800, ls: EN ? -3 : 0 };
  const s = fitSize(c, [T.name], o, 900, EN ? 124 : 150);
  kineticLine(c, T.name, 540, 975, { ...o, s, c: C.paper, a: 'center' }, lt, EC.word, 0.08, 0.55, E.snap);
  const to = { f: F.d, w: 600, ls: EN ? -1 : 0 };
  const ts = fitSize(c, T.tagline, to, 860, EN ? 60 : 66);
  const ty = EN ? 1088 : 1108;
  kineticLine(c, T.tagline[0], 540, ty, { ...to, s: ts, c: C.paper, a: 'center' }, lt, EC.tag, 0.05, 0.5, E.snap);
  kineticLine(c, T.tagline[1], 540, ty + ts * (EN ? 1.15 : 1.3), { ...to, s: ts, c: C.orange, a: 'center' }, lt, EC.tag + 0.12, 0.05, 0.5, E.snap);
  // CTA
  const u = lt - EC.cta;
  if (u > 0) {
    const co = { f: F.d, w: 800, s: 40, ls: EN ? -0.5 : 0 };
    const bw = measure(c, T.cta, co) + 130, bh = 104, bx = 540 - bw / 2, by = 1268;
    const pr = lt > EC.press && lt < EC.press + 0.16 ? Math.sin(prog(lt, EC.press, EC.press + 0.16) * Math.PI) : 0;
    c.save(); c.globalAlpha *= clamp(u / 0.1);
    scaleAbout(c, 540, by + 50, Math.max(0.001, lerp(0.5, 1, spring(u, 2.2, 6.5))));
    glow(c, 540, by + 50, 340, C.orange, 0.3);
    button3D(c, bx, by, bw, bh, bh / 2, C.orange, C.deep, 12, pr);
    text(c, T.cta, 540, by + 64 + 12 * pr, { ...co, c: C.paper, a: 'center' });
    // shine
    const sp = prog(lt, 1.5, 2.0);
    if (sp > 0 && sp < 1) {
      c.save(); rr(c, bx, by + 12 * pr, bw, bh, bh / 2); c.clip();
      const gx = lerp(bx - 80, bx + bw + 80, sp);
      const g = c.createLinearGradient(gx - 50, 0, gx + 50, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(bx, by, bw, bh + 12); c.restore();
    }
    c.restore();
    sparks(c, 540, by + 50, lt - EC.press - 0.08, bw * 0.55, bw * 0.75, C.peach, 12, 6, 0.4);
  }
  const lp = ez(lt, EC.by, EC.by + 0.45, E.outC);
  c.save(); c.translate(0, (1 - lp) * 30);
  jfLockup(c, 540, 1462, 62, C.paper, lp, T.by);
  c.restore();
}

/* ======================================================================
   The edit
   ====================================================================== */
addScene('intro', TL.intro, TL.path, drawIntro);
addScene('path', TL.path, TL.lesson, drawPath);
addScene('lesson', TL.lesson, TL.game, drawLesson, { tr: { type: 'iris', pre: 0.3, post: 0.12, layers: [C.peach], lag: 0.2, x: MX(540 + PBOSS.x), y: PBOSS_Y + pathScroll(3.0), ease: E.ioQn } });
addScene('game', TL.game, TL.exam, drawGame, { tr: { type: 'push', pre: 0.22, post: 0.14, angle: -90 } });
addScene('exam', TL.exam, TL.games, drawExam, { tr: { type: 'wipe', pre: 0.28, post: 0.12, angle: EN ? 62 : 118, layers: [C.orange], lag: 0.22 } });
addScene('games', TL.games, TL.tools, drawGames, { tr: { type: 'push', pre: 0.22, post: 0.14, angle: EN ? 180 : 0 } });
addScene('tools', TL.tools, TL.cur, drawTools, { tr: { type: 'blinds', pre: 0.28, post: 0.1, n: 6, layers: [C.peach], lag: 0.18 } });
addScene('cur', TL.cur, TL.end, drawCur, { tr: { type: 'card', pre: 0.32, post: 0.12 } });
addScene('end', TL.end, DUR, drawEnd, { tr: { type: 'wave', pre: 0.4, post: 0.1, layers: [C.orange], lag: 0.25, ease: E.ioC } });

// camera shake / chromatic aberration / flash, locked to the hits
IN.words.forEach((t, i) => { SHAKES.push({ t, amp: 16 + i * 6, dur: 0.3, f: 34 }); CAS.push({ t, amp: 0.7 + i * 0.2, dur: 0.22 }); });
SHAKES.push({ t: IN.glitch, amp: 22, dur: 0.25, f: 50 }); CAS.push({ t: IN.glitch, amp: 1.6, dur: 0.3 });
SHAKES.push({ t: IN.land1, amp: 10, dur: 0.25 });
SHAKES.push({ t: IN.land2, amp: 18, dur: 0.4 }); CAS.push({ t: IN.land2, amp: 0.8, dur: 0.3 }); FLASHES.push({ t: IN.land2, amp: 0.12, dur: 0.18 });
CAS.push({ t: IN.check + 0.15, amp: 0.5, dur: 0.2 });
SHAKES.push({ t: TL.path + PA.boss, amp: 12, dur: 0.3 });
SHAKES.push({ t: TL.game + GA.lvl, amp: 10, dur: 0.3 }); CAS.push({ t: TL.game + GA.lvl, amp: 0.5, dur: 0.2 });
SHAKES.push({ t: TL.exam + EX.stamp, amp: 24, dur: 0.4 }); CAS.push({ t: TL.exam + EX.stamp, amp: 1.0, dur: 0.3 }); FLASHES.push({ t: TL.exam + EX.stamp, amp: 0.15, dur: 0.15 });
SHAKES.push({ t: TL.end, amp: 22, dur: 0.5 }); CAS.push({ t: TL.end, amp: 1.2, dur: 0.4 }); FLASHES.push({ t: TL.end, amp: 0.2, dur: 0.2 });
