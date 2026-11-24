import { journey } from '../../../cinematic/journey'
import { STORY_BEATS } from '../../../config/destinations'
import { damp, smoothstep } from '../../../lib/math'

/**
 * Shared WeatherController.
 * Each story beat authors a weather profile; the controller blends smoothly
 * between neighbouring profiles by journey progress and damps over time so
 * scrubbing never causes visual pops. Read by snow, fog, sky, aurora, audio.
 */
export const weather = {
  snow: 0,
  wind: 0.8,
  /** Wind direction on the ground plane (unit-ish, world space). */
  windX: 0.55,
  windZ: 0.25,
  fog: 0.0005,
  aurora: 0.3,
  /** Momentary gust energy (0–1) for environmental reactions. */
  gust: 0,
  /** Surge from a strike of the Great Clock bell (0–1, decays): snow swirls, aurora flares. */
  surge: 0,
}

const blendTarget = { snow: 0, wind: 0, fog: 0, aurora: 0 }

function profileAt(p: number) {
  const beats = STORY_BEATS
  // Blend across a short window around each boundary.
  const W = 0.025
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i]
    if (p < b.end || i === beats.length - 1) {
      const next = beats[Math.min(i + 1, beats.length - 1)]
      const t = smoothstep(b.end - W, b.end + W, p)
      blendTarget.snow = b.weather.snow + (next.weather.snow - b.weather.snow) * t
      blendTarget.wind = b.weather.wind + (next.weather.wind - b.weather.wind) * t
      blendTarget.fog = b.weather.fog + (next.weather.fog - b.weather.fog) * t
      blendTarget.aurora = b.weather.aurora + (next.weather.aurora - b.weather.aurora) * t
      return blendTarget
    }
  }
  return blendTarget
}

export function updateWeather(time: number, dt: number) {
  const target = profileAt(journey.progress)
  const reveal = journey.reveal
  weather.snow = damp(weather.snow, target.snow * reveal, 1.5, dt)
  weather.fog = damp(weather.fog, target.fog, 1.2, dt)
  weather.aurora = damp(weather.aurora, target.aurora * reveal, 0.8, dt)

  // Gusts: slow noise-like modulation of wind strength.
  const gust = 0.5 + 0.5 * Math.sin(time * 0.21) * Math.sin(time * 0.53 + 1.3)
  weather.gust = gust
  weather.wind = damp(weather.wind, target.wind * (0.7 + gust * 0.6), 1.2, dt)
  const angle = 0.42 + Math.sin(time * 0.05) * 0.25
  weather.windX = Math.cos(angle)
  weather.windZ = Math.sin(angle)
}
