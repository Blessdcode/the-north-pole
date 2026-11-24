import { useFrame } from '@react-three/fiber'
import { damp } from '../lib/math'
import { useExperience } from '../store/experience-store'
import { journey } from './journey'

/**
 * Advances the smoothed journey progress once per frame, BEFORE anything that
 * reads it (train, camera, weather). Running first guarantees the camera and
 * the train it tracks always agree on the same frame — no tracking jitter.
 */
export function StoryClock() {
  const reducedMotion = useExperience((s) => s.reducedMotion)
  useFrame((_, rawDt) => {
    const dt = Math.min(Math.max(rawDt, 0), 1 / 20)
    const prev = journey.progress
    journey.progress = damp(journey.progress, journey.target, reducedMotion ? 1.6 : 2.4, dt)
    journey.velocity = (journey.progress - prev) / Math.max(dt, 1e-4)
  }, -3)
  return null
}
