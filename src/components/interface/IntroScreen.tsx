import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { useExperience } from '../../store/experience-store'

/** Title card. The world waits in darkness behind it. */
export function IntroScreen({ onStart }: { onStart: () => void }) {
  const phase = useExperience((s) => s.phase)
  const visible = phase === 'intro'
  const shown = phase === 'intro' || phase === 'loading'
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (visible) button.current?.focus({ preventScroll: true })
  }, [visible])

  return (
    <section
      aria-labelledby="intro-title"
      aria-hidden={!visible}
      className={cn(
        'fixed inset-0 z-40 flex flex-col items-center justify-center px-6 text-center transition-opacity duration-[1600ms]',
        shown ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <p
        className={cn(
          'font-sans text-[10px] tracking-[0.55em] text-ember/70 uppercase transition-all delay-300 duration-[1800ms] sm:text-[11px]',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
        )}
      >
        A Christmas Eve Journey
      </p>
      <h1
        id="intro-title"
        className={cn(
          'mt-6 font-display text-[clamp(3rem,11vw,8.5rem)] leading-[0.9] font-light tracking-[0.06em] text-frost uppercase transition-all delay-500 duration-[2200ms]',
          visible ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-3 opacity-0 blur-sm',
        )}
      >
        The North
        <br />
        Pole
      </h1>
      <p
        className={cn(
          'mt-8 max-w-md font-display text-lg leading-relaxed text-frost/60 italic transition-opacity delay-[900ms] duration-[2000ms] sm:text-xl',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        Hidden beyond the Arctic mountains, a village is preparing for the most important night of the year.
      </p>
      <button
        ref={button}
        type="button"
        onClick={onStart}
        disabled={!visible}
        className={cn(
          'group mt-14 flex items-center gap-4 rounded-full border border-ember/40 px-8 py-4 font-sans text-[11px] tracking-[0.42em] text-ember uppercase transition-all delay-[1300ms] duration-[1600ms] hover:border-ember hover:bg-ember/10 hover:delay-0 hover:duration-500',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        <span className="inline-block size-1.5 rounded-full bg-ember shadow-[0_0_10px_3px_rgba(243,217,164,0.6)] transition-transform group-hover:scale-150" />
        Begin the journey
      </button>
      <p
        className={cn(
          'mt-6 font-sans text-[10px] tracking-[0.3em] text-frost/35 uppercase transition-opacity delay-[1700ms] duration-[1600ms]',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        Best experienced with sound
      </p>
    </section>
  )
}
