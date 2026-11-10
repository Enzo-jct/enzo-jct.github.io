import * as THREE from "three";
import { mobile, rng, paint, clamp01 } from "./kit.js";

export function buildDeep(scene, time, box) {
  const root = new THREE.Group();
  scene.add(root);
  const r = rng(21), pr = { value: 1 };

  const N = mobile ? 1200 : 3000, pos = new Float32Array(N * 3), rnd = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos.set([box.x0 + r() * (box.x1 - box.x0), box.y0 + r() * -box.y0, -7 + r() * 17], i * 3);
    rnd[i] = r();
  }
  const dot = paint(32, 32, (g) => {
    const s = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    s.addColorStop(0, "rgba(255,255,255,1)");
    s.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = s;
    g.fillRect(0, 0, 32, 32);
  });
  const drift = (rise) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: time, uMap: { value: dot }, uPR: pr, uBottom: { value: box.y0 }, uK: { value: 1 } },
    vertexShader: `
      uniform float uTime, uPR, uBottom, uK;
      attribute float aRnd;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y = uBottom + mod(p.y - uBottom + uTime * ${rise ? "(0.35 + aRnd * 0.45)" : "-(0.04 + aRnd * 0.05)"}, -uBottom);
        p.x += sin(uTime * 0.3 + aRnd * 30.0) * 0.12;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min((${rise ? "2.0 + aRnd * 3.0" : "0.8 + aRnd * 1.4"}) * uPR * (5.0 / max(-mv.z, 0.5)), 24.0);
        vA = exp(-0.003 * dot(mv.xyz, mv.xyz)) * uK * ${rise ? "0.5" : "0.6"};
      }`,
    fragmentShader: "uniform sampler2D uMap; varying float vA; void main() { gl_FragColor = vec4(vec3(0.86, 0.94, 0.96), texture2D(uMap, gl_PointCoord).a * vA); }",
  });
  const points = (p, a, m) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aRnd", new THREE.BufferAttribute(a, 1));
    const o = new THREE.Points(g, m);
    o.frustumCulled = false;
    root.add(o);
    return o;
  };
  points(pos, rnd, drift(false));

  const NB = mobile ? 120 : 260, bpos = new Float32Array(NB * 3), brnd = new Float32Array(NB);
  for (let i = 0; i < NB; i++) {
    bpos.set([-1 + r() * 10, -8 + r() * 8, -2 + r() * 11], i * 3);
    brnd[i] = r();
  }
  const bubbleMat = drift(true);
  bubbleMat.uniforms.uBottom.value = -8;
  points(bpos, brnd, bubbleMat);

  const vents = [[3, -9], [15, -11], [27, -8.5]], NV = mobile ? 30 : 60, vpos = new Float32Array(vents.length * NV * 3), vrnd = new Float32Array(vents.length * NV);
  vents.forEach(([x, z], k) => {
    for (let i = 0; i < NV; i++) {
      vpos.set([x + (r() - 0.5) * 0.3, -18 + r() * 18, z + (r() - 0.5) * 0.3], (k * NV + i) * 3);
      vrnd[k * NV + i] = r();
    }
  });
  const ventMat = drift(true);
  ventMat.uniforms.uBottom.value = -18;
  points(vpos, vrnd, ventMat);

  for (const at of box.leaks ?? []) {
    const NL = mobile ? 20 : 40, lp = new Float32Array(NL * 3), lr = new Float32Array(NL);
    for (let i = 0; i < NL; i++) {
      lp.set([at.x + (r() - 0.5) * 0.2, at.y - r() * at.y, at.z + (r() - 0.5) * 0.2], i * 3);
      lr[i] = r();
    }
    const leakMat = drift(true);
    leakMat.uniforms.uBottom.value = at.y;
    points(lp, lr, leakMat);
  }

  return {
    update(under, depth, pixelRatio) {
      root.visible = under;
      pr.value = pixelRatio;
      bubbleMat.uniforms.uK.value = clamp01(1 - depth * 4);
    },
  };
}
