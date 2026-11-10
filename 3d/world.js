import * as THREE from "three";
import { mobile, reduce, clamp01, ease, lerp, range, pad, paint } from "./kit.js";
import { buildMontage } from "./montage.js";
import { buildSky } from "./sky.js";
import { buildOcean } from "./ocean.js";
import { buildCoast } from "./coast.js";
import { buildDebris } from "./debris.js";
import { buildDeep } from "./deep.js";
import { buildSeabed } from "./seabed.js";
import { buildLife } from "./life.js";
import { buildAbyss } from "./abyss.js";
import { buildFish, FISH } from "./fish.js";
import { buildContact } from "./contact.js";
import { buildPost } from "./post.js";
import { buildSound } from "./sound.js";

const S = window.SITE, P = S.projects, X = S.v3d ?? {};
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const src = (u) => (/^(https?:|\/|data:)/.test(u) ? u : `../${u}`);
const roles = X.roles ?? Object.values(S.categories);

let ready = false, loadedAt = Infinity;
const minTime = new Promise((r) => setTimeout(r, reduce ? 0 : 900));
const Sound = buildSound();
{
  let shown = 0, last = performance.now();
  (function count(now = performance.now()) {
    shown += ((ready ? 100 : 90) - shown) * (1 - Math.exp(((last - now) / 1000) * (ready ? 10 : 1.6)));
    last = now;
    if (ready && shown > 99.5) shown = 100;
    $("#loader-bar").style.width = `${shown}%`;
    if (shown < 100) return requestAnimationFrame(count);
    $(".loader").classList.add("ready");
    for (const b of document.querySelectorAll(".load-go button")) b.disabled = false;
    $("#enter").focus({ preventScroll: true });
  })();
}
const soundBtn = $("#sound"), volEl = $("#volume");
let vol = 0.8;
try {
  const v = parseFloat(localStorage.getItem("plongee-volume"));
  if (Number.isFinite(v)) vol = Math.min(Math.max(v, 0), 1);
} catch {}
function setVolume(v) {
  vol = v;
  Sound.volume(v);
  try {
    localStorage.setItem("plongee-volume", String(v));
  } catch {}
}
Sound.volume(vol);
const showSound = () => {
  soundBtn.setAttribute("aria-pressed", String(Sound.on));
  soundBtn.setAttribute("aria-label", Sound.on ? "Couper le son" : "Activer le son");
  volEl.value = vol;
  volEl.style.setProperty("--v", `${vol * 100}%`);
};
showSound();
function soundOn() {
  if (!vol) setVolume(0.6);
  Sound.start();
}
function enter(withSound) {
  if (withSound) soundOn();
  showSound();
  document.body.classList.add("loaded");
  loadedAt = performance.now();
}
$("#enter").addEventListener("click", () => enter(true));
$("#enter-mute").addEventListener("click", () => enter(false));
soundBtn.addEventListener("click", () => {
  if (Sound.on) Sound.stop();
  else soundOn();
  showSound();
});
volEl.addEventListener("input", () => {
  setVolume(+volEl.value);
  if (vol && !Sound.on) Sound.start();
  else if (!vol && Sound.on) Sound.stop();
  showSound();
});
let hoverEl = null;
document.addEventListener("pointerover", (e) => {
  const el = e.target.closest("a, button");
  if (el && el !== hoverEl) Sound.ui("hover");
  hoverEl = el;
});
document.addEventListener("click", (e) => e.target.closest("a, button") && Sound.ui("click"));

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ powerPreference: "high-performance" });
} catch {
  location.replace("../");
  throw new Error("WebGL indisponible");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.domElement.className = "gl";
document.body.prepend(renderer.domElement);
addEventListener("pagehide", () => renderer.forceContextLoss());
addEventListener("pageshow", (e) => e.persisted && location.reload());
await Promise.all(['italic 400 100px "Instrument Serif"', "800 100px Archivo", "700 100px Archivo", "600 100px Archivo", "500 100px Archivo"].map((f) => document.fonts.load(f).catch(() => {})));

const scene = new THREE.Scene();
const time = { value: 0 };
const Sky = buildSky();
const Ocean = buildOcean(scene, renderer, time, Sky);
const camera = new THREE.PerspectiveCamera(mobile ? 55 : 35, 1, 0.05, 1200);

const card = (num, title, sub) => paint(1600, 900, (g, W, H) => {
  const bg = g.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.6);
  bg.addColorStop(0, "#3b3036");
  bg.addColorStop(1, "#0f0f12");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = "#ff5a36";
  g.font = `italic 400 ${H * 0.42}px "Instrument Serif"`;
  g.fillText(num, W / 2, H * 0.42);
  g.fillStyle = "#ecebe5";
  g.font = "800 100px Archivo";
  g.font = `800 ${Math.min(H * 0.075, (100 * W * 0.7) / g.measureText(title.toUpperCase()).width)}px Archivo`;
  g.fillText(title.toUpperCase(), W / 2, H * 0.72);
  g.fillStyle = "#8b8a84";
  g.font = `500 ${H * 0.032}px Archivo`;
  g.fillText(sub.toUpperCase(), W / 2, H * 0.8);
});
const ytId = (u) => String(u ?? "").match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1];
async function picture(p, i) {
  const yt = ytId(p.video), urls = p.thumb ? [src(p.thumb)] : yt ? [`https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`] : [];
  for (const url of urls) {
    try {
      const t = await new THREE.TextureLoader().loadAsync(url);
      if (t.image.width <= 120) continue;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return { map: t, img: t.image, aspect: t.image.width / t.image.height };
    } catch {}
  }
  const map = card(pad(i + 1), p.title, `${S.categories[p.category]} / ${p.year}`);
  return { map, img: map.image, aspect: 16 / 9 };
}
const pics = await Promise.all(P.map(picture));

const W0 = 2;
let list = P.map((_, i) => i), AB = W0 + P.length, CT = AB + 1;
const M = buildMontage(scene, S, pics, time, W0);
M.root.position.set(3, -4.6, 0);
M.root.rotation.z = -0.2;
M.viewer.rotation.z = 0.2;
M.root.updateMatrixWorld(true);
const local = (x, y, z) => M.root.localToWorld(new THREE.Vector3(x, y, z));
const endW = local(M.endX, 0, 0);
const AO = new THREE.Vector3(endW.x + 9, endW.y - 6, -1);
const CO = new THREE.Vector3(AO.x + 12, AO.y - 11, -1);
const Deep = buildDeep(scene, time, { x0: -8, x1: CO.x + 10, y0: CO.y - 8, leaks: M.leaks.map((p) => local(p.x, p.y, p.z)) });
const Seabed = buildSeabed(scene, time, { cliff: AO.x - 5, abyss: CO.y - 9 });
const Life = buildLife(scene, time, { ground: Seabed.height });
const Coast = buildCoast(scene, time, Ocean, Sky);
const Debris = buildDebris(scene, time, { ground: Seabed.height });
M.plugTo = Debris.port;
const Abyss = buildAbyss(scene, time, { CO });
const Contact = await buildContact(scene, CO, FISH);
const Fish = buildFish(scene, AO, time, roles, Contact.points);
const schoolAt = AO.clone().add(new THREE.Vector3(1.9, 0, -0.6)), handAt = CO.clone().add(new THREE.Vector3(-0.9, 1.5, 0));

const V3 = (v) => v.toArray();
const at = (desk, mob) => (mobile ? mob : desk);
const plus = (o, x, y, z) => [o.x + x, o.y + y, o.z + z];
const SURFACE = { ch: 0, name: "Surface", panel: "#p-surface", pos: at([0, 1.45, 9], [0, 1.6, 11]), look: at([2, 1, -10], [0, 0.75, -10]), play: 0 };
const DIVE = { ch: 0, name: "La plongée", panel: "#p-dive", caption: X.plongee ?? "Sous la surface, il y a des histoires.", pos: at([1.2, -2.6, 7.4], [1.6, -2.4, 10]), look: at([3.8, -4.9, 0], [3.4, -5.4, 0]), play: 0.25 };
const plan = (i) => {
  const x = M.projX[i];
  return { ch: 1, name: `Plan ${pad(i + 1)}`, panel: "#p-work", project: i, pos: V3(at(local(x - 0.6, 2.6, 6.3), local(x, 3, 8.4))), look: V3(at(local(x, 0.95, -1.6), local(x, 0.7, -2.4))), play: x };
};
const ABOUT = { ch: 2, name: "Le banc", panel: "#p-about", pos: at(plus(AO, 0.5, 0.5, 8.6), plus(AO, 1.9, 0.6, 12)), look: at(plus(AO, 0.9, 0, 0), plus(AO, 1.9, -1.4, 0)), play: M.endX };
const CONTACT = { ch: 3, name: "Les abysses", panel: "#p-contact", pos: at(plus(CO, 1.6, -2.4, 7.6), plus(CO, 0.6, -2.6, 10)), look: at(plus(CO, 0.7, 2, -0.8), plus(CO, 0, 0.4, 0)), play: M.endX };
let STATIONS, LAST, camPos, camLook;
function stations() {
  STATIONS = [SURFACE, DIVE, ...list.map(plan), ABOUT, CONTACT];
  LAST = STATIONS.length - 1;
  camPos = STATIONS.map((st) => new THREE.Vector3(...st.pos));
  camLook = STATIONS.map((st) => new THREE.Vector3(...st.look));
  AB = W0 + list.length;
  CT = AB + 1;
}
stations();

const post = buildPost(renderer, camera, time);
function resize() {
  if (!innerWidth || !innerHeight) return;
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  post.resize();
  $(".track").style.height = `${STATIONS.length * innerHeight}px`;
}
addEventListener("resize", resize);
resize();

document.querySelectorAll("[data-bind]").forEach((el) => (el.textContent = S[el.dataset.bind]));
$("#roles").textContent = roles.join(" — ");
$("#about-roles").textContent = roles.join(" · ");
$("#about-title").textContent = X.about ?? "Du rush au récit.";
$("#contact-title").textContent = X.contact ?? "On lance la lecture ?";
$("#contact-text").textContent = X.contactText ?? "Un stage, un projet, un clip à monter : écris-moi.";
$("#s-list").innerHTML = S.services.map((sv, i) => `<li><span class="idx">${pad(i + 1)}</span><h3>${esc(sv.title)}</h3><p>${esc(sv.text)}</p></li>`).join("");
$("#tools").textContent = `Outils : ${S.tools.join(" · ")}`;
$("#code").textContent = S.code ?? "";
$("#mail").textContent = S.email;
$("#mail").href = `mailto:${S.email}`;
$("#socials").innerHTML = S.socials.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} <span aria-hidden="true">↗</span></a></li>`).join("");
$("#copy").textContent = `© ${new Date().getFullYear()} ${S.name}`;

const CHAPTERS = ["Surface", "Projets", "À propos", "Contact"];
const go = (k) => scrollTo({ top: k * innerHeight });
let railLinks;
function drawChapters() {
  const ks = [0, W0, AB, CT];
  $("#rail").innerHTML = CHAPTERS.map((name, i) => `<a href="#" data-k="${ks[i]}" aria-label="${name}"><span>${pad(i + 1)}</span><b>${name}</b></a>`).join("");
  $("#menu").innerHTML = CHAPTERS.map((name, i) => `<a href="#" data-k="${ks[i]}">${name}</a>`).join("") + '<a href="../">Version lite ↗</a>';
  railLinks = [...$("#rail").children];
}
drawChapters();
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-k]");
  if (!a) return;
  e.preventDefault();
  go(+a.dataset.k);
  $("#menu").hidden = true;
  $("#menu-btn").setAttribute("aria-expanded", "false");
});
$("#menu-btn").addEventListener("click", () => {
  const open = $("#menu").hidden;
  $("#menu").hidden = !open;
  $("#menu-btn").setAttribute("aria-expanded", String(open));
});
let hoverMail = false;
$("#mail").addEventListener("pointerenter", () => (hoverMail = true));
$("#mail").addEventListener("pointerleave", () => (hoverMail = false));

function caption(text) {
  let i = 0;
  $("#caption").innerHTML = [...text].map((c) => `<span style="--i:${i++}">${esc(c)}</span>`).join("");
}
function scramble(el, text) {
  const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/+";
  let n = 0;
  clearInterval(el.timer);
  el.timer = setInterval(() => {
    el.textContent = [...text].map((c, i) => (c === " " || i < n / 2 ? c : glyphs[Math.floor(Math.random() * glyphs.length)])).join("");
    if (++n > text.length * 2) clearInterval(el.timer);
  }, 28);
}

let playX = 0, current = 0;

const viewer = $("#viewer");
function embed(url) {
  const yt = ytId(url);
  if (yt) return `<iframe src="https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `<iframe src="https://player.vimeo.com/video/${vm[1]}?autoplay=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  return `<video src="${esc(src(url))}" controls autoplay playsinline></video>`;
}
const keyboard = matchMedia("(any-pointer: fine)").matches;
const game = (p) => `<button class="play" data-src="${esc(p.play)}"${keyboard ? "" : " disabled"}><img src="${esc(src(p.thumb))}" alt="">
    <span class="pill">${keyboard ? 'Jouer ici <span aria-hidden="true">▶</span>' : "Se joue au clavier, sur ordinateur"}</span></button>
  ${p.controls ? `<p class="play-keys">${esc(p.controls)}</p>` : ""}`;
$("#viewer-body").addEventListener("click", (e) => {
  const b = e.target.closest(".play");
  if (!b) return;
  const f = Object.assign(document.createElement("iframe"), { src: b.dataset.src, className: "game", allowFullscreen: true });
  f.setAttribute("allow", "autoplay; fullscreen; gamepad");
  f.addEventListener("load", () => f.focus());
  b.replaceWith(f);
});
function openProject(i) {
  const p = P[i];
  const part = (label, text) => (text ? `<div><span class="label">${label}</span><p>${esc(text)}</p></div>` : "");
  Sound.video(false);
  $("#viewer-body").innerHTML = `<div class="case">
    <div class="viewer-head">
      <span class="label">Projet ${pad(i + 1)} — ${esc(S.categories[p.category])} — ${esc(p.year)}</span>
      <h3 class="viewer-title">${esc(p.title)}</h3>
      ${p.tagline ? `<p class="tagline">${esc(p.tagline)}</p>` : ""}
    </div>
    <p class="case-text">${esc(p.description)}</p>
    ${p.link ? `<a class="pill viewer-link" href="${esc(p.link)}" target="_blank" rel="noopener">Voir en ligne <span aria-hidden="true">↗</span></a>` : ""}
    <div class="viewer-media">${p.play ? game(p) : ""}${p.video ? embed(p.video) : ""}${(p.media || []).map((m) => `<img src="${esc(src(m))}" alt="" loading="lazy">`).join("")}${!p.play && !p.video && !p.media?.length ? `<img src="${pics[i].img.toDataURL ? pics[i].img.toDataURL("image/jpeg", 0.85) : esc(src(p.thumb))}" alt="">` : ""}</div>
    <div class="case-grid">${part("Mon rôle", p.role)}${part("Outils", p.tools)}${part("Le défi", p.challenge)}</div>
    ${list.length > 1 ? '<button class="pill case-next" id="case-next">Projet suivant <span aria-hidden="true">→</span></button>' : ""}
  </div>`;
  $("#case-next")?.addEventListener("click", () => {
    const j = (list.indexOf(i) + 1) % list.length;
    go(W0 + j);
    openProject(list[j]);
  });
  viewer.showModal();
  Sound.focus(true);
  watchVideos();
}
$("#w-open").addEventListener("click", () => openProject(current));
$("#viewer-close").addEventListener("click", () => viewer.close());
viewer.addEventListener("click", (e) => e.target === viewer && viewer.close());
viewer.addEventListener("close", () => {
  $("#viewer-body").innerHTML = "";
  Sound.focus(false);
  Sound.video(false);
});
function watchVideos() {
  for (const v of $("#viewer-body").querySelectorAll("video")) {
    v.addEventListener("play", () => Sound.video(true));
    v.addEventListener("pause", () => Sound.video(false));
    if (!v.paused) Sound.video(true);
  }
  for (const f of $("#viewer-body").querySelectorAll("iframe")) {
    f.addEventListener("load", () => {
      let n = 0;
      const ask = () => {
        const w = f.contentWindow;
        if (!f.isConnected || !w || n++ > 10) return clearInterval(timer);
        w.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
        w.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"], id: 1, channel: "widget" }), "*");
        for (const value of ["play", "pause", "ended"]) w.postMessage(JSON.stringify({ method: "addEventListener", value }), "*");
      };
      const timer = setInterval(ask, 800);
      ask();
    });
  }
}
addEventListener("message", (e) => {
  if (!viewer.open || !/^https:\/\/(www\.youtube(-nocookie)?\.com|player\.vimeo\.com)$/.test(e.origin)) return;
  let d = e.data;
  try {
    if (typeof d === "string") d = JSON.parse(d);
  } catch {
    return;
  }
  if (!d || typeof d !== "object") return;
  const state = d.event === "onStateChange" ? d.info : d.event === "infoDelivery" ? d.info?.playerState : undefined;
  if (typeof state === "number") Sound.video(state === 1 || state === 3);
  if (d.event === "play" || d.event === "playing") Sound.video(true);
  if (d.event === "pause" || d.event === "ended") Sound.video(false);
});
addEventListener("blur", () => setTimeout(() => {
  if (viewer.open && document.activeElement?.tagName === "IFRAME") Sound.video(true);
}));

let s = 0;
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(9, 9), mouse = { x: -1, y: -1 };
function pickAt(x, y) {
  if (x < 0 || s < W0 - 0.6 || s > AB - 0.4) return null;
  ptr.set((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2);
  ray.setFromCamera(ptr, camera);
  return ray.intersectObjects([M.screen, ...M.projClips], false)[0]?.object ?? null;
}
if (!mobile) addEventListener("pointermove", (e) => ((mouse.x = e.clientX), (mouse.y = e.clientY)), { passive: true });
document.documentElement.addEventListener("mouseleave", () => (mouse.x = -1));
function lampAt(x, y) {
  if (x < 0 || s > 0.5 || camera.position.y < 0) return false;
  ptr.set((x / innerWidth) * 2 - 1, 1 - (y / innerHeight) * 2);
  ray.setFromCamera(ptr, camera);
  return ray.intersectObject(Coast.hit, false).length > 0;
}
addEventListener("click", (e) => {
  if (e.target.closest("a, button, dialog, .menu")) return;
  if (lampAt(e.clientX, e.clientY)) return Sky.toggle(time.value);
  const m = pickAt(e.clientX, e.clientY);
  if (m?.userData.project != null) openProject(m.userData.project);
});

const panelEls = [...new Set(STATIONS.map((st) => st.panel))].map((sel) => $(sel));
const look = new THREE.Vector3(), bottom = -CO.y + 2, prevCam = new THREE.Vector3(), schoolPos = new THREE.Vector3();
const wordPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -AO.z), cursor = new THREE.Vector3();
let last = performance.now(), shownPanel = null, shownCaption = "", shownWork = -1, dove = null, vel = 0;

let cat = "", blend = 0;
const fromPos = new THREE.Vector3(), fromLook = new THREE.Vector3();
const cats = [["", "Tout", P.length], ...Object.entries(S.categories).map(([c, name]) => [c, name, P.filter((p) => p.category === c).length])].filter(([, , n]) => n);
$("#filters").innerHTML = cats.map(([c, name, n]) => `<button class="chip" data-cat="${c}" aria-pressed="${!c}">${esc(name)} <span>${n}</span></button>`).join("");
$("#filters").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b || b.dataset.cat === cat) return;
  cat = b.dataset.cat;
  for (const c of $("#filters").children) c.setAttribute("aria-pressed", String(c.dataset.cat === cat));
  list = P.map((_, i) => i).filter((i) => !cat || P[i].category === cat);
  const j = Math.max(list.indexOf(current), 0);
  current = list[j];
  shownWork = -1;
  stations();
  M.setList(list);
  drawChapters();
  resize();
  fromPos.copy(camera.position);
  fromLook.copy(look);
  blend = reduce ? 0 : 1;
  s = W0 + j;
  scrollTo({ top: s * innerHeight, behavior: "instant" });
});

function frame(now) {
  requestAnimationFrame(frame);
  if (viewer.open && viewer.querySelector(".game")) return;
  const dt =Math.min((now - last) / 1000, 0.25), k = 1 - Math.exp(-dt * 3.2);
  last = now;
  const target = Math.min(Math.max(scrollY / Math.max(innerHeight, 1), 0), LAST);
  s = reduce ? target : s + (target - s) * k;
  if (!Number.isFinite(s)) s = target;
  time.value = now / 1000;
  Sky.update(time.value);
  const i = Math.min(Math.floor(s), LAST - 1), f = ease(s - i);
  camera.position.lerpVectors(camPos[i], camPos[i + 1], f);
  look.lerpVectors(camLook[i], camLook[i + 1], f);
  if (i === 0) look.y -= Math.sin(Math.PI * f) * 12;
  if (blend > 0) {
    blend = Math.max(0, blend - dt * 1.3);
    camera.position.lerp(fromPos, ease(blend));
    look.lerp(fromLook, ease(blend));
  }
  camera.lookAt(look);
  camera.updateMatrixWorld();
  playX = lerp(STATIONS[i].play, STATIONS[i + 1].play, f);

  const y = camera.position.y, sea = Ocean.heightAt(camera.position.x, camera.position.z), under = y < sea, depth = clamp01(-y / bottom);
  vel += (camera.position.distanceTo(prevCam) / Math.max(dt, 1e-3) - vel) * (1 - Math.exp(-dt * 6));
  prevCam.copy(camera.position);
  if (under && dove === null) dove = time.value;
  Ocean.update(camera, under, depth);
  Coast.update(time.value, camera, under);
  Debris.update(time.value, under);
  Deep.update(under, depth, renderer.getPixelRatio());
  M.root.position.y = -4.6 + Math.sin(time.value * 0.31) * 0.12;
  M.root.rotation.set(Math.sin(time.value * 0.23) * 0.012, Math.sin(time.value * 0.13) * 0.006, -0.2 + Math.sin(time.value * 0.19) * 0.01);
  M.update(s, playX);
  const dive = range(s, AB + 0.1, CT - 0.1);
  let fishCursor = null;
  if (mouse.x >= 0 && s > AB - 1.3 && dive < 0.99) {
    ptr.set((mouse.x / innerWidth) * 2 - 1, 1 - (mouse.y / innerHeight) * 2);
    ray.setFromCamera(ptr, camera);
    if (ray.ray.intersectPlane(wordPlane, cursor)) fishCursor = cursor.sub(AO);
  }
  Fish.update(time.value, s > AB - 1.3, range(s, AB - 0.7, AB), dive, hoverMail, fishCursor);
  Contact.update(range(s, CT - 0.8, CT - 0.05));
  Life.update(time.value, { under, dove, schoolsOn: s > 0.6 && s < AB + 0.3, sky: Sky });
  const stir = under ? clamp01(vel / 2.5) * Math.max(range(depth, 0.45, 0.65), Sky.night * 0.8) : 0;
  Abyss.update(time.value, range(s, AB + 0.4, CT - 0.05), stir, camera.position, renderer.getPixelRatio());
  const hovered = mobile ? null : pickAt(mouse.x, mouse.y);
  document.body.style.cursor = hovered || (!mobile && lampAt(mouse.x, mouse.y)) ? "pointer" : "";
  const pu = post.u;
  pu.uUnder.value = under ? 1 : 0;
  pu.uLight.value = Math.exp(Math.min(y, 0) * 0.11) * lerp(1, 0.45, Sky.night);
  const shade = lerp(1, 0.7 + 0.3 * Math.sin(time.value * 0.043) * Math.sin(time.value * 0.071 + 2), Sky.day);
  pu.uCaust.value = 2.4 * lerp(1, 0.3, Sky.night) * shade;
  pu.uShaft.value = 0.2 * lerp(1, 0.45, Sky.night) * shade;
  post.night(Sky.night);
  pu.uRays.value = range(s, CT - 0.9, CT - 0.05);
  pu.uFade.value = reduce ? 1 : range(now - loadedAt, 200, 1800);
  pu.uSplash.value = Math.exp(-Math.abs(y - sea) * 4) * 0.55 * (s < 1.5 ? 1 : 0) * lerp(1, 0.35, Sky.night);
  schoolPos.copy(schoolAt).lerp(handAt, dive);
  Sound.update({ cam: camera, under, depth, speed: vel, rays: pu.uRays.value, hover: hoverMail ? 1 : 0, school: { pos: schoolPos, on: s > AB - 1.3, activity: clamp01(vel / 3 + Fish.stir) }, night: Sky.night, bell: Coast.buoy.position, events: Coast.events });

  const n = Math.round(s), st = STATIONS[n], o = Math.max(0, 1 - Math.abs(s - n) * 3);
  for (const el of panelEls) {
    const on = el.matches(st.panel);
    el.style.opacity = on ? o : 0;
    el.classList.toggle("on", on && o > 0.5);
  }
  if (st.caption && st.caption !== shownCaption) caption((shownCaption = st.caption));
  if (st.panel !== shownPanel && (shownPanel = st.panel) === "#p-about") scramble($("#about-title"), X.about ?? "Du rush au récit.");
  if (st.project != null) current = st.project;
  if (current !== shownWork) {
    shownWork = current;
    const p = P[current];
    $("#w-num").textContent = cat ? `Plan ${pad(current + 1)} · ${S.categories[cat]} ${list.indexOf(current) + 1} / ${list.length}` : `Plan ${pad(current + 1)} / ${pad(P.length)}`;
    $("#w-title").textContent = p.title;
    $("#w-meta").textContent = `${S.categories[p.category]} / ${p.year} — ${p.role}`;
  }
  railLinks.forEach((a, j) => a.classList.toggle("on", j === st.ch));

  post.render(scene);
}
prevCam.copy(camPos[0]);
requestAnimationFrame(frame);
document.body.classList.add("has-scene");
Ocean.update(camera, false, 0);
await Promise.all([minTime, renderer.compileAsync(scene, camera)]);
ready = true;
