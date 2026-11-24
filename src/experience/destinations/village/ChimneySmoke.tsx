import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, ShaderMaterial, Vector2 } from 'three'
import { mulberry32 } from '../../../lib/math'
import { GLSL_NOISE } from '../../shaders/noise.glsl'
import { weather } from '../../systems/weather/weather-controller'
import { getVillage } from './village-data'

/**
 * Wood smoke from every chimney — one GPU point system for the whole village.
 * Each particle loops on its own phase: rise, widen, drift downwind, fade.
 */
const vertexShader = /* glsl */ `
attribute vec3 aOrigin;
attribute vec2 aSeed;
uniform float uTime;
uniform vec2 uWind;
uniform float uPixelRatio;
varying float vT;
varying float vSeed;
void main() {
  float speed = 0.05 + aSeed.y * 0.03;
  float t = fract(uTime * speed + aSeed.x);
  vT = t;
  vSeed = aSeed.y;
  vec3 p = aOrigin;
  p.y += t * 34.0;
  p.xz += uWind * (t * t) * 42.0;
  p.x += sin(uTime * 0.6 + aSeed.x * 30.0) * t * 3.0;
  p.z += cos(uTime * 0.5 + aSeed.y * 30.0) * t * 3.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = (2.5 + t * 14.0) * uPixelRatio * (300.0 / max(-mv.z, 1.0));
  gl_PointSize = min(size, 220.0);
}
`
const fragmentShader = /* glsl */ `
uniform float uTime;
varying float vT;
varying float vSeed;
${GLSL_NOISE}
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float n = np_noise(uv * 5.0 + vSeed * 13.0 + uTime * 0.1);
  float a = smoothstep(0.5, 0.0, d) * (0.55 + 0.45 * n);
  a *= smoothstep(0.0, 0.08, vT) * (1.0 - smoothstep(0.45, 1.0, vT));
  // Warm-lit from the village below, cooling as it rises into moonlight.
  vec3 col = mix(vec3(0.62, 0.48, 0.38), vec3(0.42, 0.48, 0.6), smoothstep(0.0, 0.5, vT));
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a * 0.32);
}
`

export function ChimneySmoke({ perChimney }: { perChimney: number }) {
  const gl = useThree((s) => s.gl)
  const geometry = useMemo(() => {
    const tops = getVillage().data.chimneyTops
    const rand = mulberry32(31)
    const count = tops.length * perChimney
    const origin = new Float32Array(count * 3)
    const seed = new Float32Array(count * 2)
    const pos = new Float32Array(count * 3)
    let k = 0
    for (const t of tops) {
      for (let i = 0; i < perChimney; i++, k++) {
        origin.set([t.x, t.y, t.z], k * 3)
        pos.set([t.x, t.y, t.z], k * 3)
        seed[k * 2] = i / perChimney + rand() * 0.02
        seed[k * 2 + 1] = rand()
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aOrigin', new BufferAttribute(origin, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 2))
    return g
  }, [perChimney])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uWind: { value: new Vector2() },
          uPixelRatio: { value: 1 },
        },
      }),
    [],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uWind.value.set(weather.windX, weather.windZ).multiplyScalar(0.4 + weather.wind * 0.5)
    material.uniforms.uPixelRatio.value = gl.getPixelRatio()
  })

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />
}
