import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { AdditiveBlending, DoubleSide, PlaneGeometry, ShaderMaterial } from 'three'
import { GLSL_NOISE } from '../shaders/noise.glsl'
import { timeOfDay } from '../systems/lighting/time-of-day'
import { weather } from '../systems/weather/weather-controller'

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uPhase;
uniform float uBend;
varying vec2 vUv;
varying float vFold;
void main() {
  vUv = uv;
  vec3 p = position;
  float x = p.x;
  // Large slow folds + faster ripples travelling along the curtain.
  float fold = sin(x * 0.0011 + uTime * 0.045 + uPhase) * 420.0
             + sin(x * 0.0031 - uTime * 0.11 + uPhase * 2.0) * 120.0
             + sin(x * 0.0093 + uTime * 0.27) * 22.0;
  p.z += fold;
  // Curtain leans as it rises.
  p.z -= uv.y * uv.y * 260.0;
  // Arc the band around the northern sky.
  p.z += (x * x) * uBend;
  vFold = fold;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform float uPhase;
varying vec2 vUv;
varying float vFold;
${GLSL_NOISE}

void main() {
  float t = uTime;
  float x = vUv.x;
  // Vertical rays drifting sideways.
  float rays = np_fbm(vec2(x * 46.0 + t * 0.06 + uPhase, t * 0.08));
  rays = pow(smoothstep(0.25, 0.85, rays), 1.6);
  float fine = np_noise(vec2(x * 260.0 - t * 0.35, t * 0.2)) * 0.5 + 0.5;
  rays *= 0.6 + 0.6 * fine;

  // Lower edge undulates; brightest just above it, fading up into the sky.
  float edge = 0.06 + 0.07 * np_fbm(vec2(x * 7.0 + t * 0.03, uPhase));
  float y = vUv.y - edge;
  float profile = smoothstep(0.0, 0.035, y) * exp(-y * 3.4);
  float upper = smoothstep(0.2, 0.75, vUv.y) * (1.0 - smoothstep(0.75, 1.0, vUv.y));

  // Pulsing energy waves travelling along the band.
  float wave = 0.65 + 0.35 * sin(x * 18.0 - t * 0.6 + uPhase * 3.0);

  // Fade the ends of the band.
  float ends = smoothstep(0.0, 0.18, x) * smoothstep(1.0, 0.82, x);

  vec3 green = vec3(0.12, 1.0, 0.52);
  vec3 teal = vec3(0.05, 0.55, 0.75);
  vec3 violet = vec3(0.55, 0.16, 0.75);
  vec3 col = mix(green, teal, smoothstep(0.08, 0.45, vUv.y));
  col = mix(col, violet, smoothstep(0.45, 0.95, vUv.y));
  // Pinkish fringe at the very lower edge, as in real auroras.
  col = mix(vec3(0.9, 0.3, 0.55), col, smoothstep(0.0, 0.03, y));

  float a = (profile * 1.25 + upper * 0.35) * rays * wave * ends * uIntensity;
  gl_FragColor = vec4(col * a * 1.6, 1.0);
}
`

interface Curtain {
  position: [number, number, number]
  rotationY: number
  width: number
  height: number
  phase: number
  bend: number
  strength: number
}

const CURTAINS: Curtain[] = [
  { position: [-300, 560, -3300], rotationY: 0.08, width: 7200, height: 1200, phase: 0, bend: 0.00006, strength: 1 },
  { position: [900, 700, -4300], rotationY: -0.22, width: 6400, height: 1450, phase: 2.4, bend: 0.00005, strength: 0.75 },
  { position: [-1600, 480, -2700], rotationY: 0.35, width: 4200, height: 900, phase: 5.1, bend: 0.0001, strength: 0.55 },
]

function AuroraCurtain({ curtain }: { curtain: Curtain }) {
  const geometry = useMemo(
    () => new PlaneGeometry(curtain.width, curtain.height, 220, 6).translate(0, curtain.height / 2, 0),
    [curtain.width, curtain.height],
  )
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        fog: false,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uPhase: { value: curtain.phase },
          uBend: { value: curtain.bend },
        },
      }),
    [curtain.phase, curtain.bend],
  )

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uIntensity.value = (weather.aurora + weather.surge * 0.9) * curtain.strength * (1 - timeOfDay.dawn)
  })

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={curtain.position}
      rotation-y={curtain.rotationY}
      renderOrder={-5}
      frustumCulled={false}
    />
  )
}

export function Aurora() {
  return (
    <group name="Aurora">
      {CURTAINS.map((c, i) => (
        <AuroraCurtain key={i} curtain={c} />
      ))}
    </group>
  )
}
