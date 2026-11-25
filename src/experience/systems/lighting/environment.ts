import { cameraState } from '../../../cinematic/camera-state'
import { chapterLocal } from '../../../config/destinations'
import { STABLES } from '../../world/geography'

/**
 * Where the camera is, in lighting terms. Derived from journey progress.
 *   interior     1 while inside the Great Workshop (moonlight off, warm fill)
 *   hideOutdoor  true while the camera is deep inside the hall and cannot see
 *                outside — the open-air world is skipped entirely (big GPU saving)
 *   lightRig     which set of positions the shared point lights take
 */
export const environment = {
  interior: 0,
  hideOutdoor: false,
  lightRig: 'village' as 'village' | 'workshop' | 'stables' | 'flight',
  /** Set by the clock mechanism: the camera is deep inside the clock stage. */
  insideClock: false,
}

export function updateEnvironment(progress: number) {
  const w = chapterLocal(progress, 'workshop')
  const inside = w > 0 && w < 0.775
  const c = cameraState.position
  const inBarn =
    Math.abs(c.x - STABLES.x) < STABLES.halfWidth - 0.2 && c.z < STABLES.south - 0.3 && c.z > STABLES.north + 0.3 && c.y < STABLES.floor + 11
  environment.interior = inside || inBarn ? 1 : 0
  environment.hideOutdoor = (w > 0.012 && w < 0.7) || environment.insideClock
  const flying = chapterLocal(progress, 'flight') > 0.03 && chapterLocal(progress, 'morning') <= 0
  environment.lightRig = inside ? 'workshop' : flying ? 'flight' : c.x > 300 ? 'stables' : 'village'
}
