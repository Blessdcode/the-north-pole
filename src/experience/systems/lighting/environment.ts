import { chapterLocal } from '../../../config/destinations'

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
  lightRig: 'village' as 'village' | 'workshop',
  /** Set by the clock mechanism: the camera is deep inside the clock stage. */
  insideClock: false,
}

export function updateEnvironment(progress: number) {
  const w = chapterLocal(progress, 'workshop')
  const inside = w > 0 && w < 0.775
  environment.interior = inside ? 1 : 0
  environment.hideOutdoor = (w > 0.012 && w < 0.7) || environment.insideClock
  environment.lightRig = inside ? 'workshop' : 'village'
}
