import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  LatheGeometry,
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Procedural rolling-stock kit for the Christmas Express (temporary hero
 * stand-in — see ASSETS.md for the authored GLB that replaces it).
 *
 * Static parts are collected per material and merged into one geometry each,
 * so a whole vehicle costs a handful of draw calls.
 * Vehicle local frame: +z forward, y = 0 at the railhead, centred on its length.
 */
export type TrainMat = 'livery' | 'black' | 'brass' | 'steel' | 'snow' | 'window' | 'firebox' | 'lamp' | 'coal' | 'plate'

export function createTrainMaterials(plate: CanvasTexture): Record<TrainMat, Material> {
  return {
    livery: new MeshStandardMaterial({ color: '#8a0c12', roughness: 0.32, metalness: 0.35 }),
    black: new MeshStandardMaterial({ color: '#111214', roughness: 0.5, metalness: 0.5 }),
    brass: new MeshStandardMaterial({ color: '#d2a24f', roughness: 0.28, metalness: 0.95 }),
    steel: new MeshStandardMaterial({ color: '#6b7078', roughness: 0.35, metalness: 0.9 }),
    snow: new MeshStandardMaterial({ color: '#e6edfb', roughness: 0.95 }),
    coal: new MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.75, flatShading: true }),
    window: new MeshBasicMaterial({ color: new Color(3.1, 2.0, 0.95), toneMapped: false, side: DoubleSide }),
    firebox: new MeshBasicMaterial({ color: new Color(6, 2.2, 0.5), toneMapped: false, side: DoubleSide }),
    lamp: new MeshBasicMaterial({ color: new Color(9, 7.5, 4.5), toneMapped: false }),
    plate: new MeshStandardMaterial({ map: plate, roughness: 0.35, metalness: 0.7 }),
  }
}

export class Kit {
  private buckets = new Map<TrainMat, BufferGeometry[]>()

  add(mat: TrainMat, g: BufferGeometry) {
    const ng = g.index ? g.toNonIndexed() : g
    if (ng !== g) g.dispose()
    // Keep a consistent attribute set for merging.
    for (const name of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(name)) ng.deleteAttribute(name)
    if (!ng.attributes.uv) ng.setAttribute('uv', new BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2))
    let list = this.buckets.get(mat)
    if (!list) this.buckets.set(mat, (list = []))
    list.push(ng)
    return this
  }

  box(mat: TrainMat, w: number, h: number, d: number, x: number, y: number, z: number) {
    return this.add(mat, new BoxGeometry(w, h, d).translate(x, y, z))
  }

  /** Cylinder lying along z. */
  cylZ(mat: TrainMat, r: number, len: number, x: number, y: number, z: number, seg = 24) {
    return this.add(mat, new CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2).translate(x, y, z))
  }

  /** Cylinder standing along y. */
  cylY(mat: TrainMat, rTop: number, rBot: number, h: number, x: number, y: number, z: number, seg = 18) {
    return this.add(mat, new CylinderGeometry(rTop, rBot, h, seg).translate(x, y, z))
  }

  /** Band around a z-axis cylinder. */
  bandZ(mat: TrainMat, r: number, tube: number, x: number, y: number, z: number) {
    return this.add(mat, new TorusGeometry(r, tube, 6, 32).translate(x, y, z))
  }

  sphere(mat: TrainMat, r: number, x: number, y: number, z: number, half = false) {
    const g = new SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI)
    return this.add(mat, g.translate(x, y, z))
  }

  lathe(mat: TrainMat, profile: [number, number][], x: number, y: number, z: number) {
    return this.add(mat, new LatheGeometry(profile.map(([r, h]) => new Vector2(r, h)), 20).translate(x, y, z))
  }

  /** A flat panel facing ±x (side) or ±z (end). */
  panel(mat: TrainMat, w: number, h: number, x: number, y: number, z: number, facing: 'x+' | 'x-' | 'z+' | 'z-') {
    const g = new PlaneGeometry(w, h)
    if (facing === 'x+') g.rotateY(Math.PI / 2)
    if (facing === 'x-') g.rotateY(-Math.PI / 2)
    if (facing === 'z-') g.rotateY(Math.PI)
    return this.add(mat, g.translate(x, y, z))
  }

  /** Merge each material bucket into a single geometry. */
  build() {
    const out: { mat: TrainMat; geometry: BufferGeometry }[] = []
    for (const [mat, list] of this.buckets) {
      const merged = mergeGeometries(list)
      list.forEach((g) => g.dispose())
      if (merged) {
        merged.computeBoundingSphere()
        out.push({ mat, geometry: merged })
      }
    }
    this.buckets.clear()
    return out
  }
}

/**
 * Spoked driving wheel, axis along x. A crank pin sits at the top (+y) at
 * `crank` radius so the rod animation can lock onto it.
 */
export function buildSpokedWheel(r: number, crank: number) {
  const parts: BufferGeometry[] = []
  const color = (g: BufferGeometry, c: [number, number, number]) => {
    const ng = g.index ? g.toNonIndexed() : g
    const n = ng.attributes.position.count
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) arr.set(c, i * 3)
    ng.setAttribute('color', new BufferAttribute(arr, 3))
    for (const name of Object.keys(ng.attributes)) if (!['position', 'normal', 'color'].includes(name)) ng.deleteAttribute(name)
    parts.push(ng)
  }
  const red: [number, number, number] = [0.42, 0.03, 0.04]
  const tyre: [number, number, number] = [0.16, 0.16, 0.17]
  const brass: [number, number, number] = [0.8, 0.58, 0.25]
  const w = 0.14
  // Tyre (outer running surface) and rim faces.
  color(new CylinderGeometry(r, r, w, 36, 1, true), tyre)
  for (const side of [-1, 1]) {
    const ring = new RingGeometry(r * 0.84, r, 36).rotateX(-Math.PI / 2 * side).translate(0, (side * w) / 2, 0)
    color(ring, red)
  }
  // Spokes.
  const spokes = 14
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2
    const s = new BoxGeometry(0.06, w * 0.7, r * 0.72)
      .translate(0, 0, r * 0.48)
      .rotateY(a)
    color(s, red)
  }
  // Hub, counterweight (opposite the crank) and crank pin.
  color(new CylinderGeometry(r * 0.2, r * 0.2, w * 1.3, 16), red)
  color(new BoxGeometry(r * 0.75, w * 0.9, r * 0.28).translate(0, 0, -r * 0.62), red)
  color(new CylinderGeometry(0.09, 0.09, 0.36, 10).translate(0, w / 2 + 0.12, crank), brass)
  const merged = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  // Built with axis along y and the crank at +z; rotate so the axis is x and the crank is at +y.
  merged.rotateZ(Math.PI / 2)
  merged.rotateX(-Math.PI / 2)
  merged.computeVertexNormals()
  return merged
}

/** Small plain wheel for bogies, axis along x. */
export function buildPlainWheel(r: number) {
  const g = new CylinderGeometry(r, r, 0.12, 20).rotateZ(Math.PI / 2)
  return g
}

/** Brass nameplate texture. */
export function createNameplateTexture(text: string) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 112
  const ctx = c.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, 112)
  g.addColorStop(0, '#f2cf7f')
  g.addColorStop(0.5, '#b88a3c')
  g.addColorStop(1, '#e2b765')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 112)
  ctx.fillStyle = '#5a0b0e'
  ctx.fillRect(10, 10, 492, 92)
  ctx.fillStyle = '#f5d48c'
  ctx.font = '600 58px "Cormorant Garamond", Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 60)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}
