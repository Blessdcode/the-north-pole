import { STORY_BEATS } from '../../config/destinations'

/** Shown when WebGL2 is unavailable or the 3D world fails — the story still reads. */
export function WebGLFallback({ reason }: { reason?: string }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,#13264a_0%,#03050b_70%)] px-6 py-20 text-center">
      <p className="font-sans text-[10px] tracking-[0.55em] text-ember/70 uppercase">A Christmas Eve Journey</p>
      <h1 className="mt-6 font-display text-6xl font-light tracking-[0.06em] text-frost uppercase sm:text-7xl">
        The North Pole
      </h1>
      <div className="mt-14 max-w-lg space-y-10">
        {STORY_BEATS.map((b) => (
          <section key={b.id}>
            <h2 className="font-sans text-[10px] tracking-[0.45em] text-ember/70 uppercase">{b.kicker}</h2>
            <p className="mt-2 font-display text-xl text-frost/80 italic">{b.line}</p>
          </section>
        ))}
      </div>
      <p className="mt-16 max-w-sm font-sans text-xs leading-relaxed text-frost/45">
        {reason ??
          'This journey is told through a real-time 3D world, which needs WebGL 2. Try a recent version of Chrome, Edge, Firefox or Safari with hardware acceleration enabled.'}
      </p>
    </main>
  )
}
