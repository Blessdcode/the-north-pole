import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import { audioManager } from '../../audio/engine/audio-manager'
import { cn } from '../../lib/cn'
import { type HotspotId, hotspotAnchors } from './hotspot-anchors'

/**
 * A clickable environmental hotspot pinned to a world-space anchor.
 * Pure DOM (keyboard focusable, screen-reader labelled); its screen position
 * is written directly each frame from the projected anchor.
 */
export function Hotspot({
  id,
  label,
  ariaLabel,
  visible,
  onActivate,
}: {
  id: HotspotId
  label: string
  ariaLabel: string
  visible: boolean
  onActivate: () => void
}) {
  const el = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const anchor = hotspotAnchors[id]
    const tick = () => {
      if (!el.current) return
      el.current.style.transform = `translate3d(${anchor.x.toFixed(1)}px, ${anchor.y.toFixed(1)}px, 0) translate(-50%, -50%)`
      el.current.style.visibility = anchor.onScreen ? 'visible' : 'hidden'
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [id])

  return (
    <button
      ref={el}
      type="button"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      onMouseEnter={() => audioManager.playChime(88)}
      onFocus={() => audioManager.playChime(88)}
      onClick={onActivate}
      className={cn(
        'group fixed top-0 left-0 z-30 flex size-14 items-center justify-center rounded-full transition-opacity duration-700',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-label={ariaLabel}
    >
      <span className="animate-ring absolute inset-0 rounded-full border border-ember/70" />
      <span className="absolute inset-3 rounded-full border border-ember/60 bg-ember/10 backdrop-blur-[2px] transition-transform duration-500 group-hover:scale-110" />
      <span className="size-1.5 rounded-full bg-ember shadow-[0_0_12px_4px_rgba(243,217,164,0.7)]" />
      <span className="text-shadow-glow pointer-events-none absolute top-full mt-2 font-sans text-[10px] tracking-[0.35em] whitespace-nowrap text-ember uppercase">
        {label}
      </span>
    </button>
  )
}
