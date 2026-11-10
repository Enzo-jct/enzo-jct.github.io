import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { mobile, TAU, clamp01, rng, paint } from "./kit.js";

const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const hash = (x, z) => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), u = x - xi, v = z - zi, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
  return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
}
const fbm = (x, z, o = 5) => {
  let s = 0, a = 0.5;
  for (let i = 0; i < o; i++, a *= 0.5) {
    s += a * noise(x, z);
    x = x * 2.03 + 17.1;
    z = z * 2.03 - 9.4;
  }
  return s;
};

function sandNormals(size = 256) {
  const h = new Float32Array(size * size), data = new Uint8Array(size * size * 4), at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      h[y * size + x] = Math.sin(TAU * (u * 5 + 0.3 * Math.sin(TAU * v * 2) + 0.12 * Math.sin(TAU * (u * 3 + v * 2)))) * 0.7 + Math.sin(TAU * (u * 9 + v * 4)) * 0.2 + Math.sin(TAU * (u * 2 - v * 7)) * 0.1;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = -(at(x + 1, y) - at(x - 1, y)) * 2.5, ny = -(at(x, y + 1) - at(x, y - 1)) * 2.5, l = Math.hypot(nx, ny, 1);
      data.set([(nx / l) * 127.5 + 127.5, (ny / l) * 127.5 + 127.5, (1 / l) * 127.5 + 127.5, 255], (y * size + x) * 4);
    }
  }
  const t = new THREE.DataTexture(data, size, size);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

function fanTexture(r) {
  return paint(640, 512, (g, W, H) => {
    const tips = [];
    g.strokeStyle = "#fff";
    g.lineCap = "round";
    (function branch(x, y, a, len, w, depth) {
      const x1 = x + Math.sin(a) * len, y1 = y - Math.cos(a) * len;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x1, y1);
      g.stroke();
      if (depth < 4) tips.push([x1, y1]);
      if (depth === 0) return;
      const base = depth > 6, n = base ? 3 : 2 + (r() < 0.45);
      for (let k = 0; k < n; k++) branch(x1, y1, a + (k - (n - 1) / 2) * (base ? 0.38 + r() * 0.12 : 0.2 + r() * 0.15) + (r() - 0.5) * 0.14, len * (base ? 1.05 : 0.84 + r() * 0.08), Math.max(w * 0.72, 1.4), depth - 1);
    })(W / 2, H, 0, H * 0.09, 9, 8);
    g.lineWidth = 1;
    g.globalAlpha = 0.7;
    for (let i = 2; i < tips.length; i++) {
      for (const [u, v] of [tips[i - 1], tips[i - 2]]) {
        const [x, y] = tips[i];
        if ((u - x) ** 2 + (v - y) ** 2 > 1100) continue;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(u, v);
        g.stroke();
      }
    }
  });
}

export function rockGeometry(seed) {
  const ico = new THREE.IcosahedronGeometry(1, 3);
  ico.deleteAttribute("uv");
  ico.deleteAttribute("normal");
  const g = mergeVertices(ico), p = g.attributes.position, v = new THREE.Vector3(), o = seed * 13.7;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(0.7 + fbm(v.x * 1.4 + o, v.z * 1.4 + v.y * 0.9 - o, 4) * 0.7);
    p.setXYZ(i, v.x, v.y * 0.72, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function starGeometry() {
  const S = 60, R = 3, pos = [0, 0.16, 0], idx = [];
  for (let k = 1; k <= R; k++) {
    for (let i = 0; i < S; i++) {
      const a = (i / S) * TAU, arm = 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(5 * a)) ** 1.6, rr = (k / R) * arm;
      pos.push(Math.cos(a) * rr, 0.16 * (1 - (k / R) ** 2) * (0.4 + 0.6 * arm), Math.sin(a) * rr);
    }
  }
  for (let i = 0; i < S; i++) idx.push(0, 1 + ((i + 1) % S), 1 + i);
  for (let k = 0; k < R - 1; k++) {
    for (let i = 0; i < S; i++) {
      const a = 1 + k * S + i, b = 1 + k * S + ((i + 1) % S);
      idx.push(a, b, b + S, a, b + S, a + S);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function urchinGeometry(r) {
  const parts = [new THREE.IcosahedronGeometry(0.5, 2)], v = new THREE.Vector3(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 70; i++) {
    v.set(r() * 2 - 1, r() * 1.2 - 0.2, r() * 2 - 1).normalize();
    const len = 0.7 + r() * 0.5;
    parts.push(new THREE.ConeGeometry(0.03, len, 4).translate(0, 0.45 + len / 2, 0).applyQuaternion(q.setFromUnitVectors(Y, v)).toNonIndexed());
  }
  parts.forEach((g) => g.deleteAttribute("uv"));
  return mergeGeometries(parts);
}

export function buildSeabed(scene, time, { cliff, abyss }) {
  const r = rng(31), root = new THREE.Group();
  scene.add(root);
  const edgeAt = (z) => cliff + 4 * Math.sin(z * 0.08) + 2.5 * Math.sin(z * 0.21 + 1.3);
  const height = (x, z) => {
    const k = smooth(edgeAt(z) - 5, edgeAt(z) + 6, x);
    const shelf = -9.8 - 0.2 * x + (fbm(x * 0.05, z * 0.05) - 0.5) * 3.2;
    const deep = abyss + (fbm(x * 0.04 + 7, z * 0.04) - 0.5) * 5;
    return shelf + (deep - shelf) * k + (fbm(x * 0.18 + 3, z * 0.18) - 0.5) * 16 * k * (1 - k);
  };

  const W = 130, D = 125, seg = mobile ? [130, 125] : [260, 250];
  const geo = new THREE.PlaneGeometry(W, D, ...seg).rotateX(-Math.PI / 2).translate(35, 0, -37);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const nor = geo.attributes.normal, colors = new Float32Array(pos.count * 3), c = new THREE.Color();
  const sand = new THREE.Color("#cdb994"), sand2 = new THREE.Color("#9c8a66"), rock = new THREE.Color("#4a4640"), silt = new THREE.Color("#2e2c2a");
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    c.copy(sand).lerp(sand2, smooth(0.35, 0.72, fbm(x * 0.12, z * 0.12, 3)));
    c.lerp(rock, smooth(0.9, 0.62, nor.getY(i))).lerp(silt, smooth(abyss + 9, abyss + 2, y) * 0.7);
    c.toArray(colors, i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const ripples = sandNormals();
  ripples.repeat.set(W / 2, D / 2);
  const floor = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, normalMap: ripples, normalScale: new THREE.Vector2(0.55, 0.55) }));
  root.add(floor);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), at = new THREE.Vector3();
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5b554c, roughness: 0.92 });
  const spots = [];
  for (let i = 0; i < (mobile ? 50 : 110); i++) spots.push([-15 + r() * 55, -55 + r() * 57, 0.4 + r() * 1.4]);
  for (let i = 0; i < (mobile ? 12 : 26); i++) {
    const z = -40 + r() * 40;
    spots.push([edgeAt(z) - 3 + r() * 6, z, 1.4 + r() * 2.2]);
  }
  for (let i = 0; i < (mobile ? 20 : 45); i++) spots.push([cliff + 6 + r() * 40, -42 + r() * 40, 0.8 + r() * 2.4]);
  for (let k = 0; k < 3; k++) {
    const mine = spots.filter((_, i) => i % 3 === k), rocks = new THREE.InstancedMesh(rockGeometry(k + 1), rockMat, mine.length);
    mine.forEach(([x, z, s], i) => {
      at.set(x, height(x, z) - s * 0.25, z);
      q.setFromEuler(e.set((r() - 0.5) * 0.4, r() * TAU, (r() - 0.5) * 0.4));
      rocks.setMatrixAt(i, m4.compose(at, q, sc.set(s * (0.8 + r() * 0.6), s * (0.6 + r() * 0.5), s * (0.8 + r() * 0.6))));
      rocks.setColorAt(i, c.setScalar(0.65 + r() * 0.45));
    });
    root.add(rocks);
  }

  const kelpGeo = new THREE.PlaneGeometry(0.42, 1, 1, 22).translate(0, 0.5, 0);
  const NK = mobile ? 110 : 260, ph = new Float32Array(NK);
  kelpGeo.setAttribute("aPh", new THREE.InstancedBufferAttribute(ph, 1));
  const kelpMat = new THREE.MeshStandardMaterial({ color: 0x5e6b2e, roughness: 0.7, side: THREE.DoubleSide });
  kelpMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nattribute float aPh;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        float h = transformed.y;
        transformed.x *= 0.55 + 0.45 * abs(sin(h * 23.0 + aPh));
        transformed.x += (sin(uTime * 0.6 + aPh + h * 2.6) * 0.9 + sin(uTime * 1.4 + aPh * 2.0 + h * 6.0) * 0.18) * h * h;
        transformed.z += cos(uTime * 0.5 + aPh * 1.3 + h * 2.1) * 0.6 * h * h;`);
  };
  const kelp = new THREE.InstancedMesh(kelpGeo, kelpMat, NK);
  const clumps = Array.from({ length: mobile ? 8 : 14 }, () => [-12 + r() * 50, -44 + r() * 36]);
  let n = 0;
  for (let i = 0; n < NK && i < NK * 3; i++) {
    const [cx, cz] = clumps[i % clumps.length];
    const x = cx + (r() + r() + r() - 1.5) * 4, z = cz + (r() + r() + r() - 1.5) * 3.4;
    const y = height(x, z), H = Math.min(4 + r() * 7 + (-z - 6) * 0.06, -3 - y);
    if (z > -6 || x > edgeAt(z) - 6 || H < 2.5 || (z > -19 && z < -10 && x < 32)) continue;
    ph[n] = r() * TAU;
    kelp.setMatrixAt(n++, m4.compose(at.set(x, y - 0.2, z), q.setFromEuler(e.set(0, r() * TAU, 0)), sc.set(0.8 + r() * 0.6, H, 1)));
  }
  kelp.count = n;
  kelp.frustumCulled = false;
  root.add(kelp);

  const fanGeo = new THREE.PlaneGeometry(1.3, 1, 4, 6).translate(0, 0.5, 0), NF = mobile ? 26 : 60, fanPh = new Float32Array(NF);
  fanGeo.setAttribute("aPh", new THREE.InstancedBufferAttribute(fanPh, 1));
  const fanMat = new THREE.MeshStandardMaterial({ map: fanTexture(r), alphaTest: 0.35, alphaToCoverage: !mobile, roughness: 0.85, side: THREE.DoubleSide });
  fanMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nattribute float aPh;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nfloat hh = transformed.y * transformed.y;\ntransformed.x += sin(uTime * 0.8 + aPh + transformed.y * 1.5) * 0.06 * hh;\ntransformed.z += cos(uTime * 0.6 + aPh) * 0.05 * hh;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * 0.22;");
  };
  const fans = new THREE.InstancedMesh(fanGeo, fanMat, NF), Y = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3(), yaw = new THREE.Quaternion();
  const fanCols = ["#e2524f", "#f0803a", "#b06ad8", "#f2c14e", "#e0607a"].map((h) => new THREE.Color(h));
  let nf = 0;
  for (let i = 0; nf < NF && i < NF * 4; i++) {
    const wall = r() < 0.45, z = -8 - r() * 32, x = wall ? edgeAt(z) - 1 + r() * 7 : -10 + r() * 38;
    if (!wall && x > edgeAt(z) - 4) continue;
    const y = height(x, z);
    nrm.set(height(x - 0.3, z) - height(x + 0.3, z), 0.6, height(x, z - 0.3) - height(x, z + 0.3)).normalize().add(sc.set(0, 0.8, 0)).normalize();
    q.setFromUnitVectors(Y, nrm).multiply(yaw.setFromAxisAngle(Y, (r() - 0.5) * 1.2));
    fans.setMatrixAt(nf, m4.compose(at.set(x, y - 0.05, z), q, sc.setScalar(0.8 + r() * 1.3)));
    fans.setColorAt(nf, fanCols[Math.floor(r() * fanCols.length)]);
    fanPh[nf++] = r() * TAU;
  }
  fans.count = nf;
  fans.frustumCulled = false;
  root.add(fans);

  const lay = (geo, n, colors, size, mat) => {
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    for (let i = 0; i < n; i++) {
      const x = -6 + r() * 40, z = -16 + r() * 9, y = height(x, z);
      nrm.set(height(x - 0.3, z) - height(x + 0.3, z), 0.6, height(x, z - 0.3) - height(x, z + 0.3)).normalize();
      q.setFromUnitVectors(Y, nrm).multiply(yaw.setFromAxisAngle(Y, r() * TAU));
      mesh.setMatrixAt(i, m4.compose(at.set(x, y - 0.02, z), q, sc.setScalar(size * (0.7 + r() * 0.6))));
      mesh.setColorAt(i, c.set(colors[Math.floor(r() * colors.length)]).multiplyScalar(0.8 + r() * 0.4));
    }
    root.add(mesh);
  };
  lay(starGeometry(), mobile ? 18 : 40, ["#d9622b", "#c2402f", "#e08a3c", "#8d3f8f", "#d4a24a"], 0.24, new THREE.MeshStandardMaterial({ roughness: 0.8 }));
  lay(urchinGeometry(r), mobile ? 12 : 26, ["#2a1830", "#3a1d2c", "#1d1a2e"], 0.17, new THREE.MeshStandardMaterial({ roughness: 0.6 }));

  return { height };
}
