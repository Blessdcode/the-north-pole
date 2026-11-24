import type { Vector3 } from 'three'

/** One frame of camera direction: where it is, what it looks at, which lens. */
export interface Shot {
  pos: Vector3
  look: Vector3
  fov: number
  roll: number
  /** Minimum height above the terrain for this shot (aerial shots keep more). */
  clearance: number
}
