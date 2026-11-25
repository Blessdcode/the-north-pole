/**
 * World-space particle emitter interface (steam, drain-cock jets, snow spray).
 * The GPU system registers itself here; emitters (the train) call `emitParticles`.
 * Decoupled so effects can be emitted without importing the renderer component.
 */
export const PARTICLE = {
  /** Chimney exhaust: rises, billows, drifts downwind. */
  SMOKE: 0,
  /** Cylinder drain cocks / safety valve: fast jet that stalls into cloud. */
  JET: 1,
  /** Powder snow kicked up by the pilot and wheels: falls back to the ground. */
  SNOW: 2,
  /** Visible breath in the cold air: a small puff that slows and dissolves. */
  BREATH: 3,
  /** Golden magic dust trailing the sleigh. */
  SPARKLE: 4,
} as const

export type ParticleKind = (typeof PARTICLE)[keyof typeof PARTICLE]

export interface ParticleEmitter {
  emit(
    time: number,
    kind: ParticleKind,
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    count: number,
    spread: number,
  ): void
}

const registry: { emitter: ParticleEmitter | null } = { emitter: null }

export function registerEmitter(e: ParticleEmitter | null) {
  registry.emitter = e
}

export function emitParticles(...args: Parameters<ParticleEmitter['emit']>) {
  registry.emitter?.emit(...args)
}
