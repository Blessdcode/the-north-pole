import { CatmullRomCurve3, Vector3 } from 'three'
import { createShot } from './director-shot'
import { flightShot } from './flight-shots'
import type { Shot } from './shot'

/**
 * Destination 07 — Christmas Morning (morning-local t).
 *
 *  0.00–0.25  Where the flight left us: watching the sleigh vanish into the dawn.
 *  0.25–0.50  Turning back to the village as the first light catches the clock tower.
 *  0.50–1.00  Slowly pulling away and up — the whole valley at peace, in gold.
 */
const start = flightShot(1, createShot())
type Key = { t: number; pos: Vector3; look: Vector3; fov: number }
const KEYS: Key[] = [
  { t: 0, pos: start.pos.clone(), look: start.look.clone(), fov: start.fov },
  { t: 0.25, pos: new Vector3(start.pos.x + 25, start.pos.y - 30, start.pos.z + 40), look: new Vector3(1500, 330, 2500), fov: 40 },
  { t: 0.5, pos: new Vector3(430, 360, 420), look: new Vector3(0, 70, 0), fov: 42 },
  // Pull back east-northeast: the ridge south-east of the village (≈550 m at
  // 560, 620) would otherwise block the view. Keys checked for terrain clearance
  // and line of sight to the village (≥ 80 m along the whole spline).
  { t: 0.75, pos: new Vector3(590, 440, 413), look: new Vector3(-10, 80, -40), fov: 40 },
  { t: 1, pos: new Vector3(745, 520, 430), look: new Vector3(-30, 90, -100), fov: 38 },
]
const pos = new CatmullRomCurve3(
  KEYS.map((k) => k.pos),
  false,
  'centripetal',
)
const look = new CatmullRomCurve3(
  KEYS.map((k) => k.look),
  false,
  'centripetal',
)

export function morningShot(t: number, out: Shot) {
  const n = KEYS.length - 1
  let i = 0
  while (i < n - 1 && t > KEYS[i + 1].t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const local = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)))
  const s = local * local * (3 - 2 * local)
  const u = (i + s) / n
  pos.getPoint(u, out.pos)
  look.getPoint(u, out.look)
  out.fov = a.fov + (b.fov - a.fov) * s
  out.roll = 0
  out.clearance = 4
  return out
}
