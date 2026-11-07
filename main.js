import * as THREE from 'three';
import { createLofi } from './audio.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('gl');
const toastEl = document.getElementById('toast');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  document.getElementById('fallback').hidden = false;
  throw e;
}

/* ------------------------------------------------------------------ *
 *  What's behind the glass: a painted garden, or the user's image     *
 * ------------------------------------------------------------------ */
const GARDEN = 1024;
const gardenCanvas = document.createElement('canvas');
gardenCanvas.width = gardenCanvas.height = GARDEN;
const gctx = gardenCanvas.getContext('2d');

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

function paintGarden(seed) {
  const r = rng(seed), S = GARDEN, ctx = gctx;
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#2c4a26'); g.addColorStop(0.5, '#1d3a1c'); g.addColorStop(1, '#0f2412');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 6; i++) {
    const x = r() * S, y = r() * S * 0.6, rad = 80 + r() * 160;
    const sg = ctx.createRadialGradient(x, y, 0, x, y, rad);
    sg.addColorStop(0, 'rgba(214,232,196,0.55)'); sg.addColorStop(1, 'rgba(214,232,196,0)');
    ctx.fillStyle = sg; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const palette = [[62,110,44],[88,140,58],[120,168,72],[150,190,90],[70,120,60],[190,200,110],[210,196,90],[44,86,40]];
  const layers = [
    { n: 140, size: [40, 90], blur: 10, alpha: 0.55, dark: 0.55 },
    { n: 120, size: [30, 70], blur: 5, alpha: 0.75, dark: 0.8 },
    { n: 90, size: [22, 52], blur: 1.5, alpha: 0.95, dark: 1.0 },
  ];
  for (const L of layers) {
    if ('filter' in ctx) ctx.filter = `blur(${L.blur}px)`;
    for (let i = 0; i < L.n; i++) {
      const x = Math.pow(r(), 0.7) * S;
      const y = (0.15 + Math.pow(r(), 0.8) * 0.95) * S;
      const w = L.size[0] + r() * (L.size[1] - L.size[0]);
      const c = palette[Math.floor(r() * palette.length)];
      const k = L.dark * (0.75 + r() * 0.35);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r() * Math.PI * 2);
      ctx.fillStyle = `rgba(${c[0] * k | 0},${c[1] * k | 0},${c[2] * k | 0},${L.alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, -w * 0.62);
      ctx.bezierCurveTo(w * 0.62, -w * 0.4, w * 0.55, w * 0.42, 0, w * 0.5);
      ctx.bezierCurveTo(-w * 0.55, w * 0.42, -w * 0.62, -w * 0.4, 0, -w * 0.62);
      ctx.fill();
      ctx.fillStyle = `rgba(230,240,190,${0.12 * L.dark})`;
      ctx.beginPath(); ctx.ellipse(-w * 0.12, -w * 0.15, w * 0.22, w * 0.14, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  if ('filter' in ctx) ctx.filter = 'none';
}

let seed = 20261107;
paintGarden(seed);
const gardenTex = new THREE.CanvasTexture(gardenCanvas);
gardenTex.wrapS = gardenTex.wrapT = THREE.MirroredRepeatWrapping;

/* ------------------------------------------------------------------ *
 *  Uniforms + GLSL                                                    *
 * ------------------------------------------------------------------ */
const uniforms = {
  uTex: { value: gardenTex },
  uTexAspect: { value: 1 },
  uRes: { value: new THREE.Vector2(1, 1) },
  uDpr: { value: 1 },
  uTime: { value: 0 },
  uSway: { value: 1 },
  uFrost: { value: 0.6 },
  uMesh: { value: 1 },
  uDepth: { value: 0.65 },
  uBlurA: { value: null },
  uBlurB: { value: null },
  uRain: { value: 1 },
  uRainTime: { value: 0 },
  uLight: { value: new THREE.Vector3(2, 1, 2.6) },
  uPaneCss: { value: new THREE.Vector2(1, 1) },   // pane size in CSS px
  uViewCss: { value: new THREE.Vector2(1, 1) },   // viewport size in CSS px
  uViewWorld: { value: new THREE.Vector2(1, 1) }, // viewport size in world units
};

// The image hangs a set distance behind the glass and tilts with it.
// It's zoomed a little so tilting reveals more picture, not mirrored edges.
const IMAGE_ZOOM = 1.3;

/* ------------------------------------------------------------------ *
 *  Depth of field: every image gets two pre-blurred copies, so the    *
 *  shader can push it out of focus without hundreds of samples.       *
 * ------------------------------------------------------------------ */
const blurMat = new THREE.ShaderMaterial({
  uniforms: { src: { value: null }, dir: { value: new THREE.Vector2() } },
  depthTest: false, depthWrite: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */`
precision highp float;
uniform sampler2D src; uniform vec2 dir; varying vec2 vUv;
void main(){
  vec3 c = texture2D(src, vUv).rgb * 0.2270270270;
  c += texture2D(src, vUv + dir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(src, vUv - dir * 1.3846153846).rgb * 0.3162162162;
  c += texture2D(src, vUv + dir * 3.2307692308).rgb * 0.0702702703;
  c += texture2D(src, vUv - dir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`,
});
const blurQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat);
blurQuad.frustumCulled = false;
const blurScene = new THREE.Scene();
blurScene.add(blurQuad);
const blurCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

function makeTarget(w, h) {
  const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: false, generateMipmaps: false });
  rt.texture.wrapS = rt.texture.wrapT = THREE.MirroredRepeatWrapping;
  rt.texture.minFilter = rt.texture.magFilter = THREE.LinearFilter;
  return rt;
}
let blurA, blurB, blurTmp;
function buildBlurs(tex, aspect) {
  const LONG = 512;
  const w = Math.round(aspect >= 1 ? LONG : LONG * aspect);
  const h = Math.round(aspect >= 1 ? LONG / aspect : LONG);
  for (const rt of [blurA, blurB, blurTmp]) rt && rt.dispose();
  blurA = makeTarget(w, h); blurB = makeTarget(w, h); blurTmp = makeTarget(w, h);
  const pass = (src, dst, dx, dy) => {
    blurMat.uniforms.src.value = src;
    blurMat.uniforms.dir.value.set(dx / w, dy / h);
    renderer.setRenderTarget(dst);
    renderer.render(blurScene, blurCam);
  };
  // soft focus: separable gaussian passes with growing spread
  let src = tex;
  for (const s of [1, 1.5, 2]) { pass(src, blurTmp, s, 0); pass(blurTmp.texture, blurA, 0, s); src = blurA.texture; }
  // far focus: keep spreading from the soft copy
  src = blurA.texture;
  for (const s of [2.5, 3, 3.5]) { pass(src, blurTmp, s, 0); pass(blurTmp.texture, blurB, 0, s); src = blurB.texture; }
  renderer.setRenderTarget(null);
  uniforms.uBlurA.value = blurA.texture;
  uniforms.uBlurB.value = blurB.texture;
}

const glassMat = new THREE.ShaderMaterial({
  uniforms,
  side: THREE.DoubleSide,
  vertexShader: /* glsl */`
varying vec2 vUv;
varying vec3 vWPos, vT, vB, vN;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWPos = wp.xyz;
  mat3 m = mat3(modelMatrix);
  vT = normalize(m * vec3(1.0, 0.0, 0.0));
  vB = normalize(m * vec3(0.0, 1.0, 0.0));
  vN = normalize(m * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * wp;
}`,
  fragmentShader: /* glsl */`
precision highp float;
uniform sampler2D uTex, uBlurA, uBlurB;
uniform float uTexAspect, uDpr, uTime, uSway, uFrost, uMesh, uRain, uRainTime, uDepth;
uniform vec2 uRes, uPaneCss, uViewCss, uViewWorld;
uniform vec3 uLight;
varying vec2 vUv;
varying vec3 vWPos, vT, vB, vN;

/* ---------- image behind the glass ---------- */
vec2 coverUv(vec2 uv){
  float a = uViewCss.x / uViewCss.y;
  vec2 s = a > uTexAspect ? vec2(1.0, uTexAspect / a) : vec2(a / uTexAspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}
vec3 behind(vec2 uv){
  vec2 w = vec2(sin(uTime*0.55 + uv.y*7.0), cos(uTime*0.45 + uv.x*6.0)) * 0.0035;
  w += vec2(sin(uTime*1.3 + uv.y*19.0), cos(uTime*1.1 + uv.x*17.0)) * 0.0012;
  uv += w * uSway;
  // focus falls off with distance: sharp -> soft -> far
  if (uDepth < 0.5) return mix(texture2D(uTex, uv).rgb, texture2D(uBlurA, uv).rgb, uDepth * 2.0);
  return mix(texture2D(uBlurA, uv).rgb, texture2D(uBlurB, uv).rgb, uDepth * 2.0 - 1.0);
}

/* ---------- pebbled glass ---------- */
vec2 hash2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
float hash(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*45758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
}
float pebble(vec2 p){
  vec2 i = floor(p), f = fract(p); float d = 8.0;
  for (int y=-1; y<=1; y++) for (int x=-1; x<=1; x++){
    vec2 g = vec2(float(x), float(y));
    vec2 r = g + hash2(i+g)*0.85 - f;
    d = min(d, dot(r,r));
  }
  return 1.0 - sqrt(d);
}
float height(vec2 p){ return pebble(p)*0.75 + vnoise(p*2.7)*0.25 + vnoise(p*0.35)*0.4; }

/* ---------- rain on the glass (after Martijn Steinrucken's "Heartfelt") ---------- */
vec3 N13(float p){
  vec3 p3 = fract(vec3(p) * vec3(.1031, .11369, .13787));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract(vec3((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y, (p3.y + p3.z) * p3.x));
}
float N1(float t){ return fract(sin(t * 12345.564) * 7658.76); }
float Saw(float b, float t){ return smoothstep(0.0, b, t) * smoothstep(1.0, b, t); }

// sliding drops with trails: x = drop, y = trail it wiped clear
vec2 dropLayer(vec2 uv, float t){
  vec2 UV = uv;
  uv.y += t * 0.75;
  vec2 a = vec2(6.0, 1.0);
  vec2 grid = a * 2.0;
  vec2 id = floor(uv * grid);
  uv.y += N1(id.x);
  id = floor(uv * grid);
  vec3 n = N13(id.x * 35.2 + id.y * 2376.1);
  vec2 st = fract(uv * grid) - vec2(0.5, 0.0);
  float x = n.x - 0.5;
  float y = UV.y * 20.0;
  float wiggle = sin(y + sin(y));
  x += wiggle * (0.5 - abs(x)) * (n.z - 0.5);
  x *= 0.7;
  float ti = fract(t + n.z);
  y = (Saw(0.85, ti) - 0.5) * 0.9 + 0.5;
  vec2 p = vec2(x, y);
  float d = length((st - p) * a.yx);
  float mainDrop = smoothstep(0.4, 0.0, d);
  float r = sqrt(smoothstep(1.0, y, st.y));
  float cd = abs(st.x - x);
  float trail = smoothstep(0.23 * r, 0.15 * r * r, cd);
  float trailFront = smoothstep(-0.02, 0.02, st.y - y);
  trail *= trailFront * r * r;
  y = fract(UV.y * 10.0) + (st.y - 0.5);
  float droplets = smoothstep(0.3, 0.0, length(st - vec2(x, y)));
  return vec2(mainDrop + droplets * r * trailFront, trail);
}
// small beads that appear and evaporate
float staticDrops(vec2 uv, float t){
  uv *= 40.0;
  vec2 id = floor(uv);
  uv = fract(uv) - 0.5;
  vec3 n = N13(id.x * 107.45 + id.y * 3543.654);
  vec2 p = (n.xy - 0.5) * 0.7;
  float d = length(uv - p);
  float fade = Saw(0.025, fract(t + n.z));
  return smoothstep(0.3, 0.0, d) * fract(n.z * 10.0) * fade;
}
vec2 drops(vec2 uv, float t){
  float s = staticDrops(uv, t);
  vec2 m1 = dropLayer(uv, t);
  vec2 m2 = dropLayer(uv * 1.85, t);
  float c = smoothstep(0.3, 1.0, s * 0.55 + m1.x + m2.x * 0.7);
  return vec2(c, max(m1.y, m2.y * 0.7));
}

void main(){
  vec2 centered = (vUv - 0.5) * uPaneCss;   // CSS px from the pane's centre
  vec2 px = centered + uPaneCss * 0.5;      // CSS px from the pane's corner

  // pebble relief, cell ~11px
  vec2 p = px / 11.0;
  float e = 0.06;
  float h  = height(p);
  float hx = height(p + vec2(e, 0.0));
  float hy = height(p + vec2(0.0, e));
  vec3 nT = normalize(vec3(-vec2(hx - h, hy - h) / e * 0.55, 1.0));

  // rain
  vec2 rainN = vec2(0.0);
  float dropMask = 0.0, trail = 0.0;
  if (uRain > 0.5) {
    vec2 ruv = centered / uViewCss.y;
    vec2 c = drops(ruv, uRainTime);
    float ex = 0.0015;
    float cx = drops(ruv + vec2(ex, 0.0), uRainTime).x;
    float cy = drops(ruv + vec2(0.0, ex), uRainTime).x;
    rainN = vec2(cx - c.x, cy - c.x);
    dropMask = smoothstep(0.1, 0.25, c.x);
    trail = c.y;
  }

  vec3 nTs = normalize(nT + vec3(rainN * 9.0, 0.0));            // drops catch light too
  vec3 n = normalize(vT * nTs.x + vB * nTs.y + vN * nTs.z);
  vec3 V = normalize(cameraPosition - vWPos);
  if (!gl_FrontFacing) { n = -n; }

  // frost: heavier toward the left; drops act as clear lenses, trails wipe it away
  vec2 local = centered / uViewCss + 0.5;   // 0..1 across the viewport at rest
  float side = smoothstep(0.95, 0.0, local.x) * 0.8 + smoothstep(0.2, 1.0, local.y) * 0.25;
  float frost = clamp(uFrost * (0.45 + side), 0.0, 1.4);
  frost *= 1.0 - max(dropMask * 0.85, trail * 0.7);

  // the image hangs behind the pane: follow the view ray through the glass to it,
  // so it tilts with the pane but slides against it like something far away
  vec3 ray = normalize(vWPos - cameraPosition);
  vec3 inward = gl_FrontFacing ? -vN : vN;
  float into = max(dot(ray, inward), 0.08);
  float gap = uDepth * 0.45 * uViewWorld.y;                  // world units between glass and image
  vec2 slide = vec2(dot(ray, vT), dot(ray, vB)) / into * gap / uViewWorld;
  float zoom = ${IMAGE_ZOOM.toFixed(2)} + 0.35 * uDepth;          // far things look smaller, so scale up
  vec2 imgUv = coverUv((local + slide - 0.5) / zoom + 0.5);
  // distance haze: a far scene loses a little contrast
  float haze = uDepth * 0.07;
  vec2 tuv = imgUv + nT.xy * (0.012 + 0.02 * frost) * (1.0 - dropMask) + rainN * 1.4;
  float rad = 0.002 + 0.03 * frost;
  vec3 col = vec3(0.0); float wsum = 0.0;
  for (int i = 0; i < 18; i++){
    float fi = float(i);
    float r = sqrt((fi + 0.5) / 18.0) * rad;
    float a = fi * 2.39996 + h * 3.0;
    float wgt = 1.0 - (fi / 18.0) * 0.5;
    col += behind(tuv + vec2(cos(a), sin(a)) * r) * wgt;
    wsum += wgt;
  }
  col /= wsum;
  col = mix(col, vec3(dot(col, vec3(0.3, 0.55, 0.15))) * 0.9 + 0.08, haze);

  // milky scatter inside the glass
  vec3 milk = vec3(0.80, 0.86, 0.80);
  col = mix(col, milk, clamp(0.08 + 0.42 * frost * frost, 0.0, 0.7) * (0.7 + 0.3 * h));

  // light follows the pointer
  vec3 L = normalize(uLight - vWPos);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(n, H), 0.0), 70.0);
  float d = length(uLight.xy - vWPos.xy) / max(uViewWorld.x, uViewWorld.y);
  float glow = exp(-d * d * 9.0);
  float fres = pow(1.0 - abs(dot(vN, V)), 3.0);
  col += vec3(1.0, 0.99, 0.94) * (spec * (0.35 + 1.1 * glow + dropMask * 0.5) + glow * 0.22);
  col = mix(col, milk, fres * 0.35);
  col += (h - 0.5) * 0.06 * (1.0 - dropMask);
  col *= 1.0 - smoothstep(0.0, 0.06, length(rainN)) * 0.12;  // soft dark drop rims

  // embedded wire mesh, nudged by the glass above it
  vec2 q = px / 24.0 + nT.xy * 0.035 + rainN * 2.0;
  vec2 dl = abs(fract(q + 0.5) - 0.5) * 24.0;
  float wire = 1.0 - smoothstep(0.45, 1.25, min(dl.x, dl.y));
  wire = max(wire, 1.0 - smoothstep(0.8, 1.8, length(dl)));   // weld points
  vec3 wireCol = vec3(0.10, 0.12, 0.10) + spec * 0.5 + glow * 0.15;
  float seen = mix(0.82, 0.45, clamp(frost, 0.0, 1.0));
  col = mix(col, wireCol, wire * seen * uMesh);

  vec2 v = gl_FragCoord.xy / uRes - 0.5;
  col *= 1.0 - dot(v, v) * 0.35;
  gl_FragColor = vec4(col, 1.0);
}`,
});
const pane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glassMat);

const scene = new THREE.Scene();
scene.add(pane);
const FOV = 30;
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);

/* ------------------------------------------------------------------ *
 *  Sizing: 100 CSS px = 1 world unit. The pane is far bigger than     *
 *  the screen, so even at full tilt you never see its edge.           *
 * ------------------------------------------------------------------ */
const TILT_LIMIT = 0.6;  // ~34° on ordinary screens
let MAX_TILT = TILT_LIMIT; // eased back on very wide screens so the pane stays a sane size
let worldW = 1, worldH = 1;

// Size the pane so it covers the screen at every extreme tilt: cast a ray through each
// screen corner onto the tilted pane and make the pane big enough to contain every hit.
const TILTS = [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
function coverScale() {
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane();
  const hit = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const inv = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const ndc = new THREE.Vector2();
  let k = 1;
  for (const [tx, ty] of TILTS) {
    euler.set(tx * MAX_TILT, ty * MAX_TILT, 0);
    q.setFromEuler(euler);
    inv.copy(q).invert();
    plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1).applyQuaternion(q), new THREE.Vector3());
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      raycaster.setFromCamera(ndc.set(sx, sy), camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return 8;
      hit.applyQuaternion(inv);
      k = Math.max(k, 2 * Math.abs(hit.x) / worldW, 2 * Math.abs(hit.y) / worldH);
    }
  }
  return Math.min(k * 1.06, 8);
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  uniforms.uRes.value.set(innerWidth * dpr, innerHeight * dpr);
  uniforms.uDpr.value = dpr;

  worldW = innerWidth / 100; worldH = innerHeight / 100;
  camera.aspect = innerWidth / innerHeight;
  camera.position.set(0, 0, (worldH / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  MAX_TILT = TILT_LIMIT;
  let k = coverScale();
  while (k > 5 && MAX_TILT > 0.25) { MAX_TILT -= 0.025; k = coverScale(); }
  tilt.tx = clamp(tilt.tx, -MAX_TILT, MAX_TILT);
  tilt.ty = clamp(tilt.ty, -MAX_TILT, MAX_TILT);
  pane.scale.set(worldW * k, worldH * k, 1);
  uniforms.uPaneCss.value.set(innerWidth * k, innerHeight * k);
  uniforms.uViewCss.value.set(innerWidth, innerHeight);
  uniforms.uViewWorld.value.set(worldW, worldH);
  requestRender();
}

/* ------------------------------------------------------------------ *
 *  Interaction: drag to tilt, move to light, arrows + R on keyboard   *
 * ------------------------------------------------------------------ */
const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
const light = { x: 0.72, y: 0.68, tx: 0.72, ty: 0.68 };
let drag = null;
let lastMove = -1e9;

function setLightFromEvent(ev) {
  light.tx = ev.clientX / innerWidth;
  light.ty = 1 - ev.clientY / innerHeight;
  lastMove = performance.now();
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

canvas.addEventListener('pointerdown', ev => {
  canvas.setPointerCapture(ev.pointerId);
  drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, tx: tilt.tx, ty: tilt.ty };
  canvas.classList.add('dragging');
  setLightFromEvent(ev);
  requestRender();
});
canvas.addEventListener('pointermove', ev => {
  setLightFromEvent(ev);
  if (drag && ev.pointerId === drag.id) {
    const k = 2.2 / Math.min(innerWidth, innerHeight);
    tilt.ty = clamp(drag.ty + (ev.clientX - drag.x) * k, -MAX_TILT, MAX_TILT);
    tilt.tx = clamp(drag.tx + (ev.clientY - drag.y) * k, -MAX_TILT, MAX_TILT);
  }
  requestRender();
});
function endDrag(ev) {
  if (drag && ev.pointerId === drag.id) { drag = null; canvas.classList.remove('dragging'); }
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('dblclick', resetTilt);
canvas.addEventListener('keydown', ev => {
  const step = 0.08;
  if (ev.key === 'ArrowLeft') tilt.ty = clamp(tilt.ty - step, -MAX_TILT, MAX_TILT);
  else if (ev.key === 'ArrowRight') tilt.ty = clamp(tilt.ty + step, -MAX_TILT, MAX_TILT);
  else if (ev.key === 'ArrowUp') tilt.tx = clamp(tilt.tx - step, -MAX_TILT, MAX_TILT);
  else if (ev.key === 'ArrowDown') tilt.tx = clamp(tilt.tx + step, -MAX_TILT, MAX_TILT);
  else if (ev.key === 'r' || ev.key === 'R') resetTilt();
  else return;
  ev.preventDefault();
  requestRender();
});
function resetTilt() { tilt.tx = 0; tilt.ty = 0; requestRender(); }

/* ------------------------------------------------------------------ *
 *  Controls                                                           *
 * ------------------------------------------------------------------ */
const $ = id => document.getElementById(id);
$('frost').addEventListener('input', e => { uniforms.uFrost.value = +e.target.value; requestRender(); });
$('mesh').addEventListener('change', e => { uniforms.uMesh.value = e.target.checked ? 1 : 0; requestRender(); });
$('sway').addEventListener('change', e => { uniforms.uSway.value = e.target.checked ? 1 : 0; requestRender(); });
$('reset').addEventListener('click', resetTilt);
$('depth').addEventListener('input', e => { uniforms.uDepth.value = +e.target.value; requestRender(); });
let rainSpeed = 1;
$('rain').addEventListener('change', e => {
  uniforms.uRain.value = e.target.checked ? 1 : 0;
  $('rainSpeed').disabled = !e.target.checked;
  lofi.setRain(e.target.checked, rainSpeed);
  requestRender();
});
$('rainSpeed').addEventListener('input', e => {
  rainSpeed = +e.target.value;
  lofi.setRain($('rain').checked, rainSpeed);
  requestRender();
});

/* ------------------------------------------------------------------ *
 *  Lofi rain playlist                                                 *
 * ------------------------------------------------------------------ */
const PLAY = 'M4 2.5v11l9-5.5z', PAUSE = 'M4 2.5h3v11H4zM9 2.5h3v11H9z';
const lofi = createLofi({
  onChange({ playing, title, index, count }) {
    $('trackName').textContent = title;
    $('trackMeta').textContent = `lofi + rain · ${index + 1} / ${count}`;
    $('play').setAttribute('aria-pressed', String(playing));
    $('play').setAttribute('aria-label', playing ? 'Pause lofi rain' : 'Play lofi rain');
    $('playIcon').setAttribute('d', playing ? PAUSE : PLAY);
  },
});
$('play').addEventListener('click', () => {
  if (lofi.state.playing) lofi.pause();
  else lofi.play().catch(() => toast('Sound couldn’t start in this browser.'));
});
$('next').addEventListener('click', () => lofi.next());
$('vol').addEventListener('input', e => lofi.setVolume(+e.target.value));
$('reseed').addEventListener('click', () => {
  seed = (seed * 48271) % 2147483647;
  paintGarden(seed);
  gardenTex.needsUpdate = true;
  setBackground(gardenTex, 1);
});
$('upload').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', e => { useImage(e.target.files[0]); e.target.value = ''; });

// drag-and-drop an image anywhere
const dropEl = $('drop');
let dragDepth = 0;
addEventListener('dragenter', e => { if (hasFiles(e)) { e.preventDefault(); dragDepth++; dropEl.hidden = false; } });
addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dropEl.hidden = true; });
addEventListener('drop', e => {
  e.preventDefault(); dragDepth = 0; dropEl.hidden = true;
  if (e.dataTransfer.files.length) useImage(e.dataTransfer.files[0]);
});
// paste an image from the clipboard
addEventListener('paste', e => {
  const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
  if (item) useImage(item.getAsFile());
});
function hasFiles(e) { return [...(e.dataTransfer?.types || [])].includes('Files'); }

let userTex = null;
function setBackground(tex, aspect) {
  if (userTex && userTex !== tex) { userTex.dispose(); userTex = null; }
  if (tex !== gardenTex) userTex = tex;
  uniforms.uTex.value = tex;
  uniforms.uTexAspect.value = aspect;
  buildBlurs(tex, aspect);
  requestRender();
}

const MAX_SIDE = 2048;
function useImage(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('That file isn’t an image. Try a JPG, PNG or WebP.'); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    // downscale big photos so the blur stays fast
    const s = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * s));
    c.height = Math.max(1, Math.round(img.naturalHeight * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
    setBackground(tex, c.width / c.height);
    toast(`Now showing ${file.name || 'your image'} behind the glass.`);
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('That image couldn’t be opened. Try a JPG, PNG or WebP.'); };
  img.src = url;
}

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg; toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
}

/* ------------------------------------------------------------------ *
 *  Render loop                                                        *
 * ------------------------------------------------------------------ */
const clock = new THREE.Clock();
let rainClock = 7.3; // start mid-shower so the first frame already has drops
function frame() {
  const now = performance.now();
  const dt = Math.min(clock.getDelta(), 0.1);
  uniforms.uTime.value = reduceMotion ? 0 : clock.elapsedTime;
  // the slider sets how fast rain time passes, so changing it never makes drops jump
  if (!reduceMotion) rainClock += dt * 0.2 * rainSpeed;
  uniforms.uRainTime.value = rainClock;

  if (!reduceMotion && !drag && now - lastMove > 3000) {
    const s = now / 1000 * 0.18;
    light.tx = 0.55 + Math.cos(s) * 0.28;
    light.ty = 0.55 + Math.sin(s * 1.3) * 0.25;
  }
  const ease = reduceMotion ? 1 : 0.1;
  light.x += (light.tx - light.x) * ease;
  light.y += (light.ty - light.y) * ease;
  tilt.x += (tilt.tx - tilt.x) * (reduceMotion ? 1 : 0.14);
  tilt.y += (tilt.ty - tilt.y) * (reduceMotion ? 1 : 0.14);

  pane.rotation.set(tilt.x, tilt.y, 0);
  uniforms.uLight.value.set((light.x - 0.5) * worldW, (light.y - 0.5) * worldH, 2.6);
  renderer.render(scene, camera);
}

let pending = false;
function requestRender() {
  if (!reduceMotion || pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; frame(); });
}

addEventListener('resize', resize);
resize();
setBackground(gardenTex, 1);
if (reduceMotion) frame();
else renderer.setAnimationLoop(frame);
