import { CatmullRomCurve3, Vector3 } from 'three'
import { clamp, smoothstep } from '../../../lib/math'
import { GIFT_LINE, heightAt, WORKSHOP_GALLERY, WORKSHOP_HALL } from '../../world/geography'
import { HALL_GRADE } from '../../world/railway-path'

/**
 * Destination 03 — The Great Workshop.
 *
 * A vaulted hall carved inside the western massif (180 × 100 m, 50 m high),
 * entered by the Express line. Gifts flow EAST along three conveyor lines,
 * through wrapping machines, up a spiral lift, along a gallery through the
 * rock, out of a great round door onto a balcony on the mountain face, and
 * down the Gift Line cableway to the village — beneath the Great Clock.
 */
export const HALL = { ...WORKSHOP_HALL, floor: HALL_GRADE }
export const HALL_CENTER = new Vector3((HALL.west + HALL.east) / 2, HALL.floor, (HALL.north + HALL.south) / 2)

/** Conveyor lines (z), belt top height and extent (x). Gifts move toward +x. */
export const BELT = {
  lines: [-160, -175, -190],
  top: HALL.floor + 1.0,
  start: -705,
  end: -578,
  speed: 2.2,
}
/** Wrapping machine and bow-station positions along every line. */
export const WRAP_X = -640
export const BOW_X = -612

/** The spiral lift that carries finished gifts up to the gallery. */
export const LIFT = { x: -560, z: -185, radius: 7, turns: 2.5 }
export const GALLERY = WORKSHOP_GALLERY

/** Where the gallery breaks out of the mountain's east face. */
export const MOUTH_X = WORKSHOP_GALLERY.mouthX

/** Gift Line: balcony station → two pylons → village terminal west of the plaza. */
export const TERMINAL = new Vector3(GIFT_LINE[3][0] + 4, 0, GIFT_LINE[3][1])
TERMINAL.y = heightAt(TERMINAL.x, TERMINAL.z)
const CABLE_HEIGHT = 2.6 // gift hangs this far below the cable
const cableAnchors = [
  new Vector3(GIFT_LINE[0][0], GALLERY.y + 6.5, GIFT_LINE[0][1]),
  new Vector3(GIFT_LINE[1][0], 44, GIFT_LINE[1][1]),
  new Vector3(GIFT_LINE[2][0], 38, GIFT_LINE[2][1]),
  new Vector3(GIFT_LINE[3][0], TERMINAL.y + 19, GIFT_LINE[3][1]),
]
export const CABLE_ANCHORS = cableAnchors

/** The cable, with sag between supports. */
export const CABLE_POINTS: Vector3[] = (() => {
  const pts: Vector3[] = []
  for (let i = 0; i < cableAnchors.length - 1; i++) {
    const a = cableAnchors[i]
    const b = cableAnchors[i + 1]
    const sag = a.distanceTo(b) * 0.018
    for (let k = 0; k < 24; k++) {
      const u = k / 24
      const p = a.clone().lerp(b, u)
      p.y -= sag * 4 * u * (1 - u)
      pts.push(p)
    }
  }
  pts.push(cableAnchors[cableAnchors.length - 1].clone())
  return pts
})()

/** Hero gift route, as an arc-length parameterised polyline. */
const route: Vector3[] = []
const giftY = BELT.top + 0.45
for (let x = BELT.start + 12; x <= BELT.end - 4; x += 8) route.push(new Vector3(x, giftY, -175))
route.push(new Vector3(BELT.end + 3, giftY + 0.1, -180))
// Helix: start pointing west of the lift centre, climb to the gallery level, finish pointing east.
const helixStart = Math.PI
const helixEnd = Math.PI + LIFT.turns * Math.PI * 2
const helixSteps = 60
export const ROUTE_MARKS = { helixStart: 0, galleryStart: 0, mouth: 0, cableStart: 0, end: 0 }
const marks: { name: keyof typeof ROUTE_MARKS; index: number }[] = []
marks.push({ name: 'helixStart', index: route.length })
for (let i = 0; i <= helixSteps; i++) {
  const u = i / helixSteps
  const a = helixStart + (helixEnd - helixStart) * u
  route.push(
    new Vector3(
      LIFT.x + Math.cos(a) * LIFT.radius,
      giftY + 0.2 + (GALLERY.y + 1.45 - giftY - 0.2) * u,
      LIFT.z - Math.sin(a) * LIFT.radius,
    ),
  )
}
marks.push({ name: 'galleryStart', index: route.length })
for (let x = LIFT.x + LIFT.radius + 6; x < MOUTH_X; x += 10) route.push(new Vector3(x, GALLERY.y + 1.45, GALLERY.z))
marks.push({ name: 'mouth', index: route.length })
route.push(new Vector3(MOUTH_X + 8, GALLERY.y + 1.45, GALLERY.z))
route.push(new Vector3(MOUTH_X + 18, GALLERY.y + 2.2, GALLERY.z))
marks.push({ name: 'cableStart', index: route.length })
for (const p of CABLE_POINTS) route.push(p.clone().setY(p.y - CABLE_HEIGHT))
marks.push({ name: 'end', index: route.length - 1 })

const routeCurve = new CatmullRomCurve3(route, false, 'centripetal')
routeCurve.arcLengthDivisions = 6000
export const ROUTE_LENGTH = routeCurve.getLength()
const lengths = routeCurve.getLengths(6000)
for (const m of marks) {
  // Distance along the route of control point `index` ≈ arc length at its curve parameter.
  const u = m.index / (route.length - 1)
  ROUTE_MARKS[m.name] = lengths[Math.round(u * 6000)]
}

export function routePointAt(d: number, out = new Vector3()) {
  return routeCurve.getPointAt(clamp(d / ROUTE_LENGTH, 0, 1), out)
}
export function routeTangentAt(d: number, out = new Vector3()) {
  return routeCurve.getTangentAt(clamp(d / ROUTE_LENGTH, 0, 0.9999), out)
}

/**
 * Hero gift timing (workshop-local progress t → distance along the route).
 *   ≤0.50 waits at the head of line 2 (the tag can be read)
 *   0.50–0.60 along the belt, through the wrapping machine
 *   0.60–0.69 up the spiral lift
 *   0.69–0.78 along the gallery and out through the great door
 *   0.78–0.95 down the Gift Line to the village
 */
export function heroGiftDistance(t: number) {
  const M = ROUTE_MARKS
  const seg = (a: number, b: number, from: number, to: number, ease = (u: number) => u) =>
    from + (to - from) * ease(clamp((t - a) / (b - a), 0, 1))
  if (t < 0.5) return 0
  if (t < 0.6) return seg(0.5, 0.6, 0, M.helixStart, (u) => u * u * (3 - 2 * u) * 0.35 + u * 0.65)
  if (t < 0.69) return seg(0.6, 0.69, M.helixStart, M.galleryStart)
  if (t < 0.78) return seg(0.69, 0.78, M.galleryStart, M.cableStart)
  return seg(0.78, 0.95, M.cableStart, M.end, (u) => smoothstep(0, 1, u))
}

/** Whether the gift has been through the wrapping machine yet. */
export function heroGiftWrapped(d: number) {
  return routePointAt(d).x > WRAP_X || d > ROUTE_MARKS.helixStart
}
