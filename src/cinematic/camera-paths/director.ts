import { MathUtils, Vector3 } from 'three'
import { chapterAt, chapterLocal } from '../../config/destinations'
import { trainFrontS } from '../express-timeline'
import { ARRIVAL_KEYS, createCameraPath } from './arrival-path'
import { expressShot } from './express-shots'
import { clockShot } from './clock-shots'
import { workshopShot } from './workshop-shots'
import type { Shot } from './shot'

/**
 * The director: for any point of the journey, the authored shot.
 * Each destination supplies its own shot logic; boundaries are continuous
 * because every chapter's first shot starts exactly where the previous ended.
 */
const arrivalPath = createCameraPath(ARRIVAL_KEYS)
const last = ARRIVAL_KEYS[ARRIVAL_KEYS.length - 1]
const arrivalEnd: Shot = {
  pos: new Vector3(...last.pos),
  look: new Vector3(...last.look),
  fov: last.fov,
  roll: 0,
  clearance: 4,
}

export function createShot(): Shot {
  return { pos: new Vector3(), look: new Vector3(), fov: 45, roll: 0, clearance: 4 }
}

export function directShot(progress: number, out: Shot) {
  const chapter = chapterAt(progress)
  if (chapter.id === 'arrival') {
    const local = chapterLocal(progress, 'arrival')
    const u = MathUtils.clamp(arrivalPath.remap(local), 0, 1)
    arrivalPath.position.getPoint(u, out.pos)
    arrivalPath.target.getPoint(u, out.look)
    out.fov = arrivalPath.fovAt(local)
    out.roll = arrivalPath.rollAt(local)
    out.clearance = 4
    return out
  }
  if (chapter.id === 'clock') return clockShot(chapterLocal(progress, 'clock'), out)
  if (chapter.id === 'workshop') return workshopShot(chapterLocal(progress, 'workshop'), out)
  return expressShot(chapterLocal(progress, 'express'), trainFrontS(progress), arrivalEnd, out)
}
