/** Shared GLSL noise helpers (value noise + fbm), injected into shader strings. */
export const GLSL_NOISE = /* glsl */ `
float np_hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float np_hash13(vec3 p3) {
  p3 = fract(p3 * 0.1031);
  p3 += dot(p3, p3.zyx + 31.32);
  return fract((p3.x + p3.y) * p3.z);
}
float np_noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(np_hash12(i), np_hash12(i + vec2(1.0, 0.0)), u.x),
             mix(np_hash12(i + vec2(0.0, 1.0)), np_hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float np_noise3(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = np_hash13(i);
  float b = np_hash13(i + vec3(1, 0, 0));
  float c = np_hash13(i + vec3(0, 1, 0));
  float d = np_hash13(i + vec3(1, 1, 0));
  float e = np_hash13(i + vec3(0, 0, 1));
  float f1 = np_hash13(i + vec3(1, 0, 1));
  float g = np_hash13(i + vec3(0, 1, 1));
  float h = np_hash13(i + vec3(1, 1, 1));
  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, f1, u.x), mix(g, h, u.x), u.y), u.z);
}
float np_fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * np_noise(p);
    p = p * 2.03 + vec2(17.1, 9.2);
    a *= 0.5;
  }
  return s;
}
float np_fbm3(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * np_noise3(p);
    p = p * 2.07 + vec3(5.3, 1.7, 9.1);
    a *= 0.5;
  }
  return s;
}
`
