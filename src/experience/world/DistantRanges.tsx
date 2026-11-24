import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MeshBasicMaterial } from 'three'
import { createNoise2D } from '../../lib/noise'
import { PALETTE } from './palette'

/**
 * Impostor mountain silhouettes far beyond the playable terrain.
 * Cheap rings with a ridged top edge, tinted toward the horizon colour
 * (manual atmospheric perspective) — they sell the enormous scale.
 */
function buildRing(radius: number, minH: number, maxH: number, seed: number, segments = 720) {
  const n = createNoise2D(seed)
  const positions: number[] = []
  const colors: number[] = []
  const base = -80
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2
    const x = Math.cos(a) * radius
    const z = Math.sin(a) * radius
    let r = 0
    let amp = 1
    let f = 1
    for (let o = 0; o < 5; o++) {
      r += (1 - Math.abs(n(Math.cos(a) * 2.2 * f + seed, Math.sin(a) * 2.2 * f))) * amp
      amp *= 0.5
      f *= 2.2
    }
    const h = minH + Math.pow(r / 1.9, 2.2) * (maxH - minH)
    positions.push(x, base, z, x, h, z)
    // Snowy crests catch a little moonlight; feet sink into haze.
    colors.push(0, 0, 0, 1, 1, 1)
  }
  const index: number[] = []
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  g.setIndex(index)
  return g
}

function RangeLayer({
  radius,
  minH,
  maxH,
  seed,
  tint,
}: {
  radius: number
  minH: number
  maxH: number
  seed: number
  tint: number
}) {
  const geometry = useMemo(() => buildRing(radius, minH, maxH, seed), [radius, minH, maxH, seed])
  const material = useMemo(() => {
    // Gradient from fog colour at the base to a lifted silhouette colour at the crest.
    const crest = new Color('#2a3a62').lerp(PALETTE.fog, tint)
    const m = new MeshBasicMaterial({ vertexColors: true, fog: false, side: DoubleSide })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uFog = { value: PALETTE.fog }
      shader.uniforms.uCrest = { value: crest }
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform vec3 uFog;\nuniform vec3 uCrest;\nvoid main() {')
        .replace(
          'vec4 diffuseColor = vec4( diffuse, opacity );',
          'vec4 diffuseColor = vec4( mix(uFog, uCrest, pow(vColor.r, 3.0)), opacity );',
        )
        .replace('#include <color_fragment>', '')
    }
    return m
  }, [tint])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  return <mesh geometry={geometry} material={material} renderOrder={-4} />
}

export function DistantRanges() {
  return (
    <group name="DistantRanges">
      <RangeLayer radius={6800} minH={250} maxH={1900} seed={3} tint={0.55} />
      <RangeLayer radius={5200} minH={150} maxH={1250} seed={11} tint={0.25} />
    </group>
  )
}
