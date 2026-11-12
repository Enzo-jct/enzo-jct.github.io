(() => {
  let lang = new URLSearchParams(location.search).get("lang");
  try {
    if (lang === "fr" || lang === "en") localStorage.setItem("lang", lang);
    else lang = localStorage.getItem("lang");
  } catch (e) {}
  if (lang !== "fr" && lang !== "en") lang = /^fr\b/i.test(navigator.language || "fr") ? "fr" : "en";
  document.documentElement.lang = lang;
  const autre = lang === "fr" ? "en" : "fr";

  const lien = (texte, classe) => {
    const u = new URL(location.href);
    u.searchParams.set("lang", autre);
    const a = document.createElement("a");
    a.href = u.href;
    a.hreflang = a.lang = autre;
    a.textContent = texte;
    if (classe) a.className = classe;
    return a;
  };

  addEventListener("DOMContentLoaded", () => {
    const barre = document.querySelector(".bar-right");
    if (barre) {
      const a = lien(autre.toUpperCase(), "menu-btn lang-btn");
      a.setAttribute("aria-label", autre === "en" ? "English version" : "Version française");
      barre.prepend(a);
    }
    const nav = document.querySelector("header.top nav.info > span:last-child");
    if (nav) nav.append(" · ", lien(autre === "en" ? "English" : "Français"));
    const style = document.createElement("style");
    style.textContent = ".lang-btn{color:var(--mute);text-decoration:none;transition:color .3s}.lang-btn:hover{color:var(--ink)}";
    document.head.append(style);
  });

  if (lang !== "en") return;

  const fusion = (a, b) => {
    for (const k of Object.keys(b)) {
      const v = b[k];
      if (Array.isArray(v) && Array.isArray(a[k]) && v.some((x) => x && typeof x === "object")) {
        v.forEach((x, i) => { a[k][i] = x && typeof x === "object" ? fusion(a[k][i] || {}, x) : x; });
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        a[k] = fusion(a[k] || {}, v);
      } else {
        a[k] = v;
      }
    }
    return a;
  };
  if (window.SITE && window.SITE_EN) fusion(window.SITE, window.SITE_EN);

  const MOTS = {
    "Enzo Jacinto — La plongée": "Enzo Jacinto — The Dive",
    "Enzo Jacinto — Graphisme, audiovisuel, réseaux": "Enzo Jacinto — Graphic design, video, social media",
    "Plonger": "Dive in",
    "ou entrer sans le son": "or enter without sound",
    "Son immersif · casque conseillé": "Immersive sound · headphones recommended",
    "Version lite": "Lite version",
    "Version lite ↗": "Lite version ↗",
    "Son": "Sound",
    "Projets": "Projects",
    "À propos": "About",
    "Fais défiler pour plonger ↓": "Scroll to dive ↓",
    "Tout": "All",
    "Tous": "All",
    "Voir le projet": "View project",
    "Mon rôle": "My role",
    "Outils": "Tools",
    "Le défi": "The challenge",
    "Projet suivant": "Next project",
    "Jouer ici": "Play here",
    "Se joue au clavier, sur ordinateur": "Played with a keyboard, on a computer",
    "Voir en ligne": "View online",
    "Mise au point": "Focusing",
    "Actuellement": "Currently",
    "Basé à": "Based in",
    "Travaux": "Work",
    "Voir le showreel": "Watch the showreel",
    "Voir les travaux": "See my work",
    "Ce que": "What",
    "je fais.": "I do.",
    "Un projet ?": "A project?",
    "Parlons-en.": "Let's talk.",
    "Haut de page ↑": "Back to top ↑",
    "Haut de page": "Back to top",
    "Année": "Year",
    "Rôle": "Role",
    "Le projet": "The project",
    "Retour au début": "Back to the start",
    "Activer le son": "Turn sound on",
    "Couper le son": "Turn sound off",
    "Volume du site": "Site volume",
    "Chapitres": "Chapters",
    "Trier les projets": "Filter projects",
    "Fermer": "Close",
    "WebGL indisponible": "WebGL unavailable",
  };
  const REGLES = [[/^Projet (\d+) — /, "Project $1 — "], [/^Outils : /, "Tools: "]];
  const ATTR = ["aria-label", "title", "placeholder", "alt"];

  const traduire = (s) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (!t) return s;
    let r = MOTS[t];
    if (r === undefined) {
      const regle = REGLES.find(([re]) => re.test(t));
      if (regle) r = t.replace(regle[0], regle[1]);
    }
    return r === undefined ? s : s.match(/^\s*/)[0] + r + s.match(/\s*$/)[0];
  };
  const attribut = (el, a) => {
    const v = el.getAttribute(a);
    const w = v && traduire(v);
    if (w && w !== v) el.setAttribute(a, w);
  };
  const noeud = (n) => {
    if (n.nodeType === 3) {
      const v = traduire(n.nodeValue);
      if (v !== n.nodeValue) n.nodeValue = v;
      return;
    }
    if (n.nodeType !== 1) return;
    for (const el of [n, ...n.querySelectorAll("*")]) ATTR.forEach((a) => attribut(el, a));
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) noeud(w.currentNode);
  };

  new MutationObserver((liste) => {
    for (const m of liste) {
      if (m.type === "characterData") noeud(m.target);
      else if (m.type === "attributes") attribut(m.target, m.attributeName);
      else m.addedNodes.forEach(noeud);
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  addEventListener("DOMContentLoaded", () => noeud(document.documentElement));
})();
