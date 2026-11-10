const S = window.SITE;
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const ready = Promise.all([
  document.fonts.ready,
  new Promise((r) => { addEventListener("scene-ready", r, { once: true }); setTimeout(r, 5000); }),
  new Promise((r) => setTimeout(r, reduce ? 0 : 1400)),
]);
let shown = 0, loaded = false, last = performance.now();
ready.then(() => (loaded = true));
(function count(now = performance.now()) {
  shown += ((loaded ? 100 : 90) - shown) * (1 - Math.exp(((last - now) / 1000) * (loaded ? 12 : 2)));
  last = now;
  if (loaded && shown > 99.5) shown = 100;
  $("#loader-count").textContent = String(Math.round(shown)).padStart(3, "0");
  $("#loader-bar").style.width = `${shown}%`;
  if (shown === 100) document.body.classList.add("loaded");
  else requestAnimationFrame(count);
})();

document.querySelectorAll("[data-bind]").forEach((el) => (el.textContent = S[el.dataset.bind]));
document.title = `${S.name} — ${Object.values(S.categories).join(", ")}`;
$("#copy").textContent = `© ${new Date().getFullYear()} ${S.name}`;

const tick = () => ($("#clock").textContent = new Date().toLocaleTimeString("fr-FR", { timeZone: S.timezone, hour: "2-digit", minute: "2-digit" }));
tick();
setInterval(tick, 10000);

let li = 0;
$("#name").innerHTML = S.name.split(" ").map((w) =>
  `<span class="w">${[...w].map((c) => `<span style="--i:${li++}">${esc(c)}</span>`).join("")}</span>`).join(" ");

let it = false;
$("#manifesto").innerHTML = S.manifesto.split(" ").map((w) => {
  if (w.startsWith("*")) it = true;
  const html = `<span${it ? ' class="it"' : ""}>${esc(w.replace(/\*/g, ""))}</span>`;
  if (/\*\W*$/.test(w)) it = false;
  return html;
}).join(" ");
const words = [...$("#manifesto").children];
function lightWords() {
  const r = $("#manifesto").getBoundingClientRect();
  const p = Math.min(Math.max((innerHeight * 0.75 - r.top) / r.height, 0), 1);
  const n = reduce ? words.length : Math.round(p * words.length);
  words.forEach((w, i) => w.classList.toggle("on", i < n));
}
addEventListener("scroll", () => requestAnimationFrame(lightWords), { passive: true });
lightWords();

$("#stats").innerHTML = S.stats.map((s, i) =>
  `<li class="fade"><span class="label">${esc(s.label)}</span><strong>${esc(s.value)}</strong><span class="idx">[${pad(i + 1)}]</span></li>`).join("");

const ytId = (u) => String(u ?? "").match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/)?.[1];
const thumbOf = (p) => p.thumb || (ytId(p.video) ? `https://i.ytimg.com/vi/${ytId(p.video)}/hqdefault.jpg` : "");

const list = $("#work-list");
list.innerHTML = S.projects.map((p, i) => `<li class="fade" data-cat="${esc(p.category)}">
  <button class="row" data-i="${i}">
    <span class="row-num">${pad(i + 1)}</span>
    <span class="row-title">${esc(p.title)}</span>
    <span class="row-meta">${esc(S.categories[p.category])} / ${esc(p.year)}</span>
    <span class="row-arrow" aria-hidden="true">↗</span>
  </button></li>`).join("");
$("#work-count").textContent = `(${pad(S.projects.length)})`;

const filters = $("#filters");
filters.innerHTML = [["tous", "Tous", S.projects.length],
  ...Object.entries(S.categories).map(([k, v]) => [k, v, S.projects.filter((p) => p.category === k).length])]
  .map(([k, label, n], i) => `<button data-cat="${k}" aria-pressed="${i === 0}">${label}<sup>${pad(n)}</sup></button>`).join("");
filters.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  filters.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
  list.querySelectorAll("li").forEach((li) => (li.hidden = b.dataset.cat !== "tous" && li.dataset.cat !== b.dataset.cat));
});

if (matchMedia("(hover: hover) and (pointer: fine)").matches && !reduce) {
  const preview = $("#preview"), af = $("#af");
  let x = 0, y = 0, tx = 0, ty = 0, current = null, lock = null;
  const box = [0, 0, 0, 0], speed = [0, 0, 0, 0];
  addEventListener("pointerover", (e) => af.classList.toggle("lock", !!(lock = e.target.closest(":is(a, button):not(dialog *)"))));
  list.addEventListener("pointerover", (e) => {
    const row = e.target.closest(".row");
    if (!row || row === current) return;
    current = row;
    const p = S.projects[row.dataset.i];
    const img = thumbOf(p);
    preview.innerHTML = img ? `<img src="${esc(img)}" alt="">` : `<span>${pad(+row.dataset.i + 1)}</span>`;
    preview.classList.add("on");
  });
  list.addEventListener("pointerleave", () => { preview.classList.remove("on"); current = null; });
  addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  (function loop() {
    x += (tx - x) * 0.15;
    y += (ty - y) * 0.15;
    preview.style.translate = `${x}px ${y}px`;
    const r = lock?.getBoundingClientRect();
    const goal = r ? [r.left - 8, r.top - 8, r.width + 16, r.height + 16] : [tx - 12, ty - 12, 24, 24];
    goal.forEach((g, i) => { speed[i] = speed[i] * 0.5 + (g - box[i]) * 0.2; box[i] += speed[i]; });
    af.style.cssText = `translate:${box[0]}px ${box[1]}px;width:${box[2]}px;height:${box[3]}px`;
    requestAnimationFrame(loop);
  })();
}

const viewer = $("#viewer");
function embed(url) {
  const yt = ytId(url);
  if (yt) return `<iframe src="https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&playsinline=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `<iframe src="https://player.vimeo.com/video/${vm[1]}?autoplay=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  return `<video src="${esc(url)}" controls autoplay playsinline></video>`;
}
const keyboard = matchMedia("(any-pointer: fine)").matches;
const game = (p) => `<button class="play" data-src="${esc(p.play)}"${keyboard ? "" : " disabled"}><img src="${esc(p.thumb)}" alt="">
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
function show(html) {
  $("#viewer-body").innerHTML = html;
  viewer.showModal();
}
list.addEventListener("click", (e) => {
  const row = e.target.closest(".row");
  if (!row) return;
  const i = +row.dataset.i, p = S.projects[i];
  show(`<div class="viewer-head">
      <span class="label">${pad(i + 1)} — ${esc(S.categories[p.category])}</span>
      <h3 class="viewer-title">${esc(p.title)}</h3>
    </div>
    <dl class="viewer-info">
      <div><dt class="label">Année</dt><dd>${esc(p.year)}</dd></div>
      <div><dt class="label">Rôle</dt><dd>${esc(p.role)}</dd></div>
      <div class="wide"><dt class="label">Le projet</dt><dd>${esc(p.description)}</dd></div>
    </dl>
    ${p.link ? `<a class="pill viewer-link" href="${esc(p.link)}" target="_blank" rel="noopener">Voir en ligne <span aria-hidden="true">↗</span></a>` : ""}
    <div class="viewer-media">${p.play ? game(p) : ""}${p.video ? embed(p.video) : ""}${(p.media || []).map((src) => `<img src="${esc(src)}" alt="" loading="lazy">`).join("")}</div>`);
});
if (S.showreel) {
  $("#showreel").hidden = false;
  $("#showreel").addEventListener("click", () => show(`<div class="viewer-media">${embed(S.showreel)}</div>`));
}
$("#viewer-close").addEventListener("click", () => viewer.close());
viewer.addEventListener("click", (e) => e.target === viewer && viewer.close());
viewer.addEventListener("close", () => ($("#viewer-body").innerHTML = ""));

$("#services-list").innerHTML = S.services.map((s, i) =>
  `<li class="fade"><span class="idx">${pad(i + 1)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join("");
$("#tools").textContent = S.tools.join(" / ");
$("#code").textContent = S.code ?? "";
$("#mail").textContent = S.email;
$("#mail").href = `mailto:${S.email}`;
$("#socials").innerHTML = S.socials.map((s) =>
  `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} <span aria-hidden="true">↗</span></a></li>`).join("");

const io = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}), { rootMargin: "0px 0px -10% 0px" });
document.querySelectorAll(".fade").forEach((el) => io.observe(el));
