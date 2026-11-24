/**
 * Live workshop state (mutable, per-frame — never React state).
 * `boost` is raised by the wrapping-machine hotspot and decays back to 0;
 * the whole factory speeds up and sparkles while it is high.
 */
export const workshopState = {
  boost: 0,
  /** Accumulated conveyor travel (m) — integrates speed so boosts never jump. */
  beltPhase: 0,
  /** Hero gift has been inspected (tag read). */
  tagRead: false,
}
