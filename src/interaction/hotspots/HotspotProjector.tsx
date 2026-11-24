import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { hotspotAnchors } from './hotspot-anchors'

/**
 * Projects every hotspot anchor to CSS pixels after the camera has moved.
 * NOTE: default priority on purpose — a positive useFrame priority tells R3F
 * that this callback owns rendering, which blanks the screen whenever the
 * post-processing composer (the real render owner) is not mounted.
 * It runs after the camera rig because it is mounted after it.
 */
export function HotspotProjector() {
  const v = useMemo(() => new Vector3(), [])
  useFrame(({ camera, size }) => {
    for (const a of Object.values(hotspotAnchors)) {
      v.copy(a.world).project(camera)
      a.onScreen = v.z < 1 && Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.92
      a.x = (v.x * 0.5 + 0.5) * size.width
      a.y = (-v.y * 0.5 + 0.5) * size.height
    }
  })
  return null
}
