import { useEffect, useMemo } from 'react'
import { Color, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { buildHouseWallsGeometry, buildRoofGeometry, createSignTexture, createWindowTexture } from './village-assets'
import { ROOF_RATIO, STATION } from './village-layout'

/**
 * North Pole Station — a through station on the main line. The Christmas
 * Express (Destination 02) pulls in here, then departs west into the forest.
 * Platform, iron canopy, station house and nameboard all on the west side.
 */
export function Station({ shadows }: { shadows: boolean }) {
  const res = useMemo(() => {
    const sign = createSignTexture('NORTH POLE')
    const win = createWindowTexture()
    return {
      sign,
      win,
      walls: buildHouseWallsGeometry(),
      roof: buildRoofGeometry(),
      platform: new MeshStandardMaterial({ color: '#6e6a66', roughness: 0.9 }),
      edge: new MeshStandardMaterial({ color: '#9b958c', roughness: 0.8 }),
      snow: new MeshStandardMaterial({ color: '#e4ecfb', roughness: 1 }),
      iron: new MeshStandardMaterial({ color: '#16302a', roughness: 0.5, metalness: 0.6 }),
      wall: new MeshStandardMaterial({ color: '#5b1913', roughness: 0.85 }),
      roofMat: new MeshStandardMaterial({ color: '#dfe8fb', roughness: 0.95 }),
      signMat: new MeshBasicMaterial({ map: sign }),
      winMat: new MeshBasicMaterial({ map: win, color: new Color(2.4, 2.2, 2), toneMapped: false }),
      lampMat: new MeshBasicMaterial({ color: new Color(6, 3.4, 1.4), toneMapped: false }),
    }
  }, [])
  useEffect(() => () => Object.values(res).forEach((r) => r.dispose()), [res])

  const { platformX: px, platformZ: pz, platformLength: len, platformWidth: pw, platformTop: top } = STATION
  const trackSide = px + pw / 2 // edge facing the track (east)
  const canopyLen = 56
  const posts = Array.from({ length: 8 }, (_, i) => pz - canopyLen / 2 + (i / 7) * canopyLen)
  const bd = 12
  const bh = 8
  const canopyY = top + 5.4

  return (
    <group name="Station">
      {/* Platform (extends below ground so it never floats on uneven snow) */}
      <mesh material={res.platform} position={[px, (top - 0.6) / 2, pz]} receiveShadow castShadow={shadows}>
        <boxGeometry args={[pw, top + 0.6, len]} />
      </mesh>
      <mesh material={res.edge} position={[trackSide - 0.3, top + 0.03, pz]}>
        <boxGeometry args={[0.6, 0.08, len]} />
      </mesh>
      <mesh material={res.snow} position={[px - 1, top + 0.04, pz]}>
        <boxGeometry args={[pw - 2.8, 0.06, len - 2]} />
      </mesh>
      {/* Canopy: posts on the back half, roof cantilevered toward the track */}
      {posts.map((z) => (
        <group key={z}>
          <mesh material={res.iron} position={[px - 1.6, top + 2.7, z]} castShadow={shadows}>
            <cylinderGeometry args={[0.16, 0.2, 5.4, 8]} />
          </mesh>
          <mesh material={res.lampMat} position={[px + 0.8, canopyY - 1.2, z]}>
            <sphereGeometry args={[0.32, 10, 8]} />
          </mesh>
        </group>
      ))}
      <mesh material={res.iron} position={[px - 0.4, canopyY, pz]} rotation-z={-0.12} castShadow={shadows}>
        <boxGeometry args={[pw + 1.2, 0.3, canopyLen + 2]} />
      </mesh>
      <mesh material={res.snow} position={[px - 0.4, canopyY + 0.25, pz]} rotation-z={-0.12}>
        <boxGeometry args={[pw + 1, 0.25, canopyLen + 1.6]} />
      </mesh>
      {/* Nameboards under the canopy, facing the track */}
      {[pz - 14, pz + 14].map((z) => (
        <mesh key={z} material={res.signMat} position={[trackSide - 0.9, canopyY - 2.4, z]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[10, 1.6]} />
        </mesh>
      ))}
      {/* Station house, facing the platform */}
      <group position={[STATION.buildingX, 0, STATION.buildingZ]} rotation-y={Math.PI / 2}>
        <mesh geometry={res.walls} material={res.wall} scale={[bd * 2, bh, bd]} castShadow={shadows} receiveShadow />
        <mesh geometry={res.roof} material={res.roofMat} scale={[bd * 2, bh, bd]} castShadow={shadows} />
        {[-8, -4, 4, 8].map((x) => (
          <mesh key={x} material={res.winMat} position={[x, 3.6, bd / 2 + 0.05]}>
            <planeGeometry args={[1.8, 3]} />
          </mesh>
        ))}
        <mesh material={res.winMat} position={[0, 3.2, bd / 2 + 0.05]}>
          <planeGeometry args={[2.6, 4.2]} />
        </mesh>
        <mesh material={res.winMat} position={[0, bh * (1 + ROOF_RATIO * 0.3), bd / 2 + 0.05]}>
          <planeGeometry args={[2, 2.6]} />
        </mesh>
      </group>
    </group>
  )
}
