import { STORY_BEATS } from '../../config/destinations'
import { cn } from '../../lib/cn'
import { useExperience } from '../../store/experience-store'

/** Small narrative typography — one quiet line per story beat. */
export function NarrativeCaption() {
  const phase = useExperience((s) => s.phase)
  const activeBeat = useExperience((s) => s.activeBeat)
  const openHotspot = useExperience((s) => s.openHotspot)
  const reachedEnd = useExperience((s) => s.reachedEnd)
  const atClockGate = useExperience((s) => s.atClockGate)
  const live = (phase === 'opening' || phase === 'journey') && !openHotspot && !reachedEnd && !atClockGate

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[16vh] z-20 flex justify-center px-6 sm:top-auto sm:bottom-[21vh]"
    >
      {STORY_BEATS.map((beat, i) => {
        const on = live && i === activeBeat
        return (
          <div
            key={beat.id}
            aria-hidden={!on}
            className={cn(
              'absolute top-0 max-w-xl text-center transition-all ease-out sm:top-auto sm:bottom-0',
              on ? 'translate-y-0 opacity-100 blur-0 delay-500 duration-[1800ms]' : 'translate-y-3 opacity-0 blur-[3px] duration-700',
            )}
          >
            {beat.kicker && (
              <p className="text-shadow-glow font-sans text-[10px] tracking-[0.5em] text-ember/80 uppercase sm:text-[11px]">
                {beat.kicker}
              </p>
            )}
            <p className="text-shadow-glow mt-3 font-display text-[clamp(1.35rem,3.2vw,2.1rem)] leading-snug font-light text-frost italic">
              {beat.line}
            </p>
          </div>
        )
      })}
    </div>
  )
}
