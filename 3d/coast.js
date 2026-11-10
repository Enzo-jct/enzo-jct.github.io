import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mobile, TAU, paint, tint, lathe } from "./kit.js";
import { rockGeometry } from "./seabed.js";
import { bodyMaterial } from "./life.js";

const UP = new THREE.Vector3(0, 1, 0), LAMP = new THREE.Color("#ffe2b0");
const at = (desk, mob) => (mobile ? mob : desk);
const ISLE = new THREE.Vector3(...at([-62, 0, -284], [-30, 0, -284]));
const BUOY = at([26, -78], [11, -80]);
const hash = (k) => {
  const s = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function triangle(a, b, c) {
  const g = new THREE.BufferGeometry().setFromPoints([a, b, c].map(([x, y]) => new THREE.Vector3(x, y, 0)));
  g.computeVertexNormals();
  return g;
}
const fin = (pts) => {
  const sh = new THREE.Shape();
  sh.moveTo(...pts[0]);
  for (let i = 1; i < pts.length; i += 2) sh.quadraticCurveTo(...pts[i], ...pts[i + 1]);
  return new THREE.ShapeGeometry(sh, 6);
};

const glowMap = paint(64, 64, (g) => {
  const s = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  s.addColorStop(0, "rgba(255,255,255,1)");
  s.addColorStop(0.12, "rgba(255,255,255,0.5)");
  s.addColorStop(0.4, "rgba(255,255,255,0.08)");
  s.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = s;
  g.fillRect(0, 0, 64, 64);
});
const glow = (color, size) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  s.scale.setScalar(size);
  return s;
};

function lighthouseGeometry() {
  const white = "#ecebe4", red = "#a8302a", dark = "#26262a";
  return mergeGeometries([
    tint(lathe([[0.01, -3], [4.8, -3], [4.6, 2.4], [3.3, 2.6]]), "#8b857b"),
    tint(lathe([[3.3, 2.6], [3.18, 7], [2.95, 13], [2.72, 19], [2.6, 21.2]]), white),
    tint(lathe([[2.6, 21.2], [2.56, 22.4], [3.7, 22.75], [3.7, 23.15], [2.1, 23.15], [2.1, 24], [1.95, 24.05]]), red),
    tint(new THREE.CylinderGeometry(3.6, 3.6, 0.9, 40, 1, true).translate(0, 23.6, 0), dark),
    tint(new THREE.SphereGeometry(2.05, 28, 8, 0, TAU, 0, Math.PI / 2).scale(1, 0.8, 1).translate(0, 26.55, 0), dark),
    tint(new THREE.SphereGeometry(0.32, 10, 6).translate(0, 28.4, 0), dark),
    tint(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 5).translate(0, 29.3, 0), dark),
    tint(new THREE.PlaneGeometry(1.3, 2.1).translate(0, 3.65, 3.31), dark),
    tint(new THREE.BoxGeometry(7.2, 6.2, 4.8).translate(7.6, 0.1, 1.4), white),
    tint(new THREE.CylinderGeometry(2.9, 2.9, 7.6, 3).rotateX(-Math.PI / 2).rotateY(Math.PI / 2).scale(1, 0.62, 1).translate(7.6, 4.1, 1.4), "#4b4f57"),
  ]);
}
function windowsGeometry() {
  const w = (x, y, z, wi, he, lit) => tint(new THREE.PlaneGeometry(wi, he).translate(x, y, z), lit ? "#ffffff" : "#1e1e1e");
  return mergeGeometries([w(0, 8, 3.16, 0.7, 1.1, 0), w(0, 13.5, 2.95, 0.7, 1.1, 1), w(0, 18.5, 2.76, 0.7, 1.1, 0), w(5.6, 1.6, 3.82, 0.9, 1.1, 1), w(7.6, 1.6, 3.82, 0.9, 1.1, 1), w(9.6, 1.6, 3.82, 0.9, 1.1, 0)]);
}

function buoyGeometry() {
  const red = "#b8241d";
  return mergeGeometries([
    tint(new THREE.CylinderGeometry(1, 0.85, 1.5, 20).translate(0, -0.15, 0), red),
    tint(new THREE.CylinderGeometry(0.28, 0.55, 2.3, 10).translate(0, 1.75, 0), red),
    tint(new THREE.CylinderGeometry(0.45, 0.45, 0.75, 14).translate(0, 3.3, 0), red),
    tint(new THREE.CylinderGeometry(0.12, 0.14, 0.35, 8).translate(0, 3.85, 0), "#202024"),
  ]);
}

function boatGeometry() {
  const hull = new THREE.BoxGeometry(1, 1, 1, 14, 3, 6), p = hull.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), u = x * 2;
    const w = (1 - Math.max(u, 0) ** 2) * (1 - 0.2 * Math.max(-u, 0) ** 2) * (y < 0 ? 1 + y * 1.2 : 1);
    p.setXYZ(i, x * 9, y * 1.3 + 0.35 * Math.max(u, 0) ** 2 * (y > 0 ? 1 : 0.3), z * 2.8 * w);
  }
  hull.computeVertexNormals();
  const sail = "#f3f1ea", alu = "#9aa0a6";
  return mergeGeometries([
    tint(hull, "#ecebe6"),
    tint(new THREE.BoxGeometry(2.8, 0.6, 1.7).translate(-0.6, 0.95, 0), "#dedbd2"),
    tint(new THREE.CylinderGeometry(0.07, 0.09, 12.6).translate(0.9, 7, 0), alu),
    tint(new THREE.CylinderGeometry(0.06, 0.06, 3.9).rotateZ(Math.PI / 2).translate(-1.05, 1.95, 0), alu),
    tint(triangle([0.85, 2.05], [0.85, 13], [-2.95, 2.05]), sail),
    tint(triangle([1, 11.4], [4.35, 0.75], [1.2, 1.35]), sail),
  ]);
}

function dolphinGeometry() {
  const body = lathe([[0, 0], [0.011, 0.01], [0.014, 0.045], [0.03, 0.07], [0.052, 0.1], [0.07, 0.17], [0.081, 0.26], [0.083, 0.36], [0.075, 0.5], [0.058, 0.63], [0.038, 0.76], [0.022, 0.87], [0.014, 0.94], [0, 1]], 16)
    .rotateZ(Math.PI / 2).translate(0.5, 0, 0).scale(1, 0.95, 0.82);
  const dorsal = fin([[0.05, 0.06], [0, 0.12], [-0.07, 0.17], [-0.055, 0.1], [-0.1, 0.055]]);
  const flukes = fin([[-0.44, 0], [-0.47, 0.06], [-0.55, 0.12], [-0.53, 0.04], [-0.555, 0], [-0.53, -0.04], [-0.55, -0.12], [-0.47, -0.06], [-0.44, 0]]).rotateX(Math.PI / 2);
  const pec = (side) => fin([[0.3, 0], [0.26, 0.06], [0.2, 0.1], [0.24, 0.04], [0.26, 0]]).rotateX(side * (Math.PI / 2 + 0.5)).translate(0, -0.035, 0.045 * side);
  return mergeGeometries([body, dorsal, flukes, pec(1), pec(-1)]);
}

function buildSplashes(scene, time) {
  const SLOTS = 10, PER = 32, n = SLOTS * PER, slot = new Float32Array(n), vel = new Float32Array(n * 3), rnd = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, out = 0.4 + Math.random() * 1.4;
    slot[i] = Math.floor(i / PER);
    vel.set([Math.cos(a) * out, 2.2 + Math.random() * 3.2, Math.sin(a) * out], i * 3);
    rnd[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aSlot", new THREE.BufferAttribute(slot, 1));
  g.setAttribute("aVel", new THREE.BufferAttribute(vel, 3));
  g.setAttribute("aRnd", new THREE.BufferAttribute(rnd, 1));
  const U = { uTime: time, uAt: { value: Array.from({ length: SLOTS }, () => new THREE.Vector4(0, 0, -99, 1)) }, uCol: { value: new THREE.Color() }, uPx: { value: 500 } };
  const drops = new THREE.Points(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: U,
    vertexShader: `
      uniform float uTime, uPx;
      uniform vec4 uAt[${SLOTS}];
      attribute float aSlot, aRnd;
      attribute vec3 aVel;
      varying float vA;
      void main() {
        vec4 s = uAt[int(aSlot)];
        float age = uTime - s.z, life = 0.9 + aRnd * 0.6;
        vec3 p = vec3(s.x, 0.0, s.y) + (aVel * age - vec3(0.0, 4.9 * age * age, 0.0)) * s.w;
        vA = age > 0.0 && age < life && p.y > -0.05 ? (1.0 - age / life) * (0.5 + 0.5 * aRnd) : 0.0;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = vA > 0.0 ? min((0.18 + aRnd * 0.3) * s.w * uPx / max(-mv.z, 1.0), 40.0) : 0.0;
      }`,
    fragmentShader: "uniform vec3 uCol; varying float vA; void main() { gl_FragColor = vec4(uCol, vA * smoothstep(0.5, 0.15, length(gl_PointCoord - 0.5))); }",
  }));
  drops.frustumCulled = false;
  scene.add(drops);
  let next = 0;
  return {
    drops, U,
    spawn(x, z, size) {
      U.uAt.value[next].set(x, z, time.value, size);
      next = (next + 1) % SLOTS;
    },
  };
}

export function buildCoast(scene, time, Ocean, sky) {
  const root = new THREE.Group();
  scene.add(root);

  const rockMat = Ocean.hazy(new THREE.MeshStandardMaterial({ color: 0x55514b, roughness: 0.95 }));
  for (const [x, y, z, sx, sy, sz, seed] of [[0, -1.2, 0, 12, 6.5, 10, 1], [10, -1.8, 5, 6, 3.6, 5, 2], [-9, -2, 4, 7, 3.4, 6, 3], [4, -1.6, -9, 7, 4, 6, 2], [-6, -2, -8, 5, 3, 4, 1], [15, -2.2, -3, 4, 2.4, 3.5, 3], [-14, -2.4, -1, 3.5, 2, 3, 2]]) {
    const rock = new THREE.Mesh(rockGeometry(seed), rockMat);
    rock.position.set(x, y, z).add(ISLE);
    rock.scale.set(sx, sy, sz);
    rock.rotation.y = seed * 1.7 + x;
    root.add(rock);
  }
  const house = new THREE.Group();
  house.position.copy(ISLE).add(new THREE.Vector3(0, 2.6, 0));
  house.rotation.y = Math.atan2(-ISLE.x, 9 - ISLE.z);
  const towerMat = Ocean.hazy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 }));
  const winMat = Ocean.hazy(new THREE.MeshBasicMaterial({ vertexColors: true, color: 0x1c1f24 }));
  const lanternMat = Ocean.hazy(new THREE.MeshStandardMaterial({ color: 0x1d242b, metalness: 0.9, roughness: 0.12, emissive: LAMP, emissiveIntensity: 0 }));
  house.add(new THREE.Mesh(lighthouseGeometry(), towerMat), new THREE.Mesh(windowsGeometry(), winMat), new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 2.5, 24, 1, true).translate(0, 25.3, 0), lanternMat));
  root.add(house);
  const lampAt = new THREE.Vector3(0, 25.3, 0).add(house.position);

  const beamGeo = new THREE.CylinderGeometry(30, 0.7, 520, 32, 1, true).translate(0, 260, 0).rotateZ(-Math.PI / 2);
  const beamU = { uK: { value: 0 }, uCol: { value: new THREE.Color("#fff3dc") } };
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: beamU,
    vertexShader: "varying float vX; varying vec3 vN, vV; void main() { vX = position.x / 520.0; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalMatrix * normal; vV = -mv.xyz; gl_Position = projectionMatrix * mv; }",
    fragmentShader: `
      uniform float uK;
      uniform vec3 uCol;
      varying float vX;
      varying vec3 vN, vV;
      void main() {
        float a = pow(abs(dot(normalize(vN), normalize(vV))), 3.0) * smoothstep(0.0, 0.015, vX) / (1.0 + vX * 14.0) * smoothstep(1.0, 0.6, vX);
        gl_FragColor = vec4(uCol * a * uK, 1.0);
      }`,
  });
  const beams = new THREE.Group();
  beams.position.copy(lampAt);
  for (const turn of [0, Math.PI]) {
    const arm = new THREE.Group(), cone = new THREE.Mesh(beamGeo, beamMat);
    arm.rotation.y = turn;
    cone.rotation.z = -0.021;
    cone.frustumCulled = false;
    arm.add(cone);
    beams.add(arm);
  }
  root.add(beams);
  const lamp = glow(LAMP.clone(), 5), lampLight = new THREE.PointLight(LAMP, 0, 40, 1.5);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(mobile ? 10 : 7, 12, 8));
  hit.position.copy(lampAt);
  hit.visible = false;
  root.add(lamp, hit);
  scene.add(lampLight);

  const buoy = new THREE.Group();
  buoy.add(new THREE.Mesh(buoyGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })));
  const buoyLight = glow(new THREE.Color("#ff3b2a").multiplyScalar(1.5), 1.7);
  buoyLight.position.y = 4.1;
  buoy.add(buoyLight);
  root.add(buoy);

  const boat = new THREE.Group();
  boat.add(new THREE.Mesh(boatGeometry(), Ocean.hazy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }))));
  const mast = glow(new THREE.Color("#fff1d6").multiplyScalar(1.5), 1.6), port = glow(new THREE.Color("#ff3a2c").multiplyScalar(1.5), 1.4);
  mast.position.set(0.9, 13.4, 0);
  port.position.set(3.7, 1.1, -0.95);
  boat.add(mast, port);
  root.add(boat);

  const dolphinGeo = dolphinGeometry(), dolphinMat = bodyMaterial(time, 3.2, { color: 0x48525c });
  const pod = Array.from({ length: mobile ? 2 : 3 }, () => {
    const m = new THREE.Mesh(dolphinGeo, dolphinMat);
    m.scale.setScalar(2.4);
    m.frustumCulled = false;
    m.visible = false;
    root.add(m);
    return { m, was: 1 };
  });
  const splashes = buildSplashes(root, time);

  const toCam = new THREE.Vector3(), fwd = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(), m4 = new THREE.Matrix4();
  const dark = new THREE.Color(0x1c1f24), warm = new THREE.Color("#ffc47a").multiplyScalar(1.6), bio = new THREE.Color(0.05, 0.3, 0.32), tmp = new THREE.Color();
  let nextSpray = 3;
  const C = {
    buoy, hit, events: [],
    update(t, camera, under) {
      C.events.length = 0;
      root.visible = !under;
      lampLight.intensity = 0;
      if (under) return;
      const lit = sky.lamp, W = Ocean.water;

      beams.rotation.y = (t * TAU) / 20;
      toCam.subVectors(camera.position, lampAt).setY(0).normalize();
      const flash = Math.abs(Math.cos(beams.rotation.y) * toCam.x - Math.sin(beams.rotation.y) * toCam.z) ** 200;
      beamU.uK.value = lit * (0.25 + 0.75 * sky.night) * 0.13;
      beams.visible = beamU.uK.value > 0.002;
      lamp.position.copy(lampAt).addScaledVector(toCam, 2.3);
      lamp.scale.setScalar(5 + 26 * flash);
      lamp.material.opacity = lit * (0.55 + 1.6 * flash);
      lanternMat.emissiveIntensity = lit * (1.6 + 3 * flash);
      lampLight.intensity = lit * (6 + 10 * flash);
      lampLight.position.copy(lampAt).addScaledVector(toCam, 2.6);
      winMat.color.lerpColors(dark, warm, lit);
      W.uLampPos.value.copy(lampAt);
      W.uLampCol.value.copy(LAMP).multiplyScalar(lit * sky.night * (0.05 + 1.4 * flash));
      W.uIsle.value.set(ISLE.x, ISLE.z, 13);
      if (t > nextSpray) {
        const a = Math.random() * TAU, r = 13 + Math.random() * 3;
        splashes.spawn(ISLE.x + Math.cos(a) * r, ISLE.z + Math.sin(a) * r, 3 + Math.random() * 2);
        C.events.push({ x: ISLE.x + Math.cos(a) * r, y: 0, z: ISLE.z + Math.sin(a) * r, size: 1 });
        nextSpray = t + 2.5 + Math.random() * 3.5;
      }

      const [bx, bz] = BUOY, hx = (Ocean.surfaceAt(bx + 1, bz) - Ocean.surfaceAt(bx - 1, bz)) / 2, hz = (Ocean.surfaceAt(bx, bz + 1) - Ocean.surfaceAt(bx, bz - 1)) / 2;
      buoy.position.set(bx, Ocean.surfaceAt(bx, bz) - 0.1, bz);
      buoy.rotation.set(-Math.atan(hz) * 1.6 + Math.sin(t * 1.1) * 0.05, 0, Math.atan(hx) * 1.6 + Math.sin(t * 0.8 + 1) * 0.05);
      const c = t % 6;
      buoyLight.material.opacity = lit * (c < 0.35 || (c > 0.9 && c < 1.25) ? 1 : 0);

      const x = 290 - ((((t * 3.2 + 180) % 580) + 580) % 580);
      boat.position.set(x, Ocean.surfaceAt(x, -150) + 0.15, -150);
      boat.rotation.set(0.14 + Math.sin(t * 0.7) * 0.03, Math.PI, Math.sin(t * 0.5) * 0.025);
      mast.material.opacity = port.material.opacity = lit;

      const k = Math.floor((t - 10) / 75), tp = t - 10 - k * 75, dir = k % 2 ? 1 : -1, z0 = -55 - 30 * hash(k);
      pod.forEach((d, j) => {
        const ph = tp / 2.5 + j * 0.31 + hash(k + j) * 0.2, s = ph - Math.floor(ph), inAir = k >= 0 && tp < 18 && s < 0.46;
        const px = dir * (8.5 * tp - 75 - j * 3), pz = z0 + (j - 1) * 2.4;
        if (k >= 0 && tp < 18 && d.was >= 0.46 && s < 0.46) splash(px, pz, 0.9);
        if (k >= 0 && tp < 18 && d.was < 0.46 && s >= 0.46) splash(px, pz, 1.1);
        d.was = s;
        d.m.visible = inAir;
        if (!inAir) return;
        const a = s / 0.46, h = 1.3, vy = (4 * h * (1 - 2 * a)) / (0.46 * 2.5);
        d.m.position.set(px, 4 * h * a * (1 - a) - 0.35 + Ocean.surfaceAt(px, pz), pz);
        fwd.set(dir * 8.5, vy, 0).normalize();
        side.crossVectors(fwd, UP).normalize();
        up.crossVectors(side, fwd);
        d.m.quaternion.setFromRotationMatrix(m4.makeBasis(fwd, up, side));
      });
      function splash(x, z, size) {
        splashes.spawn(x, z, size);
        C.events.push({ x, y: 0, z, size: 0.5 });
      }
      splashes.U.uCol.value.copy(bio).multiplyScalar(sky.night).add(tmp.copy(sky.colors.foam).multiplyScalar(1.25));
      splashes.U.uPx.value = (camera.projectionMatrix.elements[5] * innerHeight * Math.min(devicePixelRatio, 1.5)) / 2;
    },
  };
  return C;
}
