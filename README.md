# THE NORTH POLE

A cinematic, interactive Christmas Eve journey through one connected 3D world.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm build && pnpm preview
```

**Status:** Destinations 01–04 playable — The Arrival, The Christmas Express, The Great Workshop, The Great Christmas Clock (press-and-hold to wind; the story waits at the clock until it is wound). Next: 05 The Reindeer Stables.
See `ASSETS.md` for temporary stand-ins and required production assets, and `north-pole.md` for the full brief.

## Architecture

| System | Location | Notes |
|---|---|---|
| Experience app | `src/app`, `src/components`, `src/store` | UI, phases, Zustand (low-frequency state only) |
| World engine | `src/experience/world`, `destinations`, `systems` | Single heightfield (`geography.ts`) shared by terrain, scatter, rail and camera |
| Cinematic engine | `src/cinematic` | Lenis + ScrollTrigger → `journey.target`; authored Catmull-Rom camera keys |
| Interaction | `src/interaction` | Bounded pointer/touch look, projected DOM hotspots |
| Audio | `src/audio/engine` | Web Audio buses: master / music / ambience / sfx |

One loop: the GSAP ticker drives Lenis, ScrollTrigger and R3F (`frameloop="never"` + `advance`).
Camera hierarchy: `CameraPathController → CinematicRig → ExplorationPivot → PerspectiveCamera`.
