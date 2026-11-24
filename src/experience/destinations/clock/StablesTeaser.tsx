import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { heightAt, LANDMARKS } from '../../world/geography'
import { buildHouseWallsGeometry, buildRoofGeometry, createGlowTexture } from '../village/village-assets'

/**
 * A first glimpse of the Reindeer Stables in the east (Destination 05):
 * a long red barn, its doors glowing, lanterns at the gate. Placeholder
 * massing only — the destination itself is still to be built.
 */
export function StablesTeaser() {
  const { x, z } = LANDMARKS.stables
  const y = heightAt(x, z) - 0.3
  const res = useMemo(() => {
    const glow = createGlowTexture()
    return {
      glow,
      walls: buildHouseWallsGeometry(),
      roof: buildRoofGeometry(),
      wall: new MeshStandardMaterial({ color: '#6b1712', roughness: 0.85 }),
      roofMat: new MeshStandardMaterial({ color: '#e1e9fa', roughness: 0.95 }),
      door: new MeshBasicMaterial({ color: new Color(3.2, 1.9, 0.8), toneMapped: false }),
      lamp: new MeshBasicMaterial({ color: new Color(6, 3.6, 1.6), toneMapped: false }),
      pool: new MeshBasicMaterial({
        map: glow,
        color: new Color('#ff9a48').multiplyScalar(0.6),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        toneMapped: false,
      }),
    }
  }, [])
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose()), [res])

  return (
    <group name="StablesTeaser" position={[x, y, z]} rotation-y={-Math.PI / 2}>
      <mesh geometry={res.walls} material={res.wall} scale={[16, 9, 34]} />
      <mesh geometry={res.roof} material={res.roofMat} scale={[16, 9, 34]} />
      {/* Great doors on the gable end, facing the village */}
      <mesh material={res.door} position={[0, 3.4, 17.05]}>
        <planeGeometry args={[6, 6.8]} />
      </mesh>
      {[-4.6, 4.6].map((dx) => (
        <mesh key={dx} material={res.lamp} position={[dx, 5.2, 17.6]}>
          <sphereGeometry args={[0.38, 10, 8]} />
        </mesh>
      ))}
      <mesh material={res.pool} position={[0, 0.35, 24]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[26, 20]} />
      </mesh>
    </group>
  )
}
