import { Vector3 } from 'three'
import { createFrame, frameAt, sleighDistance } from '../../experience/destinations/flight/flight-path'
import { STABLES } from '../../experience/world/geography'
import { smoothstep } from '../../lib/math'
import type { Shot } from './shot'

/**
 * Destination 06 — The Christmas Eve Flight (flight-local t). Shots are built
 * from the sleigh's own frame (position, forward, right, up — banked), so the
 * camera flies in formation with it.
 *
 *  A 0.00–0.10  low on the launch field; the team gallops past the lens
 *  B 0.10–0.18  low chase alongside through take-off
 *  C 0.18–0.34  THE REVEAL — a slow orbit from behind to the front: Santa
 *  D 0.34–0.52  high chase over the Arctic range
 *  E 0.52–0.66  wide: a tiny sleigh against the aurora over the frozen sea
 *  F 0.66–0.80  close alongside Santa (free to look around)
 *  G 0.80–0.92  the farewell: looking down past the sleigh at the lit village
 *  H 0.92–1.00  the camera stays; the sleigh flies on into the distance
 */
const F = STABLES.floor
const frame = createFrame()
const frame2 = createFrame()
const tmp2 = new Vector3()
const tmp = new Vector3()
const VILLAGE = new Vector3(0, 30, 0)

type S = { pos: Vector3; look: Vector3; fov: number }
const mk = (fov: number): S => ({ pos: new Vector3(), look: new Vector3(), fov })
const A = mk(48)
const B = mk(56)
const C = mk(44)
const D = mk(54)
const E = mk(40)
const Fs = mk(50)
const G = mk(50)
const H = mk(30)
const START = { pos: new Vector3(STABLES.x + 6, F + 5, -98), look: new Vector3(STABLES.x, F + 2, -66) }
const STATIC_A = new Vector3(STABLES.x + 7, F + 1.5, -132)

function blend(out: Shot, s: S, w: number) {
  if (w <= 0) return
  out.pos.lerp(s.pos, w)
  out.look.lerp(s.look, w)
  out.fov += (s.fov - out.fov) * w
}

/** Shot G evaluated at a given t (H freezes the camera where G left it). */
function farewell(t: number, out: S) {
  const f = frameAt(sleighDistance(t), frame2)
  out.pos.copy(f.pos).addScaledVector(f.forward, -12).addScaledVector(f.up, 13).addScaledVector(f.right, -5)
  tmp2.copy(f.pos)
  out.look.copy(tmp2).lerp(VILLAGE, 0.55)
}
const G_END = mk(50)

export function flightShot(t: number, out: Shot) {
  const s = sleighDistance(t)
  const f = frameAt(s, frame)
  const P = f.pos

  // A — fixed low camera at the side of the field, watching the lead pair come on.
  A.pos.copy(START.pos).lerp(STATIC_A, smoothstep(0, 0.05, t))
  tmp.copy(P).addScaledVector(f.forward, 26).addScaledVector(f.up, 1.4)
  A.look.copy(START.look).lerp(tmp, smoothstep(0, 0.04, t))

  // B — low chase off the right flank.
  B.pos.copy(P).addScaledVector(f.right, 5).addScaledVector(f.forward, -7).addScaledVector(f.up, 1.8)
  B.look.copy(P).addScaledVector(f.forward, 18).addScaledVector(f.up, 1.2)

  // C — orbit round the sleigh, centred on Santa: from behind-right to front-right.
  const o = smoothstep(0.18, 0.33, t)
  const theta = Math.PI * 1.15 - o * Math.PI * 0.95
  const centre = tmp.copy(P).addScaledVector(f.up, 2.1).addScaledVector(f.forward, -0.3)
  C.pos
    .copy(centre)
    .addScaledVector(f.forward, Math.cos(theta) * 7)
    .addScaledVector(f.right, Math.sin(theta) * 7)
    .addScaledVector(f.up, 0.9)
  C.look.copy(centre)
  C.fov = 44 - o * 6

  // D — high chase.
  D.pos.copy(P).addScaledVector(f.forward, -18).addScaledVector(f.up, 7).addScaledVector(f.right, 3)
  D.look.copy(P).addScaledVector(f.forward, 40)

  // E — far out to the side: the sleigh small against the aurora and the frozen sea.
  E.pos.copy(P).addScaledVector(f.right, 95).addScaledVector(f.forward, -35).addScaledVector(f.up, 22)
  E.look.copy(P).addScaledVector(f.forward, 25)

  // F — close alongside Santa, on his left.
  Fs.pos.copy(P).addScaledVector(f.right, -5.2).addScaledVector(f.up, 2.0).addScaledVector(f.forward, 0.6)
  Fs.look.copy(P).addScaledVector(f.forward, 2.5).addScaledVector(f.up, 1.6)

  // G / H — the farewell, then the camera lets them go.
  farewell(t, G)
  farewell(0.92, G_END)
  H.pos.copy(G_END.pos)
  H.look.copy(P).addScaledVector(f.up, 1.5)
  H.fov = 46 - smoothstep(0.92, 1, t) * 18

  out.pos.copy(A.pos)
  out.look.copy(A.look)
  out.fov = A.fov
  blend(out, B, smoothstep(0.09, 0.14, t))
  blend(out, C, smoothstep(0.17, 0.2, t))
  blend(out, D, smoothstep(0.33, 0.37, t))
  blend(out, E, smoothstep(0.5, 0.56, t))
  blend(out, Fs, smoothstep(0.64, 0.69, t))
  blend(out, G, smoothstep(0.78, 0.83, t))
  blend(out, H, smoothstep(0.915, 0.94, t))
  out.roll = -f.bank * 0.35 * (1 - smoothstep(0.9, 0.95, t))
  out.clearance = 1.5
  return out
}
