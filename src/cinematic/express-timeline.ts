import { chapterLocal } from '../config/destinations'
import { railLandmarks, WORKSHOP_HALL } from '../experience/world/geography'
import { railSAt, STATION_TRACK_X } from '../experience/world/railway-path'

/**
 * Destination 02 — The Christmas Express: where the train is, as a pure
 * function of journey progress. Both the train and the camera read this, so
 * tracking shots stay locked to the locomotive frame-perfectly — forwards and
 * backwards, at any scroll speed.
 *
 *   local 0.00–0.06  hidden in the southern tunnel; its whistle echoes out
 *   local 0.06–0.32  emerges, runs up the valley, brakes into the station
 *   local 0.32–0.50  stands at the platform: steam, brass, lantern light
 *   local 0.50–1.00  departs west through the frozen forest into the mountain
 */
export const EXPRESS_PHASES = {
  emerge: 0.06,
  arrive: 0.32,
  depart: 0.5,
} as const

/** Overall train length (loco + tender + three carriages), metres. */
export const TRAIN_LENGTH = 72

let cached: {
  sHidden: number
  sStop: number
  sEnd: number
  southExitS: number
  westEntranceS: number
  hallEntryS: number
  hallStopS: number
} | null = null
/** Key distances along the line (computed once, after the world geometry exists). */
export function expressStops() {
  if (cached) return cached
  const { southExitS, westEntranceS } = railLandmarks()
  cached = {
    southExitS,
    westEntranceS,
    // Wholly inside the tunnel, front 25 m short of daylight.
    sHidden: southExitS - 25,
    // Front of the locomotive at the north end of the platform.
    sStop: railSAt(STATION_TRACK_X, 64),
    // Deep inside the Workshop massif.
    sEnd: westEntranceS + TRAIN_LENGTH + 40,
    // Inside the Great Workshop (Destination 03).
    hallEntryS: railSAt(WORKSHOP_HALL.east, -137),
    hallStopS: railSAt(WORKSHOP_HALL.west + 30, -134),
  }
  return cached
}

/** True when distance s lies inside the Workshop hall (open air for lights and steam). */
export function inWorkshopHall(s: number) {
  const { hallEntryS } = expressStops()
  return s > hallEntryS
}

/** Distance along the line of the locomotive's front, for a global journey progress. */
export function trainFrontS(globalProgress: number) {
  const { sHidden, sStop, sEnd, hallStopS } = expressStops()
  // Destination 03 opens with the Express rolling into the Workshop and stopping at the halt.
  const w = chapterLocal(globalProgress, 'workshop')
  if (w > 0) {
    const u = Math.min(1, w / 0.16)
    return sEnd + (hallStopS - sEnd) * (1 - Math.pow(1 - u, 2.2))
  }
  const t = chapterLocal(globalProgress, 'express')
  if (t <= EXPRESS_PHASES.emerge) return sHidden
  if (t < EXPRESS_PHASES.arrive) {
    // Rolls out of the tunnel at speed, then brakes to a stand.
    const u = (t - EXPRESS_PHASES.emerge) / (EXPRESS_PHASES.arrive - EXPRESS_PHASES.emerge)
    return sHidden + (sStop - sHidden) * (1 - Math.pow(1 - u, 2.4))
  }
  if (t < EXPRESS_PHASES.depart) return sStop
  // Pulls away and accelerates.
  const u = (t - EXPRESS_PHASES.depart) / (1 - EXPRESS_PHASES.depart)
  return sStop + (sEnd - sStop) * Math.pow(u, 1.7)
}

/**
 * Live train state shared with audio and effects (mutable, per-frame).
 * Written by the Train entity; never stored in React state.
 */
export const trainState = {
  s: 0,
  speed: 0,
  wheelAngle: 0,
  /** 0 (far/hidden) … 1 (right beside the camera). */
  proximity: 0,
  /** Express-local progress 0–1 (0 before the chapter). */
  local: 0,
}
