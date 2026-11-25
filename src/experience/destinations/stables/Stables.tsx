import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Group, Vector3 } from 'three'
import { journey } from '../../../cinematic/journey'
import { flightLocal } from '../flight/flight-path'
import { BARN } from './stables-layout'
import { Herd } from './Herd'
import { LaunchField } from './LaunchField'
import { Sleigh } from './Sleigh'
import { StableBarn } from './StableBarn'

/**
 * Destination 05 — The Reindeer Stables.
 * The barn is part of the open world (always visible from the village); the
 * team and the sleigh stream in only when the camera is in the east.
 */
export function Stables() {
  const detail = useRef<Group>(null)
  const cam = useMemo(() => new Vector3(), [])
  const centre = useMemo(() => new Vector3(BARN.x, BARN.floor, (BARN.south + BARN.north) / 2), [])

  useFrame(({ camera }) => {
    camera.getWorldPosition(cam)
    // The team and sleigh stream in near the barn, and stay with the camera throughout the flight.
    if (detail.current) detail.current.visible = cam.distanceTo(centre) < 320 || flightLocal(journey.progress) > 0
  })

  return (
    <group name="ReindeerStables">
      <StableBarn />
      <LaunchField />
      <group ref={detail}>
        <Herd />
        <Sleigh />
      </group>
    </group>
  )
}
