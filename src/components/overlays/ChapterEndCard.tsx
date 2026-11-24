import { RotateCcw } from 'lucide-react'
import { restartJourney } from '../../cinematic/story-controller'
import { DESTINATIONS } from '../../config/destinations'
import { cn } from '../../lib/cn'
import { useExperience } from '../../store/experience-store'

const NEXT = DESTINATIONS.find((d) => !d.available)
const TEASERS: Partial<Record<string, string>> = {
  clock: 'The gift has arrived. The hands still have not moved.',
  stables: 'Nine reindeer, one sleigh, and a driver no one has seen yet.',
  flight: 'The sky is clear. The sleigh is ready.',
  morning: 'Somewhere, the sun is about to rise.',
}

/** End of the currently built journey: points at the next destination in production. */
export function ChapterEndCard() {
  const reachedEnd = useExperience((s) => s.reachedEnd)
  return (
    <section
      aria-labelledby="end-title"
      aria-hidden={!reachedEnd}
      className={cn(
        'fixed inset-0 z-30 flex flex-col items-center justify-end px-6 pb-[14vh] text-center transition-opacity duration-[1800ms]',
        'bg-[linear-gradient(to_top,rgba(3,5,11,0.88)_0%,rgba(3,5,11,0.55)_38%,transparent_70%)]',
        reachedEnd ? 'opacity-100 delay-700' : 'pointer-events-none opacity-0',
      )}
    >
      {NEXT && (
        <>
          <p className="font-sans text-[10px] tracking-[0.55em] text-ember/80 uppercase">
            Next · Destination {String(NEXT.index).padStart(2, '0')}
          </p>
          <h2 id="end-title" className="text-shadow-glow mt-5 font-display text-[clamp(2.2rem,6vw,4.5rem)] leading-none font-light text-frost">
            {NEXT.title}
          </h2>
          <p className="mt-5 max-w-md font-display text-lg text-frost/70 italic">
            {TEASERS[NEXT.id] ?? ''}
          </p>
          <p className="mt-6 font-sans text-[10px] tracking-[0.4em] text-frost/45 uppercase">In production</p>
        </>
      )}
      <button
        type="button"
        tabIndex={reachedEnd ? 0 : -1}
        onClick={restartJourney}
        className="mt-9 flex items-center gap-3 rounded-full border border-ember/40 px-7 py-3.5 font-sans text-[10px] tracking-[0.4em] text-ember uppercase transition-colors hover:bg-ember/10"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        Return to the mountains
      </button>
    </section>
  )
}
