import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, DoubleSide, Mesh, ShaderMaterial, SphereGeometry } from 'three'
import { CLOCK_TIMING, clockState } from './clock-state'

/**
 * A shell of light expanding from the belfry on every strike of the bell —
 * the sound made visible. Fresnel-rim shading so it reads as a ring of light.
 */
const vertexShader = /* glsl */ `
varying vec3 vNormalV;
varying vec3 vViewPos;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`
const fragmentShader = /* glsl */ `
uniform float uAlpha;
varying vec3 vNormalV;
varying vec3 vViewPos;
void main() {
  float rim = 1.0 - abs(dot(normalize(vNormalV), normalize(-vViewPos)));
  float a = pow(rim, 3.0) * uAlpha;
  gl_FragColor = vec4(vec3(1.0, 0.78, 0.45) * a * 1.6, 1.0);
}
`

export function BellShockwave() {
  const meshes = useRef<(Mesh | null)[]>([])
  const res = useMemo(() => {
    const geo = new SphereGeometry(1, 48, 24)
    const mats = CLOCK_TIMING.strikes.map(
      () =>
        new ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: { uAlpha: { value: 0 } },
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          side: DoubleSide,
          fog: false,
        }),
    )
    return { geo, mats }
  }, [])
  useEffect(
    () => () => {
      res.geo.dispose()
      res.mats.forEach((m) => m.dispose())
    },
    [res],
  )

  useFrame(() => {
    CLOCK_TIMING.strikes.forEach((s, i) => {
      const m = meshes.current[i]
      if (!m) return
      const age = clockState.t - s
      const live = age > 0 && age < 4
      m.visible = live
      if (!live) return
      m.scale.setScalar(4 + age * 130)
      res.mats[i].uniforms.uAlpha.value = Math.exp(-age * 1.1) * (i === CLOCK_TIMING.strikes.length - 1 ? 1.3 : 0.9)
    })
  })

  return (
    <group position={[0, 82, 0]}>
      {res.mats.map((mat, i) => (
        <mesh key={i} ref={(m) => void (meshes.current[i] = m)} geometry={res.geo} material={mat} visible={false} renderOrder={8} frustumCulled={false} />
      ))}
    </group>
  )
}
