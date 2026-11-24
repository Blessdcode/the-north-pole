export type DestinationId =
  | 'arrival'
  | 'express'
  | 'workshop'
  | 'clock'
  | 'stables'
  | 'flight'
  | 'morning'

export interface Destination {
  id: DestinationId
  index: number
  title: string
  /** Whether this destination is playable in the current build. */
  available: boolean
}

export const DESTINATIONS: Destination[] = [
  { id: 'arrival', index: 1, title: 'The Arrival', available: true },
  { id: 'express', index: 2, title: 'The Christmas Express', available: true },
  { id: 'workshop', index: 3, title: 'The Great Workshop', available: true },
  { id: 'clock', index: 4, title: 'The Great Christmas Clock', available: true },
  { id: 'stables', index: 5, title: 'The Reindeer Stables', available: false },
  { id: 'flight', index: 6, title: 'The Christmas Eve Flight', available: false },
  { id: 'morning', index: 7, title: 'Christmas Morning', available: false },
]

export interface Weather {
  snow: number
  wind: number
  fog: number
  aurora: number
}

/**
 * A story beat. Authored in chapter-local progress (0–1); `STORY_BEATS`
 * exposes them in global journey progress. Each beat authors its own pointer
 * influence and weather so the cinematographer, not the visitor, owns composition.
 */
interface LocalBeat {
  id: string
  start: number
  end: number
  kicker?: string
  line: string
  pointerInfluence: number
  weather: Weather
}

export interface StoryBeat extends LocalBeat {
  destination: DestinationId
}

const ARRIVAL: LocalBeat[] = [
  {
    id: 'darkness',
    start: 0,
    end: 0.15,
    kicker: 'Christmas Eve',
    line: 'Somewhere beyond the edge of every map…',
    pointerInfluence: 0.6,
    weather: { snow: 1.0, wind: 0.9, fog: 0.00052, aurora: 0.35 },
  },
  {
    id: 'range',
    start: 0.15,
    end: 0.4,
    kicker: 'The Arctic Range',
    line: 'Mountains older than any story keep the secret.',
    pointerInfluence: 0.85,
    weather: { snow: 0.85, wind: 1.0, fog: 0.00042, aurora: 0.7 },
  },
  {
    id: 'aurora',
    start: 0.4,
    end: 0.6,
    kicker: 'Aurora Borealis',
    line: 'Tonight, the sky itself is awake.',
    pointerInfluence: 1,
    weather: { snow: 0.55, wind: 0.65, fog: 0.00036, aurora: 1.0 },
  },
  {
    id: 'village',
    start: 0.6,
    end: 0.83,
    kicker: 'The North Pole',
    line: 'And in the hollow of the mountains, a village is waiting.',
    pointerInfluence: 0.8,
    weather: { snow: 0.7, wind: 0.4, fog: 0.00045, aurora: 0.85 },
  },
  {
    id: 'station',
    start: 0.83,
    end: 1,
    kicker: 'North Pole Station',
    line: 'Every window is lit. Every chimney breathes. But the great clock is silent.',
    pointerInfluence: 0.9,
    weather: { snow: 0.9, wind: 0.3, fog: 0.0006, aurora: 0.7 },
  },
]

const EXPRESS: LocalBeat[] = [
  {
    id: 'whistle',
    start: 0,
    end: 0.3,
    kicker: 'The Christmas Express',
    line: 'A whistle echoes down the valley.',
    pointerInfluence: 0.7,
    weather: { snow: 0.8, wind: 0.35, fog: 0.00055, aurora: 0.65 },
  },
  {
    id: 'platform',
    start: 0.3,
    end: 0.5,
    kicker: 'Platform One',
    line: 'Steam, brass and lantern light. The Express has come home.',
    pointerInfluence: 0.9,
    weather: { snow: 0.65, wind: 0.25, fog: 0.0006, aurora: 0.6 },
  },
  {
    id: 'forest',
    start: 0.5,
    end: 0.82,
    kicker: 'The Frozen Forest',
    line: 'Westward, through forests no map has ever named.',
    pointerInfluence: 0.55,
    weather: { snow: 1.0, wind: 0.6, fog: 0.0007, aurora: 0.5 },
  },
  {
    id: 'tunnel',
    start: 0.82,
    end: 1,
    kicker: 'Into the Mountain',
    line: 'Somewhere ahead, a thousand machines are waiting.',
    pointerInfluence: 0.4,
    weather: { snow: 0.9, wind: 0.5, fog: 0.0008, aurora: 0.4 },
  },
]

const WORKSHOP: LocalBeat[] = [
  {
    id: 'hall',
    start: 0,
    end: 0.16,
    kicker: 'The Great Workshop',
    line: 'Inside the mountain, the North Pole never sleeps.',
    pointerInfluence: 0.8,
    weather: { snow: 0, wind: 0, fog: 0.00012, aurora: 0 },
  },
  {
    id: 'floor',
    start: 0.16,
    end: 0.3,
    kicker: 'The Factory Floor',
    line: 'Ten thousand gifts an hour, and every one of them matters.',
    pointerInfluence: 0.9,
    weather: { snow: 0, wind: 0, fog: 0.00012, aurora: 0 },
  },
  {
    id: 'machines',
    start: 0.3,
    end: 0.44,
    kicker: 'The Wrapping Machines',
    line: 'Paper, ribbon, a bow. Touch the machine and watch it work.',
    pointerInfluence: 1,
    weather: { snow: 0, wind: 0, fog: 0.00012, aurora: 0 },
  },
  {
    id: 'gift',
    start: 0.44,
    end: 0.6,
    kicker: 'One Gift',
    line: 'This one has a tag no one has read yet.',
    pointerInfluence: 0.9,
    weather: { snow: 0, wind: 0, fog: 0.00012, aurora: 0 },
  },
  {
    id: 'ascent',
    start: 0.6,
    end: 0.77,
    kicker: 'The Long Way Up',
    line: 'Up the spiral, through the mountain, toward the night.',
    pointerInfluence: 0.5,
    weather: { snow: 0, wind: 0, fog: 0.00012, aurora: 0 },
  },
  {
    id: 'cableway',
    start: 0.77,
    end: 1,
    kicker: 'The Gift Line',
    line: 'Every gift must pass beneath the Great Clock before it leaves the North Pole.',
    pointerInfluence: 0.75,
    weather: { snow: 0.75, wind: 0.45, fog: 0.0005, aurora: 0.7 },
  },
]

const CLOCK: LocalBeat[] = [
  {
    id: 'heart',
    start: 0,
    end: 0.2,
    kicker: 'The Great Christmas Clock',
    line: 'For three hundred years it has never missed a minute. Until tonight.',
    pointerInfluence: 0.8,
    weather: { snow: 0.7, wind: 0.3, fog: 0.0005, aurora: 0.7 },
  },
  {
    id: 'inside',
    start: 0.2,
    end: 0.4,
    kicker: 'Inside the Clock',
    line: 'Every gear is waiting. Only one thing is missing.',
    pointerInfluence: 0.7,
    weather: { snow: 0, wind: 0, fog: 0.0002, aurora: 0.7 },
  },
  {
    id: 'awake',
    start: 0.4,
    end: 0.7,
    kicker: 'Midnight',
    line: 'The Great Clock is alive, and so is the North Pole.',
    pointerInfluence: 1,
    weather: { snow: 0.85, wind: 0.5, fog: 0.00045, aurora: 1 },
  },
  {
    id: 'celebration',
    start: 0.7,
    end: 0.86,
    kicker: 'Christmas Eve Begins',
    line: 'Lights in every street. Bells in every tower.',
    pointerInfluence: 0.9,
    weather: { snow: 0.8, wind: 0.35, fog: 0.0005, aurora: 0.9 },
  },
  {
    id: 'east',
    start: 0.86,
    end: 1,
    kicker: 'To the East',
    line: 'In the stables, someone has been waiting all year for this.',
    pointerInfluence: 0.8,
    weather: { snow: 0.9, wind: 0.4, fog: 0.00055, aurora: 0.8 },
  },
]

/** Where the story waits until the visitor winds the Great Clock (clock-local progress). */
export const CLOCK_GATE_LOCAL = 0.4

/** The journey's chapters on one continuous scroll track. */
export const CHAPTERS: { id: DestinationId; start: number; end: number; beats: LocalBeat[] }[] = [
  { id: 'arrival', start: 0, end: 0.25, beats: ARRIVAL },
  { id: 'express', start: 0.25, end: 0.5, beats: EXPRESS },
  { id: 'workshop', start: 0.5, end: 0.75, beats: WORKSHOP },
  { id: 'clock', start: 0.75, end: 1, beats: CLOCK },
]

export const STORY_BEATS: StoryBeat[] = CHAPTERS.flatMap((ch) =>
  ch.beats.map((b) => ({
    ...b,
    destination: ch.id,
    start: ch.start + b.start * (ch.end - ch.start),
    end: ch.start + b.end * (ch.end - ch.start),
  })),
)

export const STATION_BEAT_INDEX = STORY_BEATS.findIndex((b) => b.id === 'station')

export function beatIndexAt(progress: number) {
  const i = STORY_BEATS.findIndex((b) => progress >= b.start && progress < b.end)
  return i === -1 ? STORY_BEATS.length - 1 : i
}

export function chapterAt(progress: number) {
  return CHAPTERS.find((c) => progress < c.end) ?? CHAPTERS[CHAPTERS.length - 1]
}

/** Progress within a chapter, clamped to 0–1 (0 before it, 1 after it). */
export function chapterLocal(progress: number, id: DestinationId) {
  const c = CHAPTERS.find((ch) => ch.id === id)
  if (!c) return 0
  return Math.min(1, Math.max(0, (progress - c.start) / (c.end - c.start)))
}

/** Global progress at which the story waits for the clock to be wound. */
export const CLOCK_GATE = (() => {
  const c = CHAPTERS.find((ch) => ch.id === 'clock')!
  return c.start + CLOCK_GATE_LOCAL * (c.end - c.start)
})()
