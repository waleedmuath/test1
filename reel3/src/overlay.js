// The 2D typography layer: HUD, kinetic titles, tracked call-outs and the end
// card. Drawn to a transparent canvas that the final pass composites over the
// 3D frame (so whip blur and grain treat both layers as one picture).
import * as THREE from 'three';
import { W, H, FPS, clamp, lerp, ease, ez, decay, hash1, luminance, rgba, mixHex, BEAT } from './util.js';
import { C, FONT, STATIONS, LOGO } from './brand.js';

const AR = (w, s) => `${w} ${s}px ${FONT.ar}`;
const GR = (w, s) => `${w} ${s}px ${FONT.grot}`;
const MO = (w, s) => `${w} ${s}px ${FONT.mono}`;
const RIGHT = W - 132;

export function createOverlay() {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;

  /* ---------- primitives ---------- */
  const font = (f, ls = 0) => { g.font = f; g.letterSpacing = ls + 'px'; };
  const measure = (s, f, ls = 0) => { font(f, ls); return g.measureText(s).width; };
  function txt(s, x, y, f, color, { align = 'left', ls = 0, alpha = 1, rtl = false } = {}) {
    if (alpha <= 0.002) return;
    g.save();
    g.globalAlpha *= clamp(alpha);
    font(f, ls);
    g.direction = rtl ? 'rtl' : 'ltr';
    g.textAlign = align; g.fillStyle = color; g.textBaseline = 'alphabetic';
    g.fillText(s, x, y);
    g.restore();
  }
  // words rise into place from behind a mask; Arabic order runs right → left
  function riseWords(s, xRight, y, f, color, t0, t, { size = 100, stagger = 0.06, dur = 0.42, out = Infinity, outDur = 0.25, rtl = true, ls = 0, alpha = 1 } = {}) {
    if (t < t0 || t > out + outDur) return;
    const words = s.split(' ');
    font(f, ls);
    const space = g.measureText(' ').width;
    let x = rtl ? xRight : xRight - g.measureText(s).width;
    words.forEach((w, i) => {
      const ww = g.measureText(w).width;
      const e = ease.out5(ez(t, t0 + i * stagger, t0 + i * stagger + dur, ease.lin));
      const o = out === Infinity ? 0 : ease.in3(ez(t, out + i * stagger * 0.5, out + i * stagger * 0.5 + outDur, ease.lin));
      const dy = (1 - e) * size * 1.15 - o * size * 1.15;
      g.save();
      g.beginPath();
      const left = rtl ? x - ww - 12 : x - 12;
      g.rect(left, y - size * 1.25, ww + 24, size * 1.62);
      g.clip();
      txt(w, rtl ? x : x, y + dy, f, color, { align: rtl ? 'right' : 'left', rtl, ls, alpha });
      g.restore();
      x = rtl ? x - ww - space : x + ww + space;
    });
  }
  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+·';
  function scramble(s, t0, t, rate = 0.025) {
    let o = '';
    for (let i = 0; i < s.length; i++) {
      const ti = t0 + i * rate;
      if (t >= ti + 0.12 || s[i] === ' ') o += s[i];
      else if (t >= ti) o += GLYPHS[Math.floor(hash1(i * 7.1 + Math.floor(t * 40)) * GLYPHS.length)];
      else o += ' ';
    }
    return o;
  }
  const typed = (s, t0, t, cps = 38) => s.slice(0, Math.max(0, Math.floor((t - t0) * cps)));
  function pill(x, y, w, h, color, alpha = 1) {
    if (w <= 0 || alpha <= 0) return;
    g.save(); g.globalAlpha *= alpha; g.fillStyle = color; g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fill(); g.restore();
  }
  function chip(label, x, y, { f = AR(500, 24), fg = C.ink, bg = C.paper, alpha = 1, rtl = true, pad = 18, h = 44, scale = 1, anchor = 'center' } = {}) {
    if (alpha <= 0.002 || scale <= 0.001) return;
    const w = measure(label, f) + pad * 2;
    g.save();
    g.translate(x, y); g.scale(scale, scale);
    const x0 = anchor === 'center' ? -w / 2 : anchor === 'right' ? -w : 0;
    pill(x0, -h / 2, w, h, bg, alpha);
    txt(label, x0 + w / 2, h * 0.17 + 1, f, fg, { align: 'center', rtl, alpha });
    g.restore();
  }
  const proj = (v, cam) => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; };

  /* ---------- pieces ---------- */
  function hud(t, fg, accent, stIdx) {
    const a = ez(t, 0.15, 0.6) * (1 - ez(t, 23.7, 24.1));
    if (a <= 0) return;
    txt('JOFUNCTION', 72, 76, MO(600, 15), fg, { ls: 4, alpha: a * 0.9 });
    txt('MOTION REEL — 2026', 72 + measure('JOFUNCTION', MO(600, 15), 4) + 18, 76, MO(400, 15), fg, { ls: 2, alpha: a * 0.55 });
    const f = Math.floor(t * FPS + 1e-6);
    const tc = `00:00:${String(Math.floor(f / FPS)).padStart(2, '0')}:${String(f % FPS).padStart(2, '0')}`;
    txt(tc, 72, H - 64, MO(500, 14), fg, { ls: 2, alpha: a * 0.6 });
    txt('120 BPM · 60 FPS · 1920×1080', 72 + 152, H - 64, MO(400, 14), fg, { ls: 1, alpha: a * 0.35 });
    // seven-pill progress, the current division stretched in orange
    let x = W - 72;
    for (let k = 6; k >= 0; k--) {
      const TS = 6 + 2 * k;
      const on = ez(t, TS - 0.1, TS + 0.15, ease.out3) * (1 - ez(t, TS + 1.9, TS + 2.1, ease.out3));
      const done = t > TS + 2.0;
      const w = 16 + 30 * on;
      x -= w;
      pill(x, H - 76, w, 8, on > 0.5 ? accent : fg, a * (on > 0.02 ? 1 : done ? 0.55 : 0.22));
      x -= 8;
    }
    const label = stIdx >= 0 ? `${STATIONS[stIdx].n} / 07` : t < 6 ? 'INTRO' : 'ALL DIVISIONS';
    txt(label, W - 72, 76, MO(500, 15), fg, { align: 'right', ls: 3, alpha: a * 0.75 });
  }

  function intro(t, info, fg) {
    // slate
    const sa = ez(t, 0.1, 0.3) * (1 - ez(t, 0.78, 0.95));
    if (sa > 0) {
      txt(typed('JOFUNCTION', 0.12, t, 22), W / 2, H / 2 - 6, GR(500, 28), C.paper, { align: 'center', ls: 16, alpha: sa });
      txt(typed('A MOTION REEL — 2026', 0.32, t, 40), W / 2, H / 2 + 34, MO(400, 15), C.mute, { align: 'center', ls: 5, alpha: sa });
    }
    // bar call-outs
    const offs = [[150, -170], [-240, 120], [210, -90], [230, 70]];
    const ca = 1 - ez(t, 3.15, 3.45);
    if (ca > 0 && t > 0.9) {
      info.bars.forEach((p, j) => {
        const tl = 1.0 + j * 0.5;
        if (t < tl) return;
        const [x, y] = proj(p, info.cam);
        const e = ease.out3(ez(t, tl, tl + 0.22, ease.lin));
        const [dx, dy] = offs[j];
        const ex = x + dx * 0.55, ey = y + dy, lx = x + dx;
        g.save();
        g.globalAlpha = ca;
        g.strokeStyle = C.orange; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x, y);
        const k1 = clamp(e * 2), k2 = clamp(e * 2 - 1);
        g.lineTo(lerp(x, ex, k1), lerp(y, ey, k1));
        if (k2 > 0) g.lineTo(lerp(ex, lx, k2), ey);
        g.stroke();
        g.fillStyle = C.orange; g.beginPath(); g.arc(x, y, 4 + 6 * decay(t - tl, 9), 0, Math.PI * 2); g.fill();
        g.restore();
        if (k2 > 0.3) {
          const left = dx > 0;
          const b = LOGO.bars[j];
          txt(scramble(`${b.id} · ${b.name}`, tl + 0.12, t, 0.03), lx + (left ? 10 : -10), ey - 10, MO(600, 16), C.paper, { align: left ? 'left' : 'right', ls: 3, alpha: ca });
          txt(scramble(LOGO.dims[j], tl + 0.2, t, 0.02), lx + (left ? 10 : -10), ey + 16, MO(400, 14), C.mute, { align: left ? 'left' : 'right', ls: 1, alpha: ca });
        }
      });
    }
    // titles
    const y = 520;
    riseWords('أربعة خطوط.', RIGHT, y, AR(700, 118), C.paper, 3.02, t, { size: 118, out: 4.42 });
    if (t > 3.15 && t < 4.7) txt(scramble('FOUR LINES · ONE MARK', 3.2, t), RIGHT, y + 64, GR(500, 21), C.orange, { align: 'right', ls: 7, alpha: 1 - ez(t, 4.42, 4.6) });
    riseWords('سبعة أقسام.', RIGHT, y, AR(700, 118), C.paper, 4.55, t, { size: 118, out: 5.32, outDur: 0.2 });
    if (t > 4.62 && t < 5.5) txt(scramble('SEVEN DIVISIONS', 4.65, t), RIGHT, y + 64, GR(500, 21), C.orange, { align: 'right', ls: 7, alpha: 1 - ez(t, 5.3, 5.45) });
    // wedge numbers light up with their pills
    if (t > 4.7 && t < 5.45) {
      info.groups.forEach((c, k) => {
        const tg = 4.75 + k * (BEAT / 8);
        if (t < tg) return;
        const [x, y2] = proj(c, info.cam);
        const s = ease.outBackHard(ez(t, tg, tg + 0.12, ease.lin)) * (1 - ez(t, 5.22, 5.36, ease.in3));
        chip(`0${k + 1}`, x, y2, { f: MO(600, 18), fg: C.ink, bg: C.orange, h: 34, pad: 12, rtl: false, scale: s });
      });
    }
  }

  function station(t, k, info, fg, accent) {
    const st = STATIONS[k], TS = 6 + 2 * k;
    const t0 = TS - 0.04, out = TS + 1.72;
    if (t < t0 - 0.05 || t > out + 0.4) return 0;
    // the block exits with the whip: slides left, picks up motion blur
    const exit = ease.in3(ez(t, out, out + 0.3, ease.lin));
    const dx = -exit * 900;
    const alpha = 1 - ez(t, out + 0.15, out + 0.3);
    g.save(); g.translate(dx, 0);
    const twoLine = !!st.title2;
    const yN = twoLine ? 300 : 352, yT = twoLine ? 452 : 500, yT2 = 566;
    const yE = (twoLine ? yT2 : yT) + 64, yS = yE + 62, yU = yS + 56;
    // number: digits roll in from the previous division
    const nFont = GR(700, 150);
    const roll = ease.outExp(ez(t, t0, t0 + 0.42, ease.lin));
    const prevN = String(k).padStart(2, '0'), curN = st.n;
    const nw = measure('00', nFont, -6);
    const slash = ' / 07';
    const sw = measure(slash, MO(500, 22), 2);
    g.save(); g.globalAlpha = alpha;
    g.beginPath(); g.rect(RIGHT - nw - sw - 30, yN - 140, nw + 40, 168); g.clip();
    for (let d = 0; d < 2; d++) {
      const lag = d === 1 ? 0.06 : 0;
      const r = ease.outExp(ez(t, t0 + lag, t0 + lag + 0.42, ease.lin));
      const dw = measure(curN[d], nFont, -6);
      const x = RIGHT - sw - 14 - nw + (d === 0 ? 0 : measure(curN[0], nFont, -6));
      if (prevN[d] !== curN[d]) {
        txt(prevN[d], x, yN - r * 150, nFont, accent, { ls: -6, alpha: 1 - r });
        txt(curN[d], x, yN + (1 - r) * 150, nFont, accent, { ls: -6 });
      } else txt(curN[d], x, yN, nFont, accent, { ls: -6 });
    }
    g.restore();
    txt(slash, RIGHT, yN, MO(500, 22), fg, { align: 'right', ls: 2, alpha: alpha * 0.55 * roll });
    // title
    let ts = 104;
    const fitW = Math.max(measure(st.title, st.latinTitle ? GR(700, 104) : AR(700, 104)), st.title2 ? measure(st.title2, AR(700, 104)) : 0);
    if (fitW > 640) ts = Math.floor(104 * 640 / fitW);
    const tf = st.latinTitle ? GR(700, ts) : AR(700, ts);
    riseWords(st.title, RIGHT, yT, tf, fg, t0 + 0.06, t, { size: ts, rtl: !st.latinTitle, alpha, stagger: 0.07 });
    if (twoLine) riseWords(st.title2, RIGHT, yT2, tf, fg, t0 + 0.16, t, { size: ts, alpha });
    txt(scramble(st.en, t0 + 0.18, t, 0.022), RIGHT, yE, GR(500, 20), accent, { align: 'right', ls: 7, alpha });
    const se = ease.out3(ez(t, t0 + 0.3, t0 + 0.6, ease.lin));
    txt(st.sub, RIGHT, yS + (1 - se) * 18, AR(400, 30), fg, { align: 'right', rtl: true, alpha: alpha * se * 0.85 });
    const url = typed(st.url, t0 + 0.5, t, 48);
    if (url) {
      txt(url, RIGHT, yU, MO(500, 17), fg, { align: 'right', ls: 1.5, alpha: alpha * 0.7 });
      const uw = measure(url, MO(500, 17), 1.5);
      pill(RIGHT - uw - 26, yU - 11, 10, 10, accent, alpha);
    }
    // per-division extras
    if (k === 0) {
      const i = clamp(Math.floor((t - (TS + 0.12)) / (BEAT / 4)), 0, 11);
      if (t > TS + 0.12) {
        const name = st.list[i];
        const y = yU + 66;
        chip(`${String(i + 1).padStart(2, '0')}/12`, RIGHT - 34, y - 8, { f: MO(600, 15), fg: C.paper, bg: C.ink, h: 30, pad: 10, rtl: false, alpha, anchor: 'right', scale: 1 });
        txt(name, RIGHT - 120, y + 2, AR(600, 30), C.ink, { align: 'right', rtl: true, alpha });
      }
    }
    if (k === 2) {
      const chips = ['شاشات أسطح السيارات', 'مياه معبأة', 'المباني والشوارع', 'داخل التطبيقات'];
      let x = RIGHT;
      chips.forEach((c, j) => {
        const tc = TS + 0.55 + j * 0.125;
        const s = ease.outBackHard(ez(t, tc, tc + 0.22, ease.lin));
        const w = measure(c, AR(500, 21)) + 32;
        chip(c, x - w / 2, yU + 70, { f: AR(500, 21), fg: C.orange, bg: C.ink, h: 40, pad: 16, scale: s, alpha });
        x -= w + 10;
      });
    }
    g.restore();
    // tracked call-outs (not part of the sliding block)
    const fade = 1 - ez(t, out + 0.02, out + 0.2);
    if (k === 3) {
      const b = info.built[3];
      const n = b.cartTimes.filter(c => t >= c).length;
      const last = Math.max(...b.cartTimes.filter(c => t >= c), -9);
      const p = info.frames[3].pos.clone().add(new THREE.Vector3(-3.0, 5.6, 0).applyQuaternion(info.frames[3].quat));
      const [x, y] = proj(p, info.cam);
      const s = ease.outBack(ez(t, TS + 0.05, TS + 0.3, ease.lin)) * (1 + 0.12 * decay(t - last, 14));
      chip(`السلة  ${String(n).padStart(2, '0')}`, x, y, { f: AR(600, 22), fg: C.paper, bg: C.ink, h: 46, pad: 20, scale: s, alpha: fade });
    }
    if (k === 4) {
      const labels = ['تعلّم', 'ابنِ', 'أطلِق'], when = [TS - 0.05, TS + 0.32, TS + 0.66];
      const b = info.built[4];
      b.anchors.forEach((a, j) => {
        const p = info.frames[4].pos.clone().add(new THREE.Vector3(a[0], a[1] + 0.35, a[2]).applyQuaternion(info.frames[4].quat));
        const [x, y] = proj(p, info.cam);
        const s = ease.outBackHard(ez(t, when[j], when[j] + 0.22, ease.lin)) * (j === 2 ? 1 + 0.15 * decay(t - b.launch, 8) * (t > b.launch ? 1 : 0) : 1);
        chip(labels[j], x, y, { f: AR(700, 30), fg: j === 2 ? C.paper : C.ink, bg: j === 2 ? C.orange : '#ECE7E1', h: 54, pad: 22, scale: s, alpha: fade });
      });
    }
    if (k === 5) {
      const p = info.frames[5].pos.clone().add(new THREE.Vector3(2.9, 5.5, 0).applyQuaternion(info.frames[5].quat));
      const [x, y] = proj(p, info.cam);
      const s = ease.outBackHard(ez(t, TS + 0.45, TS + 0.7, ease.lin));
      const msg = 'كيف أساعدك اليوم؟';
      const shown = typed(msg, TS + 0.7, t, 22);
      if (s > 0.01) {
        const f = AR(500, 26);
        const w = Math.max(measure(msg, f), 60) + 44;
        g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = fade;
        pill(-w / 2, -28, w, 56, '#1E1E22');
        g.fillStyle = '#1E1E22'; g.beginPath(); g.moveTo(-w / 2 + 34, 22); g.lineTo(-w / 2 + 22, 44); g.lineTo(-w / 2 + 56, 22); g.fill();
        txt(shown, w / 2 - 22, 9, f, C.paper, { align: 'right', rtl: true });
        const cw = measure(shown, f);
        if (Math.floor(t * 4) % 2 === 0 || shown.length < msg.length) pill(w / 2 - 22 - cw - 10, -14, 3, 28, C.orange);
        g.restore();
      }
    }
    if (k === 6) {
      const b = info.built[6];
      const p = info.frames[6].pos.clone().add(new THREE.Vector3(2.4, 6.0, 0).applyQuaternion(info.frames[6].quat));
      const [x, y] = proj(p, info.cam);
      const s = ease.outBackHard(ez(t, b.placed + 0.08, b.placed + 0.3, ease.lin));
      chip('المنزل الذكي متصل', x, y, { f: AR(600, 22), fg: C.orange, bg: C.ink, h: 46, pad: 20, scale: s, alpha: fade });
    }
    return exit > 0 && exit < 1 ? -(ease.in3(ez(t, out, out + 0.3, ease.lin)) - ease.in3(ez(t - 1 / FPS, out, out + 0.3, ease.lin))) * 900 : 0;
  }

  function overview(t, info) {
    if (t < 20.3 || t > 23.7) return;
    const a = 1 - ez(t, 23.25, 23.55);
    info.stations.forEach((p, k) => {
      const tk = 20.55 + k * 0.125;
      const s = ease.outBackHard(ez(t, tk, tk + 0.22, ease.lin));
      const [x, y] = proj(p.clone().add(new THREE.Vector3(0, 8.5, 0)), info.cam);
      const st = STATIONS[k];
      chip(`${st.n}  ${st.title}${st.title2 ? ' ' + st.title2 : ''}`, x, y, { f: AR(600, 21), fg: C.ink, bg: k % 2 ? C.orange : C.paper, h: 42, pad: 16, scale: s, alpha: a });
    });
    riseWords('سبعة أقسام. علامة واحدة.', RIGHT, 190, AR(700, 74), C.paper, 20.45, t, { size: 74, out: 23.2, stagger: 0.08 });
    if (t > 20.7) txt(scramble('SEVEN DIVISIONS · ONE BRAND', 20.75, t), RIGHT, 236, GR(500, 19), C.orange, { align: 'right', ls: 7, alpha: 1 - ez(t, 23.2, 23.4) });
  }

  function endCard(t) {
    if (t < 24.1) return;
    const xr = RIGHT;
    // wordmark: جو (ink, bold) + فنكشن (burnt, regular), as on the sheet
    const e = ease.out5(ez(t, 24.2, 24.85, ease.lin));
    const f1 = AR(700, 168), f2 = AR(400, 168);
    const w1 = measure('جو', f1), w2 = measure('فنكشن', f2);
    g.save();
    g.beginPath(); g.rect(xr - (w1 + w2 + 20) * e, 330, (w1 + w2 + 40) * e + 20, 260); g.clip();
    txt('جو', xr + (1 - e) * 60, 520, f1, C.ink, { align: 'right', rtl: true });
    txt('فنكشن', xr - w1 + (1 - e) * 120, 520, f2, C.burnt, { align: 'right', rtl: true });
    g.restore();
    riseWords('للخدمات الرقمية', xr, 622, AR(500, 40), C.gray, 24.62, t, { size: 40, stagger: 0.07 });
    if (t > 24.9) txt(scramble('JOFUNCTION — DIGITAL SERVICES', 24.95, t, 0.018), xr, 676, GR(500, 19), C.mute, { align: 'right', ls: 7 });
    // the seven divisions as a row of chips, landing on 8ths
    const names = ['خدماتنا', 'تطبيقاتنا', 'الإعلان', 'المتجر', 'التعليم', 'JoFunction AI', 'الأتمتة'];
    let x = xr, y = 754;
    names.forEach((n, k) => {
      const tk = 25.55 + k * 0.125;
      const f = k === 5 ? GR(500, 19) : AR(500, 20);
      const w = measure(n, f) + 30;
      if (k === 4) { x = xr; y += 54; }
      const s = ease.outBackHard(ez(t, tk, tk + 0.24, ease.lin));
      chip(n, x - w / 2, y, { f, fg: C.ink, bg: '#EDE8E2', h: 42, pad: 15, scale: s, rtl: k !== 5 });
      const tagX = x - w + 8;
      x -= w + 10;
      if (s > 0.5) txt(`0${k + 1}`, tagX + 2, y - 26, MO(600, 12), C.orange, { ls: 1, alpha: ez(t, tk + 0.1, tk + 0.3) });
    });
    // orange rule + domain (the sheet's footer motif)
    const r = ease.out5(ez(t, 26.6, 27.2, ease.lin));
    pill(xr - 64 * r, 872, 64 * r, 6, C.orange);
    if (t > 26.8) txt(typed('jofunction.com', 26.85, t, 30), xr - 84, 881, MO(500, 22), C.ink, { align: 'right', ls: 1 });
    const ca = ez(t, 27.8, 28.3);
    txt('MOTION REEL 2026  ·  DESIGNED, ANIMATED & SCORED IN CODE BY CLAUDE', W / 2, H - 52, MO(400, 13), C.mute, { align: 'center', ls: 3, alpha: ca * 0.85 });
    txt('JOFUNCTION · 7 DIVISIONS · V2.1', 72, 76, MO(500, 14), C.mute, { ls: 3, alpha: ez(t, 25.0, 25.5) * 0.8 });
    txt('PAGE 1 OF 1', W - 72, 76, MO(500, 14), C.mute, { align: 'right', ls: 3, alpha: ez(t, 25.1, 25.6) * 0.8 });
  }

  function draw(t, info) {
    g.clearRect(0, 0, W, H);
    const bg = info.bg;
    const light = luminance(bg) > 0.45;
    const fg = light ? C.ink : C.paper;
    const isOrange = bg === C.orange || (Math.abs(luminance(bg) - luminance(C.orange)) < 0.02 && t > 6);
    const accent = isOrange ? C.ink : C.orange;
    let stIdx = -1;
    for (let k = 0; k < 7; k++) if (t >= 6 + 2 * k - 0.1 && t < 8 + 2 * k - 0.1) stIdx = k;
    hud(t, fg, accent, stIdx);
    let vx = 0;
    if (t < 6.2) intro(t, info, fg);
    for (let k = 0; k < 7; k++) {
      const sb = STATIONS[k].bg;
      const sfg = luminance(sb) > 0.45 ? C.ink : C.paper;
      const sacc = sb === C.orange ? C.ink : C.orange;
      vx += station(t, k, info, sfg, sacc) || 0;
    }
    overview(t, info);
    endCard(t);
    tex.needsUpdate = true;
    return { tex, blurOv: new THREE.Vector2(vx / W * 1.6, 0) };
  }

  return { draw, tex, canvas: cv };
}
