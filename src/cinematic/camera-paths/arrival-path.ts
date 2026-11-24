import { CatmullRomCurve3, Vector3 } from 'three'

/**
 * Destination 01 — The Arrival.
 * Authored like a crane/drone shot list. Each key: camera position, look-at
 * target, lens (vertical FOV) and a roll (bank, radians) for the aerial feel.
 * Keys are distributed along journey progress by `at`.
 */
export interface CameraKey {
  at: number
  pos: [number, number, number]
  look: [number, number, number]
  fov: number
  roll: number
}

export const ARRIVAL_KEYS: CameraKey[] = [
  // Darkness: low in the arrival valley, looking up at the black wall of the range.
  { at: 0.0, pos: [30, 70, 1780], look: [10, 210, 1150], fov: 42, roll: 0 },
  { at: 0.09, pos: [26, 105, 1560], look: [0, 260, 950], fov: 44, roll: 0.01 },
  // Climbing the valley toward the southern range.
  { at: 0.2, pos: [8, 210, 1240], look: [-20, 330, 620], fov: 46, roll: -0.03 },
  { at: 0.32, pos: [-14, 360, 940], look: [-10, 420, 300], fov: 48, roll: 0.035 },
  // Skimming the peaks — the aurora fills the frame.
  { at: 0.44, pos: [-20, 470, 700], look: [0, 520, -800], fov: 52, roll: -0.02 },
  // Cresting the ridge. The village is revealed, deep in its bowl.
  { at: 0.56, pos: [-28, 455, 500], look: [0, 60, -60], fov: 46, roll: 0.0 },
  // The descent.
  { at: 0.68, pos: [-80, 290, 380], look: [0, 40, -10], fov: 44, roll: 0.04 },
  { at: 0.79, pos: [-95, 120, 260], look: [0, 38, 0], fov: 42, roll: 0.02 },
  // Gliding over the rooftops toward the station.
  { at: 0.9, pos: [-112, 30, 224], look: [-62, 14, 96], fov: 44, roll: -0.01 },
  // Beside the line at North Pole Station: the clock tower rises above the village.
  { at: 1.0, pos: [-57, 7, 156], look: [-6, 31, 8], fov: 48, roll: 0 },
]

export interface CameraPath {
  position: CatmullRomCurve3
  target: CatmullRomCurve3
  /** Maps journey progress → curve parameter so keys land exactly at their `at`. */
  remap: (p: number) => number
  fovAt: (p: number) => number
  rollAt: (p: number) => number
}

function piecewise(keys: CameraKey[], p: number, pick: (k: CameraKey, i: number) => number) {
  if (p <= keys[0].at) return pick(keys[0], 0)
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (p <= b.at) {
      const t = (p - a.at) / (b.at - a.at)
      return pick(a, i) + (pick(b, i + 1) - pick(a, i)) * t
    }
  }
  const last = keys.length - 1
  return pick(keys[last], last)
}

export function createCameraPath(keys: CameraKey[]): CameraPath {
  const position = new CatmullRomCurve3(
    keys.map((k) => new Vector3(...k.pos)),
    false,
    'centripetal',
  )
  const target = new CatmullRomCurve3(
    keys.map((k) => new Vector3(...k.look)),
    false,
    'centripetal',
  )
  const n = keys.length - 1
  // Non-arc-length parameter: key i sits exactly at u = i / n.
  const remap = (p: number) => piecewise(keys, p, (_k, i) => i / n)
  return {
    position,
    target,
    remap,
    fovAt: (p) => piecewise(keys, p, (k) => k.fov),
    rollAt: (p) => piecewise(keys, p, (k) => k.roll),
  }
}
