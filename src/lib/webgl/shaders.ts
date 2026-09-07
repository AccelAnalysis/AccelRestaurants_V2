
export const baseVertexShader = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const advectionShader = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_uv;
uniform sampler2D u_velocity;
uniform sampler2D u_source;
uniform vec2 u_texelSize;
uniform float u_dt;
uniform float u_dissipation;

out vec4 outColor;

void main() {
    vec2 coord = v_uv - u_dt * texture(u_velocity, v_uv).xy * u_texelSize;
    vec4 result = texture(u_source, coord);
    float decay = 1.0 + u_dissipation * u_dt;
    outColor = result / decay;
}
`;

export const divergenceShader = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_uv;
uniform sampler2D u_velocity;
uniform vec2 u_texelSize;

out float outDivergence;

void main() {
    float L = texture(u_velocity, v_uv - vec2(u_texelSize.x, 0.0)).x;
    float R = texture(u_velocity, v_uv + vec2(u_texelSize.x, 0.0)).x;
    float T = texture(u_velocity, v_uv + vec2(0.0, u_texelSize.y)).y;
    float B = texture(u_velocity, v_uv - vec2(0.0, u_texelSize.y)).y;

    float C = texture(u_velocity, v_uv).x; // Center, unused for divergence but kept for ref

    vec2 velocity = texture(u_velocity, v_uv).xy;
    if (v_uv.x < u_texelSize.x) L = -C;
    if (v_uv.x > 1.0 - u_texelSize.x) R = -C;
    if (v_uv.y > 1.0 - u_texelSize.y) T = -C; // Top is > 1.0 depending on coord system
    if (v_uv.y < u_texelSize.y) B = -C;

    float div = 0.5 * (R - L + T - B);
    outDivergence = div;
}
`;

export const pressureShader = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_divergence;
uniform vec2 u_texelSize;

out float outPressure;

void main() {
    float L = texture(u_pressure, v_uv - vec2(u_texelSize.x, 0.0)).x;
    float R = texture(u_pressure, v_uv + vec2(u_texelSize.x, 0.0)).x;
    float T = texture(u_pressure, v_uv + vec2(0.0, u_texelSize.y)).x;
    float B = texture(u_pressure, v_uv - vec2(0.0, u_texelSize.y)).x;
    float C = texture(u_pressure, v_uv).x;
    float divergence = texture(u_divergence, v_uv).x;

    float pressure = (L + R + B + T - divergence) * 0.25;
    outPressure = pressure;
}
`;

export const gradientSubtractShader = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_uv;
uniform sampler2D u_pressure;
uniform sampler2D u_velocity;
uniform vec2 u_texelSize;

out vec2 outVelocity;

void main() {
    float L = texture(u_pressure, v_uv - vec2(u_texelSize.x, 0.0)).x;
    float R = texture(u_pressure, v_uv + vec2(u_texelSize.x, 0.0)).x;
    float T = texture(u_pressure, v_uv + vec2(0.0, u_texelSize.y)).x;
    float B = texture(u_pressure, v_uv - vec2(0.0, u_texelSize.y)).x;

    vec2 velocity = texture(u_velocity, v_uv).xy;
    velocity.xy -= vec2(R - L, T - B);
    outVelocity = velocity;
}
`;

export const displayShader = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_uv;
uniform sampler2D u_texture;

out vec4 outColor;

void main() {
    vec4 color = texture(u_texture, v_uv);
    outColor = color;
}
`;

export const splatShader = `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 v_uv;
uniform sampler2D u_target;
uniform float u_aspectRatio;
uniform vec3 u_color;
uniform vec2 u_point;
uniform float u_radius;

out vec4 outColor;

void main() {
    vec2 p = v_uv - u_point.xy;
    p.x *= u_aspectRatio;
    vec3 splat = exp(-dot(p, p) / u_radius) * u_color;
    vec3 base = texture(u_target, v_uv).xyz;
    outColor = vec4(base + splat, 1.0);
}
`;

export const particleVertexShader = `#version 300 es
in vec2 a_position;
in float a_size;
in float a_alpha;

uniform vec2 u_resolution;

out float v_alpha;

void main() {
  // Convert from pixels to clip space
  vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
  
  // Flip Y axis (WebGL 0 is bottom-left, typically screen is top-left, but let's stick to standard GL)
  // Actually, let's keep it simple: 0,0 is bottom-left in standard GL. 
  // If we want 0,0 top-left like DOM:
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  
  gl_PointSize = a_size;
  v_alpha = a_alpha;
}
`;

export const particleFragmentShader = `#version 300 es
precision mediump float;

in float v_alpha;
uniform vec4 u_color;
uniform int u_effectType; // 0: circle, 1: heart, 2: star, 3: leaf
uniform float u_rotation; // Rotation angle in radians

out vec4 outColor;

vec2 rotate2D(vec2 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

float circleSDF(vec2 p, float r) {
    return length(p) - r;
}

float heartSDF(vec2 p) {
    p.x = abs(p.x);
    if (p.y + p.x > 1.0)
        return sqrt(dot(p - vec2(0.25, 0.75), p - vec2(0.25, 0.75))) - sqrt(2.0)/4.0;
    return sqrt(min(dot(p - vec2(0.00, 1.00), p - vec2(0.00, 1.00)),
                    dot(p - vec2(0.50, 0.50), p - vec2(0.50, 0.50)))) * sign(p.x - p.y);
}

float starSDF(vec2 p, float r, float rf) {
    const vec2 k1 = vec2(0.809016994375, -0.587785252292);
    const vec2 k2 = vec2(-k1.x, k1.y);
    p.x = abs(p.x);
    p -= 2.0 * max(dot(k1, p), 0.0) * k1;
    p -= 2.0 * max(dot(k2, p), 0.0) * k2;
    p.x = abs(p.x);
    p.y -= r;
    vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0, 1);
    float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
    return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}

// Leaf shape (Vesica Piscis)
float leafSDF(vec2 p) {
    p = vec2(p.y, p.x); 
    float r = 0.9;
    float d = 0.5;
    return max(length(p - vec2(d, 0.0)) - r, length(p + vec2(d, 0.0)) - r);
}

void main() {
  vec2 coord = gl_PointCoord; // 0 to 1
  vec2 p = (coord - 0.5) * 2.0; // -1 to 1
  
  // Apply rotation
  p = rotate2D(p, u_rotation);
  
  float dist = 0.0;
  
  if (u_effectType == 1) { // Heart
      // Flip Y so heart points up (cusp at bottom, lobes at top)
      vec2 hp = vec2(p.x, -p.y);
      hp.y += 0.5; 
      dist = heartSDF(hp);
  } 
  else if (u_effectType == 2) { // Star
      dist = starSDF(p, 0.5, 0.25);
  }
  else if (u_effectType == 3) { // Leaf
     dist = leafSDF(p);
  }
  else { // Circle (Default)
      dist = circleSDF(p, 0.5);
  }

  float alpha = 1.0 - smoothstep(0.0, 0.05, dist);

  if (alpha < 0.01) discard;
  
  outColor = vec4(u_color.rgb, u_color.a * v_alpha * alpha);
}
`;
