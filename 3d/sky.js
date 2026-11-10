import * as THREE from "three";
import { TAU, clamp01, lerp, range, ease, reduce } from "./kit.js";

const RAD = Math.PI / 180, OBL = 23.4397 * RAD;
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone, year = new Date().getFullYear();
const winter = -Math.max(new Date(year, 0, 1).getTimezoneOffset(), new Date(year, 6, 1).getTimezoneOffset()) / 60;
const [LAT, LON] = zone === "Europe/Paris" ? [48.9, 2.3] : [46, winter * 15];

function place(lon, lat, sid) {
  const ra = Math.atan2(Math.sin(lon) * Math.cos(OBL) - Math.tan(lat) * Math.sin(OBL), Math.cos(lon));
  const dec = Math.asin(Math.sin(lat) * Math.cos(OBL) + Math.cos(lat) * Math.sin(OBL) * Math.sin(lon));
  const H = sid - ra, phi = LAT * RAD;
  return [Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)), Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi))];
}
export function astro(date) {
  const d = date / 864e5 - 10957.5;
  const sid = (280.16 + 360.9856235 * d + LON) * RAD;
  const M = (357.5291 + 0.98560028 * d) * RAD;
  const ls = M + (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M) + 102.9372) * RAD + Math.PI;
  const lm = (218.316 + 13.176396 * d + 6.289 * Math.sin((134.963 + 13.064993 * d) * RAD)) * RAD;
  const bm = 5.128 * Math.sin((93.272 + 13.22935 * d) * RAD) * RAD;
  return { sun: place(ls, 0, sid), moon: place(lm, bm, sid), phase: (((lm - ls) % TAU) + TAU) % TAU };
}

const toScene = (alt, az, out) => out.set(Math.sin(5 * RAD + az * 0.18) * Math.cos(alt), Math.sin(alt), -Math.cos(5 * RAD + az * 0.18) * Math.cos(alt));

const NAMES = ["top", "mid", "hor", "sun", "deep", "cloud", "foam"];
const KEYS = [
  [-15, "#01030a #040817 #0b1325 #000000 #010309 #020409 #0b1018", 0.3],
  [-8, "#050b20 #10183b #2c2a4a #3a1d18 #02050e #05070f #1c202c", 0.7],
  [-2.5, "#0f1a42 #342e59 #ad5f4c #ff8c5a #040914 #1c1724 #6a6066", 1],
  [3, "#18234d #4a3a62 #e9895a #ffc48e #060b18 #3c354b #a0959a", 1],
  [10, "#22447c #6a7fac #f0b582 #ffddb0 #0a1c2e #6a6a80 #c8c2bf", 0.7],
  [25, "#2a5ca6 #5f93cf #b8d2e6 #fff4e0 #0b2338 #c3cdda #e4e8ea", 0.3],
].map(([alt, hex, k]) => [alt, hex.split(" ").map((h) => new THREE.Color(h)), k]);

export function buildSky() {
  const asked = parseFloat(new URLSearchParams(location.search).get("heure"));
  let shift = 0;
  if (Number.isFinite(asked)) {
    const d = new Date();
    d.setHours(Math.floor(asked), Math.round((asked % 1) * 60), 0, 0);
    shift = d - Date.now();
  }
  const meteor = { at: -9, dur: 1, next: 12, from: new THREE.Vector3(), path: new THREE.Vector3() };
  let envAlt = 99, envAt = -9, rush = null;
  const S = {
    colors: Object.fromEntries(NAMES.map((n) => [n, new THREE.Color()])),
    sun: new THREE.Vector3(), moon: new THREE.Vector3(), moonCol: new THREE.Color(),
    meteorA: new THREE.Vector3(0, -1, 0), meteorB: new THREE.Vector3(0, -1, 0), meteor: 0,
    sunAlt: 0, phase: 0, cloudK: 1, night: 0, stars: 0, lamp: 0, day: 0, moonLight: 0, version: 0,
    toggle(t) {
      const now = new Date(Date.now() + shift), goal = new Date(now);
      goal.setHours(S.night > 0.5 ? 13 : 23, 30, 0, 0);
      if (goal <= now) goal.setDate(goal.getDate() + 1);
      rush = { from: shift, to: shift + (goal - now), at: t, dur: reduce ? 0.001 : 4 };
    },
    update(t) {
      if (rush) {
        const k = clamp01((t - rush.at) / rush.dur);
        shift = lerp(rush.from, rush.to, ease(k));
        if (k >= 1) rush = null;
      }
      const a = astro(new Date(Date.now() + shift)), [sAlt, sAz] = a.sun, [mAlt, mAz] = a.moon;
      S.sunAlt = sAlt / RAD;
      toScene(sAlt, sAz, S.sun);
      toScene(mAlt * 0.35, mAz, S.moon);
      let i = 0;
      while (i < KEYS.length - 2 && S.sunAlt > KEYS[i + 1][0]) i++;
      const [a0, c0, k0] = KEYS[i], [a1, c1, k1] = KEYS[i + 1], f = clamp01((S.sunAlt - a0) / (a1 - a0));
      NAMES.forEach((n, j) => S.colors[n].lerpColors(c0[j], c1[j], f));
      S.cloudK = lerp(k0, k1, f);
      S.night = range(S.sunAlt, -1, -10);
      S.stars = range(S.sunAlt, -4, -13);
      S.lamp = range(S.sunAlt, 1.5, -2.5);
      S.day = range(S.sunAlt, 4, 16);
      S.phase = a.phase;
      const up = range(Math.sin(mAlt), -0.01, 0.05);
      S.moonLight = ((1 - Math.cos(a.phase)) / 2) * up * S.night;
      S.moonCol.setRGB(0.95, 0.93, 0.88).multiplyScalar(up * lerp(0.16, 1, S.stars));
      if (Math.abs(S.sunAlt - envAlt) > 1.5 && t - envAt > 0.25) (envAlt = S.sunAlt), (envAt = t), S.version++;

      const m = meteor;
      if (S.stars > 0.6 && t > m.next) {
        m.at = t;
        m.dur = 0.6 + Math.random() * 0.6;
        m.next = t + 25 + Math.random() * 45;
        const yaw = (Math.random() - 0.4) * 0.8, alt = 0.12 + Math.random() * 0.14;
        m.from.set(Math.sin(yaw) * Math.cos(alt), Math.sin(alt), -Math.cos(yaw) * Math.cos(alt));
        m.path.set(Math.random() < 0.5 ? -1 : 1, -0.6 - Math.random() * 0.5, 0).normalize().multiplyScalar(0.08 + Math.random() * 0.1);
      }
      const k = (t - m.at) / m.dur;
      S.meteor = k > 0 && k < 1 ? Math.sin(Math.PI * k) * S.stars : 0;
      S.meteorA.copy(m.from).addScaledVector(m.path, k).normalize();
      S.meteorB.copy(m.from).addScaledVector(m.path, Math.max(k - 0.35, 0)).normalize();
    },
  };
  S.update(0);
  return S;
}
