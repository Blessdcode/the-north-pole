import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'
import { journey } from '../../cinematic/journey'
import { chapterLocal } from '../../config/destinations'
import { smoothstep } from '../../lib/math'

/**
 * The tunnel transition out of Destination 02: the camera follows the Express
 * into the mountain, the world falls to black, and a warm glow grows at the
 * end of the bore — which opens into the Great Workshop (Destination 03).
 * Driven directly from journey progress, so it scrubs both ways.
 */
export function TunnelTransition() {
  const dark = useRef<HTMLDivElement>(null)
  const glow = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tick = () => {
      const t = chapterLocal(journey.progress, 'express')
      const w = chapterLocal(journey.progress, 'workshop')
      // Into the tunnel → black → warm glow → the Workshop hall resolves out of it.
      const black = smoothstep(0.9, 0.985, t) * (1 - smoothstep(0.015, 0.075, w))
      const light = smoothstep(0.955, 1, t) * (1 - smoothstep(0.0, 0.06, w))
      if (dark.current) dark.current.style.opacity = black.toFixed(3)
      if (glow.current) {
        glow.current.style.opacity = (light * 0.9).toFixed(3)
        glow.current.style.transform = `scale(${(0.6 + light * 0.5).toFixed(3)})`
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[15]">
      <div ref={dark} className="absolute inset-0 bg-black opacity-0" />
      <div
        ref={glow}
        className="absolute inset-0 opacity-0"
        style={{
          background:
            'radial-gradient(ellipse 52% 46% at 50% 50%, rgba(255,226,170,0.98) 0%, rgba(255,176,86,0.82) 42%, rgba(150,64,16,0.3) 74%, transparent 100%)',
        }}
      />
    </div>
  )
}
