import * as THREE from "three";
import { mobile, TAU, lerp, rng, range } from "./kit.js";

export const LIGHT = new THREE.Vector3(-0.12, -1, 0.18).normalize();
const SEA = { top: new THREE.Color("#a9dde6"), mid: new THREE.Color("#2a7f92"), hor: new THREE.Color("#0d4560"), sun: new THREE.Color("#d8f2f5"), cloud: new THREE.Color(0) };
const MOONLIGHT = new THREE.Color("#9db4e0"), FILL_DAY = new THREE.Color(0x8fa6cf), FILL_NIGHT = new THREE.Color(0x26355c);

const WAVES = [[0, 38, 0.34, 0.55], [24, 23, 0.22, 0.6], [-31, 15, 0.14, 0.6], [58, 9.5, 0.075, 0.55], [-62, 6.4, 0.05, 0.5], [12, 4.3, 0.032, 0.5], [-12, 2.9, 0.02, 0.45], [85, 2.1, 0.013, 0.4]]
  .map(([deg, L, A, q]) => {
    const a = (deg * Math.PI) / 180, k = TAU / L;
    return { D: [Math.sin(a), Math.cos(a)], k, A, Q: q / (k * A * 8), w: Math.sqrt(9.81 * k) };
  });
const SPEED = 0.85;

export const SKY_GLSL = `
  uniform vec3 uTop, uMid, uHor, uSunCol, uSunDir, uCloudLo, uMoonDir, uMoonCol, uMeteorA, uMeteorB;
  uniform float uClouds, uCloudK, uStars, uPhase, uMeteor, uLights;
  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5; }
    return s;
  }
  vec3 skyColor(vec3 d, float t, float detail) {
    float h = d.y, s = max(dot(d, uSunDir), 0.0), c = 0.0;
    vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.2, h));
    col = mix(col, uTop, smoothstep(0.2, 0.75, h));
    col = mix(col, uHor * 0.6, smoothstep(-0.02, -0.3, h));
    if (h > 0.0 && uClouds > 0.0) {
      float n = fbm(d.xz / (h + 0.12) * 0.8 + vec2(t * 0.008, t * 0.0025));
      c = smoothstep(0.5, 0.78, n) * smoothstep(0.01, 0.14, h) * uClouds;
      vec3 cloud = mix(uCloudLo, uHor * 1.5 + uSunCol * 0.3, mix(0.6, 0.12 + 0.88 * pow(s, 3.0), uCloudK));
      cloud *= 0.6 + 0.4 * smoothstep(0.85, 0.55, n);
      cloud += uMoonCol * 0.05 * pow(max(dot(d, uMoonDir), 0.0), 10.0);
      col = mix(col, cloud, c);
    }
    col += uSunCol * (smoothstep(0.99975, 0.99988, s) * 1.4 + pow(s, 60.0) * 0.22 + pow(s, 6.0) * 0.06);
    if (detail < 0.5) return col;
    float clear = (1.0 - c) * smoothstep(0.0, 0.05, h);
    if (uStars > 0.0) {
      vec3 p = d * 240.0, g = floor(p), f = fract(p);
      float e = hash13(g);
      if (e > 0.97) {
        float b = pow((e - 0.97) / 0.03, 3.0), w = hash13(g + 5.0);
        vec3 o = vec3(hash13(g + 7.1), hash13(g + 3.7), hash13(g + 1.3)) * 0.5 + 0.25;
        col += mix(vec3(1.0, 0.86, 0.7), vec3(0.8, 0.88, 1.0), w) * smoothstep(0.14 + 0.12 * b, 0.0, length(f - o)) * (0.35 + 2.4 * b) * (0.7 + 0.3 * sin(t * (1.0 + 3.0 * w) + w * 40.0)) * uStars * clear;
      }
      float mw = dot(d, vec3(0.86, 0.48, 0.16));
      col += vec3(0.55, 0.6, 0.78) * exp(-mw * mw * 50.0) * (0.25 + 0.75 * fbm(d.xy * 9.0 + d.z * 5.0)) * 0.025 * uStars * clear;
      vec3 ab = uMeteorB - uMeteorA;
      float k = clamp(dot(d - uMeteorA, ab) / max(dot(ab, ab), 1e-9), 0.0, 1.0);
      col += vec3(0.85, 0.9, 1.0) * smoothstep(0.0015, 0.0, length(d - uMeteorA - ab * k)) * (1.0 - k) * uMeteor * clear * 1.5;
    }
    float m = dot(d, uMoonDir);
    if (m > 0.998) {
      vec3 X = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0))), Y = cross(X, uMoonDir);
      vec2 q = vec2(dot(d, X), dot(d, Y)) / 0.0105;
      float r2 = dot(q, q), veil = 1.0 - c * 0.85;
      if (r2 < 1.0) {
        vec3 n = vec3(q, sqrt(1.0 - r2));
        float lit = smoothstep(-0.03, 0.1, dot(n, vec3(sin(uPhase), 0.0, -cos(uPhase))));
        float albedo = 1.0 - 0.3 * smoothstep(0.45, 0.7, fbm(q * 1.6 + 4.0));
        col += uMoonCol * (lit * albedo * (0.7 + 0.3 * n.z) + 0.008) * smoothstep(1.0, 0.9, r2) * veil;
      }
      col += uMoonCol * exp(-sqrt(2.0 * (1.0 - m)) * 140.0) * 0.06 * (0.15 + 0.85 * (0.5 - 0.5 * cos(uPhase))) * smoothstep(0.9, 1.3, r2) * uStars * veil;
    }
    float yaw = atan(d.x, -d.z);
    float top = 0.0105 * smoothstep(-0.27, -0.42, yaw) * (0.55 + 0.45 * vnoise(vec2(yaw * 38.0, 1.0))) + 0.0022 * smoothstep(-0.255, -0.3, yaw);
    if (h < top && h > -0.03) {
      col = mix(col, mix(uHor, uMid, 0.35) * 0.5, smoothstep(top, top - 0.0008, h));
      vec2 cell = vec2(yaw * 330.0, h * 330.0), id = floor(cell);
      float on = step(0.7, hash12(id + 3.0)) * step(h, top - 0.0015) * step(-0.002, h);
      col += vec3(1.0, 0.72, 0.42) * on * smoothstep(0.38, 0.0, length(fract(cell) - 0.5)) * (0.85 + 0.15 * sin(t * 2.0 + id.x * 3.0)) * 0.9 * uLights;
    }
    return col;
  }`;

const GERSTNER_GLSL = `
  uniform vec4 uW[8];
  uniform float uQ[8];
  vec3 gerstner(vec2 x, float t, out vec3 n) {
    vec3 p = vec3(0.0);
    n = vec3(0.0, 1.0, 0.0);
    for (int i = 0; i < 8; i++) {
      vec2 D = uW[i].xy;
      float k = uW[i].z, A = uW[i].w, f = k * dot(D, x) - sqrt(9.81 * k) * t, c = cos(f), s = sin(f);
      p.xz += uQ[i] * A * D * c;
      p.y += A * s;
      n.xz -= D * (k * A * c);
      n.y -= uQ[i] * k * A * s;
    }
    n = normalize(n);
    return p;
  }`;

function waterNormals(size = 256) {
  const r = rng(3), waves = [];
  while (waves.length < 18) {
    const kx = Math.round((r() - 0.5) * 14), ky = Math.round((r() - 0.5) * 14);
    if (kx || ky) waves.push([kx, ky, r() * TAU, 1 / (kx * kx + ky * ky)]);
  }
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let dx = 0, dy = 0;
      for (const [kx, ky, ph, a] of waves) {
        const c = Math.cos(TAU * ((kx * x + ky * y) / size) + ph) * a;
        dx += c * kx;
        dy += c * ky;
      }
      const nx = -dx * 0.9, ny = -dy * 0.9, l = Math.hypot(nx, ny, 1);
      data.set([(nx / l) * 127.5 + 127.5, (ny / l) * 127.5 + 127.5, (1 / l) * 127.5 + 127.5, 255], (y * size + x) * 4);
    }
  }
  const t = new THREE.DataTexture(data, size, size);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

function radialGrid(rings, segs) {
  const pos = [0, 0, 0], idx = [], k = Math.log(590 / 1.47 + 1) / rings;
  for (let j = 1; j <= rings; j++) {
    const rad = 1.47 * (Math.exp(k * j) - 1);
    for (let i = 0; i < segs; i++) pos.push(Math.cos((i / segs) * TAU) * rad, 0, Math.sin((i / segs) * TAU) * rad);
  }
  for (let i = 0; i < segs; i++) idx.push(0, 1 + ((i + 1) % segs), 1 + i);
  for (let j = 0; j < rings - 1; j++) {
    for (let i = 0; i < segs; i++) {
      const a = 1 + j * segs + i, b = 1 + j * segs + ((i + 1) % segs);
      idx.push(a, b, b + segs, a, b + segs, a + segs);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

const baseUniforms = (c, dir) => ({ uTop: { value: c.top }, uMid: { value: c.mid }, uHor: { value: c.hor }, uSunCol: { value: c.sun }, uSunDir: { value: dir }, uCloudLo: { value: c.cloud }, uClouds: { value: 1 }, uCloudK: { value: 1 } });
const skyMaterial = (U, time, detail) => new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { ...U, uTime: time, uDetail: { value: detail } },
  vertexShader: "varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: SKY_GLSL + "uniform float uTime, uDetail; varying vec3 vDir; void main() { gl_FragColor = vec4(skyColor(normalize(vDir), uTime, uDetail), 1.0); }",
});

export function buildOcean(scene, renderer, time, sky) {
  const U = {
    ...baseUniforms(sky.colors, sky.sun), uMoonDir: { value: sky.moon }, uMoonCol: { value: sky.moonCol }, uPhase: { value: 0 },
    uStars: { value: 0 }, uLights: { value: 0 }, uMeteorA: { value: sky.meteorA }, uMeteorB: { value: sky.meteorB }, uMeteor: { value: 0 },
  };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), skyMaterial(U, time, 1));
  dome.renderOrder = -1;
  scene.add(dome);

  const water = {
    ...U, uTime: time, uNormals: { value: waterNormals() },
    uW: { value: WAVES.map((v) => new THREE.Vector4(v.D[0], v.D[1], v.k, v.A)) }, uQ: { value: WAVES.map((v) => v.Q) },
    uDeep: { value: sky.colors.deep }, uFoam: { value: sky.colors.foam }, uSeaUp: { value: new THREE.Color("#1d6276") }, uMoonGlint: { value: 0 },
    uLampPos: { value: new THREE.Vector3(0, -1e3, 0) }, uLampCol: { value: new THREE.Color(0) }, uIsle: { value: new THREE.Vector3(0, 0, -1) },
  };
  const sea = new THREE.Mesh(radialGrid(mobile ? 110 : 150, mobile ? 128 : 192), new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: water,
    vertexShader: GERSTNER_GLSL + `
      uniform float uTime;
      varying vec3 vW;
      varying vec2 vX;
      varying float vH;
      void main() {
        vec3 w = (modelMatrix * vec4(position, 1.0)).xyz, n;
        vec3 g = gerstner(w.xz, uTime * ${SPEED}, n) * exp(-length(w.xz - cameraPosition.xz) / 150.0);
        vX = w.xz;
        vH = g.y;
        vW = w + g;
        gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0);
      }`,
    fragmentShader: SKY_GLSL + GERSTNER_GLSL + `
      uniform float uTime, uMoonGlint;
      uniform sampler2D uNormals;
      uniform vec3 uDeep, uSeaUp, uFoam, uLampPos, uLampCol, uIsle;
      varying vec3 vW;
      varying vec2 vX;
      varying float vH;
      float glint(vec3 N, vec3 V, vec3 L, float sharp) {
        float h = max(dot(N, normalize(V + L)), 0.0);
        return pow(h, sharp) * 9.0 + pow(h, sharp * 0.115) * 0.35;
      }
      void main() {
        vec3 toCam = cameraPosition - vW;
        float dist = length(toCam), fade = exp(-length(vX - cameraPosition.xz) / 150.0);
        vec3 V = toCam / dist, N;
        gerstner(vX, uTime * ${SPEED}, N);
        N = normalize(mix(vec3(0.0, 1.0, 0.0), N, fade));
        vec2 r1 = texture2D(uNormals, vX * 0.09 + uTime * vec2(0.011, 0.019)).xy * 2.0 - 1.0;
        vec2 r2 = texture2D(uNormals, vX * 0.23 - uTime * vec2(0.017, 0.008)).xy * 2.0 - 1.0;
        N = normalize(N + vec3(r1.x + r2.x, 0.0, r1.y + r2.y) * 0.35 * exp(-dist / 70.0));
        vec3 col;
        if (gl_FrontFacing) {
          vec3 L = uSunDir, R = reflect(-V, N);
          R.y = abs(R.y);
          vec3 refl = skyColor(R, uTime, 0.0);
          float F = 0.02 + 0.98 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
          float crest = clamp(vH * 1.8 + 0.3, 0.0, 1.0), back = pow(clamp(dot(-V, L), 0.0, 1.0), 3.0);
          col = mix(uDeep + vec3(0.05, 0.32, 0.26) * uSunCol * back * crest * crest * 0.18, refl, F);
          col += (uSunCol * glint(N, V, L, 700.0) + uMoonCol * uMoonGlint * glint(N, V, uMoonDir, 600.0)) * (0.3 + F);
          col += uLampCol * glint(N, V, normalize(uLampPos - vW), 500.0) * (0.3 + F);
          float foam = smoothstep(0.55, 0.85, vH + 0.25 * vnoise(vX * 2.1 + uTime * 0.3)) * fade;
          col = mix(col, refl * 0.5 + uFoam, foam * 0.35);
          float di = length(vX - uIsle.xy) - uIsle.z;
          float surf = smoothstep(7.0, 0.0, di) * (0.5 + 0.5 * sin(uTime * 1.1 - di * 0.8)) * smoothstep(0.3, 0.75, vnoise(vX * 0.45 + uTime * 0.25));
          col = mix(col, refl * 0.3 + uFoam * 1.3, surf * 0.75);
          col = mix(col, skyColor(normalize(vec3(-V.x, 0.015, -V.z)), uTime, 0.0), smoothstep(60.0, 650.0, dist));
        } else {
          vec3 T = refract(-V, -N, 1.333);
          if (dot(T, T) < 1e-4) col = uSeaUp * 0.55;
          else col = mix(skyColor(T, uTime, 0.0) * 1.1, uSeaUp * 0.55, 0.02 + 0.98 * pow(1.0 - clamp(dot(T, N), 0.0, 1.0), 5.0));
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  sea.frustumCulled = false;
  scene.add(sea);

  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  const fill = new THREE.HemisphereLight(0x7d8bb8, 0x0a0c12, 0.5);
  scene.add(sun, sun.target, fill);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envOf = (m) => pmrem.fromScene(new THREE.Scene().add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), m)), 0.04);
  const envSea = envOf(skyMaterial({ ...baseUniforms(SEA, new THREE.Vector3(0, 1, 0)), uClouds: { value: 0 } }, { value: 0 }, 0)).texture;
  const envSkyMat = skyMaterial(U, { value: 0 }, 0);
  let envSky = null, envVersion = -1;

  const teal = new THREE.Color("#7fc4d4"), seaFill = new THREE.Color("#2f6f86"), seen = new THREE.Vector2();
  function hazy(mat) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U, { uTime: time });
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vHaze;").replace("#include <project_vertex>", `#include <project_vertex>
        vec4 hz = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          hz = instanceMatrix * hz;
        #endif
        vHaze = (modelMatrix * hz).xyz;`);
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\n${SKY_GLSL}\nuniform float uTime;\nvarying vec3 vHaze;`).replace("#include <fog_fragment>", `
        vec3 hzV = cameraPosition - vHaze;
        gl_FragColor.rgb = mix(gl_FragColor.rgb, skyColor(normalize(vec3(-hzV.x, 0.015, -hzV.z)), uTime, 0.0), smoothstep(60.0, 650.0, length(hzV)));`);
    };
    return mat;
  }

  return {
    water, hazy,
    heightAt(x, z) {
      let y = 0;
      const t = time.value * SPEED;
      for (const v of WAVES) y += v.A * Math.sin(v.k * (v.D[0] * x + v.D[1] * z) - v.w * t);
      return y;
    },
    surfaceAt(x, z) {
      return this.heightAt(x, z) * Math.exp(-seen.set(x - sea.position.x, z - sea.position.z).length() / 150);
    },
    update(camera, under, depth) {
      U.uCloudK.value = sky.cloudK;
      U.uStars.value = sky.stars;
      U.uPhase.value = sky.phase;
      U.uMeteor.value = sky.meteor;
      U.uLights.value = sky.lamp;
      water.uMoonGlint.value = sky.moonLight;
      if (sky.version !== envVersion) {
        envVersion = sky.version;
        envSky?.dispose();
        envSky = envOf(envSkyMat);
      }
      dome.visible = !under;
      dome.position.copy(camera.position);
      sea.visible = camera.position.y > -14;
      sea.position.set(camera.position.x, 0, camera.position.z);
      scene.environment = under ? envSea : envSky.texture;
      sun.target.position.copy(camera.position);
      if (under) {
        const dim = lerp(1, 0.35, sky.night);
        sun.position.copy(camera.position).addScaledVector(LIGHT, -30);
        sun.color.copy(teal);
        sun.intensity = lerp(1.2, 0.04, Math.sqrt(depth)) * dim;
        fill.color.copy(seaFill);
        fill.intensity = lerp(0.8, 0.05, depth) * dim;
        scene.environmentIntensity = lerp(0.6, 0.04, depth) * dim;
      } else {
        const sunI = sky.sunAlt >= 3 ? lerp(1.6, 2.2, range(sky.sunAlt, 3, 25)) : 1.6 * range(sky.sunAlt, -2.5, 3), moonI = 0.5 * sky.moonLight;
        const byMoon = moonI > sunI;
        sun.position.copy(byMoon ? sky.moon : sky.sun).multiplyScalar(30).add(camera.position);
        sun.color.copy(byMoon ? MOONLIGHT : sky.colors.sun);
        sun.intensity = Math.max(sunI, moonI);
        fill.color.lerpColors(FILL_NIGHT, FILL_DAY, 1 - sky.night);
        fill.intensity = lerp(0.6, 0.16, sky.night) + 0.15 * sky.day;
        scene.environmentIntensity = 1;
      }
    },
  };
}
