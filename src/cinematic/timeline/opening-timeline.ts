import { gsap } from 'gsap'
import { audioManager } from '../../audio/engine/audio-manager'
import { journey } from '../journey'

/**
 * Destination 01 opening: darkness → wind → snow → a distant bell → the world.
 * Sound arrives before sight, exactly as scripted.
 */
export function playOpening({
  veil,
  reducedMotion,
  onComplete,
}: {
  veil: HTMLElement | null
  reducedMotion: boolean
  onComplete: () => void
}) {
  const k = reducedMotion ? 0.45 : 1
  const tl = gsap.timeline({ onComplete })

  tl.call(() => {
    audioManager.fadeBus('music', 0, 0.01)
    audioManager.fadeBus('ambience', 1, 3.5 * k)
  })
  // Snow and starlight emerge from the black.
  tl.to(journey, { reveal: 0.35, duration: 3.2 * k, ease: 'power1.in' }, 1.4 * k)
  if (veil) tl.to(veil, { opacity: 0, duration: 6 * k, ease: 'power2.inOut' }, 1.2 * k)
  tl.call(() => audioManager.playBell(0.92, 45), [], 3.4 * k)
  tl.call(() => audioManager.fadeBus('music', 1, 9), [], 3.6 * k)
  tl.to(journey, { reveal: 1, duration: 4.5 * k, ease: 'power2.inOut' }, 4.4 * k)
  tl.call(() => audioManager.playBell(0.97, 45), [], 8.2 * k)
  tl.call(() => void 0, [], 8.6 * k)
  return tl
}
