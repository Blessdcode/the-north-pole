import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { journey } from '../../cinematic/journey'
import { QUALITY, type QualityLevel } from '../../config/quality'
import { HotspotProjector } from '../../interaction/hotspots/HotspotProjector'
import { Clock } from '../destinations/clock/Clock'
import { AerialWorld } from '../destinations/flight/AerialWorld'
import { Stables } from '../destinations/stables/Stables'
import { Village } from '../destinations/village/Village'
import { Workshop } from '../destinations/workshop/Workshop'
import { Train } from '../entities/train/Train'
import { environment, updateEnvironment } from '../systems/lighting/environment'
import { LightDirector } from '../systems/lighting/LightDirector'
import { updateTimeOfDay } from '../systems/lighting/time-of-day'
import { SteamSystem } from '../systems/particles/SteamSystem'
import { Snowfall } from '../systems/weather/Snowfall'
import { updateWeather } from '../systems/weather/weather-controller'
import { Aurora } from './Aurora'
import { DistantRanges } from './DistantRanges'
import { Forest } from './Forest'
import { NightSky } from './NightSky'
import { Railway } from './Railway'
import { Terrain } from './Terrain'
import { WorldAtmosphere } from './WorldAtmosphere'
import { WorldLighting } from './WorldLighting'

/** Weather and environment state advance before anything renders. */
function WorldState() {
  useFrame(({ clock }, dt) => {
    updateEnvironment(journey.progress)
    updateTimeOfDay(journey.progress)
    updateWeather(clock.elapsedTime, Math.min(dt, 0.1))
  }, -2)
  return null
}

/** The open-air world; skipped entirely while the camera is deep inside the mountain. */
function OpenAir({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null)
  useFrame(() => {
    if (group.current) group.current.visible = !environment.hideOutdoor
  })
  return <group ref={group}>{children}</group>
}

/** One connected world. Destinations are regions of it, not separate scenes. */
export function NorthPoleWorld({ quality }: { quality: QualityLevel }) {
  const q = QUALITY[quality]
  const shadows = quality === 'high'
  return (
    <>
      <WorldState />
      <WorldAtmosphere />
      <WorldLighting shadows={shadows} />
      <LightDirector />
      <OpenAir>
        <NightSky />
        <Aurora />
        <DistantRanges />
        <Terrain segments={q.terrainSegments} />
        <Forest count={q.treeCount} />
        <Railway />
        <Village shadows={shadows} smokePerChimney={q.smokePerChimney} />
        <Stables />
        <AerialWorld />
        <Snowfall count={q.snowCount} />
      </OpenAir>
      <Workshop />
      <Clock />
      <Train />
      <SteamSystem capacity={q.steamCapacity} />
      <HotspotProjector />
    </>
  )
}
