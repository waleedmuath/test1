// GPU compositor: two scene slots (for transitions), 2D canvas layers around a 3D stage,
// shader transitions, bloom pyramid, lens/grade pass, sub-frame motion-blur accumulation.
// Compositing runs in display (sRGB-encoded) space so brand colours land exactly.
import * as THREE from 'three';
import { W, H } from './config.js';

THREE.ColorManagement.enabled = false;

const V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const NOISE = `
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(h12(i), h12(i+vec2(1,0)), u.x), mix(h12(i+vec2(0,1)), h12(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a*vn(p); p *= 2.03; a *= .5; } return s; }
`;

function pass(frag, uniforms, blending = THREE.NoBlending) {
  const m = new THREE.ShaderMaterial({ vertexShader: V, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, blending, transparent: blending !== THREE.NoBlending });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  return { m, scene, u: uniforms };
}
const rt = (w, h, o = {}) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, ...o });

// ---------- 2D layer: a full-frame canvas drawn as a screen-space quad ----------
class Layer {
  constructor() {
    this.cv = document.createElement('canvas');
    this.cv.width = W; this.cv.height = H;
    this.g = this.cv.getContext('2d', { willReadFrequently: true }); // CPU raster: far faster than a software GPU path
    this.tex = new THREE.CanvasTexture(this.cv);
    this.tex.minFilter = THREE.LinearFilter; this.tex.generateMipmaps = false;
    this.u = { t: { value: this.tex }, xf: { value: new THREE.Vector3(0, 0, 1) }, op: { value: 1 } };
    const m = new THREE.ShaderMaterial({
      vertexShader: V, uniforms: this.u, transparent: true, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D t; uniform vec3 xf; uniform float op; varying vec2 vUv;
        void main(){ vec2 uv = (vUv - .5) / xf.z + .5 - vec2(xf.x, -xf.y) / vec2(${W}., ${H}.);
          vec4 c = texture2D(t, uv); if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) c = vec4(0.);
          gl_FragColor = vec4(c.rgb, c.a * op); }`
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
    this.used = false;
  }
  begin() { this.g.setTransform(1, 0, 0, 1, 0, 0); this.g.clearRect(0, 0, W, H); this.u.xf.value.set(0, 0, 1); this.u.op.value = 1; this.used = true; return this.g; }
}

// ---------- slot: back layer → 3D stage → front layer ----------
export class Slot {
  constructor() {
    this.back = new Layer();
    this.front = new Layer();
    this.stage = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(30, W / H, 5, 40000);
    this.D = (H / 2) / Math.tan(THREE.MathUtils.degToRad(15)); // z distance where 1 unit = 1 px
    this.rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, samples: 0 });
    this.bg = new THREE.Color('#0B0B0C');
    this.resetCam();
  }
  resetCam() { this.cam.position.set(0, 0, this.D); this.cam.up.set(0, 1, 0); this.cam.lookAt(0, 0, 0); this.cam.fov = 30; this.cam.updateProjectionMatrix(); }
  reset() { this.back.used = false; this.front.used = false; for (const c of this.stage.children) c.visible = false; this.bg.set('#0B0B0C'); this.resetCam(); }
}

// ---------- the compositor ----------
export class FX {
  constructor(canvas) {
    const r = (this.r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(1);
    r.setSize(W, H, false);
    r.outputColorSpace = THREE.LinearSRGBColorSpace;
    r.autoClear = false;
    this.cam = new THREE.Camera();
    this.slots = [new Slot(), new Slot()];
    this.comp = rt(W, H, { type: THREE.UnsignedByteType });
    this.frame = rt(W, H);
    this.acc = [rt(W, H), rt(W, H)];
    this.bright = rt(W / 2, H / 2, { type: THREE.UnsignedByteType });
    this.lv = [4, 8, 16, 32].map(d => [rt(Math.ceil(W / d), Math.ceil(H / d)), rt(Math.ceil(W / d), Math.ceil(H / d))]);

    this.pTrans = pass(`${NOISE}
      uniform sampler2D tA, tB; uniform float p, time, aspect; uniform int type; uniform vec2 c; uniform vec3 edge; uniform float k;
      varying vec2 vUv;
      vec4 zblur(sampler2D t, vec2 uv, vec2 ctr, float s){ vec4 a = vec4(0.); for (int i = 0; i < 12; i++){ float f = 1. - s * float(i) / 12.; a += texture2D(t, ctr + (uv - ctr) * f); } return a / 12.; }
      vec4 dblur(sampler2D t, vec2 uv, vec2 d){ vec4 a = vec4(0.); for (int i = -6; i <= 6; i++) a += texture2D(t, uv + d * float(i) / 6.); return a / 13.; }
      float sdRound(vec2 q, vec2 b, float r){ vec2 d = abs(q) - b + r; return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - r; }
      void main(){
        vec2 uv = vUv; vec4 A, Bc; vec4 o;
        if (type == 0) { o = texture2D(tB, uv); }
        else if (type == 1) { // portal: dive through A towards c, emerge into B
          float z = pow(p, 2.2);
          vec2 ua = c + (uv - c) / (1. + z * 60.);
          A = zblur(tA, ua, c, .25 * smoothstep(0., .7, p));
          float q = smoothstep(.72, 1., p);
          vec2 ub = c + (uv - c) * (1. + (1. - q) * .35);
          Bc = zblur(tB, ub, c, .2 * (1. - q));
          o = mix(A, Bc, q);
        } else if (type == 2) { // brand rounded-square iris
          vec2 q = (uv - c) * vec2(aspect, 1.);
          float s = mix(0., 1.25, pow(p, 1.6));
          float d = sdRound(q, vec2(s), s * .24);
          float m = smoothstep(.003, -.003, d);
          o = mix(texture2D(tA, uv), texture2D(tB, c + (uv - c) * mix(1.25, 1., p)), m);
          float ring = smoothstep(.012, 0., abs(d)) * (1. - p);
          o.rgb += edge * ring * 1.6;
        } else if (type == 3) { // liquid ink wipe
          float n = fbm(uv * vec2(aspect, 1.) * 3. + vec2(time * .2, 0.));
          float th = mix(-.3, 1.3, p);
          float f = (k > 0. ? 1. - uv.x : uv.x) * .75 + n * .5;
          float m = smoothstep(th - .02, th + .02, f);
          float band = smoothstep(.06, 0., abs(f - th) - .015);
          vec2 disp = vec2(n - .5) * .06 * band;
          o = mix(texture2D(tB, uv + disp), texture2D(tA, uv - disp), m);
          o.rgb = mix(o.rgb, edge, band * .95);
        } else if (type == 4) { // whip pan
          float dir = k > 0. ? -1. : 1.;
          float e = p < .5 ? 4. * p * p * p : 1. - pow(-2. * p + 2., 3.) / 2.;
          float bl = sin(3.14159 * p) * .16;
          vec4 a = dblur(tA, uv + vec2(dir * e, 0.), vec2(bl, 0.));
          vec4 b = dblur(tB, uv + vec2(dir * (e - 1.), 0.), vec2(bl, 0.));
          o = mix(a, b, smoothstep(.35, .65, p));
        } else if (type == 5) { // light streak wipe
          float x = mix(-.2, 1.2, p);
          float d = (k > 0. ? 1. - uv.x : uv.x) - x;
          float m = smoothstep(.02, -.02, d);
          o = mix(texture2D(tA, uv), texture2D(tB, uv), m);
          float core = exp(-abs(d) * 90.) ; float halo = exp(-abs(d) * 14.) * .45;
          float y = abs(uv.y - .5);
          o.rgb += edge * (core * 2.2 + halo) * (1. - y * .6);
          o.rgb += vec3(1.) * exp(-abs(d) * 400.) * .8;
        } else { // glitch
          float row = floor(uv.y * 24.) + floor(time * 30.);
          float r = h12(vec2(row, floor(time * 30.)));
          float on = step(1. - p * 1.3, r);
          vec2 off = vec2((h12(vec2(row, 7.)) - .5) * .25 * sin(3.14159 * p), 0.);
          vec4 a = texture2D(tA, uv + off), b = texture2D(tB, uv + off);
          vec4 cA = vec4(texture2D(tA, uv + off + vec2(.012, 0.)).r, a.g, texture2D(tA, uv + off - vec2(.012, 0.)).b, 1.);
          vec4 cB = vec4(texture2D(tB, uv + off + vec2(.012, 0.)).r, b.g, texture2D(tB, uv + off - vec2(.012, 0.)).b, 1.);
          o = p > .98 ? texture2D(tB, uv) : mix(cA, cB, max(on, step(.85, p)));
        }
        gl_FragColor = vec4(o.rgb, 1.);
      }`, { tA: { value: null }, tB: { value: null }, p: { value: 0 }, type: { value: 0 }, c: { value: new THREE.Vector2(0.5, 0.5) }, edge: { value: new THREE.Color('#FF5C00') }, k: { value: 0 }, time: { value: 0 }, aspect: { value: W / H } });

    this.pBright = pass(`uniform sampler2D t; uniform float th; varying vec2 vUv;
      void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b));
        float k = smoothstep(th, th + .25, l); gl_FragColor = vec4(c * k, 1.); }`, { t: { value: null }, th: { value: 0.7 } });
    this.pDown = pass(`uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
      void main(){ vec4 a = texture2D(t, vUv + px * vec2(-1,-1)) + texture2D(t, vUv + px * vec2(1,-1)) + texture2D(t, vUv + px * vec2(-1,1)) + texture2D(t, vUv + px * vec2(1,1));
        gl_FragColor = a * .25; }`, { t: { value: null }, px: { value: new THREE.Vector2() } });
    this.pBlur = pass(`uniform sampler2D t; uniform vec2 d; varying vec2 vUv;
      void main(){ vec4 c = texture2D(t, vUv) * .2270270270;
        c += (texture2D(t, vUv + d * 1.3846153846) + texture2D(t, vUv - d * 1.3846153846)) * .3162162162;
        c += (texture2D(t, vUv + d * 3.2307692308) + texture2D(t, vUv - d * 3.2307692308)) * .0702702703;
        gl_FragColor = c; }`, { t: { value: null }, d: { value: new THREE.Vector2() } });

    this.pFinal = pass(`${NOISE}
      uniform sampler2D tC, b1, b2, b3, b4; uniform float bloom, ca, vig, flash, zoom, rot, leak, time, aspect, sat, lift; uniform vec2 shift, zc; uniform vec3 flashCol, leakCol;
      varying vec2 vUv;
      vec2 camUV(vec2 uv){ vec2 q = (uv - zc) * vec2(aspect, 1.); float cs = cos(rot), sn = sin(rot);
        q = mat2(cs, -sn, sn, cs) * q; q /= zoom; return q / vec2(aspect, 1.) + zc + shift; }
      void main(){
        vec2 uv = camUV(vUv);
        vec2 dc = uv - .5; float r2 = dot(dc * vec2(aspect, 1.), dc * vec2(aspect, 1.));
        vec2 off = dc * ca * (.35 + r2);
        vec3 col = vec3(texture2D(tC, uv + off).r, texture2D(tC, uv).g, texture2D(tC, uv - off).b);
        vec3 bl = texture2D(b1, uv).rgb * .18 + texture2D(b2, uv).rgb * .24 + texture2D(b3, uv).rgb * .3 + texture2D(b4, uv).rgb * .38;
        col += bl * bloom;
        // drifting light leaks
        if (leak > 0.) {
          vec2 lq = vUv * vec2(aspect, 1.);
          float l1 = exp(-length(lq - vec2(.25 + .35 * sin(time * .21), .95 + .15 * cos(time * .17))) * 2.2);
          float l2 = exp(-length(lq - vec2(aspect - .2 + .25 * cos(time * .13), .1 + .2 * sin(time * .19))) * 2.6);
          vec3 lk = leakCol * (l1 + l2 * .7) * leak * (.8 + .2 * vn(lq * 3. + time * .1));
          col = 1. - (1. - col) * (1. - clamp(lk, 0., 1.));
        }
        float l = dot(col, vec3(.299, .587, .114)); col = mix(vec3(l), col, sat);
        col += lift;
        col *= 1. - vig * smoothstep(.25, 1.4, r2 * 1.6);
        col = mix(col, flashCol, clamp(flash, 0., 1.));
        vec3 sh = vec3(.95) + .05 * (1. - exp(-max(col - .95, 0.) / .05));
        col = mix(col, sh, step(vec3(.95), col));
        gl_FragColor = vec4(col, 1.);
      }`, {
      tC: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, b4: { value: null },
      bloom: { value: 0.6 }, ca: { value: 0.002 }, vig: { value: 0.35 }, flash: { value: 0 }, flashCol: { value: new THREE.Color('#ffffff') },
      zoom: { value: 1 }, rot: { value: 0 }, shift: { value: new THREE.Vector2() }, zc: { value: new THREE.Vector2(0.5, 0.5) },
      leak: { value: 0 }, leakCol: { value: new THREE.Color('#FF5C00') }, time: { value: 0 }, aspect: { value: W / H }, sat: { value: 1 }, lift: { value: 0 }
    });
    this.pAcc = pass(`uniform sampler2D tPrev, tNew; uniform float w; varying vec2 vUv;
      void main(){ gl_FragColor = mix(texture2D(tPrev, vUv), texture2D(tNew, vUv), w); }`, { tPrev: { value: null }, tNew: { value: null }, w: { value: 1 } });
    this.pOut = pass(`${NOISE} uniform sampler2D t; uniform float grain, time; varying vec2 vUv;
      void main(){ vec3 c = texture2D(t, vUv).rgb;
        float g = h12(vUv * vec2(${W}., ${H}.) + fract(time * 13.7) * 917.) - .5;
        float lum = dot(c, vec3(.3, .59, .11));
        c += g * grain * (1.2 - lum);
        c += (h12(vUv * 1931. + time) - .5) / 255.;
        gl_FragColor = vec4(clamp(c, 0., 1.), 1.); }`, { t: { value: null }, grain: { value: 0.05 }, time: { value: 0 } });
  }

  run(p, target) { this.r.setRenderTarget(target); this.r.render(p.scene, this.cam); }

  renderSlot(s) {
    const r = this.r;
    for (const L of [s.back, s.front]) if (L.used) L.tex.needsUpdate = true;
    r.setRenderTarget(s.rt);
    r.setClearColor(s.bg, 1);
    r.clear(true, true, true);
    if (s.back.used) r.render(s.back.scene, this.cam);
    r.render(s.stage, s.cam);
    if (s.front.used) r.render(s.front.scene, this.cam);
  }

  // one sub-frame: slots already drawn by the caller
  compose(tr, fx, time) {
    // a single slot goes straight to the lens; a transition is composed first
    let comp = this.slots[0].rt.texture;
    if (tr) {
      const T = this.pTrans.u;
      T.tA.value = this.slots[0].rt.texture;
      T.tB.value = this.slots[1].rt.texture;
      T.type.value = tr.type;
      T.p.value = tr.p;
      T.k.value = tr.k || 0;
      T.time.value = time;
      if (tr.c) T.c.value.set(tr.c[0], tr.c[1]); else T.c.value.set(0.5, 0.5);
      T.edge.value.set(tr.edge || '#FF5C00');
      this.run(this.pTrans, this.comp);
      comp = this.comp.texture;
    }

    // bloom pyramid
    this.pBright.u.t.value = comp;
    this.pBright.u.th.value = fx.threshold ?? 0.7;
    this.run(this.pBright, this.bright);
    let src = this.bright;
    for (const [a, b] of this.lv) {
      this.pDown.u.t.value = src.texture;
      this.pDown.u.px.value.set(0.5 / src.width, 0.5 / src.height);
      this.run(this.pDown, a);
      this.pBlur.u.t.value = a.texture; this.pBlur.u.d.value.set(1 / a.width, 0); this.run(this.pBlur, b);
      this.pBlur.u.t.value = b.texture; this.pBlur.u.d.value.set(0, 1 / a.height); this.run(this.pBlur, a);
      src = a;
    }
    const U = this.pFinal.u;
    U.tC.value = comp;
    [U.b1, U.b2, U.b3, U.b4].forEach((u, i) => (u.value = this.lv[i][0].texture));
    U.bloom.value = fx.bloom ?? 0.6;
    U.ca.value = fx.ca ?? 0.002;
    U.vig.value = fx.vig ?? 0.35;
    U.flash.value = fx.flash ?? 0;
    U.flashCol.value.set(fx.flashCol || '#ffffff');
    U.zoom.value = fx.zoom ?? 1;
    U.rot.value = fx.rot ?? 0;
    U.shift.value.set(fx.sx ?? 0, fx.sy ?? 0);
    U.zc.value.set(fx.zcx ?? 0.5, fx.zcy ?? 0.5);
    U.leak.value = fx.leak ?? 0;
    U.leakCol.value.set(fx.leakCol || '#FF5C00');
    U.sat.value = fx.sat ?? 1;
    U.lift.value = fx.lift ?? 0;
    U.time.value = time;
    this.run(this.pFinal, this.frame);
  }

  accumulate(i) {
    const prev = this.acc[i % 2], next = this.acc[(i + 1) % 2];
    this.pAcc.u.tPrev.value = prev.texture;
    this.pAcc.u.tNew.value = this.frame.texture;
    this.pAcc.u.w.value = 1 / (i + 1);
    this.run(this.pAcc, next);
    this.last = next;
  }

  present(time, grain) {
    this.pOut.u.t.value = this.last.texture;
    this.pOut.u.grain.value = grain;
    this.pOut.u.time.value = time;
    this.r.setRenderTarget(null);
    this.r.render(this.pOut.scene, this.cam);
  }
}
