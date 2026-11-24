import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { mulberry32 } from '../../../lib/math'
import { distanceToGiftLine, distanceToRail, GIFT_LINE, heightAt, STATION_TRACK_X, STATION_Z } from '../../world/geography'

/**
 * Procedural, deterministic layout of the central village.
 * Houses ring the clock-tower plaza, leaving four streets open (N/E/S/W)
 * and the railway + station corridor to the south.
 */

export const PLAZA_RADIUS = 46
export const ROOF_RATIO = 0.62
const STREET_ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2]

export interface House {
  x: number
  z: number
  y: number
  w: number
  d: number
  h: number
  rot: number
  color: Color
  lights: boolean
  matrix: Matrix4
}

const WALL_COLORS = ['#5a1712', '#3e100e', '#173024', '#2b2016', '#6d5a43', '#1b2338', '#4a2a1a', '#7a6a55'].map(
  (c) => new Color(c),
)

function onStreet(angle: number, r: number, halfWidth: number) {
  for (const s of STREET_ANGLES) {
    let da = Math.abs(angle - s)
    da = Math.min(da, Math.PI * 2 - da)
    if (da * r < halfWidth) return true
  }
  return false
}

export function inStationZone(x: number, z: number) {
  return x > STATION_TRACK_X - 44 && x < STATION_TRACK_X + 14 && z > 46 && z < 178
}

export function generateHouses(): House[] {
  const rand = mulberry32(1224)
  const houses: House[] = []
  for (let r = 66; r < 245; r += 21 + rand() * 4) {
    const circumference = Math.PI * 2 * r
    const count = Math.floor(circumference / (19 + rand() * 4))
    const offset = rand() * Math.PI * 2
    for (let i = 0; i < count; i++) {
      const a = offset + (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.05
      const angle = Math.atan2(Math.sin(a), Math.cos(a))
      const rr = r + (rand() - 0.5) * 6
      const x = Math.sin(angle) * rr
      const z = Math.cos(angle) * rr
      if (onStreet(angle, rr, 11)) continue
      if (distanceToRail(x, z) < 26) continue
      if (inStationZone(x, z)) continue
      // Gift Line terminal and the cable overhead.
      if (distanceToGiftLine(x, z) < 11 || Math.hypot(x - GIFT_LINE[3][0], z - GIFT_LINE[3][1]) < 16) continue
      if (r > 200 && rand() < 0.35) continue // the village thins at its edge
      const w = 9 + rand() * 6
      const d = 8 + rand() * 4
      const h = 5.5 + rand() * (r < 120 ? 6 : 3.5)
      const rot = Math.atan2(-x, -z) + (rand() - 0.5) * 0.12
      const y = heightAt(x, z) - 0.3
      const matrix = new Matrix4().compose(
        new Vector3(x, y, z),
        new Quaternion().setFromEuler(new Euler(0, rot, 0)),
        new Vector3(w, h, d),
      )
      houses.push({
        x,
        z,
        y,
        w,
        d,
        h,
        rot,
        color: WALL_COLORS[Math.floor(rand() * WALL_COLORS.length)].clone().multiplyScalar(0.85 + rand() * 0.3),
        lights: rand() < 0.55,
        matrix,
      })
    }
  }
  return houses
}

/** Transform a point in a house's local (unscaled, metres) frame into world space. */
export function houseLocalToWorld(house: House, lx: number, ly: number, lz: number, out = new Vector3()) {
  const c = Math.cos(house.rot)
  const s = Math.sin(house.rot)
  out.set(house.x + lx * c + lz * s, house.y + ly, house.z - lx * s + lz * c)
  return out
}

export interface Lamp {
  x: number
  y: number
  z: number
}

export function generateLamps(): Lamp[] {
  const lamps: Lamp[] = []
  // Plaza ring.
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12
    const x = Math.sin(a) * (PLAZA_RADIUS - 2)
    const z = Math.cos(a) * (PLAZA_RADIUS - 2)
    lamps.push({ x, y: heightAt(x, z), z })
  }
  // Along the four streets, alternating sides.
  for (const s of STREET_ANGLES) {
    for (let r = 62, k = 0; r < 240; r += 24, k++) {
      const side = k % 2 === 0 ? 1 : -1
      const px = Math.sin(s) * r + Math.cos(s) * 7 * side
      const pz = Math.cos(s) * r - Math.sin(s) * 7 * side
      if (inStationZone(px, pz) || distanceToRail(px, pz) < 7) continue
      lamps.push({ x: px, y: heightAt(px, pz), z: pz })
    }
  }
  // Lamps along the platform (outer edge).
  for (let z = STATION.platformZ - 40; z <= STATION.platformZ + 40; z += 13) {
    lamps.push({ x: STATION.platformX - 3, y: STATION.platformTop, z })
  }
  return lamps
}

/**
 * North Pole Station — a through station on the main line, west of the plaza.
 * Platform and station house sit on the WEST side of the track, leaving the
 * east side open so the clock tower is framed from the line.
 */
export const STATION = {
  trackX: STATION_TRACK_X,
  platformX: STATION_TRACK_X - 9.5,
  platformZ: STATION_Z,
  platformLength: 96,
  platformWidth: 8,
  platformTop: 2.35,
  buildingX: STATION_TRACK_X - 27,
  buildingZ: STATION_Z,
}
