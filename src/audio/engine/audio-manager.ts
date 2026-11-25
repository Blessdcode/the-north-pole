/**
 * AudioManager — the single owner of the Web Audio graph.
 *
 *   sources ─▶ music ─┐
 *   sources ─▶ ambience ─┼─▶ master ─▶ compressor ─▶ destination
 *   sources ─▶ sfx ────┘
 *              └──────▶ reverb (shared send) ─▶ master
 *
 * Everything here is procedural so the experience has a complete, working
 * soundscape today. The final production score and recorded ambiences listed
 * in ASSETS.md can replace each layer without changing this interface.
 *
 * Audio only starts after a user gesture (`init` is called from the Start button).
 */

type Bus = 'music' | 'ambience' | 'sfx'

const BUS_LEVELS: Record<Bus, number> = { music: 0.55, ambience: 0.6, sfx: 0.85 }

// Equal-tempered helper: MIDI note → Hz.
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

// Chord voicings (MIDI). Mysterious minor colours → warm major on the reveal.
const MYSTERIOUS = [
  [38, 50, 57, 64, 65], // Dm(add9)
  [34, 46, 53, 57, 62], // Bbmaj7
  [31, 43, 50, 53, 58], // Gm9-ish
  [33, 45, 52, 55, 62], // A7sus
]
const MAGICAL = [
  [38, 50, 57, 62, 66, 69], // Dmaj9
  [35, 47, 54, 57, 62, 66], // Bm11
  [31, 43, 50, 55, 59, 66], // Gmaj9
  [33, 45, 52, 57, 61, 64], // A(add9)
]
const SPARKLE_SCALE = [74, 76, 78, 81, 83, 86, 88, 90, 93] // D major pentatonic-ish, high

export class AudioManager {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private buses!: Record<Bus, GainNode>
  private reverb!: ConvolverNode
  private reverbSend!: GainNode
  private windNodes: { band1: BiquadFilterNode; band2: BiquadFilterNode; gain: GainNode; rumble: GainNode } | null = null
  private padFilter!: BiquadFilterNode
  private drone: { gain: GainNode; oscs: OscillatorNode[] } | null = null
  private schedulerId = 0
  private nextChordTime = 0
  private chordIndex = 0
  private nextSparkle = 0
  private progress = 0
  private enabled = true
  private chapter = 'arrival'
  private nextPulse = 0
  private pulseStep = 0
  private currentChord: number[] = MAGICAL[0]
  private trainRumble: { gain: GainNode; filter: BiquadFilterNode } | null = null
  private machineHum: GainNode | null = null
  private interior = 0
  private nextClank = 0
  private celebrate = false
  private flightIntensity = 0
  private nextJingle = 0
  private noiseBuffer: AudioBuffer | null = null
  private onVisibility = () => {
    if (!this.ctx) return
    if (document.hidden) void this.ctx.suspend()
    else if (this.enabled) void this.ctx.resume()
  }

  get isReady() {
    return this.ctx !== null
  }

  /** Must be called from a user gesture. Safe to call more than once. */
  async init() {
    if (this.ctx) return
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor({ latencyHint: 'playback' })
    this.ctx = ctx

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -14
    compressor.ratio.value = 3
    compressor.connect(ctx.destination)

    this.master = ctx.createGain()
    this.master.gain.value = 0
    this.master.connect(compressor)

    this.buses = {
      music: ctx.createGain(),
      ambience: ctx.createGain(),
      sfx: ctx.createGain(),
    }
    for (const bus of Object.keys(this.buses) as Bus[]) {
      this.buses[bus].gain.value = BUS_LEVELS[bus]
      this.buses[bus].connect(this.master)
    }

    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.createImpulse(5.5, 2.4)
    this.reverbSend = ctx.createGain()
    this.reverbSend.gain.value = 0.9
    this.reverbSend.connect(this.reverb)
    this.reverb.connect(this.master)

    this.padFilter = ctx.createBiquadFilter()
    this.padFilter.type = 'lowpass'
    this.padFilter.frequency.value = 500
    this.padFilter.Q.value = 0.4
    this.padFilter.connect(this.buses.music)
    const padSend = ctx.createGain()
    padSend.gain.value = 0.55
    this.padFilter.connect(padSend)
    padSend.connect(this.reverbSend)

    this.noiseBuffer = this.createNoise(4)
    this.startWind()
    this.startDrone()
    this.startTrainRumble()
    this.startMachineHum()

    if (ctx.state === 'suspended') await ctx.resume()
    this.setEnabled(this.enabled)

    this.nextChordTime = ctx.currentTime + 2.5
    this.nextSparkle = ctx.currentTime + 6
    this.schedulerId = window.setInterval(() => this.schedule(), 120)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setValueAtTime(this.master.gain.value, t)
    this.master.gain.linearRampToValueAtTime(on ? 0.9 : 0, t + (on ? 1.2 : 0.4))
    if (on && this.ctx.state === 'suspended' && !document.hidden) void this.ctx.resume()
  }

  /** Fade a bus in over `seconds` (used by the opening: wind first, then music). */
  fadeBus(bus: Bus, to: number, seconds: number) {
    if (!this.ctx) return
    const g = this.buses[bus].gain
    const t = this.ctx.currentTime
    g.cancelScheduledValues(t)
    g.setValueAtTime(g.value, t)
    g.linearRampToValueAtTime(to * BUS_LEVELS[bus], t + seconds)
  }

  /** Continuous story parameters — cheap to call often. */
  update(progress: number, wind: number) {
    if (!Number.isFinite(progress) || !Number.isFinite(wind)) return
    this.progress = progress
    if (!this.ctx || !this.windNodes) return
    const t = this.ctx.currentTime
    const w = this.windNodes
    w.gain.gain.setTargetAtTime(0.18 + wind * 0.45, t, 0.6)
    w.rumble.gain.setTargetAtTime(0.25 + wind * 0.5, t, 0.8)
    w.band1.frequency.setTargetAtTime(280 + wind * 520, t, 0.9)
    w.band2.frequency.setTargetAtTime(900 + wind * 1400, t, 1.1)
    // The score opens up as the world is revealed.
    this.padFilter.frequency.setTargetAtTime(420 + progress * 2600, t, 1.2)
    if (this.drone) this.drone.gain.gain.setTargetAtTime(0.06 + Math.sin(Math.min(progress, 0.6) * Math.PI) * 0.06, t, 1.5)
  }

  /** A large bronze bell. `distance` 0 (near) … 1 (far across the mountains). */
  playBell(distance = 0.8, pitch = 45) {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime + 0.02
    const f0 = hz(pitch)
    // Classic church-bell partial series: hum, prime, tierce, quint, nominal…
    const partials = [
      [0.5, 0.5, 9],
      [1, 0.9, 6],
      [1.183, 0.55, 4.5],
      [1.506, 0.35, 3.5],
      [2.0, 0.6, 3.2],
      [2.514, 0.25, 2.4],
      [2.662, 0.2, 2.2],
      [3.011, 0.18, 1.8],
      [4.166, 0.12, 1.2],
    ]
    const out = ctx.createGain()
    out.gain.value = 0.32 * (1 - distance * 0.55)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 7000 - distance * 5200
    out.connect(lp)
    lp.connect(this.buses.sfx)
    const send = ctx.createGain()
    send.gain.value = 0.5 + distance * 1.2
    lp.connect(send)
    send.connect(this.reverbSend)

    for (const [ratio, amp, decay] of partials) {
      const o = ctx.createOscillator()
      o.frequency.value = f0 * ratio * (1 + (Math.random() - 0.5) * 0.002)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(amp, t + 0.006)
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay * (1 + distance * 0.5))
      o.connect(g)
      g.connect(out)
      o.start(t)
      o.stop(t + decay * 1.6 + 0.1)
    }
    // Strike transient.
    if (this.noiseBuffer) {
      const n = ctx.createBufferSource()
      n.buffer = this.noiseBuffer
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = f0 * 6
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.25, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
      n.connect(bp)
      bp.connect(g)
      g.connect(out)
      n.start(t)
      n.stop(t + 0.1)
    }
  }

  /** Soft magical shimmer, e.g. for hovering a hotspot. */
  playChime(pitch = 86) {
    const ctx = this.ctx
    if (!ctx) return
    this.sparkle(ctx.currentTime + 0.01, pitch, 0.12, this.buses.sfx)
  }

  // ───────────────────────── Christmas Morning ─────────────────────────

  /** The greeting: the Great Clock, far off and gentle, and a last shimmer of bells. */
  morningGreeting() {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    this.playBell(0.85, 45)
    window.setTimeout(() => this.playBell(0.88, 50), 1400)
    ;[81, 86, 90, 93].forEach((n, i) => this.sparkle(t + 0.6 + i * 0.3, n, 0.05, this.buses.music))
    this.jingle(t + 1.5, 1.4, 0.04)
  }

  // ───────────────────────── Christmas Eve Flight ─────────────────────────

  /** How hard the score drives during the flight (0–1). */
  setFlightIntensity(v: number) {
    this.flightIntensity = Math.max(0, Math.min(1, v))
  }

  /** The reins snap, the bells burst, the team sets off. */
  flightStart() {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer) return
    const t = ctx.currentTime + 0.01
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1800
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    src.connect(hp)
    hp.connect(g)
    g.connect(this.buses.sfx)
    src.start(t, Math.random())
    src.stop(t + 0.1)
    this.jingle(t + 0.05, 2.2, 0.18)
    for (let i = 0; i < 6; i++) this.timpani(t + 0.2 + i * 0.12, this.currentChord[0] - 12, 0.08 + i * 0.03)
  }

  /** Lift-off: a rising whoosh and a glissando of light. */
  flightLiftoff() {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer) return
    const t = ctx.currentTime + 0.01
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.5
    bp.frequency.setValueAtTime(200, t)
    bp.frequency.exponentialRampToValueAtTime(2400, t + 2.2)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.32, t + 1.2)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.buses.sfx)
    src.start(t)
    src.stop(t + 3.1)
    const scale = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98]
    scale.forEach((n, i) => this.sparkle(t + 0.3 + i * 0.06, n, 0.06, this.buses.music))
  }

  /** The reveal: a great warm chord. */
  flightReveal() {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime + 0.02
    this.padChord(t, [26, 38, 45, 50, 54, 57, 62, 66], 7, 0.09)
    this.choirChord(t, [62, 66, 69, 74], 6, 0.05)
  }

  /** Farewell: the Great Clock rings them out over the village. */
  flightFarewell() {
    if (!this.ctx) return
    this.playBell(0.45, 38)
    window.setTimeout(() => this.playBell(0.5, 38), 1600)
    this.jingle(this.ctx.currentTime + 0.4, 1.8, 0.12)
  }

  /** Choir-like vowel pad: sawtooth voices through two formant filters. */
  private choirChord(t: number, notes: number[], length: number, level: number) {
    const ctx = this.ctx!
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(level, t + 1.6)
    env.gain.setValueAtTime(level, t + length - 2)
    env.gain.linearRampToValueAtTime(0, t + length)
    const f1 = ctx.createBiquadFilter()
    f1.type = 'bandpass'
    f1.frequency.value = 760
    f1.Q.value = 4
    const f2 = ctx.createBiquadFilter()
    f2.type = 'bandpass'
    f2.frequency.value = 1180
    f2.Q.value = 5
    env.connect(f1)
    env.connect(f2)
    f1.connect(this.buses.music)
    f2.connect(this.buses.music)
    const send = ctx.createGain()
    send.gain.value = 1.2
    f1.connect(send)
    f2.connect(send)
    send.connect(this.reverbSend)
    for (const n of notes) {
      for (const d of [-9, 0, 8]) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = hz(n)
        o.detune.value = d
        const vib = ctx.createOscillator()
        vib.frequency.value = 4.8 + Math.random()
        const vg = ctx.createGain()
        vg.gain.value = 4
        vib.connect(vg)
        vg.connect(o.detune)
        o.connect(env)
        o.start(t)
        vib.start(t)
        o.stop(t + length + 0.05)
        vib.stop(t + length + 0.05)
      }
    }
  }

  // ───────────────────────── Reindeer Stables ─────────────────────────

  /** A reindeer's snort: a short, breathy, low burst. */
  reindeerSnort(proximity: number) {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer || proximity < 0.05) return
    const t = ctx.currentTime + 0.01
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.4
    bp.frequency.setValueAtTime(700, t)
    bp.frequency.exponentialRampToValueAtTime(260, t + 0.35)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.35 * proximity, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.buses.sfx)
    src.start(t, Math.random() * 3)
    src.stop(t + 0.45)
  }

  /** Harness bells with a single stride. */
  reindeerJingle(proximity: number) {
    if (!this.ctx || proximity < 0.05) return
    this.jingle(this.ctx.currentTime + 0.01, 0.18, 0.05 * proximity)
  }

  /** The visitor rings the sleigh bells: a full, bright peal. */
  sleighBells() {
    if (!this.ctx) return
    const t = this.ctx.currentTime + 0.01
    this.jingle(t, 1.4, 0.2)
    ;[86, 90, 93, 98].forEach((n, i) => this.sparkle(t + 0.15 + i * 0.11, n, 0.05, this.buses.sfx))
  }

  /** The great doors: a long wooden creak, then the wind outside rushes in. */
  stableDoors() {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer) return
    const t = ctx.currentTime + 0.01
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(52, t)
    o.frequency.linearRampToValueAtTime(74, t + 1.6)
    o.frequency.linearRampToValueAtTime(46, t + 2.6)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 900
    bp.Q.value = 5
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.12, t + 0.3)
    g.gain.linearRampToValueAtTime(0.06, t + 2.2)
    g.gain.linearRampToValueAtTime(0, t + 2.8)
    o.connect(bp)
    bp.connect(g)
    g.connect(this.buses.sfx)
    o.start(t)
    o.stop(t + 2.9)
    this.buses.ambience.gain.setTargetAtTime(BUS_LEVELS.ambience * 1.25, t + 1.2, 0.8)
  }

  // ───────────────────────── Great Christmas Clock ─────────────────────────

  /** A ratchet click while winding; pitch rises as the spring tightens. */
  clockRatchet(progress: number) {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer) return
    const t = ctx.currentTime + 0.005
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1800 + progress * 1600
    bp.Q.value = 6
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.35, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.buses.sfx)
    src.start(t, Math.random() * 3)
    src.stop(t + 0.06)
  }

  /** The movement engages: a deep clunk, a chain rattle, and the train spinning up. */
  clockStart() {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer) return
    const t = ctx.currentTime + 0.01
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(90, t)
    o.frequency.exponentialRampToValueAtTime(34, t + 0.4)
    const og = ctx.createGain()
    og.gain.setValueAtTime(0.6, t)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    o.connect(og)
    og.connect(this.buses.sfx)
    o.start(t)
    o.stop(t + 0.65)
    this.clank(t)
    for (let i = 0; i < 14; i++) this.clockRatchet(0.2 + Math.random() * 0.3)
    // Rising whirr of gears.
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 3
    bp.frequency.setValueAtTime(140, t)
    bp.frequency.exponentialRampToValueAtTime(620, t + 3.5)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.18, t + 2.5)
    g.gain.linearRampToValueAtTime(0.05, t + 6)
    g.gain.linearRampToValueAtTime(0, t + 9)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.buses.sfx)
    src.start(t)
    src.stop(t + 9.2)
  }

  /** Escapement beat: tick (higher) and tock (lower). */
  clockTick(tock: boolean, proximity: number) {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer || proximity < 0.03) return
    const t = ctx.currentTime + 0.005
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = tock ? 1500 : 2300
    bp.Q.value = 8
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.5 * proximity, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.buses.sfx)
    const send = ctx.createGain()
    send.gain.value = 0.6
    g.connect(send)
    send.connect(this.reverbSend)
    src.start(t, Math.random() * 3)
    src.stop(t + 0.1)
  }

  /** Midnight: the score blooms into celebration. */
  clockMidnight() {
    const ctx = this.ctx
    if (!ctx) return
    this.celebrate = true
    this.nextJingle = ctx.currentTime + 1.2
    const t = ctx.currentTime + 0.05
    this.padChord(t, [26, 38, 50, 57, 62, 66, 69, 74], 9, 0.085)
  }

  /** A strike of the great bell, close at hand; the last one rings out over the whole valley. */
  clockStrike(index: number, last: boolean) {
    this.playBell(0.1, 38)
    this.playBell(0.25, 50)
    if (last && this.ctx) {
      const t = this.ctx.currentTime
      ;[86, 90, 93, 98, 102, 98, 93, 90].forEach((n, i) => this.sparkle(t + 0.4 + i * 0.09, n, 0.06, this.buses.sfx))
      this.jingle(t + 0.3, 1.6, 0.16)
    }
    void index
  }

  /** Sleigh bells: a cluster of tiny high, inharmonic jingles. */
  private jingle(t: number, seconds: number, level: number) {
    const ctx = this.ctx!
    const hits = Math.round(seconds * 22)
    for (let i = 0; i < hits; i++) {
      const at = t + (i / hits) * seconds + Math.random() * 0.03
      const f = 3200 + Math.random() * 2600
      const env = level * (1 - i / hits) * (0.6 + Math.random() * 0.4)
      for (const r of [1, 1.47, 2.09]) {
        const o = ctx.createOscillator()
        o.frequency.value = f * r
        const g = ctx.createGain()
        g.gain.setValueAtTime(env / r, at)
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12)
        o.connect(g)
        g.connect(this.buses.music)
        o.start(at)
        o.stop(at + 0.14)
      }
    }
  }

  /** Back to a stopped clock (journey restarted). */
  resetCelebration() {
    this.celebrate = false
  }

  // ───────────────────────── Great Workshop ─────────────────────────

  /** 1 inside the Workshop: wind falls away, machinery takes over. */
  setInterior(v: number) {
    if (!this.ctx || !this.windNodes || !this.machineHum || v === this.interior) return
    this.interior = v
    const t = this.ctx.currentTime
    this.buses.ambience.gain.setTargetAtTime(BUS_LEVELS.ambience * (1 - v * 0.85), t, 0.6)
    this.machineHum.gain.setTargetAtTime(v * 0.22, t, 0.8)
  }

  /** The wrapping machine at full speed: a rising whoosh and a cascade of chimes. */
  machineBoost() {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer) return
    const t = ctx.currentTime + 0.01
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 2
    bp.frequency.setValueAtTime(300, t)
    bp.frequency.exponentialRampToValueAtTime(3200, t + 1.2)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.25, t + 0.4)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.buses.sfx)
    src.start(t)
    src.stop(t + 1.7)
    ;[74, 78, 81, 86, 90, 93, 98].forEach((n, i) => this.sparkle(t + 0.35 + i * 0.08, n, 0.07, this.buses.sfx))
  }

  /** Reading the gift's tag: a gentle music-box phrase. */
  giftTag() {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime + 0.02
    ;[81, 86, 88, 93, 90, 86].forEach((n, i) => this.sparkle(t + i * 0.22, n, 0.08, this.buses.sfx))
  }

  // ───────────────────────── Christmas Express ─────────────────────────

  /** Which destination the score is accompanying (adds/removes layers). */
  setChapter(id: string) {
    if (id === this.chapter) return
    this.chapter = id
    if (this.ctx) this.nextPulse = this.ctx.currentTime + 0.4
  }

  /** Continuous rumble of wheels and motion, following speed and distance. */
  setTrain(speed: number, proximity: number) {
    if (!this.ctx || !this.trainRumble || !Number.isFinite(speed)) return
    const t = this.ctx.currentTime
    const s = Math.min(1, Math.abs(speed) / 16)
    this.trainRumble.gain.gain.setTargetAtTime(s * proximity * 0.55, t, 0.25)
    this.trainRumble.filter.frequency.setTargetAtTime(90 + s * 260 + proximity * 200, t, 0.3)
  }

  /** One exhaust beat: a breathy noise burst with a low thump. */
  trainChuff(intensity: number, proximity: number) {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer || proximity < 0.02) return
    const t = ctx.currentTime + 0.005
    const level = (0.12 + intensity * 0.25) * proximity
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 520 + intensity * 500 + Math.random() * 120
    bp.Q.value = 0.8
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(level, t + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16 + (1 - intensity) * 0.18)
    src.connect(bp)
    bp.connect(g)
    g.connect(this.buses.sfx)
    src.start(t, Math.random() * 3)
    src.stop(t + 0.45)
    // Thump.
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(70, t)
    o.frequency.exponentialRampToValueAtTime(38, t + 0.12)
    const og = ctx.createGain()
    og.gain.setValueAtTime(level * 0.9, t)
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
    o.connect(og)
    og.connect(this.buses.sfx)
    o.start(t)
    o.stop(t + 0.16)
  }

  /** Wheels over a rail joint: a quick double click. */
  trainClatter(intensity: number, proximity: number) {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer || proximity < 0.05) return
    for (const delay of [0, 0.09 + (1 - intensity) * 0.08]) {
      const t = ctx.currentTime + 0.005 + delay
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuffer
      const hp = ctx.createBiquadFilter()
      hp.type = 'bandpass'
      hp.frequency.value = 2400
      hp.Q.value = 2
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.22 * proximity * (0.4 + intensity * 0.6), t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
      src.connect(hp)
      hp.connect(g)
      g.connect(this.buses.sfx)
      src.start(t, Math.random() * 3)
      src.stop(t + 0.07)
    }
  }

  /** A three-chime steam whistle; distant and muffled when inside a tunnel. */
  trainWhistle(proximity: number, muffled: boolean) {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime + 0.02
    const dur = 1.9
    const out = ctx.createGain()
    const level = 0.09 + proximity * 0.12
    out.gain.setValueAtTime(0, t)
    out.gain.linearRampToValueAtTime(level, t + 0.12)
    out.gain.setValueAtTime(level, t + dur - 0.5)
    out.gain.linearRampToValueAtTime(0, t + dur)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = muffled ? 1100 : 5200
    out.connect(lp)
    lp.connect(this.buses.sfx)
    const send = ctx.createGain()
    send.gain.value = muffled ? 1.6 : 0.8
    lp.connect(send)
    send.connect(this.reverbSend)
    // Chime chord (a 6th chord, like a classic American chime whistle).
    for (const f of [hz(66), hz(70), hz(73)]) {
      for (const type of ['sawtooth', 'sine'] as const) {
        const o = ctx.createOscillator()
        o.type = type
        o.frequency.setValueAtTime(f * 0.97, t)
        o.frequency.linearRampToValueAtTime(f, t + 0.18)
        const vib = ctx.createOscillator()
        vib.frequency.value = 5.5
        const vibGain = ctx.createGain()
        vibGain.gain.value = f * 0.004
        vib.connect(vibGain)
        vibGain.connect(o.frequency)
        const g = ctx.createGain()
        g.gain.value = type === 'sawtooth' ? 0.12 : 0.5
        o.connect(g)
        g.connect(out)
        o.start(t)
        vib.start(t)
        o.stop(t + dur + 0.05)
        vib.stop(t + dur + 0.05)
      }
    }
    // Breath of steam through the whistle.
    if (this.noiseBuffer) {
      const n = ctx.createBufferSource()
      n.buffer = this.noiseBuffer
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = hz(70) * 2
      bp.Q.value = 3
      const g = ctx.createGain()
      g.gain.value = 0.5
      n.connect(bp)
      bp.connect(g)
      g.connect(out)
      n.start(t)
      n.stop(t + dur)
    }
  }

  /** Steam release: brakes on arrival, drain cocks on departure. */
  trainHiss(seconds: number, proximity: number) {
    const ctx = this.ctx
    if (!ctx || !this.noiseBuffer) return
    const t = ctx.currentTime + 0.01
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 2200
    const g = ctx.createGain()
    const level = 0.08 + proximity * 0.3
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(level, t + 0.08)
    g.gain.setTargetAtTime(level * 0.6, t + 0.3, 0.4)
    g.gain.linearRampToValueAtTime(0, t + seconds)
    src.connect(hp)
    hp.connect(g)
    g.connect(this.buses.sfx)
    src.start(t)
    src.stop(t + seconds + 0.1)
  }

  dispose() {
    window.clearInterval(this.schedulerId)
    document.removeEventListener('visibilitychange', this.onVisibility)
    if (this.ctx) void this.ctx.close()
    this.ctx = null
    this.windNodes = null
    this.drone = null
    this.trainRumble = null
    this.machineHum = null
  }

  // ───────────────────────────── internals ─────────────────────────────

  private schedule() {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const now = ctx.currentTime
    const lookahead = now + 0.5
    // After the context was suspended (hidden tab, mute), skip the backlog instead
    // of starting dozens of overlapping chords at once.
    if (this.nextChordTime < now - 1) this.nextChordTime = now + 0.3
    if (this.nextSparkle < now - 1) this.nextSparkle = now + 1

    if (this.nextChordTime < lookahead) {
      const magical = this.progress > 0.55
      const set = magical ? MAGICAL : MYSTERIOUS
      const chord = set[this.chordIndex % set.length]
      const dur = magical ? 7.5 : 9
      const climax = this.chapter === 'flight' ? this.flightIntensity : 0
      this.padChord(this.nextChordTime, chord, dur + 3.5, (magical ? 0.05 : 0.04) * (1 + climax * 0.7))
      if (climax > 0.2) this.choirChord(this.nextChordTime, chord.slice(-4), dur + 2, 0.035 * climax)
      this.currentChord = chord
      this.nextChordTime += dur
      this.chordIndex++
    }

    // Celesta-like sparkles, denser as the village comes into view.
    if (this.nextSparkle < lookahead) {
      const density = this.chapter === 'morning' ? 0.08 : 0.12 + Math.max(0, this.progress - 0.35) * 1.4
      const note = SPARKLE_SCALE[Math.floor(Math.random() * SPARKLE_SCALE.length)]
      const vel = 0.04 + Math.random() * 0.05 + this.progress * 0.03
      this.sparkle(this.nextSparkle, note, vel, this.buses.music)
      // Occasional answering note a third/fifth up.
      if (Math.random() < 0.3) this.sparkle(this.nextSparkle + 0.18, note + (Math.random() < 0.5 ? 4 : 7), vel * 0.6, this.buses.music)
      this.nextSparkle += (1 / density) * (0.5 + Math.random())
    }

    // Christmas Morning: an original music-box lullaby, slow and far apart.
    if (this.chapter === 'morning') {
      if (this.nextPulse < now - 1) this.nextPulse = now + 0.4
      const tune = [74, 78, 81, 78, 76, 74, 71, 74, 76, 78, 76, 74, 69, -1, 71, 74]
      while (this.nextPulse < lookahead) {
        const n = tune[this.pulseStep % tune.length]
        if (n > 0) this.sparkle(this.nextPulse, n, 0.045, this.buses.music)
        if (this.pulseStep % 8 === 0) this.pluck(this.nextPulse, this.currentChord[0] + 12, 0.025)
        this.nextPulse += 60 / 66
        this.pulseStep++
      }
    }

    // The flight: driving strings and timpani, scaled by the climax curve.
    if (this.chapter === 'flight') {
      if (this.nextPulse < now - 1) this.nextPulse = now + 0.1
      const step = 60 / 132 / 2
      const pattern = [0, 2, 3, 2, 4, 2, 3, 5]
      while (this.nextPulse < lookahead) {
        const k = this.pulseStep % 8
        const chord = this.currentChord
        const vol = 0.025 + this.flightIntensity * 0.05
        this.pluck(this.nextPulse, chord[Math.min(pattern[k] + 1, chord.length - 1)] + 12, vol * (k % 2 === 0 ? 1 : 0.7))
        if (k === 0 || (k === 4 && this.flightIntensity > 0.5)) this.timpani(this.nextPulse, chord[0] - 12, 0.08 + this.flightIntensity * 0.16)
        this.nextPulse += step
        this.pulseStep++
      }
      if (this.flightIntensity > 0.4 && this.nextJingle < lookahead) {
        if (this.nextJingle < now - 1) this.nextJingle = now + 0.5
        this.jingle(Math.max(now, this.nextJingle), 1.2, 0.05 * this.flightIntensity)
        this.nextJingle += 2.5 + Math.random() * 2
      }
    }

    // Anticipation before departure: soft timpani heartbeats under the strings.
    if (this.chapter === 'stables') {
      if (this.nextPulse < now - 1) this.nextPulse = now + 0.1
      const beat = 60 / 72
      while (this.nextPulse < lookahead) {
        const strong = this.pulseStep % 2 === 0
        this.timpani(this.nextPulse, this.currentChord[0] - 12, strong ? 0.22 : 0.12)
        this.nextPulse += strong ? beat * 0.42 : beat * 1.58
        this.pulseStep++
      }
    }

    // Celebration after midnight: sleigh-bell flourishes now and then.
    if (this.celebrate && this.chapter === 'clock' && this.nextJingle < lookahead) {
      if (this.nextJingle < now - 1) this.nextJingle = now + 0.5
      this.jingle(Math.max(now, this.nextJingle), 0.9 + Math.random() * 0.8, 0.06)
      this.nextJingle += 5 + Math.random() * 6
    }

    // Playful workshop: bouncing bass on the beat, music-box arpeggios, clanks.
    if (this.chapter === 'workshop') {
      if (this.nextPulse < now - 1) this.nextPulse = now + 0.1
      const step = 60 / 112 / 2
      while (this.nextPulse < lookahead) {
        const chord = this.currentChord
        const k = this.pulseStep % 8
        if (k % 2 === 0) this.pluck(this.nextPulse, chord[0] + (k === 4 ? 7 : 0), 0.06)
        const arp = [3, 4, 5, 4, 3, 5, 4, 5][k]
        this.sparkle(this.nextPulse, chord[Math.min(arp, chord.length - 1)] + 12, 0.028 + (k === 0 ? 0.02 : 0), this.buses.music)
        this.nextPulse += step
        this.pulseStep++
      }
      if (this.interior > 0 && this.nextClank < lookahead) {
        if (this.nextClank < now - 1) this.nextClank = now + 0.2
        this.clank(Math.max(now, this.nextClank))
        this.nextClank += 0.4 + Math.random() * 1.6
      }
    }

    // Rhythmic train sequence: a pizzicato ostinato over the current chord.
    if (this.chapter === 'express') {
      if (this.nextPulse < now - 1) this.nextPulse = now + 0.1
      const step = 60 / 132 / 2
      const pattern = [2, 4, 3, 4, 5, 4, 3, 4]
      while (this.nextPulse < lookahead) {
        const i = pattern[this.pulseStep % pattern.length]
        const chord = this.currentChord
        const note = chord[Math.min(i, chord.length - 1)] + (this.pulseStep % 16 < 8 ? 0 : 12)
        const accent = this.pulseStep % 4 === 0 ? 1 : 0.6
        this.pluck(this.nextPulse, note, 0.05 * accent)
        if (this.pulseStep % 8 === 0) this.pluck(this.nextPulse, chord[0] + 12, 0.07)
        this.nextPulse += step
        this.pulseStep++
      }
    }
  }

  /** A soft timpani stroke (pitched sine with a falling envelope and a felt thump). */
  private timpani(t: number, note: number, vel: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(hz(note) * 1.04, t)
    o.frequency.exponentialRampToValueAtTime(hz(note), t + 0.12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vel, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6)
    o.connect(g)
    g.connect(this.buses.music)
    const send = ctx.createGain()
    send.gain.value = 0.6
    g.connect(send)
    send.connect(this.reverbSend)
    o.start(t)
    o.stop(t + 1.7)
  }

  private pluck(t: number, note: number, vel: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = hz(note)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(3200, t)
    lp.frequency.exponentialRampToValueAtTime(500, t + 0.25)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vel, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
    o.connect(lp)
    lp.connect(g)
    g.connect(this.buses.music)
    const send = ctx.createGain()
    send.gain.value = 0.35
    g.connect(send)
    send.connect(this.reverbSend)
    o.start(t)
    o.stop(t + 0.35)
  }

  private padChord(t: number, notes: number[], length: number, level: number) {
    const ctx = this.ctx!
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, t)
    env.gain.linearRampToValueAtTime(level, t + 3.2)
    env.gain.setValueAtTime(level, t + length - 4)
    env.gain.linearRampToValueAtTime(0, t + length)
    env.connect(this.padFilter)
    notes.forEach((n, i) => {
      for (const detune of [-7, 6]) {
        const o = ctx.createOscillator()
        o.type = i === 0 ? 'triangle' : 'sawtooth'
        o.frequency.value = hz(n)
        o.detune.value = detune + (Math.random() - 0.5) * 3
        const g = ctx.createGain()
        g.gain.value = i === 0 ? 0.9 : 0.32
        o.connect(g)
        g.connect(env)
        o.start(t)
        o.stop(t + length + 0.05)
      }
    })
  }

  private sparkle(t: number, note: number, vel: number, bus: GainNode) {
    const ctx = this.ctx!
    const f = hz(note)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vel, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6)
    const pan = ctx.createStereoPanner()
    pan.pan.value = (Math.random() - 0.5) * 1.2
    g.connect(pan)
    pan.connect(bus)
    const send = ctx.createGain()
    send.gain.value = 1.4
    pan.connect(send)
    send.connect(this.reverbSend)
    for (const [ratio, amp, type] of [
      [1, 1, 'sine'],
      [2, 0.25, 'sine'],
      [4.01, 0.08, 'triangle'],
    ] as const) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = f * ratio
      const og = ctx.createGain()
      og.gain.value = amp
      o.connect(og)
      og.connect(g)
      o.start(t)
      o.stop(t + 2.7)
    }
  }

  private startWind() {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    const band1 = ctx.createBiquadFilter()
    band1.type = 'bandpass'
    band1.frequency.value = 500
    band1.Q.value = 0.9
    const band2 = ctx.createBiquadFilter()
    band2.type = 'bandpass'
    band2.frequency.value = 1500
    band2.Q.value = 2.5
    const gain = ctx.createGain()
    gain.gain.value = 0.3
    src.connect(band1)
    src.connect(band2)
    band1.connect(gain)
    const whistle = ctx.createGain()
    whistle.gain.value = 0.25
    band2.connect(whistle)
    whistle.connect(gain)
    gain.connect(this.buses.ambience)

    // Low rumble of air moving over the mountains.
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 140
    const rumble = ctx.createGain()
    rumble.gain.value = 0.4
    src.connect(lp)
    lp.connect(rumble)
    rumble.connect(this.buses.ambience)

    // Slow LFOs make the gusts breathe.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.09
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.12
    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)
    const lfo2 = ctx.createOscillator()
    lfo2.frequency.value = 0.053
    const lfo2Gain = ctx.createGain()
    lfo2Gain.gain.value = 260
    lfo2.connect(lfo2Gain)
    lfo2Gain.connect(band2.frequency)

    src.start()
    lfo.start()
    lfo2.start()
    this.windNodes = { band1, band2, gain, rumble }
  }

  private startMachineHum() {
    const ctx = this.ctx!
    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.connect(this.buses.sfx)
    // Electrical hum + a deep mechanical drone, gently pulsing like line shafting.
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    lp.connect(gain)
    for (const [f, type, level] of [
      [55, 'sawtooth', 0.12],
      [110, 'square', 0.035],
      [82.5, 'triangle', 0.18],
    ] as const) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.value = level
      o.connect(g)
      g.connect(lp)
      o.start()
    }
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 180
    const ng = ctx.createGain()
    ng.gain.value = 0.9
    src.connect(bp)
    bp.connect(ng)
    ng.connect(gain)
    src.start()
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 1.6
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.05
    lfo.connect(lfoGain)
    lfoGain.connect(gain.gain)
    lfo.start()
    this.machineHum = gain
  }

  /** A metallic clank somewhere in the hall (inharmonic, quickly damped). */
  private clank(t: number) {
    const ctx = this.ctx!
    const f0 = 180 + Math.random() * 420
    const out = ctx.createGain()
    out.gain.value = 0.05 + Math.random() * 0.05
    const pan = ctx.createStereoPanner()
    pan.pan.value = (Math.random() - 0.5) * 1.6
    out.connect(pan)
    pan.connect(this.buses.sfx)
    const send = ctx.createGain()
    send.gain.value = 1.2
    pan.connect(send)
    send.connect(this.reverbSend)
    for (const r of [1, 2.76, 5.4, 8.93]) {
      const o = ctx.createOscillator()
      o.frequency.value = f0 * r
      const g = ctx.createGain()
      g.gain.setValueAtTime(1 / r, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35 / Math.sqrt(r))
      o.connect(g)
      g.connect(out)
      o.start(t)
      o.stop(t + 0.4)
    }
  }

  private startTrainRumble() {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 120
    filter.Q.value = 1.2
    const gain = ctx.createGain()
    gain.gain.value = 0
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.buses.sfx)
    src.start()
    this.trainRumble = { gain, filter }
  }

  private startDrone() {
    const ctx = this.ctx!
    const gain = ctx.createGain()
    gain.gain.value = 0.05
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 220
    gain.connect(lp)
    lp.connect(this.buses.music)
    const oscs = [hz(26), hz(38), hz(38) * 1.003].map((f) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      o.connect(gain)
      o.start()
      return o
    })
    this.drone = { gain, oscs }
  }

  private createNoise(seconds: number) {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    // Pinkish noise (Paul Kellet's economy filter) — softer than white.
    let b0 = 0
    let b1 = 0
    let b2 = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + w * 0.099046
      b1 = 0.963 * b1 + w * 0.2965164
      b2 = 0.57 * b2 + w * 1.0526913
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18
    }
    return buf
  }

  private createImpulse(seconds: number, decay: number) {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
      }
    }
    return buf
  }
}

export const audioManager = new AudioManager()
