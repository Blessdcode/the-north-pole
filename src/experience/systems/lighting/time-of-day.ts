import { Color, Vector3 } from 'three'
import { chapterLocal } from '../../../config/destinations'
import { smoothstep } from '../../../lib/math'
import { MOON_DIRECTION, PALETTE } from '../../world/palette'

/**
 * Time of day. The whole journey is one night — until Christmas Morning,
 * when `dawn` rises 0 → 1 and the shared palette colours (fog, sky fill,
 * key light) are blended in place toward a golden winter sunrise. Everything
 * that references those Color objects follows automatically.
 */
export const timeOfDay = {
  dawn: 0,
  /** Direction of the key light (moon → low sun in the south-east). */
  keyDirection: MOON_DIRECTION.clone(),
}

/** The low winter sun, rising in the south-east (+x east, +z south). */
export const SUN_DIRECTION = new Vector3(0.6, 0.11, 0.79).normalize()

const NIGHT = {
  fog: PALETTE.fog.clone(),
  hemiSky: PALETTE.hemiSky.clone(),
  hemiGround: PALETTE.hemiGround.clone(),
  moonlight: PALETTE.moonlight.clone(),
}
const DAWN = {
  fog: new Color('#c4a6a4'),
  hemiSky: new Color('#9fb4d8'),
  hemiGround: new Color('#3a2c2a'),
  key: new Color('#ffc58a'),
}

export function updateTimeOfDay(progress: number) {
  const d = smoothstep(0.04, 0.62, chapterLocal(progress, 'morning'))
  timeOfDay.dawn = d
  PALETTE.fog.copy(NIGHT.fog).lerp(DAWN.fog, d)
  PALETTE.hemiSky.copy(NIGHT.hemiSky).lerp(DAWN.hemiSky, d)
  PALETTE.hemiGround.copy(NIGHT.hemiGround).lerp(DAWN.hemiGround, d)
  PALETTE.moonlight.copy(NIGHT.moonlight).lerp(DAWN.key, d)
  timeOfDay.keyDirection.copy(MOON_DIRECTION).lerp(SUN_DIRECTION, smoothstep(0.1, 0.7, d)).normalize()
}
