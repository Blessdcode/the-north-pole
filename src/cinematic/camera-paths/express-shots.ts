import { Vector3 } from 'three'
import { smoothstep } from '../../lib/math'
import { railDirectionAt, railPointAt, railSAt, STATION_TRACK_X } from '../../experience/world/railway-path'
import { expressStops } from '../express-timeline'
import type { Shot } from './shot'

/**
 * Destination 02 shot list — authored relative to the locomotive so the
 * camera is choreographed with the train, like a camera car on a parallel road.
 *
 *  A  0.00–0.32  On the platform, looking down the line as the Express emerges and pulls in.
 *  B  0.32–0.50  Dolly along the platform to the locomotive's motion work.
 *  C1 0.50–0.68  Tracking alongside as it departs into the forest.
 *  C2 0.68–0.82  Ahead of the train, looking back at the charging locomotive.
 *  D  0.82–1.00  Chase from behind and above into the mountain tunnel.
 */
const UP = new Vector3(0, 1, 0)

// Platform viewpoint (west side of the track, platform top 2.35 + eye height).
const PLAT_POS = new Vector3(STATION_TRACK_X - 6.5, 4.1, 150)
let S_CAM_A = 0

interface Frame {
  p: Vector3
  d: Vector3
  r: Vector3
}
const frame = (s: number, f: Frame) => {
  railPointAt(s, f.p)
  railDirectionAt(s, f.d)
  f.r.set(-f.d.z, 0, f.d.x) // right-hand side in the direction of travel
  return f
}
const mk = (): Frame => ({ p: new Vector3(), d: new Vector3(), r: new Vector3() })

const F = mk() // locomotive front
const S = mk() // locomotive at its stopping point
const C = mk() // chase camera anchor
const tmp = new Vector3()
const tmp2 = new Vector3()
const shotA = { pos: new Vector3(), look: new Vector3(), fov: 48 }
const shotB = { pos: new Vector3(), look: new Vector3(), fov: 40 }
const shotC1 = { pos: new Vector3(), look: new Vector3(), fov: 52 }
const shotC2 = { pos: new Vector3(), look: new Vector3(), fov: 38 }
const shotD = { pos: new Vector3(), look: new Vector3(), fov: 46 }

function blend(out: Shot, s: { pos: Vector3; look: Vector3; fov: number }, w: number) {
  if (w <= 0) return
  out.pos.lerp(s.pos, w)
  out.look.lerp(s.look, w)
  out.fov += (s.fov - out.fov) * w
}

export function expressShot(t: number, sFront: number, start: Shot, out: Shot) {
  const { sStop, westEntranceS } = expressStops()
  if (!S_CAM_A) S_CAM_A = railSAt(STATION_TRACK_X, PLAT_POS.z)
  frame(sFront, F)
  frame(sStop, S)

  // A — platform watch. The look target follows the train, but never past a
  // point just up the platform, so the camera doesn't whip round as it passes.
  const a = smoothstep(0, 0.11, t)
  shotA.pos.copy(start.pos).lerp(PLAT_POS, a)
  railPointAt(Math.min(sFront, S_CAM_A + 26), tmp).addScaledVector(UP, 2.2)
  shotA.look.copy(start.look).lerp(tmp, smoothstep(0, 0.09, t))
  shotA.fov = start.fov + (46 - start.fov) * a

  // B — along the platform to the cylinders, rods and driving wheels.
  const b = smoothstep(0.32, 0.5, t)
  railPointAt(sStop - 11, tmp).addScaledVector(S.r, -5.2).addScaledVector(UP, 2.4)
  shotB.pos.copy(PLAT_POS).lerp(tmp, b)
  railPointAt(sStop - 2.6, tmp2).addScaledVector(UP, 1.2)
  shotB.look.copy(tmp2)

  // C1 — tracking alongside, on the left of the train, looking ahead.
  shotC1.pos.copy(F.p).addScaledVector(F.d, -4).addScaledVector(F.r, -8.5).addScaledVector(UP, 3.4)
  shotC1.look.copy(F.p).addScaledVector(F.d, 16).addScaledVector(UP, 1.2)

  // C2 — ahead of the train, looking back at the locomotive charging through the trees.
  shotC2.pos.copy(F.p).addScaledVector(F.d, 15).addScaledVector(F.r, -6.5).addScaledVector(UP, 2.0)
  shotC2.look.copy(F.p).addScaledVector(F.d, -3).addScaledVector(UP, 2.8)

  // D — chase from behind and above; the camera stops at the portal as the train vanishes.
  const camS = Math.min(sFront - 30, westEntranceS - 24 + 16 * smoothstep(0.9, 1, t))
  frame(camS, C)
  shotD.pos
    .copy(C.p)
    .addScaledVector(C.r, -2.5)
    .addScaledVector(UP, 9 - 4.5 * smoothstep(0.88, 1, t))
  tmp.copy(F.p).addScaledVector(UP, 2)
  railPointAt(westEntranceS + 12, tmp2).addScaledVector(UP, 4.5)
  shotD.look.copy(tmp).lerp(tmp2, smoothstep(0.86, 0.94, t))

  out.pos.copy(shotA.pos)
  out.look.copy(shotA.look)
  out.fov = shotA.fov
  blend(out, shotB, smoothstep(0.28, 0.36, t))
  blend(out, shotC1, smoothstep(0.49, 0.56, t))
  blend(out, shotC2, smoothstep(0.64, 0.71, t))
  blend(out, shotD, smoothstep(0.8, 0.87, t))
  out.roll = 0
  out.clearance = 1.2
  return out
}

