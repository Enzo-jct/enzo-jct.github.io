import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mobile, TAU, clamp01, rng } from "./kit.js";
import { fishGeometry, fishMaterial } from "./fish.js";

const X = new THREE.Vector3(1, 0, 0), UP = new THREE.Vector3(0, 1, 0);
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function route(points, bank) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), true, "centripetal");
  const L = curve.getLength(), T = new THREE.Vector3(), T2 = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(), m = new THREE.Matrix4(), q = new THREE.Quaternion();
  return {
    L,
    place(obj, d) {
      const u = (((d / L) % 1) + 1) % 1;
      curve.getPointAt(u, obj.position);
      curve.getTangentAt(u, T);
      curve.getTangentAt((u + 2 / L) % 1, T2);
      const turn = (T.x * T2.z - T.z * T2.x) / 2;
      side.crossVectors(T, UP).normalize();
      up.crossVectors(side, T);
      obj.quaternion.setFromRotationMatrix(m.makeBasis(T, up, side)).multiply(q.setFromAxisAngle(X, THREE.MathUtils.clamp(turn * bank, -0.6, 0.6)));
      return obj;
    },
  };
}

function whaleGeometry() {
  const body = new THREE.LatheGeometry([[0, 0], [0.045, 0.02], [0.08, 0.05], [0.115, 0.12], [0.132, 0.25], [0.126, 0.4], [0.105, 0.55], [0.072, 0.7], [0.042, 0.82], [0.024, 0.92], [0.016, 0.97], [0, 1]].map(([rr, y]) => new THREE.Vector2(rr, y)), 28);
  body.rotateZ(Math.PI / 2).translate(0.5, 0, 0).scale(1, 0.82, 1);
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.bezierCurveTo(0.08, 0.035, 0.22, 0.03, 0.32, 0.008);
  finShape.lineTo(0.315, -0.004);
  finShape.bezierCurveTo(0.2, -0.012, 0.07, -0.03, 0, -0.045);
  const fin = (side) => {
    const g = new THREE.ShapeGeometry(finShape, 8);
    const L = new THREE.Vector3(-0.45, -0.35, 0.82 * side).normalize(), W = new THREE.Vector3(1, 0, 0.55 * side);
    W.addScaledVector(L, -W.dot(L)).normalize();
    g.applyMatrix4(new THREE.Matrix4().makeBasis(L, W, new THREE.Vector3().crossVectors(L, W)));
    return g.translate(0.23, -0.05, 0.1 * side);
  };
  const flukeShape = new THREE.Shape();
  flukeShape.moveTo(0, 0);
  flukeShape.bezierCurveTo(-0.03, 0.05, -0.06, 0.11, -0.1, 0.15);
  flukeShape.bezierCurveTo(-0.085, 0.09, -0.08, 0.04, -0.095, 0);
  flukeShape.bezierCurveTo(-0.08, -0.04, -0.085, -0.09, -0.1, -0.15);
  flukeShape.bezierCurveTo(-0.06, -0.11, -0.03, -0.05, 0, 0);
  const flukes = new THREE.ShapeGeometry(flukeShape, 8).rotateX(Math.PI / 2).translate(-0.47, 0, 0);
  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(0, 0);
  dorsalShape.quadraticCurveTo(0.005, 0.03, -0.035, 0.04);
  dorsalShape.lineTo(-0.05, 0);
  const dorsal = new THREE.ShapeGeometry(dorsalShape, 6).translate(-0.15, 0.07, 0);
  return mergeGeometries([body, fin(1), fin(-1), flukes, dorsal]);
}
export function bodyMaterial(time, rate, { color = 0x56636e, lateral = false } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: time, uRate: { value: rate } });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime, uRate;\nvarying float vBelly;")
      .replace("#include <begin_vertex>", lateral ? `#include <begin_vertex>
        float tt = uTime * uRate, u = clamp(0.42 - position.x, 0.0, 1.0);
        transformed.z += sin(tt * 2.4 - u * 4.5) * 0.075 * u * u;
        vBelly = smoothstep(0.0, -0.05, position.y);` : `#include <begin_vertex>
        float tt = uTime * uRate, u = clamp(0.5 - position.x, 0.0, 1.0), beat = sin(tt * 0.85 - u * 2.6);
        transformed.y += beat * (0.03 * u * u * u + 0.04 * smoothstep(0.85, 1.05, u));
        transformed.y += sin(tt * 0.6 + 1.2) * max(abs(position.z) - 0.12, 0.0) * 0.35;
        vBelly = smoothstep(-0.01, -0.07, position.y);`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vBelly;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.75, 0.75), vBelly * 0.85);");
  };
  mat.customProgramCacheKey = () => (lateral ? "body-side" : "body");
  return mat;
}

function sharkGeometry() {
  const body = new THREE.LatheGeometry([[0, 0], [0.026, 0.014], [0.048, 0.045], [0.066, 0.1], [0.078, 0.18], [0.082, 0.28], [0.076, 0.42], [0.06, 0.57], [0.04, 0.71], [0.022, 0.84], [0.014, 0.92], [0, 0.96]].map(([rr, y]) => new THREE.Vector2(rr, y)), 20);
  body.rotateZ(Math.PI / 2).translate(0.5, 0, 0).scale(1, 0.92, 0.8);
  const fin = (pts) => {
    const sh = new THREE.Shape();
    sh.moveTo(...pts[0]);
    for (let i = 1; i < pts.length; i += 2) sh.quadraticCurveTo(...pts[i], ...pts[i + 1]);
    return new THREE.ShapeGeometry(sh, 6);
  };
  const dorsal = fin([[0.08, 0.06], [0.03, 0.16], [-0.05, 0.22], [-0.04, 0.12], [-0.1, 0.06]]);
  const tail = fin([[-0.42, 0.01], [-0.5, 0.08], [-0.6, 0.18], [-0.56, 0.06], [-0.53, 0], [-0.56, -0.05], [-0.58, -0.11], [-0.5, -0.04], [-0.42, -0.01]]);
  const pec = (side) => fin([[0.27, 0], [0.2, 0.1], [0.1, 0.17], [0.15, 0.07], [0.18, 0]]).rotateX(side * (Math.PI / 2 + 0.4)).translate(0, -0.04, 0.05 * side);
  return mergeGeometries([body, dorsal, tail, pec(1), pec(-1)]);
}

function rayGeometry(halfWidth, { bulge, tail, horns }) {
  const NX = 28, NZ = 32, pos = [], idx = [];
  for (let i = 0; i <= NX; i++) {
    const a = i / NX, w = halfWidth(a);
    for (let j = 0; j <= NZ; j++) {
      const v = (j / NZ) * 2 - 1, h = 1 - v * v;
      const front = smooth(0.8, 1, a) * smooth(0.4, 0.95, Math.abs(v));
      pos.push(a - 0.5 + horns * front, bulge * h * h * Math.sin(Math.PI * a) ** 0.7 - horns * 0.5 * front, v * w);
    }
  }
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NZ; j++) {
      const a = i * (NZ + 1) + j, b = a + NZ + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const whip = new THREE.PlaneGeometry(tail, 0.016, 10, 1).rotateX(-Math.PI / 2).translate(-0.5 - tail / 2, 0.01, 0);
  whip.deleteAttribute("uv");
  return mergeGeometries([g, whip]);
}
const mantaWidth = (a) => 0.03 + 1.1 * (a < 0.56 ? (a / 0.56) ** 1.7 : ((1 - a) / 0.44) ** 0.7) + 0.14 * smooth(0.72, 1, a);
const stingWidth = (a) => 0.02 + 0.62 * Math.sin(Math.PI * Math.min(a * 1.08, 1)) ** 0.75;
function rayMaterial(time, top, belly, wave) {
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.65, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTime: time, uWave: { value: new THREE.Vector4(...wave) }, uTop: { value: new THREE.Color(top) }, uBelly: { value: new THREE.Color(belly) } });
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform vec4 uWave;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        float span = abs(position.z), ph = uTime * uWave.x - span * uWave.z - (0.5 - position.x) * uWave.w;
        transformed.y += sin(ph) * uWave.y * pow(span, 1.5);
        if (position.x < -0.5) transformed.z += sin(uTime * uWave.x * 1.4 + position.x * 5.0) * 0.06 * (-0.5 - position.x);`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uTop, uBelly;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = gl_FrontFacing ? uTop : uBelly;");
  };
  return mat;
}

function turtleGeometry() {
  const parts = [], c = new THREE.Color();
  const part = (g, id, color) => {
    if (g.index) g = g.toNonIndexed();
    g.deleteAttribute("uv");
    const p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) color(p.getX(i), p.getY(i), p.getZ(i)).toArray(col, i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(n).fill(id), 1));
    parts.push(g);
  };
  const shell = new THREE.SphereGeometry(1, 28, 14), sp = shell.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const y = sp.getY(i);
    sp.setXYZ(i, sp.getX(i) * 0.5, y * (y > 0 ? 0.2 : 0.07), sp.getZ(i) * 0.4);
  }
  shell.computeVertexNormals();
  const dark = new THREE.Color("#3e3424"), light = new THREE.Color("#6f5c3a"), plastron = new THREE.Color("#c2b48a"), skin = new THREE.Color("#77745a");
  part(shell, 0, (x, y, z) => (y < 0 ? c.copy(plastron) : c.copy(dark).lerp(light, 0.5 + 0.5 * Math.sin(x * 21) * Math.sin(z * 24))));
  part(new THREE.SphereGeometry(0.1, 12, 8).scale(1.35, 0.85, 0.95).translate(0.57, 0.015, 0), 0, () => c.copy(skin));
  const flipper = new THREE.Shape();
  flipper.moveTo(0, 0);
  flipper.bezierCurveTo(0.1, 0.06, 0.35, 0.05, 0.55, -0.02);
  flipper.bezierCurveTo(0.4, -0.06, 0.15, -0.09, 0, -0.07);
  const limb = (side, front) => {
    const g = new THREE.ShapeGeometry(flipper, 8), L = new THREE.Vector3(front ? -0.45 : -1, 0, (front ? 1 : 0.8) * side).normalize();
    const W = new THREE.Vector3(1, 0, 0).addScaledVector(L, -L.x).normalize(), N = new THREE.Vector3().crossVectors(L, W);
    g.applyMatrix4(new THREE.Matrix4().makeBasis(L, W, N)).scale(front ? 1 : 0.42, 1, front ? 1 : 0.42).translate(front ? 0.22 : -0.36, -0.02, (front ? 0.3 : 0.2) * side);
    part(g, front ? 1 : 2, () => c.copy(skin));
  };
  limb(1, true);
  limb(-1, true);
  limb(1, false);
  limb(-1, false);
  return mergeGeometries(parts);
}
function turtleMaterial(time) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nattribute float aPart;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        if (aPart > 0.5) {
          float side = sign(position.z), front = step(aPart, 1.5);
          vec3 pivot = vec3(mix(-0.36, 0.22, front), -0.02, mix(0.2, 0.3, front) * side), q = transformed - pivot;
          float ang = -(sin(uTime * 1.3 - (1.0 - front) * 1.2) * mix(0.2, 0.6, front) + 0.1) * side, c = cos(ang), s = sin(ang);
          transformed = pivot + vec3(q.x, q.y * c - q.z * s, q.y * s + q.z * c);
        }`);
  };
  return mat;
}

function birdGeometry() {
  const p = [];
  const tri = (...v) => p.push(...v.flat());
  for (const s of [1, -1]) {
    const w = [[0.05, 0, 0.03], [-0.07, 0, 0.03], [0.04, 0.02, 0.3], [-0.06, 0.02, 0.3], [-0.12, -0.01, 0.62]].map(([x, y, z]) => [x, y, z * s]);
    tri(w[0], w[1], w[2]);
    tri(w[1], w[3], w[2]);
    tri(w[2], w[3], w[4]);
  }
  tri([0.2, 0, 0], [-0.16, 0.012, 0], [-0.16, -0.012, 0]);
  tri([0.2, 0, 0], [-0.16, 0, 0.02], [-0.16, 0, -0.02]);
  tri([-0.12, 0, 0], [-0.24, 0, 0.05], [-0.24, 0, -0.05]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  return g;
}

export function buildLife(scene, time, { ground }) {
  const r = rng(77), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), bank = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), pp = new THREE.Vector3(), dir = new THREE.Vector3(), e = new THREE.Euler();

  const whaleRoute = route([[-34, -5, -15], [-6, -4.3, -14.5], [18, -4.6, -13.5], [36, -5.6, -16], [48, -7, -27], [44, -7, -44], [22, -6, -52], [-8, -5.5, -53], [-32, -5, -45], [-44, -5, -28]], 3);
  const whaleGeo = whaleGeometry();
  const whale = new THREE.Mesh(whaleGeo, bodyMaterial(time, 1));
  whale.scale.setScalar(9.5);
  const calf = new THREE.Mesh(whaleGeo, bodyMaterial(time, 1.45));
  calf.scale.setScalar(3.4);
  whale.frustumCulled = calf.frustumCulled = false;
  scene.add(whale, calf);
  const ghost = new THREE.Object3D();
  const side = new THREE.Vector3(), above = new THREE.Vector3();

  const mantaGeo = rayGeometry(mantaWidth, { bulge: 0.07, tail: 0.55, horns: 0.09 });
  const mantas = [
    { route: route([[-12, -3, -7.5], [6, -2.6, -8.5], [22, -3.6, -7.5], [36, -5.6, -9], [40, -4.6, -20], [26, -3.2, -27], [8, -2.8, -25], [-10, -2.9, -21], [-18, -3, -13]], 5), speed: 1.25, at: 30, scale: 1.55 },
    { route: route([[-20, -3.4, -28], [4, -3.1, -33], [30, -4.2, -34], [44, -6, -40], [30, -4.6, -46], [2, -3.6, -44], [-22, -3.4, -38]], 4), speed: 1.05, at: 0, scale: 1.25 },
  ].map((o, i) => {
    const mesh = new THREE.Mesh(mantaGeo, rayMaterial(time, "#262a30", "#d3d7d2", [1.05 + i * 0.12, 0.27, 1.4, 0.9]));
    mesh.scale.setScalar(o.scale);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { ...o, mesh };
  });

  const turtleRoute = route([[-8, -4.6, -8.5], [6, -5, -9.5], [18, -6.4, -9], [30, -8.4, -10.5], [34, -7.4, -16], [22, -5.4, -19.5], [8, -4.4, -18.5], [-6, -4.2, -15]], 4);
  const turtle = new THREE.Mesh(turtleGeometry(), turtleMaterial(time));
  turtle.scale.setScalar(1.15);
  turtle.frustumCulled = false;
  scene.add(turtle);

  const stingRoute = route([[-4, 0, -9], [6, 0, -11.5], [15, 0, -15], [10, 0, -22], [0, 0, -19], [-6, 0, -14]].map(([x, , z]) => [x, ground(x, z) + 0.45, z]), 3);
  const sting = new THREE.Mesh(rayGeometry(stingWidth, { bulge: 0.05, tail: 0.9, horns: 0 }), rayMaterial(time, "#6a5a44", "#cfc7b4", [2.2, 0.07, 2, 7]));
  sting.scale.setScalar(1.3);
  sting.frustumCulled = false;
  scene.add(sting);

  const reefMat = fishMaterial(time);
  reefMat.color.set(0xffffff);
  reefMat.metalness = 0.2;
  reefMat.roughness = 0.45;
  const reefColors = [["#ff6a1c", "#ff8a3a"], ["#c7d3da", "#9fb1bd"], ["#ffd34a", "#3d4a6b"], ["#ff6a1c", "#c7d3da"]];
  const groups = [[1.5, -6.2, -8.5], [12, -8.4, -9.5], [21, -10.2, -9], [29, -12, -10]].slice(0, mobile ? 3 : 4).map((home, g) => {
    const n = mobile ? 9 : 14, mesh = new THREE.InstancedMesh(fishGeometry(n, r), reefMat, n);
    const f = Array.from({ length: n }, (_, i) => {
      mesh.setColorAt(i, new THREE.Color(reefColors[g][i % 3 === 0 ? 1 : 0]));
      return { o: new THREE.Vector3((r() - 0.5) * 2.4, (r() - 0.5) * 0.9, (r() - 0.5) * 1.6), lag: r() * 0.9, ph: r() * TAU };
    });
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, home: new THREE.Vector3(...home), f, k: g * 1.7 };
  });
  const groupAt = (g, t, i, out) => {
    const f = g.f[i], tt = t - f.lag, k = g.k;
    out.set(Math.sin(tt * 0.11 + k) * 3.2 + Math.sin(tt * 0.29 + k * 2) * 0.8, Math.sin(tt * 0.17 + k * 3) * 0.6, Math.sin(tt * 0.13 + k * 4) * 1.6).add(g.home);
    const a = tt * 0.25 + f.ph;
    return out.add(sc.set(f.o.x * Math.cos(a) - f.o.z * Math.sin(a) * 0.5, f.o.y + Math.sin(tt * 1.3 + f.ph) * 0.08, f.o.z * Math.cos(a) + f.o.x * Math.sin(a) * 0.3));
  };

  const schools = [[new THREE.Vector3(14, -6, -17), 4.5], [new THREE.Vector3(31, -10.5, -21), 5.5]].map(([center, rad], k) => {
    const n = mobile ? 140 : 320, mesh = new THREE.InstancedMesh(fishGeometry(n, r), fishMaterial(time), n);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return { mesh, center, k, f: Array.from({ length: n }, () => ({ ph: r() * TAU, rr: rad * (0.6 + r() * 0.5), h: (r() - 0.5) * 2.2, w: 0.25 + r() * 0.12 })) };
  });
  const drift = new THREE.Vector3();

  const NB = mobile ? 4 : 7, birdGeo = birdGeometry(), birdPh = new Float32Array(NB);
  birdGeo.setAttribute("aPh", new THREE.InstancedBufferAttribute(birdPh, 1));
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x151216, side: THREE.DoubleSide });
  birdMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nattribute float aPh;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        float span = abs(position.z), glide = smoothstep(0.1, 0.6, sin(uTime * 0.45 + aPh * 2.0) * 0.5 + 0.5);
        float flap = sin(uTime * 7.5 + aPh) * mix(0.12, 1.0, glide);
        transformed.y += flap * 0.45 * span + sin(uTime * 7.5 + aPh - 0.7) * mix(0.05, 0.4, glide) * max(span - 0.3, 0.0) + 0.05 * span;`);
  };
  const birds = new THREE.InstancedMesh(birdGeo, birdMat, NB);
  const flight = Array.from({ length: NB }, (_, i) => {
    birdPh[i] = r() * TAU;
    const near = i < 2;
    return { c: new THREE.Vector3(near ? 10 + r() * 8 : 18 + r() * 30, near ? 5 + r() * 2 : 7 + r() * 9, near ? -34 - r() * 8 : -60 - r() * 40), R: near ? 7 + r() * 4 : 10 + r() * 16, w: (0.12 + r() * 0.08) * (r() < 0.5 ? -1 : 1), a: r() * TAU, s: near ? 1.5 : 2.2 + r() };
  });
  birds.frustumCulled = false;
  scene.add(birds);
  const birdDusk = new THREE.Color(0x151216), birdDay = new THREE.Color(0xa9b1b8);

  const sharkRoute = route([[-14, -7, -12], [10, -8, -11.5], [30, -10, -12], [46, -14, -16], [44, -14, -23], [28, -10.5, -17.5], [6, -8, -17.5], [-16, -7.5, -16]], 3);
  const shark = new THREE.Mesh(sharkGeometry(), bodyMaterial(time, 1, { color: 0x56626e, lateral: true }));
  shark.scale.setScalar(3.2);
  shark.frustumCulled = false;
  scene.add(shark);

  return {
    whale, calf, shark,
    update(t, { under, dove, schoolsOn, sky }) {
      for (const o of [whale, calf, turtle, sting, shark, ...mantas.map((m) => m.mesh), ...groups.map((g) => g.mesh)]) o.visible = under;
      birds.visible = !under && sky.night < 0.75;
      birdMat.color.lerpColors(birdDusk, birdDay, sky.day);
      if (!under) {
        flight.forEach((b, i) => {
          const a = b.a + t * b.w;
          p.set(Math.cos(a) * b.R, Math.sin(t * 0.3 + i) * 0.8, Math.sin(a) * b.R * 0.6).add(b.c);
          dir.set(-Math.sin(a) * Math.sign(b.w), 0, Math.cos(a) * 0.6 * Math.sign(b.w)).normalize();
          q.setFromUnitVectors(X, dir).multiply(bank.setFromAxisAngle(X, 0.35 * Math.sign(b.w)));
          birds.setMatrixAt(i, m4.compose(p, q, sc.setScalar(b.s)));
        });
        birds.instanceMatrix.needsUpdate = true;
        for (const s of schools) s.mesh.visible = false;
        return;
      }

      const d = 26 + Math.max(0, t - (dove ?? t)) * 2.1;
      whaleRoute.place(whale, d);
      whaleRoute.place(ghost, d - 3.2);
      side.set(0, 0, 1).applyQuaternion(ghost.quaternion);
      above.set(0, 1, 0).applyQuaternion(ghost.quaternion);
      calf.position.copy(ghost.position).addScaledVector(side, 3.3 + Math.sin(t * 0.21) * 0.7).addScaledVector(above, 1.1 + Math.sin(t * 0.33) * 0.35);
      calf.quaternion.copy(ghost.quaternion).multiply(q.setFromEuler(e.set(0, Math.sin(t * 0.21 + 1.4) * 0.12, Math.sin(t * 0.5) * 0.06)));

      for (const m of mantas) m.route.place(m.mesh, m.at + t * m.speed);
      turtleRoute.place(turtle, 12 + t * 0.85);
      sharkRoute.place(shark, 40 + t * 1.5);
      stingRoute.place(sting, t * 0.55).position.y = ground(sting.position.x, sting.position.z) + 0.5;

      for (const g of groups) {
        g.f.forEach((_, i) => {
          groupAt(g, t, i, p);
          groupAt(g, t - 0.12, i, pp);
          dir.subVectors(p, pp);
          if (dir.lengthSq() < 1e-8) dir.copy(X);
          g.mesh.setMatrixAt(i, m4.compose(p, q.setFromUnitVectors(X, dir.normalize()), sc.setScalar(2.3)));
        });
        g.mesh.instanceMatrix.needsUpdate = true;
      }

      for (const s of schools) {
        s.mesh.visible = schoolsOn;
        if (!schoolsOn) continue;
        drift.set(Math.sin(t * 0.05 + s.k * 2) * 3, Math.sin(t * 0.07 + s.k) * 0.8, Math.cos(t * 0.04 + s.k) * 2).add(s.center);
        s.f.forEach((f, i) => {
          const a = f.ph + t * f.w;
          p.set(Math.cos(a) * f.rr, f.h + Math.sin(a * 2 + f.ph) * 0.35, Math.sin(a) * f.rr * 0.55).add(drift);
          dir.set(-Math.sin(a), 0.1 * Math.cos(a * 2 + f.ph), Math.cos(a) * 0.55).normalize();
          s.mesh.setMatrixAt(i, m4.compose(p, q.setFromUnitVectors(X, dir), sc.setScalar(1.3)));
        });
        s.mesh.instanceMatrix.needsUpdate = true;
      }
    },
  };
}
