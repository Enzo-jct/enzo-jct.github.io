import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { mobile, TAU, paint, tint } from "./kit.js";

const DARK = "#1c1d21", MID = "#2b2c32", BLACK = "#121214";

function keyboardGeometry() {
  const parts = [tint(new THREE.BoxGeometry(1.8, 0.07, 0.62), DARK)];
  const key = (x, z, w) => parts.push(tint(new THREE.BoxGeometry(w, 0.045, 0.095).translate(x, 0.057, z), MID));
  for (let row = 0; row < 4; row++) for (let k = 0; k < 15; k++) key(-0.805 + k * 0.115, -0.2 + row * 0.115, 0.095);
  for (const k of [0, 1, 2, 3, 11, 12, 13, 14]) key(-0.805 + k * 0.115, 0.26, 0.095);
  key(0, 0.26, 0.8);
  return mergeGeometries(parts);
}
function headphonesGeometry() {
  return mergeGeometries([
    tint(new THREE.TorusGeometry(0.42, 0.035, 8, 28, Math.PI), DARK),
    ...[1, -1].flatMap((side) => [
      tint(new THREE.CylinderGeometry(0.17, 0.17, 0.11, 22).rotateZ(Math.PI / 2).translate(0.42 * side, -0.04, 0), MID),
      tint(new THREE.TorusGeometry(0.12, 0.045, 8, 22).rotateY(Math.PI / 2).translate(0.35 * side, -0.04, 0), BLACK),
    ]),
  ]);
}
function towerGeometry() {
  return mergeGeometries([
    tint(new THREE.BoxGeometry(0.8, 1.8, 1.8), "#16171a"),
    tint(new THREE.BoxGeometry(0.82, 1.6, 0.04).translate(0, 0, 0.91), BLACK),
    tint(new THREE.BoxGeometry(0.02, 1.5, 1.6).translate(0.41, 0, 0), "#0c1014"),
  ]);
}
function chairGeometry() {
  const fabric = "#2a2c33", base = "#151517";
  const parts = [
    tint(new THREE.BoxGeometry(1.7, 0.28, 1.6).translate(0, 1.55, 0), fabric),
    tint(new THREE.BoxGeometry(1.6, 2.1, 0.24).rotateX(-0.12).translate(0, 2.75, -0.82), fabric),
    tint(new THREE.CylinderGeometry(0.1, 0.12, 1.3).translate(0, 0.85, 0), base),
  ];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU;
    parts.push(tint(new THREE.BoxGeometry(0.95, 0.12, 0.16).translate(0.47, 0.2, 0).rotateY(a), base));
    parts.push(tint(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 10).rotateX(Math.PI / 2).translate(0.9, 0.08, 0).rotateY(a), base));
  }
  return mergeGeometries(parts);
}
function cameraGeometry() {
  const parts = [
    tint(new THREE.BoxGeometry(0.62, 0.46, 0.36), "#1a1a1d"),
    tint(new THREE.CylinderGeometry(0.17, 0.19, 0.5, 20).rotateX(Math.PI / 2).translate(0, -0.02, 0.43), BLACK),
    tint(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20).rotateX(Math.PI / 2).translate(0, -0.02, 0.69), "#3a3b40"),
    tint(new THREE.CircleGeometry(0.15, 20).translate(0, -0.02, 0.716), "#0e1b2c"),
    tint(new THREE.BoxGeometry(0.12, 0.08, 0.42).translate(0, 0.27, 0), "#26272b"),
  ];
  for (let k = 0; k < 3; k++) {
    parts.push(tint(new THREE.CylinderGeometry(0.03, 0.025, 2.6, 6).translate(0, -1.3, 0).rotateX(0.35).rotateY((k / 3) * TAU + 0.4).translate(0, -0.25, 0), "#2e2f34"));
  }
  return mergeGeometries(parts);
}
function speakerGeometry() {
  return mergeGeometries([
    tint(new THREE.BoxGeometry(0.8, 1.25, 0.85), "#18181b"),
    tint(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24).rotateX(Math.PI / 2).translate(0, -0.2, 0.43), BLACK),
    tint(new THREE.CylinderGeometry(0.11, 0.11, 0.05, 16).rotateX(Math.PI / 2).translate(0, -0.2, 0.44), "#3a3b40"),
    tint(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16).rotateX(Math.PI / 2).translate(0, 0.35, 0.43), BLACK),
  ]);
}

function clapper() {
  const slate = paint(256, 200, (g, W, H) => {
    g.fillStyle = "#151515";
    g.fillRect(0, 0, W, H);
    g.strokeStyle = g.fillStyle = "rgba(240,240,235,0.88)";
    g.lineWidth = 3;
    g.strokeRect(8, 8, W - 16, H - 16);
    g.beginPath();
    g.moveTo(8, H * 0.42);
    g.lineTo(W - 8, H * 0.42);
    g.moveTo(W / 2, H * 0.42);
    g.lineTo(W / 2, H - 8);
    g.stroke();
    g.font = "700 21px Archivo";
    g.fillText("PROD. ENZO JACINTO", 20, H * 0.28);
    g.font = "600 15px Archivo";
    g.fillText("SCÈNE", 20, H * 0.55);
    g.fillText("PRISE", W / 2 + 12, H * 0.55);
    g.font = "700 40px Archivo";
    g.fillText("12", 24, H * 0.86);
    g.fillText("3", W / 2 + 16, H * 0.86);
  });
  const stripes = paint(256, 32, (g, W, H) => {
    g.fillStyle = "#f0efe9";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#151515";
    for (let x = -H; x < W; x += 40) {
      g.beginPath();
      g.moveTo(x, H);
      g.lineTo(x + 20, H);
      g.lineTo(x + 20 + H, 0);
      g.lineTo(x + H, 0);
      g.fill();
    }
  });
  const black = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
  const face = (map) => [black, black, black, black, new THREE.MeshStandardMaterial({ map, roughness: 0.6 }), black];
  const group = new THREE.Group(), board = new THREE.Mesh(new THREE.BoxGeometry(1, 0.78, 0.04), face(slate));
  const low = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.05), face(stripes)), hinge = new THREE.Group();
  low.position.y = 0.45;
  hinge.position.set(-0.5, 0.51, 0);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.05), face(stripes));
  top.position.set(0.5, 0.06, 0);
  hinge.rotation.z = 0.38;
  hinge.add(top);
  group.add(board, low, hinge);
  return group;
}

const page = paint(256, 352, (g, W) => {
  g.fillStyle = "#e9e6dc";
  g.fillRect(0, 0, W, 352);
  g.strokeStyle = "#5a5a60";
  g.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const x = 18 + j * 116, y = 22 + i * 108;
      g.strokeRect(x, y, 104, 62);
      g.beginPath();
      g.moveTo(x + 6, y + 44 - i * 7);
      g.lineTo(x + 98, y + 38 + j * 5);
      g.stroke();
      g.beginPath();
      g.arc(x + 30 + i * 18, y + 28, 7, 0, TAU);
      g.stroke();
      g.fillStyle = "#8a8a90";
      g.fillRect(x, y + 70, 80, 3);
      g.fillRect(x, y + 78, 58, 3);
    }
  }
});

export function buildDebris(scene, time, { ground }) {
  const root = new THREE.Group();
  scene.add(root);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.2 });
  const floaters = [];
  const float = (obj, at, spin) => {
    root.add(obj);
    floaters.push({ obj, at: new THREE.Vector3(...at), ph: floaters.length * 1.7, spin, base: obj.rotation.clone() });
  };
  const lay = (obj, x, z, lift, rx, ry, rz) => {
    obj.position.set(x, ground(x, z) + lift, z);
    obj.rotation.set(rx, ry, rz);
    root.add(obj);
    return obj;
  };

  float(new THREE.Mesh(keyboardGeometry(), mat), [11.5, -3.2, -6.4], 0.05);
  float(new THREE.Mesh(headphonesGeometry(), mat), [16.5, -3.9, -5.6], -0.07);
  float(clapper(), [22.5, -5.1, -5.8], 0.04);
  const NP = mobile ? 5 : 8, ph = new Float32Array(NP);
  const pageGeo = new THREE.PlaneGeometry(0.8, 1.1, 8, 10);
  pageGeo.setAttribute("aPh", new THREE.InstancedBufferAttribute(ph, 1));
  const pageMat = new THREE.MeshStandardMaterial({ map: page, side: THREE.DoubleSide, roughness: 0.9 });
  pageMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nattribute float aPh;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.z += sin(position.x * 2.6 + uTime * 1.3 + aPh) * 0.08 + sin(position.y * 2.0 + uTime * 0.9 + aPh) * 0.05;");
  };
  const pages = new THREE.InstancedMesh(pageGeo, pageMat, NP);
  pages.frustumCulled = false;
  root.add(pages);
  const pageAt = [[2.5, -2.6, -5.2], [6.8, -1.8, -7.6], [12.6, -3.4, -7.2], [17.4, -2.8, -8], [20.4, -4.6, -6.6], [26, -4.4, -7.8], [29.8, -6, -6.8], [34, -7, -5.4]].slice(0, NP).map((p, i) => ((ph[i] = i * 2.3), new THREE.Vector3(...p)));

  const tower = lay(new THREE.Mesh(towerGeometry(), mat), 6.5, -4.5, 0.4, 0.08, 0.6, Math.PI / 2 - 0.12);
  const glow = (geo, color) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
  for (const y of [0.42, -0.36]) {
    const fan = glow(new THREE.TorusGeometry(0.3, 0.022, 6, 28).rotateY(Math.PI / 2), 0x2a6470);
    fan.position.set(0.43, y, -0.25);
    tower.add(fan);
  }
  const button = glow(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12).rotateX(Math.PI / 2), 0x4a7cd8);
  button.position.set(0, 0.68, 0.94);
  tower.add(button);
  lay(new THREE.Mesh(chairGeometry(), mat), 10.8, -3.2, 0.85, 0.15, -0.5, Math.PI / 2 + 0.2);
  lay(new THREE.Mesh(cameraGeometry(), mat), 3.4, -5.2, 0.3, 0.2, 2.2, 1.25);
  lay(new THREE.Mesh(speakerGeometry(), mat), 13.6, -5, 0.35, -0.25, -0.8, 0.35);

  const port = new THREE.Vector3(), v = new THREE.Vector3(), e = new THREE.Euler(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  tower.updateMatrixWorld(true);
  port.set(0, 0.6, -0.92).applyMatrix4(tower.matrixWorld);
  return {
    port,
    update(t, under) {
      root.visible = under;
      if (!under) return;
      for (const f of floaters) {
        f.obj.position.copy(f.at).add(v.set(Math.sin(t * 0.19 + f.ph) * 0.35, Math.sin(t * 0.27 + f.ph) * 0.22, Math.cos(t * 0.15 + f.ph) * 0.3));
        f.obj.rotation.set(f.base.x + f.ph + Math.sin(t * 0.13 + f.ph) * 0.6, f.base.y + t * f.spin + f.ph, f.base.z + Math.sin(t * 0.11 + f.ph * 2) * 0.5);
      }
      pageAt.forEach((p, i) => {
        v.copy(p).add({ x: Math.sin(t * 0.07 + i) * 1.1, y: Math.sin(t * 0.11 + i * 2) * 0.5, z: Math.cos(t * 0.09 + i) * 0.8 });
        pages.setMatrixAt(i, m4.compose(v, q.setFromEuler(e.set(t * 0.21 + i, t * 0.13 + i * 2, Math.sin(t * 0.3 + i) * 0.6)), one));
      });
      pages.instanceMatrix.needsUpdate = true;
    },
  };
}
