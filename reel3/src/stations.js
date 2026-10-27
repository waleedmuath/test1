// The seven division dioramas. Every one is built from the monogram's own
// pills; each builder places its pills (local coords: x right, y up, z toward
// camera, floor at y = 0), animates them in when the camera lands, and returns
// the per-pill "entry" state the burst delivers them to.
import * as THREE from 'three';
import { S, hidden, linear } from './pills.js';
import { C, PRODUCTS, FONT, STATIONS } from './brand.js';
import { ease, ez, clamp, lerp, rng, decay, wobble, spring, TAU, BEAT, fbm } from './util.js';

const HALF = Math.PI / 2;
const _e = new THREE.Euler();
const qe = (x, y, z) => new THREE.Quaternion().setFromEuler(_e.set(x, y, z));

// local-state shorthands
const Hp = (x, y, z, len, h, color, o = {}) => S({ p: [x, y, z], len, h, color, ...o });
const Vp = (x, y, z, len, h, color, o = {}) => S({ p: [x, y, z], len, h, color, rot: [0, 0, HALF], ...o });
const Disc = (x, y, z, h, color, o = {}) => S({ p: [x, y, z], len: h, h, color, ...o });
const Flat = (x, y, z, len, h, color, o = {}) => S({ p: [x, y, z], len, h, color, rot: [-HALF, 0, 0], ...o });
const scaled = (s, k) => ({ ...s, h: s.h * k, len: s.len * k, dep: s.dep * k });
const moved = (s, dx, dy, dz) => ({ ...s, p: [s.p[0] + dx, s.p[1] + dy, s.p[2] + dz] });
const withQ = (s, q) => ({ ...s, q });

// Space-to-world wrapper for a station frame.
export function framer(frame) {
  const v = new THREE.Vector3();
  const W = s => {
    v.set(s.p[0], s.p[1], s.p[2]).applyMatrix4(frame.m);
    return { ...s, p: [v.x, v.y, v.z], q: frame.quat.clone().multiply(s.q) };
  };
  const Wf = f => (typeof f === 'function' ? t => W(f(t)) : W(f));
  const Wv = a => { const u = new THREE.Vector3(...a).applyQuaternion(frame.quat); return [u.x, u.y, u.z]; };
  const Wp = a => new THREE.Vector3(...a).applyMatrix4(frame.m);
  return { W, Wf, Wv, Wp };
}

/* ------------------------------------------------------------------ 01 */
function servicesA() {
  const ink = C.ink, sand = '#E3DED7', mute = C.mute, o = C.orange;
  const f = [];
  // browser
  f.push(Hp(-1.4, 5.7, 0, 5.65, 0.22, ink), Hp(-1.4, 1.5, 0, 5.65, 0.22, ink), Vp(-4.1, 3.6, 0, 4.42, 0.22, ink), Vp(1.3, 3.6, 0, 4.42, 0.22, ink));
  f.push(Disc(-3.65, 5.25, 0, 0.2, o), Disc(-3.32, 5.25, 0, 0.2, mute), Disc(-2.99, 5.25, 0, 0.2, mute));
  f.push(Hp(-0.9, 5.25, 0, 2.8, 0.24, sand));
  f.push(Hp(-2.55, 3.95, 0.05, 2.2, 1.5, o, { dep: 0.3, rough: 0.3 }));
  f.push(Hp(-0.2, 4.4, 0, 2.2, 0.34, ink), Hp(-0.4, 3.92, 0, 1.8, 0.34, ink));
  f.push(Hp(-0.15, 3.48, 0, 2.3, 0.14, mute), Hp(-0.3, 3.22, 0, 2.0, 0.14, mute));
  f.push(Hp(-0.6, 2.72, 0.05, 1.4, 0.36, ink));
  f.push(Hp(-3.1, 2.0, 0, 1.45, 0.6, sand), Hp(-1.4, 2.0, 0, 1.45, 0.6, sand), Hp(0.3, 2.0, 0, 1.45, 0.6, sand));
  // phone, a step in front
  const z = 0.7;
  f.push(Hp(2.9, 5.6, z, 2.24, 0.24, ink), Hp(2.9, 1.0, z, 2.24, 0.24, ink), Vp(1.9, 3.3, z, 4.84, 0.24, ink), Vp(3.9, 3.3, z, 4.84, 0.24, ink));
  f.push(Hp(2.9, 5.3, z, 0.6, 0.14, ink));
  f.push(Hp(2.9, 4.55, z + 0.05, 1.5, 0.75, C.burnt, { dep: 0.28 }));
  for (const y of [3.65, 3.05, 2.45]) f.push(Disc(2.35, y, z, 0.36, o), Hp(3.15, y, z, 0.95, 0.14, ink));
  f.push(Hp(2.9, 1.4, z, 1.2, 0.2, mute));
  return f; // 30
}
function servicesC(TS) {
  const ink = C.ink, sand = '#E3DED7', mute = C.mute, o = C.orange;
  const f = [];
  f.push(Hp(0, 5.8, 0, 8.42, 0.22, ink), Hp(0, 1.2, 0, 8.42, 0.22, ink), Vp(-4.1, 3.5, 0, 4.82, 0.22, ink), Vp(4.1, 3.5, 0, 4.82, 0.22, ink));
  f.push(Disc(-3.6, 5.3, 0, 0.36, o));
  [4.7, 4.35, 4.0, 3.65].forEach((y, i) => f.push(Hp(-3.25, y, 0, 1.1, 0.14, i ? mute : ink)));
  f.push(Vp(-2.4, 3.5, 0, 4.2, 0.08, '#D6D0C8'));
  f.push(Hp(-1.2, 5.0, 0.05, 1.7, 0.7, sand), Hp(0.75, 5.0, 0.05, 1.7, 0.7, sand), Hp(2.7, 5.0, 0.05, 1.7, 0.7, ink));
  const hs = [1.0, 1.6, 1.3, 2.1, 1.8, 2.6, 2.2, 2.9, 1.5];
  const bars = hs.map((hh, i) => {
    const x = -1.7 + i * 0.65, peak = i === 7;
    return t => {
      const g = ease.outBack(ez(t, TS + 1.05 + i * 0.035, TS + 1.5 + i * 0.035, ease.lin));
      const len = 0.36 + (hh - 0.36) * g;
      return Vp(x, 1.6 + len / 2, 0.05, len, 0.36, peak ? o : ink, peak ? { glow: 0.0 } : {});
    };
  });
  f.push(...bars);
  hs.forEach((hh, i) => {
    if (i % 2 === 0 || i === 7) return;
    const x = -1.7 + i * 0.65;
    f.push(t => Disc(x, 1.6 + 0.36 + (hh - 0.36) * ease.outBack(ez(t, TS + 1.05 + i * 0.035, TS + 1.5 + i * 0.035, ease.lin)) + 0.3, 0.12, 0.16, o));
  });
  f.push(t => S({ p: [0.9, 3.6, 0.25], len: 5.0 * ez(t, TS + 1.25, TS + 1.6, ease.out3) + 0.1, h: 0.07, color: o, rot: [0, 0, 0.28], glow: 1.4 }));
  return f; // 4+5+1+3+9+4+1 = 27
}
export function services({ P, ids, TS, W, Wf, Wv }) {
  const A = servicesA(), Cf = servicesC(TS);
  const entry = {};
  ids.forEach((i, j) => {
    if (j >= A.length) { entry[i] = W(hidden([0, 3, -8])); return; }
    entry[i] = W(A[j]);
    if (j < Cf.length) {
      const target = Cf[j];
      const x0 = A[j].p[0];
      const st = TS + 0.66 + (x0 + 4) * 0.011;
      P.to(i, st, 0.34, Wf(target), { ease: ease.snap, arc: Wv([0, 0.4, 1.6]), spin: [0, 0, (j % 2 ? 1 : -1) * 0.6], smear: 0.012 });
    } else {
      P.to(i, TS + 0.7, 0.25, W(scaled(A[j], 0)), { ease: ease.in3 });
    }
  });
  return { entry };
}

/* ------------------------------------------------------------------ 02 */
function tileTexture(p, i) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g = cv.getContext('2d');
  g.fillStyle = p.color; g.fillRect(0, 0, 512, 512);
  const fg = p.dark ? C.ink : C.paper;
  g.fillStyle = fg;
  g.font = `500 34px ${FONT.mono}`; g.textBaseline = 'top';
  g.fillText(String(i + 1).padStart(2, '0'), 44, 44);
  if (p.house) {
    // the monogram itself, drawn from the sheet's path data
    g.save(); g.translate(256 - 150, 236 - 150); g.scale(3, 3); g.fillStyle = C.ink;
    g.fill(new Path2D('M44.25,75.5 L44.25,29.25 A5.75,5.75 0 0 1 55.75,29.25 L55.75,75.5 Z M24.75,64 L55.75,64 L55.75,75.5 L24.75,75.5 A5.75,5.75 0 0 1 24.75,64 Z M44.25,23.5 L69.75,23.5 A5.75,5.75 0 0 1 69.75,35 L44.25,35 Z M44.25,46.5 L61,46.5 A5.75,5.75 0 0 1 61,58 L44.25,58 Z'));
    g.restore();
  } else {
    g.font = `700 230px ${FONT.grot}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.letterSpacing = '-8px';
    g.fillText(p.sym, 256, 330);
    g.letterSpacing = '0px';
  }
  g.font = `500 36px ${FONT.grot}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText(p.name, 44, 468);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function roundedSquare(r = 0.2) {
  const s = new THREE.Shape();
  s.moveTo(r, 0); s.lineTo(1 - r, 0); s.quadraticCurveTo(1, 0, 1, r); s.lineTo(1, 1 - r); s.quadraticCurveTo(1, 1, 1 - r, 1);
  s.lineTo(r, 1); s.quadraticCurveTo(0, 1, 0, 1 - r); s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0);
  return s;
}
export function products({ P, ids, TS, W, Wf, group }) {
  const entry = {};
  const SZ = 1.3, GAP = 0.17;
  const body = new THREE.ExtrudeGeometry(roundedSquare(0.2), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 6 });
  body.translate(-0.5, -0.5, -0.06);
  const face = new THREE.ShapeGeometry(roundedSquare(0.2), 6);
  face.translate(-0.5, -0.5, 0.095);
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: '#1C1C20', roughness: 0.35, clearcoat: 0.6 });
  const tiles = PRODUCTS.map((p, i) => {
    const g = new THREE.Group();
    const b = new THREE.Mesh(body, bodyMat); b.castShadow = true;
    const fm = new THREE.MeshStandardMaterial({ map: tileTexture(p, i), roughness: 0.4, metalness: 0, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.0 });
    fm.emissiveMap = fm.map;
    const f = new THREE.Mesh(face, fm);
    g.add(b, f);
    g.scale.setScalar(SZ);
    const col = i % 5, row = Math.floor(i / 5);
    g.userData = { col, row, home: new THREE.Vector3((col - 2) * (SZ + GAP), 3.75 - row * (SZ + GAP), 0), fm, p };
    group.add(g);
    return g;
  });
  const update = t => {
    tiles.forEach(g => {
      const { col, row, home, fm, p } = g.userData;
      const t0 = TS - 0.12 + (col + row * 1.5) * 0.055;
      const x = ez(t, t0, t0 + 0.55, ease.lin);
      const flip = ease.outBack(x);
      g.visible = t > t0 - 0.01;
      g.rotation.set(0.35 * (1 - ease.out3(x)), Math.PI * (1 - flip), 0);
      const pop = p.house ? ez(t, TS + 0.95, TS + 1.35, ease.outBackHard) - 0.4 * ez(t, TS + 1.8, TS + 2.2, ease.io3) : 0;
      const wave = 0.12 * Math.sin((t - TS) * 4.2 - col * 0.7 - row * 0.5) * ez(t, TS + 0.6, TS + 1.0);
      g.position.set(home.x, home.y + (1 - ease.out3(x)) * -1.2, home.z - 1.5 * (1 - ease.out3(x)) + pop * 0.9 + wave);
      g.scale.setScalar(SZ * (0.55 + 0.45 * ease.out3(x)) * (1 + pop * 0.12));
      fm.emissiveIntensity = (p.house ? 0.55 * pop : 0) + 0.05;
    });
  };
  // the pills become two counter-rotating orbit rings
  const n1 = Math.min(30, ids.length), n2 = ids.length - n1;
  ids.forEach((i, j) => {
    const ringA = j < n1;
    const n = ringA ? n1 : n2, jj = ringA ? j : j - n1;
    const rx = ringA ? 4.7 : 5.3, rz = ringA ? 2.1 : 2.6, cy = 3.05, tilt = ringA ? 0.16 : -0.12;
    const spd = ringA ? 0.75 : -0.5;
    const tq = qe(0, 0, tilt);
    const appear = TS - 0.1 + (jj / n) * 0.45;
    const st = t => {
      const a = (jj / n) * TAU + (t - TS) * spd;
      const grow = ease.outBack(ez(t, appear, appear + 0.3, ease.lin));
      const pos = new THREE.Vector3(Math.cos(a) * rx, 0, Math.sin(a) * rz).applyQuaternion(tq);
      const tang = Math.atan2(Math.cos(a) * rz, -Math.sin(a) * rx);
      const q = tq.clone().multiply(qe(0, -tang, 0));
      return S({ p: [pos.x, cy + pos.y, pos.z - 0.4], q, h: (ringA ? 0.11 : 0.08) * grow, len: (ringA ? 0.62 : 0.38) * grow, dep: 0.1 * grow, color: ringA ? C.orange : C.paper, glow: ringA ? 2.6 : 0.5 });
    };
    entry[i] = W(hidden([0, 3, -2]));
    P.set(i, appear, Wf(st));
  });
  return { entry, update, tiles };
}

/* ------------------------------------------------------------------ 03 */
export function advertising({ P, ids, TS, W, Wf, group }) {
  const entry = {};
  const items = [];
  const back = { z: -1.5, xs: [-4.0, -2.6, -1.1, 0.5, 2.0, 3.5], hs: [3.4, 5.6, 4.2, 6.2, 3.8, 5.0], ws: [1.1, 1.2, 1.0, 1.3, 1.1, 1.2] };
  const front = { z: 0.6, xs: [-3.3, -1.8, 0.0, 1.5, 3.1], hs: [2.0, 2.8, 1.6, 2.4, 3.0], ws: [1.0, 1.1, 1.3, 1.0, 1.1], cols: [C.paper, C.ink, C.burnt, C.paper, C.ink] };
  const tower = (x, z, H, w, color, dep) => {
    const t0 = TS - 0.18 + (x + 4.2) * 0.035 + (z > 0 ? 0.08 : 0);
    return { t0, f: t => {
      const g = ease.outBack(ez(t, t0, t0 + 0.42, ease.lin));
      const a = clamp(g * 4);
      const len = w + (H - w) * g;
      return Vp(x, len / 2, z, Math.max(len, w * a), w * a, color, { dep: dep * a });
    } };
  };
  back.xs.forEach((x, i) => items.push(tower(x, back.z, back.hs[i], back.ws[i], i % 2 ? C.ink : '#1E1E22', 1.4)));
  front.xs.forEach((x, i) => items.push(tower(x, front.z, front.hs[i], front.ws[i], front.cols[i], 1.1)));
  // building wraps
  [[1, 4.0], [3, 4.7]].forEach(([bi, y]) => {
    const x = back.xs[bi], w = back.ws[bi];
    const t0 = TS + 0.42 + bi * 0.03;
    items.push({ t0, f: t => { const g = ease.outBackHard(ez(t, t0, t0 + 0.3, ease.lin)); return Hp(x, y + (1 - g) * 0.6, back.z, (w + 0.14) * g, 0.55 * g, C.paper, { dep: 1.54 * g }); } });
  });
  // billboard on the tower at x = 2.0 (top at y = 3.8)
  const bx = 2.0, bz = back.z + 0.2, by = 5.35;
  const flip = t => ease.outBack(ez(t, TS + 0.5, TS + 0.95, ease.lin));
  const bb = (dx, dy, dz, len, h, color, o = {}) => t => {
    const a = flip(t);
    const q = qe(-HALF * (1 - a), 0, 0);
    const v = new THREE.Vector3(dx, dy, dz).applyQuaternion(q);
    return S({ p: [bx + v.x, 4.75 + v.y, bz + v.z], q: q.clone().multiply(o.rot ? qe(...o.rot) : new THREE.Quaternion()), len: len * clamp(a * 3), h: h * clamp(a * 3), dep: (o.dep ?? 0.16) * clamp(a * 3), color, glow: o.glow || 0 });
  };
  items.push({ t0: TS + 0.5, f: bb(0, by - 4.75, 0, 3.15, 1.2, C.ink, { dep: 0.2 }) });
  items.push({ t0: TS + 0.5, f: bb(-0.75, 0.0, -0.05, 1.05, 0.12, C.ink, { rot: [0, 0, HALF], dep: 0.12 }) });
  items.push({ t0: TS + 0.5, f: bb(0.75, 0.0, -0.05, 1.05, 0.12, C.ink, { rot: [0, 0, HALF], dep: 0.12 }) });
  // the car with its roof screen
  const carX = t => -7.5 + (t - (TS - 0.25)) * 6.2;
  const car = (dx, dy, len, h, color, o = {}) => t => {
    const x = carX(t);
    const bounce = 0.03 * Math.sin((t - TS) * 31);
    return S({ p: [x + dx, dy + (o.wheel ? 0 : bounce), 2.6], len, h, dep: o.dep ?? 1.0, color, glow: o.glow || 0, rot: o.wheel ? [0, 0, -(x + 7.5) / 0.25] : [0, 0, 0] });
  };
  items.push({ t0: TS - 0.3, f: car(0, 0.64, 2.2, 0.72, C.paper) });
  items.push({ t0: TS - 0.3, f: car(-0.1, 1.14, 1.15, 0.52, C.paper, { dep: 0.9 }) });
  items.push({ t0: TS - 0.3, f: car(-0.1, 1.55, 0.95, 0.3, '#FFF3E6', { dep: 0.14, glow: 2.2 }) });
  items.push({ t0: TS - 0.3, f: car(-0.62, 0.27, 0.5, 0.5, C.ink, { dep: 1.08, wheel: true }) });
  items.push({ t0: TS - 0.3, f: car(0.62, 0.27, 0.5, 0.5, C.ink, { dep: 1.08, wheel: true }) });
  // lane dashes
  for (let k = 0; k < 6; k++) {
    const x = -5 + k * 2, t0 = TS - 0.2 + k * 0.03;
    items.push({ t0, f: t => { const g = ease.out3(ez(t, t0, t0 + 0.25, ease.lin)); return Flat(x, 0.03, 3.7, 0.9 * g, 0.13 * g, C.paper, { dep: 0.05 }); } });
  }
  ids.forEach((i, j) => {
    if (j >= items.length) { entry[i] = W(hidden([0, -2, 0])); return; }
    entry[i] = W(hidden([items[j].f(items[j].t0 + 10).p[0], -1, 0]));
    P.set(i, items[j].t0, Wf(items[j].f));
  });
  // LED screen
  const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#0D0D0F'; g.fillRect(0, 0, 2048, 256);
  g.fillStyle = C.orange; g.font = `700 120px ${FONT.ar}`; g.textBaseline = 'middle'; g.direction = 'rtl'; g.textAlign = 'right';
  g.fillText('إعلانك هنا', 1990, 132);
  g.direction = 'ltr'; g.textAlign = 'left'; g.fillStyle = '#FFF3E6'; g.font = `500 70px ${FONT.mono}`;
  g.fillText('ADVERTISING.JOFUNCTION.COM ·', 70, 136);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(0.5, 1);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 0.82), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.25, 1.25, 1.25) }));
  group.add(screen);
  const update = t => {
    const a = flip(t);
    screen.visible = a > 0.02;
    const q = qe(-HALF * (1 - a), 0, 0);
    const v = new THREE.Vector3(0, by - 4.75, 0.13).applyQuaternion(q);
    screen.position.set(bx + v.x, 4.75 + v.y, bz + v.z);
    screen.quaternion.copy(q);
    screen.scale.setScalar(clamp(a * 3));
    tex.offset.x = (t - TS) * 0.32;
  };
  return { entry, update };
}

/* ------------------------------------------------------------------ 04 */
export function store({ P, ids, TS, W, Wf }) {
  const entry = {}, items = [];
  const shelfY = [1.0, 2.6, 4.2];
  const ink = C.ink;
  [-3.7, 3.7].forEach((x, k) => {
    const t0 = TS - 0.2 + k * 0.05;
    items.push({ t0, f: t => { const g = ease.outBack(ez(t, t0, t0 + 0.35, ease.lin)); const len = 0.22 + 4.9 * g; return Vp(x, len / 2, 0, len, 0.22, ink, { dep: 1.3 }); } });
  });
  shelfY.forEach((y, k) => {
    const t0 = TS - 0.12 + k * 0.06;
    items.push({ t0, f: t => { const g = ease.outBack(ez(t, t0, t0 + 0.35, ease.lin)); return Hp(0, y, 0, 0.2 + 7.4 * g, 0.2, ink, { dep: 1.45 }); } });
  });
  const kinds = [
    { h: 0.42, len: 1.05, v: true }, { h: 0.82, len: 0.95, v: false, dep: 0.8 }, { h: 0.55, len: 0.82, v: true },
    { h: 0.74, len: 0.74, v: false, dep: 0.74 }, { h: 0.62, len: 0.9, v: true }, { h: 0.3, len: 1.02, v: true }
  ];
  const cols = [C.orange, C.paper, C.burnt, C.ink, '#B9B0A5', C.orange, '#FFB400', C.paper, C.burnt];
  const R = rng(44);
  let n = 0;
  for (let s = 2; s >= 0; s--) {
    for (let c = 0; c < 6; c++) {
      const k = kinds[(c + s * 2) % kinds.length], color = cols[(c * 2 + s) % cols.length];
      const x = -3.0 + c * 1.2 + R.range(-0.12, 0.12);
      const top = shelfY[s] + 0.1 + (k.v ? k.len : k.h) / 2;
      const t0 = TS - 0.05 + n * 0.058;
      const tilt = R.range(-0.08, 0.08);
      items.push({ t0, f: t => {
        const x01 = ez(t, t0, t0 + 0.55, ease.lin);
        const y = top + 6.5 * (1 - ease.outBounce(x01));
        // squash on the first contact
        const sq = 0.28 * wobble(t - (t0 + 0.55 / 2.75), 5, 9);
        const a = clamp(x01 * 6);
        const st = k.v ? Vp(x, y, 0.1, k.len * (1 - sq), k.h * (1 + sq) * a, color, { dep: k.dep ?? k.h }) : Hp(x, y, 0.1, k.len * (1 + sq), k.h * (1 - sq) * a, color, { dep: k.dep ?? k.h });
        st.q.multiply(qe(0, tilt * 3, tilt));
        return st;
      } });
      n++;
    }
  }
  // price tag swinging under the top shelf
  const tagT = TS + 0.95;
  items.push({ t0: tagT, f: t => { const g = ez(t, tagT, tagT + 0.2, ease.out3); return Vp(2.2, 4.2 - 0.32 * g, 0.85, 0.64 * g, 0.045, ink, { dep: 0.05 }); } });
  items.push({ t0: tagT, f: t => {
    const g = ease.outBackHard(ez(t, tagT + 0.05, tagT + 0.35, ease.lin));
    const sw = 0.55 * wobble(t - tagT - 0.05, 1.6, 2.6);
    const q = qe(0, 0, -1.25 + sw);
    const v = new THREE.Vector3(0.7, 0, 0).applyQuaternion(q);
    return S({ p: [2.2 + v.x * g, 3.6 + v.y * g, 0.85], q, len: 1.3 * g, h: 0.5 * g, dep: 0.1 * g, color: C.orange, glow: 0.25 });
  } });
  ids.forEach((i, j) => {
    if (j >= items.length) { entry[i] = W(hidden([0, 9, 0])); return; }
    entry[i] = W(hidden([0, 9, 0]));
    P.set(i, items[j].t0, Wf(items[j].f));
  });
  const cartTimes = items.slice(5, 23).map(it => it.t0 + 0.55 / 2.75);
  return { entry, cartTimes };
}

/* ------------------------------------------------------------------ 05 */
export function education({ P, ids, TS, W, Wf }) {
  const entry = {}, items = [];
  const ink = C.ink, o = C.orange;
  // LEARN — a stack of books
  const bc = [o, ink, '#B9B0A5', C.burnt, ink];
  for (let j = 0; j < 5; j++) {
    const t0 = TS - 0.12 + j * 0.085, y = 0.23 + j * 0.45, ry = (j % 2 ? 1 : -1) * 0.14 + j * 0.02;
    items.push({ t0, f: t => {
      const x01 = ez(t, t0, t0 + 0.4, ease.lin);
      const a = clamp(x01 * 5);
      return Hp(-3.2 + (j % 2 ? 0.08 : -0.06), y + 3.2 * (1 - ease.outBounce(x01)), 0, (2.0 - j * 0.1) * a, 0.42 * a, bc[j], { dep: 1.3 * a, rot: [0, ry, 0] });
    } });
  }
  // BUILD — a two-storey frame, snapped together piece by piece
  const parts = [
    [-0.55, 0.65, 1.3, true, ink], [0.55, 0.65, 1.3, true, ink], [0, 1.45, 1.7, false, o],
    [-0.55, 2.25, 1.3, true, ink], [0.55, 2.25, 1.3, true, ink], [0, 3.05, 1.7, false, o]
  ];
  parts.forEach(([x, y, len, v, col], j) => {
    const t0 = TS + 0.3 + j * 0.07;
    const fromX = (j % 2 ? 1 : -1) * 2.5;
    items.push({ t0, f: t => {
      const x01 = ez(t, t0, t0 + 0.3, ease.lin);
      const g = ease.outBackHard(x01), a = clamp(x01 * 4);
      const st = (v ? Vp : Hp)(x + fromX * (1 - g), y + 1.5 * (1 - ease.out3(x01)), 0, len * a, (v ? 0.36 : 0.32) * a, col, { dep: 0.9 * a });
      return st;
    } });
  });
  // LAUNCH — a rocket that leaves the frame
  const launch = TS + 1.15;
  const rocketY = t => 9 * Math.pow(ez(t, launch, launch + 0.9, ease.lin), 2.2) + 0.05 * Math.sin(t * 90) * ez(t, launch - 0.2, launch);
  const pieces = [
    [0, 1.75, 0, 2.3, 0.78, C.paper, true, 0],
    [0, 2.2, 0.36, 0.32, 0.32, o, false, 0],
    [-0.42, 0.75, 0, 0.8, 0.22, ink, false, 2.25],
    [0.42, 0.75, 0, 0.8, 0.22, ink, false, 0.89]
  ];
  pieces.forEach(([x, y, z, len, h, col, v, rz], j) => {
    const t0 = TS + 0.62 + j * 0.06;
    items.push({ t0, f: t => {
      const g = ease.outBackHard(ez(t, t0, t0 + 0.3, ease.lin));
      const gone = t > launch + 0.95 ? 0 : 1;
      return S({ p: [3.0 + x, y + rocketY(t), z], len: len * g * gone, h: h * g * gone, dep: (z ? 0.1 : h) * g * gone, color: col, rot: [0, 0, v ? HALF : rz] });
    } });
  });
  items.push({ t0: launch - 0.15, f: t => {
    const ig = ez(t, launch - 0.15, launch, ease.out3) * (t > launch + 0.95 ? 0 : 1);
    const fl = 1 + 0.25 * fbm(t * 30, 3);
    return Vp(3.0, 0.15 + rocketY(t) - 0.35 * fl * ig, 0, 1.0 * fl * ig, 0.42 * ig, o, { glow: 3.2, dep: 0.42 * ig });
  } });
  const R = rng(5);
  for (let j = 0; j < 12; j++) {
    const te = launch - 0.1 + j * 0.055, dx = R.range(-1.4, 1.4), size = R.range(0.5, 1.0), dz = R.range(-0.5, 0.3);
    items.push({ t0: te, f: t => {
      const age = t - te;
      const y0 = 0.25 + rocketY(te);
      const g = ease.out3(clamp(age / 0.5)) * (1 - ease.in3(clamp((age - 0.5) / 0.55)));
      return Disc(3.0 + dx * ease.out3(clamp(age / 0.7)), y0 + 0.4 * age, dz, size * g, j % 3 ? '#E7E1D9' : '#CFC6BA', { dep: size * g });
    } });
  }
  ids.forEach((i, j) => {
    entry[i] = W(hidden([0, 10, 0]));
    if (j >= items.length) return;
    P.set(i, items[j].t0, Wf(items[j].f));
  });
  return { entry, anchors: [[-3.2, 2.75, 0], [0, 3.55, 0], [3.0, 3.3, 0]], launch };
}

/* ------------------------------------------------------------------ 06 */
export function ai({ P, ids, TS, W, Wf }) {
  const entry = {};
  const n = ids.length - 3, R0 = 2.45, cy = 3.25;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const axisW = new THREE.Vector3(1, 0.45, 0.25).normalize();
  const spinQ = t => qe(0.35, (t - TS) * 0.7, 0.12);
  const beatPulse = t => { let p = 0; for (let b = 0; b < 5; b++) p += 0.07 * decay(t - (TS + b * BEAT), 9); return p; };
  ids.forEach((i, j) => {
    if (j >= n) return;
    const yN = 1 - (j / (n - 1)) * 2, r = Math.sqrt(1 - yN * yN), th = golden * j;
    const nrm = new THREE.Vector3(Math.cos(th) * r, yN, Math.sin(th) * r);
    // long axis along the local meridian
    const up = new THREE.Vector3(0, 1, 0);
    const tangent = up.clone().sub(nrm.clone().multiplyScalar(up.dot(nrm))).normalize();
    if (!isFinite(tangent.x) || tangent.lengthSq() < 1e-4) tangent.set(1, 0, 0);
    const bin = new THREE.Vector3().crossVectors(tangent, nrm);
    const baseQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent, nrm, bin));
    const t0 = TS - 0.12 + (1 - Math.abs(yN)) * 0.08 + (j % 7) * 0.012;
    const st = t => {
      const q = spinQ(t);
      const n2 = nrm.clone().applyQuaternion(q);
      const born = ease.outExp(ez(t, t0, t0 + 0.55, ease.lin));
      const rad = R0 * (1 + beatPulse(t)) * born;
      const phase = ((t - TS) * 1.05) % 1.0 * 2.8 - 1.4;
      const band = Math.exp(-(((n2.dot(axisW) - phase) / 0.16) ** 2));
      const spark = Math.max(0, Math.sin(j * 12.9898 + t * 7)) ** 24;
      const g = band * 3.2 + spark * 2.0;
      const col = [lerp(0.55, 1.0, clamp(g)), lerp(0.53, 0.105, clamp(g)), lerp(0.5, 0.0, clamp(g))];
      return S({ p: [n2.x * rad, cy + n2.y * rad, n2.z * rad], q: q.clone().multiply(baseQ), h: 0.11 * clamp(born * 1.5), len: 0.44 * clamp(born * 1.5), dep: 0.11, col, glow: g * 1.2, rough: 0.3 });
    };
    entry[i] = W(hidden([0, cy, 0]));
    P.set(i, t0, Wf(st));
  });
  // three orbiting "electrons"
  ids.slice(n).forEach((i, k) => {
    const t0 = TS + 0.2 + k * 0.1;
    const tq = qe(0.9 + k * 0.7, k * 1.3, 0.4 * k);
    const st = t => {
      const a = (t - TS) * (3.2 - k * 0.6) + k * 2.1;
      const g = ease.outBack(ez(t, t0, t0 + 0.3, ease.lin));
      const v = new THREE.Vector3(Math.cos(a) * 3.4, 0, Math.sin(a) * 3.4).applyQuaternion(tq);
      const tangent = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).applyQuaternion(tq);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), tangent);
      return S({ p: [v.x, cy + v.y, v.z], q, h: 0.16 * g, len: 0.9 * g, dep: 0.16, color: C.orange, glow: 3.5 });
    };
    entry[i] = W(hidden([0, cy, 0]));
    P.set(i, t0, Wf(st));
  });
  return { entry };
}

/* ------------------------------------------------------------------ 07 */
function ik2(x, y, L1, L2) {
  const d = Math.min(Math.hypot(x, y), L1 + L2 - 1e-3);
  const c2 = clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
  const a2 = Math.acos(c2);
  const a1 = Math.atan2(y, x) - Math.atan2(L2 * Math.sin(a2), L1 + L2 * Math.cos(a2));
  return [a1, a2];
}
export function automation({ P, ids, TS, W, Wf }) {
  const entry = {}, items = [];
  const ink = C.ink;
  const SH = [-1.2, 1.15], L1 = 3.1, L2 = 2.9, L3 = 0.9;
  // wrist targets over time (local x, y), gripper closure
  const keys = [
    [TS - 0.2, -0.7, 5.4], [TS + 0.25, -3.4, 2.4], [TS + 0.4, -3.4, 1.3], [TS + 0.62, -3.4, 1.3],
    [TS + 0.85, -2.6, 3.9], [TS + 1.18, 2.4, 5.9], [TS + 1.33, 2.4, 5.62], [TS + 1.48, 2.4, 5.62], [TS + 1.8, 0.2, 5.6], [TS + 9, 0.2, 5.6]
  ];
  const wrist = t => {
    let k = 0;
    while (k < keys.length - 2 && t > keys[k + 1][0]) k++;
    const [ta, xa, ya] = keys[k], [tb, xb, yb] = keys[k + 1];
    const e = ease.io3(clamp((t - ta) / (tb - ta)));
    return [lerp(xa, xb, e), lerp(ya, yb, e)];
  };
  const grip = t => ez(t, TS + 0.42, TS + 0.55, ease.out3) * (1 - ez(t, TS + 1.36, TS + 1.46, ease.out3));
  const pose = t => {
    const [wx, wy] = wrist(t);
    const [a1, a2] = ik2(wx - SH[0], wy - SH[1], L1, L2);
    const E = [SH[0] + Math.cos(a1) * L1, SH[1] + Math.sin(a1) * L1];
    const Wr = [E[0] + Math.cos(a1 + a2) * L2, E[1] + Math.sin(a1 + a2) * L2];
    return { a1, a2, E, Wr };
  };
  const assemble = (t, k) => ease.outBackHard(ez(t, TS - 0.25 + k * 0.06, TS + 0.05 + k * 0.06, ease.lin));
  const seg = (A, B, h, color, g, dep) => {
    const dx = B[0] - A[0], dy = B[1] - A[1];
    const len = Math.hypot(dx, dy);
    return S({ p: [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, 0], rot: [0, 0, Math.atan2(dy, dx)], len: (len + h) * g, h: h * g, dep: dep * g, color });
  };
  items.push({ t0: TS - 0.25, f: t => { const g = assemble(t, 0); return Vp(SH[0], 0.55 * g, 0, 1.1 * g, 1.0 * g, ink, { dep: 1.2 * g }); } });
  items.push({ t0: TS - 0.2, f: t => { const p = pose(t); return seg(SH, p.E, 0.46, ink, assemble(t, 1), 0.5); } });
  items.push({ t0: TS - 0.15, f: t => { const p = pose(t); return seg(p.E, p.Wr, 0.38, ink, assemble(t, 2), 0.45); } });
  items.push({ t0: TS - 0.1, f: t => { const p = pose(t); return seg(p.Wr, [p.Wr[0], p.Wr[1] - L3 * 0.75], 0.3, ink, assemble(t, 3), 0.4); } });
  [-1, 1].forEach((sgn, k) => items.push({ t0: TS - 0.05, f: t => {
    const p = pose(t), g = assemble(t, 4 + k), open = 1 - grip(t);
    const a = -HALF + sgn * (0.08 + 0.32 * open);
    const base = [p.Wr[0] + sgn * 0.16, p.Wr[1] - L3 * 0.72];
    const tip = [base[0] + Math.cos(a) * 0.5, base[1] + Math.sin(a) * 0.5];
    return seg(base, tip, 0.13, ink, g, 0.3);
  } }));
  items.push({ t0: TS - 0.2, f: t => { const g = assemble(t, 1); return Disc(SH[0], SH[1], 0, 0.62 * g, C.paper, { dep: 0.62 * g }); } });
  items.push({ t0: TS - 0.15, f: t => { const p = pose(t), g = assemble(t, 2); return Disc(p.E[0], p.E[1], 0, 0.54 * g, C.paper, { dep: 0.58 * g }); } });
  // the chip it carries to the roof
  const placed = TS + 1.4;
  items.push({ t0: TS - 0.1, f: t => {
    const g = ease.outBack(ez(t, TS - 0.1, TS + 0.15, ease.lin));
    const lit = ez(t, placed, placed + 0.15);
    let x = -3.4, y = 0.2;
    if (t > TS + 0.5) { const p = pose(Math.min(t, placed)); x = p.Wr[0]; y = p.Wr[1] - L3 - 0.12; }
    return Hp(x, y, 0, 0.75 * g, 0.3 * g, C.paper, { dep: 0.5 * g, glow: 1.5 * lit + 0.6 * lit * Math.sin(t * 12) ** 2 });
  } });
  // the house
  const house = [
    [Vp, 1.0, 1.3, 0, 2.6, 0.3], [Vp, 3.8, 1.3, 0, 2.6, 0.3], [Hp, 2.4, 0.15, 0, 3.1, 0.3],
    ['roof', 1.55, 3.52, 2.36, 0.32, 0.74], ['roof', 3.25, 3.52, 2.36, 0.32, -0.74], [Vp, 2.4, 0.78, 0.05, 1.3, 0.55]
  ];
  house.forEach(([fn, x, y, z, len, h], k) => {
    const t0 = TS - 0.2 + k * 0.05;
    items.push({ t0, f: t => {
      const x01 = ez(t, t0, t0 + 0.4, ease.lin), g = ease.outBackHard(x01), a = clamp(x01 * 4);
      if (fn === 'roof') return S({ p: [x, y + 2.5 * (1 - ease.out3(x01)), 0], rot: [0, 0, h], len: z * a, h: len * a, dep: 1.1 * a, color: ink });
      return fn(x, y + 2.5 * (1 - ease.out3(x01)), z, len * g, h * a, ink, { dep: 1.1 * a });
    } });
  });
  [[1.75, 1.85], [3.05, 1.85]].forEach(([x, y], k) => {
    const t0 = TS - 0.05 + k * 0.05, on = placed + 0.05 + k * 0.1;
    items.push({ t0, f: t => {
      const g = ease.outBack(ez(t, t0, t0 + 0.3, ease.lin)), lit = ez(t, on, on + 0.08);
      return S({ p: [x, y, 0.1], len: 0.62 * g, h: 0.62 * g, dep: 1.15 * g, col: lit > 0 ? linear('#FFF1DA') : linear('#3A2A20'), glow: 2.4 * lit, rough: 0.5 });
    } });
  });
  // a little floor robot that wakes up with the house
  items.push({ t0: placed, f: t => {
    const g = ease.outBack(ez(t, placed + 0.1, placed + 0.35, ease.lin));
    const x = 1.3 + 2.2 * (0.5 - 0.5 * Math.cos((t - placed) * 3.2));
    return Flat(x, 0.12, 2.0, 0.75 * g, 0.75 * g, C.paper, { dep: 0.2 * g, glow: 0.2 });
  } });
  ids.forEach((i, j) => {
    entry[i] = W(hidden([0, 9, 0]));
    if (j >= items.length) return;
    P.set(i, items[j].t0, Wf(items[j].f));
  });
  return { entry, placed };
}

export const BUILDERS = [services, products, advertising, store, education, ai, automation];
export const NEEDS = [30, 48, 27, 25, 28, 0, 18]; // 0 → takes every spare pill
