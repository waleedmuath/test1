// Renderer, world, lights and the post stack (bloom → output → final grade,
// where the 2D typography layer, whip blur, aberration, grain and flashes are
// composited in one pass).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { W, H, TAU } from './util.js';

// Ring layout: seven division dioramas face the centre, the monogram stands in the middle.
export const RING = 26;
export const stationAngle = k => (k * TAU) / 7;
export function stationFrame(k) {
  const a = stationAngle(k);
  const pos = new THREE.Vector3(Math.sin(a) * RING, 0, Math.cos(a) * RING);
  const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a + Math.PI);
  const m = new THREE.Matrix4().compose(pos, quat, new THREE.Vector3(1, 1, 1));
  return { pos, quat, m, a };
}

// One full-screen pass after bloom: sRGB encode, FXAA, whip blur, aberration,
// the typography layer, vignette, flash and grain.
const FINAL = {
  uniforms: {
    tDiffuse: { value: null }, tOverlay: { value: null },
    uBlur: { value: new THREE.Vector2() }, uBlurOv: { value: new THREE.Vector2() },
    uCA: { value: 0.0 }, uGrain: { value: 0.035 }, uVig: { value: 0.22 },
    uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1, 1, 1) },
    uSeed: { value: 0 }, uRes: { value: new THREE.Vector2(W, H) }
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tOverlay;
    uniform vec2 uBlur, uBlurOv, uRes;
    uniform float uCA, uGrain, uVig, uFlash, uSeed;
    uniform vec3 uFlashCol;
    varying vec2 vUv;
    const vec3 LUMA = vec3(0.299, 0.587, 0.114);
    vec3 enc(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    vec3 S(vec2 uv){ return enc(texture2D(tDiffuse, uv).rgb); }
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423) + uSeed); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    vec3 fxaa(vec2 uv){
      vec2 px = 1.0 / uRes;
      vec3 nw = S(uv + vec2(-1.0, -1.0) * px), ne = S(uv + vec2(1.0, -1.0) * px);
      vec3 sw = S(uv + vec2(-1.0, 1.0) * px), se = S(uv + vec2(1.0, 1.0) * px), m = S(uv);
      float lNW = dot(nw, LUMA), lNE = dot(ne, LUMA), lSW = dot(sw, LUMA), lSE = dot(se, LUMA), lM = dot(m, LUMA);
      float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      if (lMax - lMin < max(0.0312, lMax * 0.125)) return m;
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));
      float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
      float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);
      dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * px;
      vec3 a = 0.5 * (S(uv + dir * (1.0 / 3.0 - 0.5)) + S(uv + dir * (2.0 / 3.0 - 0.5)));
      vec3 b = a * 0.5 + 0.25 * (S(uv - dir * 0.5) + S(uv + dir * 0.5));
      float lB = dot(b, LUMA);
      return (lB < lMin || lB > lMax) ? a : b;
    }
    void main(){
      vec3 col;
      if (dot(uBlur, uBlur) > 1e-7) {
        col = vec3(0.0);
        for (int i = 0; i < 16; i++) { float f = float(i) / 15.0 - 0.5; col += S(vUv + uBlur * f); }
        col /= 16.0;
      } else col = fxaa(vUv);
      if (uCA > 0.01) {
        vec2 d = vUv - 0.5;
        vec2 o = d * uCA * 0.06 * dot(d, d);
        col.r = mix(col.r, S(vUv + o).r, 0.85);
        col.b = mix(col.b, S(vUv - o).b, 0.85);
      }
      vec4 ov;
      if (dot(uBlurOv, uBlurOv) > 1e-7) {
        ov = vec4(0.0);
        for (int i = 0; i < 12; i++) { float f = float(i) / 11.0 - 0.5; vec4 s = texture2D(tOverlay, vUv + uBlurOv * f); ov += vec4(s.rgb * s.a, s.a); }
        ov /= 12.0;
      } else { vec4 s = texture2D(tOverlay, vUv); ov = vec4(s.rgb * s.a, s.a); }
      col = col * (1.0 - ov.a) + ov.rgb;
      vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
      col *= 1.0 - uVig * smoothstep(0.35, 1.05, length(q));
      col = mix(col, uFlashCol, uFlash);
      float g = hash(vUv * uRes) - 0.5;
      col += g * uGrain * (0.6 + 0.4 * (1.0 - dot(col, vec3(0.333))));
      gl_FragColor = vec4(col, 1.0);
    }`
};

export const FLAGS = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export const RS = +(FLAGS.get('scale') || 1); // render scale (previews)

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W * RS, H * RS, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = FLAGS.has('pcf') ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.shadowMap.enabled = !FLAGS.has('noshadow');
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0B0B0C');
  scene.fog = new THREE.Fog(0x0b0b0c, 30, 90);
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 500);

  const pmrem = new THREE.PMREMGenerator(renderer);
  if (!FLAGS.has('noenv')) scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const hemi = new THREE.HemisphereLight(0xfff6ee, 0x1a1210, 0.4);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff4ea, 1.75);
  key.castShadow = true;
  const sm = +(FLAGS.get('shadow') || 2048); key.shadow.mapSize.set(sm, sm);
  key.shadow.camera.near = 1; key.shadow.camera.far = 80;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xff7a2a, 1.2);
  scene.add(rim, rim.target);

  // shadow catcher: an infinite floor that only shows shadows, over coloured station plates
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ color: 0x1a0f08, opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.002; floor.receiveShadow = true;
  scene.add(floor);

  // post
  const rt = new THREE.WebGLRenderTarget(W * RS, H * RS, { type: FLAGS.has('ubyte') ? THREE.UnsignedByteType : THREE.HalfFloatType, samples: +(FLAGS.get('msaa') ?? 0) });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(1);
  composer.setSize(W * RS, H * RS);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W * RS / 2, H * RS / 2), 0.6, 0.55, 1.0);
  if (!FLAGS.has('nobloom')) composer.addPass(bloom);
  const final = new ShaderPass(FINAL);
  final.uniforms.uRes.value.set(W * RS, H * RS);
  composer.addPass(final);

  return { renderer, scene, camera, key, rim, hemi, floor, composer, bloom, final };
}

// keeps the shadow frustum centred on whatever the camera is looking at
export function aimLights(stage, focus, yaw, span = 14) {
  const { key, rim } = stage;
  const dir = new THREE.Vector3(7, 16, 9).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  key.position.copy(focus).add(dir);
  key.target.position.copy(focus);
  const sc = key.shadow.camera;
  if (sc.right !== span) { sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.updateProjectionMatrix(); }
  const rdir = new THREE.Vector3(-10, 6, -12).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  rim.position.copy(focus).add(rdir);
  rim.target.position.copy(focus);
}
