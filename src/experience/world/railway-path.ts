import { CatmullRomCurve3, Vector3 } from 'three'
import { clamp, smoothstep } from '../../lib/math'

/**
 * The railway as one continuous spline, parameterised by distance `s` (metres).
 *
 *   s = 0  far south (arrival valley)
 *     → north through the southern range (tunnel)
 *     → North Pole Station (west of the clock plaza)
 *     → curves west through the frozen forest
 *     → into the Workshop massif (tunnel)            s = RAIL_LENGTH
 *
 * Terrain, scattering, the station, signals, the Christmas Express and the
 * camera all read this one module, so everything stays physically connected.
 */

/** Centre line of the glacial arrival valley (the line follows it in the south). */
export function valleyX(z: number) {
  const t = Math.max(0, z - 180)
  return 64 * Math.sin(t * 0.0021) * smoothstep(180, 520, z)
}

export const STATION_TRACK_X = -70
export const STATION_Z = 110
/** Formation level of the line inside the Great Workshop. */
export const HALL_GRADE = 1.2 + 340 * 0.014
/** Height of the railhead above the formation grade. */
export const RAIL_TOP = 0.52

const control: [number, number][] = []
for (let z = 3000; z > 400; z -= 120) control.push([valleyX(z), z])
control.push(
  [valleyX(380), 380],
  [valleyX(330), 330],
  [-10, 272],
  [-38, 230],
  [-62, 194],
  [STATION_TRACK_X, 160],
  [STATION_TRACK_X, STATION_Z],
  [STATION_TRACK_X, 60],
  [STATION_TRACK_X, 6],
  [-74, -44],
  [-92, -88],
  [-128, -118],
  [-185, -134],
  [-260, -140],
  [-340, -141],
  [-420, -140],
  [-500, -138],
  [-600, -136],
  [-720, -134],
  [-860, -132],
)

const curve = new CatmullRomCurve3(
  control.map(([x, z]) => new Vector3(x, 0, z)),
  false,
  'centripetal',
)
curve.arcLengthDivisions = 8000

export const RAIL_LENGTH = curve.getLength()
const N = Math.ceil(RAIL_LENGTH / 2)
const STEP = RAIL_LENGTH / N
const xs = new Float32Array(N + 1)
const zs = new Float32Array(N + 1)
curve.getSpacedPoints(N).forEach((p, i) => {
  xs[i] = p.x
  zs[i] = p.z
})

// ── Spatial hash for nearest-point queries (used by every terrain sample) ──
const CELL = 40
const grid = new Map<number, number[]>()
const key = (ix: number, iz: number) => (ix + 2000) * 4096 + (iz + 2000)
for (let i = 0; i <= N; i++) {
  const k = key(Math.floor(xs[i] / CELL), Math.floor(zs[i] / CELL))
  let bucket = grid.get(k)
  if (!bucket) grid.set(k, (bucket = []))
  bucket.push(i)
}

/** Result object reused by `railNearest` (hot path — no allocation). */
export const nearest = { d: Infinity, s: 0 }

/** Distance to the track centre line and the `s` of the closest point (exact within ~80 m). */
export function railNearest(x: number, z: number) {
  const cx = Math.floor(x / CELL)
  const cz = Math.floor(z / CELL)
  let best = Infinity
  let bi = -1
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const bucket = grid.get(key(cx + dx, cz + dz))
      if (!bucket) continue
      for (const i of bucket) {
        const ex = xs[i] - x
        const ez = zs[i] - z
        const d2 = ex * ex + ez * ez
        if (d2 < best) {
          best = d2
          bi = i
        }
      }
    }
  }
  if (bi < 0) {
    nearest.d = Infinity
    nearest.s = 0
    return nearest
  }
  // Refine by projecting onto the two adjacent segments for a continuous distance.
  let bestD2 = best
  let bestS = bi * STEP
  for (const j of [bi - 1, bi]) {
    if (j < 0 || j >= N) continue
    const ax = xs[j]
    const az = zs[j]
    const vx = xs[j + 1] - ax
    const vz = zs[j + 1] - az
    const len2 = vx * vx + vz * vz
    const t = clamp(((x - ax) * vx + (z - az) * vz) / len2, 0, 1)
    const px = ax + vx * t - x
    const pz = az + vz * t - z
    const d2 = px * px + pz * pz
    if (d2 <= bestD2) {
      bestD2 = d2
      bestS = (j + t) * STEP
    }
  }
  nearest.d = Math.sqrt(bestD2)
  nearest.s = bestS
  return nearest
}

function sAt(x: number, z: number) {
  return railNearest(x, z).s
}

/** Distance along the line of the station centre. */
export const S_STATION = sAt(STATION_TRACK_X, STATION_Z)

/** Formation grade: gentle climb south into the valley, and west toward the workshop. */
export function gradeAt(s: number) {
  const ds = s - S_STATION
  if (ds < 0) return 1.2 + Math.max(0, -ds - 40) * 0.011
  // Levels out inside the Workshop massif so the hall floor is flat.
  return 1.2 + Math.min(Math.max(0, ds - 260), 340) * 0.014
}

/** Railhead position at distance `s`. */
export function railPointAt(s: number, out = new Vector3()) {
  const f = clamp(s / STEP, 0, N - 1e-4)
  const i = Math.floor(f)
  const t = f - i
  out.set(xs[i] + (xs[i + 1] - xs[i]) * t, gradeAt(s) + RAIL_TOP, zs[i] + (zs[i + 1] - zs[i]) * t)
  return out
}

/** Unit direction of travel (increasing `s`) on the ground plane. */
export function railDirectionAt(s: number, out = new Vector3()) {
  const a = clamp(s - 2, 0, RAIL_LENGTH)
  const b = clamp(s + 2, 0, RAIL_LENGTH)
  const fa = clamp(a / STEP, 0, N - 1e-4)
  const fb = clamp(b / STEP, 0, N - 1e-4)
  const ia = Math.floor(fa)
  const ib = Math.floor(fb)
  const ax = xs[ia] + (xs[ia + 1] - xs[ia]) * (fa - ia)
  const az = zs[ia] + (zs[ia + 1] - zs[ia]) * (fa - ia)
  const bx = xs[ib] + (xs[ib + 1] - xs[ib]) * (fb - ib)
  const bz = zs[ib] + (zs[ib + 1] - zs[ib]) * (fb - ib)
  return out.set(bx - ax, 0, bz - az).normalize()
}

/** Distance along the line nearest to a world point (convenience, allocates nothing). */
export function railSAt(x: number, z: number) {
  return sAt(x, z)
}
