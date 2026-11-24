import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BackSide, Mesh, ShaderMaterial } from 'three'
import { journey } from '../../cinematic/journey'
import { GLSL_NOISE } from '../shaders/noise.glsl'
import { weather } from '../systems/weather/weather-controller'
import { MOON_DIRECTION, PALETTE } from './palette'

const vertexShader = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_Position.z = gl_Position.w; // always at the far plane
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uReveal;
uniform float uAurora;
uniform vec3 uMoonDir;
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uFog;
varying vec3 vDir;
${GLSL_NOISE}

float starLayer(vec3 dir, float scale, float threshold, float t) {
  vec3 p = dir * scale;
  vec3 cell = floor(p);
  vec3 f = fract(p) - 0.5;
  float h = np_hash13(cell);
  if (h < threshold) return 0.0;
  vec3 jitter = (vec3(np_hash13(cell + 1.7), np_hash13(cell + 4.1), np_hash13(cell + 8.3)) - 0.5) * 0.6;
  float d = length(f - jitter);
  float twinkle = 0.65 + 0.35 * sin(t * (1.5 + h * 4.0) + h * 80.0);
  float size = mix(0.035, 0.11, pow((h - threshold) / (1.0 - threshold), 2.0));
  return smoothstep(size, 0.0, d) * twinkle * (0.4 + (h - threshold) / (1.0 - threshold) * 2.2);
}

void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;

  // Atmospheric gradient.
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
  col = mix(col, uZenith, smoothstep(0.18, 0.85, h));
  col = mix(col, uFog, smoothstep(0.02, -0.08, h));

  // Faint aurora reflection on the northern horizon haze.
  float north = smoothstep(0.1, 1.0, -dir.z);
  col += vec3(0.02, 0.11, 0.08) * uAurora * north * smoothstep(-0.05, 0.12, h) * (1.0 - smoothstep(0.1, 0.6, h));

  // Milky Way band.
  vec3 bandAxis = normalize(vec3(0.62, 0.32, 0.71));
  float band = exp(-pow(dot(dir, bandAxis) * 3.2, 2.0));
  float dust = np_fbm3(dir * 6.0);
  float clouds = smoothstep(0.35, 0.85, np_fbm3(dir * 3.0 + 4.0));
  col += vec3(0.07, 0.08, 0.13) * band * dust * clouds * 1.4 * smoothstep(0.02, 0.3, h);

  // Stars: fine field + rarer bright stars, fading into the horizon haze.
  float horizonFade = smoothstep(0.0, 0.25, h);
  float stars = starLayer(dir, 260.0, 0.93, uTime) + starLayer(dir, 120.0, 0.985, uTime * 0.7) * 1.6;
  stars *= horizonFade * (0.55 + band * 0.9);
  vec3 starTint = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.88, 0.75), np_hash13(floor(dir * 120.0)));
  col += starTint * stars;

  // Moon: crisp disc, maria, layered halo.
  float md = dot(dir, uMoonDir);
  float disc = smoothstep(0.99955, 0.99968, md);
  vec3 tangent = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
  vec3 bitangent = cross(tangent, uMoonDir);
  vec2 moonUv = vec2(dot(dir, tangent), dot(dir, bitangent)) * 40.0;
  float maria = smoothstep(0.45, 0.75, np_fbm(moonUv * 3.0 + 2.0));
  vec3 moonCol = mix(vec3(2.6, 2.6, 2.45), vec3(1.7, 1.75, 1.8), maria * 0.6);
  col = mix(col, moonCol, disc);
  col += vec3(0.55, 0.65, 0.95) * (pow(max(md, 0.0), 2200.0) * 0.6 + pow(max(md, 0.0), 160.0) * 0.12 + pow(max(md, 0.0), 14.0) * 0.035);

  // Opening: sky emerges from total darkness.
  col *= mix(0.0, 1.0, uReveal);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function NightSky() {
  const mesh = useRef<Mesh>(null)
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uReveal: { value: 0 },
          uAurora: { value: 0.5 },
          uMoonDir: { value: MOON_DIRECTION },
          uZenith: { value: PALETTE.zenith },
          uMid: { value: PALETTE.skyMid },
          uHorizon: { value: PALETTE.horizon },
          uFog: { value: PALETTE.fog },
        },
      }),
    [],
  )

  useFrame(({ camera, clock }) => {
    mesh.current?.position.copy(camera.getWorldPosition(mesh.current.position))
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uReveal.value = journey.reveal
    material.uniforms.uAurora.value = weather.aurora
  })

  return (
    <mesh ref={mesh} material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[9000, 48, 24]} />
    </mesh>
  )
}
