import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  IcosahedronGeometry,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three'
import {
  buildChimneyGeometry,
  buildHouseWallsGeometry,
  buildRoofGeometry,
  createGlowTexture,
  createWindowTexture,
} from './village-assets'
import { applyFestiveWave } from '../../systems/lighting/festive-lights'
import { getVillage, useInstances } from './village-data'

export function VillageHouses({ shadows }: { shadows: boolean }) {
  const { houses, data } = getVillage()

  const res = useMemo(() => {
    const windowTex = createWindowTexture()
    const glowTex = createGlowTexture()
    return {
      wallGeo: buildHouseWallsGeometry(),
      roofGeo: buildRoofGeometry(),
      chimneyGeo: buildChimneyGeometry(),
      windowGeo: new PlaneGeometry(1, 1),
      bulbGeo: new IcosahedronGeometry(1, 1),
      poolGeo: new PlaneGeometry(1, 1),
      wallMat: new MeshStandardMaterial({ roughness: 0.88 }),
      roofMat: new MeshStandardMaterial({ color: '#dfe8fb', roughness: 0.95 }),
      chimneyMat: new MeshStandardMaterial({ roughness: 0.9 }),
      windowMat: new MeshBasicMaterial({ map: windowTex, toneMapped: false }),
      bulbMat: (() => {
        const m = new MeshBasicMaterial({ toneMapped: false })
        applyFestiveWave(m)
        return m
      })(),
      poolMat: new MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        toneMapped: false,
      }),
      textures: [windowTex, glowTex],
    }
  }, [])

  useEffect(
    () => () => {
      Object.values(res).forEach((v) => {
        if (Array.isArray(v)) v.forEach((t) => t.dispose())
        else v.dispose()
      })
    },
    [res],
  )

  const walls = useRef<InstancedMesh>(null)
  const roofs = useRef<InstancedMesh>(null)
  const chimneys = useRef<InstancedMesh>(null)
  const windows = useRef<InstancedMesh>(null)
  const bulbs = useRef<InstancedMesh>(null)
  const pools = useRef<InstancedMesh>(null)

  const houseItems = useMemo(() => houses.map((h) => ({ matrix: h.matrix, color: h.color })), [houses])
  const roofItems = useMemo(() => houses.map((h) => ({ matrix: h.matrix })), [houses])
  useInstances(walls, houseItems)
  useInstances(roofs, roofItems)
  useInstances(chimneys, data.chimneys)
  useInstances(windows, data.windows)
  useInstances(bulbs, data.bulbs)
  useInstances(pools, data.pools)

  return (
    <group name="VillageHouses">
      <instancedMesh ref={walls} args={[res.wallGeo, res.wallMat, houses.length]} castShadow={shadows} receiveShadow />
      <instancedMesh ref={roofs} args={[res.roofGeo, res.roofMat, houses.length]} castShadow={shadows} receiveShadow />
      <instancedMesh ref={chimneys} args={[res.chimneyGeo, res.chimneyMat, data.chimneys.length]} castShadow={shadows} />
      <instancedMesh ref={windows} args={[res.windowGeo, res.windowMat, data.windows.length]} />
      <instancedMesh ref={bulbs} args={[res.bulbGeo, res.bulbMat, data.bulbs.length]} />
      <instancedMesh ref={pools} args={[res.poolGeo, res.poolMat, data.pools.length]} renderOrder={2} />
    </group>
  )
}
