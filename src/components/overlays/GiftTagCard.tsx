import { ChevronDown, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'
import { useExperience } from '../../store/experience-store'

/** The hero gift's tag — it ties the Workshop to the stopped Great Clock. */
export function GiftTagCard() {
  const open = useExperience((s) => s.openHotspot === 'gift')
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
      aria-labelledby="tag-title"
      aria-hidden={!open}
      className={cn(
        'fixed inset-x-4 bottom-6 z-40 mx-auto max-w-md transition-all duration-1000 sm:inset-x-auto sm:top-1/2 sm:right-10 sm:bottom-auto sm:left-auto sm:-translate-y-1/2',
        open ? 'opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      {/* A luggage-tag shaped card */}
      <div className="relative rotate-[-1.5deg] rounded-sm bg-[#f3e7cc] px-8 py-9 text-[#3b1c0e] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] sm:px-10">
        <span className="absolute top-5 left-1/2 size-3 -translate-x-1/2 rounded-full border-2 border-[#b3121b] bg-[#03050b]" />
        <button
          ref={close}
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpenHotspot(null)}
          className="absolute top-3 right-3 p-2 text-[#3b1c0e]/50 transition-colors hover:text-[#b3121b]"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <p className="mt-4 font-sans text-[10px] tracking-[0.45em] text-[#b3121b] uppercase">The tag reads</p>
        <h2 id="tag-title" className="mt-4 font-display text-3xl leading-tight italic sm:text-4xl">
          For the Great Clock.
        </h2>
        <p className="mt-4 font-display text-lg leading-relaxed">
          To be opened at midnight, if the hands are moving again.
        </p>
        <div className="mt-7 h-px w-full bg-[#3b1c0e]/20" />
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpenHotspot(null)}
          className="mt-5 flex items-center gap-3 font-sans text-[10px] tracking-[0.4em] text-[#b3121b] uppercase transition-opacity hover:opacity-70"
        >
          <ChevronDown className="size-3.5" aria-hidden />
          Follow the gift
        </button>
      </div>
    </div>
  )
}
