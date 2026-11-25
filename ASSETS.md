# THE NORTH POLE — Asset requirements

All seven destinations (The Arrival → Christmas Morning) run fully procedurally. Everything listed
below as **temporary** works today and is clearly marked in code; replacing it does not
require architectural changes.

## 3D — temporary procedural stand-ins

| Element | Current implementation | Production replacement | Where |
|---|---|---|---|
| Great Christmas Clock tower | Primitive Victorian massing, 4 stopped dials (11:53), belfry, spire, beacon | Authored GLB: astronomical clock tower, carved stonework, separable gear train + hands as named nodes (`Gear_*`, `Hand_Hour`, `Hand_Minute`) for Destination 04 | `src/experience/destinations/village/ClockTower.tsx` |
| Village houses | Instanced gabled boxes, procedural windows/eave lights/chimneys | 6–10 modular Victorian house GLBs (≤8k tris each, shared 2k atlas), instanced | `VillageHouses.tsx`, `village-assets.ts` |
| Station | Platform, iron canopy, station house, painted nameboard | Authored station GLB with ironwork canopy | `Station.tsx` |
| Tunnel portals | Extruded stone arch | Stone portal GLB | `src/experience/world/Railway.tsx` |
| Christmas Express | Procedural 4-4-0 locomotive "North Star" (spoked drivers, animated coupling/connecting rods, crossheads, pistons), tender, 3 carriages; merged per material | Authored GLB train: loco + tender + carriages, named nodes `Wheel_Driver_*`, `Rod_Coupling_L/R`, `Rod_Connecting_L/R`, `Crosshead_L/R`, lamp/chimney/dome empties for effects; KTX2 textures | `src/experience/entities/train/` |
| Great Workshop hall | Stone-and-timber vaulted hall inside the massif, conveyors, wrapping machines, spiral lift, gallery, round door, balcony | Authored interior kit (vault ribs, trusses, wall dressing, machines) with baked lightmaps | `src/experience/destinations/workshop/` |
| Robotic arms, gears | Primitive arms with animated joints; extruded gears | Rigged arm GLB (clips `Pick`, `Place`, `Idle`) and detailed gear set | `FactoryFloor.tsx` |
| Elves | Vertex-coloured primitive figures, instanced, bob/walk loops | Stylised rigged elf (≤3k tris) with `Work`, `Walk`, `Idle` clips, instanced via GPU skinning or baked VAT | `workshop-assets.ts` |
| Gift Line cableway | Tube cable, lattice-style pylons, gondolas, terminal | Authored pylons, carriers and terminal GLBs | `Cableway.tsx` |
| Clock movement | Procedural going train, stepping escapement, pendulum, winding drum and crank, leading-off rods | Authored tower-clock movement GLB with named nodes (`Wheel_*`, `Escape_Wheel`, `Anchor`, `Pendulum`, `Crank`) | `src/experience/destinations/clock/ClockMechanism.tsx` |
| Reindeer Stables | Timber barn with trusses, stalls, mangers, nameplates, lanterns, opening doors; launch field lanterns | Authored barn interior/exterior kit with baked lighting | `src/experience/destinations/stables/StableBarn.tsx` |
| Reindeer ×8 | Procedural anatomy (vertex-coloured coat), jointed legs, procedural antlers; idle/walk/look-at/breath animation in code | Rigged, groomed reindeer GLB with clips `Idle`, `Breathe`, `LookAround`, `Graze`, `Walk`, `Trot`, `Gallop`, `Fly` (needed for Destination 06) | `Herd.tsx`, `reindeer-geometry.ts` |
| Sleigh | Extruded lacquer side panels, gold tube trim, brass runners, lanterns, sack | Hero sleigh GLB (≤60k tris), PBR lacquer/gold, lantern emissive maps, harness attachment points | `Sleigh.tsx` |
| Santa | Procedural seated figure (coat, belt, beard, cap, mittens) with head look-at and a wave | Rigged Santa GLB with clips `Sit_Idle`, `Sit_Reins`, `Wave`, `LookAround`; cloth/beard grooming; facial blendshapes for a smile | `src/experience/destinations/flight/Santa.tsx` |
| Frozen sea, icebergs, clouds | Textured ice plane, displaced icosahedra, billboard cloud puffs | Ice shader with subsurface/specular glints, sculpted bergs, volumetric clouds or VDB-baked impostors | `AerialWorld.tsx` |
| Spruce trees | Merged cone tiers, instanced | 2–3 spruce GLBs + billboard impostor for distance LOD | `forest-assets.ts` |

## 3D — required for later destinations (not yet built)

All need verified licences that allow commercial use, then: optimise → Draco/Meshopt-compressed GLB → KTX2 textures → verify clips.


## Audio — temporary procedural layers

Current `src/audio/engine/audio-manager.ts` synthesises everything in Web Audio:
Arctic wind (filtered pink noise + LFO gusts), distant bronze bell (inharmonic partials +
reverb), adaptive pad score (mysterious minor → magical major at the village reveal),
celesta-like sparkles, low drone; for the Express: exhaust chuffs locked to wheel rotation, rail-joint clatter, three-chime whistle, steam hiss, speed-following rumble and a pizzicato ostinato; for the Workshop: machinery hum, metallic clanks, bouncing bass with music-box arpeggios, and interaction sounds.

Final production needs (original or properly licensed — **no** copies or sound-alikes of
existing film scores):

1. Score in 8 stems/cues: mysterious opening · village discovery · rhythmic train · playful workshop · clock activation · departure anticipation · orchestral flight climax · Christmas morning. Loopable sections with tempo map for crossfades.
2. Ambience loops (stereo, 48 kHz, 60 s+): high-altitude wind, valley wind, village night (distant voices, crackling fires), workshop interior, flight air.
3. One-shots: large church bell (near + distant, 3 strikes + ring-out), tower-clock winding ratchet, movement engage clunk, escapement tick/tock, sleigh-bell flourishes, reindeer snorts and breaths, harness bells, barn door creak, timpani, reins crack, take-off whoosh, air rush, flight climax stems (strings, brass, choir, timpani), a gentle Christmas-morning theme (music box / celesta / soft strings), clock gears/escapement, steam release, locomotive chuff (several speeds), wheel/rail, reindeer snorts + bells, sleigh runners, sleigh take-off whoosh.

Format: `.ogg` (Opus) + `.m4a` fallback, placed under `public/audio/`.

## Fonts

Cormorant Garamond + Inter via Google Fonts (SIL OFL). Self-host before launch for privacy and offline resilience.
