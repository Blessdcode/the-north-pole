import { CatmullRomCurve3, Vector3 } from 'three'
import { STABLES } from '../../experience/world/geography'
import type { Shot } from './shot'

/**
 * Destination 05 — The Reindeer Stables (stables-local t).
 *
 *  0.00–0.16  From the village side round to the barn's south door, and in.
 *  0.16–0.45  Slowly up the aisle; each reindeer turns to watch as we pass.
 *  0.45–0.66  Around the sleigh as it lights up, lantern by lantern.
 *  0.66–0.84  High behind the sleigh: the team walks out, the great doors open.
 *  0.84–1.00  Out onto the launch field, ahead of the harnessed team, looking back.
 */
const X = STABLES.x
const F = STABLES.floor
type Key = { t: number; pos: [number, number, number]; look: [number, number, number]; fov: number }

const KEYS: Key[] = [
  { t: 0.0, pos: [250, 38, -32], look: [430, 24, -30], fov: 44 },
  { t: 0.08, pos: [380, F + 14, 34], look: [X, F + 4, 0], fov: 46 },
  { t: 0.16, pos: [X, F + 2.4, 13], look: [X, F + 2.2, -10], fov: 50 },
  { t: 0.22, pos: [X, F + 2.2, -1.5], look: [X, F + 2.0, -20], fov: 54 },
  { t: 0.3, pos: [X - 0.8, F + 2.0, -12], look: [X - 6.5, F + 1.7, -11], fov: 52 },
  { t: 0.38, pos: [X + 0.8, F + 2.1, -24], look: [X + 6.5, F + 1.8, -28], fov: 52 },
  { t: 0.45, pos: [X, F + 2.6, -37], look: [X, F + 1.4, -52], fov: 50 },
  { t: 0.55, pos: [X - 5.5, F + 2.4, -47], look: [X, F + 1.2, -53], fov: 48 },
  { t: 0.65, pos: [X + 5, F + 3.2, -49.5], look: [X, F + 1.3, -54], fov: 48 },
  { t: 0.75, pos: [X + 2, F + 5.0, -43.5], look: [X, F + 1.6, -64], fov: 52 },
  { t: 0.88, pos: [X - 1.5, F + 3.4, -58.5], look: [X, F + 2.2, -82], fov: 52 },
  { t: 1.0, pos: [X + 6, F + 5.0, -98], look: [X, F + 2.0, -66], fov: 48 },
]

const pos = new CatmullRomCurve3(KEYS.map((k) => new Vector3(...k.pos)), false, 'centripetal')
const look = new CatmullRomCurve3(KEYS.map((k) => new Vector3(...k.look)), false, 'centripetal')

export function stablesShot(t: number, out: Shot) {
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
  out.clearance = 1.5
  return out
}
