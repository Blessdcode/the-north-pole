/**
 * The score's carols: traditional, public-domain melodies (all published long
 * before 1930) arranged here as data and performed live by the AudioManager's
 * synth voices. No recordings or modern arrangements are used.
 *
 * Notation
 *   melody / counter:  "D5:1.5 C5:.5 B4 r:2"  note (A–G, #/b, octave) : beats (default 1); r = rest
 *   chords:            "G:4 D7:2 Em/B:2 r:1"   root, quality (m 7 m7 maj7 dim sus4), optional /bass
 * Melody, counter and chords must each add up to the same number of beats.
 */

export type CarolId =
  | 'greensleeves'
  | 'jingleBells'
  | 'deckTheHalls'
  | 'carolOfTheBells'
  | 'dingDong'
  | 'weThreeKings'
  | 'harkTheHerald'
  | 'silentNight'

/** How the accompaniment moves under the tune. */
export type CarolStyle = 'waltz' | 'oompah' | 'bounce' | 'bells' | 'ring' | 'heartbeat' | 'march' | 'lullaby'
/** Which synth voice sings the tune. */
export type LeadVoice = 'flute' | 'strings' | 'brass' | 'bells' | 'musicbox' | 'celesta'

interface CarolSource {
  id: CarolId
  title: string
  /** Origin, for the credits. */
  source: string
  bpm: number
  beatsPerBar: number
  /** Semitones applied to everything (keys chosen to sit with the score's D-major cues). */
  transpose: number
  style: CarolStyle
  lead: LeadVoice
  /** Peak level of the tune. */
  level: number
  melody: string
  counter?: string
  chords: string
}

export interface CarolNote {
  beat: number
  note: number
  beats: number
}
export interface CarolChord {
  beat: number
  beats: number
  /** Pitch class of the chord's root. */
  root: number
  bass: number
  /** Close voicing around G3–F#4. */
  pad: number[]
}
export interface Carol extends Omit<CarolSource, 'melody' | 'counter' | 'chords'> {
  melody: CarolNote[]
  counter: CarolNote[]
  chords: CarolChord[]
  /** Length of one pass, in beats. */
  length: number
  /** Pitch class of the home key (for the drone). */
  tonic: number
}

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  dim: [0, 3, 6],
  sus4: [0, 5, 7],
}

function pitchClass(name: string) {
  const pc = PC[name[0]]
  if (pc === undefined) throw new Error(`Bad note name: ${name}`)
  return (pc + (name[1] === '#' ? 1 : name[1] === 'b' ? -1 : 0) + 12) % 12
}

function parseLine(line: string, transpose: number): { notes: CarolNote[]; length: number } {
  const notes: CarolNote[] = []
  let beat = 0
  for (const token of line.trim().split(/\s+/)) {
    const [name, len] = token.split(':')
    const beats = len ? Number(len) : 1
    if (name !== 'r') {
      const m = /^([A-G][#b]?)(-?\d)$/.exec(name)
      if (!m) throw new Error(`Bad note: ${token}`)
      notes.push({ beat, beats, note: 12 * (Number(m[2]) + 1) + pitchClass(m[1]) + transpose })
    }
    beat += beats
  }
  return { notes, length: beat }
}

function parseChords(line: string, transpose: number): { chords: CarolChord[]; length: number } {
  const chords: CarolChord[] = []
  let beat = 0
  for (const token of line.trim().split(/\s+/)) {
    const [symbol, len] = token.split(':')
    const beats = len ? Number(len) : 1
    if (symbol !== 'r') {
      const m = /^([A-G][#b]?)(m7|maj7|m|7|dim|sus4)?(?:\/([A-G][#b]?))?$/.exec(symbol)
      if (!m) throw new Error(`Bad chord: ${token}`)
      const root = (pitchClass(m[1]) + transpose + 120) % 12
      const bassPc = m[3] ? (pitchClass(m[3]) + transpose + 120) % 12 : root
      const pad = [...new Set(QUALITY[m[2] ?? ''].map((i) => 55 + ((root + i - 55 + 1200) % 12)))].sort((a, b) => a - b)
      chords.push({ beat, beats, root, bass: 36 + bassPc, pad })
    }
    beat += beats
  }
  return { chords, length: beat }
}

function compile(src: CarolSource): Carol {
  const melody = parseLine(src.melody, src.transpose)
  const counter = src.counter ? parseLine(src.counter, src.transpose) : { notes: [], length: melody.length }
  const chords = parseChords(src.chords, src.transpose)
  if (melody.length !== chords.length || counter.length !== melody.length) {
    throw new Error(`Carol "${src.id}": melody ${melody.length}, counter ${counter.length}, chords ${chords.length} beats`)
  }
  const { melody: _m, counter: _c, chords: _ch, ...rest } = src
  void _m
  void _c
  void _ch
  return {
    ...rest,
    melody: melody.notes,
    counter: counter.notes,
    chords: chords.chords,
    length: melody.length,
    tonic: chords.chords[0].root,
  }
}

const repeat = (s: string, n: number) => Array.from({ length: n }, () => s).join(' ')

const SOURCES: CarolSource[] = [
  {
    // 01 The Arrival — mysterious, modal, far away. Written in A minor, sounding in D minor.
    id: 'greensleeves',
    title: 'Greensleeves (What Child Is This)',
    source: 'English traditional, 16th century',
    bpm: 76,
    beatsPerBar: 3,
    transpose: 5,
    style: 'waltz',
    lead: 'flute',
    level: 0.05,
    melody: `A4
      C5:2 D5   E5:1.5 F#5:.5 E5   D5:2 B4   G4:1.5 A4:.5 B4   C5:2 A4   A4:1.5 G#4:.5 A4   B4:2 G#4   E4:2 A4
      C5:2 D5   E5:1.5 F#5:.5 E5   D5:2 B4   G4:1.5 A4:.5 B4   C5:1.5 B4:.5 A4   G#4:1.5 F#4:.5 G#4   A4:3   A4:3
      G5:3   G5:1.5 F#5:.5 E5   D5:2 B4   G4:1.5 A4:.5 B4   C5:2 A4   A4:1.5 G#4:.5 A4   B4:2 G#4   E4:3
      G5:3   G5:1.5 F#5:.5 E5   D5:2 B4   G4:1.5 A4:.5 B4   C5:1.5 B4:.5 A4   G#4:1.5 F#4:.5 G#4   A4:3   A4:2`,
    chords: `r:1
      Am:3 C:3 G:3 Em:3 Am:3 E7:3 E:3 Am:3
      Am:3 C:3 G:3 Em:3 Am:3 E:3 Am:3 Am:3
      C:3 C:3 G:3 Em:3 Am:3 E7:3 E:3 E:3
      C:3 C:3 G:3 Em:3 Am:3 E:3 Am:3 Am:2`,
  },
  {
    // 02 The Christmas Express — James Lord Pierpont, 1857.
    id: 'jingleBells',
    title: 'Jingle Bells',
    source: 'James Lord Pierpont, 1857',
    bpm: 128,
    beatsPerBar: 4,
    transpose: 0,
    style: 'oompah',
    lead: 'bells',
    level: 0.075,
    melody: `D4 B4 A4 G4   D4:3 D4:.5 D4:.5   D4 B4 A4 G4   E4:4
      E4 C5 B4 A4   F#4:4   D5 D5 C5 A4   B4:4
      D4 B4 A4 G4   D4:4   D4 B4 A4 G4   E4:3 E4
      E4 C5 B4 A4   D5 D5 D5 D5   E5 D5 C5 A4   G4:4
      B4 B4 B4:2   B4 B4 B4:2   B4 D5 G4:1.5 A4:.5   B4:4
      C5 C5 C5:1.5 C5:.5   C5 B4 B4 B4:.5 B4:.5   B4 A4 A4 B4   A4:2 D5:2
      B4 B4 B4:2   B4 B4 B4:2   B4 D5 G4:1.5 A4:.5   B4:4
      C5 C5 C5:1.5 C5:.5   C5 B4 B4 B4:.5 B4:.5   D5 D5 C5 A4   G4:4`,
    chords: `G:4 G:4 G:4 C:4   Am:4 D:4 D7:4 G:4   G:4 G:4 G:4 C:4   Am:4 D:4 D7:4 G:4
      G:4 G:4 G:4 G:4   C:4 G:4 A7:4 D7:4   G:4 G:4 G:4 G:4   C:4 G:4 D7:4 G:4`,
  },
  {
    // 03 The Great Workshop — Welsh traditional (Nos Galan).
    id: 'deckTheHalls',
    title: 'Deck the Halls',
    source: 'Welsh traditional, 16th century',
    bpm: 112,
    beatsPerBar: 4,
    transpose: 0,
    style: 'bounce',
    lead: 'musicbox',
    level: 0.07,
    melody: `D5:1.5 C5:.5 B4 A4   G4 A4 B4 G4   A4:.5 B4:.5 C5:.5 A4:.5 B4:1.5 A4:.5   G4 F#4 G4:2
      D5:1.5 C5:.5 B4 A4   G4 A4 B4 G4   A4:.5 B4:.5 C5:.5 A4:.5 B4:1.5 A4:.5   G4 F#4 G4:2
      A4:1.5 B4:.5 C5 A4   B4:1.5 C5:.5 D5 A4   B4:.5 C#5:.5 D5 E5:.5 F#5:.5 G5   F#5 E5 D5:2
      D5:1.5 C5:.5 B4 A4   G4 A4 B4 G4   E5:.5 E5:.5 E5:.5 E5:.5 D5:1.5 C5:.5   B4 A4 G4:2`,
    chords: `G:4 G:1 D:1 G:2 D7:2 G:2 G:1 D:1 G:2
      G:4 G:1 D:1 G:2 D7:2 G:2 G:1 D:1 G:2
      Am:2 D7:2 G:2 D:2 A:1 D:1 A7:2 D:1 A7:1 D:2
      G:4 G:1 D:1 G:2 C:2 D7:2 G:1 D:1 G:2`,
  },
  {
    // 04 The Great Christmas Clock, still stopped — Mykola Leontovych's "Shchedryk", 1916
    // (instrumental; the later English lyric is not used). Written in G minor, sounding in D minor.
    id: 'carolOfTheBells',
    title: 'Carol of the Bells (Shchedryk)',
    source: 'Mykola Leontovych, 1916',
    bpm: 120,
    beatsPerBar: 3,
    transpose: 7,
    style: 'bells',
    lead: 'celesta',
    level: 0.075,
    melody: repeat('Bb4 A4:.5 Bb4:.5 G4', 16),
    counter: `r:24 ${repeat('D5 C5:.5 D5:.5 Bb4', 8)}`,
    chords: repeat('Gm:3 Gm/F:3 Eb:3 Gm/D:3', 4),
  },
  {
    // 04 After midnight — a 16th-century French dance tune ("Branle de l'Official").
    id: 'dingDong',
    title: 'Ding Dong Merrily on High',
    source: 'Thoinot Arbeau, Orchésographie, 1588',
    bpm: 104,
    beatsPerBar: 4,
    transpose: 7,
    style: 'ring',
    lead: 'bells',
    level: 0.075,
    melody: `G4 G4 A4:.5 G4:.5 F#4:.5 E4:.5   D4:3 D4   E4 G4 G4 F#4   G4:2 G4:2
      G4 G4 A4:.5 G4:.5 F#4:.5 E4:.5   D4:3 D4   E4 G4 G4 F#4   G4:4
      D5:1.5 C5:.5 B4:.5 C5:.5 D5:.5 B4:.5   C5:1.5 B4:.5 A4:.5 B4:.5 C5:.5 A4:.5
      B4:1.5 A4:.5 G4:.5 A4:.5 B4:.5 G4:.5   A4:1.5 G4:.5 F#4:.5 G4:.5 A4:.5 F#4:.5
      G4:1.5 E4:.5 D4 G4   G4 F#4 G4:2
      D5:1.5 C5:.5 B4:.5 C5:.5 D5:.5 B4:.5   C5:1.5 B4:.5 A4:.5 B4:.5 C5:.5 A4:.5
      B4:1.5 A4:.5 G4:.5 A4:.5 B4:.5 G4:.5   A4:1.5 G4:.5 F#4:.5 G4:.5 A4:.5 F#4:.5
      G4:1.5 E4:.5 D4 G4   G4 F#4 G4:2`,
    chords: `G:2 D:1 Em:1 D:4 Em:2 D:2 G:4   G:2 D:1 Em:1 D:4 Em:2 D:2 G:4
      G:4 Am:4 Em:4 D:4 Em:1 C:1 D:1 G:1 C:1 D:1 G:2
      G:4 Am:4 Em:4 D:4 Em:1 C:1 D:1 G:1 C:1 D:1 G:2`,
  },
  {
    // 05 The Reindeer Stables — John Henry Hopkins Jr., 1857.
    id: 'weThreeKings',
    title: 'We Three Kings',
    source: 'John Henry Hopkins Jr., 1857',
    bpm: 92,
    beatsPerBar: 3,
    transpose: 0,
    style: 'heartbeat',
    lead: 'strings',
    level: 0.055,
    melody: `B4:2 A4   G4:2 E4   F#4 G4 F#4   E4:3
      B4:2 A4   G4:2 E4   F#4 G4 F#4   E4:3
      G4:2 G4   A4:2 A4   B4:2 B4   D5 C5 B4
      A4 B4 A4   G4:2 F#4   E4:3   r:3`,
    chords: `Em:3 Em:3 B7:3 Em:3 Em:3 Em:3 B7:3 Em:3
      G:3 D:3 Em:3 G:3 Am:3 Em:2 B7:1 Em:3 Em:3`,
  },
  {
    // 06 The Christmas Eve Flight — Felix Mendelssohn, 1840. Written in G, sounding in D.
    id: 'harkTheHerald',
    title: 'Hark! The Herald Angels Sing',
    source: 'Felix Mendelssohn, 1840',
    bpm: 96,
    beatsPerBar: 4,
    transpose: -5,
    style: 'march',
    lead: 'brass',
    level: 0.06,
    melody: `D4 G4 G4:1.5 F#4:.5   G4 B4 B4 A4   D5 D5 D5:1.5 C5:.5   B4 A4 B4:2
      D4 G4 G4:1.5 F#4:.5   G4 B4 B4 A4   D5 A4 A4:1.5 F#4:.5   F#4 E4 D4:2
      D5 D5 D5 G4   C5 B4 B4 A4   D5 D5 D5 G4   C5 B4 B4 A4
      E5 E5 E5 D5   C5 B4 C5:2   A4 B4:.5 C5:.5 D5:1.5 G4:.5   G4 A4 B4:2
      E5:1.5 E5:.5 E5 D5   C5 B4 C5:2   A4 B4:.5 C5:.5 D5:1.5 G4:.5   G4 A4 G4:2`,
    chords: `G:4 G:2 D:2 G:2 D7:2 G:1 D:1 G:2
      G:4 G:2 D:2 D:4 D:1 A7:1 D:2
      G:4 Am:1 G:2 D:1 G:4 Am:1 G:2 D:1
      C:2 Em:1 G:1 Am:1 G:1 C:2 D7:2 G:2 C:1 D:1 G:2
      C:2 Em:1 G:1 Am:1 G:1 C:2 D7:2 G:2 C:1 D:1 G:2`,
  },
  {
    // 07 Christmas Morning — Franz Xaver Gruber, 1818. Written in C, sounding in D.
    id: 'silentNight',
    title: 'Silent Night',
    source: 'Franz Xaver Gruber, 1818',
    bpm: 66,
    beatsPerBar: 3,
    transpose: 2,
    style: 'lullaby',
    lead: 'musicbox',
    level: 0.065,
    melody: `G4:1.5 A4:.5 G4   E4:3   G4:1.5 A4:.5 G4   E4:3
      D5:2 D5   B4:3   C5:2 C5   G4:3
      A4:2 A4   C5:1.5 B4:.5 A4   G4:1.5 A4:.5 G4   E4:3
      A4:2 A4   C5:1.5 B4:.5 A4   G4:1.5 A4:.5 G4   E4:3
      D5:2 D5   F5:1.5 D5:.5 B4   C5:3   E5:3
      C5 G4 E4   G4:1.5 F4:.5 D4   C4:3   r:3`,
    chords: `C:3 C:3 C:3 C:3   G:3 G:3 C:3 C:3   F:3 F:3 C:3 C:3   F:3 F:3 C:3 C:3
      G:3 G7:3 C:3 C:3   C:3 G7:3 C:3 C:3`,
  },
]

export const CAROLS: Record<CarolId, Carol> = Object.fromEntries(SOURCES.map((s) => [s.id, compile(s)])) as Record<CarolId, Carol>

/** The carol that accompanies each destination. */
export function carolFor(chapter: string, celebrating: boolean): CarolId {
  switch (chapter) {
    case 'express':
      return 'jingleBells'
    case 'workshop':
      return 'deckTheHalls'
    case 'clock':
      return celebrating ? 'dingDong' : 'carolOfTheBells'
    case 'stables':
      return 'weThreeKings'
    case 'flight':
      return 'harkTheHerald'
    case 'morning':
      return 'silentNight'
    default:
      return 'greensleeves'
  }
}
