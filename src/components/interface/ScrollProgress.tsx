import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import { journey } from '../../cinematic/journey'
import { STORY_BEATS } from '../../config/destinations'
import { cn } from '../../lib/cn'

/** A thin thread of light on the right edge; updated directly, no React renders. */
export function ScrollProgress({ visible }: { visible: boolean }) {
  const fill = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const tick = () => {
      if (fill.current) fill.current.style.transform = `scaleY(${journey.progress.toFixed(4)})`
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed top-1/2 right-5 z-20 h-[34vh] w-px -translate-y-1/2 bg-frost/12 transition-opacity duration-[1500ms] sm:right-9',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div ref={fill} className="h-full w-full origin-top scale-y-0 bg-gradient-to-b from-ember/40 to-ember" />
      {STORY_BEATS.slice(1).map((b, i) => (
        <span
          key={b.id}
          className={cn(
            'absolute rounded-full border bg-night',
            b.destination !== STORY_BEATS[i].destination
              ? '-left-[3px] size-[7px] border-ember/70'
              : '-left-[2px] size-[5px] border-frost/30',
          )}
          style={{ top: `calc(${b.start * 100}% - 2px)` }}
        />
      ))}
    </div>
  )
}
