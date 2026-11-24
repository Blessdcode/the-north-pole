import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Group, Vector3 } from 'three'
import { journey } from '../../../cinematic/journey'
import { chapterLocal } from '../../../config/destinations'
import { ChimneySmoke } from './ChimneySmoke'
import { ClockTower } from './ClockTower'
import { Station } from './Station'
import { StreetLights } from './StreetLights'
import { VillageHouses } from './VillageHouses'

/**
 * The central village — the geographical hub of the world.
 * Close-range detail (smoke, garlands) streams in only once the camera is
 * near enough to see it; the silhouette and lights are always present so the
 * village glows from across the mountains.
 */
export function Village({ shadows, smokePerChimney }: { shadows: boolean; smokePerChimney: number }) {
  const nearDetail = useRef<Group>(null)

  const camPos = useMemo(() => new Vector3(), [])

  useFrame(({ camera }) => {
    // The camera is nested inside the rig, so measure in world space.
    const d = camera.getWorldPosition(camPos).length()
    if (nearDetail.current) nearDetail.current.visible = d < 1400 || chapterLocal(journey.progress, 'arrival') > 0.45
  })

  return (
    <group name="Village">
      <ClockTower shadows={shadows} />
      <VillageHouses shadows={shadows} />
      <Station shadows={shadows} />
      <StreetLights />
      <group ref={nearDetail}>
        <ChimneySmoke perChimney={smokePerChimney} />
      </group>
    </group>
  )
}
