import { CatmullRomCurve3, Vector3 } from 'three'
import { clamp, smoothstep } from '../../../lib/math'
import { STABLES } from '../../world/geography'

/**
 * Destination 05 — The Reindeer Stables.
 * A long timber barn on a north–south axis: a small door in the south gable,
 * eight stalls along a central aisle, the sleigh at the north end and great
 * double doors opening onto the launch field.
 *
 * The team's names come from "A Visit from St. Nicholas" (1823, public domain).
 */
export const BARN = {
  x: STABLES.x,
  south: STABLES.south,
  north: STABLES.north,
  half: STABLES.halfWidth,
  floor: STABLES.floor,
  wallHeight: 9,
  ridge: 6,
  aisleHalf: 3,
}

export const NAMES = ['Dasher', 'Dancer', 'Prancer', 'Vixen', 'Comet', 'Cupid', 'Donder', 'Blitzen']

/** Stall centres along the aisle (z), four per side. */
export const STALL_Z = [-10.5, -19.5, -28.5, -37.5]
export const STALL_BOUNDS = [-6, -15, -24, -33, -42]

/** The sleigh, at the north end of the aisle, facing the doors (north, −z). */
export const SLEIGH = new Vector3(BARN.x, BARN.floor, -52)

/** Harness slots: four pairs ahead of the sleigh, out on the launch field. */
export const SLOT_Z = [-66, -71, -76, -81]
export const SLOT_HALF = 1.3

export interface ReindeerSpec {
  name: string
  stall: Vector3
  /** Facing in the stall (radians about y): heads toward the aisle. */
  stallYaw: number
  slot: Vector3
  side: -1 | 1
  /** When (stables-local t) this one walks out to the harness. */
  depart: number
  path: CatmullRomCurve3
  length: number
}

export const TEAM: ReindeerSpec[] = NAMES.map((name, i) => {
  const side: -1 | 1 = i % 2 === 0 ? -1 : 1 // west, east
  const row = Math.floor(i / 2)
  const stall = new Vector3(BARN.x + side * 6.6, BARN.floor, STALL_Z[row])
  // Lead pair (row 0) goes first: it has the farthest to walk.
  const slot = new Vector3(BARN.x + side * SLOT_HALF, BARN.floor, SLOT_Z[3 - row])
  const aisleX = BARN.x + side * 1.4
  const path = new CatmullRomCurve3(
    [
      stall.clone(),
      new Vector3(aisleX + side * 1.2, BARN.floor, stall.z - 1.5),
      new Vector3(aisleX, BARN.floor, stall.z - 5),
      new Vector3(BARN.x + side * 2.6, BARN.floor, -46),
      new Vector3(BARN.x + side * 2.2, BARN.floor, -58),
      new Vector3(BARN.x + side * 1.6, BARN.floor, -62),
      slot.clone().setZ(slot.z + 2),
      slot.clone(),
    ],
    false,
    'centripetal',
  )
  return {
    name,
    stall,
    stallYaw: side < 0 ? Math.PI / 2 : -Math.PI / 2,
    slot,
    side,
    depart: 0.665 + row * 0.022 + (side > 0 ? 0.008 : 0),
    path,
    length: path.getLength(),
  }
})

/** How far along its walk a reindeer is (0 in the stall … 1 in harness). */
export function walkProgress(spec: ReindeerSpec, t: number) {
  return smoothstep(0, 1, clamp((t - spec.depart) / 0.085, 0, 1))
}

/** The great north doors swing open. */
export const doorsOpen = (t: number) => smoothstep(0.64, 0.72, t)

/** The sleigh lights up lantern by lantern (0 → 1). */
export const sleighLight = (t: number) => smoothstep(0.47, 0.63, t)

/** The traces are hooked up once the whole team is in place. */
export const tracesOn = (t: number) => smoothstep(0.83, 0.87, t)

/** Runway lanterns ignite from the doors outward (distance in metres from the doors). */
export const runwayLit = (t: number) => smoothstep(0.84, 0.97, t) * 220
