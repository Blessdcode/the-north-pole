## 1. CREATIVE DIRECTION

**Project name:** THE NORTH POLE

**Concept:** A cinematic, interactive Christmas Eve journey through a massive, living North Pole.

**Visual direction:**
- Hyper-realistic, cinematic 3D environments.
- Beautiful Arctic landscapes, enormous snow-covered mountains and frozen forests.
- Warm golden lights contrasting against cold blue environments.
- Northern Lights illuminating the sky.
- Detailed Victorian-inspired Christmas architecture.
- Realistic snow, fog, smoke, steam and atmospheric effects.
- Premium cinematic colour grading.
- Carefully composed camera movements.
- Immersive environmental storytelling.

The experience should feel like a mixture of a high-budget animated Christmas film, an interactive 3D game world and an experimental digital art installation.

Avoid cartoonish visuals, generic Christmas templates, excessive UI and cheap-looking animations.

**Creative principle:**

"Don't make a website that contains Christmas animations. Make a Christmas world that happens to be experienced through a website."

## 2. THE STORY

It is Christmas Eve.

Hidden beyond enormous Arctic mountains is a mysterious, living North Pole.

The village is preparing for Christmas. Trains transport gifts, the workshop is working, reindeer are preparing for departure, and the entire village is illuminated by warm Christmas lights.

However, something is wrong.

The Great Christmas Clock has stopped.

The visitor arrives at the North Pole, explores its connected world, discovers the problem and helps restore the clock.

When the clock comes alive again, the village awakens.

Eventually, the visitor witnesses Santa's Christmas Eve departure and follows his journey through the Arctic sky.

The experience ends with Christmas morning.

The narrative should be communicated primarily through visuals, environmental details, animation and sound rather than long paragraphs of text.

## 3. THE SEVEN DESTINATIONS

Build seven connected destinations within ONE enormous world.

Do not create seven unrelated scenes or separate experiences.

### DESTINATION 01 — THE ARRIVAL

The experience begins in darkness.

- Wind is heard before anything becomes visible.
- Tiny snow particles gradually appear.
- A distant bell rings.
- The camera travels over enormous Arctic mountains.
- The Northern Lights illuminate the sky.
- A massive Christmas village is revealed in the distance.
- The camera descends towards the village.
- A Christmas train station becomes visible.

The opening must create anticipation and curiosity.

### DESTINATION 02 — THE CHRISTMAS EXPRESS

A beautiful red steam locomotive arrives at the station.

Animate:
- Rotating wheels.
- Moving pistons.
- Steam escaping from the locomotive.
- Headlights illuminating the snow.
- Train windows glowing warmly.
- Snow reacting to the train's movement.
- Railway signals and environmental details.

The camera follows the train as it travels through a snowy forest.

The train enters a tunnel.

Use the tunnel as a seamless transition into the Christmas Workshop.

### DESTINATION 03 — THE GREAT CHRISTMAS WORKSHOP

Reveal an enormous Christmas factory.

It should feel like a living industrial world.

Include:
- Moving conveyor belts.
- Robotic arms.
- Toy assembly stations.
- Gift wrapping machines.
- Mechanical systems.
- Hanging lights.
- Steam pipes.
- Moving gears.
- Presents travelling through the factory.
- Tiny animated background workers where feasible.

Create meaningful interactions.

The visitor should be able to interact with selected presents and machinery.

One present should become the focus of a cinematic transition. Follow it as it travels through the factory and exits towards the village.

### DESTINATION 04 — THE GREAT CHRISTMAS CLOCK

The central village contains an enormous Victorian astronomical clock tower.

The clock has stopped.

This is the central interactive moment.

The visitor should be able to activate the clock through a clear interaction.

When activated:
- Internal gears begin moving.
- Clock hands start rotating.
- Mechanical sounds gradually build.
- The clock bell rings.
- Warm lights illuminate across the village.
- The surrounding environment becomes more active.
- Snow and atmospheric effects react to the event.

This moment should feel important and rewarding.

### DESTINATION 05 — THE REINDEER STABLES

The camera travels towards the reindeer stables.

Build a beautiful, detailed environment containing:
- Wooden stable architecture.
- Warm lantern lighting.
- Realistic reindeer.
- Visible breath in the cold air.
- Snow-covered surroundings.
- Harnesses and sleigh equipment.
- A beautifully designed Christmas sleigh.

Animate the reindeer naturally.

The sleigh gradually becomes illuminated.

The stable doors open, revealing the snowy launch area.

Keep Santa hidden.

### DESTINATION 06 — THE CHRISTMAS EVE FLIGHT

This is the biggest cinematic moment in the entire experience.

The reindeer begin moving.

The sleigh accelerates.

Snow is disturbed as the sleigh takes off.

**This is where Santa is revealed for the first time.**

The camera performs a cinematic orbit around the sleigh, revealing Santa sitting in the driver's position.

The camera then follows the sleigh into the sky.

Create an extraordinary aerial environment:
- Northern Lights.
- Arctic mountains.
- Frozen oceans.
- Clouds.
- Stars.
- Distant glowing villages.
- Atmospheric depth.
- Beautiful moonlight.

The camera should move around the sleigh during selected moments, providing controlled cinematic exploration.

The orchestral soundtrack should reach its emotional climax here.

### DESTINATION 07 — CHRISTMAS MORNING

The camera gradually pulls away from the North Pole.

The dark blue night transitions into a beautiful golden winter sunrise.

The village becomes peaceful.

Snow falls gently.

The soundtrack becomes calm.

Display:

**THE MAGIC WAS NEVER JUST IN THE GIFTS.**

"It was in the moments that brought us together."

Follow with a Christmas greeting and a restart experience control.

Make the ending emotionally memorable.

---

## 4. WORLD ARCHITECTURE

Build one connected open-world environment.

The central Christmas village is the geographical hub.

Suggested world layout:

- Centre: Central village, Great Christmas Clock, station and Christmas houses.
- West: Great Christmas Workshop.
- East: Reindeer Stables.
- North: Arctic wilderness and sleigh launch area.
- South: Arrival valley and railway entrance.

Connect these areas using:
- Roads.
- Railway tracks.
- Tunnels.
- Snow-covered paths.
- Bridges.
- Mountains.
- Forests.
- Open sky routes.

The visitor should feel like every destination belongs to the same physical world.

The Great Christmas Clock should be visible from several distant locations.

Use atmospheric perspective, terrain silhouettes and environmental landmarks to create a convincing sense of scale.

Do not attempt to render every object at maximum quality simultaneously.

Implement distance-based detail, asset streaming and level of detail.

---

## 5. CAMERA AND NAVIGATION SYSTEM

The experience uses HYBRID navigation.

Scroll controls the main cinematic journey.

Pointer movement allows controlled exploration.

Implement:

- Scroll-driven narrative progression.
- Pointer-controlled camera look-around.
- Bounded camera rotation.
- Subtle camera offsets.
- Hover interactions.
- Clickable environmental hotspots.
- Touch-drag camera exploration on mobile.
- Cinematic camera control during important moments.

Avoid unrestricted free-camera movement.

The visitor should explore without destroying the composition of the cinematic shots.

### Camera architecture

Use this hierarchy:

CameraPathController
└── CinematicRig
    └── ExplorationPivot
        └── PerspectiveCamera

GSAP must control a shared journey progress value.

React Three Fiber must read that value inside `useFrame` and calculate the camera's position and orientation along the cinematic path.

Pointer exploration should affect the ExplorationPivot rather than competing with the cinematic camera controller.

Use CatmullRomCurve3 or another suitable spline system for smooth camera paths.

Every destination should have carefully authored:
- Camera positions.
- Look-at targets.
- Field of view.
- Camera speed.
- Transition timing.
- Pointer influence.
- Interaction windows.

The camera should feel directed by a professional cinematographer.

---

## 6. TECHNOLOGY STACK

Use the following stack:

- React 19
- Vite
- TypeScript
- Three.js
- React Three Fiber
- Drei
- GSAP
- GSAP ScrollTrigger
- @gsap/react
- Lenis
- Zustand
- Tailwind CSS v4
- @react-three/postprocessing
- postprocessing
- Web Audio API
- Tone.js where appropriate
- @react-three/rapier only when actual physics is required
- lucide-react
- clsx
- tailwind-merge

Use pnpm.

Use stable, mutually compatible package versions.

Do not introduce unnecessary libraries.

---

## 7. APPLICATION ARCHITECTURE

Separate the application into independent systems.

### Experience application
Responsible for:
- Application initialization.
- Loading screen.
- User interface.
- Experience state.
- Error handling.
- Mobile experience.

### World engine
Responsible for:
- Three.js rendering.
- Terrain.
- Buildings.
- Environment.
- Lighting.
- Weather.
- 3D assets.
- World streaming.

### Cinematic engine
Responsible for:
- GSAP timelines.
- Scroll progression.
- Camera paths.
- Cinematic transitions.
- Chapter progression.

### Interaction engine
Responsible for:
- Pointer input.
- Touch input.
- Hotspots.
- Object interactions.
- Hover states.
- Interaction feedback.

### Audio engine
Responsible for:
- Background music.
- Environmental ambience.
- Sound effects.
- Audio transitions.
- Volume controls.
- Audio state.

Keep these systems independent but coordinated through clearly defined interfaces and events.

---

## 8. PROJECT STRUCTURE

Use a clean, scalable folder structure.

```text
src/
├── app/
│   ├── App.tsx
│   └── providers/
│
├── experience/
│   ├── canvas/
│   │   └── ExperienceCanvas.tsx
│   │
│   ├── world/
│   │   ├── NorthPoleWorld.tsx
│   │   ├── WorldEnvironment.tsx
│   │   ├── Terrain.tsx
│   │   ├── WorldLighting.tsx
│   │   └── WorldAtmosphere.tsx
│   │
│   ├── destinations/
│   │   ├── arrival/
│   │   ├── village/
│   │   ├── express/
│   │   ├── workshop/
│   │   ├── clock-tower/
│   │   ├── stables/
│   │   └── flight/
│   │
│   ├── entities/
│   │   ├── train/
│   │   ├── sleigh/
│   │   ├── reindeer/
│   │   ├── santa/
│   │   ├── machinery/
│   │   └── presents/
│   │
│   ├── systems/
│   │   ├── weather/
│   │   ├── particles/
│   │   ├── lighting/
│   │   ├── streaming/
│   │   └── physics/
│   │
│   ├── camera/
│   └── shaders/
│
├── cinematic/
│   ├── timeline/
│   ├── camera-paths/
│   ├── transitions/
│   └── story-controller.ts
│
├── interaction/
│   ├── hotspots/
│   ├── pointer-controller.ts
│   └── interaction-controller.ts
│
├── audio/
│   ├── engine/
│   ├── music/
│   ├── ambience/
│   └── effects/
│
├── components/
│   ├── interface/
│   ├── typography/
│   └── overlays/
│
├── store/
├── hooks/
├── config/
├── styles/
└── main.tsx
```

Adjust the structure when necessary, but maintain clear separation of responsibilities.

---

## 9. 3D ASSET STRATEGY

Use a hybrid procedural and authored asset approach.

### Procedural assets

Generate appropriate elements programmatically:
- Snow particles.
- Wind effects.
- Terrain variation.
- Tree distribution.
- Snow accumulation effects.
- Glowing lights.
- Mechanical gear movement.
- Chimney smoke.
- Atmospheric particles.
- Small environmental props.

### Authored 3D assets

Use properly licensed GLB/GLTF models for complex hero objects:
- Christmas train.
- Reindeer.
- Santa.
- Sleigh.
- Hero workshop machinery.
- Detailed architectural assets.

Use Blender or another suitable 3D tool for custom modelling and asset preparation where necessary.

For every external asset:
1. Verify its licence.
2. Check whether commercial use is allowed.
3. Optimize geometry.
4. Optimize materials and textures.
5. Export to GLB.
6. Verify animation clips.
7. Test performance in the actual experience.

Do not silently substitute missing hero assets with obvious primitive shapes and claim the experience is complete.

If an asset is unavailable, create a clearly documented temporary placeholder and explain what is required to replace it.

### Animation requirements

Use actual animation systems for complex objects.

- Train: wheel rotation, pistons, steam and movement.
- Reindeer: rigged skeletal animation.
- Santa: rigged character with suitable sitting and flight poses.
- Sleigh: synchronized movement with reindeer.
- Workshop: animated machinery and conveyor systems.
- Clock: rotating gears and hands.

Keep Santa hidden until the final flight reveal.

---

## 10. WEATHER AND ENVIRONMENT

Create a shared WeatherController.

It should control:
- Snow intensity.
- Snow direction.
- Wind strength.
- Fog.
- Visibility.
- Atmospheric particles.

Different locations should have different weather profiles.

Use GPU-friendly particle systems or instanced meshes.

Do not create thousands of individual React components for snow particles.

Use:
- PBR materials.
- Emissive windows and decorations.
- Carefully controlled shadows.
- Environment lighting.
- Atmospheric fog.
- ACES tone mapping.
- Appropriate colour-space settings.
- Subtle bloom.

Avoid excessive post-processing and expensive dynamic lighting on every individual object.

The world should feel cold, magical and atmospheric, while the village feels warm and welcoming.

---

## 11. AUDIO AND SOUNDTRACK

Sound is a major part of this experience.

Build a central AudioManager with separate audio buses:

- Master.
- Music.
- Ambience.
- Sound effects.

Implement:
- Orchestral Christmas soundtrack.
- Arctic wind.
- Snow ambience.
- Distant bells.
- Train movement.
- Steam.
- Workshop machinery.
- Clock gears.
- Clock bell.
- Reindeer sounds.
- Sleigh takeoff.
- Flight ambience.

Use original generated/composed music or properly licensed tracks.

Do not copy, sample or recreate copyrighted Interstellar or Hans Zimmer recordings.

The soundtrack should have an emotional cinematic progression:
1. Mysterious opening.
2. Magical village discovery.
3. Rhythmic train sequence.
4. Playful workshop atmosphere.
5. Emotional clock activation.
6. Anticipation before departure.
7. Grand orchestral flight climax.
8. Peaceful Christmas morning ending.

Use crossfades and layered audio.

Do not autoplay audio before the visitor interacts with the experience.

Provide a visible sound control.

Temporary audio placeholders are acceptable during development. Document the exact audio assets needed for final production.

---

## 12. STATE MANAGEMENT

Use Zustand only for low-frequency application state.

Example:

```ts
interface ExperienceState {
  isStarted: boolean;
  activeDestination: string;
  isLoading: boolean;
  soundEnabled: boolean;
  quality: "high" | "balanced" | "low";
  reducedMotion: boolean;
}
```

Do not put frame-by-frame values into Zustand.

Do not store:
- Camera coordinates.
- Pointer coordinates.
- Particle positions.
- Physics transforms.
- Audio envelopes.
- Per-frame animation values.

Use refs, dedicated controllers and React Three Fiber's rendering loop for those values.

---

## 13. SCROLL AND ANIMATION COORDINATION

Use Lenis and GSAP ScrollTrigger together.

Lenis manages smooth scrolling.

ScrollTrigger observes scroll progress.

The story controller converts scroll position into journey progress.

React Three Fiber reads journey progress and updates the camera.

Use one coordinated scroll update loop.

Do not create competing animation loops.

Clean up:
- GSAP timelines.
- ScrollTriggers.
- Lenis instances.
- Event listeners.
- Audio contexts.
- Three.js resources.

---

## 14. USER INTERFACE

The interface must remain minimal.

Include:
- Intro screen.
- Start experience button.
- Loading screen.
- Sound toggle.
- Chapter indicator.
- Scroll progress.
- Interaction hints.
- Small narrative typography.
- Ending screen.
- Restart control.

Avoid a traditional navigation bar.

Avoid conventional website sections and excessive buttons.

The 3D world must remain the visual focus.

Use elegant typography and carefully timed transitions.

Fade interface elements during major cinematic moments.

Every UI element must feel like part of the experience rather than a dashboard placed on top of it.

---

## 15. PERFORMANCE

This experience must be optimized from the beginning.

Target:
- High-end desktop: aim for 60 FPS.
- Standard laptops: aim for stable 45–60 FPS.
- Mobile: target a stable frame rate appropriate to the device.

Implement:
- Instanced meshes for trees and repeated decorations.
- GPU-friendly snow particles.
- Level of detail.
- Lazy-loaded destinations.
- Compressed GLB assets.
- Optimized textures.
- Limited dynamic shadows.
- Adaptive rendering resolution.
- Quality presets.
- Visibility-aware rendering.
- Proper disposal of unused resources.

Do not load the entire world at maximum quality immediately.

Preload upcoming destinations before the camera reaches them.

Keep the current and nearby destinations active.

Simplify distant objects.

Use silhouettes and impostors for very distant scenery where appropriate.

### Mobile

Mobile is a first-class experience.

Do not simply shrink the desktop version.

On mobile:
- Reduce particle counts.
- Simplify distant geometry.
- Disable expensive post-processing when necessary.
- Reduce shadow quality.
- Support touch-drag camera exploration.
- Maintain scroll-driven storytelling.
- Preserve the most important cinematic moments.

---

## 16. ACCESSIBILITY

Implement:
- Reduced-motion support.
- Keyboard-accessible controls.
- Visible focus indicators.
- Readable contrast.
- Sound controls.
- Semantic HTML.
- Touch-friendly controls.
- A useful fallback when WebGL is unavailable.

The story must remain understandable without sound.

Provide a reduced-motion experience that avoids aggressive camera movement.

---

## 17. DEVELOPMENT ROADMAP

Build the project incrementally.

### Phase 1 — Foundation
- Initialize the project.
- Configure dependencies.
- Establish the architecture.
- Build the persistent R3F canvas.
- Build the camera rig.
- Integrate GSAP and ScrollTrigger.
- Integrate Lenis.
- Establish Zustand state.
- Build the loading and intro interface.

### Phase 2 — North Pole Environment
- Build the initial terrain.
- Create mountains and snowy landscape.
- Create the central village.
- Add the sky and Northern Lights.
- Add snowfall.
- Add environmental lighting.
- Establish the connected world layout.

### Phase 3 — Arrival and Express
- Build the opening cinematic.
- Add the railway.
- Add the Christmas Express.
- Animate train movement.
- Implement the tunnel transition.

### Phase 4 — Workshop and Clock
- Build the workshop environment.
- Add conveyor systems.
- Add animated machinery.
- Build the Great Christmas Clock.
- Implement clock interaction.
- Implement the village activation event.

### Phase 5 — Reindeer and Santa
- Build the stables.
- Integrate reindeer assets.
- Integrate sleigh.
- Integrate Santa.
- Synchronize animations.
- Implement the hidden Santa reveal.

### Phase 6 — Christmas Flight
- Build the aerial environment.
- Implement sleigh flight.
- Create cinematic camera paths.
- Add Northern Lights and atmospheric effects.
- Implement the orchestral climax.

### Phase 7 — Christmas Morning
- Build the sunrise transition.
- Create the ending sequence.
- Add final typography.
- Implement restart functionality.

### Phase 8 — Audio and Polish
- Integrate soundtrack.
- Add ambience and sound effects.
- Polish transitions.
- Improve environmental reactions.
- Refine typography and UI.

### Phase 9 — Optimization and Release
- Test desktop.
- Test mobile.
- Test reduced motion.
- Test performance.
- Check resource cleanup.
- Resolve console errors.
- Verify all interactions.

---

## 18. IMPLEMENTATION RULES

These rules are mandatory.

1. Inspect the existing repository before changing anything.
2. If the repository is empty, initialize the project correctly.
3. Do not overwrite existing work without understanding it.
4. Use TypeScript properly.
5. Keep components modular and reusable.
6. Avoid massive single-file components.
7. Avoid unnecessary abstractions.
8. Use meaningful naming.
9. Handle loading and error states.
10. Clean up animation timelines and event listeners.
11. Keep 3D logic separate from ordinary UI.
12. Avoid storing frame-by-frame animation values in React state.
13. Avoid unnecessary dependencies.
14. Do not leave broken imports or placeholder functions.
15. Do not claim an interaction works unless it actually works.
16. Do not create fake asset paths.
17. Document external asset requirements.
18. Test the application after each meaningful implementation stage.

If you encounter a missing asset, make a reasonable temporary implementation and document the required replacement.

Do not stop after creating folders, interfaces or architecture documents.

**The objective is a working, visually impressive experience.**

---

## 19. FIRST IMPLEMENTATION MILESTONE

Do not attempt to build all seven destinations in one step.

Your first task is to implement a complete, working vertical slice of THE NORTH POLE.

It must include:

1. A working React + Vite + TypeScript project.
2. A persistent React Three Fiber canvas.
3. A full-screen intro screen.
4. A start-experience interaction.
5. A cinematic opening camera journey.
6. A large snowy Arctic environment.
7. Distant mountains.
8. A visible Christmas village.
9. Northern Lights.
10. Animated snowfall.
11. Warm glowing village windows.
12. Hybrid camera exploration.
13. Scroll-driven camera progression.
14. Smooth transitions.
15. A chapter indicator.
16. A sound toggle with a working audio foundation.
17. Responsive desktop and mobile layouts.

The first milestone should take the visitor from darkness, over the Arctic mountains, towards the North Pole village.

It must look and feel like a real cinematic experience, even before the other destinations are implemented.

Do not use a static image as a substitute for the 3D environment.

Procedural geometry is acceptable for the initial environment, but the final composition must be visually rich and intentional.

---

## 20. ACCEPTANCE CRITERIA

The project is not considered complete until:

- There is one persistent 3D canvas.
- The North Pole exists as one connected world.
- All seven destinations are implemented.
- Scroll drives the cinematic story.
- Pointer exploration works.
- The train journey works.
- The workshop has animated machinery.
- The Great Christmas Clock is interactive.
- The reindeer and sleigh are animated.
- Santa remains hidden until the final reveal.
- The Christmas Eve flight is cinematic.
- Christmas Morning provides a satisfying ending.
- Audio is integrated.
- Mobile is properly optimized.
- Reduced-motion support works.
- There are no major console errors.
- Resources are cleaned up correctly.

---

## 21. HOW TO WORK

Begin by inspecting the repository.

Then:

1. Report the existing project structure and relevant dependencies.
2. Identify anything that needs to be installed or configured.
3. Establish the architecture.
4. Implement Phase 1 and the first implementation milestone.
5. Run the development server and verify the experience.
6. Fix errors you encounter.
7. Explain what you built.
8. List the remaining assets and implementation tasks.

Do not respond with another lengthy planning document.

Do not ask me to approve every small technical decision.

Make sensible engineering decisions independently.

If something genuinely requires an external asset, service, licence or manual creative work, explain exactly what is needed.

**Prioritize a beautiful working experience over a large collection of empty folders and theoretical architecture.**

The final result should feel like an interactive Christmas film that people want to explore, replay and share.

# FINAL CREATIVE DIRECTION

THE NORTH POLE should make visitors feel as though they have discovered a secret world hidden beyond the Arctic mountains.

It should be magical, cinematic, atmospheric, technically impressive and emotionally memorable.

Every camera movement, sound, animation, transition and interaction should contribute to that feeling.

Build something extraordinary.9                    