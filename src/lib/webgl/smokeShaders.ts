
export const smokeVertexShader = `#version 300 es
in vec2 a_position;
out vec2 vUv;

void main() {
    vUv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const smokeFragmentShader = `#version 300 es
precision highp float;
out vec4 outColor;
in vec2 vUv;

uniform vec2  uRes;
uniform float uTime;
uniform float uDensity;
uniform float uWarp;
uniform float uSpeed;
uniform int   uSteps;
uniform vec3  uColor; // Added for customization

float hash31(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash31(i + vec3(0,0,0));
  float n100 = hash31(i + vec3(1,0,0));
  float n010 = hash31(i + vec3(0,1,0));
  float n110 = hash31(i + vec3(1,1,0));
  float n001 = hash31(i + vec3(0,0,1));
  float n101 = hash31(i + vec3(1,0,1));
  float n011 = hash31(i + vec3(0,1,1));
  float n111 = hash31(i + vec3(1,1,1));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);

  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);

  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
  float a = 0.0;
  float w = 0.58;
  float f = 1.0;
  for (int i = 0; i < 5; i++) {
    a += w * noise3(p * f);
    f *= 2.02;
    w *= 0.52;
  }
  return a;
}

vec3 domainWarp(vec3 p, float t, float warpAmount) {
  float w = warpAmount;
  float a = fbm(p + vec3(0.0, 0.0, t));
  float b = fbm(p + vec3(21.7, 9.3, t * 0.7));
  float c = fbm(p + vec3(12.4, 34.1, t * 0.9));
  return p + w * vec3(a, b, c);
}

// FULL-WIDTH smoke: no "core" (no radial multiplier)
float densityField(vec3 p, float t, float speed, float warpAmount) {
  float rise = t * (0.45 + 0.9 * speed);
  vec3 q = p;

  // Upward motion
  q.y -= rise;

  // Slow horizontal drift so the smoke doesn't look like a centered column
  q.x += 0.15 * sin(t * 0.18 + p.y * 0.35);
  q.z += 0.12 * cos(t * 0.16 + p.y * 0.30);

  q = domainWarp(q * 1.10, t * 0.22, warpAmount);

  float n = fbm(q * 1.20);

  float h = smoothstep(-0.25, 1.20, p.y);
  float bottom = 1.0 - h;

  float d = n * (0.22 + 1.05 * bottom);
  d = smoothstep(0.30, 0.92, d);
  return d;
}

bool rayBox(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax, out float t0, out float t1) {
  vec3 inv = 1.0 / rd;
  vec3 tbot = (bmin - ro) * inv;
  vec3 ttop = (bmax - ro) * inv;
  vec3 tmin = min(ttop, tbot);
  vec3 tmax = max(ttop, tbot);
  t0 = max(max(tmin.x, tmin.y), tmin.z);
  t1 = min(min(tmax.x, tmax.y), tmax.z);
  return t1 > max(t0, 0.0);
}

void main() {
  vec2 fragCoord = vUv * uRes;
  vec2 uv = (fragCoord / uRes) * 2.0 - 1.0;
  uv.x *= uRes.x / uRes.y;

  // Height capped at ~2/3 screen
  float yN = fragCoord.y / uRes.y;
  float screenMask = smoothstep(0.00, 0.08, yN) * (1.0 - smoothstep(0.66, 0.78, yN));

  // Camera
  vec3 ro = vec3(0.0, 0.10, 2.10);
  vec3 lookAt = vec3(0.0, 0.25, 0.0);
  vec3 ww = normalize(lookAt - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);

  float fov = 1.12;
  vec3 rd = normalize(uu * uv.x + vv * uv.y + ww * fov);

  // Big box to cover the whole screen width
  vec3 bmin = vec3(-3.0, -0.85, -2.4);
  vec3 bmax = vec3( 3.0,  1.35,  2.4);

  float t0, t1;
  if (!rayBox(ro, rd, bmin, bmax, t0, t1)) {
    outColor = vec4(0.0);
    return;
  }

  int steps = uSteps;
  float dt = (t1 - t0) / float(steps);

  // Dither
  float jitter = fract(sin(dot(fragCoord, vec2(12.9898,78.233))) * 43758.5453);
  float t = t0 + dt * jitter;

  vec3 lightDir = normalize(vec3(-0.20, 0.90, 0.22));
  vec3 viewDir = normalize(-rd);
  float phase = 0.35 + 0.65 * pow(max(dot(viewDir, lightDir), 0.0), 1.6);

  vec3 baseSmoke = uColor; // Use uniform color
  vec3 col = vec3(0.0);
  float a = 0.0;
  float shadow = 0.0;

  for (int i = 0; i < 180; i++) {
    if (i >= steps) break;
    if (a > 0.99) break;

    vec3 p = ro + rd * t;
    float d = densityField(p, uTime, uSpeed, uWarp);

    float dens = d * uDensity * screenMask;
    float alphaStep = 1.0 - exp(-dens * 2.0 * dt);

    if (alphaStep > 0.001) {
      shadow += dens * dt * 1.35;
      float lit = exp(-shadow * 1.10) * phase;
      float ambient = 0.30;

      vec3 c = baseSmoke * (ambient + 0.85 * lit);
      float oneMinusA = 1.0 - a;

      col += c * alphaStep * oneMinusA;
      a   += alphaStep * oneMinusA;
    }

    t += dt;
  }

  a = clamp(a, 0.0, 0.88);
  outColor = vec4(col, a);
}
`;
