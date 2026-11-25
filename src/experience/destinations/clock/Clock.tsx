import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Vector3 } from 'three'
import { emitStoryEvent } from '../../../cinematic/story-events'
import { clamp } from '../../../lib/math'
import { festiveUniforms } from '../../systems/lighting/festive-lights'
import { weather } from '../../systems/weather/weather-controller'
import { BellShockwave } from './BellShockwave'
import { CLOCK_TIMING, clockState, gearSpeed, rippleRadius, sinceStrike } from './clock-state'
import { ClockMechanism } from './ClockMechanism'

/**
 * Destination 04 — The Great Christmas Clock.
 * Advances the clock's own time once it has been wound and derives every
 * consequence from it: the mechanism, the festive light wave across the
 * village, the bell's surge through snow and sky, and the sound cues.
 */
export function Clock() {
  const sim = useMemo(() => ({ prevT: -1, cam: new Vector3() }), [])

  useFrame(({ clock, camera }, rawDt) => {
    const dt = Math.min(Math.max(rawDt, 0), 0.1)
    const prev = clockState.t
    if (clockState.t >= 0) {
      clockState.t += dt
      clockState.gearAngle += dt * gearSpeed() * 0.6
      if (!clockState.gateOpen && clockState.t >= CLOCK_TIMING.sequenceLength) clockState.gateOpen = true
    }
    const t = clockState.t

    festiveUniforms.uFestiveRadius.value = rippleRadius()
    festiveUniforms.uFestiveTime.value = clock.elapsedTime
    weather.surge = t < 0 ? 0 : Math.exp(-sinceStrike() * 1.1)

    // Sound cues on crossings (forward only).
    if (t >= 0 && prev >= 0) {
      const crossed = (mark: number) => prev < mark && t >= mark
      if (crossed(CLOCK_TIMING.midnight)) emitStoryEvent('clock:midnight', {})
      CLOCK_TIMING.strikes.forEach((s, i) => crossed(s) && emitStoryEvent('clock:strike', { index: i, last: i === CLOCK_TIMING.strikes.length - 1 }))
      // Escapement tick every beat once the movement is running.
      const beat = Math.floor(Math.max(0, t - 0.3))
      if (beat !== Math.floor(Math.max(0, prev - 0.3)) && gearSpeed() > 0.05) {
        camera.getWorldPosition(sim.cam)
        const d = Math.hypot(sim.cam.x, sim.cam.y - 68, sim.cam.z)
        emitStoryEvent('clock:tick', { tock: beat % 2 === 1, proximity: clamp(1 - d / 140, 0, 1) })
      }
    }
    sim.prevT = t
  }, -2.5)

  return (
    <group name="GreatChristmasClockDestination">
      <ClockMechanism />
      <BellShockwave />
    </group>
  )
}
