import { mobile, clamp01, lerp } from "./kit.js";

const rand = Math.random;
const pick = (a, b) => a + rand() * (b - a);
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const CHORDS = {
  warm: [[50, 57, 64, 66], [47, 54, 57, 64], [43, 50, 54, 61], [45, 52, 59, 64]],
  dark: [[38, 45, 53, 64], [46, 41, 45, 50], [43, 38, 46, 57], [45, 40, 50, 55]],
  light: [[38, 45, 54, 57, 62]],
  calm: [[50, 54, 57, 61], [43, 50, 57, 59], [47, 54, 57, 62], [45, 52, 57, 61]],
};

export function soundEngine(ctx) {
  const sr = ctx.sampleRate;
  const gain = (v, to) => {
    const g = ctx.createGain();
    g.gain.value = v;
    if (to) g.connect(to);
    return g;
  };
  const filter = (type, f, Q, to) => {
    const b = ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = Q;
    if (to) b.connect(to);
    return b;
  };
  const osc = (type, f, to) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    if (to) o.connect(to);
    return o;
  };
  const stereo = (p, to) => {
    const s = ctx.createStereoPanner();
    s.pan.value = p;
    s.connect(to);
    return s;
  };
  const space = (ref, to) => {
    const p = ctx.createPanner();
    Object.assign(p, { panningModel: "HRTF", distanceModel: "inverse", refDistance: ref, rolloffFactor: 1, maxDistance: 1000 });
    p.connect(to);
    return p;
  };
  const source = (buf, to, rate = 1) => {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.playbackRate.value = rate;
    s.connect(to);
    return s;
  };
  const bed = (buf, to, rate) => source(buf, to, rate).start(0, rand() * buf.duration);
  const burst = (buf, to, t, dur) => {
    const s = source(buf, to);
    s.start(t, rand() * buf.duration);
    s.stop(t + dur);
  };
  const lfo = (f, depth, param) => {
    const o = osc("sine", f);
    o.connect(gain(depth)).connect(param);
    o.start();
  };

  function noise(seconds, kind) {
    const n = Math.floor(sr * seconds), F = Math.floor(sr * 0.05), b = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const src = new Float32Array(n + F), d = b.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, br = 0;
      for (let i = 0; i < n + F; i++) {
        const w = rand() * 2 - 1;
        if (kind === "white") src[i] = w * 0.5;
        else if (kind === "pink") {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          src[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        } else {
          br = (br + 0.02 * w) / 1.02;
          src[i] = br * 3.5;
        }
      }
      for (let i = 0; i < n; i++) d[i] = i < F ? src[i] * (i / F) + src[n + i] * (1 - i / F) : src[i];
    }
    return b;
  }
  function crackle(seconds, rate) {
    const n = Math.floor(sr * seconds), b = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = Math.floor(rand() * 200); i < n; i += 1 + Math.floor((-Math.log(1 - rand()) * sr) / rate)) {
        const amp = 0.04 + 0.96 * rand() ** 4, len = 4 + Math.floor(rand() * 36);
        for (let k = 0; k < len && i + k < n; k++) d[i + k] += (rand() * 2 - 1) * amp * Math.exp(-k / (len * 0.3));
      }
      let prev = 0;
      for (let i = 0; i < n; i++) {
        const x = d[i];
        d[i] = x - prev * 0.7;
        prev = x;
      }
    }
    return b;
  }
  function impulse(seconds) {
    const n = Math.floor(sr * seconds), b = ctx.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        lp += (0.55 * (1 - t) ** 2.2 + 0.03) * (rand() * 2 - 1 - lp);
        d[i] = lp * (1 - t) ** 2.5 * Math.min(1, i / (sr * 0.012));
      }
    }
    return b;
  }
  const white = noise(4, "white"), pink = noise(6, "pink"), brown = noise(6, "brown"), crack = crackle(5, 420);

  const comp = ctx.createDynamicsCompressor();
  Object.entries({ threshold: -18, knee: 12, ratio: 3, attack: 0.02, release: 0.35 }).forEach(([k, v]) => (comp[k].value = v));
  comp.connect(ctx.destination);
  const master = gain(0, comp);
  const verb = ctx.createConvolver();
  verb.buffer = impulse(mobile ? 3.2 : 4.6);
  verb.connect(gain(0.8, master));
  const air = gain(0), airLP = filter("lowpass", 18000, 0.5, master);
  air.connect(airLP);
  air.connect(gain(0.1, verb));
  const water = gain(0), waterLP = filter("lowpass", 1500, 0.6, master);
  water.connect(waterLP);
  water.connect(gain(0.35, verb));

  const washG = gain(0.5, air);
  bed(pink, filter("lowpass", 900, 0.4, washG));
  lfo(0.071, 0.2, washG.gain);
  lfo(0.113, 0.12, washG.gain);
  const windF = filter("bandpass", 520, 0.55), windG = gain(0.18, air);
  windF.connect(windG);
  bed(pink, windF, 0.8);
  lfo(0.043, 260, windF.frequency);
  lfo(0.067, 0.07, windG.gain);

  const rumbleF = filter("lowpass", 200, 0.6), rumbleG = gain(0.7, water), rumbleBreath = gain(1, rumbleG);
  rumbleF.connect(rumbleBreath);
  bed(brown, rumbleF);
  lfo(0.06, 0.3, rumbleBreath.gain);
  const swellF = filter("bandpass", 420, 0.9), swellG = gain(0.15, water), swellBreath = gain(1, swellG);
  swellF.connect(swellBreath);
  bed(pink, swellF, 0.9);
  lfo(0.083, 0.5, swellBreath.gain);
  const crackG = gain(0, master);
  crackG.connect(gain(0.25, verb));
  bed(crack, filter("highpass", 1800, 0.6, filter("lowpass", 7000, 0.5, crackG)));
  const flowF = filter("bandpass", 380, 0.8), flowG = gain(0, water);
  flowF.connect(flowG);
  bed(pink, flowF, 1.1);

  const schoolP = space(5, water);
  schoolP.connect(gain(0.3, verb));
  const schoolG = gain(0, schoolP);
  bed(pink, filter("bandpass", 1000, 0.5, schoolG), 1.2);

  const music = gain(0), padLP = filter("lowpass", 1000, 0.4, music);
  music.connect(gain(0.5, master));
  music.connect(gain(0.9, verb));
  const voices = Array.from({ length: 5 }, (_, i) => {
    const g = gain(0, padLP), trem = gain(1, g), a = osc("triangle", 110, trem), b = osc("sine", 110, trem);
    b.detune.value = 6 + i;
    a.start();
    b.start();
    lfo(0.07 + i * 0.023, 0.15, trem.gain);
    return { a, b, g };
  });
  function chord(notes, t) {
    voices.forEach((v, i) => {
      const n = notes[i];
      if (n != null) for (const o of [v.a, v.b]) o.frequency.setTargetAtTime(midi(n), t, 2.2);
      v.g.gain.setTargetAtTime(n != null ? 0.04 : 0, t, 2.5);
    });
  }
  const shimmer = gain(0);
  shimmer.connect(gain(0.3, master));
  shimmer.connect(verb);
  [76, 81, 86].forEach((n, i) => {
    const o = osc("sine", midi(n), gain(0.33, shimmer));
    o.start();
    lfo(0.2 + i * 0.07, 3, o.detune);
  });
  const deepG = gain(0, master);
  [[36.71, 1], [55, 0.6], [73.42, 0.3]].forEach(([f, k]) => osc("sine", f, gain(k, deepG)).start());

  const calmG = gain(0, master), calmBreath = gain(1, calmG);
  calmG.connect(gain(0.5, verb));
  bed(brown, filter("lowpass", 380, 0.5, calmBreath), 0.7);
  lfo(0.045, 0.45, calmBreath.gain);

  const bellP = space(30, air);
  bellP.connect(gain(0.4, verb));

  function bubble(t, f, dur, amp, p, dest) {
    const g = gain(0, stereo(p, dest)), o = osc("sine", f, g);
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * pick(1.6, 2.6), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.start(t);
    o.stop(t + dur + 0.03);
  }
  function wave(t) {
    const p = stereo(pick(-0.8, 0.8), air), g = gain(0, p), f = filter("bandpass", 260, 0.6, g);
    const peak = pick(1.4, 2.6), top = pick(700, 1400), a = pick(0.5, 0.9);
    burst(white, f, t, peak + 4.2);
    f.frequency.setValueAtTime(260, t);
    f.frequency.exponentialRampToValueAtTime(top, t + peak);
    f.frequency.exponentialRampToValueAtTime(320, t + peak + 3.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(a, t + peak);
    g.gain.exponentialRampToValueAtTime(0.0001, t + peak + 4);
    const g2 = gain(0, p);
    burst(white, filter("highpass", 2600, 0.5, g2), t + peak * 0.8, peak * 0.2 + 3.4);
    g2.gain.setValueAtTime(0.0001, t + peak * 0.8);
    g2.gain.exponentialRampToValueAtTime(a * 0.25, t + peak + 0.25);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + peak + 3.2);
  }
  function lap(t) {
    const g = gain(0, stereo(pick(-0.7, 0.7), air)), d = pick(0.08, 0.33), a = pick(0.08, 0.2);
    burst(white, filter("lowpass", pick(500, 1400), 1.2, g), t, d + 0.05);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(a, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0005, t + d);
    if (rand() < 0.25) {
      const g3 = gain(0, air), o = osc("sine", 240, g3);
      o.frequency.setValueAtTime(pick(200, 280), t);
      o.frequency.exponentialRampToValueAtTime(pick(90, 120), t + 0.12);
      g3.gain.setValueAtTime(0, t);
      g3.gain.linearRampToValueAtTime(0.06, t + 0.01);
      g3.gain.exponentialRampToValueAtTime(0.0005, t + 0.14);
      o.start(t);
      o.stop(t + 0.16);
    }
  }
  function gulls(t) {
    const far = stereo(pick(-0.8, 0.8), air), n = 2 + Math.floor(rand() * 3), base = pick(1250, 1600);
    far.connect(gain(0.5, verb));
    for (let k = 0; k < n; k++) {
      const t0 = t + k * pick(0.28, 0.42), d = pick(0.22, 0.32), g = gain(0, far);
      const o = osc("sawtooth", base, filter("bandpass", 2300, 2.2, filter("lowpass", 4200, 0.7, g)));
      o.frequency.setValueAtTime(base, t0);
      o.frequency.linearRampToValueAtTime(base * 1.45, t0 + 0.05);
      o.frequency.exponentialRampToValueAtTime(base * 0.85, t0 + d);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.09, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0005, t0 + d);
      o.start(t0);
      o.stop(t0 + d + 0.02);
    }
  }
  function splash(t, down) {
    const g = gain(0, master), f = filter("lowpass", 6000, 0.7, g);
    burst(white, f, t, 1.6);
    f.frequency.setValueAtTime(down ? 6000 : 3000, t);
    f.frequency.exponentialRampToValueAtTime(down ? 300 : 900, t + (down ? 0.9 : 0.5));
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(down ? 0.55 : 0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + (down ? 1.4 : 0.8));
    if (down) {
      const th = gain(0, master), o = osc("sine", 110, th);
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
      th.gain.setValueAtTime(0, t);
      th.gain.linearRampToValueAtTime(0.45, t + 0.01);
      th.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.start(t);
      o.stop(t + 0.55);
    }
    for (let i = 0, n = down ? 70 : 24; i < n; i++) bubble(t + 0.05 + rand() ** 1.6 * (down ? 1.8 : 0.7), 260 + rand() ** 2 * 1700, pick(0.02, 0.11), pick(0.03, 0.08), pick(-0.8, 0.8), master);
  }
  function bell(t, amp) {
    const g = gain(amp, bellP);
    for (const [ratio, a, dec] of [[0.5, 0.35, 4.5], [1, 1, 3.2], [1.19, 0.5, 2.6], [1.5, 0.3, 2], [2, 0.42, 1.6], [2.74, 0.2, 1.1], [3.4, 0.12, 0.8]]) {
      const pg = gain(0, g), o = osc("sine", 520 * ratio * pick(0.998, 1.002), pg);
      pg.gain.setValueAtTime(0, t);
      pg.gain.linearRampToValueAtTime(a, t + 0.003);
      pg.gain.exponentialRampToValueAtTime(0.0005, t + dec);
      o.start(t);
      o.stop(t + dec + 0.05);
    }
  }
  function plash(t, at, size) {
    const pn = space(20, air), g = gain(0, pn), f = filter("lowpass", 2400, 0.7, g);
    place(pn, at);
    burst(white, f, t, 0.7);
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35 * size, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  }
  function rising(t) {
    const p = pick(-0.8, 0.8), n = 8 + Math.floor(rand() * 25), span = pick(0.8, 2.8);
    for (let i = 0; i < n; i++) bubble(t + (i / n) * span + rand() * 0.05, pick(500, 1400), pick(0.015, 0.065), pick(0.04, 0.08), p + pick(-0.15, 0.15), water);
  }
  function creak(t) {
    const g = gain(0), f = filter("bandpass", pick(240, 560), 28, g), f0 = f.frequency.value;
    g.connect(gain(0.3, master));
    g.connect(verb);
    burst(white, f, t, 3.2);
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f0 * pick(0.7, 1.2), t + 2.6);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(pick(1.6, 2.6), t + pick(0.5, 1.2));
    g.gain.linearRampToValueAtTime(0, t + 3);
  }

  const place = (pn, v) => {
    if (pn.positionX) {
      pn.positionX.value = v.x;
      pn.positionY.value = v.y;
      pn.positionZ.value = v.z;
    } else pn.setPosition(v.x, v.y, v.z);
  };
  function listen(cam) {
    const e = cam.matrixWorld.elements, L = ctx.listener, p = cam.position;
    if (L.positionX) {
      [L.positionX.value, L.positionY.value, L.positionZ.value] = [p.x, p.y, p.z];
      [L.forwardX.value, L.forwardY.value, L.forwardZ.value] = [-e[8], -e[9], -e[10]];
      [L.upX.value, L.upY.value, L.upZ.value] = [e[4], e[5], e[6]];
    } else {
      L.setPosition(p.x, p.y, p.z);
      L.setOrientation(-e[8], -e[9], -e[10], e[4], e[5], e[6]);
    }
  }

  const next = { wave: 0.3, lap: 0, gull: 5, bell: 2, bubbles: 3, creak: 8, chord: 0 };
  let wasUnder = null, lastSplash = -9, zone = "", ci = 0, lastSet = -1, lastUi = -1;
  return {
    ctx, master,
    focus: false,
    update(s) {
      const t = ctx.currentTime, calm = this.focus;
      listen(s.cam);
      place(schoolP, s.school.pos);
      place(bellP, s.bell);
      if (wasUnder !== null && s.under !== wasUnder && t - lastSplash > 0.6 && !calm) {
        splash(t + 0.01, s.under);
        lastSplash = t;
      }
      wasUnder = s.under;

      if (calm);
      else if (!s.under) {
        if (t > next.wave) (wave(t + 0.05), (next.wave = t + pick(4.5, 8.5)));
        if (t > next.lap) (lap(t + 0.02), (next.lap = t + pick(0.35, 1.6)));
        if (t > next.gull) (s.night < 0.5 && gulls(t + 0.05), (next.gull = t + pick(9, 22)));
        if (t > next.bell) {
          bell(t + 0.02, pick(0.07, 0.13));
          if (rand() < 0.3) bell(t + pick(0.3, 0.45), pick(0.03, 0.06));
          next.bell = t + pick(3, 9);
        }
        for (const e of s.events) plash(t + 0.02, e, e.size);
      } else {
        if (t > next.bubbles) {
          if (rand() < 0.35 + 0.65 * clamp01(1 - s.depth * 1.8)) rising(t + 0.05);
          next.bubbles = t + pick(5, 12);
        }
        if (s.depth > 0.6 && t > next.creak) (creak(t + 0.05), (next.creak = t + pick(12, 26)));
      }

      const z = calm ? "calm" : !s.under ? "" : s.rays > 0.35 ? "light" : s.depth > 0.55 ? "dark" : "warm";
      if (z !== zone || (z && t > next.chord)) {
        ci = z === zone ? ci + 1 : 0;
        zone = z;
        if (z) chord(CHORDS[z][ci % CHORDS[z].length], t);
        next.chord = t + (calm ? 20 : 16);
      }

      if (t - lastSet < 0.08) return;
      lastSet = t;
      const set = (param, v, tau) => param.setTargetAtTime(v, t, tau);
      const live = calm ? 0 : 1, u = s.under ? 1 : 0, d = s.depth, sp = clamp01(s.speed / 4);
      set(air.gain, live * (1 - u), u || calm ? 0.25 : 0.3);
      set(airLP.frequency, u ? 400 : 18000, 0.05);
      set(water.gain, live * u, u && !calm ? 0.15 : 0.25);
      set(rumbleF.frequency, lerp(210, 85, d), 0.5);
      set(rumbleG.gain, lerp(0.7, 0.3, d), 0.8);
      set(swellG.gain, 0.15 * clamp01(1 - d * 1.8), 0.5);
      set(crackG.gain, live * u * 0.5 * clamp01(1 - d * 2.2), 0.3);
      set(flowG.gain, live * u * 0.6 * sp, 0.12);
      set(flowF.frequency, 300 + 600 * sp, 0.12);
      set(music.gain, calm ? 0.42 : u * 0.8, calm ? 1.2 : 2);
      set(padLP.frequency, calm ? 760 : lerp(1100, 420, d), 1);
      set(shimmer.gain, live * u * s.rays * 0.03 * (1 + s.hover), 0.8);
      set(deepG.gain, live * u * 0.1 * clamp01((d - 0.6) / 0.3), 1);
      set(schoolG.gain, live * u * (s.school.on ? 0.06 + 0.6 * s.school.activity : 0), 0.25);
      set(calmG.gain, calm ? 0.12 : 0, 1.2);
    },
    ui(kind) {
      const t = ctx.currentTime + 0.005;
      if (kind === "hover") {
        if (t - lastUi < 0.12) return;
        lastUi = t;
        bubble(t, pick(900, 1300), 0.035, 0.03, pick(-0.2, 0.2), master);
      } else {
        bubble(t, pick(500, 700), 0.07, 0.06, 0, master);
        bubble(t + 0.04, pick(900, 1200), 0.04, 0.03, 0.1, master);
      }
    },
  };
}

export function buildSound() {
  let A = null, enabled = false, focus = false, video = false, volume = 0.8, sleep = 0;
  const level = (tau = 0.6) => {
    if (!A) return;
    const v = enabled && !document.hidden && !video ? volume : 0;
    A.master.gain.setTargetAtTime(v * 0.9, A.ctx.currentTime, v ? tau : 0.06);
    clearTimeout(sleep);
    if (v) A.ctx.resume();
    else sleep = setTimeout(() => A.ctx.suspend(), 900);
  };
  document.addEventListener("visibilitychange", () => level());
  return {
    get on() { return enabled; },
    start() {
      try {
        A ??= soundEngine(new (window.AudioContext || window.webkitAudioContext)());
      } catch {
        return;
      }
      A.focus = focus;
      enabled = true;
      level(0.8);
    },
    stop() {
      enabled = false;
      level();
    },
    volume(v) {
      volume = v;
      level(0.05);
    },
    focus(on) {
      focus = on;
      if (A) A.focus = on;
    },
    video(on) {
      if (video === on) return;
      video = on;
      level(1);
    },
    ui(kind) {
      if (enabled && !video && A?.ctx.state === "running") A.ui(kind);
    },
    update(s) {
      if (enabled && A?.ctx.state === "running") A.update(s);
    },
  };
}
