import { gsap } from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { emitStoryEvent } from '../../cinematic/story-events'
import { clockState } from '../../experience/destinations/clock/clock-state'
import { pointer } from '../../interaction/pointer-controller'
import { cn } from '../../lib/cn'
import { useExperience } from '../../store/experience-store'

const HOLD_SECONDS = 2.2
const RING = 2 * Math.PI * 46

/**
 * The central interaction of the journey: press and hold to wind the Great
 * Clock. Works with mouse, touch and keyboard (hold Space or Enter). Releasing
 * early lets the spring slowly unwind. When fully wound, the clock awakens.
 */
export function ClockActivation() {
  const atGate = useExperience((s) => s.atClockGate)
  const phase = useExperience((s) => s.phase)
  const [started, setStarted] = useState(false)
  const [idleHint, setIdleHint] = useState(false)
  const [percent, setPercent] = useState(0)
  const holding = useRef(false)
  const ring = useRef<SVGCircleElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const visible = atGate && !started && phase === 'journey'

  useEffect(() => {
    // Keep local state in sync if the journey is restarted.
    const tick = () => {
      const running = clockState.t >= 0
      if (running !== started) setStarted(running)
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [started])

  useEffect(() => {
    if (!visible) return
    pointer.enabled = false
    button.current?.focus({ preventScroll: true })
    const idle = window.setTimeout(() => setIdleHint(true), 4500)
    let lastStep = 0
    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(deltaMs / 1000, 0.1)
      const w = clockState.wind
      clockState.wind = holding.current ? Math.min(1, w + dt / HOLD_SECONDS) : Math.max(0, w - dt * 0.45)
      if (ring.current) ring.current.style.strokeDashoffset = String(RING * (1 - clockState.wind))
      const step = Math.floor(clockState.wind * 16)
      if (step > lastStep) emitStoryEvent('clock:wind', { progress: clockState.wind })
      lastStep = step
      const pct = Math.round(clockState.wind * 100)
      setPercent((p) => (Math.abs(p - pct) >= 10 || pct === 100 ? pct : p))
      if (clockState.wind >= 1 && clockState.t < 0) {
        holding.current = false
        clockState.t = 0
        emitStoryEvent('clock:start', {})
        setStarted(true)
      }
    }
    gsap.ticker.add(tick)
    return () => {
      window.clearTimeout(idle)
      gsap.ticker.remove(tick)
      pointer.enabled = true
    }
  }, [visible])

  const start = () => {
    holding.current = true
    setIdleHint(false)
  }
  const stop = () => {
    holding.current = false
  }

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'fixed inset-x-0 bottom-[9vh] z-30 flex flex-col items-center gap-4 transition-opacity duration-1000',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <button
        ref={button}
        type="button"
        tabIndex={visible ? 0 : -1}
        aria-label="Wind the Great Clock: press and hold"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          start()
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onLostPointerCapture={stop}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault()
            start()
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') stop()
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="group relative size-28 touch-none rounded-full select-none"
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="rgba(3,5,11,0.45)" stroke="rgba(243,217,164,0.18)" strokeWidth="2" />
          <circle
            ref={ring}
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="#f3d9a4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={RING}
            style={{ filter: 'drop-shadow(0 0 6px rgba(243,217,164,0.8))' }}
          />
        </svg>
        <span className={cn('absolute inset-0 m-auto size-16 rounded-full border border-ember/40 transition-transform duration-500 group-active:scale-90', idleHint && 'animate-slow-pulse')} />
        {/* A little brass key */}
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto size-8 text-ember" aria-hidden>
          <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <circle cx="8" cy="8" r="4" />
            <circle cx="8" cy="8" r="1.4" />
            <path d="M11 11l8 8M16 16l2-2M18.5 18.5l1.5-1.5" />
          </g>
        </svg>
      </button>
      <p className="text-shadow-glow font-sans text-[10px] tracking-[0.42em] text-ember uppercase">Press and hold to wind the Great Clock</p>
      <p className="sr-only" aria-live="polite">
        {percent > 0 ? `Winding: ${percent} percent` : ''}
      </p>
    </div>
  )
}
