import { audioManager } from '../../audio/engine/audio-manager'
import { journey } from '../../cinematic/journey'
import { emitStoryEvent } from '../../cinematic/story-events'
import { STORY_BEATS } from '../../config/destinations'
import { workshopState } from '../../experience/destinations/workshop/workshop-state'
import { useExperience } from '../../store/experience-store'
import { Hotspot } from './Hotspot'

const beatIndex = (id: string) => STORY_BEATS.findIndex((b) => b.id === id)
const STATION = beatIndex('station')
const MACHINES = beatIndex('machines')
const GIFT = beatIndex('gift')

/** Every interactive point of the journey, each shown only in its own story beat. */
export function Hotspots() {
  const activeBeat = useExperience((s) => s.activeBeat)
  const openHotspot = useExperience((s) => s.openHotspot)
  const setOpenHotspot = useExperience((s) => s.setOpenHotspot)
  const free = openHotspot === null

  return (
    <>
      <Hotspot
        id="clock"
        label="The Great Clock"
        ariaLabel="Inspect the Great Christmas Clock"
        visible={free && activeBeat === STATION}
        onActivate={() => {
          journey.pulse = 1
          audioManager.playBell(0.35, 33)
          setOpenHotspot('clock')
        }}
      />
      <Hotspot
        id="machine"
        label="Start the machine"
        ariaLabel="Run the wrapping machine at full speed"
        visible={free && activeBeat === MACHINES}
        onActivate={() => {
          workshopState.boost = 1
          emitStoryEvent('workshop:boost', {})
        }}
      />
      <Hotspot
        id="gift"
        label="Read the tag"
        ariaLabel="Read the tag on the gift"
        visible={free && activeBeat === GIFT}
        onActivate={() => {
          workshopState.tagRead = true
          emitStoryEvent('gift:tag', {})
          setOpenHotspot('gift')
        }}
      />
    </>
  )
}
