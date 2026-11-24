import { smoothstep } from '../../../lib/math'

/**
 * The Great Christmas Clock — live state (mutable, per-frame, never React state).
 *
 * Everything about the awakening is derived from one number: `t`, seconds since
 * the visitor finished winding the clock (-1 while it is still stopped). That
 * keeps gears, hands, bell, light ripple and sound perfectly in sync.
 */
export const CLOCK_TIMING = {
  gearsStart: 0.3,
  gearsFull: 3.5,
  handsStart: 1.5,
  midnight: 6.8,
  strikes: [7.0, 8.6, 10.2],
  rippleSpeed: 95, // m/s outward from the tower
  sequenceLength: 14,
}

export const clockState = {
  /** Seconds since activation; -1 = stopped. */
  t: -1,
  /** Hold-to-wind progress 0–1 (drives the crank). */
  wind: 0,
  /** True once the activation sequence has finished — the story may continue. */
  gateOpen: false,
  /** Accumulated mechanism rotation (rad), integrates gear speed. */
  gearAngle: 0,
}

export const isClockRunning = () => clockState.t >= 0

export function resetClock() {
  clockState.t = -1
  clockState.wind = 0
  clockState.gateOpen = false
  clockState.gearAngle = 0
}

/** 0 → 1 as the mechanism spins up. */
export const gearSpeed = () => (clockState.t < 0 ? 0 : smoothstep(CLOCK_TIMING.gearsStart, CLOCK_TIMING.gearsFull, clockState.t))

/** Minutes past 11 o'clock shown on the dials (stopped at 11:53; sweeps to midnight, then keeps time). */
export function dialMinutes() {
  const t = clockState.t
  if (t < 0) return 53
  const sweep = 53 + 7 * smoothstep(CLOCK_TIMING.handsStart, CLOCK_TIMING.midnight, t)
  return t > CLOCK_TIMING.midnight ? 60 + (t - CLOCK_TIMING.midnight) / 60 : sweep
}

/** Radius (m) of the wave of Christmas lights rolling out from the tower. */
export const rippleRadius = () => (clockState.t < CLOCK_TIMING.strikes[0] ? 0 : (clockState.t - CLOCK_TIMING.strikes[0]) * CLOCK_TIMING.rippleSpeed)

/** Clock faces brighten at midnight. */
export const faceGlow = () => (clockState.t < 0 ? 0 : smoothstep(CLOCK_TIMING.midnight - 0.3, CLOCK_TIMING.midnight + 0.4, clockState.t))

/** Seconds since the most recent bell strike (Infinity if none yet). */
export function sinceStrike() {
  let best = Infinity
  for (const s of CLOCK_TIMING.strikes) if (clockState.t >= s) best = Math.min(best, clockState.t - s)
  return best
}
