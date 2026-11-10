import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TAU, clamp01, ease, range, pad, tc, rng, paint, drawCover, cover, screenMaterial, cable, tint } from "./kit.js";

export const SEC = 0.5;
const ROW = 0.66;
const TRACKS = [["V3", "Effets"], ["V2", "Titres"], ["V1", "Image"], ["A1", "Voix"], ["A2", "Musique"], ["A3", "Ambiance"]];
export const trackZ = (k) => (k - (TRACKS.length - 1) / 2) * ROW;
const COLORS = { fx: "#6b5f33", titre: "#7a3e61", image: "#424788", genese: "#424788", projet: "#b8452c", voix: "#2c6c61", musique: "#2b5c72", ambiance: "#3b573e" };
const shade = (hex, k) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;

function sky(g, W, H) {
  const s = g.createLinearGradient(0, 0, 0, H * 0.7);
  s.addColorStop(0, "#0c1120");
  s.addColorStop(0.6, "#4e3138");
  s.addColorStop(1, "#e08850");
  g.fillStyle = s;
  g.fillRect(0, 0, W, H);
}
const wideShot = () => paint(960, 540, (g, W, H) => {
  sky(g, W, H);
  const sun = g.createRadialGradient(W * 0.62, H * 0.7, 0, W * 0.62, H * 0.7, H * 0.55);
  sun.addColorStop(0, "rgba(255,226,180,1)");
  sun.addColorStop(0.07, "rgba(255,196,130,0.95)");
  sun.addColorStop(0.3, "rgba(255,120,60,0.28)");
  sun.addColorStop(1, "rgba(255,90,50,0)");
  g.fillStyle = sun;
  g.fillRect(0, 0, W, H * 0.7);
  g.fillStyle = "#0b0a0a";
  g.fillRect(0, H * 0.7, W, H * 0.3);
  g.fillStyle = "rgba(255,170,110,0.35)";
  for (let k = 0; k < 9; k++) g.fillRect(W * 0.62 - (60 - k * 6), H * (0.72 + k * 0.025), (60 - k * 6) * 2, 2);
});
const closeUp = () => paint(960, 540, (g, W, H) => {
  sky(g, W, H);
  const glow = g.createRadialGradient(W * 0.5, H * 0.75, 0, W * 0.5, H * 0.75, H * 0.6);
  glow.addColorStop(0, "rgba(255,190,130,0.7)");
  glow.addColorStop(1, "rgba(255,120,60,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#080707";
  g.beginPath();
  g.moveTo(W * 0.14, H);
  g.bezierCurveTo(W * 0.17, H * 0.8, W * 0.32, H * 0.73, W * 0.43, H * 0.71);
  g.lineTo(W * 0.57, H * 0.71);
  g.bezierCurveTo(W * 0.68, H * 0.73, W * 0.83, H * 0.8, W * 0.86, H);
  g.fill();
  g.beginPath();
  g.moveTo(W * 0.465, H * 0.56);
  g.lineTo(W * 0.535, H * 0.56);
  g.quadraticCurveTo(W * 0.54, H * 0.68, W * 0.6, H * 0.72);
  g.lineTo(W * 0.4, H * 0.72);
  g.quadraticCurveTo(W * 0.46, H * 0.68, W * 0.465, H * 0.56);
  g.fill();
  g.beginPath();
  g.ellipse(W * 0.5, H * 0.43, W * 0.074, H * 0.165, 0, 0, TAU);
  g.fill();
  g.strokeStyle = "rgba(255,180,120,0.55)";
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(W * 0.5, H * 0.43, W * 0.074, H * 0.165, 0, Math.PI * 1.08, Math.PI * 1.92);
  g.stroke();
});
function broll(g, x, y, w, h, r) {
  const hue = 200 + r() * 150, grd = g.createLinearGradient(x, y, x, y + h);
  grd.addColorStop(0, `hsl(${hue},28%,${14 + r() * 12}%)`);
  grd.addColorStop(1, `hsl(${hue + 30},30%,${4 + r() * 6}%)`);
  g.fillStyle = grd;
  g.fillRect(x, y, w, h);
  g.fillStyle = `hsla(${hue + 160},50%,70%,0.3)`;
  g.fillRect(x, y + h * (0.5 + r() * 0.25), w, 2);
}

function clipFace(c, len, depth, pics, gen, r) {
  const H = 128, W = Math.min(2048, Math.max(96, Math.round((H * len) / depth))), band = 30, body = H - band, col = COLORS[c.kind];
  return paint(W, H, (g) => {
    g.fillStyle = shade(col, 0.42);
    g.fillRect(0, 0, W, H);
    if (c.kind === "image" || c.kind === "projet" || c.kind === "genese") {
      const fw = (body * 16) / 9;
      for (let x = 0, k = 0; x < W; x += fw, k++) {
        if (c.kind === "projet") drawCover(g, pics[c.project].img, x, band, fw, body);
        else if (c.kind === "genese") drawCover(g, gen[k % 2].image, x, band, fw, body);
        else broll(g, x, band, fw, body, r);
        g.fillStyle = "rgba(0,0,0,0.4)";
        g.fillRect(x + fw - 2, band, 2, body);
      }
    } else if (c.kind === "fx") {
      g.strokeStyle = "rgba(255,230,160,0.16)";
      g.lineWidth = 6;
      for (let x = -H; x < W; x += 22) {
        g.beginPath();
        g.moveTo(x, H);
        g.lineTo(x + body, band);
        g.stroke();
      }
    } else if (c.kind === "titre") {
      const pts = [[0, 0.85], [0.14, 0.22], [0.86, 0.22], [1, 0.85]].map(([u, k]) => [Math.min(Math.max(u * W, 8), W - 8), band + k * body]);
      g.strokeStyle = "rgba(255,255,255,0.6)";
      g.lineWidth = 2;
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
      g.fillStyle = "#ffd9a8";
      for (const [x, y] of pts) {
        g.save();
        g.translate(x, y);
        g.rotate(Math.PI / 4);
        g.fillRect(-5, -5, 10, 10);
        g.restore();
      }
    } else {
      g.fillStyle = shade(col, 1.7);
      const mid = band + body / 2, ph = r() * 10;
      for (let x = 0; x < W; x += 3) {
        const env = 0.3 + 0.7 * Math.abs(Math.sin(x * 0.011 + ph) * Math.sin(x * 0.0037 + ph * 2));
        const a = env * (0.3 + 0.7 * r()) * body * 0.45;
        g.fillRect(x, mid - a, 2, a * 2);
      }
    }
    g.fillStyle = col;
    g.fillRect(0, 0, W, band);
    g.fillStyle = "#f2f0ea";
    g.font = "600 17px Archivo";
    g.textBaseline = "middle";
    g.fillText(c.name, 10, band / 2 + 1);
    g.strokeStyle = "rgba(255,255,255,0.22)";
    g.lineWidth = 2;
    g.strokeRect(1, 1, W - 2, H - 2);
  });
}
const headerFace = ([id, label], k) => paint(512, 100, (g, W, H) => {
  g.fillStyle = "#18181d";
  g.fillRect(0, 0, W, H);
  g.fillStyle = k < 3 ? "#7d83e8" : "#4fc3a4";
  g.fillRect(0, 0, 6, H);
  g.fillStyle = "#f2f0ea";
  g.font = "700 38px Archivo";
  g.textBaseline = "middle";
  g.fillText(id, 24, H / 2 + 2);
  g.fillStyle = "#8b8a84";
  g.font = "500 20px Archivo";
  g.fillText(label.toUpperCase(), 100, H / 2 + 2);
  g.strokeStyle = g.fillStyle = "#5c5b63";
  g.lineWidth = 3;
  const bx = W - 118;
  if (k < 3) {
    g.beginPath();
    g.ellipse(bx + 20, H / 2, 16, 9, 0, 0, TAU);
    g.stroke();
    g.beginPath();
    g.arc(bx + 20, H / 2, 4, 0, TAU);
    g.fill();
    g.strokeRect(bx + 66, H / 2 - 4, 22, 16);
    g.beginPath();
    g.arc(bx + 77, H / 2 - 4, 7, Math.PI, 0);
    g.stroke();
  } else {
    g.font = "700 22px Archivo";
    g.textAlign = "center";
    ["M", "S"].forEach((l, j) => {
      g.strokeRect(bx + 6 + j * 52, H / 2 - 15, 34, 30);
      g.fillText(l, bx + 23 + j * 52, H / 2 + 2);
    });
  }
});
const rulerFace = (end, projX) => paint(Math.min(8192, end * 64), 96, (g, W, H) => {
  const pps = W / end;
  g.fillStyle = "#101014";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#77767f";
  g.font = "500 20px Archivo";
  g.textBaseline = "top";
  for (let k = 0; k <= end * 2; k++) {
    const sec = k / 2, x = sec * pps, h = sec % 5 === 0 ? 38 : sec % 1 === 0 ? 22 : 12;
    g.fillRect(x, H - h, 2, h);
    if (sec % 5 === 0) g.fillText(tc(sec), x + 6, 12);
  }
  g.fillStyle = "#ff5a36";
  g.font = "700 18px Archivo";
  projX.forEach((x, i) => {
    const px = (x / SEC) * pps;
    g.beginPath();
    g.moveTo(px - 9, 44);
    g.lineTo(px + 9, 44);
    g.lineTo(px, 60);
    g.fill();
    g.fillText(`P${pad(i + 1)}`, px + 12, 40);
  });
});

export function buildMontage(scene, S, pics, time, W0) {
  const P = S.projects, r = rng(11), gen = [wideShot(), closeUp()];
  const root = new THREE.Group();
  scene.add(root);
  const red = new THREE.MeshBasicMaterial({ color: 0xff5a36 });

  const clips = [{ track: 2, t0: 0, t1: 6, name: "SÉQ_01_OUVERTURE.MOV", kind: "genese" }], projX = [];
  let t = 8;
  P.forEach((p, i) => {
    const d = { graphisme: 5, audiovisuel: 6, reseaux: 4 }[p.category] ?? 5;
    clips.push({ track: 2, t0: t, t1: t + d, name: `${pad(i + 1)}_${p.title}`.toUpperCase(), kind: "projet", project: i });
    projX.push((t + d / 2) * SEC);
    t += d;
    const b = 1.5 + Math.floor(r() * 2);
    clips.push({ track: 2, t0: t, t1: t + b, name: `B-ROLL_${pad(12 + i * 7, 3)}.MOV`, kind: "image" });
    t += b;
  });
  const end = Math.ceil(t + 4);
  const fill = (track, kind, names, min, max, gap) => {
    for (let x = r() * 3; x < end - 1; ) {
      const d = min + r() * (max - min);
      clips.push({ track, t0: x, t1: Math.min(x + d, end), name: names[Math.floor(r() * names.length)], kind });
      x += d + 0.4 + r() * gap;
    }
  };
  fill(0, "fx", ["AJUSTEMENT_LUT", "ÉTALONNAGE_teal-orange", "GRAIN_16MM"], 7, 15, 5);
  fill(1, "titre", ["TITRE_intro", "SOUS-TITRES_fr", "LOGO_anim", "BANDEAU_nom"], 2, 5, 4);
  fill(3, "voix", ["VOIX_OFF_prise3.wav", "INTERVIEW_cam-A.wav", "VOIX_OFF_v2.wav"], 3, 7, 3);
  fill(4, "musique", ["MUSIQUE_mix_final.wav", "MUSIQUE_v4.wav"], 14, 24, 1);
  fill(5, "ambiance", ["AMBIANCE_rue.wav", "BRUITAGE_pas.wav", "ROOM_TONE.wav"], 4, 9, 4);

  const timeline = new THREE.Group();
  root.add(timeline);
  const sideMats = {}, clipMeshes = [], projClips = [];
  for (const c of clips) {
    const len = (c.t1 - c.t0) * SEC - 0.03, depth = ROW * 0.8;
    const face = clipFace(c, len, depth, pics, gen, r);
    const top = new THREE.MeshStandardMaterial({ map: face, emissive: 0xffffff, emissiveMap: face, emissiveIntensity: 0.55, roughness: 0.5 });
    const side = (sideMats[c.kind] ??= new THREE.MeshStandardMaterial({ color: shade(COLORS[c.kind], 0.7), roughness: 0.6 }));
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, depth), [side, side, top, side, side, side]);
    m.position.set(c.t0 * SEC + 0.015 + len / 2, 0.06, trackZ(c.track));
    m.userData = { t0: c.t0, genese: c.kind === "genese", project: c.project, kind: c.kind };
    timeline.add(m);
    clipMeshes.push(m);
    if (c.kind !== "projet") continue;
    const outline = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xff5a36, transparent: true, opacity: 0 }));
    m.add(outline);
    m.userData.outline = outline;
    projClips.push(m);
  }
  const X0 = -3.5, full = end * SEC - X0;
  const laneMat = new THREE.MeshStandardMaterial({ color: 0x121216, roughness: 0.75 });
  const lanes = TRACKS.map((tr, k) => {
    const lane = new THREE.Mesh(new THREE.BoxGeometry(full, 0.02, ROW * 0.94).translate(full / 2, 0, 0), laneMat);
    lane.position.set(X0, 0.01, trackZ(k));
    const head = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.05, ROW * 0.88), [laneMat, laneMat, new THREE.MeshStandardMaterial({ map: headerFace(tr, k), roughness: 0.6 }), laneMat, laneMat, laneMat]);
    head.position.set(-1.85, 0.045, trackZ(k));
    timeline.add(lane, head);
    return lane;
  });
  const rulerZ = trackZ(0) - ROW / 2 - 0.32, nearZ = trackZ(TRACKS.length - 1) + ROW / 2;
  const ruler = new THREE.Mesh(new THREE.PlaneGeometry(end * SEC, 0.5).rotateX(-Math.PI / 2).translate((end * SEC) / 2, 0, 0), new THREE.MeshBasicMaterial({ map: rulerFace(end, projX) }));
  ruler.position.set(0, 0.012, rulerZ);
  timeline.add(ruler);
  const BZ = 0.32, TH = 0.42;
  const devL = full + 0.5 + 2 * BZ, devD = nearZ - rulerZ + 0.8 + 2 * BZ, devX = X0 - 0.25 - BZ, devZ = (nearZ + rulerZ) / 2, backZ = devZ - devD / 2;
  const casing = new THREE.MeshStandardMaterial({ color: 0x17181c, roughness: 0.5, metalness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x030405, roughness: 0.08, metalness: 0.8, emissive: 0x1a2336, emissiveIntensity: 0 });
  const vents = paint(256, 64, (g, W, H) => {
    g.fillStyle = "#1a1b20";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#3a3b42";
    g.fillRect(0, 0, W, 3);
    g.fillStyle = "#0b0b0e";
    for (let x = 10; x < W; x += 18) g.fillRect(x, H * 0.52, 10, H * 0.2);
  });
  vents.wrapS = THREE.RepeatWrapping;
  vents.repeat.set(devL / 1.4, 1);
  const edge = new THREE.MeshStandardMaterial({ map: vents, roughness: 0.5, metalness: 0.45 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(devL, TH, devD).translate(devL / 2, -TH / 2, 0), [casing, casing, glass, casing, edge, casing]);
  slab.position.set(devX, 0, devZ);
  const rim = (w, d, x, z) => new THREE.BoxGeometry(w, 0.05, d).translate(x, 0.025, z);
  const gap = 1.1;
  const frame = new THREE.Mesh(mergeGeometries([
    rim(devL, BZ, devL / 2, devD / 2 - BZ / 2), rim(devL - gap, BZ, (devL + gap) / 2, BZ / 2 - devD / 2),
    rim(BZ, devD - BZ - gap, BZ / 2, (gap - BZ) / 2), rim(BZ, devD - 2 * BZ, devL - BZ / 2, 0),
  ]), casing);
  frame.position.copy(slab.position);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
    transparent: true,
    map: paint(168, 84, (g, W, H) => {
      g.fillStyle = "#6f6e76";
      g.font = 'italic 400 76px "Instrument Serif"';
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("EJ", W / 2, H / 2 + 6);
    }),
  }));
  logo.position.set(devX + devL / 2, 0.052, devZ + devD / 2 - BZ / 2);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.025), new THREE.MeshBasicMaterial({ color: 0xff9a3c }));
  led.position.set(devX + 3, 0.056, devZ + devD / 2 - BZ / 2);
  const standby = new THREE.Color(0xff9a3c), awake = new THREE.Color(0xcfe6ff);
  const mains = cable(0.055), link = cable(0.035);
  root.add(slab, frame, logo, led, mains.mesh, link.mesh);

  const r2 = rng(7), cw = 4, cd = 3.2, ix = 0.22, iz = 0.25;
  const crackMap = paint(512, 410, (g, W, H) => {
    const cx = W * ix, cy = H * iz;
    g.strokeStyle = "rgba(220,228,236,0.8)";
    g.lineCap = g.lineJoin = "round";
    for (let k = 0; k < 15; k++) {
      let x = cx, y = cy, a = (k / 15) * TAU + r2() * 0.4;
      for (let n = 0; n < 9; n++) {
        g.lineWidth = Math.max(0.7, 2.4 - n * 0.22);
        g.beginPath();
        g.moveTo(x, y);
        a += (r2() - 0.5) * 0.55;
        x += Math.cos(a) * (16 + r2() * 34);
        y += Math.sin(a) * (16 + r2() * 34);
        g.lineTo(x, y);
        g.stroke();
      }
    }
    g.lineWidth = 1.2;
    for (let ring = 1; ring <= 3; ring++) {
      g.beginPath();
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * TAU, rr = ring * 21 * (0.8 + r2() * 0.4);
        if (k) g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        else g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      g.stroke();
    }
  });
  const deadMap = paint(512, 410, (g, W, H) => {
    const cx = W * ix, cy = H * iz, blot = g.createRadialGradient(cx, cy, 0, cx, cy, 120);
    blot.addColorStop(0, "rgba(0,0,0,0.95)");
    blot.addColorStop(0.55, "rgba(0,0,0,0.6)");
    blot.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = blot;
    g.fillRect(0, 0, W, H);
    for (const [x, col] of [[0.16, "#d63ccb"], [0.27, "#3ccf78"], [0.31, "#cfcfcf"], [0.4, "#36bcd6"]]) {
      g.fillStyle = col;
      g.fillRect(W * x, cy - 30, 3, H - cy + 30);
    }
  });
  const crackAt = (mat) => new THREE.Mesh(new THREE.PlaneGeometry(cw, cd).rotateX(-Math.PI / 2), mat);
  const crack = crackAt(new THREE.MeshBasicMaterial({ map: crackMap, transparent: true, depthWrite: false }));
  const dead = crackAt(new THREE.MeshBasicMaterial({ map: deadMap, transparent: true, depthWrite: false, opacity: 0 }));
  crack.position.set(devX + BZ + cw / 2, 0.1, backZ + BZ + cd / 2);
  dead.position.copy(crack.position);
  dead.position.y -= 0.005;
  crack.renderOrder = 2;
  dead.renderOrder = 1;
  const shards = [[0.32, 0.12], [0.22, 0.16], [0.4, 0.1], [0.16, 0.12]].map(([w, d], k) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), casing);
    return { m, at: new THREE.Vector3(devX - 0.2 - k * 0.45, 0.35 + k * 0.4, backZ - 0.1 + k * 0.3), ph: k * 1.9 };
  });
  const mouse = new THREE.Mesh(mergeGeometries([
    tint(new THREE.SphereGeometry(1, 18, 10, 0, TAU, 0, Math.PI / 2).scale(0.14, 0.09, 0.22), "#1c1d21"),
    tint(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 10).rotateZ(Math.PI / 2).translate(0, 0.085, -0.1), "#55565c"),
  ]), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
  mouse.scale.setScalar(1.6);
  const tail = cable(0.022);
  root.add(crack, dead, ...shards.map((sh) => sh.m), mouse, tail.mesh);

  const play = new THREE.Group(), span = nearZ - rulerZ + 0.25, midZ = (nearZ + rulerZ) / 2;
  const playLine = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.02, span), red);
  playLine.position.set(0, 0.11, midZ);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.26), red);
  head.position.set(0, 0.04, rulerZ);
  play.add(playLine, head);
  timeline.add(play);

  const viewer = new THREE.Group();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.025), screenMaterial(pics[0]?.map ?? gen[0], time, pics[0]?.aspect ?? 16 / 9));
  screen.material.uniforms.uGuides.value = 1;
  screen.userData.project = 0;
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.82, 2.5, 0.05), new THREE.MeshStandardMaterial({ color: 0x131316, roughness: 0.55 }));
  body.position.set(0, 0.04, -0.035);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.8, 0.24), casing);
  rear.position.set(0, 0.04, -0.17);
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.14), new THREE.MeshBasicMaterial({
    transparent: true,
    map: paint(1024, 40, (g, W, H) => {
      g.font = "600 19px Archivo";
      g.textBaseline = "middle";
      g.fillStyle = "#c9c7c0";
      g.fillText("PROGRAMME : SÉQ_01", 4, H / 2);
      g.textAlign = "right";
      g.fillStyle = "#77767f";
      g.fillText("AJUSTER ▾     QUALITÉ 1/2     ⚙", W - 4, H / 2);
    }),
  }));
  bar.position.set(0, 1.12, 0.001);
  const scrub = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.01, 0.01), new THREE.MeshBasicMaterial({ color: 0x3a3a40 }));
  scrub.position.set(0, -1.1, 0);
  const knob = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.08, 0.012), red);
  knob.position.set(0, -1.1, 0.006);
  viewer.add(body, rear, screen, bar, scrub, knob);
  viewer.position.set(0, 1.62, -3.4);
  viewer.rotation.x = -0.05;
  root.add(viewer);

  let shown = 0, list = P.map((_, i) => i);
  const plugAt = new THREE.Vector3();
  return {
    root, viewer, projX, endX: end * SEC, screen, projClips,
    leaks: [new THREE.Vector3(devX + 2, 0.05, devZ + devD / 2 - 0.25), new THREE.Vector3(devX + devL - 0.6, 0.05, devZ + devD / 2 - 0.3)],
    plugTo: null,
    setList(l) {
      list = l;
      for (const m of projClips) {
        const on = list.includes(m.userData.project), top = m.material[2];
        top.color.setScalar(on ? 1 : 0.3);
        top.emissiveIntensity = on ? 0.55 : 0.08;
      }
    },
    update(s, playX) {
      const t = time.value;
      const power = range(s, W0 - 1.5, W0 - 1.2), boot = Math.exp(-(((power - 0.25) / 0.12) ** 2));
      const flicker = power > 0 && power < 1 ? 0.7 + 0.3 * Math.sin(t * 53) * Math.sin(t * 31) : 1;
      glass.emissiveIntensity = power * flicker * 0.9 + boot * 2.2;
      dead.material.opacity = power * (0.6 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 2.1));
      for (const sh of shards) {
        sh.m.position.copy(sh.at).add({ x: Math.sin(t * 0.21 + sh.ph) * 0.12, y: Math.sin(t * 0.33 + sh.ph) * 0.1, z: 0 });
        sh.m.rotation.set(t * 0.31 + sh.ph, t * 0.17 + sh.ph * 2, Math.sin(t * 0.23 + sh.ph) * 0.8);
      }
      led.material.color.lerpColors(standby, awake, power);
      const B = range(s, W0 - 1.3, W0 - 0.4);
      timeline.visible = B > 0.002;
      for (const l of lanes) l.scale.x = Math.max(B, 0.001);
      for (const m of clipMeshes) {
        const a = clamp01((B * 1.35 - m.userData.t0 / end) * 3.5);
        m.scale.y = Math.max(a, 0.001);
        m.visible = a > 0.002;
      }

      for (const m of projClips) {
        const j = list.indexOf(m.userData.project);
        const f = j < 0 ? 0 : ease(clamp01(1 - Math.abs(s - (W0 + j)) * 2.2));
        m.position.y = 0.06 + 0.22 * f;
        m.userData.outline.material.opacity = f;
      }
      play.position.x = playX;
      play.visible = B > 0.6;

      const L = list.length;
      const on = range(s, W0 - 0.8, W0 - 0.15) * (1 - range(s, W0 + L - 0.75, W0 + L - 0.25));
      viewer.position.set(playX, 1.62 + Math.sin(t * 0.5) * 0.06, -3.4);
      viewer.rotation.x = -0.05 + Math.sin(t * 0.37) * 0.02;
      screen.material.uniforms.uOpacity.value = on;
      bar.visible = scrub.visible = knob.visible = on > 0.05;

      plugAt.set(0.5, -0.8, -0.2).applyEuler(viewer.rotation).add(viewer.position);
      link.u.uP0.value.set(playX + 0.5, 0.05, backZ + 0.16);
      link.u.uP1.value.set(playX + 0.6, 0.32, backZ + 0.05);
      link.u.uP2.value.copy(plugAt).add({ x: 0, y: -0.3, z: 0.1 });
      link.u.uP3.value.copy(plugAt);
      const front = devZ + devD / 2;
      root.updateMatrixWorld();
      if (this.plugTo) root.worldToLocal(mains.u.uP3.value.copy(this.plugTo));
      else mains.u.uP3.value.set(devX + 3.6, -8, front - 0.8);
      mains.u.uP0.value.set(devX + 1.2, -0.25, front - 0.05);
      mains.u.uP1.value.set(devX + 1, -1.6, front + 0.6);
      mains.u.uP2.value.copy(mains.u.uP3.value).add({ x: -1.2 + Math.sin(t * 0.4) * 0.35, y: 3.4, z: 1 + Math.sin(t * 0.31 + 1) * 0.4 });
      const mx = devX + 5, swing = Math.sin(t * 0.6) * 0.18;
      mouse.position.set(mx + swing, -0.8 + Math.sin(t * 0.4) * 0.05, front + 0.34 + Math.cos(t * 0.5) * 0.08);
      mouse.rotation.set(Math.PI / 2 + Math.cos(t * 0.5) * 0.15, t * 0.2, -swing * 0.8);
      tail.u.uP0.value.set(mx, 0.04, front - 0.12);
      tail.u.uP1.value.set(mx, 0.08, front + 0.3);
      tail.u.uP3.value.set(0, 0, -0.35).applyEuler(mouse.rotation).add(mouse.position);
      tail.u.uP2.value.copy(tail.u.uP3.value).add({ x: 0, y: 0.6, z: 0.05 });
      const n = list[Math.min(Math.max(Math.round(s) - W0, 0), L - 1)];
      if (n !== shown && pics[n]) {
        shown = n;
        screen.material.uniforms.uMap.value = pics[n].map;
        screen.material.uniforms.uCover.value = cover(pics[n].aspect);
        screen.userData.project = n;
      }
      screen.material.uniforms.uFlash.value = s > W0 - 0.7 && s < W0 + L - 0.6 ? Math.exp(-Math.abs(s - Math.floor(s) - 0.5) * 26) * 0.85 : 0;
      knob.position.x = (playX / SEC / end - 0.5) * 3.6;
    },
  };
}
