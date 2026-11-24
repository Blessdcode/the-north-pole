import { ChevronDown, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { useExperience } from '../../store/experience-store'

/** The story beat behind the clock hotspot — the problem the visitor will solve. */
export function ClockStoryCard() {
  const open = useExperience((s) => s.openHotspot === 'clock')
  const setOpenHotspot = useExperience((s) => s.setOpenHotspot)
  const close = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    close.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenHotspot(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpenHotspot])

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="clock-title"
      aria-hidden={!open}
      className={cn(
        'fixed inset-x-4 bottom-6 z-40 mx-auto max-w-lg transition-all duration-1000 sm:inset-x-auto sm:right-10 sm:bottom-auto sm:left-auto sm:top-1/2 sm:-translate-y-1/2',
        open ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <div className="relative rounded-sm border border-ember/20 bg-night/70 px-7 py-8 backdrop-blur-md sm:px-10 sm:py-11">
        <button
          ref={close}
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpenHotspot(null)}
          className="absolute top-3 right-3 p-2 text-frost/50 transition-colors hover:text-ember"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <p className="font-sans text-[10px] tracking-[0.5em] text-ember/80 uppercase">Something is wrong</p>
        <h2 id="clock-title" className="mt-4 font-display text-3xl leading-tight font-light text-frost sm:text-4xl">
          The Great Christmas Clock has stopped.
        </h2>
        <p className="mt-5 font-display text-lg leading-relaxed text-frost/70 italic">
          Its hands have not moved since seven minutes to midnight. Without it, Christmas Eve cannot begin.
        </p>
        <div className="mt-8 h-px w-full bg-gradient-to-r from-ember/40 to-transparent" />
        <p className="mt-6 font-sans text-[10px] tracking-[0.35em] text-frost/45 uppercase">
          Somewhere down the line, a whistle answers.
        </p>
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpenHotspot(null)}
          className="mt-6 flex items-center gap-3 font-sans text-[10px] tracking-[0.4em] text-ember uppercase transition-opacity hover:opacity-70"
        >
          <ChevronDown className="size-3.5" aria-hidden />
          Continue · 02 The Christmas Express
        </button>
      </div>
    </div>
  )
}
