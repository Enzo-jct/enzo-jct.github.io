import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mobile, TAU, clamp01, ease, rng } from "./kit.js";

export const FISH = mobile ? 900 : 2400;
const X = new THREE.Vector3(1, 0, 0);

export function fishGeometry(n, r) {
  const body = new THREE.SphereGeometry(1, 10, 6).scale(0.06, 0.017, 0.008).toNonIndexed();
  body.deleteAttribute("uv");
  const tail = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.05, 0, 0), new THREE.Vector3(-0.085, 0.022, 0), new THREE.Vector3(-0.078, 0, 0),
    new THREE.Vector3(-0.05, 0, 0), new THREE.Vector3(-0.078, 0, 0), new THREE.Vector3(-0.085, -0.022, 0),
  ]);
  tail.computeVertexNormals();
  const geo = mergeGeometries([body, tail]);
  geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(Float32Array.from({ length: n }, () => r() * TAU), 1));
  return geo;
}
export function fishMaterial(time) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xb4c2cb, metalness: 0.55, roughness: 0.32, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nattribute float aPhase;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.z += sin(uTime * 13.0 + aPhase - transformed.x * 42.0) * 0.011 * smoothstep(0.03, -0.09, transformed.x);");
  };
  return mat;
}

function wordPoints(words, n, width, r) {
  const W = 1400, H = 170 * words.length, c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  words.forEach((w, i) => {
    g.font = "800 150px Archivo";
    g.font = `800 ${Math.min(150, (150 * W * 0.94) / g.measureText(w).width)}px Archivo`;
    g.fillText(w, W / 2, 170 * (i + 0.5));
  });
  const d = g.getImageData(0, 0, W, H).data, px = [];
  for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) if (d[(y * W + x) * 4 + 3] > 128) px.push([x, y]);
  for (let i = px.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [px[i], px[j]] = [px[j], px[i]];
  }
  const k = width / W;
  return Array.from({ length: n }, (_, i) => {
    const [x, y] = px[i % Math.max(px.length, 1)] ?? [W / 2, H / 2];
    return new THREE.Vector3((x - W / 2) * k, -(y - H / 2) * k, (r() - 0.5) * 0.12);
  });
}

export function buildFish(scene, origin, time, words, hand) {
  const r = rng(9), N = FISH;
  const fish = new THREE.InstancedMesh(fishGeometry(N, r), fishMaterial(time), N);
  fish.frustumCulled = false;
  const lamp = new THREE.PointLight(0xcfe9ef, 0, 12, 2);
  lamp.position.set(1.5, 3, 5);
  const root = new THREE.Group();
  root.position.copy(origin);
  root.add(fish, lamp);
  scene.add(root);

  const targets = wordPoints(words.map((w) => w.toUpperCase()), N, 5.6, r);
  const swim = Array.from({ length: N }, () => ({
    rad: 1.2 + r() * 1.7, h: (r() - 0.5) * 2.4, w: 0.35 + r() * 0.3, ph: r() * TAU, lag: r(),
    spread: new THREE.Vector3((r() - 0.5) * 2, (r() - 0.5) * 1.2, (r() - 0.5) * 2),
  }));
  const center = new THREE.Vector3(1.9, 0, -0.6), textAt = new THREE.Vector3(1.9, 0.15, 0);
  const handAt = hand.map((h) => h.clone().sub(origin));
  const travel = handAt.reduce((a, h) => a.add(h), new THREE.Vector3()).divideScalar(N).sub(textAt).normalize();
  const up = new THREE.Vector3(0.12, 1, 0).normalize();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), dir = new THREE.Vector3(), tgt = new THREE.Vector3();
  let reach = 0, last = 0;
  const off = new Float32Array(N * 3), spd = new Float32Array(N * 3), R = 0.55, PUSH = 0.42;
  const spring = (j, goal, dt) => {
    spd[j] += ((goal - off[j]) * 60 - spd[j] * 11) * dt;
    return (off[j] += spd[j] * dt);
  };

  const F = {
    count: N,
    stir: 0,
    update(t, visible, form, dive, hover, cursor) {
      const dt = Math.min(Math.max(t - last, 0), 0.05);
      last = t;
      fish.visible = visible;
      lamp.intensity = visible ? 40 * (1 - dive) : 0;
      if (!visible) return;
      let stir = 0;
      reach += ((hover ? 1 : 0) - reach) * 0.05;
      const lift = Math.sin(t * 0.5) * 0.06 + reach * 0.25;
      swim.forEach((f, i) => {
        const a = f.ph + t * f.w, k = ease(clamp01(form * 1.6 - f.lag * 0.6));
        p.set(Math.cos(a) * f.rad, f.h + Math.sin(a * 3 + f.ph) * 0.25, Math.sin(a) * f.rad).add(center);
        dir.set(-Math.sin(a), 0.05 * Math.cos(a * 3 + f.ph), Math.cos(a));
        tgt.copy(targets[i]).add(textAt);
        tgt.x += Math.sin(t * 2 + f.ph) * 0.012;
        tgt.y += Math.cos(t * 1.7 + f.ph) * 0.01;
        p.lerp(tgt, k);
        dir.lerp(X, k).normalize();
        let size = 1 - k * 0.4;
        const kh = ease(clamp01(dive * 1.5 - f.lag * 0.5));
        if (kh > 0) {
          tgt.copy(handAt[i]);
          tgt.x += Math.sin(t * 1.3 + f.ph) * 0.012;
          tgt.y += Math.cos(t * 1.1 + f.ph) * 0.012 + lift;
          p.lerp(tgt, kh).addScaledVector(f.spread, Math.sin(Math.PI * kh) * 1.2);
          dir.lerp(travel, Math.min(1, kh * 3)).lerp(up, ease(clamp01(kh * 2 - 1))).normalize();
          size += (0.7 - size) * kh;
        }
        let tx = 0, ty = 0, tz = 0;
        if (cursor) {
          const dx = p.x - cursor.x, dy = p.y - cursor.y, r = Math.hypot(dx, dy);
          if (r < R) {
            const k = ((1 - r / R) ** 2 * PUSH * (1 - dive)) / (r + 1e-3);
            tx = (dx + dy * 0.6) * k;
            ty = (dy - dx * 0.6) * k;
            tz = (1 - r / R) * 0.3 * (1 - dive);
          }
        }
        const j = i * 3;
        p.x += spring(j, tx, dt);
        p.y += spring(j + 1, ty, dt);
        p.z += spring(j + 2, tz, dt);
        dir.x += spd[j] * 0.2;
        dir.y += spd[j + 1] * 0.2;
        stir += Math.abs(spd[j]) + Math.abs(spd[j + 1]);
        fish.setMatrixAt(i, m4.compose(p, q.setFromUnitVectors(X, dir.normalize()), sc.setScalar(size)));
      });
      fish.instanceMatrix.needsUpdate = true;
      F.stir = clamp01((stir / N) * 6);
    },
  };
  return F;
}
