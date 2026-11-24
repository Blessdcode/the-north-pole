import { useEffect, useMemo } from 'react'
import { BufferAttribute, Color, MeshStandardMaterial, PlaneGeometry } from 'three'
import { clamp, smoothstep } from '../../lib/math'
import { createNoise2D } from '../../lib/noise'
import { heightAt, WORLD_SIZE } from './geography'
import { PALETTE } from './palette'

/**
 * The connected North Pole landscape — a single heightfield.
 * The grid is warped so vertex density is highest around the village and
 * the arrival path, and coarser toward the distant edges (built-in LOD).
 */
const WARP = 1.45

function warp(s: number) {
  return Math.sign(s) * Math.pow(Math.abs(s), WARP)
}

function buildTerrainGeometry(segments: number) {
  const g = new PlaneGeometry(2, 2, segments, segments)
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position as BufferAttribute
  const half = WORLD_SIZE / 2
  // Shift the dense centre slightly south so the arrival valley also gets detail.
  const offsetZ = 260

  for (let i = 0; i < pos.count; i++) {
    const x = warp(pos.getX(i)) * half
    const z = warp(pos.getZ(i)) * half + offsetZ * (1 - Math.abs(pos.getZ(i)))
    pos.setXYZ(i, x, heightAt(x, z), z)
  }
  g.computeVertexNormals()

  // Vertex colour: wind-polished snow, exposed rock on steep faces and crests.
  const normals = g.attributes.normal as BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const n = createNoise2D(77)
  const snow = PALETTE.snow
  const rock = PALETTE.rock
  const blueShadow = new Color('#7f93c4')
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const ny = normals.getY(i)
    const grain = n(x * 0.02, z * 0.02) * 0.5 + n(x * 0.11, z * 0.11) * 0.25
    const steep = 1 - ny
    const rockMix = smoothstep(0.42, 0.72, steep + grain * 0.22 + smoothstep(420, 900, y) * 0.08)
    c.copy(snow).lerp(blueShadow, clamp(steep * 0.9 + grain * 0.1, 0, 0.5))
    c.lerp(rock, rockMix * 0.85)
    // Slight brightness variation reads as drifts and wind-scoured patches.
    c.multiplyScalar(0.92 + grain * 0.12)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new BufferAttribute(colors, 3))
  g.computeBoundingSphere()
  return g
}

export function Terrain({ segments }: { segments: number }) {
  const geometry = useMemo(() => buildTerrainGeometry(segments), [segments])
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.82,
        metalness: 0,
        envMapIntensity: 0.4,
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

  return <mesh name="Terrain" geometry={geometry} material={material} receiveShadow />
}
