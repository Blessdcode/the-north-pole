import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  ConeGeometry,
  DoubleSide,
  Mesh,
  Object3D,
  ShaderMaterial,
  SpotLight,
  SpriteMaterial,
} from 'three'
import { createGlowTexture } from '../../destinations/village/village-assets'

/**
 * The locomotive's headlamp: a real spotlight that lights the snow and the
 * trackside trees, a soft volumetric beam through the falling snow, and a glow.
 * `intensity` (0–1) is driven by the Train each frame via the returned handle.
 */
export interface HeadlightHandle {
  setIntensity(v: number): void
}

const BEAM_LENGTH = 48

const beamVertex = /* glsl */ `
varying float vAlong;
varying vec3 vViewNormal;
varying vec3 vViewPos;
void main() {
  vAlong = position.z / ${BEAM_LENGTH.toFixed(1)};
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vViewPos = mv.xyz;
  vViewNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
}
`
const beamFragment = /* glsl */ `
uniform float uIntensity;
varying float vAlong;
varying vec3 vViewNormal;
varying vec3 vViewPos;
void main() {
  float facing = abs(dot(normalize(vViewNormal), normalize(-vViewPos)));
  float a = pow(facing, 2.2) * pow(1.0 - clamp(vAlong, 0.0, 1.0), 1.8) * smoothstep(0.0, 0.04, vAlong);
  gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * a * 0.35 * uIntensity, 1.0);
}
`

export function Headlight({ position, handle }: { position: readonly [number, number, number]; handle: { current: HeadlightHandle | null } }) {
  const spot = useRef<SpotLight>(null)
  const beam = useRef<Mesh>(null)

  const res = useMemo(() => {
    const target = new Object3D()
    target.position.set(0, -3.6, 40)
    const geo = new ConeGeometry(6.5, BEAM_LENGTH, 28, 1, true)
    // Apex at the lamp, opening forward along +z.
    geo.rotateX(-Math.PI / 2).translate(0, 0, BEAM_LENGTH / 2)
    const mat = new ShaderMaterial({
      vertexShader: beamVertex,
      fragmentShader: beamFragment,
      uniforms: { uIntensity: { value: 0 } },
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    })
    const glowTex = createGlowTexture()
    const glow = new SpriteMaterial({ map: glowTex, color: 0xffd7a0, blending: AdditiveBlending, depthWrite: false, toneMapped: false })
    return { target, geo, mat, glowTex, glow }
  }, [])

  useEffect(
    () => () => {
      res.geo.dispose()
      res.mat.dispose()
      res.glowTex.dispose()
      res.glow.dispose()
    },
    [res],
  )

  useEffect(() => {
    if (spot.current) spot.current.target = res.target
    handle.current = {
      setIntensity(v: number) {
        if (spot.current) spot.current.intensity = 1400 * v
        res.mat.uniforms.uIntensity.value = v
        res.glow.opacity = v
        if (beam.current) beam.current.visible = v > 0.01
      },
    }
    return () => {
      handle.current = null
    }
  }, [handle, res])

  return (
    <group position={position}>
      <primitive object={res.target} />
      <spotLight ref={spot} color="#ffdcaa" intensity={0} angle={0.42} penumbra={0.75} distance={170} decay={1.5} />
      <mesh ref={beam} geometry={res.geo} material={res.mat} renderOrder={7} frustumCulled={false} />
      <sprite material={res.glow} scale={[4.2, 4.2, 1]} position-z={0.15} />
    </group>
  )
}
