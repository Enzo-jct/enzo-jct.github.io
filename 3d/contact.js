import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { TAU, rng } from "./kit.js";

const HAND = "https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0.20/dist/profiles/generic-hand/right.glb";
const POSE = [
  ["index-finger", [0, 0.16, 0.14, 0.08], -0.07],
  ["middle-finger", [0, 0.22, 0.2, 0.1], 0],
  ["ring-finger", [0, 0.3, 0.24, 0.12], 0.07],
  ["pinky-finger", [0, 0.38, 0.28, 0.15], 0.16],
];
const JOINTS = ["metacarpal", "phalanx-proximal", "phalanx-intermediate", "phalanx-distal", "tip"];
const BEND = new THREE.Vector3(0, 0, 1), SPREAD = new THREE.Vector3(1, 0, 0);

function pose(model, k) {
  const q = new THREE.Quaternion();
  for (const [finger, angles, spread] of POSE) {
    const chain = JOINTS.map((j) => model.getObjectByName(`${finger}-${j}`));
    const turn = (axis, a, from) => {
      q.setFromAxisAngle(axis, a);
      const at = chain[from].position.clone();
      for (let j = from; j < chain.length; j++) {
        if (j > from) chain[j].position.sub(at).applyQuaternion(q).add(at);
        chain[j].quaternion.premultiply(q);
      }
    };
    turn(SPREAD, spread * (1 + k * 0.6), 1);
    angles.forEach((a, j) => a && turn(BEND, -a * (1 - k * 0.5), j));
  }
  model.updateMatrixWorld(true);
}

export async function buildContact(scene, origin, count) {
  const r = rng(5), handAt = new THREE.Vector3(-0.9, 0.4, 0).add(origin);
  const spot = new THREE.SpotLight(0xd4ecff, 0, 30, 0.35, 0.8, 1.2);
  spot.position.set(0, 10, 3).add(origin);
  spot.target.position.copy(handAt);
  scene.add(spot, spot.target);

  const points = [], v = new THREE.Vector3();
  const place = new THREE.Matrix4().compose(
    handAt,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.22, 0, -0.28)).multiply(new THREE.Quaternion(Math.SQRT1_2, 0, Math.SQRT1_2, 0)),
    new THREE.Vector3(12, 12, 12),
  );
  try {
    const model = (await new GLTFLoader().loadAsync(HAND)).scene;
    let skin;
    model.traverse((o) => o.isSkinnedMesh && (skin = o));
    pose(model, 0.35);
    const wrist = model.getObjectByName("wrist").position;
    place.multiply(new THREE.Matrix4().makeTranslation(-wrist.x, -wrist.y, -wrist.z));
    const src = skin.geometry, n = src.attributes.position.count, baked = new THREE.BufferGeometry();
    baked.setAttribute("position", new THREE.Float32BufferAttribute(n * 3, 3));
    for (let i = 0; i < n; i++) {
      skin.getVertexPosition(i, v);
      baked.attributes.position.setXYZ(i, v.x, v.y, v.z);
    }
    baked.setIndex(src.index);
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(baked)).setRandomGenerator(r).build();
    while (points.length < count * 0.82) {
      sampler.sample(v);
      points.push(v.clone().applyMatrix4(place));
    }
    while (points.length < count) {
      const a = r() * TAU, y = 0.3 * r() ** 1.8, k = 1 + y * 0.6;
      points.push(new THREE.Vector3(0.0398 + Math.cos(a) * 0.0186 * k, 0.062 + y, 0.0102 + Math.sin(a) * 0.0263 * k).applyMatrix4(place));
    }
  } catch {
    while (points.length < count) {
      const a = r() * TAU, h = r();
      points.push(new THREE.Vector3(Math.cos(a) * (0.7 - h * 0.4), h * 2.6, Math.sin(a) * 0.5).add(handAt));
    }
  }
  return { points, update: (f) => (spot.intensity = 70 * f) };
}
