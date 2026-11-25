import { gsap } from 'gsap'
import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { journey } from '../../cinematic/journey'
import { emitStoryEvent } from '../../cinematic/story-events'
import { restartJourney } from '../../cinematic/story-controller'
import { chapterLocal } from '../../config/destinations'
import { smoothstep } from '../../lib/math'

/**
 * Christmas Morning — the closing words, set over the golden valley.
 * Each line rises in with the scroll (and fades back if you scroll up), so the
 * ending is paced by the visitor, like the rest of the journey.
 */
const STAGES = [
  { from: 0.56, to: 0.63 }, // The magic was never just in the gifts.
  { from: 0.65, to: 0.72 }, // It was in the moments…
  { from: 0.78, to: 0.84 }, // Merry Christmas
  { from: 0.86, to: 0.92 }, // Begin again
]

export function EndingSequence() {
  const line0 = useRef<HTMLHeadingElement>(null)
  const line1 = useRef<HTMLParagraphElement>(null)
  const line2 = useRef<HTMLDivElement>(null)
  const line3 = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const [interactive, setInteractive] = useState(false)

  useEffect(() => {
    let greeted = false
    let wasInteractive = false
    const lines = [line0, line1, line2, line3]
    const tick = () => {
      const t = chapterLocal(journey.progress, 'morning')
      STAGES.forEach((s, i) => {
        const el = lines[i].current
        if (!el) return
        const v = smoothstep(s.from, s.to, t)
        el.style.opacity = v.toFixed(3)
        el.style.transform = `translateY(${((1 - v) * 14).toFixed(1)}px)`
        el.style.filter = `blur(${((1 - v) * 4).toFixed(1)}px)`
      })
      if (scrim.current) scrim.current.style.opacity = (smoothstep(0.52, 0.62, t) * 0.85).toFixed(3)
      const greet = t >= STAGES[2].from
      if (greet && !greeted) emitStoryEvent('morning:greeting', {})
      greeted = greet
      const canRestart = t > STAGES[3].from + 0.02
      if (canRestart !== wasInteractive) {
        wasInteractive = canRestart
        setInteractive(canRestart)
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <section aria-label="Christmas morning" className="pointer-events-none fixed inset-0 z-[25] flex flex-col items-center justify-center px-6 text-center">
      <div
        ref={scrim}
        aria-hidden
        className="absolute inset-0 opacity-0"
        style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 50%, rgba(20,12,18,0.55) 0%, rgba(20,12,18,0.2) 55%, transparent 80%)' }}
      />
      <h2
        ref={line0}
        className="relative max-w-4xl font-display text-[clamp(1.9rem,5.2vw,4.4rem)] leading-[1.05] font-light tracking-[0.08em] text-[#fff6e8] uppercase opacity-0"
        style={{ textShadow: '0 2px 30px rgba(60,25,10,0.55)' }}
      >
        The magic was never just in the gifts.
      </h2>
      <p
        ref={line1}
        className="relative mt-7 max-w-xl font-display text-[clamp(1.25rem,2.6vw,1.9rem)] leading-snug text-[#fde9cf] italic opacity-0"
        style={{ textShadow: '0 2px 20px rgba(60,25,10,0.6)' }}
      >
        It was in the moments that brought us together.
      </p>
      <div ref={line2} className="relative mt-16 opacity-0">
        <p className="font-sans text-[10px] tracking-[0.6em] text-[#ffd9a0] uppercase">From everyone at the North Pole</p>
        <p className="mt-3 font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-none font-light text-[#fff6e8]" style={{ textShadow: '0 2px 28px rgba(60,25,10,0.55)' }}>
          Merry Christmas
        </p>
      </div>
      <div ref={line3} className={`relative mt-12 opacity-0 ${interactive ? 'pointer-events-auto' : ''}`}>
        <button
          type="button"
          tabIndex={interactive ? 0 : -1}
          aria-hidden={!interactive}
          onClick={restartJourney}
          className="flex items-center gap-3 rounded-full border border-[#ffd9a0]/50 bg-[#1a0f12]/25 px-8 py-4 font-sans text-[11px] tracking-[0.42em] text-[#ffe8c4] uppercase backdrop-blur-sm transition-colors hover:bg-[#ffd9a0]/15"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Begin the journey again
        </button>
      </div>
    </section>
  )
}
