import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { gsap } from 'gsap'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Suspense, useEffect, useRef, useState } from 'react'
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three'
import { StoryClock } from '../../cinematic/StoryClock'
import { QUALITY } from '../../config/quality'
import { useExperience } from '../../store/experience-store'
import { CameraRig } from '../camera/CameraRig'
import { NorthPoleWorld } from '../world/NorthPoleWorld'

/**
 * Drives R3F from the GSAP ticker so scroll smoothing, ScrollTrigger and
 * rendering share ONE requestAnimationFrame loop.
 */
function FrameDriver() {
  const advance = useThree((s) => s.advance)
  useEffect(() => {
    let reported = false
    const tick = (time: number) => {
      try {
        advance(time)
      } catch (error) {
        if (!reported) console.error('[NorthPole] frame failed:', error)
        reported = true
      }
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [advance])
  return null
}

/** Signals readiness after the world has compiled and rendered a few frames. */
function ReadySignal() {
  const setLoaded = useExperience((s) => s.setLoaded)
  const frames = useRef(0)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    // Pre-compile every material so the opening never hitches.
    void gl.compileAsync?.(scene, camera).catch(() => undefined)
  }, [gl, scene, camera])
  useFrame(() => {
    frames.current++
    if (frames.current === 8) setLoaded()
  })
  return null
}

function PostEffects() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.95} luminanceSmoothing={0.25} radius={0.78} />
      <Vignette offset={0.26} darkness={0.75} />
      <Noise opacity={0.045} blendFunction={BlendFunction.OVERLAY} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

export function ExperienceCanvas() {
  const quality = useExperience((s) => s.quality)
  const profile = QUALITY[quality]
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio, profile.maxDpr))

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100lvh' }}
      frameloop="never"
      dpr={dpr}
      shadows={quality === 'high' ? 'percentage' : false}
      gl={{
        antialias: profile.antialias,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault() // allow the browser to restore the context
          console.warn('[NorthPole] WebGL context lost — waiting for restore')
        })
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1
        gl.outputColorSpace = SRGBColorSpace
        gl.setClearColor('#000000')
      }}
      aria-hidden
    >
      <FrameDriver />
      {/* Adaptive resolution: trade pixels for frame rate. The world itself is never
          rebuilt mid-journey (that would hitch for seconds); presets are chosen at load. */}
      <PerformanceMonitor
        bounds={(refresh) => (refresh > 90 ? [50, 90] : [40, 60])}
        flipflops={3}
        onDecline={() => setDpr((d) => Math.max(0.75, +(d - 0.25).toFixed(2)))}
        onIncline={() => setDpr((d) => Math.min(profile.maxDpr, +(d + 0.15).toFixed(2)))}
        onFallback={() => setDpr(0.75)}
      />
      <StoryClock />
      <CameraRig />
      <Suspense fallback={null}>
        <NorthPoleWorld quality={quality} />
        <ReadySignal />
      </Suspense>
      {profile.postprocessing && <PostEffects />}
    </Canvas>
  )
}
