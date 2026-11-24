import { DESTINATIONS } from '../../config/destinations'
import { cn } from '../../lib/cn'
import { useExperience } from '../../store/experience-store'

/** Seven destinations as seven quiet marks; only the current one is named. */
export function ChapterIndicator({ visible }: { visible: boolean }) {
  const active = useExperience((s) => s.activeDestination)
  const current = DESTINATIONS.find((d) => d.id === active)!

  return (
    <nav
      aria-label="Journey chapters"
      className={cn(
        'pointer-events-none fixed bottom-6 left-5 z-20 transition-opacity duration-[1500ms] sm:bottom-9 sm:left-9',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <p className="text-shadow-glow font-display text-4xl leading-none font-light text-frost/90 sm:text-5xl">
        {String(current.index).padStart(2, '0')}
      </p>
      <p className="text-shadow-glow mt-2 font-sans text-[10px] tracking-[0.42em] text-frost/70 uppercase">
        {current.title}
      </p>
      <ol className="mt-4 flex gap-1.5" aria-label={`Destination ${current.index} of ${DESTINATIONS.length}`}>
        {DESTINATIONS.map((d) => (
          <li
            key={d.id}
            title={d.title}
            className={cn(
              'h-px transition-all duration-700',
              d.id === active ? 'w-8 bg-ember' : d.available ? 'w-4 bg-frost/50' : 'w-4 bg-frost/15',
            )}
          >
            <span className="sr-only">
              {d.index}. {d.title}
              {d.id === active ? ' (current)' : d.available ? '' : ' (coming soon)'}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
