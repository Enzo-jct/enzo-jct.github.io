import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { mobile } from "./kit.js";
import { LIGHT } from "./ocean.js";

const DAY = { up: new THREE.Color("#8fdbe6"), side: new THREE.Color("#1a6a82"), down: new THREE.Color("#021422"), shaft: new THREE.Color("#9fe2ea") };
const NIGHT = { up: new THREE.Color("#3a6390"), side: new THREE.Color("#0a2744"), down: new THREE.Color("#010811"), shaft: new THREE.Color("#7e9bd0") };
const VERT = "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const WORLD = `
  uniform mat4 uInvProj, uCamWorld;
  vec3 worldAt(vec2 uv, float d) { vec4 v = uInvProj * vec4(vec3(uv, d) * 2.0 - 1.0, 1.0); return (uCamWorld * (v / v.w)).xyz; }`;

const CAUSTICS = `
  uniform float uTime;
  varying vec2 vUv;
  vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
  float edges(vec2 uv, float n, float t) {
    vec2 p = uv * n, g = floor(p), f = fract(p);
    float d1 = 8.0, d2 = 8.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y)), h = hash22(mod(g + o, n));
      float d = length(o + 0.5 + 0.42 * sin(t * (0.5 + h * 0.6) + h * 6.2831) - f);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    return d2 - d1;
  }
  void main() {
    vec2 uv = vUv + 0.02 * vec2(sin(6.2831 * 2.0 * vUv.y + uTime * 0.7), sin(6.2831 * 2.0 * vUv.x + uTime * 0.6));
    float a = edges(uv, 7.0, uTime * 0.8), b = edges(uv + 0.37, 11.0, uTime * 1.05 + 3.0);
    float c = pow(1.0 - smoothstep(0.0, 0.16, a), 2.0) * 0.8 + pow(1.0 - smoothstep(0.0, 0.11, b), 2.0) * 0.5;
    gl_FragColor = vec4(vec3(c), 1.0);
  }`;

const SHAFTS = (steps) => `
  uniform sampler2D tDepth;
  uniform vec2 uSrc;
  uniform float uFrame, uTime, uAspect;
  varying vec2 vUv;
  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    vec2 d = (vUv - uSrc) * vec2(uAspect, 1.0);
    float a = atan(d.x, -d.y);
    float n = vnoise(vec2(a * 8.0 + uTime * 0.15, uTime * 0.07)) * 0.75 + vnoise(vec2(a * 15.0 - uTime * 0.21, 7.3 + uTime * 0.11)) * 0.25;
    float fan = smoothstep(0.56, 0.9, n);
    vec2 stp = (uSrc - vUv) / ${steps}.0;
    vec2 uv = vUv + stp * fract(52.9829189 * fract(dot(gl_FragCoord.xy + uFrame * 5.588238, vec2(0.06711056, 0.00583715))));
    float acc = 0.0, w = 1.0;
    for (int i = 0; i < ${steps}; i++) {
      acc += (uv.y > 1.0 || texture2D(tDepth, uv).x > 0.998 ? 1.0 : 0.0) * w;
      w *= 0.97;
      uv += stp;
    }
    gl_FragColor = vec4(vec3(acc / ${steps}.0 * fan), 1.0);
  }`;

const COMPOSITE = WORLD + `
  uniform sampler2D tColor, tDepth, tShafts, tCaustic;
  uniform vec3 uCam, uL, uSigma, uUp, uSide, uDown, uShaftCol;
  uniform float uUnder, uLight, uCaust, uShaft, uFade, uSplash, uRays, uTime, uAspect;
  uniform vec2 uSrc;
  varying vec2 vUv;
  void main() {
    vec3 col = texture2D(tColor, vUv).rgb;
    if (uUnder > 0.5) {
      float d = texture2D(tDepth, vUv).x;
      vec3 P = worldAt(vUv, d), V = P - uCam;
      float len = length(V);
      vec3 dir = V / max(len, 1e-4);
      vec3 water = mix(uDown, uSide, smoothstep(-0.6, 0.05, dir.y));
      water = mix(water, uUp, smoothstep(0.05, 0.95, dir.y)) * uLight;
      if (d >= 1.0) col = water + col;
      else {
        vec3 n = cross(dFdx(P), dFdy(P));
        float nl = length(n), up = nl > 1e-9 ? n.y / nl : 0.0;
        up = clamp(dot(n, dir) > 0.0 ? -up : up, 0.0, 1.0);
        vec2 q = P.xz - P.y * (uL.xz / uL.y);
        float c = texture2D(tCaustic, q * 0.11).r * 0.65 + texture2D(tCaustic, q * 0.067 + 0.29).r * 0.45;
        float k = c * up * uCaust * exp(min(P.y, 0.0) * 0.09);
        col = col * (1.0 + k) + uShaftCol * k * 0.02 * uLight;
        vec3 T = exp(-uSigma * len);
        col = col * T + water * (1.0 - T);
      }
      col += texture2D(tShafts, vUv).rgb * uShaftCol * uShaft * uLight * (1.0 - exp(-len * 0.09));
    }
    if (any(greaterThanEqual(floatBitsToUint(col) & uvec3(0x7fffffffu), uvec3(0x7f800000u)))) col = vec3(0.0);
    gl_FragColor = vec4(max(col, 0.0), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    vec3 c = mix(gl_FragColor.rgb, vec3(0.62, 0.82, 0.86), uSplash);
    if (uRays > 0.0) {
      vec2 d = (vUv - uSrc) * vec2(uAspect, 1.0);
      float a = atan(d.x, -d.y), l = length(d);
      float r = pow(max(0.5 + 0.5 * sin(a * 9.0 + uTime * 0.2), 0.0), 7.0)
              + 0.6 * pow(max(0.5 + 0.5 * sin(a * 14.0 - uTime * 0.14 + 1.7), 0.0), 10.0);
      float breathe = 0.75 + 0.25 * sin(uTime * 0.31) * sin(uTime * 0.17 + 1.0);
      c += vec3(0.42, 0.72, 0.74) * (r * breathe * smoothstep(1.0, 0.0, abs(a)) * exp(-(l - 0.3) * 1.3) * 0.06 + exp(-l * 2.4) * 0.2) * uRays;
    }
    vec2 v = vUv - 0.5;
    gl_FragColor = vec4(c * (1.0 - dot(v, v) * 0.7) * uFade, 1.0);
  }`;

export function buildPost(renderer, camera, time) {
  const hdr = { type: THREE.HalfFloatType };
  const sceneRT = new THREE.WebGLRenderTarget(1, 1, { ...hdr, samples: mobile ? 0 : 4, depthTexture: new THREE.DepthTexture(1, 1) });
  const shaftRT = new THREE.WebGLRenderTarget(1, 1, { ...hdr, depthBuffer: false });
  const causticRT = new THREE.WebGLRenderTarget(256, 256, { depthBuffer: false, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const view = { uInvProj: { value: camera.projectionMatrixInverse }, uCamWorld: { value: camera.matrixWorld }, uCam: { value: camera.position }, uL: { value: LIGHT } };
  const caustics = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: { uTime: time }, vertexShader: VERT, fragmentShader: CAUSTICS }));
  const shafts = new FullScreenQuad(new THREE.ShaderMaterial({
    uniforms: { tDepth: { value: sceneRT.depthTexture }, uSrc: { value: new THREE.Vector2(0.56, 1.45) }, uFrame: { value: 0 }, uTime: time, uAspect: { value: 1 } },
    vertexShader: VERT, fragmentShader: SHAFTS(mobile ? 16 : 32),
  }));
  const u = {
    ...view, tColor: { value: sceneRT.texture }, tDepth: { value: sceneRT.depthTexture }, tShafts: { value: shaftRT.texture }, tCaustic: { value: causticRT.texture },
    uSigma: { value: new THREE.Vector3(0.075, 0.038, 0.03) },
    uUp: { value: DAY.up.clone() }, uSide: { value: DAY.side.clone() }, uDown: { value: DAY.down.clone() }, uShaftCol: { value: DAY.shaft.clone() },
    uUnder: { value: 0 }, uLight: { value: 1 }, uCaust: { value: 2.4 }, uShaft: { value: 0.2 },
    uFade: { value: 0 }, uSplash: { value: 0 }, uRays: { value: 0 }, uTime: time, uAspect: { value: 1 },
    uSrc: { value: new THREE.Vector2(mobile ? 0.55 : 0.42, 1.3) },
  };
  const comp = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: u, vertexShader: VERT, fragmentShader: COMPOSITE }));
  const size = new THREE.Vector2();
  let frame = 0;
  return {
    u,
    night(n) {
      u.uUp.value.lerpColors(DAY.up, NIGHT.up, n);
      u.uSide.value.lerpColors(DAY.side, NIGHT.side, n);
      u.uDown.value.lerpColors(DAY.down, NIGHT.down, n);
      u.uShaftCol.value.lerpColors(DAY.shaft, NIGHT.shaft, n);
    },
    resize() {
      renderer.getDrawingBufferSize(size);
      sceneRT.setSize(size.x, size.y);
      shaftRT.setSize(Math.ceil(size.x / 4), Math.ceil(size.y / 4));
      u.uAspect.value = shafts.material.uniforms.uAspect.value = size.x / size.y;
    },
    render(scene) {
      const under = u.uUnder.value > 0.5;
      if (under) {
        renderer.setRenderTarget(causticRT);
        caustics.render(renderer);
      }
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      if (under) {
        shafts.material.uniforms.uFrame.value = frame++ % 64;
        renderer.setRenderTarget(shaftRT);
        shafts.render(renderer);
      }
      renderer.setRenderTarget(null);
      comp.render(renderer);
    },
  };
}
