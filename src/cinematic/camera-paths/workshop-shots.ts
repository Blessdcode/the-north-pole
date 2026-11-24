import { CatmullRomCurve3, Vector3 } from 'three'
import { smoothstep } from '../../lib/math'
import { heroGiftDistance, ROUTE_MARKS, routePointAt, routeTangentAt } from '../../experience/destinations/workshop/workshop-layout'
import type { Shot } from './shot'

/**
 * Destination 03 shot list (workshop-local progress t).
 *
 *  A  0.00–0.16  Grand reveal from high under the vault at the east end; the Express rolls in below.
 *  B  0.16–0.44  Directed tour across the factory floor: bow arms, wrapping machines, assembly benches.
 *  C  0.44–0.74  The hero gift: its tag, then a chase along the belt, through the wrapping
 *                machine, up the spiral lift and along the gallery.
 *  D  0.74–1.00  Out through the great door and down the Gift Line, ending on the Great Clock.
 *
 * Interior shots skip the terrain clamp (the camera is inside the mountain).
 */
const UP = new Vector3(0, 1, 0)
const INTERIOR = -1e9

// A + B as one authored path through the hall (keys at workshop-local t).
const KEYS: { t: number; pos: [number, number, number]; look: [number, number, number]; fov: number }[] = [
  { t: 0.0, pos: [-548, 44, -112], look: [-690, 18, -160], fov: 54 },
  { t: 0.16, pos: [-560, 34, -120], look: [-640, 8, -150], fov: 50 },
  { t: 0.22, pos: [-585, 16, -150], look: [-640, 6, -172], fov: 48 },
  { t: 0.28, pos: [-615, 8.6, -168], look: [-640, 8, -176], fov: 46 },
  { t: 0.34, pos: [-631, 9.6, -182], look: [-640, 8.6, -175], fov: 44 },
  { t: 0.4, pos: [-668, 11, -168], look: [-700, 7.5, -175], fov: 46 },
  { t: 0.44, pos: [-699, 9.4, -168.5], look: [-693, 7.4, -175], fov: 44 },
]
const posCurve = new CatmullRomCurve3(KEYS.map((k) => new Vector3(...k.pos)), false, 'centripetal')
const lookCurve = new CatmullRomCurve3(KEYS.map((k) => new Vector3(...k.look)), false, 'centripetal')

function keyed(t: number, out: Shot) {
  const n = KEYS.length - 1
  let i = 0
  while (i < n - 1 && t > KEYS[i + 1].t) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const local = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)))
  const s = local * local * (3 - 2 * local)
  const u = (i + s) / n
  posCurve.getPoint(u, out.pos)
  lookCurve.getPoint(u, out.look)
  out.fov = a.fov + (b.fov - a.fov) * s
}

const P = new Vector3()
const T = new Vector3()
const side = new Vector3()
const tmp = new Vector3()
const chase = { pos: new Vector3(), look: new Vector3(), fov: 52 }
const tag = { pos: new Vector3(), look: new Vector3(), fov: 40 }
const cable = { pos: new Vector3(), look: new Vector3(), fov: 48 }
const finale = { pos: new Vector3(-88, 24, -94), look: new Vector3(-10, 46, -5), fov: 46 }

function blend(out: Shot, s: { pos: Vector3; look: Vector3; fov: number }, w: number) {
  if (w <= 0) return
  out.pos.lerp(s.pos, w)
  out.look.lerp(s.look, w)
  out.fov += (s.fov - out.fov) * w
}

export function workshopShot(t: number, out: Shot) {
  keyed(Math.min(t, 0.44), out)

  const d = heroGiftDistance(t)
  routePointAt(d, P)
  routeTangentAt(Math.max(d, 0.5), T)

  // Reading the tag: low on the gift's south side.
  tag.pos.copy(P).add(tmp.set(-1.2, 1.3, -3.2))
  tag.look.copy(P).addScaledVector(UP, 0.2)

  // Chase: behind and above the gift, looking along its path.
  chase.pos.copy(P).addScaledVector(T, -5).addScaledVector(UP, 2.2)
  chase.look.copy(P).addScaledVector(T, 3).addScaledVector(UP, 0.3)

  // Gift Line: trailing alongside the gondola, a little below the cable.
  side.set(-T.z, 0, T.x).normalize()
  cable.pos.copy(P).addScaledVector(T, -10).addScaledVector(side, 6).addScaledVector(UP, 1.2)
  cable.look.copy(P).addScaledVector(T, 4)

  blend(out, tag, smoothstep(0.43, 0.47, t))
  blend(out, chase, smoothstep(0.5, 0.535, t))
  const onCable = smoothstep(ROUTE_MARKS.cableStart - 6, ROUTE_MARKS.cableStart + 26, d)
  blend(out, cable, onCable)
  blend(out, finale, smoothstep(0.9, 0.99, t))

  out.roll = 0
  // Inside the mountain until the camera is out through the great door.
  out.clearance = d > ROUTE_MARKS.mouth + 4 ? 2 : INTERIOR
  return out
}
