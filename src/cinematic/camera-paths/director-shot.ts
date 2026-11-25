import { Vector3 } from 'three'
import type { Shot } from './shot'

/** A fresh, reusable shot object. */
export function createShot(): Shot {
  return { pos: new Vector3(), look: new Vector3(), fov: 45, roll: 0, clearance: 4 }
}
