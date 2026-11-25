import { CatmullRomCurve3, Vector3 } from 'three'
import { CLOCK_TIMING, clockState, isClockRunning } from '../../experience/destinations/clock/clock-state'
import type { Shot } from './shot'

/**
 * Destination 04 — The Great Christmas Clock.
 *
 * Scroll-driven (clock-local t):
 *   0.00–0.20  from the Gift Line terminal up to the west dial
 *   0.20–0.27  through the dial glass into the clock stage
 *   0.27–0.40  among the frozen gears, to the winding crank (the story waits here)
 *   0.40–1.00  once awake: over the village, around the plaza, then east toward the stables
 *
 * Time-driven (the awakening, `clockState.t` 0 → sequenceLength):
 *   inside the movement as it spins up → behind the west dial as the hands sweep
 *   → out through the dial at midnight → crane up over the plaza as the bell strikes.
 * The awakening starts exactly at the crank pose and ends exactly at the t = 0.40
 * "awake" pose, so control passes back to scroll without a cut.
 */
type Key = { t: number; pos: [number, number, number]; look: [number, number, number]; fov: number }

const APPROACH: Key[] = [
  { t: 0.0, pos: [-88, 24, -94], look: [-10, 46, -5], fov: 46 },
  { t: 0.1, pos: [-46, 58, -18], look: [-7.6, 67, -0.6], fov: 48 },
  { t: 0.2, pos: [-15, 66.4, -1.2], look: [-7.6, 66.6, -1.0], fov: 50 },
  { t: 0.27, pos: [-5.4, 67, -0.8], look: [1, 67.5, 0], fov: 58 },
  { t: 0.34, pos: [-3.8, 69.6, 4.2], look: [0, 67, 0], fov: 56 },
]
const GATE: Key = { t: 0.4, pos: [-3.5, 68.5, 4.5], look: [-2.6, 65.3, 1.6], fov: 50 }
const AWAKE_POSE: Key = { t: 0.4, pos: [-70, 95, 60], look: [0, 55, 0], fov: 50 }

const STOPPED_KEYS: Key[] = [...APPROACH, GATE, { ...GATE, t: 1 }]
const AWAKE_KEYS: Key[] = [
  ...APPROACH,
  AWAKE_POSE,
  { t: 0.55, pos: [55, 58, 95], look: [0, 30, 0], fov: 48 },
  { t: 0.7, pos: [78, 20, 26], look: [0, 42, 0], fov: 46 },
  { t: 0.86, pos: [150, 28, -18], look: [330, 16, -32], fov: 46 },
  { t: 1.0, pos: [250, 38, -32], look: [430, 24, -30], fov: 44 },
]

function makePath(keys: Key[]) {
  return {
    keys,
    pos: new CatmullRomCurve3(keys.map((k) => new Vector3(...k.pos)), false, 'centripetal'),
    look: new CatmullRomCurve3(keys.map((k) => new Vector3(...k.look)), false, 'centripetal'),
  }
}
const stopped = makePath(STOPPED_KEYS)
const awake = makePath(AWAKE_KEYS)

function sample(path: ReturnType<typeof makePath>, t: number, out: Shot) {
  const { keys } = path
  const n = keys.length - 1
  let i = 0
  while (i < n - 1 && t > keys[i + 1].t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const local = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t || 1)))
  const s = local * local * (3 - 2 * local)
  const u = (i + s) / n
  path.pos.getPoint(u, out.pos)
  path.look.getPoint(u, out.look)
  out.fov = a.fov + (b.fov - a.fov) * s
}

// The awakening — keyed by the fraction of the sequence (0–1).
const AWAKENING: Key[] = [
  { t: 0.0, pos: GATE.pos, look: GATE.look, fov: GATE.fov },
  { t: 0.14, pos: [-1.5, 70.2, 4.4], look: [0, 67.5, 0], fov: 54 },
  { t: 0.28, pos: [3.6, 69.2, 2.8], look: [0, 67.5, 0], fov: 56 },
  { t: 0.4, pos: [-3.2, 67.6, -0.9], look: [-7.4, 67.6, -0.9], fov: 52 },
  { t: 0.47, pos: [-5.8, 67.4, -1.1], look: [-30, 66.5, -1.4], fov: 54 },
  { t: 0.56, pos: [-20, 69.5, -1.5], look: [-50, 64, 0], fov: 56 },
  { t: 0.72, pos: [-42, 84, 26], look: [0, 60, 0], fov: 54 },
  { t: 1.0, pos: AWAKE_POSE.pos, look: AWAKE_POSE.look, fov: AWAKE_POSE.fov },
]
const awakening = makePath(AWAKENING)

export function clockShot(t: number, out: Shot) {
  sample(isClockRunning() ? awake : stopped, t, out)
  // While the awakening plays, it owns the camera completely.
  const seq = clockState.t
  if (seq >= 0 && seq < CLOCK_TIMING.sequenceLength) sample(awakening, seq / CLOCK_TIMING.sequenceLength, out)
  out.roll = 0
  out.clearance = 2
  return out
}
