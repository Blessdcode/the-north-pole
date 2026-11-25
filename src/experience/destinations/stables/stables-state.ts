/**
 * Live stables state (mutable, per-frame). Times are wall-clock seconds
 * (performance.now() / 1000) of the last interaction, used for decaying
 * reactions (heads up, ears perked, lanterns flaring).
 */
export const stablesState = {
  /** The visitor rang the sleigh bells. */
  bellsAt: -100,
  /** The visitor greeted Dasher. */
  greetedAt: -100,
}

/** Wall-clock seconds shared by the DOM (hotspots) and the 3D scene. */
export const nowSeconds = () => performance.now() / 1000
