/**
 * Typed story event bus — the interface between independent systems.
 * World entities announce what happened; audio (and later UI/effects) react.
 */
export interface StoryEventMap {
  /** One exhaust beat of the locomotive. intensity 0–1, proximity 0–1. */
  'train:chuff': { intensity: number; proximity: number }
  /** Wheels crossing a rail joint. */
  'train:clatter': { intensity: number; proximity: number }
  /** The whistle. proximity 0 = far away / inside a tunnel. */
  'train:whistle': { proximity: number; muffled: boolean }
  /** Steam release (brakes, drain cocks). */
  'train:hiss': { seconds: number; proximity: number }
  /** The visitor ran the wrapping machine at full speed. */
  'workshop:boost': Record<string, never>
  /** The visitor read the hero gift's tag. */
  'gift:tag': Record<string, never>
  /** Winding the Great Clock (progress 0–1, fired in steps). */
  'clock:wind': { progress: number }
  /** The clock has been fully wound — the mechanism engages. */
  'clock:start': Record<string, never>
  /** Escapement beat. */
  'clock:tick': { tock: boolean; proximity: number }
  /** The hands reach twelve. */
  'clock:midnight': Record<string, never>
  /** A strike of the great bell. */
  'clock:strike': { index: number; last: boolean }
}

type Handler<K extends keyof StoryEventMap> = (payload: StoryEventMap[K]) => void

const handlers = new Map<keyof StoryEventMap, Set<(payload: never) => void>>()

export function onStoryEvent<K extends keyof StoryEventMap>(type: K, handler: Handler<K>) {
  let set = handlers.get(type)
  if (!set) handlers.set(type, (set = new Set()))
  set.add(handler as (payload: never) => void)
  return () => {
    set.delete(handler as (payload: never) => void)
  }
}

export function emitStoryEvent<K extends keyof StoryEventMap>(type: K, payload: StoryEventMap[K]) {
  handlers.get(type)?.forEach((h) => (h as Handler<K>)(payload))
}
