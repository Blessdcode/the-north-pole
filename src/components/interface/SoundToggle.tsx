import { VolumeX } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useExperience } from '../../store/experience-store'

export function SoundToggle({ visible }: { visible: boolean }) {
  const soundEnabled = useExperience((s) => s.soundEnabled)
  const toggleSound = useExperience((s) => s.toggleSound)
  return (
    <button
      type="button"
      onClick={toggleSound}
      aria-pressed={soundEnabled}
      aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
      className={cn(
        'fixed top-4 right-4 z-30 flex items-center gap-3 rounded-full px-4 py-3 text-frost/70 transition-all duration-700 hover:text-ember sm:top-7 sm:right-7',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <span className="hidden font-sans text-[10px] tracking-[0.4em] uppercase sm:inline">
        {soundEnabled ? 'Sound on' : 'Sound off'}
      </span>
      {/* Equaliser bars breathe while sound is on. */}
      <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
        {[0.6, 1, 0.75, 0.9].map((h, i) => (
          <span
            key={i}
            className={cn('w-[2px] rounded-full bg-current transition-all duration-500', soundEnabled && 'animate-slow-pulse')}
            style={{ height: soundEnabled ? `${h * 100}%` : '20%', animationDelay: `${i * 0.27}s` }}
          />
        ))}
      </span>
      {!soundEnabled && <VolumeX className="size-4" aria-hidden />}
    </button>
  )
}
