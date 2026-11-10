import * as THREE from "three";

export const mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
export const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const TAU = Math.PI * 2;
export const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
export const ease = (f) => f * f * (3 - 2 * f);
export const lerp = (a, b, t) => a + (b - a) * t;
export const range = (x, a, b) => ease(clamp01((x - a) / (b - a)));
export const pad = (n, l = 2) => String(n).padStart(l, "0");
export const tc = (sec) => {
  const f = Math.max(0, Math.floor(sec * 24));
  return `${pad(Math.floor(f / 86400))}:${pad(Math.floor(f / 1440) % 60)}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`;
};
export function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function paint(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
export function drawCover(g, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
export const cover = (a, frame = 16 / 9) => {
  const sx = Math.min(frame / a, 1), sy = Math.min(a / frame, 1);
  return new THREE.Vector4(sx, sy, (1 - sx) / 2, (1 - sy) / 2);
};
export function screenMaterial(map, time, aspect = 16 / 9) {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uMap: { value: map }, uCover: { value: cover(aspect) }, uOpacity: { value: 1 }, uFlash: { value: 0 },
      uGuides: { value: 0 }, uEdge: { value: 1 }, uTime: time,
    },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec4 uCover;
      uniform float uOpacity, uFlash, uGuides, uEdge, uTime;
      varying vec2 vUv;
      float box(vec2 uv, float s) {
        vec2 q = abs(uv - 0.5) / (0.5 * s);
        float m = max(q.x, q.y);
        return 1.0 - smoothstep(0.0, fwidth(m) * 1.5, abs(m - 1.0));
      }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec3 col = texture2D(uMap, vUv * uCover.xy + uCover.zw).rgb;
        col += (hash(floor(vUv * 700.0) + fract(uTime * 7.0)) - 0.5) * 0.05;
        col = mix(col, vec3(1.0), uFlash);
        col = mix(col, vec3(0.86), box(vUv, 1.0) * uEdge * 0.8);
        col = mix(col, vec3(1.0), (box(vUv, 0.9) + box(vUv, 0.8)) * uGuides * 0.12);
        gl_FragColor = vec4(col, uOpacity);
      }`,
  });
}

export function tint(g, hex) {
  g = g.index ? g.toNonIndexed() : g;
  g.deleteAttribute("uv");
  const c = new THREE.Color(hex), n = g.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(col, i * 3);
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}
export const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

export function cable(radius) {
  const u = { uP0: { value: new THREE.Vector3() }, uP1: { value: new THREE.Vector3() }, uP2: { value: new THREE.Vector3() }, uP3: { value: new THREE.Vector3() }, uR: { value: radius } };
  const mat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.6 });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        uniform vec3 uP0, uP1, uP2, uP3;
        uniform float uR;`)
      .replace("#include <beginnormal_vertex>", `
        float ct = position.y + 0.5, cs = 1.0 - ct;
        vec3 T = normalize(3.0 * cs * cs * (uP1 - uP0) + 6.0 * cs * ct * (uP2 - uP1) + 3.0 * ct * ct * (uP3 - uP2) + 1e-5);
        vec3 Nn = normalize(cross(T, abs(T.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0))), Bn = cross(T, Nn);
        vec3 objectNormal = Nn * normal.x + Bn * normal.z;`)
      .replace("#include <begin_vertex>", "vec3 transformed = cs * cs * cs * uP0 + 3.0 * cs * cs * ct * uP1 + 3.0 * cs * ct * ct * uP2 + ct * ct * ct * uP3 + (Nn * position.x + Bn * position.z) * uR;");
  };
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8, 40, true), mat);
  mesh.frustumCulled = false;
  return { mesh, u };
}
