import { CatmullRomCurve3, Vector3 } from 'three'
import { chapterLocal } from '../../../config/destinations'
import { clamp, smoothstep } from '../../../lib/math'
import { heightAt } from '../../world/geography'
import { SLEIGH } from '../stables/stables-layout'

/**
 * Destination 06 — the Christmas Eve flight path.
 *
 * Up the launch field, airborne at the end of it, over the northern range,
 * out across the frozen sea beneath the aurora, a long banking turn west and
 * south, a farewell circle over the village, then away over the southern
 * range toward the horizon. Authored as control points, then lifted wherever
 * the terrain demands clearance and smoothed, so the sleigh never clips a peak.
 */
const GROUND_RUN = 4
const CONTROL: [number, number, number][] = [
  [SLEIGH.x, 0, SLEIGH.z],
  [SLEIGH.x, 0, -95],
  [SLEIGH.x, 0, -140],
  [SLEIGH.x, 0, -185],
  [430, 31, -235],
  [431, 64, -290],
  [430, 140, -370],
  [424, 240, -470],
  [410, 340, -590],
  [390, 450, -710],
  [368, 560, -830],
  [320, 620, -980],
  [200, 620, -1250],
  [0, 560, -1700],
  [-400, 480, -2100],
  [-900, 450, -2280],
  [-1350, 520, -1950],
  [-1550, 650, -1300],
  [-1450, 720, -700],
  [-1050, 680, -200],
  [-500, 520, 40],
  [0, 430, 80],
  [320, 460, 280],
  [520, 600, 900],
  [720, 820, 1800],
  [950, 1150, 3200],
]

function groundUnder(x: number, z: number, r: number) {
  let h = heightAt(x, z)
  for (const [dx, dz] of [
    [r, 0],
    [-r, 0],
    [0, r],
    [0, -r],
  ])
    h = Math.max(h, heightAt(x + dx, z + dz))
  return h
}

function build() {
  const pts = CONTROL.map(([x, y, z], i) => new Vector3(x, i < GROUND_RUN ? heightAt(x, z) : y, z))
  const draft = new CatmullRomCurve3(pts, false, 'centripetal')
  draft.arcLengthDivisions = 6000
  const N = 1400
  const dense = draft.getSpacedPoints(N)
  // Distance along the draft at which the sleigh leaves the ground.
  const liftIndex = Math.round(N * (draft.getLengths(N)[Math.round((GROUND_RUN / (CONTROL.length - 1)) * N)] / draft.getLength()))
  // Lift for clearance once airborne (more clearance the higher it flies).
  const ys = dense.map((p, i) => {
    if (i <= liftIndex) return p.y
    const ground = groundUnder(p.x, p.z, 40)
    const need = ground + clamp((i - liftIndex) * 1.2, 4, 70)
    return Math.max(p.y, need)
  })
  // Smooth the lifted profile (keeping the ground run untouched).
  for (let pass = 0; pass < 3; pass++) {
    const copy = ys.slice()
    for (let i = liftIndex + 1; i < N - 1; i++) {
      let sum = 0
      let n = 0
      for (let k = -12; k <= 12; k++) {
        const j = Math.min(N, Math.max(0, i + k))
        sum += copy[j]
        n++
      }
      ys[i] = Math.max(copy[i], sum / n)
    }
  }
  const final: Vector3[] = []
  for (let i = 0; i <= N; i += 4) final.push(new Vector3(dense[i].x, ys[i], dense[i].z))
  if (N % 4 !== 0) final.push(new Vector3(dense[N].x, ys[N], dense[N].z))
  const curve = new CatmullRomCurve3(final, false, 'centripetal')
  curve.arcLengthDivisions = 8000
  return curve
}

const route = build()
export const FLIGHT_LENGTH = route.getLength()

/** Distance along the route closest (in plan) to a control point. */
function sNear(x: number, z: number) {
  const N = 2000
  let best = Infinity
  let bestS = 0
  const p = new Vector3()
  for (let i = 0; i <= N; i++) {
    route.getPointAt(i / N, p)
    const d = (p.x - x) ** 2 + (p.z - z) ** 2
    if (d < best) {
      best = d
      bestS = (i / N) * FLIGHT_LENGTH
    }
  }
  return bestS
}
const at = (i: number) => sNear(CONTROL[i][0], CONTROL[i][2])

export const FLIGHT_MARKS = {
  liftoff: at(GROUND_RUN),
  overRange: at(9),
  overSea: at(13),
  turn: at(15),
  west: at(18),
  village: at(21),
  beyond: at(22),
}

/**
 * Sleigh distance along the route for flight-local progress t.
 *   0.00–0.04  standing; the reins snap
 *   0.04–0.16  the gallop up the launch field (accelerating), airborne at its end
 *   0.16–0.34  climbing out — the reveal orbit
 *   0.34–0.92  over the range, the sea, the turn, the farewell over the village
 *   0.92–1.00  away to the horizon
 */
export function sleighDistance(t: number) {
  const M = FLIGHT_MARKS
  const seg = (a: number, b: number, s0: number, s1: number, ease = (u: number) => u) => s0 + (s1 - s0) * ease(clamp((t - a) / (b - a), 0, 1))
  if (t <= 0.04) return 0
  if (t < 0.16) return seg(0.04, 0.16, 0, M.liftoff, (u) => u * u)
  if (t < 0.34) return seg(0.16, 0.34, M.liftoff, M.overRange)
  if (t < 0.52) return seg(0.34, 0.52, M.overRange, M.overSea)
  if (t < 0.66) return seg(0.52, 0.66, M.overSea, M.turn)
  if (t < 0.8) return seg(0.66, 0.8, M.turn, M.west)
  if (t < 0.92) return seg(0.8, 0.92, M.west, M.beyond)
  return seg(0.92, 1, M.beyond, FLIGHT_LENGTH * 0.985, (u) => u * u * 0.6 + u * 0.4)
}

export interface FlightFrame {
  pos: Vector3
  forward: Vector3
  up: Vector3
  right: Vector3
  bank: number
}
export const createFrame = (): FlightFrame => ({ pos: new Vector3(), forward: new Vector3(), up: new Vector3(), right: new Vector3(), bank: 0 })

const ta = new Vector3()
const tb = new Vector3()
const WORLD_UP = new Vector3(0, 1, 0)

/** Position and orientation (with banking into turns) at distance s. */
export function frameAt(s: number, out: FlightFrame) {
  const u = clamp(s / FLIGHT_LENGTH, 0, 1)
  route.getPointAt(u, out.pos)
  route.getTangentAt(Math.min(u, 0.9995), out.forward)
  // Bank into the turn: compare headings a little behind and ahead.
  route.getTangentAt(clamp((s - 25) / FLIGHT_LENGTH, 0, 0.999), ta)
  route.getTangentAt(clamp((s + 25) / FLIGHT_LENGTH, 0, 0.999), tb)
  const turn = Math.atan2(ta.x * tb.z - ta.z * tb.x, ta.x * tb.x + ta.z * tb.z)
  const airborne = smoothstep(FLIGHT_MARKS.liftoff - 20, FLIGHT_MARKS.liftoff + 60, s)
  out.bank = clamp(turn * 2.2, -0.6, 0.6) * airborne
  out.right.crossVectors(out.forward, WORLD_UP).normalize()
  out.up.crossVectors(out.right, out.forward).normalize()
  // Roll the up/right vectors about the forward axis.
  const c = Math.cos(out.bank)
  const sn = Math.sin(out.bank)
  ta.copy(out.up).multiplyScalar(c).addScaledVector(out.right, sn)
  tb.copy(out.right).multiplyScalar(c).addScaledVector(out.up, -sn)
  out.up.copy(ta)
  out.right.copy(tb)
  return out
}

/** Flight-local progress for a global journey progress. */
export const flightLocal = (progress: number) => chapterLocal(progress, 'flight')

/** Live flight state (mutable), written by the sleigh each frame. */
export const flightState = {
  s: 0,
  speed: 0,
  airborne: 0,
  pos: new Vector3(SLEIGH.x, SLEIGH.y, SLEIGH.z),
}
