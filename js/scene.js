const THREE_URLS = ["https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js", "https://unpkg.com/three@0.169.0/build/three.module.min.js"];
function boot(attempt) {
  scene(attempt).catch((err) => {
    dispatchEvent(new Event("scene-ready"));
    if (attempt < 5) return setTimeout(() => boot(attempt + 1), 800 * (attempt + 1));
    console.warn("Particules indisponibles :", err);
    const note = document.createElement("p");
    note.className = "label scene-off";
    note.textContent = `Particules indisponibles : ${err?.message ?? err}`;
    document.body.append(note);
  });
}
boot(0);

async function scene(attempt) {
const THREE = await import(THREE_URLS[attempt % THREE_URLS.length]);

const mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const N = mobile ? 9000 : 24000;
const TAU = Math.PI * 2;
const rand = Math.random;
const $ = (s) => document.querySelector(s);

const SCENES = [
  { el: ".hero", pos: [1.5, 0.45, 0], mpos: [0, 0.95, 0], size: 0.78, dim: 1 },
  { el: ".manifesto", pos: [0.3, 0, 0], mpos: [0, 0.3, 0], size: 1, dim: 0.85 },
  { el: ".work", pos: [0, 0, -0.4], mpos: [0, 0, 0], size: 1, dim: 0.5 },
  { el: ".services", pos: [0.6, 0, 0], mpos: [0, 0, 0], size: 0.9, dim: 0.7 },
  { el: ".contact", pos: [1.75, 0.15, 0], mpos: [0, 1.1, 0], size: 1, dim: 1 },
];

const v = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
function shape(place) {
  const pts = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { place(v); v.toArray(pts, i * 3); }
  return pts;
}

function iris() {
  const R = 2, k = 7;
  const poly = Array.from({ length: k }, (_, j) => [0.72 * Math.cos(0.3 + j * TAU / k), 0.72 * Math.sin(0.3 + j * TAU / k)]);
  const inside = (x, y) => poly.every(([ax, ay], j) => {
    const [bx, by] = poly[(j + 1) % k];
    return (bx - ax) * (y - ay) - (by - ay) * (x - ax) > 0;
  });
  return shape((p) => {
    const t = rand();
    let x, y;
    if (t < 0.25) {
      const a = rand() * TAU, r = R + rand() * 0.12;
      x = r * Math.cos(a); y = r * Math.sin(a);
    } else if (t < 0.6) {
      const j = (rand() * k) | 0, [ax, ay] = poly[j], [bx, by] = poly[(j + 1) % k];
      const len = Math.hypot(bx - ax, by - ay);
      do { const u = rand() * 2.6; x = ax + ((bx - ax) / len) * u; y = ay + ((by - ay) / len) * u; } while (Math.hypot(x, y) > R);
    } else {
      do { const a = rand() * TAU, r = Math.sqrt(rand() * (R * R - 0.25) + 0.25); x = r * Math.cos(a); y = r * Math.sin(a); } while (inside(x, y));
    }
    p.set(x, y, (rand() - 0.5) * 0.12);
  });
}

function beam() {
  const apex = new THREE.Vector3(-3.6, 1.7, -1), dir = new THREE.Vector3(1, -0.32, 0.25).normalize();
  const side = Z.clone().cross(dir).normalize(), up = dir.clone().cross(side);
  return shape((p) => {
    if (rand() < 0.08) return p.set((rand() - 0.5) * 9, (rand() - 0.5) * 5, (rand() - 0.5) * 3);
    const d = 8 * Math.pow(rand(), 0.75), a = rand() * TAU, r = d * 0.2 * Math.pow(rand(), 1.8);
    p.copy(apex).addScaledVector(dir, d).addScaledVector(side, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r);
  });
}

function strip() {
  const W = 1.15, hole = W / 2 - 0.09;
  const at = (u, w) => v.set(u, w + 0.35 * Math.sin(u * 0.7), 0.9 * Math.sin(u * 0.45)).applyAxisAngle(Z, -0.28);
  return shape((p) => {
    let u, w;
    for (;;) {
      u = (rand() - 0.5) * 10; w = (rand() - 0.5) * W;
      const aw = Math.abs(w);
      if (aw > W / 2 - 0.17) {
        if (Math.abs(aw - hole) < 0.045 && (((u / 0.2) % 1) + 1) % 1 < 0.5) continue;
        break;
      }
      if ((((u / 0.8) % 1) + 1) % 1 < 0.06) continue;
      if (rand() < 0.55) continue;
      break;
    }
    p.copy(at(u, w));
  });
}

function frames() {
  const F = [
    [1.1, 1.65, -1.75, 0.15, -0.4, 0.45],
    [1.95, 1.1, 0.35, 0.55, 0, 0],
    [0.66, 1.17, 2.05, -0.6, 0.5, -0.4],
  ];
  const place = (i, x, y) => { const [, , ox, oy, oz, ry] = F[i]; return v.set(x, y, 0).applyAxisAngle(Y, ry).add({ x: ox, y: oy, z: oz }); };
  const per = F.map(([w, h]) => w + h), total = per.reduce((a, b) => a + b);
  return shape((p) => {
    let t = rand() * total, i = 0;
    while (t > per[i]) t -= per[i++];
    const [w, h] = F[i];
    let x, y;
    if (rand() < 0.65) {
      let e = rand() * 2 * (w + h);
      if (e < w) { x = e - w / 2; y = h / 2; }
      else if ((e -= w) < h) { x = w / 2; y = h / 2 - e; }
      else if ((e -= h) < w) { x = w / 2 - e; y = -h / 2; }
      else { x = -w / 2; y = -h / 2 + (e - w); }
      x += (rand() - 0.5) * 0.03; y += (rand() - 0.5) * 0.03;
    } else {
      x = (rand() - 0.5) * w * 0.9;
      y = Math.round(((rand() - 0.5) * h * 0.9) / 0.06) * 0.06;
    }
    p.copy(place(i, x, y));
  });
}

async function monogram() {
  try { await document.fonts.load('italic 200px "Instrument Serif"'); } catch {}
  const W = 420, H = 260, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.font = 'italic 230px "Instrument Serif", Georgia, serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("EJ", W / 2, H / 2 + 10);
  const d = g.getImageData(0, 0, W, H).data, px = [];
  for (let i = 3; i < d.length; i += 4) if (d[i] > 128) px.push(((i - 3) / 4) % W, ((i - 3) / 4 / W) | 0);
  const s = 3.4 / W;
  return shape((p) => {
    const j = ((rand() * px.length) / 2) << 1;
    p.set((px[j] - W / 2 + rand()) * s, -(px[j + 1] - H / 2 + rand()) * s, (rand() - 0.5) * 0.25);
  });
}

const vertex = `
uniform float uTime, uShape, uPR, uHover, uMouseOn, uAspect, uVel;
uniform vec2 uMouse;
attribute vec3 aS0, aS1, aS2, aS3, aS4, aRnd;
varying float vAlpha;
varying vec3 vColor;

vec3 shapeAt(float i) {
  if (i < 0.5) { float a = uTime * 0.08; return vec3(mat2(cos(a), sin(a), -sin(a), cos(a)) * aS0.xy, aS0.z); }
  if (i < 1.5) return aS1;
  if (i < 2.5) return aS2;
  if (i < 3.5) return aS3;
  return aS4;
}

void main() {
  float i0 = floor(uShape);
  float t = smoothstep(0.0, 1.0, clamp((uShape - i0 - aRnd.x * 0.35) / 0.65, 0.0, 1.0));
  vec3 p = mix(shapeAt(i0), shapeAt(min(i0 + 1.0, 4.0)), t);
  vec3 dir = normalize(aRnd - 0.5);
  p += dir * sin(t * 3.14159) * (0.6 + aRnd.y * 1.2);
  p += 0.04 * vec3(sin(uTime * 0.7 + aRnd.x * 60.0), cos(uTime * 0.6 + aRnd.y * 60.0), sin(uTime * 0.5 + aRnd.z * 60.0));
  p += dir * uHover * 0.12;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  mv.y -= clamp(uVel, -1.0, 1.0) * pow(aRnd.z, 3.0) * 1.2;
  vec4 clip = projectionMatrix * mv;
  vec2 d = clip.xy / clip.w - uMouse;
  d.x *= uAspect;
  float push = smoothstep(0.35, 0.0, length(d)) * uMouseOn;
  mv.xy += normalize(d + 1e-4) * push * 0.5;
  gl_Position = projectionMatrix * mv;

  float blur = abs(-mv.z - 6.0);
  float bokeh = step(0.988, aRnd.z);
  float size = mix(1.4 + aRnd.y * 2.6, 9.0 + aRnd.x * 14.0, bokeh) * (1.0 + blur * 0.8);
  gl_PointSize = size * uPR * (6.0 / -mv.z);
  vAlpha = mix(0.75, 0.1, bokeh) / (1.0 + blur * 1.5) + push * 0.5;
  vColor = mix(vec3(0.93, 0.92, 0.89), vec3(1.0, 0.36, 0.22), max(step(0.84, aRnd.y), uHover * 0.6));
}`;

const fragment = `
uniform float uOpacity;
varying float vAlpha;
varying vec3 vColor;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(vColor, a * a * vAlpha * uOpacity);
}`;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
} catch {
  throw new Error("le navigateur refuse WebGL");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
renderer.domElement.className = "gl";
document.querySelector("canvas.gl")?.remove();
document.body.prepend(renderer.domElement);
let alive = true;
renderer.domElement.addEventListener("webglcontextlost", () => {
  const t = setTimeout(() => {
    alive = false;
    boot(0);
  }, 3000);
  renderer.domElement.addEventListener("webglcontextrestored", () => clearTimeout(t), { once: true });
});

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
camera.position.z = 6;
const scene = new THREE.Scene();

const shapes = [iris(), beam(), strip(), frames(), await monogram()];
const geo = new THREE.BufferGeometry();
geo.setAttribute("position", new THREE.BufferAttribute(shapes[0], 3));
shapes.forEach((s, i) => geo.setAttribute(`aS${i}`, new THREE.BufferAttribute(s, 3)));
geo.setAttribute("aRnd", new THREE.BufferAttribute(Float32Array.from({ length: N * 3 }, rand), 3));

const U = {
  uTime: { value: 0 }, uShape: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uHover: { value: 0 },
  uMouse: { value: new THREE.Vector2(9, 9) }, uMouseOn: { value: 0 }, uAspect: { value: 1 }, uOpacity: { value: 1 }, uVel: { value: 0 },
};
const points = new THREE.Points(geo, new THREE.ShaderMaterial({
  uniforms: U, vertexShader: vertex, fragmentShader: fragment,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
}));
points.frustumCulled = false;
scene.add(points);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = U.uAspect.value = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

let mouseOn = 0, hover = 0;
if (!mobile) {
  addEventListener("pointermove", (e) => { U.uMouse.value.set((e.clientX / innerWidth) * 2 - 1, 1 - (e.clientY / innerHeight) * 2); mouseOn = 1; }, { passive: true });
  document.addEventListener("pointerleave", () => (mouseOn = 0));
}
$("#work-list").addEventListener("pointerover", () => (hover = 1));
$("#work-list").addEventListener("pointerleave", () => (hover = 0));

const els = SCENES.map((s) => $(s.el));
const ease = (f) => f * f * (3 - 2 * f);
const lerp3 = (a, b, e) => a.map((x, i) => x + (b[i] - x) * e);
const t0 = performance.now();
let s = 0, last = performance.now();

function scrollShape() {
  let t = 0;
  for (let i = 1; i < els.length; i++) t += Math.min(Math.max((innerHeight / 2 - els[i].getBoundingClientRect().top) / innerHeight + 0.5, 0), 1);
  return t;
}

function frame(now) {
  if (!alive) return;
  requestAnimationFrame(frame);
  if (document.querySelector("#viewer[open] .game")) return;
  const time = (now - t0) / 1000;
  const k = 1 - Math.exp(-Math.min((now - last) / 1000, 0.25) * 3.5);
  last = now;
  const target = scrollShape();
  s = reduce ? target : s + (target - s) * k;
  const i0 = Math.min(Math.floor(s), SCENES.length - 2), f = s - i0, e = ease(f);
  const A = SCENES[i0], B = SCENES[i0 + 1];

  U.uTime.value = reduce ? 0 : time;
  U.uShape.value = s;
  U.uVel.value = target - s;
  U.uOpacity.value = A.dim + (B.dim - A.dim) * e;
  U.uMouseOn.value += (mouseOn - U.uMouseOn.value) * k;
  U.uHover.value += (hover - U.uHover.value) * k;
  points.position.fromArray(lerp3(mobile ? A.mpos : A.pos, mobile ? B.mpos : B.pos, e));
  points.scale.setScalar((A.size + (B.size - A.size) * e) * (mobile ? 0.6 : 1));
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
document.body.classList.add("has-scene");
document.querySelector(".scene-off")?.remove();
dispatchEvent(new Event("scene-ready"));
}
