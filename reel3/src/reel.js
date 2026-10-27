// Choreography: the monogram is built bar by bar, rebuilt from pills, burst
// into seven streams that become the seven divisions around a ring, then
// recalled into the monogram for the end card. Everything is a pure function
// of time t.
import * as THREE from 'three';
import { ease, ez, clamp, lerp, rng, decay, spring, fbm, mixHex, cubic, BEAT, b2t } from './util.js';
import { C, STATIONS, LOGO } from './brand.js';
import { Pills, S, hidden, linear } from './pills.js';
import { makeLogo, packLayout, L, LOGO_K, GLYPH_Z, GLYPH_DEPTH, TILE_DEPTH, LOGO_SIZE, LOGO_LIFT } from './logo.js';
import { stationFrame, aimLights, RING } from './stage.js';
import { BUILDERS, NEEDS, framer } from './stations.js';

export const T = {
  bars: [1.0, 1.5, 2.0, 2.5],
  tile: 3.0,
  scan: 4.0, scanEnd: 4.62,
  groups: 4.75,
  burst: 5.25,
  st: k => 6 + 2 * k,
  overview: 20.0,
  recall: 21.2,
  fuse: 23.86,
  impact: 24.0,
  flourish: 28.0
};
export const LOGO_CENTER = new THREE.Vector3(0, LOGO_LIFT + LOGO_SIZE / 2, 0);

const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export function buildReel(stage) {
  const { scene } = stage;
  const R = rng(2026);

  /* ---------- monogram ---------- */
  const logo = makeLogo();
  logo.group.rotation.y = Math.PI; // faces -z, toward the opening camera
  scene.add(logo.group);
  logo.group.updateMatrixWorld(true);
  const logoM = logo.group.matrixWorld.clone(), logoQ = logo.group.quaternion.clone();
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 100);
  [logo.tileMat, ...logo.bars.map(b => b.material)].forEach(m => { m.clippingPlanes = [clip]; });
  logo.tile.material = logo.tileMat;
  const scanBar = new THREE.Mesh(new THREE.BoxGeometry(LOGO_SIZE + 0.6, 0.045, TILE_DEPTH + 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 1.1, 0.1) }));
  scene.add(scanBar);

  /* ---------- packed layout → pill pool ---------- */
  const pack = packLayout(11);
  const N = pack.length;
  const P = new Pills(N);
  scene.add(P.mesh);
  const packZ = m => (m === 'glyph' ? (-TILE_DEPTH / 2 + GLYPH_Z + GLYPH_DEPTH / 2) / 2 : 0);
  const packDep = m => (m === 'glyph' ? GLYPH_Z + GLYPH_DEPTH / 2 + TILE_DEPTH / 2 : TILE_DEPTH) * 0.96;
  const v = new THREE.Vector3();
  const toWorld = s => { v.set(...s.p).applyMatrix4(logoM); return { ...s, p: [v.x, v.y, v.z], q: logoQ.clone().multiply(s.q) }; };
  const packState = pack.map(c => {
    const [x, y] = L(c.x, c.y);
    return toWorld(S({ p: [x, y, packZ(c.m)], len: c.len * LOGO_K, h: c.h * LOGO_K, dep: packDep(c.m), color: c.m === 'glyph' ? C.paper : '#121214', rough: c.m === 'glyph' ? 0.42 : 0.3 }));
  });
  const fused = pack.map((c, i) => ({ ...packState[i], len: packState[i].len + 0.55 * LOGO_K, h: packState[i].h + 0.5 * LOGO_K }));

  // seven equal wedges, clockwise from twelve o'clock; wedge k feeds division k
  const angleOf = c => (Math.atan2(c.x - 50, -(c.y - 50)) + Math.PI * 2) % (Math.PI * 2);
  const order = pack.map((c, i) => i).sort((a, b) => angleOf(pack[a]) - angleOf(pack[b]));
  const group = new Int32Array(N);
  const wedges = Array.from({ length: 7 }, () => []);
  order.forEach((i, r) => { const k = Math.min(6, Math.floor((r / N) * 7)); group[i] = k; wedges[k].push(i); });
  const ids = Array.from({ length: 7 }, () => []);
  const spare = [];
  wedges.forEach((w, k) => {
    if (NEEDS[k] === 0) { ids[k].push(...w); return; }
    // sort the wedge top-to-bottom, left-to-right so formations fill in reading order
    const sorted = [...w].sort((a, b) => pack[a].y - pack[b].y || pack[a].x - pack[b].x);
    ids[k].push(...sorted.slice(0, NEEDS[k]));
    spare.push(...sorted.slice(NEEDS[k]));
  });
  ids[5].push(...spare);
  const station = new Int32Array(N);
  ids.forEach((list, k) => list.forEach(i => (station[i] = k)));

  /* ---------- stations ---------- */
  const frames = Array.from({ length: 7 }, (_, k) => stationFrame(k));
  const plates = [];
  const built = BUILDERS.map((fn, k) => {
    const fr = frames[k];
    const grp = new THREE.Group();
    grp.position.copy(fr.pos); grp.quaternion.copy(fr.quat);
    scene.add(grp);
    const bg = STATIONS[k].bg;
    const plate = new THREE.Mesh(new THREE.CircleGeometry(10.5, 96), new THREE.MeshBasicMaterial({ color: bg === C.ink ? '#141416' : bg }));
    plate.rotation.x = -Math.PI / 2; plate.position.set(0, 0.001, -1);
    grp.add(plate);
    plates.push(plate);
    const f = framer(fr);
    return { ...fn({ P, ids: ids[k], TS: T.st(k), group: grp, ...f }), f, grp };
  });

  /* ---------- pill tracks: start, scan, burst, recall, fuse ---------- */
  const yTop = LOGO_LIFT + LOGO_SIZE, yBot = LOGO_LIFT;
  const scanAt = y => T.scan + ((yTop - y) / (yTop - yBot)) * (T.scanEnd - T.scan);
  for (let i = 0; i < N; i++) {
    const ps = packState[i];
    P.set(i, 0, { ...ps, h: 0, len: 0, dep: 0 });
    P.set(i, scanAt(ps.p[1]) - 0.004, ps);
    const k = station[i];
    const entry = built[k].entry[i];
    const r1 = R(), r2 = R(), r3 = R();
    if (k === 0) {
      const t0 = T.burst + r1 * 0.14;
      P.to(i, t0, 0.62 + r2 * 0.2, entry, { ease: cubic(0.35, 0, 0.12, 1), arc: [(r2 - 0.5) * 7, 1 + r3 * 3.5, (r1 - 0.5) * 4], smear: 0.03, spin: [0, 0, (r3 - 0.5) * 6] });
    } else {
      const t0 = T.burst + r1 * 0.12;
      P.to(i, t0, 0.55 + r2 * 0.35, entry, { ease: ease.out3, arc: [(r2 - 0.5) * 6, 2 + r3 * 5, (r1 - 0.5) * 6], smear: 0.03 });
    }
    // recall: division by division, from far side to near side
    const tr = T.recall + [6, 5, 4, 3, 2, 1, 0][k] * 0.11 + r2 * 0.35;
    const dr = Math.min(T.fuse - 0.02 - tr, 1.25 + r3 * 0.4);
    P.to(i, tr, dr, packState[i], { ease: cubic(0.45, 0, 0.2, 1), arc: [(r1 - 0.5) * 8, 7 + r3 * 7, (r2 - 0.5) * 8], smear: 0.025 });
    P.to(i, T.fuse, T.impact - T.fuse, fused[i], { ease: ease.in2 });
    if (i % 3 === 0) {
      const f0 = fused[i], c = LOGO_CENTER;
      const dir = new THREE.Vector3(f0.p[0] - c.x, f0.p[1] - c.y, 0).normalize();
      dir.x += (R() - 0.5) * 0.6; dir.y += (R() - 0.5) * 0.6; dir.z = (R() - 0.5) * 1.2 + 0.25;
      dir.normalize();
      const dist = 4 + R() ** 1.6 * 13, life = 1.2 + R() * 2.0, spin = (R() - 0.5) * 9;
      const drift = (R() - 0.5) * 0.5, col = R() < 0.3 ? linear(C.orange) : f0.col;
      P.set(i, T.impact, t => {
        const a = t - T.impact;
        const k = 1 - Math.exp(-a * 3.2);
        const size = Math.max(0, 1 - a / life) ** 0.7;
        const q = f0.q.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(spin * k * 0.3, spin * k * 0.2, spin * k)));
        return { ...f0, p: [f0.p[0] + dir.x * dist * k + drift * a, f0.p[1] + dir.y * dist * k + 0.25 * a, f0.p[2] + dir.z * dist * k], q, h: f0.h * size, len: f0.len * size, dep: f0.dep * size, col, glow: col === f0.col ? 0 : 0.3 };
      });
    } else P.set(i, T.impact, { ...fused[i], h: 0, len: 0, dep: 0 });
  }
  // group highlight: wedges light up one by one, then the whole icon flares before the burst
  const glowStart = k => T.groups + k * (BEAT / 8);
  const orange = linear(C.orange);
  P.post = (i, t, s) => {
    if (t < T.groups - 0.05 || t > T.burst + 0.6) return s;
    const k = group[i];
    const g = 2.6 * decay(t - glowStart(k), 7) * (t >= glowStart(k) ? 1 : 0) + 0.9 * ez(t, T.burst - 0.12, T.burst, ease.in2) * decay(t - T.burst, 5);
    if (g < 0.01) return s;
    const m = clamp(g * 0.6);
    return { ...s, glow: s.glow + g, col: [lerp(s.col[0], orange[0], m), lerp(s.col[1], orange[1], m), lerp(s.col[2], orange[2], m)] };
  };
  const groupCentroids = wedges.map(w => {
    const c = new THREE.Vector3();
    w.forEach(i => c.add(V3(packState[i].p)));
    return c.divideScalar(w.length);
  });

  /* ---------- dust ---------- */
  const DUST = 900;
  const dustGeo = new THREE.BufferGeometry();
  const dustSeed = new Float32Array(DUST * 4);
  for (let i = 0; i < DUST; i++) { dustSeed[i * 4] = R(); dustSeed[i * 4 + 1] = R(); dustSeed[i * 4 + 2] = R(); dustSeed[i * 4 + 3] = R(); }
  const dustPos = new Float32Array(DUST * 3);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dot = document.createElement('canvas'); dot.width = dot.height = 32;
  { const g = dot.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(0.45, 'rgba(255,255,255,0.8)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
  const dustMat = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dot), color: new THREE.Color(1.6, 1.25, 1.0), size: 0.11, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---------- camera ---------- */
  const lk = new THREE.Vector3(), ps = new THREE.Vector3();
  const stationShot = k => t => {
    const TS = T.st(k);
    const u = clamp((t - TS) / 2);
    const pos = new THREE.Vector3(2.85 + 0.45 * u, 4.2 + 0.15 * u, 17.2 - 1.2 * ease.out2(u)).applyMatrix4(frames[k].m);
    const look = new THREE.Vector3(2.85 + 0.2 * u, 3.0, 0).applyMatrix4(frames[k].m);
    return { pos, look, fov: 32 };
  };
  const introShot = t => {
    const u = ez(t, 0, 4.2, cubic(0.3, 0.2, 0.3, 1));
    const a = lerp(-0.62, -0.06, u);
    const r = lerp(13.5, 19.0, u) - 1.4 * ez(t, 4.0, 5.3, ease.in2);
    const h = lerp(2.2, 3.85, u);
    const off = new THREE.Vector3(-3.1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    const look = LOGO_CENTER.clone().add(off).add(new THREE.Vector3(0, lerp(0.6, 0, u), 0));
    const pos = new THREE.Vector3(Math.sin(a) * r, h, -Math.cos(a) * r).add(off);
    return { pos, look, fov: 30 };
  };
  const overviewShot = t => {
    const az = -0.42 + (t - 19.7) * 0.085, el = 0.98, d = 112 - (t - 19.7) * 3.0;
    const pos = new THREE.Vector3(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, -Math.cos(az) * Math.cos(el) * d);
    return { pos, look: new THREE.Vector3(0, -3.5, 0), fov: 34 };
  };
  const lockShot = t => {
    const u = clamp((t - T.impact) / 6);
    const pos = new THREE.Vector3(-4.3, 3.85 + 0.25 * (1 - u), -21.5 + 1.5 * ease.out2(u));
    const look = new THREE.Vector3(-4.3, 3.85, 0);
    return { pos, look, fov: 30 };
  };
  const cuts = [
    { a: 5.18, b: 6.14, ease: cubic(0.62, 0, 0.18, 1), from: introShot, to: stationShot(0) },
    ...[1, 2, 3, 4, 5, 6].map(k => ({ a: T.st(k) - 0.27, b: T.st(k) + 0.19, ease: ease.whip, from: stationShot(k - 1), to: stationShot(k) })),
    { a: 19.72, b: 21.7, ease: cubic(0.6, 0, 0.25, 1), from: stationShot(6), to: overviewShot },
    { a: 22.55, b: 24.0, ease: cubic(0.5, 0, 0.12, 1), from: overviewShot, to: lockShot }
  ];
  const shotAt = t => {
    if (t < cuts[0].a) return introShot(t);
    for (let c = 0; c < cuts.length; c++) {
      const cut = cuts[c], next = cuts[c + 1];
      if (t >= cut.a && t < cut.b) {
        const A = cut.from(t), B = cut.to(t), e = cut.ease((t - cut.a) / (cut.b - cut.a));
        return { pos: A.pos.lerp(B.pos, e), look: A.look.lerp(B.look, e), fov: lerp(A.fov, B.fov, e) };
      }
      if (t >= cut.b && (!next || t < next.a)) return cut.to(t);
    }
    return lockShot(t);
  };
  const shakes = [
    ...T.bars.map(t => ({ t, a: 0.06, k: 9 })), { t: T.tile, a: 0.1, k: 7 }, { t: T.burst, a: 0.16, k: 6 },
    ...[0, 1, 2, 3, 4, 5, 6].map(k => ({ t: T.st(k) + 0.17, a: 0.05, k: 10 })), { t: T.impact, a: 0.32, k: 4.5 }
  ];
  const camAt = t => {
    const s = shotAt(t);
    let amp = 0;
    for (const sh of shakes) if (t >= sh.t) amp += sh.a * decay(t - sh.t, sh.k);
    const hand = 0.035;
    s.pos.x += fbm(t * 0.6, 1) * hand + fbm(t * 24, 4) * amp;
    s.pos.y += fbm(t * 0.5, 2) * hand + fbm(t * 26, 5) * amp;
    s.look.x += fbm(t * 0.45, 3) * hand * 0.6 + fbm(t * 22, 6) * amp * 0.5;
    s.look.y += fbm(t * 25, 7) * amp * 0.5;
    return s;
  };

  /* ---------- colour script ---------- */
  const bgAt = t => {
    if (t < T.st(0) - 0.08) return C.ink;
    if (t >= T.impact) return C.paper;
    if (t >= T.overview - 0.05) return mixHex(STATIONS[6].bg, C.ink, ez(t, T.overview - 0.05, T.overview + 0.35, ease.io3));
    let k = 0;
    while (k < 6 && t >= T.st(k + 1) - 0.08) k++;
    const prev = k === 0 ? C.ink : STATIONS[k - 1].bg;
    return mixHex(prev, STATIONS[k].bg, ez(t, T.st(k) - 0.08, T.st(k) + 0.06, ease.io3));
  };

  /* ---------- per-frame ---------- */
  const tmpColor = new THREE.Color();
  const pulseBar = (j, t) => { const tp = T.flourish + j * BEAT / 4; return t >= tp ? 1.1 * decay(t - tp, 7) : 0; };
  const glyphBase = new THREE.Color(C.paper), glyphHot = new THREE.Color(C.orange);
  const frustum = new THREE.Frustum();
  const cam = stage.camera;
  const prev = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  function update(t) {
    // background, fog, plates
    const bg = bgAt(t);
    scene.background.set(bg);
    scene.fog.color.set(bg);
    const over = ez(t, T.overview, T.overview + 1.2) * (1 - ez(t, 22.9, 23.9));
    scene.fog.near = lerp(t < 6 ? 26 : 24, 140, over);
    scene.fog.far = lerp(t < 6 ? 70 : 52, 320, over);
    if (t >= T.impact) { scene.fog.near = 40; scene.fog.far = 140; }

    // camera
    const s = camAt(t);
    cam.position.copy(s.pos); cam.lookAt(s.look); cam.fov = s.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const sp = camAt(t - 1 / 60);
    prev.pos.copy(sp.pos); prev.look.copy(sp.look);

    // lights follow the focus
    const focus = new THREE.Vector3(s.look.x, 0, s.look.z);
    let span = 13;
    let k = 0;
    if (t < 5.6) { focus.set(0, 0, 0); } else if (t < 22.6) {
      let best = 1e9;
      frames.forEach((fr, j) => { const d = fr.pos.distanceToSquared(focus); if (d < best) { best = d; k = j; } });
      span = lerp(13, 42, over);
      if (over > 0.01) focus.lerp(new THREE.Vector3(0, 0, 0), over);
    } else focus.set(0, 0, 0);
    aimLights(stage, focus, t < 5.6 || t >= 22.6 ? frames[0].quat : frames[k].quat, span);
    stage.floor.material.opacity = t >= T.impact ? 0.12 : lerp(0.17, 0.22, over);

    // monogram: four bars land on the beat, the tile closes, the scan converts it to pills
    const bars = logo.bars;
    const from = [[0, 9, 2, 0, 0, 2.2], [-11, -1, 3, 0, 1.5, 0], [11, 2, 3, 0, -1.4, 0], [6, -3, 7, 1.2, 0, -1.2]];
    bars.forEach((b, j) => {
      const tl = T.bars[j];
      const x = ez(t, tl - 0.42, tl, ease.lin);
      const land = ease.outExp(x);
      const [fx, fy, fz, rx, ry, rz] = from[j];
      const home = b.userData.home;
      const settle = 0.18 * Math.sin(Math.min(1, (t - tl) / 0.25) * Math.PI) * decay(t - tl, 9) * (t > tl ? 1 : 0);
      b.position.set(home.x + fx * (1 - land), home.y + fy * (1 - land), home.z + fz * (1 - land) + settle);
      b.rotation.set(rx * (1 - land), ry * (1 - land), rz * (1 - land));
      b.visible = t > tl - 0.42;
      const flash = 1.6 * decay(t - tl, 6) * (t >= tl ? 1 : 0) + 0.9 * decay(t - T.impact, 3) * (t >= T.impact ? 1 : 0) + pulseBar(j, t);
      b.material.emissive.copy(glyphBase).lerp(glyphHot, clamp(flash));
      b.material.emissiveIntensity = 0.42 + flash;
    });
    const tt = ez(t, T.tile - 0.36, T.tile + 0.12, ease.lin);
    logo.tile.visible = t > T.tile - 0.36;
    logo.tile.position.z = -5 * (1 - ease.outBack(tt));
    logo.tile.scale.setScalar(0.5 + 0.5 * ease.outBack(tt));
    logo.tile.rotation.z = 0.5 * (1 - ease.out3(tt));
    // impact: everything punches in and settles on a spring
    const imp = t >= T.impact ? t - T.impact : -1;
    const solid = t < T.scanEnd + 0.02 || t >= T.impact;
    logo.group.visible = solid;
    if (t >= T.impact) {
      // sign-off: the four bars step forward in turn on the last downbeat
      logo.bars.forEach((b, j) => {
        b.position.copy(b.userData.home);
        const u = clamp((t - (T.flourish + j * BEAT / 4)) / 0.34);
        b.position.z += 0.45 * Math.sin(Math.PI * u) * (u > 0 ? 1 : 0);
        b.rotation.set(0, 0, 0); b.visible = true;
      });
      logo.tile.visible = true; logo.tile.position.z = 0; logo.tile.scale.setScalar(1); logo.tile.rotation.z = 0;
      const sp = spring(imp, 1.6, 4.5);
      logo.group.scale.setScalar(1.12 - 0.12 * sp);
      logo.group.rotation.set(0.08 * (1 - sp), Math.PI + 0.35 * (1 - sp) + 0.03 * Math.sin(imp * 1.3), 0);
    } else {
      logo.group.scale.setScalar(1);
      logo.group.rotation.set(0, Math.PI, 0);
    }
    // scan
    const scanning = t >= T.scan - 0.02 && t <= T.scanEnd + 0.04;
    const yScan = lerp(yTop + 0.05, yBot - 0.05, clamp((t - T.scan) / (T.scanEnd - T.scan)));
    clip.constant = t < T.scan ? 100 : t >= T.impact ? 100 : yScan;
    scanBar.visible = scanning;
    scanBar.position.set(0, yScan, 0);
    scanBar.scale.set(1, 1 + 2 * Math.sin(t * 60) ** 2, 1);

    // pills + station extras
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    P.update(t, frustum);
    built.forEach(b => b.update && b.update(t));

    // plates: ink stations become dark discs on dark backgrounds
    plates.forEach((p, j) => {
      const own = STATIONS[j].bg === C.ink ? '#17171A' : STATIONS[j].bg;
      p.material.color.set(mixHex(bg, own, over));
      p.scale.setScalar(lerp(1, 0.6, over));
    });

    // dust
    const dustA = (1 - ez(t, 5.6, 6.0)) * ez(t, 0, 0.8) + ez(t, T.overview, 21) * (1 - ez(t, 23.6, 24.0));
    dustMat.opacity = 0.75 * dustA;
    dust.visible = dustA > 0.001;
    if (dust.visible) {
      for (let i = 0; i < DUST; i++) {
        const a = dustSeed[i * 4], b = dustSeed[i * 4 + 1], c = dustSeed[i * 4 + 2], d = dustSeed[i * 4 + 3];
        const ph = t * (0.05 + d * 0.08);
        const big = t > 15;
        const ext = big ? 46 : 16;
        dustPos[i * 3] = (((a + ph * 0.3) % 1) - 0.5) * ext * 2;
        dustPos[i * 3 + 1] = ((b + ph * 0.2) % 1) * (big ? 30 : 11) + Math.sin(t * 0.7 + d * 9) * 0.2;
        dustPos[i * 3 + 2] = (((c + ph * 0.1) % 1) - 0.5) * ext * 2;
      }
      dustGeo.attributes.position.needsUpdate = true;
    }

    // bloom
    const dark = bg === C.ink || t < 6 || (t >= T.overview && t < T.impact);
    stage.bloom.strength = (dark ? 0.85 : 0.45) + 0.6 * decay(t - T.impact, 3) * (t >= T.impact ? 1 : 0) + 0.3 * decay(t - T.burst, 5) * (t >= T.burst ? 1 : 0);
    stage.bloom.radius = 0.55;
    stage.scene.environmentIntensity = 0.6;

    return {
      t, bg, cam, prev, shotAt,
      bars: logo.bars.map(b => b.getWorldPosition(new THREE.Vector3())),
      groups: groupCentroids,
      stations: frames.map(fr => fr.pos),
      frames, built
    };
  }

  return { update, N, P, logo, frames, built, T, groupCentroids };
}
