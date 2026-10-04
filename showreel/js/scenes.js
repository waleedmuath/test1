'use strict';
/* ==========================================================================
   Scenes. Each draw(c, lt) paints a full 1920×1080 frame for local time lt
   (seconds; may be negative or past the scene's end during transitions).
   Timing is written in beats (b = lt / B) so every hit lands on the grid.
   ========================================================================== */

const DIVS = [
  { n: '01', tEn: ['Client', 'Services'], short: 'Client Services', lEn: 'BUILT TO SPEC · WHITE-LABEL', iEn: ['Websites', 'Apps', 'Smart Systems', 'AI Systems', 'Robotics', 'Brand Identity', 'Social Media & Ad Management'], ar: ['خدمات العملاء'], en: 'CLIENT SERVICES', items: ['مواقع الويب', 'التطبيقات', 'الأنظمة الذكية', 'أنظمة الذكاء الاصطناعي', 'الروبوتات والأنظمة الروبوتية', 'الهوية التجارية', 'إدارة السوشيال ميديا والإعلانات'] },
  { n: '02', tEn: ['Our', 'Products'], short: 'Our Products', lEn: 'APPS · WEBSITES · SOFTWARE', dEn: 'Launched under our name, each with a distinct logo and color.', ar: ['تطبيقاتنا ومواقعنا', 'وبرامجنا'], en: 'OUR APPS, SITES & SOFTWARE', desc: 'منتجات نطلقها باسمنا، بشعار ولون مستقل لكل منتج.' },
  { n: '03', tEn: ['Advertising'], short: 'Advertising', lEn: 'OUTDOOR NETWORK + IN-PRODUCT ADS', iEn: ['Car-Top Screens', 'Branded Bottled Water', 'Building & Outdoor Ads', 'In-App & Website Ads'], ar: ['الإعلانات'], en: 'ADVERTISING', items: ['شاشات أسطح السيارات', 'مياه معبأة بعلامة تجارية', 'إعلانات المباني والخارجية', 'إعلانات داخل التطبيقات والمواقع'] },
  { n: '04', tEn: ['The Store'], short: 'The Store', lEn: 'E-COMMERCE', dEn: 'An online store for our own products, physical or digital.', ar: ['المتجر'], en: 'THE STORE', desc: 'متجر إلكتروني لمنتجاتنا الخاصة، مادية أو رقمية.' },
  { n: '05', tEn: ['Cyber', 'Security'], short: 'Cyber Security', lEn: 'FOR CLIENT PROJECTS + OUR PRODUCTS', iEn: ['Penetration Testing', 'Code & Systems Audit', 'Internal Red Team', 'Compliance & Hardening'], ar: ['الأمن السيبراني'], en: 'CYBERSECURITY', items: ['اختبار الاختراق', 'تدقيق الأكواد والأنظمة', 'الفريق الأحمر الداخلي', 'الامتثال والتحصين'] },
  { n: '06', tEn: ['Summer', 'Bootcamp'], short: 'Summer Bootcamp', lEn: 'EDUCATIONAL PROGRAM', ar: ['المعسكر التعليمي', 'الصيفي'], en: 'SUMMER BOOTCAMP' },
  { n: '07', tEn: ['Our Own', 'AI Model'], short: 'Our Own AI Model', lEn: 'BUILT & SHIPPED BY JOFUNCTION', iEn: ['Consumer AI Product'], ar: ['نموذج الذكاء الاصطناعي', 'الخاص بنا'], en: 'OUR OWN AI MODEL', items: ['منتج الذكاء الاصطناعي الاستهلاكي'] },
  { n: '08', tEn: ['Smart', 'Automation'], short: 'Smart Automation', lEn: 'DEVICES FOR HOMES, BUILDINGS & STORES', iEn: ['Home Automation', 'Building & Facility Systems', 'Store & Retail Automation', 'Smart Robots'], ar: ['أتمتة المنازل', 'والمباني والمتاجر'], en: 'HOME · BUILDING · RETAIL AUTOMATION', items: ['أتمتة المنزل', 'أنظمة المباني والمرافق', 'أتمتة المتاجر والتجزئة', 'الروبوتات الذكية'] }
];

/* ---------- division header: number, Arabic title, English label, chips ---------- */
function divHeader(c, lt, d, st) {
  const b = lt / B, xr = 1800;
  let y = st.y0 || 236;
  const pn = ez(b, 0, 0.6, E.outC);
  const no = { f: F.mono, w: 600, s: 28, ls: 2 };
  if (pn > 0) {
    text(c, d.n, xr, y, { ...no, c: st.acc, a: 'right', alpha: pn });
    const nw = measure(c, d.n, no);
    const pw = 56 * ez(b, 0.1, 0.8, E.outE);
    fillRR(c, xr - nw - 18 - pw, y - 13, pw, 5, 2.5, st.acc);
    text(c, '/ 08', xr - nw - 18 - 56 - 16, y, { f: F.mono, w: 400, s: 20, ls: 2, c: st.sub, a: 'right', alpha: ez(b, 0.3, 0.8) });
  }
  const to = EN ? { f: F.grot, w: 700, ls: -3, a: 'right' } : { f: F.ar, w: 700, a: 'right', rtl: true };
  const lines = EN ? d.tEn : d.ar;
  const size = st.size || (EN ? fitExact(c, lines, to, st.maxW || 760, 132) : fitSize(c, lines, to, st.maxW || 800, 124));
  y += EN ? 26 + size * 0.8 : 30 + size * 0.98;
  lines.forEach((line, i) => {
    const p = ez(b, 0.08 + i * 0.16, 0.85 + i * 0.16, E.outE);
    revealText(c, line, xr, y, { ...to, s: size, c: st.fg }, p);
    if (i < lines.length - 1) y += size * (EN ? 1.04 : 1.2);
  });
  y += EN ? Math.max(50, size * 0.52) : Math.max(66, size * 0.72);
  const pe = prog(b, 0.4, 1.4);
  if (pe > 0) {
    const s = scramble(EN ? d.lEn : d.en, pe, d.n.charCodeAt(1), Math.floor(lt * 24));
    text(c, s, xr, y, { f: F.mono, w: 500, s: 21, ls: 5, c: st.sub, a: 'right', halo: EN ? st.bg : undefined });
  }
  y += 34;
  if (EN) {
    if (d.dEn) {
      const dO = { f: F.plex, w: 400, s: 28, c: st.body || st.sub, a: 'right', halo: st.bg, haloW: 12 };
      wrapBalanced(c, d.dEn, dO, 760).forEach((ln, i) => revealText(c, ln, xr, y + 34 + i * 40, dO, ez(b, 0.9 + i * 0.12, 1.6 + i * 0.12, E.outE)));
    }
    if (d.iEn) chipsLTR(c, d.iEn, xr, y, st.chipWEn || 700, 1.0, b, st);
    return;
  }
  if (d.desc) {
    const pd = ez(b, 0.9, 1.6, E.outE);
    revealText(c, d.desc, xr, y + 34, { f: F.ar, w: 400, s: 28, c: st.body || st.sub, a: 'right', rtl: true }, pd);
  }
  if (d.items) chips(c, d.items, xr, y, st.chipW || 780, 1.0, b, st);
}

function chips(c, items, xr, ytop, maxW, b0, b, st) {
  const s = 22, padX = 20, h = 46, gap = 10, rowGap = 12;
  const o = { f: F.ar, w: 500, s, rtl: true };
  let x = xr, y = ytop;
  items.forEach((it, i) => {
    const w = measure(c, it, o) + padX * 2;
    if (x !== xr && xr - (x - w) > maxW) { x = xr; y += h + rowGap; }
    const q = prog(b, b0 + i * 0.16, b0 + i * 0.16 + 0.55);
    if (q > 0) {
      const sc = E.outB2(q);
      c.save();
      c.globalAlpha *= clamp(q * 3);
      scaleAbout(c, x - w / 2, y + h / 2, sc);
      if (st.chipFill) fillRR(c, x - w, y, w, h, h / 2, st.chipFill);
      strokeRR(c, x - w, y, w, h, h / 2, st.chipStroke, 1.5);
      text(c, it, x - w / 2, y + h / 2 + 8, { ...o, c: st.chipC, a: 'center' });
      c.restore();
    }
    x -= w + gap;
  });
}

function chipsLTR(c, items, xr, ytop, maxW, b0, b, st) {
  const padX = 20, h = 46, gap = 10, rowGap = 12;
  const o = { f: F.plex, w: 500, s: 21 };
  const ws = items.map(it => measure(c, it, o) + padX * 2);
  const rows = [];
  let row = [], rw = 0;
  ws.forEach((w, i) => {
    const nw = row.length ? rw + gap + w : w;
    if (row.length && nw > maxW) { rows.push(row); row = [i]; rw = w; } else { row.push(i); rw = nw; }
  });
  if (row.length) rows.push(row);
  rows.forEach((r, ri) => {
    let x = xr - (r.reduce((a, i) => a + ws[i], 0) + gap * (r.length - 1));
    const y = ytop + ri * (h + rowGap);
    r.forEach(i => {
      const w = ws[i], q = prog(b, b0 + i * 0.16, b0 + i * 0.16 + 0.55);
      if (q > 0) {
        c.save();
        c.globalAlpha *= clamp(q * 3);
        scaleAbout(c, x + w / 2, y + h / 2, E.outB2(q));
        if (st.chipFill || st.bg) fillRR(c, x, y, w, h, h / 2, st.chipFill || st.bg);
        strokeRR(c, x, y, w, h, h / 2, st.chipStroke, 1.5);
        text(c, items[i], x + w / 2, y + h / 2 + 7, { ...o, c: st.chipC, a: 'center' });
        c.restore();
      }
      x += w + gap;
    });
  });
}

/* ==========================================================================
   INTRO  (beats 0–12)  dot → logo construction → icon → lockup → zoom-through
   ========================================================================== */
const BIG = { u: 5.6 };
BIG.ox = 960 - 47.25 * BIG.u;
BIG.oy = 540 - 49.5 * BIG.u;

function introIcon(c, b) {
  // icon square in screen space (x, y, size) — big until b9, then glides into the lockup
  const big = { x: BIG.ox, y: BIG.oy, s: 100 * BIG.u };
  const L = lockup(c);
  const q = ez(b, 9.0, 10.1, E.snap);
  return { x: lerp(big.x, L.ix, q), y: lerp(big.y, L.iy, q), s: lerp(big.s, L.is, q) };
}
let _lock = null;
function lockup(c) {
  if (_lock) return _lock;
  if (EN) {
    const eo = { f: F.grot, w: 700, s: 168, ls: -4 };
    const w1 = measure(c, 'Jo', eo), w2 = measure(c, 'Function', { ...eo, w: 400 });
    const ww = w1 + w2, is = 250, gap = 64;
    const x0 = 960 - (is + gap + ww) / 2;
    _lock = { w1, w2, ww, is, ix: x0, iy: 540 - is / 2, xl: x0 + is + gap, base: 572 };
    return _lock;
  }
  const wo = { f: F.ar, w: 700, s: 176, rtl: true };
  const w1 = measure(c, 'جو', wo), w2 = measure(c, 'فنكشن', { ...wo, w: 400 });
  const ww = w1 + w2, is = 250, gap = 70;
  const total = ww + gap + is, x0 = 960 - total / 2;
  _lock = { w1, w2, ww, is, ix: x0 + ww + gap, iy: 540 - is / 2, xr: x0 + ww, base: 560 };
  return _lock;
}

function drawIntro(c, lt) {
  const b = lt / B;
  const ic = introIcon(c, b);
  const u = ic.s / 100;
  const L = lockup(c);

  // --- zoom-through camera into the (orange) middle bar
  const zq = prog(b, 11.0, 12.0);
  const midC = [ic.x + 55.5 * u, ic.y + 52.25 * u];
  const antic = 1 - 0.035 * Math.sin(Math.PI * clamp(zq / 0.5));
  const Z = antic * Math.exp(Math.log(70) * E.inE(clamp((zq - 0.25) / 0.75)));
  c.save();
  if (zq > 0) scaleAbout(c, midC[0], midC[1], Z);

  if (b < 8) fillBG(c, C.ink);
  else {
    fillBG(c, C.paper);
    // ink world collapses into the app icon
    const q = ez(b, 8, 8.95, E.outE);
    const x = lerp(-60, ic.x, q), y = lerp(-60, ic.y, q), w = lerp(W + 120, ic.s, q), h = lerp(H + 120, ic.s, q);
    fillRR(c, x, y, w, h, lerp(0, ic.s * 0.24, q), C.ink);
    // shockwave
    const sq = prog(b, 8.55, 10.0);
    if (sq > 0 && sq < 1) {
      c.save();
      c.globalAlpha = 1 - sq;
      const ex = EN ? 230 : 320;
      strokeRR(c, ic.x - ex * E.outC(sq), ic.y - ex * E.outC(sq), ic.s + 2 * ex * E.outC(sq), ic.s + 2 * ex * E.outC(sq), ic.s * 0.24 + 200 * sq, C.ink, 3);
      c.restore();
    }
  }

  // --- phase A: the pulse dot + slate text (beats 0–4)
  if (b < 4.05) {
    const pop = E.outB2(prog(b, 0, 0.45));
    let bump = 0;
    for (let k = 0; k < 4; k++) bump += 0.5 * pulse(b - k, 5);
    for (let k = 0; k < 4; k++) {
      const rq = prog(b, k, k + 1.7);
      if (rq > 0 && rq < 1) {
        c.save(); c.globalAlpha = (1 - rq) * 0.7;
        circle(c, 960, 540, 20 + 300 * E.outC(rq)); c.strokeStyle = C.orange; c.lineWidth = 2; c.stroke();
        c.restore();
      }
    }
    // hop to the stem's base
    const hq = prog(b, 3.35, 4.0);
    const land = [BIG.ox + 50 * BIG.u, BIG.oy + (75.5 - 5.75) * BIG.u];
    const dx = lerp(960, land[0], hq);
    const dy = 540 + (land[1] - 540) * hq - 4 * 150 * hq * (1 - hq);
    const r = lerp(14, 5.75 * BIG.u, E.inQ(hq)) * pop * (1 + bump * (1 - hq));
    const stretch = 1 + 0.35 * Math.sin(Math.PI * hq);
    c.save();
    c.translate(dx, dy);
    c.scale(1 / Math.sqrt(stretch), stretch);
    fillCircle(c, 0, 0, r, hq > 0.9 ? mix(C.orange, C.paper, (hq - 0.9) / 0.1) : C.orange);
    c.restore();

    // slate
    const l1 = 'MOTION REEL', l2 = 'PREPARED FOR JOFUNCTION';
    const o1 = { f: F.mono, w: 500, s: 22, ls: 9, c: C.paper };
    const o2 = { f: F.mono, w: 400, s: 18, ls: 7, c: C.mute };
    const er = 1 - prog(b, 3.0, 3.35);
    const n1 = Math.floor(l1.length * prog(b, 0.35, 1.3) * er + 1e-6);
    const n2 = Math.floor(l2.length * prog(b, 1.35, 2.75) * er + 1e-6);
    const w1 = measure(c, l1, o1), w2 = measure(c, l2, o2);
    text(c, l1.slice(0, n1), 960 - w1 / 2, 650, o1);
    text(c, l2.slice(0, n2), 960 - w2 / 2, 690, o2);
    const caretOn = Math.floor(lt * 4) % 2 === 0 && b > 0.3 && b < 3.35;
    if (caretOn) {
      const onL2 = b > 1.35;
      const cw = onL2 ? measure(c, l2.slice(0, n2), o2) : measure(c, l1.slice(0, n1), o1);
      c.fillStyle = C.orange;
      c.fillRect((onL2 ? 960 - w2 / 2 : 960 - w1 / 2) + cw + 4, onL2 ? 674 : 630, 11, onL2 ? 20 : 24);
    }
  }

  // --- phase B: construction guides (beats 4–9)
  const ga = ez(b, 4, 4.6) * (1 - ez(b, 8.0, 8.6, E.lin));
  if (ga > 0) {
    c.save();
    c.globalAlpha = ga * 0.5;
    c.strokeStyle = C.mute;
    c.lineWidth = 1;
    const U = BIG.u, ox = BIG.ox, oy = BIG.oy;
    for (let i = 0; i < 4; i++) {
      const gp = ez(b, 4 + i, 4 + i + 0.9, E.outE);
      if (gp <= 0) continue;
      const bb = LB[i];
      c.beginPath();
      if (i === 0) {
        for (const xx of [bb.x, bb.x + bb.w]) {
          const X = ox + xx * U;
          c.moveTo(X, oy + 75.5 * U - (oy + 75.5 * U + 40) * gp); c.lineTo(X, oy + 75.5 * U + (H - oy - 75.5 * U + 40) * gp);
        }
      } else {
        for (const yy of [bb.y, bb.y + bb.h]) {
          const Y = oy + yy * U, X0 = ox + (bb.g === 'left' ? bb.x + bb.w : bb.x) * U;
          c.moveTo(X0 - (X0 + 40) * gp, Y); c.lineTo(X0 + (W - X0 + 40) * gp, Y);
        }
      }
      c.stroke();
      // cap construction circle
      c.beginPath();
      c.arc(ox + bb.cap[0] * U, oy + bb.cap[1] * U, 5.75 * U, 0, TAU * gp);
      c.stroke();
      // annotation
      const lbl = ['STEM 11.5 × 52', 'HOOK R 5.75', 'ARM 31.25', 'BAR 22.5'][i];
      const ap = [[ox + 58 * U, oy + 92 * U], [ox + 2 * U, oy + 92 * U], [ox + 80 * U, oy + 18 * U], [ox + 72 * U, oy + 56 * U]][i];
      text(c, lbl, ap[0], ap[1], { f: F.mono, w: 500, s: 13, ls: 2, c: C.mute, alpha: gp });
    }
    // rotating construction ring
    c.setLineDash([4, 10]);
    c.lineDashOffset = -lt * 30;
    circle(c, 960, 540, 410 * ez(b, 4, 5.2, E.outE));
    c.stroke();
    c.setLineDash([]);
    c.restore();
  }

  // --- the monogram bars (beats 4–8)
  if (b >= 3.98) {
    let kick = 0;
    for (let k = 4; k < 8; k++) kick += 0.022 * pulse(b - k, 5);
    c.save();
    c.translate(ic.x, ic.y);
    c.scale(u, u);
    if (b < 9) scaleAbout(c, 47.25, 49.5, 1 + kick);
    const midCol = mix(C.paper, C.orange, ez(b, 10.6, 11.0, E.outC));
    for (let i = 0; i < 4; i++) {
      const t0 = (4 + i) * B;
      const gp = (x) => i === 0 ? lerp(0.22, 1, E.outB2(prog(x, t0, t0 + 0.36))) : E.outB2(prog(x, t0, t0 + 0.36));
      if (lt < t0 - 0.06 && i > 0) continue;
      const rO = i === 0 ? [5.75, 5.75, lerp(5.75, 0, prog(lt, t0, t0 + 0.12)), lerp(5.75, 0, prog(lt, t0, t0 + 0.12))] : null;
      if (lt < t0 + 0.36) drawBar(c, LB[i], gp(lt + 0.07), C.orange, rO);
      drawBar(c, LB[i], gp(lt), i === 3 ? midCol : C.paper, rO);
      // sparks
      const sp = prog(lt, t0 + 0.2, t0 + 0.65);
      if (sp > 0 && sp < 1) {
        const [cx, cy] = LB[i].cap;
        c.save();
        c.globalAlpha = 1 - sp;
        c.strokeStyle = C.orange;
        c.lineWidth = 1.2;
        c.lineCap = 'round';
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * TAU + i;
          const r0 = 7 + 9 * E.outC(sp), r1 = r0 + 4 * (1 - sp) + 1;
          c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke();
        }
        c.restore();
      }
    }
    c.restore();
  }

  // --- phase C: Arabic wordmark lockup (beats 9.5–11)
  if (b > 9.4 && EN) {
    const eo = { f: F.grot, w: 700, s: 168, ls: -4 };
    wipeLTR(c, L.xl, L.base, L.ww, 168, ez(b, 9.55, 10.5, E.ioC), () => {
      text(c, 'Jo', L.xl, L.base, { ...eo, c: C.ink });
      text(c, 'Function', L.xl + L.w1, L.base, { ...eo, w: 400, c: C.deep });
    });
    revealText(c, 'Digital Services', L.xl + 4, L.base + 70, { f: F.grot, w: 500, s: 44, c: C.gray }, ez(b, 10.0, 10.8, E.outE));
    const jl = 'EIGHT DIVISIONS', jo = { f: F.mono, w: 500, s: 18, ls: 10, c: C.mute };
    text(c, jl.slice(0, Math.floor(jl.length * prog(b, 10.3, 10.9))), L.xl + 6, L.base - 158, jo);
  } else if (b > 9.4) {
    const wo = { f: F.ar, w: 700, s: 176, rtl: true, a: 'right' };
    wipeRTL(c, L.xr, L.base, L.ww, 176, ez(b, 9.55, 10.5, E.ioC), () => {
      text(c, 'جو', L.xr, L.base, { ...wo, c: C.ink });
      text(c, 'فنكشن', L.xr - L.w1, L.base, { ...wo, w: 400, c: C.deep });
    });
    revealText(c, 'للخدمات الرقمية', L.xr, L.base + 104, { f: F.ar, w: 500, s: 44, c: C.gray, a: 'right', rtl: true }, ez(b, 10.0, 10.8, E.outE));
    const jl = 'JOFUNCTION', jo = { f: F.mono, w: 500, s: 18, ls: 10, c: C.mute };
    const jn = Math.floor(jl.length * prog(b, 10.3, 10.9));
    text(c, jl.slice(0, jn), L.xr - measure(c, jl, jo), L.base - 178, jo);
  }
  c.restore();
}

/* ==========================================================================
   INDEX  (beats 12–16)  "08" slot counter + build
   ========================================================================== */
function counterValue(b) { return 18 * E.outE(prog(b, 12.25, 14.5)) ; }
function drawCount(c, lt) {
  const b = lt / B + 12;
  fillBG(c, C.orange);
  c.save();
  // collapse at the end of the build
  const cq = E.inB(prog(b, 15.2, 15.9));
  const push = 1 + 0.06 * prog(b, 12, 15.2);
  scaleAbout(c, 960, 540, push * (1 - cq));
  if (b > 14.6 && b < 15.9) {
    const j = (b - 14.6) * 3;
    c.translate(noise1(lt * 40) * j, noise1(lt * 40 + 9) * j);
  }
  // slot digits
  const dO = { f: F.grot, w: 700, s: 620, ls: -10 };
  const dw = measure(c, '0', dO) * 0.98;
  const x0 = 120, base = 838, lh = 560;
  const cols = [10 * E.outE(prog(b, 12.05, 13.4)), counterValue(b)];
  cols.forEach((v, k) => {
    const x = x0 + k * (dw + 6);
    c.save();
    c.beginPath(); c.rect(x - 10, base - 470, dw + 20, 500); c.clip();
    const n = Math.floor(v), f = v - n;
    for (const m of [n, n + 1]) {
      const y = base + (m - v) * lh;
      text(c, String(((m % 10) + 10) % 10), x, y, { ...dO, c: C.ink });
    }
    c.restore();
  });
  // titles
  const xr = 1800;
  if (EN) {
    const to = { f: F.grot, w: 700, s: 124, ls: -4, c: C.ink, a: 'right' };
    revealText(c, 'Our', xr, 384, to, ez(b, 12.35, 13.2, E.outE));
    revealText(c, 'Divisions', xr, 508, to, ez(b, 12.5, 13.35, E.outE));
    revealText(c, 'Eight divisions. One function.', xr, 590, { f: F.grot, w: 500, s: 46, c: C.ink, a: 'right' }, ez(b, 12.85, 13.7, E.outE));
  } else {
  revealText(c, 'الأقسام الثمانية', xr, 470, { f: F.ar, w: 700, s: 124, c: C.ink, a: 'right', rtl: true }, ez(b, 12.35, 13.2, E.outE));
  revealText(c, 'ثمانية أقسام. وظيفة واحدة.', xr, 572, { f: F.ar, w: 500, s: 52, c: C.ink, a: 'right', rtl: true }, ez(b, 12.85, 13.7, E.outE));
  }
  const en = EN ? 'JOFUNCTION — DIVISION INDEX' : 'EIGHT DIVISIONS · ONE FUNCTION', eo = { f: F.mono, w: 500, s: 21, ls: 6, c: C.ink };
  const ew = measure(c, en, eo);
  text(c, en.slice(0, Math.floor(en.length * prog(b, 13.3, 14.2))), xr - ew, EN ? 650 : 640, { ...eo, alpha: 0.8 });
  // 8 loading pills, filling right-to-left on 16ths
  for (let i = 0; i < 8; i++) {
    const x = xr - 52 - (EN ? 7 - i : i) * 62, y = 712;
    const ap = ez(b, 13.6 + i * 0.05, 14.0 + i * 0.05, E.outB2);
    if (ap <= 0) continue;
    c.save(); scaleAbout(c, x + 26, y + 8, ap);
    strokeRR(c, x, y, 52, 16, 8, C.ink, 2);
    const fp = ez(b, 14 + i * 0.25, 14 + i * 0.25 + 0.2, E.outC);
    fillRR(c, x, y, 52 * fp, 16, 8, C.ink);
    c.restore();
  }
  c.restore();
  // the dot everything collapses into
  const dq = prog(b, 15.5, 15.95);
  if (dq > 0) fillCircle(c, 960, 540, 22 * E.outB2(dq) * (1 + 0.25 * Math.sin(lt * 50)), C.ink);
}

/* ==========================================================================
   01 — CLIENT SERVICES   (white-label: same build, re-skinned per client)
   ========================================================================== */
const CLIENT_PAL = [C.orange, '#2F6BFF', '#00A86B', '#7B4DFF', '#E6007E'];
function drawD01(c, lt) {
  const b = lt / B, d = DIVS[0];
  fillBG(c, C.paper);
  bigNum(c, d.n, lt, C.ink);
  c.save();
  settle(c, lt);
  const sw = [2, 2.5, 3, 3.5];
  let k = 0;
  for (const s of sw) if (b >= s) k++;
  const acc = k > 0 ? mix(CLIENT_PAL[k - 1], CLIENT_PAL[k], ez(b, sw[k - 1], sw[k - 1] + 0.22, E.outC)) : CLIENT_PAL[0];
  const bump = k > 0 ? pulse(b - sw[k - 1], 7) : 0;

  const bx = 140, by = 222, bw = 760, bh = 500, br = 22;
  const pd = ez(b, 0, 0.85, E.ioC);
  // window
  fillRR(c, bx + 10, by + 16, bw, bh, br, rgba(C.ink, 0.06 * pd));
  withAlpha(c, ez(b, 0.45, 0.85), () => fillRR(c, bx, by, bw, bh, br, C.white));
  c.save();
  rr(c, bx, by, bw, bh, br);
  const per = rrPerimeter(bw, bh, br);
  c.setLineDash([per * pd, per]);
  c.strokeStyle = C.ink; c.lineWidth = 3; c.stroke();
  c.restore();
  withAlpha(c, pd, () => { c.fillStyle = rgba(C.ink, 0.12); c.fillRect(bx, by + 56, bw * pd, 2); });
  for (let i = 0; i < 3; i++) {
    const s = E.outB2(prog(b, 0.45 + i * 0.07, 0.8 + i * 0.07));
    fillCircle(c, bx + 30 + i * 24, by + 28, 7 * s, i === 0 ? C.orange : C.line);
  }
  const up = ez(b, 0.55, 1.0, E.outE);
  fillRR(c, bx + 120, by + 16, 300 * up, 24, 12, C.sand);
  text(c, 'https://client-brand.com', bx + 136, by + 33, { f: F.mono, w: 400, s: 12, c: C.gray, alpha: prog(b, 0.8, 1.0) });

  const els = [
    () => clientLogo(c, bx + 56, by + 104, 16, k, acc),
    () => { for (let i = 0; i < 3; i++) fillRR(c, bx + bw - 230 + i * 70, by + 99, 50, 10, 5, rgba(C.ink, 0.18)); },
    () => fillRR(c, bx + 40, by + 152, 320, 28, 7, C.ink),
    () => fillRR(c, bx + 40, by + 192, 236, 28, 7, C.ink),
    () => { fillRR(c, bx + 40, by + 242, 290, 10, 5, rgba(C.ink, 0.18)); fillRR(c, bx + 40, by + 262, 220, 10, 5, rgba(C.ink, 0.18)); },
    () => { fillRR(c, bx + 40, by + 296, 156, 46, 23, acc); fillRR(c, bx + 70, by + 314, 96, 10, 5, rgba(C.white, 0.85)); },
    () => {
      fillRR(c, bx + 410, by + 120, 310, 222, 18, acc);
      c.save(); rr(c, bx + 410, by + 120, 310, 222, 18); c.clip();
      fillCircle(c, bx + 640, by + 250, 120 + bump * 20, rgba(C.white, 0.22));
      fillCircle(c, bx + 500, by + 170, 44, rgba(C.white, 0.3));
      c.restore();
    },
    () => cardEl(c, bx + 40, by + 374, acc),
    () => cardEl(c, bx + 273, by + 374, acc),
    () => cardEl(c, bx + 506, by + 374, acc)
  ];
  const ctr = [[56, 104], [bw - 160, 104], [200, 166], [158, 206], [185, 257], [118, 319], [565, 231], [146, 424], [379, 424], [612, 424]];
  els.forEach((fn, j) => {
    const q = prog(b, 0.75 + j * 0.12, 0.75 + j * 0.12 + 0.6);
    if (q <= 0) return;
    c.save();
    c.globalAlpha *= clamp(q * 4);
    scaleAbout(c, bx + ctr[j][0], by + ctr[j][1], lerp(0.55, 1, E.outB2(q)) * (j === 6 ? 1 + bump * 0.04 : 1));
    fn();
    c.restore();
  });

  // phone
  const px = 790, py = 330, pw = 232, ph = 462;
  const sp = spring(lt - 1.2 * B, 1.7, 6.2);
  if (sp > 0) {
    c.save();
    c.translate(0, (1 - sp) * 820);
    c.translate(px + pw / 2, py + ph / 2); c.rotate((1 - sp) * 0.25); c.translate(-px - pw / 2, -py - ph / 2);
    fillRR(c, px + 12, py + 18, pw, ph, 40, rgba(C.ink, 0.1));
    fillRR(c, px, py, pw, ph, 40, C.ink);
    fillRR(c, px + 10, py + 10, pw - 20, ph - 20, 31, C.white);
    c.save(); rr(c, px + 10, py + 10, pw - 20, ph - 20, 31); c.clip();
    c.fillStyle = acc; c.fillRect(px + 10, py + 10, pw - 20, 84);
    clientLogo(c, px + 44, py + 66, 11, k, C.white);
    fillRR(c, px + 66, py + 60, 80, 10, 5, rgba(C.white, 0.85));
    const bub = (bb, x, y, w, col, left) => {
      const q = prog(b, bb, bb + 0.5);
      if (q <= 0) return;
      c.save(); scaleAbout(c, left ? x : x + w, y + 44, E.outB2(q));
      fillRR(c, x, y, w, 44, 18, col);
      c.restore();
    };
    bub(1.9, px + 26, py + 116, 150, C.sand, true);
    bub(2.4, px + pw - 26 - 132, py + 174, 132, acc, false);
    bub(2.9, px + 26, py + 232, 84, C.sand, true);
    if (b > 3.1) for (let i = 0; i < 3; i++) fillCircle(c, px + 50 + i * 18, py + 254 - 5 * Math.max(0, Math.sin(lt * 12 - i * 0.9)), 4.5, C.mute);
    strokeRR(c, px + 24, py + ph - 76, pw - 48, 44, 22, rgba(C.ink, 0.15), 1.5);
    c.restore();
    fillRR(c, px + pw / 2 - 40, py + 20, 80, 22, 11, C.ink);
    c.restore();
  }

  // caption + client swatches
  const cap = 'THEIR BRAND. OUR BUILD.', co = { f: F.mono, w: 500, s: 18, ls: 4, c: C.ink };
  text(c, cap.slice(0, Math.floor(cap.length * prog(b, 1.8, 2.6))), bx, by + bh + 74, co);
  for (let i = 0; i < 5; i++) {
    const q = E.outB2(prog(b, 1.9 + i * 0.06, 2.3 + i * 0.06));
    fillCircle(c, bx + 500 + i * 34, by + bh + 67, 9 * q, CLIENT_PAL[i]);
  }
  if (b > 2.2) {
    const kk = Math.min(k, 4), prevK = Math.max(0, kk - 1);
    const mv = k > 0 ? E.outB(prog(b, sw[k - 1], sw[k - 1] + 0.4)) : 1;
    const rx = bx + 500 + lerp(prevK, kk, mv) * 34;
    circle(c, rx, by + bh + 67, 15); c.strokeStyle = C.ink; c.lineWidth = 2; c.stroke();
  }
  c.restore();
  divHeader(c, lt, d, { fg: C.ink, sub: C.mute, acc: C.orange, chipStroke: C.line, chipC: C.body, chipW: 700, chipWEn: 560, bg: C.paper });
}
function clientLogo(c, x, y, r, k, col) {
  c.fillStyle = col;
  c.beginPath();
  switch (k % 5) {
    case 0: c.arc(x, y, r, 0, TAU); break;
    case 1: c.roundRect(x - r, y - r, r * 2, r * 2, r * 0.45); break;
    case 2: c.moveTo(x, y - r * 1.2); c.lineTo(x + r * 1.2, y); c.lineTo(x, y + r * 1.2); c.lineTo(x - r * 1.2, y); c.closePath(); break;
    case 3: c.moveTo(x, y - r * 1.15); c.lineTo(x + r * 1.15, y + r * 0.9); c.lineTo(x - r * 1.15, y + r * 0.9); c.closePath(); break;
    default: c.arc(x, y, r, 0, TAU); c.arc(x, y, r * 0.5, 0, TAU, true);
  }
  c.fill();
}
function cardEl(c, x, y, acc) {
  fillRR(c, x, y, 213, 100, 14, C.sand);
  fillCircle(c, x + 30, y + 32, 13, acc);
  fillRR(c, x + 54, y + 26, 120, 10, 5, rgba(C.ink, 0.25));
  fillRR(c, x + 22, y + 64, 168, 8, 4, rgba(C.ink, 0.12));
}

/* ==========================================================================
   02 — OUR PRODUCTS   (ten independent brands, each with its own mark)
   ========================================================================== */
const PRODUCTS = [
  { n: 'CodePath', c: '#2F6BFF', g: 'code' },
  { n: 'Faz3at_E5tebar', c: '#7B4DFF', g: 'spark' },
  { n: 'Dabt', c: '#00A86B', g: 'clock' },
  { n: 'Reppio', c: '#FF3B5C', g: 'dumbbell' },
  { n: 'Stackgrove', c: '#1F6F4A', g: 'stack' },
  { n: 'Fluentro', c: '#00A3FF', g: 'chat' },
  { n: 'Nima', c: '#FFB800', g: 'bowl', fg: C.ink },
  { n: 'JoFunction', c: C.ink, g: 'logo' },
  { n: 'Gridkin', c: '#E6007E', g: 'grid' },
  { n: 'Hangwave', c: '#FFE600', g: 'wave', fg: C.ink }
];
function productMark(c, p, lt) {
  const fg = p.fg || C.white;
  c.strokeStyle = fg; c.fillStyle = fg; c.lineWidth = 8; c.lineCap = 'round'; c.lineJoin = 'round';
  switch (p.g) {
    case 'code':
      c.beginPath(); c.moveTo(33, 34); c.lineTo(18, 50); c.lineTo(33, 66); c.moveTo(67, 34); c.lineTo(82, 50); c.lineTo(67, 66); c.moveTo(56, 28); c.lineTo(44, 72); c.stroke(); break;
    case 'spark': {
      const st = (x, y, R) => { c.beginPath(); c.moveTo(x, y - R); c.quadraticCurveTo(x, y, x + R, y); c.quadraticCurveTo(x, y, x, y + R); c.quadraticCurveTo(x, y, x - R, y); c.quadraticCurveTo(x, y, x, y - R); c.fill(); };
      st(45, 55, 30); st(74, 27, 12 + 2 * Math.sin(lt * 8)); break;
    }
    case 'clock': {
      circle(c, 50, 50, 30); c.stroke();
      const a = lt * 5;
      c.beginPath(); c.moveTo(50, 50); c.lineTo(50 + Math.sin(a) * 20, 50 - Math.cos(a) * 20); c.moveTo(50, 50); c.lineTo(50 + Math.sin(a / 12 + 2) * 13, 50 - Math.cos(a / 12 + 2) * 13); c.stroke(); break;
    }
    case 'dumbbell':
      fillRR(c, 28, 46, 44, 8, 3, fg); fillRR(c, 20, 30, 11, 40, 4, fg); fillRR(c, 69, 30, 11, 40, 4, fg); fillRR(c, 11, 37, 9, 26, 3, fg); fillRR(c, 80, 37, 9, 26, 3, fg); break;
    case 'stack':
      c.lineWidth = 6;
      for (let k = 2; k >= 0; k--) {
        const y = 36 + k * 13;
        poly(c, [[50, y - 14], [78, y], [50, y + 14], [22, y]]);
        c.fillStyle = k === 0 ? fg : p.c; c.fill(); c.stroke();
      }
      break;
    case 'chat':
      c.lineWidth = 6;
      rr(c, 16, 22, 48, 34, 11); c.stroke();
      fillRR(c, 38, 46, 46, 32, 11, fg);
      poly(c, [[70, 76], [78, 86], [62, 76]]); c.fill(); break;
    case 'bowl':
      c.beginPath(); c.arc(50, 52, 32, 0, Math.PI); c.closePath(); c.fill();
      c.lineWidth = 5;
      for (let k = 0; k < 3; k++) {
        const x = 36 + k * 14, ph = lt * 6 + k;
        c.beginPath(); c.moveTo(x, 44);
        c.bezierCurveTo(x + 6 * Math.sin(ph), 36, x - 6 * Math.sin(ph), 28, x, 18); c.stroke();
      }
      break;
    case 'logo':
      drawGlyph(c, null, C.paper);
      break;
    case 'grid':
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) fillRR(c, 19 + i * 22, 19 + j * 22, 18, 18, 5, fg);
      break;
    case 'wave':
      c.lineWidth = 7;
      for (const yy of [40, 60]) {
        c.beginPath();
        for (let x = 18; x <= 82; x += 2) { const y = yy + 8 * Math.sin((x / 64) * TAU * 1.2 + lt * 6 + yy); x === 18 ? c.moveTo(x, y) : c.lineTo(x, y); }
        c.stroke();
      }
      break;
  }
}
function drawD02(c, lt) {
  const b = lt / B, d = DIVS[1];
  fillBG(c, C.ink);
  bigNum(c, d.n, lt, C.paper, 0.09);
  c.save();
  settle(c, lt);
  const S = 128, gx = 40, gy = 104, x0 = 140, y0 = 312;
  const shine = prog(b, 2.1, 3.0);
  PRODUCTS.forEach((p, i) => {
    const col = i % 5, row = Math.floor(i / 5);
    const cx = x0 + col * (S + gx) + S / 2, cy = y0 + row * (S + gy) + S / 2;
    const dl = 0.15 * B + col * 0.055 + row * 0.11;
    const x = lt - dl;
    if (x <= 0) return;
    const sx = spring(x, 1.9, 6.5), sy = E.outB2(clamp(x / 0.32));
    const bob = 7 * Math.sin(TAU * (lt * 0.9 - col * 0.13 - row * 0.21)) * ez(lt, dl + 0.3, dl + 0.8);
    const lift = (1 - E.outC(clamp(x / 0.4))) * 70;
    c.save();
    c.translate(cx, cy + bob + lift);
    c.rotate((1 - spring(x, 1.4, 6)) * 0.35);
    c.scale(Math.max(0.001, sx), sy);
    c.translate(-S / 2, -S / 2);
    c.scale(S / 100, S / 100);
    rr(c, 0, 0, 100, 100, 24);
    c.fillStyle = p.c; c.fill();
    if (p.g === 'logo') { c.strokeStyle = C.ink3; c.lineWidth = 2; c.stroke(); }
    c.save(); rr(c, 0, 0, 100, 100, 24); c.clip();
    productMark(c, p, lt);
    if (shine > 0 && shine < 1) {
      const sxp = lerp(-200, 900, shine) - (cx - x0);
      c.save();
      c.translate(sxp, 0); c.rotate(0.45);
      const g = c.createLinearGradient(-30, 0, 30, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.42)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(-30, -200, 60, 400);
      c.restore();
    }
    c.restore();
    c.restore();
    const na = ez(x, 0.15, 0.45, E.outC);
    text(c, p.n, cx, cy + S / 2 + 38 + (1 - na) * 14 + bob, { f: F.plex, w: 500, s: 17, c: C.paper, a: 'center', alpha: na * 0.85 });
  });
  // focus ring on the house brand
  const fr = prog(b, 2.8, 3.6);
  if (fr > 0) {
    const i = 7, col = i % 5, row = 1;
    const cx = x0 + col * (S + gx) + S / 2, cy = y0 + row * (S + gy) + S / 2;
    const s = lerp(1.5, 1.12, E.outE(fr));
    c.save(); c.globalAlpha = clamp(fr * 3);
    strokeRR(c, cx - (S * s) / 2, cy - (S * s) / 2, S * s, S * s, 30 * s, C.orange, 3);
    c.restore();
  }
  c.restore();
  divHeader(c, lt, d, { fg: C.paper, sub: C.mute, body: '#B9B3AB', acc: C.orange, bg: C.ink });
}

/* ==========================================================================
   03 — ADVERTISING   (parallax city, car-top screen, split-flap billboard)
   ========================================================================== */
const CITY = (() => {
  const R = mulberry32(31);
  const mk = (n, wmin, wmax, hmin, hmax, gap) => {
    const arr = []; let x = 0;
    for (let i = 0; i < n; i++) {
      const w = lerp(wmin, wmax, R()), h = lerp(hmin, hmax, R());
      arr.push({ x, w, h, s: R() * 1000, ant: R() < 0.3, roof: R() });
      x += w + R() * gap;
    }
    return { arr, len: x };
  };
  return { far: mk(36, 80, 170, 150, 320, 6), mid: mk(26, 120, 210, 150, 300, 30) };
})();
function cityLayer(c, L, off, ground, col, windows, lt) {
  const o = ((off % L.len) + L.len) % L.len;
  for (const rep of [0, L.len]) {
    for (const bd of L.arr) {
      const x = bd.x - o + rep;
      if (x > W + 20 || x + bd.w < -20) continue;
      c.fillStyle = col;
      c.fillRect(x, ground - bd.h, bd.w, bd.h + 2);
      if (bd.ant) c.fillRect(x + bd.w * 0.3, ground - bd.h - 34, 4, 34);
      if (bd.roof > 0.6) c.fillRect(x + 10, ground - bd.h - 14, bd.w * 0.4, 14);
      if (windows) {
        c.fillStyle = rgba(C.paper, 0.16);
        for (let wy = ground - bd.h + 22; wy < ground - 30; wy += 30) {
          for (let wx = x + 14; wx < x + bd.w - 20; wx += 26) {
            const hv = hash(bd.s + wx * 0.13 + wy * 0.71);
            if (hv > 0.55) { c.globalAlpha = hv > 0.93 ? 0.5 + 0.5 * Math.sin(lt * 9 + hv * 20) : 1; c.fillRect(wx, wy, 12, 14); }
          }
        }
        c.globalAlpha = 1;
      }
    }
  }
}
function adCreative(c, k, x, y, w, h) {
  switch (k % 3) {
    case 0:
      c.fillStyle = C.paper; c.fillRect(x, y, w, h);
      if (EN) {
        text(c, 'YOUR BRAND HERE', x + w / 2, y + h / 2 + 12, { f: F.grot, w: 700, s: 36, ls: -1, c: C.ink, a: 'center' });
        text(c, 'AD SPACE AVAILABLE', x + w / 2, y + h - 22, { f: F.mono, w: 600, s: 13, ls: 4, c: C.orange, a: 'center' });
        break;
      }
      text(c, 'إعلانك هنا', x + w / 2, y + h / 2 + 8, { f: F.ar, w: 700, s: 46, c: C.ink, a: 'center', rtl: true });
      text(c, 'YOUR AD HERE', x + w / 2, y + h - 22, { f: F.mono, w: 600, s: 13, ls: 4, c: C.orange, a: 'center' });
      break;
    case 1:
      c.fillStyle = C.ink; c.fillRect(x, y, w, h);
      bottle(c, x + 70, y + h / 2 + 4, 0.9);
      if (EN) {
        text(c, 'WATER', x + w - 36, y + h / 2 + 8, { f: F.grot, w: 700, s: 46, c: C.paper, a: 'right' });
        text(c, 'FREE · BRANDED', x + w - 36, y + h / 2 + 40, { f: F.mono, w: 600, s: 12, ls: 3, c: C.orange, a: 'right' });
        break;
      }
      text(c, 'مياه', x + w - 36, y + h / 2 + 4, { f: F.ar, w: 700, s: 50, c: C.paper, a: 'right', rtl: true });
      text(c, 'BRANDED WATER', x + w - 36, y + h / 2 + 40, { f: F.mono, w: 600, s: 12, ls: 3, c: C.orange, a: 'right' });
      break;
    default:
      c.fillStyle = C.deep; c.fillRect(x, y, w, h);
      drawIcon(c, x + 70, y + h / 2, 76, { bg: C.ink });
      text(c, 'JOFUNCTION', x + 124, y + h / 2 + 8, { f: F.grot, w: 700, s: 30, ls: 1, c: C.paper });
  }
}
function bottle(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  fillRR(c, -11, -66, 22, 12, 3, C.orange);
  fillRR(c, -16, -56, 32, 14, 6, rgba(C.paper, 0.9));
  fillRR(c, -26, -44, 52, 104, 14, rgba(C.paper, 0.9));
  fillRR(c, -26, -6, 52, 30, 0, C.orange);
  c.restore();
}
function drawD03(c, lt) {
  const b = lt / B, d = DIVS[2];
  fillBG(c, C.orange);
  bigNum(c, d.n, lt, C.ink, 0.08);
  c.save();
  settle(c, lt, 0.04);
  const ground = 930;
  const speed = 1 + 0.4 * pulse(b - 0, 2);
  cityLayer(c, CITY.far, 300 + lt * 45, ground, mix(C.orange, C.ink, 0.22), false, lt);
  // sun-less sky haze band
  cityLayer(c, CITY.mid, 900 + lt * 110 * speed, ground, mix(C.orange, C.ink, 0.62), true, lt);

  // billboard on the mid layer
  const bbx = 760 - lt * 110 * speed + 60, bby = 560, bbw = 330, bbh = 176;
  c.fillStyle = mix(C.orange, C.ink, 0.75);
  c.fillRect(bbx + 50, bby + bbh, 12, ground - bby - bbh);
  c.fillRect(bbx + bbw - 62, bby + bbh, 12, ground - bby - bbh);
  fillRR(c, bbx - 8, bby - 8, bbw + 16, bbh + 16, 6, C.ink);
  const slats = 6, shH = bbh / slats;
  for (let j = 0; j < slats; j++) {
    let k = 0, q = 0;
    for (let f = 1; f <= 3; f++) {
      const t0 = (f + j * 0.045) * B;
      if (lt >= t0) { k = f - 1; q = prog(lt, t0, t0 + 0.2); }
    }
    const showNew = q >= 0.5, ang = Math.abs(Math.cos(Math.PI * q));
    const kk = showNew ? k + 1 : k;
    c.save();
    c.beginPath(); c.rect(bbx, bby + j * shH, bbw, shH + 0.5); c.clip();
    scaleAbout(c, bbx + bbw / 2, bby + j * shH + shH / 2, 1, Math.max(0.02, ang));
    adCreative(c, kk, bbx, bby, bbw, bbh);
    if (q > 0 && q < 1) { c.fillStyle = rgba(C.ink, 0.35 * (1 - ang)); c.fillRect(bbx, bby, bbw, bbh); }
    c.restore();
  }

  // road
  c.fillStyle = C.ink;
  c.fillRect(-100, ground, W + 200, H - ground + 100);
  const dash = (lt * 1100) % 170;
  c.fillStyle = rgba(C.paper, 0.5);
  for (let x = -dash; x < W; x += 170) c.fillRect(x, 1000, 90, 6);
  // street lights (near layer)
  const sl = (lt * 760) % 620;
  for (let x = W + 200 - sl - 620 * 3; x < W + 200; x += 620) {
    c.fillStyle = C.ink;
    c.fillRect(x, 640, 8, ground - 640);
    c.fillRect(x - 40, 640, 48, 8);
    fillRR(c, x - 52, 644, 30, 10, 5, C.paper);
  }
  // speed lines
  c.fillStyle = rgba(C.paper, 0.4);
  for (let i = 0; i < 9; i++) {
    const y = 640 + hash(i * 3.3) * 270, len = 60 + hash(i) * 140;
    const x = W - (((lt * 1900 + hash(i * 9.1) * 3000) % (W + 600)));
    c.fillRect(x, y, len, 2);
  }
  // car
  const cx = lerp(-420, 560, ez(lt, 0, 0.75, E.outE));
  const cy = 2 * Math.sin(lt * 27) + 6 * wobble(lt - 0.5, 2.5, 5);
  c.save();
  c.translate(0, cy);
  c.translate(cx, 0);
  // headlight beam
  const beam = c.createLinearGradient(180, 0, 520, 0);
  beam.addColorStop(0, rgba(C.paper, 0.35)); beam.addColorStop(1, rgba(C.paper, 0));
  c.fillStyle = beam;
  poly(c, [[178, 858], [520, 820], [520, 925], [178, 872]]); c.fill();
  // body
  poly(c, [[-112, 846], [-72, 790], [86, 790], [134, 846]]); c.fillStyle = C.paper; c.fill();
  poly(c, [[-96, 842], [-64, 800], [-6, 800], [-6, 842]]); c.fillStyle = C.ink; c.fill();
  poly(c, [[6, 842], [6, 800], [78, 800], [114, 842]]); c.fill();
  fillRR(c, -186, 842, 372, 66, [20, 26, 14, 14], C.paper);
  c.fillStyle = C.orange; c.fillRect(-186, 868, 372, 9);
  fillRR(c, 172, 852, 12, 14, 3, C.amber);
  fillRR(c, -186, 852, 10, 14, 3, C.deep);
  for (const wx of [-112, 112]) {
    fillCircle(c, wx, 906, 29, C.ink);
    fillCircle(c, wx, 906, 12, C.mute);
    c.save(); c.translate(wx, 906); c.rotate(lt * 22);
    c.fillStyle = C.ink; c.fillRect(-12, -2, 24, 4); c.fillRect(-2, -12, 4, 24);
    c.restore();
  }
  // rooftop LED screen
  c.fillStyle = C.ink;
  c.fillRect(-52, 770, 8, 22); c.fillRect(44, 770, 8, 22);
  fillRR(c, -122, 704, 244, 70, 12, C.ink);
  strokeRR(c, -122, 704, 244, 70, 12, C.paper, 3);
  c.save();
  c.beginPath(); c.rect(-112, 712, 224, 54); c.clip();
  const segs = EN ? [['YOUR AD HERE', { f: F.grot, w: 700, s: 26, c: C.orange }], ['•', { f: F.grot, w: 700, s: 24, c: C.paper }], ['ADVERTISE WITH US', { f: F.grot, w: 700, s: 26, c: C.paper }], ['•', { f: F.grot, w: 700, s: 24, c: C.paper }]] : [['إعلانك هنا', { f: F.ar, w: 700, s: 30, rtl: true, c: C.orange }], ['•', { f: F.grot, w: 700, s: 24, c: C.paper }], ['YOUR AD HERE', { f: F.grot, w: 700, s: 26, c: C.paper }], ['•', { f: F.grot, w: 700, s: 24, c: C.paper }]];
  const sw = segs.map(s => measure(c, s[0], s[1]) + 22);
  const tot = sw.reduce((a, v) => a + v, 0);
  let mx = -112 - ((lt * 240) % tot);
  for (let rep = 0; rep < 3; rep++) {
    segs.forEach((s, i) => { text(c, s[0], mx, 750, { ...s[1], a: 'left' }); mx += sw[i]; });
  }
  c.restore();
  c.restore();
  c.restore();
  divHeader(c, lt, d, { fg: C.ink, sub: rgba(C.ink, 0.7), acc: C.paper, chipStroke: rgba(C.ink, 0.5), chipC: C.ink, y0: 214, bg: C.orange });
}

/* ==========================================================================
   04 — THE STORE   (bag drop, product burst, add-to-cart micro-interaction)
   ========================================================================== */
const CLICKS = [2.0, 2.5, 3.0];
function drawD04(c, lt) {
  const b = lt / B, d = DIVS[3];
  fillBG(c, C.sand);
  bigNum(c, d.n, lt, C.ink, 0.06);
  c.save();
  settle(c, lt, 0.04);
  const cx = 480, floor = 836, tl = 0.5 * B;
  // shadow
  const fall = E.inQ(clamp(lt / tl));
  const off = lerp(-900, 0, fall);
  const sh = clamp(1 + off / 900);
  c.save();
  c.globalAlpha = 0.14 * sh;
  c.beginPath(); c.ellipse(cx, floor + 6, 170 * (0.5 + 0.5 * sh), 16 * sh, 0, 0, TAU); c.fillStyle = C.ink; c.fill();
  c.restore();
  // bag
  const dev = wobble(lt - tl, 2.6, 7);
  const sy = lt < tl ? 1.06 : 1 - 0.22 * dev, sx = lt < tl ? 0.95 : 1 + 0.16 * dev;
  c.save();
  c.translate(cx, floor + off);
  c.scale(sx, sy);
  c.translate(-cx, -floor);
  c.lineWidth = 6; c.strokeStyle = C.ink;
  c.beginPath(); c.arc(cx - 58, 512, 40, Math.PI, TAU); c.stroke();
  c.beginPath(); c.arc(cx + 58, 512, 40, Math.PI, TAU); c.stroke();
  fillRR(c, cx - 155, 506, 310, 330, [6, 6, 14, 14], C.paper);
  strokeRR(c, cx - 155, 506, 310, 330, [6, 6, 14, 14], C.ink, 3);
  c.fillStyle = C.line; c.fillRect(cx - 153, 508, 306, 26);
  drawIcon(c, cx, 676, 116, { bg: C.ink });
  text(c, 'JOFUNCTION STORE', cx, 782, { f: F.mono, w: 600, s: 14, ls: 4, c: C.ink, a: 'center' });
  c.restore();

  // product burst
  const items = [
    { tx: 210, ty: 380, r: -0.18, draw: isoBox },
    { tx: 478, ty: 300, r: 0.08, draw: fileCard },
    { tx: 745, ty: 392, r: 0.16, draw: priceTag }
  ];
  items.forEach((it, i) => {
    const t0 = (1.0 + i * 0.12) * B, q = prog(lt, t0, t0 + 0.5);
    if (q <= 0) return;
    const e = E.outC(q);
    const x = lerp(cx, it.tx, e), y = lerp(520, it.ty, e) - 150 * Math.sin(Math.PI * e) + 9 * Math.sin(TAU * (lt * 0.8 + i * 0.3)) * q;
    c.save();
    c.translate(x, y);
    c.rotate(it.r * e + 0.05 * Math.sin(lt * 2 + i));
    c.scale(lerp(0.3, 1, E.outB2(q)), lerp(0.3, 1, E.outB2(q)));
    it.draw(c);
    c.restore();
  });

  // cart icon + badge
  const ca = E.outB2(prog(b, 1.4, 1.85));
  if (ca > 0) {
    c.save();
    c.translate(176, 248);
    c.scale(ca, ca);
    c.strokeStyle = C.ink; c.lineWidth = 6; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-50, -34); c.lineTo(-32, -34); c.lineTo(-16, 18); c.lineTo(36, 18); c.lineTo(48, -18); c.lineTo(-26, -18); c.stroke();
    fillCircle(c, -8, 36, 8, C.ink); fillCircle(c, 30, 36, 8, C.ink);
    let n = 0, last = -9;
    CLICKS.forEach(cb => { const ar = cb * B + 0.25; if (lt >= ar) { n++; last = ar; } });
    if (n > 0) {
      const bp = spring(lt - last, 2.5, 7);
      c.save(); c.translate(44, -38); c.scale(0.6 + 0.4 * bp, 0.6 + 0.4 * bp);
      fillCircle(c, 0, 0, 20, C.orange);
      text(c, String(n), 0, 8, { f: F.grot, w: 700, s: 22, c: C.white, a: 'center' });
      c.restore();
    }
    c.restore();
  }

  // add-to-cart button
  const ba = E.outB2(prog(b, 1.2, 1.65));
  if (ba > 0) {
    let press = 0;
    CLICKS.forEach(cb => { press += pulse(lt - cb * B, 14); });
    c.save();
    scaleAbout(c, cx, 940, ba * (1 - 0.06 * clamp(press)));
    fillRR(c, cx - 170, 902, 340, 76, 38, C.ink);
    c.save(); rr(c, cx - 170, 902, 340, 76, 38); c.clip();
    CLICKS.forEach(cb => {
      const q = prog(lt, cb * B, cb * B + 0.45);
      if (q > 0 && q < 1) fillCircle(c, cx + 22, 944, 230 * E.outC(q), rgba(C.paper, 0.28 * (1 - q)));
    });
    c.restore();
    if (EN) text(c, 'Add to Cart', cx, 950, { f: F.grot, w: 600, s: 28, c: C.paper, a: 'center' });
    else text(c, 'أضف إلى السلة', cx, 950, { f: F.ar, w: 600, s: 28, c: C.paper, a: 'center', rtl: true });
    c.restore();
  }
  // flying dots to cart
  CLICKS.forEach(cb => {
    const q = prog(lt, cb * B, cb * B + 0.25);
    if (q <= 0 || q >= 1) return;
    const e = E.ioC(q);
    const x = (1 - e) * (1 - e) * cx + 2 * (1 - e) * e * 260 + e * e * 220;
    const y = (1 - e) * (1 - e) * 920 + 2 * (1 - e) * e * 420 + e * e * 214;
    fillCircle(c, x, y, lerp(11, 6, e), C.orange);
  });
  // cursor
  const cq = ez(b, 1.3, 1.9, E.snap);
  if (cq > 0) {
    let dip = 0;
    CLICKS.forEach(cb => { dip += pulse(lt - cb * B, 16); });
    const x = lerp(1010, cx + 30, cq) + 40 * ez(b, 3.3, 3.9, E.ioC), y = lerp(1150, 948, cq) + 30 * ez(b, 3.3, 3.9, E.ioC);
    c.save();
    c.translate(x, y); const ds = 1 - 0.15 * clamp(dip); c.scale(ds, ds);
    poly(c, [[0, 0], [0, 36], [9, 28], [16, 43], [23, 40], [16, 25], [28, 25]]);
    c.fillStyle = C.paper; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.lineJoin = 'round'; c.stroke();
    c.restore();
  }
  c.restore();
  divHeader(c, lt, d, { fg: C.ink, sub: C.mute, body: C.body, acc: C.orange, bg: C.sand });
}
function isoBox(c) {
  const s = 64, k = 0.866;
  poly(c, [[0, -s], [s * k, -s / 2], [0, 0], [-s * k, -s / 2]]); c.fillStyle = C.amber; c.fill();
  poly(c, [[-s * k, -s / 2], [0, 0], [0, s], [-s * k, s / 2]]); c.fillStyle = C.orange; c.fill();
  poly(c, [[0, 0], [s * k, -s / 2], [s * k, s / 2], [0, s]]); c.fillStyle = C.deep; c.fill();
  c.strokeStyle = rgba(C.ink, 0.25); c.lineWidth = 6;
  c.beginPath(); c.moveTo(-s * k / 2, -s * 0.75); c.lineTo(s * k / 2, -s * 0.25); c.stroke();
}
function fileCard(c) {
  poly(c, [[-46, -60], [18, -60], [46, -32], [46, 60], [-46, 60]]);
  c.fillStyle = C.white; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 3; c.lineJoin = 'round'; c.stroke();
  poly(c, [[18, -60], [18, -32], [46, -32]]); c.fillStyle = C.line; c.fill(); c.stroke();
  for (let i = 0; i < 3; i++) fillRR(c, -30, -34 + i * 16, i === 2 ? 34 : 50, 7, 3.5, rgba(C.ink, 0.2));
  c.strokeStyle = C.orange; c.lineWidth = 6; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(0, 14); c.lineTo(0, 42); c.moveTo(-12, 31); c.lineTo(0, 43); c.lineTo(12, 31); c.stroke();
}
function priceTag(c) {
  poly(c, [[-56, -32], [30, -32], [60, 0], [30, 32], [-56, 32]]);
  c.fillStyle = C.ink; c.fill();
  fillCircle(c, 34, 0, 6, C.sand);
  text(c, 'NEW', -14, 8, { f: F.mono, w: 600, s: 20, ls: 2, c: C.paper, a: 'center' });
}

/* ==========================================================================
   05 — CYBERSECURITY   (hex field, scan, lock clamp → check)
   ========================================================================== */
const _hexCache = { k: NaN, cv: null };
function hexField(k) {
  if (_hexCache.k === k) return _hexCache.cv;
  if (!_hexCache.cv) { _hexCache.cv = document.createElement('canvas'); _hexCache.cv.width = W; _hexCache.cv.height = H; }
  const cv = _hexCache.cv, g = cv.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.font = `500 17px ${F.mono}`;
  g.textAlign = 'center';
  const HEX = '0123456789ABCDEF';
  for (let j = 0; j < 18; j++) {
    for (let i = 0; i < 32; i++) {
      const h = hash(i * 17.3 + j * 91.7 + k * 3.1);
      const hot = hash(i * 5.1 + j * 2.7 + Math.floor(k / 3) * 1.3) > 0.955;
      g.fillStyle = hot ? C.orange : '#4A4744';
      g.fillText(HEX[Math.floor(h * 16)] + HEX[Math.floor(hash(h * 99) * 16)], 30 + i * 60, 40 + j * 60);
    }
  }
  _hexCache.k = k;
  return cv;
}
function drawD05(c, lt) {
  const b = lt / B, d = DIVS[4];
  fillBG(c, C.ink);
  const hk = Math.floor(lt * 14);
  const hf = hexField(hk);
  c.save(); c.globalAlpha = 0.5; c.drawImage(hf, 0, 0); c.restore();
  // scan band brightens the field
  const sq = ez(b, 0.15, 1.45, E.ioC), scanY = lerp(300, 880, sq);
  if (b > 0.1 && b < 1.6) {
    c.save();
    c.beginPath(); c.rect(0, scanY - 120, 1000, 120); c.clip();
    c.globalAlpha = 1; c.drawImage(hf, 0, 0);
    c.restore();
  }
  const shade = c.createLinearGradient(980, 0, 1240, 0);
  shade.addColorStop(0, rgba(C.ink, 0)); shade.addColorStop(1, rgba(C.ink, 0.88));
  c.fillStyle = shade; c.fillRect(980, 0, W - 980, H);
  bigNum(c, d.n, lt, C.paper, 0.08);
  c.save();
  settle(c, lt, 0.05);
  const cx = 540, cy = 600;
  const locked = prog(lt, 1.5 * B, 1.5 * B + 0.09);
  const lift = lerp(48, 0, E.inQ(locked));
  // impact ring
  const ir = prog(lt, 1.5 * B + 0.06, 1.5 * B + 0.6);
  if (ir > 0 && ir < 1) {
    c.save(); c.globalAlpha = 1 - ir;
    circle(c, cx, cy + 50, 160 + 300 * E.outC(ir)); c.strokeStyle = C.orange; c.lineWidth = 4; c.stroke();
    c.restore();
  }
  // shackle
  const sp = ez(b, 0.1, 0.8, E.ioC);
  c.save();
  c.translate(0, -lift);
  c.beginPath();
  c.moveTo(cx - 84, cy - 40);
  c.lineTo(cx - 84, cy - 128);
  c.arc(cx, cy - 128, 84, Math.PI, TAU);
  c.lineTo(cx + 84, cy - 40);
  const shL = 2 * 88 + Math.PI * 84;
  c.setLineDash([shL * sp, shL]);
  c.strokeStyle = C.paper; c.lineWidth = 28; c.lineCap = 'round'; c.stroke();
  c.restore();
  // body
  const bp = E.outB2(prog(b, 0.3, 0.75));
  if (bp > 0) {
    c.save();
    scaleAbout(c, cx, cy + 55, bp);
    const flash = pulse(lt - 1.5 * B, 10);
    fillRR(c, cx - 134, cy - 52, 268, 214, 34, mix(C.orange, C.paper, flash));
    const kh = 1 - ez(b, 1.6, 1.8, E.inB);
    if (kh > 0) {
      fillCircle(c, cx, cy + 34, 20 * kh, C.ink);
      fillRR(c, cx - 8 * kh, cy + 34, 16 * kh, 48 * kh, 4, C.ink);
    }
    const ck = ez(b, 1.7, 2.15, E.outC);
    if (ck > 0) {
      c.beginPath(); c.moveTo(cx - 48, cy + 52); c.lineTo(cx - 14, cy + 84); c.lineTo(cx + 52, cy + 14);
      const L = 48 + 93;
      c.setLineDash([L * ck, L]); c.strokeStyle = C.ink; c.lineWidth = 18; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
    }
    c.restore();
  }
  // scan line
  if (b > 0.1 && b < 1.55) {
    const g = c.createLinearGradient(0, scanY - 90, 0, scanY);
    g.addColorStop(0, rgba(C.orange, 0)); g.addColorStop(1, rgba(C.orange, 0.28));
    c.fillStyle = g; c.fillRect(140, scanY - 90, 800, 90);
    c.fillStyle = C.orange; c.fillRect(140, scanY - 2, 800, 3);
  }
  // terminal
  const lines = [
    ['$ jf-sec audit --code --cloud --access', 0.1, C.mute],
    ['> red-team: probing attack surface…', 0.75, C.orange],
    ['> status: SECURED  [OK]', 1.6, C.paper]
  ];
  lines.forEach(([s, t0, col], i) => {
    const n = Math.floor(s.length * prog(b, t0, t0 + 0.5));
    if (n > 0) text(c, s.slice(0, n), 150, 862 + i * 34, { f: F.mono, w: 500, s: 20, c: col });
  });
  c.restore();
  divHeader(c, lt, d, { fg: C.paper, sub: C.mute, acc: C.orange, chipStroke: rgba(C.orange, 0.6), chipC: C.paper, chipFill: rgba(C.ink, 0.85), bg: C.ink });
}

/* ==========================================================================
   06 — SUMMER BOOTCAMP   (retro sun, bouncing kinetic type)
   ========================================================================== */
function drawD06(c, lt) {
  const b = lt / B, d = DIVS[5];
  fillBG(c, C.paper);
  bigNum(c, d.n, lt, C.ink, 0.06);
  c.save();
  settle(c, lt, 0.04);
  const cx = 540, R = 250, hz = 800;
  const cy = lerp(1150, 610, ez(b, 0, 1.15, E.outE));
  // rays
  const ra = ez(b, 0.5, 1.3, E.outE);
  if (ra > 0) {
    c.save();
    c.beginPath(); c.rect(0, 0, 1000, hz); c.clip();
    c.translate(cx, cy); c.rotate(lt * 0.22);
    c.fillStyle = rgba(C.orange, 0.22);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * TAU, r0 = R + 30, r1 = R + 30 + (i % 2 ? 90 : 170) * ra, wa = 0.035;
      poly(c, [[Math.cos(a - wa) * r0, Math.sin(a - wa) * r0], [Math.cos(a) * r1, Math.sin(a) * r1], [Math.cos(a + wa) * r0, Math.sin(a + wa) * r0]]);
      c.fill();
    }
    c.restore();
  }
  // sun with sliding stripes
  c.save();
  c.beginPath(); c.rect(0, 0, W, hz); c.clip();
  fillCircle(c, cx, cy, R, C.orange);
  c.save();
  circle(c, cx, cy, R + 1); c.clip();
  const gap = R * 0.15, scroll = (lt * 46) % gap;
  c.fillStyle = C.paper;
  for (let k = 0; k < 8; k++) {
    const y = cy + R * 0.08 + k * gap - scroll;
    const th = Math.max(0, 2 + ((y - cy) / R) * 26);
    c.fillRect(cx - R, y - th / 2, R * 2, th);
  }
  c.restore();
  text(c, 'SUMMER', cx, cy - R * 0.42, { f: F.mono, w: 600, s: 26, ls: 16, c: C.paper, a: 'center', alpha: ez(b, 0.9, 1.3) });
  c.restore();
  // horizon & reflection
  const hp = ez(b, 0.2, 0.8, E.outE);
  c.fillStyle = C.ink; c.fillRect(cx - 430 * hp, hz - 2, 860 * hp, 4);
  for (let k = 0; k < 3; k++) {
    const w = (300 - k * 80) * (0.85 + 0.15 * Math.sin(lt * 5 + k * 2)) * ez(b, 0.7, 1.3);
    fillRR(c, cx - w / 2, hz + 18 + k * 18, w, 6, 3, rgba(C.orange, 0.55 - k * 0.15));
  }
  // floating tags
  const tags = [['</>', 240, 470, 1.4], ['{ }', 835, 420, 1.65], ['AI', 870, 640, 1.9]];
  tags.forEach(([s, x, y, t0], i) => {
    const q = spring(lt - t0 * B, 2.1, 6.5);
    if (q <= 0) return;
    c.save();
    c.translate(x, y + 10 * Math.sin(lt * 3 + i * 2));
    c.rotate((i - 1) * 0.12 + 0.05 * Math.sin(lt * 2 + i));
    c.scale(q, q);
    fillRR(c, -50, -30, 100, 60, 16, C.ink);
    text(c, s, 0, 9, { f: F.mono, w: 600, s: 26, c: i === 2 ? C.orange : C.paper, a: 'center' });
    c.restore();
  });
  // BOOTCAMP letters
  const word = 'BOOTCAMP', lo = { f: F.grot, w: 700, s: 128, ls: 0 };
  const ws = [...word].map(ch => measure(c, ch, lo));
  const tot = ws.reduce((a, v) => a + v, 0) + 4 * (word.length - 1);
  let x = cx - tot / 2;
  [...word].forEach((ch, i) => {
    const t0 = (0.7 + i * 0.16) * B;
    const q = prog(lt, t0, t0 + 0.5);
    if (q > 0) {
      const y = 990 - 640 * (1 - E.outBounce(q));
      const jump = 34 * Math.sin(Math.PI * prog(b, 3.0 + i * 0.07, 3.4 + i * 0.07));
      c.save();
      c.translate(x + ws[i] / 2, y - jump);
      c.rotate((hash(i * 4.2) - 0.5) * 0.5 * (1 - E.outC(q)));
      text(c, ch, 0, 0, { ...lo, c: i === 4 ? C.orange : C.ink, a: 'center' });
      c.restore();
    }
    x += ws[i] + 4;
  });
  c.restore();
  divHeader(c, lt, d, { fg: C.ink, sub: C.mute, acc: C.orange, bg: C.paper });
}

/* ==========================================================================
   07 — OUR AI MODEL   (network → signal pulses → orb → reply)
   ========================================================================== */
const NET = (() => {
  const xs = [190, 360, 530, 700], ns = [4, 6, 6, 4];
  const layers = xs.map((x, l) => Array.from({ length: ns[l] }, (_, j) => [x, 580 + (j - (ns[l] - 1) / 2) * 88]));
  layers.push([[880, 580]]);
  const R = mulberry32(77);
  const waves = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5].map(w => Array.from({ length: 3 }, () => layers.map(L => Math.floor(R() * L.length))));
  const dust = Array.from({ length: 70 }, () => [R() * W, R() * H, 1 + R() * 2.2, 0.05 + R() * 0.15, R()]);
  return { layers, waves, waveT: [1.0, 1.5, 2.0, 2.5, 3.0, 3.5], dust };
})();
function drawD07(c, lt) {
  const b = lt / B, d = DIVS[6];
  fillBG(c, C.ink);
  for (const [x, y, r, a, s] of NET.dust) fillCircle(c, (x + lt * (10 + s * 30)) % W, y + Math.sin(lt + s * 9) * 6, r, rgba(C.paper, a));
  bigNum(c, d.n, lt, C.paper, 0.08);
  c.save();
  settle(c, lt, 0.05);
  const L = NET.layers, SEG = 0.1;
  // edges
  c.lineWidth = 1.5;
  for (let l = 0; l < L.length - 1; l++) {
    const e = ez(b, 0.15 + l * 0.18, 0.6 + l * 0.18, E.outC);
    if (e <= 0) continue;
    c.strokeStyle = rgba(C.paper, 0.13);
    c.beginPath();
    for (const a of L[l]) for (const bb of L[l + 1]) { c.moveTo(a[0], a[1]); c.lineTo(lerp(a[0], bb[0], e), lerp(a[1], bb[1], e)); }
    c.stroke();
  }
  // pulses
  const flash = L.map(Ly => Ly.map(() => 0));
  NET.waves.forEach((paths, wi) => {
    const tw = NET.waveT[wi] * B;
    paths.forEach(path => {
      const tau = lt - tw;
      if (tau < 0) return;
      for (let s = 0; s < L.length; s++) { const ta = tau - s * SEG; if (ta >= 0) flash[s][path[s]] = Math.max(flash[s][path[s]], pulse(ta, 7)); }
      const s = Math.floor(tau / SEG);
      if (s >= L.length - 1) return;
      const f = (tau - s * SEG) / SEG;
      const A = L[s][path[s]], Bq = L[s + 1][path[s + 1]];
      const px = lerp(A[0], Bq[0], f), py = lerp(A[1], Bq[1], f);
      c.strokeStyle = rgba(C.orange, 0.75); c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(px, py); c.stroke();
      fillCircle(c, px, py, 14, rgba(C.orange, 0.25));
      fillCircle(c, px, py, 6, C.orange);
    });
  });
  // nodes
  for (let l = 0; l < L.length - 1; l++) {
    L[l].forEach((p, j) => {
      const s = E.outB2(prog(b, 0.05 + l * 0.14 + j * 0.03, 0.4 + l * 0.14 + j * 0.03));
      if (s <= 0) return;
      fillCircle(c, p[0], p[1], 11 * s, mix(C.ink, C.orange, flash[l][j]));
      circle(c, p[0], p[1], 11 * s); c.strokeStyle = rgba(C.paper, 0.75); c.lineWidth = 2; c.stroke();
    });
  }
  // orb
  const of = flash[L.length - 1][0];
  const orb = 10 + 58 * spring(lt - 2.0 * B, 1.6, 5.5) + 8 * of;
  const [ox, oy] = L[L.length - 1][0];
  for (const rb of [2.0, 3.0]) {
    const q = prog(b, rb, rb + 1.2);
    if (q > 0 && q < 1) { c.save(); c.globalAlpha = 0.6 * (1 - q); circle(c, ox, oy, orb + 170 * E.outC(q)); c.strokeStyle = C.orange; c.lineWidth = 2; c.stroke(); c.restore(); }
  }
  const glow = c.createRadialGradient(ox, oy, 0, ox, oy, orb * 2.8);
  glow.addColorStop(0, rgba(C.orange, 0.45)); glow.addColorStop(1, rgba(C.orange, 0));
  c.fillStyle = glow; c.fillRect(ox - orb * 3, oy - orb * 3, orb * 6, orb * 6);
  fillCircle(c, ox, oy, orb, C.orange);
  if (orb > 30) {
    c.save();
    c.globalAlpha = prog(orb, 30, 60);
    c.translate(ox - orb * 0.95, oy - orb * 0.98); c.scale(orb * 0.019, orb * 0.019);
    drawGlyph(c, null, C.paper);
    c.restore();
  }
  // reply bubble
  const bq = prog(b, 2.35, 2.8);
  if (bq > 0) {
    const s = 'كيف أقدر أساعدك؟', o = { f: F.ar, w: 500, s: 30, rtl: true, c: C.ink, a: 'right' };
    c.save();
    scaleAbout(c, 950, 760, E.outB2(bq));
    poly(c, [[870, 764], [890, 716], [910, 764]]); c.fillStyle = C.paper; c.fill();
    fillRR(c, 570, 760, 380, 72, 24, C.paper);
    const chars = [...s];
    const n = Math.floor(chars.length * prog(b, 2.55, 3.4));
    const shown = chars.slice(0, n).join('');
    if (EN) {
      const eo = { f: F.grot, w: 500, s: 30, c: C.ink };
      const es = 'How can I help you?'.slice(0, Math.floor(19 * prog(b, 2.55, 3.4)));
      text(c, es, 602, 807, eo);
      if (Math.floor(lt * 4) % 2 === 0 || b < 3.4) { c.fillStyle = C.orange; c.fillRect(602 + measure(c, es, eo) + 6, 780, 3, 34); }
    } else {
      text(c, shown, 920, 807, o);
      if (Math.floor(lt * 4) % 2 === 0 || b < 3.4) {
        const w = measure(c, shown, o);
        c.fillStyle = C.orange; c.fillRect(920 - w - 8, 780, 3, 34);
      }
    }
    c.restore();
  }
  c.restore();
  divHeader(c, lt, d, { fg: C.paper, sub: C.mute, acc: C.orange, chipStroke: rgba(C.paper, 0.3), chipC: C.paper, bg: C.ink });
}

/* ==========================================================================
   08 — AUTOMATION   (line-drawn house → building → store morph, smart UI)
   ========================================================================== */
function resample(pts, N) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push([a, b, l]); total += l;
  }
  const out = [];
  for (let k = 0; k < N; k++) {
    let dd = (k / N) * total;
    for (const [a, b, l] of segs) {
      if (dd <= l) { out.push([lerp(a[0], b[0], dd / l), lerp(a[1], b[1], dd / l)]); break; }
      dd -= l;
    }
  }
  return out;
}
const SHAPES = (() => {
  const N = 160;
  return {
    house: resample([[-1, 1], [-1, -0.15], [0, -1], [1, -0.15], [1, 1]], N),
    bldg: resample([[-0.75, 1], [-0.75, -1.25], [-0.2, -1.25], [-0.2, -1.42], [0.2, -1.42], [0.2, -1.25], [0.75, -1.25], [0.75, 1]], N),
    store: resample([[-1.1, 1], [-1.1, -0.35], [-1.25, -0.35], [-1.0, -0.9], [1.0, -0.9], [1.25, -0.35], [1.1, -0.35], [1.1, 1]], N),
    N
  };
})();
function drawD08(c, lt) {
  const b = lt / B, d = DIVS[7];
  fillBG(c, C.paper);
  bigNum(c, d.n, lt, C.ink, 0.06);
  c.save();
  settle(c, lt, 0.04);
  const ox = 520, oy = 560, u = 170;
  const m1 = ez(b, 1.5, 2.0, E.ioC), m2 = ez(b, 2.5, 3.0, E.ioC);
  const A = m2 > 0 ? SHAPES.bldg : SHAPES.house, Bs = m2 > 0 ? SHAPES.store : SHAPES.bldg, m = m2 > 0 ? m2 : m1;
  const bounce = 1 + 0.05 * Math.sin(Math.PI * m);
  const P = A.map((p, i) => [ox + lerp(p[0], Bs[i][0], m) * u * bounce, oy + lerp(p[1], Bs[i][1], m) * u * (2 - bounce)]);
  // floor
  const fp = ez(b, 0.2, 0.8, E.outE);
  c.fillStyle = C.ink; c.fillRect(ox - 380 * fp, oy + u - 1.5, 760 * fp, 3);
  // interiors
  const U = (x, y) => [ox + x * u, oy + y * u];
  const win = (x, y, w, h, on, col = C.orange) => {
    const [X, Y] = U(x, y);
    if (on > 0) fillRR(c, X, Y, w * u, h * u, 6, mix(C.paper, col, on));
    strokeRR(c, X, Y, w * u, h * u, 6, C.ink, 4);
  };
  const inter = (alpha, fn) => {
    if (alpha <= 0.01) return;
    c.save(); c.globalAlpha *= alpha; scaleAbout(c, ox, oy + u * 0.3, lerp(0.7, 1, alpha)); fn(); c.restore();
  };
  const lightOn = ez(b, 0.75, 0.95, E.outC);
  inter((1 - m1) * ez(b, 0.4, 0.8), () => {
    if (lightOn > 0) {
      const g = c.createRadialGradient(ox, oy + 40, 10, ox, oy + 40, 260);
      g.addColorStop(0, rgba(C.orange, 0.22 * lightOn)); g.addColorStop(1, rgba(C.orange, 0));
      c.fillStyle = g; c.fillRect(ox - 300, oy - 260, 600, 560);
    }
    win(-0.75, 0.05, 0.45, 0.36, lightOn); win(0.3, 0.05, 0.45, 0.36, lightOn);
    win(-0.18, 0.45, 0.36, 0.55, 0);
  });
  inter(m1 * (1 - m2), () => {
    for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) {
      const idx = r * 3 + q;
      win(-0.55 + q * 0.42, -1.05 + r * 0.43, 0.26, 0.28, ez(b, 1.9 + hash(idx * 3.7) * 0.9, 2.0 + hash(idx * 3.7) * 0.9, E.outC));
    }
    win(-0.16, 0.66, 0.32, 0.34, 0);
  });
  inter(m2, () => {
    c.save();
    poly(c, [[ox - 1.25 * u, oy - 0.35 * u], [ox - 1.0 * u, oy - 0.9 * u], [ox + 1.0 * u, oy - 0.9 * u], [ox + 1.25 * u, oy - 0.35 * u]]);
    c.clip();
    for (let i = 0; i < 10; i += 2) { c.fillStyle = C.orange; c.fillRect(ox - 1.25 * u + i * 0.25 * u, oy - 0.9 * u, 0.25 * u, 0.55 * u); }
    c.restore();
    const on = ez(b, 3.15, 3.35, E.outC);
    win(-0.88, -0.1, 1.05, 0.7, on, C.amber);
    if (on > 0) text(c, 'OPEN', ox - 0.355 * u, oy + 0.32 * u, { f: F.mono, w: 600, s: 22, ls: 4, c: C.ink, a: 'center', alpha: on });
    win(0.35, 0.05, 0.5, 0.95, 0);
  });
  // outline (draw-on)
  const dp = ez(b, 0, 0.8, E.ioC);
  c.save();
  poly(c, P, true);
  let per = 0;
  for (let i = 0; i < P.length; i++) { const a = P[i], q = P[(i + 1) % P.length]; per += Math.hypot(q[0] - a[0], q[1] - a[1]); }
  c.setLineDash([per * dp, per]);
  c.strokeStyle = C.ink; c.lineWidth = 7; c.lineJoin = 'round'; c.lineCap = 'round';
  c.stroke();
  c.restore();
  // morph label
  const lv = m1 + m2, words = ['HOME', 'BUILDING', 'RETAIL'];
  c.save();
  c.beginPath(); c.rect(ox - 200, oy + u + 18, 400, 46); c.clip();
  words.forEach((w, i) => text(c, w, ox, oy + u + 52 + (i - lv) * 46, { f: F.mono, w: 600, s: 22, ls: 10, c: C.ink, a: 'center', alpha: ez(b, 0.5, 0.9) }));
  c.restore();
  // robot vacuum
  const rq = E.outB2(prog(b, 1.75, 2.1));
  if (rq > 0) {
    const rx = lerp(200, 860, ez(b, 2.0, 3.8, E.ioC)), ry = oy + u - 24;
    c.save();
    c.setLineDash([6, 10]); c.strokeStyle = rgba(C.orange, 0.5); c.lineWidth = 3;
    c.beginPath(); c.moveTo(200, ry + 20); c.lineTo(rx, ry + 20); c.stroke();
    c.restore();
    c.save(); c.translate(rx, ry); c.scale(rq, rq);
    fillRR(c, -40, -24, 80, 46, 22, C.ink);
    fillRR(c, -26, -16, 52, 6, 3, C.ink3);
    fillCircle(c, 22, -2, 5, Math.floor(lt * 6) % 2 ? C.orange : C.amber);
    c.restore();
  }
  // smart controls
  const tq = E.outB2(prog(b, 0.3, 0.7));
  if (tq > 0) {
    const on = spring(lt - 0.75 * B, 2.4, 8);
    c.save(); c.translate(196, 930); c.scale(tq, tq);
    fillRR(c, -54, -30, 108, 60, 30, mix(C.line, C.orange, clamp(on)));
    fillCircle(c, lerp(-24, 24, on), 0, 23, C.white);
    text(c, 'LIGHTS', 78, 7, { f: F.mono, w: 600, s: 16, ls: 4, c: C.ink });
    text(c, on > 0.5 ? 'ON' : 'OFF', 78, 30, { f: F.mono, w: 500, s: 13, ls: 3, c: on > 0.5 ? C.orange : C.mute });
    c.restore();
  }
  const dq = E.outB2(prog(b, 0.9, 1.3));
  if (dq > 0) {
    const temp = lerp(18, 22, ez(b, 1.0, 2.0, E.ioC));
    c.save(); c.translate(842, 300); c.scale(dq, dq);
    c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, 62, Math.PI * 0.75, Math.PI * 2.25); c.strokeStyle = C.line; c.lineWidth = 11; c.stroke();
    c.beginPath(); c.arc(0, 0, 62, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * clamp((temp - 14) / 12)); c.strokeStyle = C.orange; c.stroke();
    text(c, Math.round(temp) + '°', 4, 14, { f: F.grot, w: 700, s: 40, c: C.ink, a: 'center' });
    text(c, 'CLIMATE', 0, 104, { f: F.mono, w: 600, s: 14, ls: 4, c: C.ink, a: 'center' });
    c.restore();
  }
  c.restore();
  divHeader(c, lt, d, { fg: C.ink, sub: C.mute, acc: C.orange, chipStroke: C.line, chipC: C.body, bg: C.paper });
}

/* ==========================================================================
   OVERVIEW WALL (beats 48–56): pull back from 08 into a wall of all eight,
   flip each tile to its number, converge into a single point.
   ========================================================================== */
const DIV_DRAW = [drawD01, drawD02, drawD03, drawD04, drawD05, drawD06, drawD07, drawD08];
const DIV_BG = [C.paper, C.ink, C.orange, C.sand, C.ink, C.paper, C.ink, C.paper];
const WALL = { tw: 400, th: 225, gx: 32, gy: 72 };
WALL.x0 = (W - (4 * WALL.tw + 3 * WALL.gx)) / 2;
WALL.y0 = (H - (2 * WALL.th + WALL.gy)) / 2 - 6;
function tileRect(k) {
  const col = k % 4, row = Math.floor(k / 4);
  return { x: WALL.x0 + col * (WALL.tw + WALL.gx), y: WALL.y0 + row * (WALL.th + WALL.gy) };
}
function drawWall(c, lt) {
  const b = lt / B;
  fillBG(c, C.ink2);
  const t7 = tileRect(7), f7 = [t7.x + WALL.tw / 2, t7.y + WALL.th / 2];
  const e = ez(b, 0, 1.9, E.pull);
  const S = Math.exp(lerp(Math.log(W / WALL.tw), 0, e)) * (1 + 0.035 * ez(b, 1.9, 6, E.ioC));
  const fx = lerp(f7[0], 960, e), fy = lerp(f7[1], 540, e);
  c.save();
  c.translate(960, 540); c.scale(S, S); c.translate(-fx, -fy);
  const sc = WALL.tw / W;
  for (let k = 0; k < 8; k++) {
    const r = tileRect(k);
    const tcx = r.x + WALL.tw / 2, tcy = r.y + WALL.th / 2;
    // converge
    const t0 = (6.0 + (7 - k) * 0.07) * B;
    const cq = prog(lt, t0, t0 + 0.42);
    const ce = E.inB(cq);
    if (cq >= 1) continue;
    // flip
    const f0 = (4 + k * 0.25) * B;
    const th = Math.PI * E.ioC(prog(lt, f0, f0 + 0.34));
    const fx2 = Math.cos(th), back = th > Math.PI / 2;
    c.save();
    c.translate(lerp(tcx, 960, ce), lerp(tcy, 540, ce));
    c.rotate((k - 3.5) * 0.35 * ce);
    c.scale(1 - ce, 1 - ce);
    c.transform(Math.max(0.002, Math.abs(fx2)), Math.sin(th) * 0.1 * (k % 2 ? 1 : -1), 0, 1, 0, 0);
    c.translate(-WALL.tw / 2, -WALL.th / 2);
    const rad = 14 * e;
    if (!back) {
      c.save();
      rr(c, 0, 0, WALL.tw, WALL.th, rad); c.clip();
      c.scale(sc, sc);
      const ltK = k === 7 ? BAR + lt * 0.55 : 3.1 * B + lt * 0.55;
      DIV_DRAW[k](c, ltK);
      c.restore();
      if (Math.abs(fx2) < 0.999) { c.fillStyle = rgba(C.ink, 0.5 * (1 - Math.abs(fx2))); rr(c, 0, 0, WALL.tw, WALL.th, rad); c.fill(); }
      if (DIV_BG[k] === C.ink) strokeRR(c, 0.5, 0.5, WALL.tw - 1, WALL.th - 1, rad, rgba(C.paper, 0.16 * e), 1.5);
    } else {
      fillRR(c, 0, 0, WALL.tw, WALL.th, 14, C.orange);
      text(c, DIVS[k].n, WALL.tw - 26, 140, { f: F.grot, w: 700, s: 124, ls: -4, c: C.ink, a: 'right' });
      if (EN) text(c, DIVS[k].short, WALL.tw - 28, WALL.th - 26, { f: F.grot, w: 600, s: 24, c: C.ink, a: 'right' });
      else text(c, DIVS[k].ar[0], WALL.tw - 28, WALL.th - 26, { f: F.ar, w: 600, s: 24, c: C.ink, a: 'right', rtl: true });
      fillRR(c, 26, 26, 40, 5, 2.5, C.ink);
    }
    c.restore();
    // captions under tiles
    const ca = ez(b, 1.2 + k * 0.06, 1.8 + k * 0.06) * (1 - ez(b, 5.6, 6.0, E.lin));
    if (ca > 0) {
      if (EN) text(c, DIVS[k].short, r.x + WALL.tw, r.y + WALL.th + 35, { f: F.grot, w: 500, s: 19, c: C.paper, a: 'right', alpha: ca * 0.85 });
      else text(c, DIVS[k].ar[0], r.x + WALL.tw, r.y + WALL.th + 36, { f: F.ar, w: 500, s: 19, c: C.paper, a: 'right', rtl: true, alpha: ca * 0.85 });
      text(c, DIVS[k].n, r.x, r.y + WALL.th + 34, { f: F.mono, w: 600, s: 15, ls: 2, c: C.orange, alpha: ca });
    }
  }
  c.restore();
  // the point it all collapses into
  const dq = prog(b, 6.45, 6.9);
  if (dq > 0) {
    const grow = 1 + 0.6 * E.inE(prog(b, 7.4, 8));
    fillCircle(c, 960, 540, 20 * E.outB2(dq) * grow * (1 + 0.15 * Math.sin(lt * 30)), C.orange);
  }
}

/* ==========================================================================
   END CARD (beats 56–64)
   ========================================================================== */
const BURST = (() => { const R = mulberry32(5); return Array.from({ length: 34 }, (_, i) => ({ a: R() * TAU, v: 500 + R() * 900, s: 5 + R() * 11, r: R() * TAU, col: i % 3 === 0 ? C.ink : C.orange, sq: R() < 0.5 })); })();
function drawEnd(c, lt) {
  const b = lt / B;
  fillBG(c, C.paper);
  // shockwaves
  [[0, C.ink, 5], [0.07, C.orange, 4]].forEach(([dl, col, lw]) => {
    const q = prog(lt, dl, dl + 0.85);
    if (q > 0 && q < 1) { c.save(); c.globalAlpha = 1 - q; circle(c, 960, 500, 160 + 1000 * E.outC(q)); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); c.restore(); }
  });
  // confetti burst
  for (const p of BURST) {
    const tt = lt, k = 4.5;
    if (tt > 1.3) break;
    const dist = (p.v / k) * (1 - Math.exp(-k * tt));
    const x = 960 + Math.cos(p.a) * (150 + dist), y = 500 + Math.sin(p.a) * (150 + dist) + 140 * tt * tt;
    c.save(); c.globalAlpha = 1 - prog(tt, 0.6, 1.3);
    c.translate(x, y); c.rotate(p.r + tt * 6);
    c.fillStyle = p.col;
    if (p.sq) c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); else { circle(c, 0, 0, p.s / 2); c.fill(); }
    c.restore();
  }
  // icon
  const mv = ez(b, 1.75, 2.6, E.snap);
  const breathe = 1 + 0.012 * ez(b, 3, 8, E.ioC);
  const size = lerp(300, 214, mv) * spring(lt, 1.7, 6.2) * breathe;
  const cy = lerp(500, 318, mv);
  const rot = -0.3 * (1 - spring(lt, 1.3, 6));
  const ps = [0, 1, 2, 3].map(i => E.outB2(prog(b, 0.2 + i * 0.25, 0.2 + i * 0.25 + 0.4)));
  c.save();
  c.translate(960, cy); c.rotate(rot);
  drawIcon(c, 0, 0, size, { bg: C.ink, ps });
  c.restore();
  if (EN) {
    const eo = { f: F.grot, w: 700, s: 156, ls: -4 };
    const e1 = measure(c, 'Jo', eo), e2 = measure(c, 'Function', { ...eo, w: 400 }), xl = 960 - (e1 + e2) / 2;
    wipeLTR(c, xl, 588, e1 + e2, 156, ez(b, 2.0, 2.9, E.ioC), () => {
      text(c, 'Jo', xl, 588, { ...eo, c: C.ink });
      text(c, 'Function', xl + e1, 588, { ...eo, w: 400, c: C.deep });
    });
    const dp = ez(b, 2.75, 3.5, E.outE);
    if (dp > 0) {
      const lo = { f: F.grot, w: 600, s: 22, ls: 9, c: C.ink }, lw = measure(c, 'DIGITAL SERVICES', lo), g = 30;
      const x0 = 960 - lw / 2;
      fillRR(c, x0 - g - 40 * dp, 652, 40 * dp, 5, 2.5, C.orange);
      revealText(c, 'DIGITAL SERVICES', x0 + 4, 664, lo, dp);
      fillRR(c, x0 + lw + g, 652, 40 * dp, 5, 2.5, C.orange);
    }
    revealText(c, 'Eight divisions. One function.', 960, 780, { f: F.grot, w: 600, s: 56, ls: -1, c: C.ink, a: 'center' }, ez(b, 3.5, 4.3, E.outE));
    revealText(c, 'CLIENT SERVICES · PRODUCTS · ADVERTISING · STORE · CYBER SECURITY · BOOTCAMP · AI MODEL · AUTOMATION', 960, 834, { f: F.mono, w: 500, s: 14, ls: 2, c: C.body, a: 'center' }, ez(b, 4.0, 4.8, E.outE));
  } else {
  // wordmark
  const wo = { f: F.ar, w: 700, s: 150, rtl: true, a: 'right' };
  const w1 = measure(c, 'جو', wo), w2 = measure(c, 'فنكشن', { ...wo, w: 400 }), ww = w1 + w2;
  const xr = 960 + ww / 2;
  wipeRTL(c, xr, 588, ww, 150, ez(b, 2.0, 2.9, E.ioC), () => {
    text(c, 'جو', xr, 588, { ...wo, c: C.ink });
    text(c, 'فنكشن', xr - w1, 588, { ...wo, w: 400, c: C.deep });
  });
  // descriptor row: للخدمات الرقمية — JOFUNCTION
  const dp = ez(b, 2.75, 3.5, E.outE);
  if (dp > 0) {
    const ao = { f: F.ar, w: 500, s: 30, rtl: true, c: C.gray, a: 'right' }, lo = { f: F.grot, w: 600, s: 22, ls: 9, c: C.ink };
    const aw = measure(c, 'للخدمات الرقمية', ao), lw = measure(c, 'JOFUNCTION', lo), g = 30;
    const tot = aw + g + 40 + g + lw, x0 = 960 - tot / 2;
    revealText(c, 'للخدمات الرقمية', x0 + tot, 664, ao, dp);
    fillRR(c, x0 + lw + g, 652, 40 * dp, 5, 2.5, C.orange);
    revealText(c, 'JOFUNCTION', x0, 664, lo, dp);
  }
  revealText(c, 'ثمانية أقسام. وظيفة واحدة.', 960, 780, { f: F.ar, w: 600, s: 54, c: C.ink, a: 'center', rtl: true }, ez(b, 3.5, 4.3, E.outE));
  revealText(c, 'Eight divisions. One function.', 960, 836, { f: F.grot, w: 500, s: 30, c: C.body, a: 'center' }, ez(b, 4.0, 4.8, E.outE));
  }
  // footer, echoing the brand sheet
  const fq = ez(b, 4.6, 5.5, E.ioC);
  if (fq > 0) {
    c.fillStyle = C.ink; c.fillRect(1800 - 1680 * fq, 948, 1680 * fq, 2);
    fillRR(c, 1744, 972, 56 * ez(b, 5.1, 5.6, E.outE), 5, 2.5, C.orange);
    const ft = 'JOFUNCTION · 8 DIVISIONS · REEL 1 OF 1', fo = { f: F.mono, w: 500, s: 13, ls: 3, c: C.mute };
    text(c, ft.slice(0, Math.floor(ft.length * prog(b, 5.0, 5.8))), 120, 980, fo);
    const cr = 'DESIGNED, ANIMATED & SCORED BY CLAUDE';
    text(c, cr.slice(0, Math.floor(cr.length * prog(b, 5.3, 6.1))), 960 - measure(c, cr, fo) / 2, 980, fo);
  }
  // impact flash
  const fl = 1 - prog(lt, 0, 0.16);
  if (fl > 0) { c.save(); c.globalAlpha = E.inQ(fl); fillBG(c, C.orange); c.restore(); }
}

/* ==========================================================================
   Timeline
   ========================================================================== */
addScene('intro', 0, 12, drawIntro, { label: 'INTRO — IDENTITY', hud: lt => (lt / B < 8.3 ? C.paper : C.ink) });
addScene('index', 12, 16, drawCount, { label: 'INDEX', hud: C.ink, hudAcc: C.ink });
addScene('d1', 16, 20, drawD01, { label: 'DIV 01 / 08', hud: C.ink, tr: { type: 'iris', pre: 0, post: 0.85, layers: [C.ink], lag: 0.2, ease: E.outE } });
addScene('d2', 20, 24, drawD02, { label: 'DIV 02 / 08', hud: C.paper, tr: { type: 'blindsV', pre: 0.5, post: 0.3, n: 8, alt: true, layers: [C.orange], lag: 0.16 } });
addScene('d3', 24, 28, drawD03, { label: 'DIV 03 / 08', hud: C.ink, hudAcc: C.ink, hudBottom: C.paper, tr: { type: 'wipe', angle: -18, pre: 0.5, post: 0.3, layers: [C.paper, C.ink], lag: 0.12 } });
addScene('d4', 28, 32, drawD04, { label: 'DIV 04 / 08', hud: C.ink, tr: { type: 'pill', pre: 0.5, post: 0.35, layers: [C.ink], lag: 0.12 } });
addScene('d5', 32, 36, drawD05, { label: 'DIV 05 / 08', hud: C.paper, tr: { type: 'glitch', pre: 0.25, post: 0.25 } });
addScene('d6', 36, 40, drawD06, { label: 'DIV 06 / 08', hud: C.ink, tr: { type: 'iris', x: 540, y: 1180, pre: 0.45, post: 0.35, layers: [C.orange], lag: 0.16 } });
addScene('d7', 40, 44, drawD07, { label: 'DIV 07 / 08', hud: C.paper, tr: { type: 'halftone', pre: 0.5, post: 0.3, layers: [C.orange], lag: 0.12, ease: E.lin } });
addScene('d8', 44, 48, drawD08, { label: 'DIV 08 / 08', hud: C.ink, tr: { type: 'iris', x: 880, y: 580, pre: 0.3, post: 0.45, layers: [C.orange], lag: 0.18, ease: E.ioC } });
addScene('wall', 48, 56, drawWall, { label: 'OVERVIEW', hud: lt => (lt < 0.3 ? C.ink : C.paper) });
addScene('end', 56, 64, drawEnd, { label: 'END CARD', hud: C.ink });

SHAKES.push(
  { t: 8 * B, amp: 6, dur: 0.35, f: 30 },
  { t: 16 * B, amp: 10, dur: 0.45, f: 28 },
  { t: 33.5 * B, amp: 9, dur: 0.3, f: 34 },
  { t: 48 * B, amp: 6, dur: 0.3, f: 30 },
  { t: 56 * B, amp: 18, dur: 0.6, f: 26 }
);
GLITCHES.push(
  { t: 33.5 * B, dur: 0.12, amp: 1 },
  { t: 35.7 * B, dur: 0.1, amp: 0.7 }
);
