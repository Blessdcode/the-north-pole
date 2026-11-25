import { clamp, lerp, smoothstep } from '../../lib/math'
import { createNoise2D } from '../../lib/noise'
import { gradeAt, HALL_GRADE, RAIL_LENGTH, railNearest, railPointAt, S_STATION, STATION_TRACK_X, STATION_Z, valleyX } from './railway-path'

/**
 * THE NORTH POLE — world geography.
 *
 * One connected world, 1 unit ≈ 1 metre. +Z is south, -Z is north.
 *   Centre  (0, 0)        Central village, Great Christmas Clock
 *   (-70, 110)            North Pole Station (through station on the main line)
 *   West    (-760, -170)  Workshop massif — the Great Workshop lies inside (D03)
 *   East    (+x)          Reindeer Stables        (destination 05 — future)
 *   North   (-z)          Arctic wilderness, sleigh launch
 *   South   (+z)          Arrival valley + railway through the southern range
 *
 * Every system that needs to know "where the ground is" uses `heightAt`,
 * so the terrain mesh, scattering, railway and camera always agree.
 */

export const WORLD_SIZE = 6400
/** Level of the frozen sea's ice sheet. */
export const SEA_LEVEL = 0
export const VILLAGE_RADIUS = 250
export const RIDGE_Z = 560

export const LANDMARKS = {
  clock: { x: 0, z: 0 },
  station: { x: STATION_TRACK_X, z: STATION_Z },
  workshop: { x: -760, z: -170 },
  stables: { x: 430, z: -30 },
  launch: { x: 430, z: -160 },
} as const

/** The Great Workshop's hall, carved inside the massif (Destination 03). */
export const WORKSHOP_HALL = { west: -720, east: -540, north: -100, south: -200, height: 50 }

/** The Great Workshop's gallery breaks out of the massif's east face here (Destination 03). */
export const WORKSHOP_GALLERY = { y: HALL_GRADE + 32, z: -185, width: 7, height: 7, mouthX: -376 }

/**
 * The Reindeer Stables (Destination 05): a level pad for the barn and a
 * launch field running north from its great doors, rising gently toward the
 * mountains the sleigh must climb over in Destination 06.
 */
export const STABLES = {
  x: 430,
  south: 0,
  north: -60,
  halfWidth: 12,
  floor: 19,
  runwayEnd: -262,
  runwaySlope: 0.055,
}

/** Ground level the stables and launch field are graded to (or null outside them). */
function stablesGrade(x: number, z: number) {
  const dx = Math.abs(x - STABLES.x)
  // Pad around the barn.
  const outZ = Math.max(z - (STABLES.south + 30), STABLES.north - 15 - z, 0)
  const pad = (1 - smoothstep(28, 44, dx)) * (1 - smoothstep(0, 16, outZ))
  // Launch field north of the doors.
  const beyond = Math.max(STABLES.runwayEnd - z, 0)
  const field = z < STABLES.north ? (1 - smoothstep(18, 32, dx)) * (1 - smoothstep(0, 30, beyond)) : 0
  const w = Math.max(pad, field)
  if (w <= 0) return null
  // Level where the team stands in harness, then rising gently toward the mountains.
  const target = STABLES.floor + Math.max(0, STABLES.north - 30 - z) * STABLES.runwaySlope
  return { w, target }
}

/** Inside the stables yard or the launch field (kept clear of trees). */
export function inStablesGrounds(x: number, z: number) {
  const dx = Math.abs(x - STABLES.x)
  return (dx < 40 && z < STABLES.south + 36 && z > STABLES.north - 22) || (dx < 30 && z <= STABLES.north && z > STABLES.runwayEnd - 10)
}

/** Gift Line cableway footprint (x, z): Workshop balcony → two pylons → village terminal. */
export const GIFT_LINE: [number, number][] = [
  [WORKSHOP_GALLERY.mouthX + 26, WORKSHOP_GALLERY.z],
  [-262, -155],
  [-150, -105],
  [-54, -56],
]

/** Horizontal distance from (x, z) to the Gift Line. */
export function distanceToGiftLine(x: number, z: number) {
  let best = Infinity
  for (let i = 0; i < GIFT_LINE.length - 1; i++) {
    const [ax, az] = GIFT_LINE[i]
    const [bx, bz] = GIFT_LINE[i + 1]
    const vx = bx - ax
    const vz = bz - az
    const t = clamp(((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz), 0, 1)
    best = Math.min(best, Math.hypot(ax + vx * t - x, az + vz * t - z))
  }
  return best
}

const noiseA = createNoise2D(7)
const noiseB = createNoise2D(31)
const noiseC = createNoise2D(97)

function fbm(x: number, z: number, octaves: number) {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    sum += amp * noiseA(x * freq, z * freq)
    freq *= 2.03
    amp *= 0.5
  }
  return sum
}

/** Sharp-crested ridged multifractal — gives believable alpine silhouettes. */
function ridged(x: number, z: number, octaves: number) {
  let sum = 0
  let amp = 0.55
  let freq = 1
  let weight = 1
  for (let i = 0; i < octaves; i++) {
    let n = 1 - Math.abs(noiseB(x * freq, z * freq))
    n = Math.pow(n, 1.6)
    n *= weight
    weight = clamp(n * 1.6, 0, 1)
    sum += n * amp
    freq *= 2.1
    amp *= 0.48
  }
  return sum
}

/** Valley floor grade in the south (independent of the rail so the valley shape is stable). */
function valleyFloor(z: number) {
  return 1.2 + Math.max(0, z - 120) * 0.011
}

function southernRange(x: number, z: number) {
  const dz = (z - RIDGE_Z) / 150
  return Math.exp(-dz * dz) * smoothstep(2600, 1200, Math.abs(x))
}

/** Natural landform before the railway formation is cut into it. */
function naturalHeight(x: number, z: number) {
  const d = Math.hypot(x, z)

  // Gentle snowfield undulation everywhere.
  let h = fbm(x * 0.0042, z * 0.0042, 3) * 7

  // The great ring of mountains surrounding the hidden village bowl.
  const bowl = smoothstep(VILLAGE_RADIUS - 10, 1150, d)
  const peaks = ridged(x * 0.00105 + 11.3, z * 0.00105 - 4.1, 6)
  h += Math.pow(bowl, 1.35) * peaks * 820

  // The southern range the visitor crosses on arrival.
  const band = southernRange(x, z)
  h += band * (150 + ridged(x * 0.0024 + 3.7, z * 0.0024, 5) * 250)

  // The Workshop massif rising out of the western forest.
  const wm = Math.hypot(x - LANDMARKS.workshop.x, z - LANDMARKS.workshop.z)
  h += Math.pow(smoothstep(470, 110, wm), 1.3) * (360 + ridged(x * 0.003 - 7.1, z * 0.003 + 2.2, 5) * 300)

  // The frozen sea beyond the northern range (Destination 06). An irregular
  // coastline; the sea bed sits below the ice sheet that is drawn at y = 0.
  const coast = fbm(x * 0.0011 + 5.2, 1.7, 3) * 380
  const sea = smoothstep(-1220, -1620, z + coast) * (1 - smoothstep(2600, 3100, Math.abs(x)))
  h = lerp(h, -8 + fbm(x * 0.004, z * 0.004, 2) * 4, sea)

  // Flat-bottomed (super-gaussian) glacial valley in the south.
  const valley = Math.exp(-(((x - valleyX(z)) / 250) ** 4)) * smoothstep(740, 980, z)
  h = lerp(h, valleyFloor(z) + 3 + h * 0.05, valley)
  return h
}

export function heightAt(x: number, z: number) {
  let h = naturalHeight(x, z)

  // Workshop gallery mouth: keep solid rock over the gallery's last stretch and
  // cut a notch below the balcony so the door opens onto open air.
  {
    const G = WORKSHOP_GALLERY
    const dz = Math.abs(z - G.z)
    if (dz < 22 && x > G.mouthX - 40 && x < G.mouthX + 45) {
      const side = smoothstep(22, 12, dz)
      if (x < G.mouthX) {
        const over = smoothstep(G.mouthX - 40, G.mouthX - 8, x) * smoothstep(14, 6, dz)
        h = Math.max(h, lerp(h, G.y + G.height + 6, over))
      } else {
        const below = G.y - 4 - (x - G.mouthX) * 0.45
        h = lerp(h, Math.min(h, below), side * smoothstep(G.mouthX + 45, G.mouthX + 30, x))
      }
    }
  }

  // The Reindeer Stables' pad and launch field.
  {
    const s = stablesGrade(x, z)
    if (s) h = lerp(h, s.target, s.w)
  }

  // Railway formation: cut and fill toward the grade, except where the line
  // runs deep inside a mountain (tunnel).
  let bed = 0
  const near = railNearest(x, z)
  if (near.d < 100) {
    const grade = gradeAt(near.s)
    const cover = h - grade
    const tunnel = smoothstep(8, 18, cover)
    bed = Math.exp(-((near.d / 30) ** 2)) * (1 - tunnel)
    const target = grade - 0.35 + fbm(x * 0.02, z * 0.02, 2) * 0.35
    h = lerp(h, target, bed)
  }

  // Surface detail — wind-blown drifts (kept off the track bed).
  const d = Math.hypot(x, z)
  h += noiseC(x * 0.03, z * 0.03) * 0.6 * (0.4 + smoothstep(VILLAGE_RADIUS - 10, 1150, d)) * (1 - bed)
  return h
}

/** Approximate slope (0 flat … 1+ steep) — used to keep trees off cliffs. */
export function slopeAt(x: number, z: number, e = 4) {
  const hx = heightAt(x + e, z) - heightAt(x - e, z)
  const hz = heightAt(x, z + e) - heightAt(x, z - e)
  return Math.hypot(hx, hz) / (2 * e)
}

/** Distance from (x,z) to the railway centre line. */
export function distanceToRail(x: number, z: number) {
  return railNearest(x, z).d
}

/** Depth of rock above the railhead at distance `s` (> TUNNEL_DEPTH means in tunnel). */
export const TUNNEL_DEPTH = 6
export function coverAt(s: number) {
  const p = railPointAt(s)
  return heightAt(p.x, p.z) - gradeAt(s)
}

export interface Portal {
  s: number
  /** 1 = entrance when travelling toward increasing s; -1 = exit. */
  facing: 1 | -1
}

let portalCache: Portal[] | null = null
/** Tunnel portals along the whole line, computed once. */
export function findTunnelPortals(): Portal[] {
  if (portalCache) return portalCache
  const portals: Portal[] = []
  let inside = coverAt(0) > TUNNEL_DEPTH
  for (let s = 0; s < RAIL_LENGTH; s += 2) {
    const deep = coverAt(s) > TUNNEL_DEPTH
    if (!inside && deep) portals.push({ s: s - 4, facing: 1 })
    if (inside && !deep) portals.push({ s: s + 4, facing: -1 })
    inside = deep
  }
  portalCache = portals
  return portals
}

/** Key railway positions used by the story. */
export function railLandmarks() {
  const portals = findTunnelPortals()
  // Exit of the southern tunnel (where the Express emerges), nearest before the station.
  const southExit = [...portals].filter((p) => p.facing === -1 && p.s < S_STATION).pop()
  // Entrance into the Workshop massif, first after the station.
  const westEntrance = portals.find((p) => p.facing === 1 && p.s > S_STATION)
  return {
    southExitS: southExit?.s ?? S_STATION - 320,
    westEntranceS: westEntrance?.s ?? S_STATION + 700,
  }
}

export { railNearest, S_STATION, STATION_TRACK_X, STATION_Z }
