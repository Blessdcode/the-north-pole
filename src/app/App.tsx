import { useEffect, useRef, useState } from 'react'
import { connectAudioToStory } from '../audio/engine/audio-bridge'
import { audioManager } from '../audio/engine/audio-manager'
import { attachStoryController, unlockScroll } from '../cinematic/story-controller'
import { playOpening } from '../cinematic/timeline/opening-timeline'
import { ChapterIndicator } from '../components/interface/ChapterIndicator'
import { ClockActivation } from '../components/interface/ClockActivation'
import { InteractionHint } from '../components/interface/InteractionHint'
import { IntroScreen } from '../components/interface/IntroScreen'
import { LoadingScreen } from '../components/interface/LoadingScreen'
import { ScrollProgress } from '../components/interface/ScrollProgress'
import { SoundToggle } from '../components/interface/SoundToggle'
import { ChapterEndCard } from '../components/overlays/ChapterEndCard'
import { ClockStoryCard } from '../components/overlays/ClockStoryCard'
import { EndingSequence } from '../components/overlays/EndingSequence'
import { GiftTagCard } from '../components/overlays/GiftTagCard'
import { TunnelTransition } from '../components/overlays/TunnelTransition'
import { WebGLFallback } from '../components/overlays/WebGLFallback'
import { NarrativeCaption } from '../components/typography/NarrativeCaption'
import { STORY_BEATS } from '../config/destinations'
import { detectWebGL } from '../config/quality'
import { ExperienceCanvas } from '../experience/canvas/ExperienceCanvas'
import { Hotspots } from '../interaction/hotspots/Hotspots'
import { attachPointerController, pointer } from '../interaction/pointer-controller'
import { useExperience } from '../store/experience-store'
import { ExperienceErrorBoundary } from './providers/ExperienceErrorBoundary'

export function App() {
  const [webgl] = useState(detectWebGL)
  if (!webgl) return <WebGLFallback />
  return (
    <ExperienceErrorBoundary
      fallback={() => (
        <WebGLFallback reason="The 3D world could not start on this device. The story above is the journey you would have taken." />
      )}
    >
      <Experience />
    </ExperienceErrorBoundary>
  )
}

function Experience() {
  const track = useRef<HTMLElement>(null)
  const veil = useRef<HTMLDivElement>(null)
  const phase = useExperience((s) => s.phase)
  const soundEnabled = useExperience((s) => s.soundEnabled)
  const openHotspot = useExperience((s) => s.openHotspot)
  const inJourney = phase === 'opening' || phase === 'journey'

  // Always begin the story at the beginning.
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => attachPointerController(), [])

  useEffect(() => {
    if (!track.current) return
    return attachStoryController(track.current, useExperience.getState().reducedMotion)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => useExperience.getState().setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => audioManager.setEnabled(soundEnabled), [soundEnabled])
  useEffect(() => () => audioManager.dispose(), [])
  useEffect(() => connectAudioToStory(), [])

  useEffect(() => {
    pointer.enabled = openHotspot === null
  }, [openHotspot])

  const handleStart = () => {
    const { start, setPhase, reducedMotion } = useExperience.getState()
    start()
    void audioManager.init()
    playOpening({
      veil: veil.current,
      reducedMotion,
      onComplete: () => {
        setPhase('journey')
        unlockScroll()
      },
    })
  }

  return (
    <>
      <ExperienceCanvas />

      {/* Darkness the world emerges from. */}
      <div ref={veil} aria-hidden className="pointer-events-none fixed inset-0 z-10 bg-black" />

      {/* The scroll track: its length is the length of the journey. Text here is the
          accessible version of the story for screen readers. */}
      <main ref={track} className="relative z-0 h-[6000vh] max-sm:h-[4800vh]" aria-label="The journey">
        {STORY_BEATS.map((b) => (
          <section key={b.id} className="sr-only">
            <h2>{b.kicker}</h2>
            <p>{b.line}</p>
          </section>
        ))}
      </main>

      <TunnelTransition />
      <NarrativeCaption />
      <ChapterIndicator visible={inJourney && !openHotspot} />
      <ScrollProgress visible={phase === 'journey'} />
      <SoundToggle visible={phase !== 'loading'} />
      <InteractionHint />
      <Hotspots />
      <ClockActivation />
      <ClockStoryCard />
      <GiftTagCard />
      <ChapterEndCard />
      <EndingSequence />
      <IntroScreen onStart={handleStart} />
      <LoadingScreen />
    </>
  )
}
