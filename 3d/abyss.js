import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mobile, TAU, rng } from "./kit.js";

const X = new THREE.Vector3(1, 0, 0);
const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };

export function buildAbyss(scene, time, { CO }) {
  const r = rng(43), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
  const K = { value: 0 };

  const bell = new THREE.SphereGeometry(1, 28, 12, 0, TAU, 0, Math.PI * 0.5).scale(1, 0.72, 1);
  const strands = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * TAU, len = 1.8 + (i % 3) * 0.7;
    return new THREE.PlaneGeometry(0.035, len, 1, 12).rotateY(-a).translate(Math.cos(a) * 0.75, -len / 2, Math.sin(a) * 0.75);
  });
  bell.deleteAttribute("uv");
  strands.forEach((g) => g.deleteAttribute("uv"));
  const jellyGeo = mergeGeometries([bell.toNonIndexed(), ...strands.map((g) => g.toNonIndexed())]);
  const JN = mobile ? 4 : 7, jellyPh = new Float32Array(JN);
  jellyGeo.setAttribute("aPh", new THREE.InstancedBufferAttribute(jellyPh, 1));
  const jellies = new THREE.InstancedMesh(jellyGeo, new THREE.ShaderMaterial({
    ...additive, side: THREE.DoubleSide,
    uniforms: { uTime: time, uK: K },
    vertexShader: `
      uniform float uTime;
      attribute float aPh;
      varying vec3 vN, vV;
      varying float vY;
      void main() {
        float pulse = pow(0.5 + 0.5 * sin(uTime * 1.6 + aPh), 3.0);
        vec3 p = position;
        if (p.y >= 0.0) { p.xz *= 1.0 - 0.16 * pulse * (1.0 - p.y); p.y *= 1.0 + 0.1 * pulse; }
        else p.x += sin(uTime * 1.3 + aPh + p.y * 2.0) * 0.14 * -p.y;
        vY = position.y;
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uK;
      varying vec3 vN, vV;
      varying float vY;
      void main() {
        float a = vY >= 0.0 ? pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5) * 0.9 + 0.08 : 0.25 * exp(vY * 0.7);
        gl_FragColor = vec4(vec3(0.42, 0.62, 1.0) * a * uK, 1.0);
      }`,
  }), JN);
  jellies.frustumCulled = false;
  const jellySpots = [[-6.7, 6.9, -8, 0.8], [-4.7, 11.8, -10.7, 1], [-6.2, 2.5, -5.5, 0.7], [-2.4, 15.9, -13.2, 1.1], [-9.5, 9.5, -17.6, 0.9], [1.5, 19.4, -15.8, 1.2], [-12, 5, -20, 0.6]]
    .slice(0, JN).map(([x, y, z, s], i) => ((jellyPh[i] = r() * TAU), { at: new THREE.Vector3(x, y, z).add(CO), s }));
  scene.add(jellies);

  const combGeo = new THREE.SphereGeometry(1, 40, 24).scale(0.5, 0.9, 0.5);
  const combSpots = [[-1.8, 0.6, 2.7, 0.38], [5.2, 7.8, -5.6, 1]].slice(0, mobile ? 1 : 2);
  const combPh = Float32Array.from(combSpots, () => r() * TAU);
  combGeo.setAttribute("aPh", new THREE.InstancedBufferAttribute(combPh, 1));
  const combs = new THREE.InstancedMesh(combGeo, new THREE.ShaderMaterial({
    ...additive, side: THREE.DoubleSide,
    uniforms: { uTime: time, uK: K },
    vertexShader: `
      uniform float uTime;
      attribute float aPh;
      varying vec3 vP, vN, vV;
      varying float vPh;
      void main() {
        vec3 p = position;
        p.xz *= 1.0 + 0.04 * sin(uTime * 1.1 + aPh + p.y * 3.0);
        vP = position;
        vPh = aPh;
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uTime, uK;
      varying vec3 vP, vN, vV;
      varying float vPh;
      void main() {
        float phi = atan(vP.z, vP.x), y = vP.y / 0.9;
        float row = smoothstep(0.075, 0.02, abs(fract(phi / 6.2831853 * 8.0) - 0.5)) * smoothstep(0.92, 0.55, abs(y));
        float beat = pow(0.5 + 0.5 * sin(y * 30.0 - uTime * 6.0 + vPh), 5.0);
        vec3 rainbow = 0.5 + 0.5 * cos(6.2831853 * (y * 0.8 - uTime * 0.35 + phi * 0.16 + vPh + vec3(0.0, 0.33, 0.67)));
        float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0);
        gl_FragColor = vec4((rainbow * row * (0.15 + beat) * 0.4 + vec3(0.3, 0.5, 0.75) * rim * 0.16) * uK, 1.0);
      }`,
  }), combSpots.length);
  combs.frustumCulled = false;
  scene.add(combs);

  const NP = mobile ? 220 : 520, pp = new Float32Array(NP * 3), pr = new Float32Array(NP);
  for (let i = 0; i < NP; i++) {
    pp.set([CO.x - 14 + r() * 28, CO.y - 6 + r() * 16, -18 + r() * 24], i * 3);
    pr[i] = r();
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  pg.setAttribute("aRnd", new THREE.BufferAttribute(pr, 1));
  const plankton = new THREE.Points(pg, new THREE.ShaderMaterial({
    ...additive,
    uniforms: { uTime: time, uK: K },
    vertexShader: `
      uniform float uTime, uK;
      attribute float aRnd;
      varying float vA;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.2 + aRnd * 40.0), sin(uTime * 0.15 + aRnd * 30.0), 0.0) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = 2.2 * (6.0 / max(-mv.z, 1.0));
        vA = pow(max(0.5 + 0.5 * sin(uTime * (0.4 + aRnd * 0.9) + aRnd * 50.0), 0.0), 8.0) * uK;
      }`,
    fragmentShader: "varying float vA; void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.35, 0.8, 0.95) * vA * (1.0 - smoothstep(0.0, 0.5, d)), 1.0); }",
  }));
  plankton.frustumCulled = false;
  scene.add(plankton);

  const NS = mobile ? 260 : 600, sp = new Float32Array(NS * 3), sr = new Float32Array(NS);
  for (let i = 0; i < NS; i++) {
    sp.set([r() * 14, r() * 14, r() * 14], i * 3);
    sr[i] = r();
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sg.setAttribute("aRnd", new THREE.BufferAttribute(sr, 1));
  const sparkU = { uTime: time, uCam: { value: new THREE.Vector3() }, uStir: { value: 0 }, uPR: { value: 1 } };
  const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({
    ...additive,
    uniforms: sparkU,
    vertexShader: `
      uniform float uTime, uStir, uPR;
      uniform vec3 uCam;
      attribute float aRnd;
      varying float vA;
      void main() {
        vec3 p = uCam + mod(position - uCam, 14.0) - 7.0;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min((1.4 + aRnd * 2.0) * uPR * (4.0 / max(-mv.z, 0.6)), 12.0);
        float flash = pow(1.0 - fract(uTime * (0.4 + aRnd * 0.7) + aRnd * 13.0), 10.0);
        vA = flash * uStir * smoothstep(6.5, 2.0, length(p - uCam));
      }`,
    fragmentShader: "varying float vA; void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.3, 0.95, 0.85) * vA * (1.0 - smoothstep(0.1, 0.5, d)), 1.0); }",
  }));
  sparks.frustumCulled = false;
  scene.add(sparks);

  const NC = mobile ? 70 : 140, ct = Float32Array.from({ length: NC }, (_, i) => i / (NC - 1));
  const cg = new THREE.BufferGeometry();
  cg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NC * 3), 3));
  cg.setAttribute("aT", new THREE.BufferAttribute(ct, 1));
  const chain = new THREE.Points(cg, new THREE.ShaderMaterial({
    ...additive,
    uniforms: { uTime: time, uK: K, uHead: { value: new THREE.Vector3(-3.5, 10.5, -11).add(CO) } },
    vertexShader: `
      uniform float uTime, uK;
      uniform vec3 uHead;
      attribute float aT;
      varying float vA;
      void main() {
        float s = aT, t = uTime;
        vec3 p = uHead + vec3(sin(t * 0.07) * 1.5 - s * 7.0, sin(t * 0.05) * 0.8 - s * 3.0 + sin(t * 0.3 - s * 7.0) * 1.1 * s, sin(t * 0.25 - s * 6.0) * 1.0 * s);
        p.y += (mod(floor(s * ${NC - 1}.0 + 0.5), 2.0) - 0.5) * 0.07;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float pulse = pow(0.5 + 0.5 * sin(s * 22.0 - t * 1.8), 6.0);
        gl_PointSize = (s < 0.02 ? 24.0 : 9.0 + 8.0 * pulse) * (6.0 / max(-mv.z, 1.0));
        vA = (0.18 + 0.82 * pulse) * uK * (s < 0.02 ? 1.4 : 1.0 - 0.5 * s);
      }`,
    fragmentShader: "varying float vA; void main() { float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(0.5, 0.55, 1.0) * vA * (1.0 - smoothstep(0.1, 0.5, d)), 1.0); }",
  }));
  chain.frustumCulled = false;
  scene.add(chain);

  const objects = [jellies, combs, plankton, chain];
  return {
    update(t, k, stir, cam, pixelRatio) {
      K.value = k;
      sparkU.uCam.value.copy(cam);
      sparkU.uStir.value = stir;
      sparkU.uPR.value = pixelRatio;
      sparks.visible = stir > 0.002;
      for (const o of objects) o.visible = k > 0.001;
      if (k <= 0.001) return;
      jellySpots.forEach((j, i) => {
        p.copy(j.at).y += Math.sin(t * 0.25 + i * 1.7) * 0.6;
        q.setFromAxisAngle(X, Math.sin(t * 0.4 + i) * 0.15);
        jellies.setMatrixAt(i, m4.compose(p, q, sc.setScalar(j.s)));
      });
      jellies.instanceMatrix.needsUpdate = true;
      combSpots.forEach(([x, y, z, s], i) => {
        p.set(x + Math.sin(t * 0.13 + i) * 0.3, y + Math.sin(t * 0.21 + i * 2) * 0.35, z).add(CO);
        q.setFromEuler(e.set(Math.sin(t * 0.3 + i) * 0.25, t * 0.15 + i, Math.cos(t * 0.27 + i) * 0.2));
        combs.setMatrixAt(i, m4.compose(p, q, sc.setScalar(s)));
      });
      combs.instanceMatrix.needsUpdate = true;
    },
  };
}
