import { cn } from '../../lib/cn'
import { useExperience } from '../../store/experience-store'

export function LoadingScreen() {
  const isLoading = useExperience((s) => s.isLoading)
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!isLoading}
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-night transition-opacity duration-[1400ms]',
        isLoading ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <p className="font-display text-sm tracking-[0.6em] text-frost/60 uppercase">The North Pole</p>
      <div className="mt-6 h-px w-40 overflow-hidden bg-frost/10">
        <div className="animate-slow-pulse h-full w-full bg-gradient-to-r from-transparent via-ember/80 to-transparent" />
      </div>
      <p className="mt-5 font-sans text-[11px] tracking-[0.3em] text-frost/40 uppercase">Charting the Arctic</p>
    </div>
  )
}
