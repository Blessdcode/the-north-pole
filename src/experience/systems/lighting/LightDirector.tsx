import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { PointLight } from 'three'
import { STATION } from '../../destinations/village/village-layout'
import { environment } from './environment'

/**
 * A fixed pool of four warm point lights, repositioned per location.
 * Keeping the light COUNT constant means no shader recompiles when the story
 * moves indoors, and every material in the world pays for only four lights.
 */
interface Rig {
  pos: [number, number, number]
  color: string
  intensity: number
  distance: number
}

const VILLAGE: Rig[] = [
  { pos: [0, 14, 0], color: '#ffa451', intensity: 2400, distance: 150 }, // plaza
  { pos: [0, 26, 24], color: '#ffae5e', intensity: 2600, distance: 95 }, // clock tower floodlight
  { pos: [0, 71, 0], color: '#ffb060', intensity: 700, distance: 24 }, // inside the clock stage (lights the mechanism only)
  { pos: [STATION.platformX + 1, STATION.platformTop + 3.9, STATION.platformZ], color: '#ffb265', intensity: 900, distance: 75 }, // station canopy
]

const WORKSHOP: Rig[] = [
  { pos: [-620, 26, -150], color: '#ffb066', intensity: 9000, distance: 140 },
  { pos: [-680, 20, -176], color: '#ffa050', intensity: 6000, distance: 110 },
  { pos: [-560, 26, -185], color: '#ffb066', intensity: 5000, distance: 90 },
  { pos: [-660, 14, -130], color: '#ffb265', intensity: 4000, distance: 90 },
]

export function LightDirector() {
  const lights = useRef<(PointLight | null)[]>([])
  const current = useRef<string>('')

  useFrame(() => {
    if (current.current === environment.lightRig) return
    current.current = environment.lightRig
    const rig = environment.lightRig === 'workshop' ? WORKSHOP : VILLAGE
    rig.forEach((r, i) => {
      const l = lights.current[i]
      if (!l) return
      l.position.set(...r.pos)
      l.color.set(r.color)
      l.intensity = r.intensity
      l.distance = r.distance
    })
  })

  return (
    <group name="LightDirector">
      {VILLAGE.map((r, i) => (
        <pointLight
          key={i}
          ref={(l) => void (lights.current[i] = l)}
          position={r.pos}
          color={r.color}
          intensity={r.intensity}
          distance={r.distance}
          decay={2}
        />
      ))}
    </group>
  )
}
