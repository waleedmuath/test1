// GPU particles: a type-to-type morph and an atmospheric dust/bokeh field.
// World space: z=0 is the screen plane at 1 unit = 1 px (camera at z = D, see Slot).
import * as THREE from 'three';
import { W, H } from './config.js';
import { rng } from './util.js';

const D = (H / 2) / Math.tan(THREE.MathUtils.degToRad(15));

// Sample the opaque pixels of a drawing into screen-space points.
export function samplePoints(draw, step = 5, max = 26000, seed = 1) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  draw(g);
  const d = g.getImageData(0, 0, W, H).data;
  const R = rng(seed), pts = [];
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const jx = Math.min(W - 1, Math.floor(x + R() * step)), jy = Math.min(H - 1, Math.floor(y + R() * step));
      if (d[(jy * W + jx) * 4 + 3] > 140) pts.push([jx, jy]);
    }
  }
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  return pts.slice(0, max);
}

export class Morph {
  constructor(n = 26000) {
    this.n = n;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aA', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aB', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aR', new THREE.BufferAttribute(new Float32Array(n * 4), 4));
    this.u = {
      uT: { value: 0 }, uTime: { value: 0 }, uSize: { value: 4.2 }, uAlpha: { value: 1 }, uScatter: { value: 900 }, uSwirl: { value: 260 },
      uColA: { value: new THREE.Color('#F3EDE3') }, uColB: { value: new THREE.Color('#FF5C00') }, uDir: { value: 1 }
    };
    const m = new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aA; attribute vec3 aB; attribute vec4 aR;
        uniform float uT, uTime, uSize, uScatter, uSwirl, uDir; varying float vE; varying float vF;
        void main(){
          float d = (aR.x * .55 + (aA.x / ${W}. + .5) * .25 * uDir);
          float t = clamp((uT - d * .5) / .5, 0., 1.);
          float e = t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) / 2.;
          vec3 p = mix(aA, aB, e);
          float s = sin(3.14159 * e);
          p.z += s * (aR.y - .35) * uScatter;
          float a = aR.z * 6.2832 + uTime * (1.5 + aR.y);
          p.xy += s * vec2(cos(a), sin(a)) * uSwirl * (.3 + aR.y);
          vE = e; vF = s;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = uSize * (.55 + aR.w) * (${D.toFixed(1)} / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uColA, uColB; uniform float uAlpha; varying float vE; varying float vF;
        void main(){ float r = length(gl_PointCoord - .5); float a = smoothstep(.5, .05, r);
          vec3 c = mix(uColA, uColB, smoothstep(.15, .85, vE)) * (1. + vF * 1.4);
          gl_FragColor = vec4(c * a * uAlpha, a * uAlpha); }`
    });
    this.obj = new THREE.Points(g, m);
    this.obj.frustumCulled = false;
    this.g = g;
  }
  // A and B: screen-space [x,y] lists; extra points of the shorter list double up
  set(A, B, seed = 3) {
    const R = rng(seed), n = Math.min(this.n, Math.max(A.length, B.length));
    const a = this.g.attributes.aA.array, b = this.g.attributes.aB.array, r = this.g.attributes.aR.array;
    for (let i = 0; i < n; i++) {
      const pa = A[i % A.length], pb = B[i % B.length];
      a[i * 3] = pa[0] - W / 2; a[i * 3 + 1] = H / 2 - pa[1]; a[i * 3 + 2] = 0;
      b[i * 3] = pb[0] - W / 2; b[i * 3 + 1] = H / 2 - pb[1]; b[i * 3 + 2] = 0;
      r[i * 4] = R(); r[i * 4 + 1] = R(); r[i * 4 + 2] = R(); r[i * 4 + 3] = R() * 0.9;
    }
    this.g.setDrawRange(0, n);
    for (const k of ['aA', 'aB', 'aR']) this.g.attributes[k].needsUpdate = true;
  }
}

export class Dust {
  constructor(n = 900, seed = 7) {
    const R = rng(seed), p = new Float32Array(n * 3), r = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (R() - 0.5) * W * 2.6; p[i * 3 + 1] = (R() - 0.5) * H * 2.6; p[i * 3 + 2] = -3200 + R() * 4400;
      const bokeh = R() < 0.05;
      r[i * 4] = R(); r[i * 4 + 1] = bokeh ? 1 : 0; r[i * 4 + 2] = R(); r[i * 4 + 3] = R();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    g.setAttribute('aR', new THREE.BufferAttribute(r, 4));
    this.u = { uTime: { value: 0 }, uAlpha: { value: 1 }, uCol: { value: new THREE.Color('#FFB27A') }, uWarp: { value: 0 } };
    const m = new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec4 aR; uniform float uTime, uWarp; varying float vA; varying float vB;
        void main(){
          vec3 p = position;
          p.x += sin(uTime * (.2 + aR.x * .3) + aR.z * 6.28) * 40.;
          p.y += mod(uTime * (12. + aR.x * 26.) + aR.z * 3000., 3000.) - 1500.;
          p.z += uWarp * (aR.x * 2. + 1.) * 400.;
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          float depth = -mv.z;
          vB = aR.y;
          gl_PointSize = (aR.y > .5 ? 60. + aR.w * 90. : 2. + aR.w * 4.) * (${D.toFixed(1)} / depth);
          vA = (aR.y > .5 ? .05 : .55) * smoothstep(9000., 2500., depth) * smoothstep(80., 900., depth) * (.4 + .6 * sin(uTime * 1.3 + aR.z * 40.) * .5 + .3);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uCol; uniform float uAlpha; varying float vA; varying float vB;
        void main(){ float r = length(gl_PointCoord - .5);
          float a = vB > .5 ? smoothstep(.5, .38, r) * .9 + smoothstep(.5, .0, r) * .1 : smoothstep(.5, 0., r);
          gl_FragColor = vec4(uCol * a * vA * uAlpha, a * vA * uAlpha); }`
    });
    this.obj = new THREE.Points(g, m);
    this.obj.frustumCulled = false;
  }
}
