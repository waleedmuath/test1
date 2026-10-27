// The pill system: one InstancedMesh of extruded, bevelled stadiums ("pills",
// the building block of the monogram). Each pill owns a keyframe track; a key
// can target a static state or a function of time, so pills can fly between
// formations that are themselves moving. Length is stretched in the vertex
// shader so the rounded caps never distort.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp } from './util.js';

const BEVEL = 0.09;

function pillGeometry() {
  const r = 0.5 - BEVEL, e = 0.0005;
  const s = new THREE.Shape();
  s.absarc(e, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.absarc(-e, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 1 - 2 * BEVEL, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL,
    bevelSegments: 3, curveSegments: 12
  });
  g.translate(0, 0, -(1 - 2 * BEVEL) / 2);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  // weld so the bevel shades smoothly (and the vertex cache gets used)
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  return m;
}

const VERT_HEAD = /* glsl */`
attribute float aLen;
attribute float aGlow;
attribute vec3 aTint;
attribute float aRough;
varying float vGlow;
varying vec3 vTint;
varying float vRough;
`;
const VERT_BODY = /* glsl */`
vec3 transformed = vec3( position );
transformed.x += sign( position.x ) * aLen * 0.5;
vGlow = aGlow; vTint = aTint; vRough = aRough;
`;

function patch(material, withColour) {
  material.onBeforeCompile = sh => {
    sh.vertexShader = (withColour ? VERT_HEAD : 'attribute float aLen;\n') + sh.vertexShader.replace(
      '#include <begin_vertex>',
      withColour ? VERT_BODY : 'vec3 transformed = vec3( position ); transformed.x += sign( position.x ) * aLen * 0.5;'
    );
    if (withColour) {
      sh.fragmentShader = 'varying float vGlow;\nvarying vec3 vTint;\nvarying float vRough;\n' + sh.fragmentShader
        .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vTint;')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = vRough;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vTint * vGlow;');
    }
  };
  material.customProgramCacheKey = () => (withColour ? 'pill-colour' : 'pill-depth');
}

const _c = new THREE.Color();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _sph = new THREE.Sphere();
const _e = new THREE.Euler(), _v = new THREE.Vector3(), _x = new THREE.Vector3(1, 0, 0), _qa = new THREE.Quaternion();

// A pill state. p: centre; q: orientation (long axis = local x); h: thickness;
// len: overall length (≥ h); dep: extrusion depth; col: linear rgb; glow: emissive gain.
export function S(o = {}) {
  const q = o.q ? o.q.clone() : new THREE.Quaternion().setFromEuler(_e.set(...(o.rot || [0, 0, 0])));
  const col = o.col ? o.col : (_c.set(o.color || '#ffffff'), [_c.r, _c.g, _c.b]);
  const h = o.h ?? 0.4;
  return {
    p: o.p ? [o.p[0], o.p[1], o.p[2]] : [0, 0, 0], q, h,
    len: Math.max(o.len ?? h, h), dep: o.dep ?? h * 0.9, col, glow: o.glow ?? 0, rough: o.rough ?? 0.38
  };
}
export const hidden = (p = [0, -50, 0]) => S({ p, h: 0, len: 0, dep: 0 });
export const linear = hexStr => { _c.set(hexStr); return [_c.r, _c.g, _c.b]; };

function blend(a, b, e, out) {
  out.p = [lerp(a.p[0], b.p[0], e), lerp(a.p[1], b.p[1], e), lerp(a.p[2], b.p[2], e)];
  out.q = a.q.clone().slerp(b.q, e);
  out.h = lerp(a.h, b.h, e); out.len = lerp(a.len, b.len, e); out.dep = lerp(a.dep, b.dep, e);
  out.col = [lerp(a.col[0], b.col[0], e), lerp(a.col[1], b.col[1], e), lerp(a.col[2], b.col[2], e)];
  out.glow = lerp(a.glow, b.glow, e); out.rough = lerp(a.rough, b.rough, e);
  return out;
}

export class Pills {
  constructor(n, { castShadow = true } = {}) {
    this.n = n;
    this.tracks = Array.from({ length: n }, () => []);
    const geo = pillGeometry();
    this.aLen = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.aGlow = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    this.aTint = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this.aRough = new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    for (const a of [this.aLen, this.aGlow, this.aTint, this.aRough]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aLen', this.aLen); geo.setAttribute('aGlow', this.aGlow);
    geo.setAttribute('aTint', this.aTint); geo.setAttribute('aRough', this.aRough);
    const std = typeof location !== 'undefined' && new URLSearchParams(location.search).has('std');
    this.material = std
      ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0, envMapIntensity: 0.9 })
      : new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.22, envMapIntensity: 0.9 });
    patch(this.material, true);
    this.mesh = new THREE.InstancedMesh(geo, this.material, n);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = castShadow;
    this.mesh.receiveShadow = true;
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    patch(depth, false);
    this.mesh.customDepthMaterial = depth;
    this.state = new Array(n);
    this.post = null; // optional per-pill modifier (i, t, state) applied after evaluation
  }

  // Instant key: from time t the pill sits in state s.
  set(i, t, s) { return this.to(i, t, 0, s); }
  // Transition key: starting at t, blend over d seconds into s.
  // opt: ease, arc ([x,y,z] offset at mid-flight), smear (stretch along velocity)
  to(i, t, d, s, opt = {}) {
    const tr = this.tracks[i];
    const k = { t, d, s, ease: opt.ease || (x => x), arc: opt.arc || null, smear: opt.smear || 0, spin: opt.spin || null };
    let j = tr.length;
    while (j > 0 && tr[j - 1].t > t) j--;
    tr.splice(j, 0, k);
    return k;
  }

  // Evaluate pill i's track at time t, considering keys [0 .. upto].
  evalTrack(i, t, upto = this.tracks[i].length - 1) {
    const tr = this.tracks[i];
    let j = upto;
    while (j >= 0 && tr[j].t > t) j--;
    if (j < 0) j = 0;
    const k = tr[j];
    const target = typeof k.s === 'function' ? k.s(t) : k.s;
    if (k.d <= 0 || t >= k.t + k.d || j === 0) return target;
    const from = this.evalTrack(i, t, j - 1);
    const x = clamp((t - k.t) / k.d);
    const e = k.ease(x);
    const out = blend(from, target, e, {});
    if (k.arc) {
      const a = Math.sin(Math.PI * e);
      out.p[0] += k.arc[0] * a; out.p[1] += k.arc[1] * a; out.p[2] += k.arc[2] * a;
    }
    if (k.spin) {
      const a = Math.sin(Math.PI * e);
      out.q.multiply(_qa.setFromEuler(_e.set(k.spin[0] * a, k.spin[1] * a, k.spin[2] * a)));
    }
    out._smear = k.smear;
    return out;
  }

  // smear = seconds of travel folded into the pill's length
  evaluate(i, t) {
    let s = this.evalTrack(i, t);
    if (s._smear) {
      const dt = 1 / 120;
      const s0 = this.evalTrack(i, t - dt);
      _v.set(s.p[0] - s0.p[0], s.p[1] - s0.p[1], s.p[2] - s0.p[2]);
      const speed = _v.length() / dt;
      if (speed > 0.5) {
        const stretch = speed * s._smear;
        const w = clamp(stretch / (s.h * 2 + 1e-6));
        _v.normalize();
        _qa.setFromUnitVectors(_x, _v);
        // centre the streak on the shutter interval, i.e. trail it behind the pill
        const back = stretch * 0.5;
        s = { ...s, p: [s.p[0] - _v.x * back, s.p[1] - _v.y * back, s.p[2] - _v.z * back], q: s.q.clone().slerp(_qa, w), len: s.len + stretch };
      }
    }
    return s;
  }

  // Visible pills are packed to the front of the instance buffer and the draw
  // count trimmed, so hidden or off-screen pills cost nothing on the GPU.
  update(t, frustum = null) {
    const m = this.mesh;
    let n = 0;
    for (let i = 0; i < this.n; i++) {
      let s = this.evaluate(i, t);
      if (this.post) s = this.post(i, t, s) || s;
      this.state[i] = s;
      if (s.h <= 1e-4) continue;
      _p.set(s.p[0], s.p[1], s.p[2]);
      if (frustum) { _sph.center.copy(_p); _sph.radius = Math.max(s.len, s.dep) * 0.6 + 0.5; if (!frustum.intersectsSphere(_sph)) continue; }
      const h = s.h;
      _s.set(h, h, Math.max(s.dep, 1e-5));
      _m.compose(_p, s.q, _s);
      m.setMatrixAt(n, _m);
      this.aLen.array[n] = (Math.max(s.len, s.h) - s.h) / h;
      this.aGlow.array[n] = s.glow;
      this.aTint.array[n * 3] = s.col[0]; this.aTint.array[n * 3 + 1] = s.col[1]; this.aTint.array[n * 3 + 2] = s.col[2];
      this.aRough.array[n] = s.rough;
      n++;
    }
    m.count = n;
    this.visible = n;
    m.instanceMatrix.needsUpdate = true;
    this.aLen.needsUpdate = this.aGlow.needsUpdate = this.aTint.needsUpdate = this.aRough.needsUpdate = true;
  }
}
