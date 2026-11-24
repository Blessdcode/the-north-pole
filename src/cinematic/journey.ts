/**
 * The shared journey channel.
 *
 * GSAP/ScrollTrigger writes `target` (raw scroll progress).
 * The camera controller damps `progress` toward it inside the render loop.
 * `reveal` is animated by the opening timeline (0 = darkness, 1 = world visible).
 * `pulse` is a short-lived energy value for environmental reactions (e.g. bell).
 *
 * Plain mutable object on purpose: these values change every frame and must
 * never trigger React renders.
 */
export const journey = {
  target: 0,
  progress: 0,
  velocity: 0,
  reveal: 0,
  pulse: 0,
}
