import { onStoryEvent } from '../../cinematic/story-events'
import { audioManager } from './audio-manager'

/** Connects world/story events to sound. Returns a cleanup function. */
export function connectAudioToStory() {
  const offs = [
    onStoryEvent('train:chuff', (e) => audioManager.trainChuff(e.intensity, e.proximity)),
    onStoryEvent('train:clatter', (e) => audioManager.trainClatter(e.intensity, e.proximity)),
    onStoryEvent('train:whistle', (e) => audioManager.trainWhistle(e.proximity, e.muffled)),
    onStoryEvent('train:hiss', (e) => audioManager.trainHiss(e.seconds, e.proximity)),
    onStoryEvent('workshop:boost', () => audioManager.machineBoost()),
    onStoryEvent('gift:tag', () => audioManager.giftTag()),
    onStoryEvent('clock:wind', (e) => audioManager.clockRatchet(e.progress)),
    onStoryEvent('clock:start', () => audioManager.clockStart()),
    onStoryEvent('clock:tick', (e) => audioManager.clockTick(e.tock, e.proximity)),
    onStoryEvent('clock:midnight', () => audioManager.clockMidnight()),
    onStoryEvent('clock:strike', (e) => audioManager.clockStrike(e.index, e.last)),
    onStoryEvent('reindeer:snort', (e) => audioManager.reindeerSnort(e.proximity)),
    onStoryEvent('reindeer:jingle', (e) => audioManager.reindeerJingle(e.proximity)),
    onStoryEvent('sleigh:bells', () => audioManager.sleighBells()),
    onStoryEvent('stables:doors', () => audioManager.stableDoors()),
    onStoryEvent('flight:start', () => audioManager.flightStart()),
    onStoryEvent('flight:liftoff', () => audioManager.flightLiftoff()),
    onStoryEvent('flight:reveal', () => audioManager.flightReveal()),
    onStoryEvent('flight:farewell', () => audioManager.flightFarewell()),
    onStoryEvent('morning:greeting', () => audioManager.morningGreeting()),
  ]
  return () => offs.forEach((off) => off())
}
