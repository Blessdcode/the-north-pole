import { ChevronDown } from 'lucide-react'
import { useMemo } from 'react'
import { cn } from '../../lib/cn'
import { useExperience } from '../../store/experience-store'

export function InteractionHint() {
  const phase = useExperience((s) => s.phase)
  const hasScrolled = useExperience((s) => s.hasScrolled)
  const touch = useMemo(() => window.matchMedia('(pointer: coarse)').matches, [])
  const visible = phase === 'journey' && !hasScrolled

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-5 z-20 flex flex-col items-center gap-1.5 transition-opacity duration-[1200ms] sm:bottom-7',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <p className="text-shadow-glow font-sans text-[10px] tracking-[0.45em] text-frost/75 uppercase">
        {touch ? 'Swipe up to journey' : 'Scroll to journey'}
      </p>
      <p className="text-shadow-glow font-sans text-[9px] tracking-[0.35em] text-frost/40 uppercase">
        {touch ? 'Drag sideways to look around' : 'Move to look around'}
      </p>
      <ChevronDown className="animate-hint mt-1 size-4 text-ember" aria-hidden />
    </div>
  )
}
