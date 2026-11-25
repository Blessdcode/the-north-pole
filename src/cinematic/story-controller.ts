import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { audioManager } from '../audio/engine/audio-manager'
import { beatIndexAt, chapterAt, chapterLocal, CLOCK_GATE } from '../config/destinations'
import { clockState, isClockRunning, resetClock } from '../experience/destinations/clock/clock-state'
import { environment } from '../experience/systems/lighting/environment'
import { weather } from '../experience/systems/weather/weather-controller'
import { useExperience } from '../store/experience-store'
import { flightState } from '../experience/destinations/flight/flight-path'
import { smoothstep } from '../lib/math'
import { trainState } from './express-timeline'
import { journey } from './journey'

gsap.registerPlugin(ScrollTrigger)

/**
 * The story controller — the single coordinated update loop.
 *
 *   gsap.ticker ─▶ lenis.raf()            (smooth scroll)
 *               └▶ ScrollTrigger.update   (via lenis 'scroll')
 *               └▶ story bookkeeping       (beats, audio params, pulse decay)
 *               └▶ R3F advance()           (registered by the canvas FrameDriver)
 *
 * Scroll progress becomes `journey.target`; the camera rig damps toward it.
 */
export const scroll = {
  lenis: null as Lenis | null,
}

export function attachStoryController(track: HTMLElement, reducedMotion: boolean) {
  const lenis = new Lenis({
    autoRaf: false,
    lerp: reducedMotion ? 0.2 : 0.075,
    smoothWheel: true,
    wheelMultiplier: 0.85,
    touchMultiplier: 1.2,
  })
  scroll.lenis = lenis
  lenis.stop()
  document.documentElement.classList.add('is-locked')

  lenis.on('scroll', ScrollTrigger.update)

  const store = useExperience.getState
  const trigger = ScrollTrigger.create({
    trigger: track,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      let p = self.progress
      // Story gate: the journey waits inside the clock until it has been wound
      // and its awakening has played.
      if (!clockState.gateOpen && p > CLOCK_GATE) {
        lenis.scrollTo(self.start + (self.end - self.start) * CLOCK_GATE, { immediate: true, force: true })
        p = CLOCK_GATE
      }
      journey.target = p
      const s = store()
      const atGate = !clockState.gateOpen && p >= CLOCK_GATE - 0.0015
      if (atGate !== s.atClockGate) s.setAtClockGate(atGate)
      const beat = beatIndexAt(p)
      if (beat !== s.activeBeat) s.setActiveBeat(beat)
      const chapter = chapterAt(p).id
      if (chapter !== s.activeDestination) s.setActiveDestination(chapter)
      if (!s.hasScrolled && p > 0.01) s.setHasScrolled()
      const end = p > 0.975
      if (end !== s.reachedEnd) s.setReachedEnd(end)
    },
  })

  let frame = 0
  const tick = (time: number, deltaMs: number) => {
    lenis.raf(time * 1000)
    const dt = Math.min(deltaMs / 1000, 0.1)
    journey.pulse *= Math.exp(-dt * 1.4)
    // The awakening has finished: release the story gate.
    if (clockState.gateOpen && store().atClockGate) store().setAtClockGate(false)
    if (++frame % 4 === 0) {
      const p = journey.progress
      // The score's opening-up follows the arrival; later chapters keep it fully open.
      const ch = chapterAt(p).id
      const musicProgress = ch === 'arrival' ? chapterLocal(p, 'arrival') : ch === 'clock' && !isClockRunning() ? 0.45 : 1
      audioManager.update(musicProgress, weather.wind)
      audioManager.setChapter(chapterAt(p).id)
      const fl = chapterLocal(p, 'flight')
      if (ch === 'flight') {
        // Air rushing past the sleigh; the score climbs to its climax and resolves as they fly away.
        audioManager.setTrain(flightState.speed * 0.3, 0.9)
        audioManager.setFlightIntensity(smoothstep(0.08, 0.3, fl) * 0.7 + smoothstep(0.45, 0.6, fl) * 0.3 - smoothstep(0.9, 1, fl) * 0.6)
      } else {
        audioManager.setTrain(trainState.speed, trainState.proximity)
        audioManager.setFlightIntensity(0)
      }
      audioManager.setInterior(environment.interior)
    }
  }
  gsap.ticker.add(tick, false, true)
  gsap.ticker.lagSmoothing(0)

  return () => {
    gsap.ticker.remove(tick)
    trigger.kill()
    lenis.destroy()
    scroll.lenis = null
    document.documentElement.classList.remove('is-locked')
  }
}

export function unlockScroll() {
  document.documentElement.classList.remove('is-locked')
  scroll.lenis?.start()
}

export function restartJourney() {
  const lenis = scroll.lenis
  if (!lenis) return
  // A fresh journey: the Great Clock stops again, waiting to be wound.
  resetClock()
  audioManager.resetCelebration()
  useExperience.getState().setAtClockGate(false)
  const reduced = useExperience.getState().reducedMotion
  lenis.scrollTo(0, { duration: reduced ? 1.5 : 6, easing: (t) => 1 - Math.pow(1 - t, 3) })
}
