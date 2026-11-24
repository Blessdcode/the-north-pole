import { create } from 'zustand'
import type { DestinationId } from '../config/destinations'
import { detectQuality, detectReducedMotion, type QualityLevel } from '../config/quality'

/**
 * Low-frequency application state only.
 * Per-frame values (camera, pointer, journey progress) live in mutable
 * channels — see cinematic/journey.ts and interaction/pointer-controller.ts.
 */
export type ExperiencePhase = 'loading' | 'intro' | 'opening' | 'journey'

interface ExperienceState {
  phase: ExperiencePhase
  isStarted: boolean
  isLoading: boolean
  activeDestination: DestinationId
  activeBeat: number
  hasScrolled: boolean
  reachedEnd: boolean
  /** The story is waiting for the visitor to wind the Great Clock. */
  atClockGate: boolean
  soundEnabled: boolean
  quality: QualityLevel
  reducedMotion: boolean
  openHotspot: string | null

  setLoaded: () => void
  start: () => void
  setPhase: (phase: ExperiencePhase) => void
  setActiveBeat: (beat: number) => void
  setActiveDestination: (id: DestinationId) => void
  setHasScrolled: () => void
  setReachedEnd: (v: boolean) => void
  setAtClockGate: (v: boolean) => void
  toggleSound: () => void
  setQuality: (q: QualityLevel) => void
  setReducedMotion: (v: boolean) => void
  setOpenHotspot: (id: string | null) => void
}

export const useExperience = create<ExperienceState>((set) => ({
  phase: 'loading',
  isStarted: false,
  isLoading: true,
  activeDestination: 'arrival',
  activeBeat: 0,
  hasScrolled: false,
  reachedEnd: false,
  atClockGate: false,
  soundEnabled: true,
  quality: detectQuality(),
  reducedMotion: detectReducedMotion(),
  openHotspot: null,

  setLoaded: () => set((s) => (s.isLoading ? { isLoading: false, phase: 'intro' } : s)),
  start: () => set({ isStarted: true, phase: 'opening' }),
  setPhase: (phase) => set({ phase }),
  setActiveBeat: (activeBeat) => set({ activeBeat }),
  setActiveDestination: (activeDestination) => set({ activeDestination }),
  setHasScrolled: () => set({ hasScrolled: true }),
  setReachedEnd: (reachedEnd) => set({ reachedEnd }),
  setAtClockGate: (atClockGate) => set({ atClockGate }),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  setQuality: (quality) => set({ quality }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setOpenHotspot: (openHotspot) => set({ openHotspot }),
}))

// Dev-only debugging handle (stripped from production builds).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __northPole: unknown }).__northPole = { useExperience }
}
