import type { Material, WebGLProgramParametersWithUniforms } from 'three'

/**
 * Festive lights (eave bulbs, garlands, tree lights) share these uniforms.
 * Until the Great Clock strikes midnight they glow faintly; then a wave rolls
 * outward from the tower and every bulb it passes flares on and starts to twinkle.
 */
export const festiveUniforms = {
  uFestiveRadius: { value: 0 },
  uFestiveDim: { value: 0.14 },
  uFestiveTime: { value: 0 },
}

/** Patch an instanced MeshBasicMaterial so its bulbs follow the festive wave. */
export function applyFestiveWave(material: Material) {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, festiveUniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        'void main() {',
        `uniform float uFestiveRadius;
uniform float uFestiveTime;
varying float vFestive;
void main() {`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
  #ifdef USE_INSTANCING
    vec3 festivePos = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #else
    vec3 festivePos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #endif
  float festiveD = length(festivePos.xz);
  float lit = clamp((uFestiveRadius - festiveD) / 14.0, 0.0, 1.0);
  // A bright crest right at the wavefront.
  float crest = exp(-pow((uFestiveRadius - festiveD) / 6.0, 2.0)) * step(0.001, uFestiveRadius);
  float seed = fract(sin(dot(festivePos.xz, vec2(12.9898, 78.233))) * 43758.5453);
  float twinkle = 0.82 + 0.18 * sin(uFestiveTime * (1.5 + seed * 3.0) + seed * 40.0);
  vFestive = lit * twinkle + crest * 1.6;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `uniform float uFestiveDim;
varying float vFestive;
void main() {`,
      )
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * max(uFestiveDim, vFestive), opacity );')
  }
  material.customProgramCacheKey = () => 'festive-wave'
  material.needsUpdate = true
}
