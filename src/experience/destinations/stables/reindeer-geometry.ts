import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../../../lib/math'

/**
 * Procedural reindeer (temporary stand-in for a rigged, scanned-quality GLB —
 * see ASSETS.md). Anatomy is built from shaped primitives with vertex-colour
 * coat markings: dark back, pale belly, cream neck ruff and rump patch.
 * Frame: +z forward, y up, hooves at y = 0, shoulder height ≈ 1.15 m.
 */
type RGB = [number, number, number]
const COAT: RGB = [0.36, 0.25, 0.17]
const COAT_DARK: RGB = [0.24, 0.16, 0.11]
const BELLY: RGB = [0.74, 0.66, 0.55]
const CREAM: RGB = [0.86, 0.8, 0.7]
const MUZZLE: RGB = [0.5, 0.41, 0.34]
const HOOF: RGB = [0.08, 0.06, 0.05]
const ANTLER: RGB = [0.66, 0.56, 0.43]

function finish(g: BufferGeometry, color: (n: Vector3, p: Vector3) => RGB) {
  const ng = g.index ? g.toNonIndexed() : g
  ng.computeVertexNormals()
  const pos = ng.attributes.position
  const nor = ng.attributes.normal
  const c = new Float32Array(pos.count * 3)
  const n = new Vector3()
  const p = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    n.fromBufferAttribute(nor, i)
    p.fromBufferAttribute(pos, i)
    c.set(color(n, p), i * 3)
  }
  ng.setAttribute('color', new BufferAttribute(c, 3))
  for (const name of Object.keys(ng.attributes)) if (!['position', 'normal', 'color'].includes(name)) ng.deleteAttribute(name)
  return ng
}

const flat = (rgb: RGB) => () => rgb
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const coat = (n: Vector3): RGB => {
  // Darker along the spine, pale underneath.
  if (n.y < -0.25) return mix(COAT, BELLY, Math.min(1, (-n.y - 0.25) * 2.5))
  return mix(COAT, COAT_DARK, Math.max(0, n.y - 0.4) * 1.6)
}
const ellipsoid = (rx: number, ry: number, rz: number, x: number, y: number, z: number) =>
  new SphereGeometry(1, 20, 14).scale(rx, ry, rz).translate(x, y, z)

function merge(parts: BufferGeometry[]) {
  const g = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  g.computeBoundingSphere()
  return g
}

/** Torso, chest, rump, neck, ruff and tail (static relative to the body). */
export function buildBodyGeometry() {
  return merge([
    finish(ellipsoid(0.33, 0.36, 0.8, 0, 1.06, 0), coat),
    finish(ellipsoid(0.3, 0.37, 0.34, 0, 1.1, 0.55), coat),
    finish(ellipsoid(0.31, 0.34, 0.34, 0, 1.1, -0.58), (n) => (n.z < -0.55 ? CREAM : coat(n))),
    finish(new CylinderGeometry(0.17, 0.27, 0.72, 16).rotateX(0.62).translate(0, 1.42, 0.82), (n) => (n.z > 0.3 ? CREAM : coat(n))),
    finish(ellipsoid(0.27, 0.34, 0.26, 0, 1.26, 0.8), flat(CREAM)),
    finish(new ConeGeometry(0.09, 0.18, 8).rotateX(-2.4).translate(0, 1.2, -0.92), flat(CREAM)),
  ])
}

/** Head (pivot at the top of the neck), muzzle, nose and eyes. */
export function buildHeadGeometry() {
  return merge([
    finish(ellipsoid(0.13, 0.15, 0.22, 0, 0.05, 0.12), coat),
    finish(ellipsoid(0.095, 0.1, 0.17, 0, -0.03, 0.36), flat(MUZZLE)),
    finish(ellipsoid(0.06, 0.045, 0.04, 0, -0.01, 0.52), flat(HOOF)),
    finish(new SphereGeometry(0.026, 8, 6).translate(-0.115, 0.1, 0.2), flat([0.02, 0.02, 0.02])),
    finish(new SphereGeometry(0.026, 8, 6).translate(0.115, 0.1, 0.2), flat([0.02, 0.02, 0.02])),
  ])
}

/** One ear, pivot at its base, pointing outward along +x. */
export function buildEarGeometry() {
  return merge([finish(new ConeGeometry(0.06, 0.2, 8).scale(1, 1, 0.45).rotateZ(-Math.PI / 2).translate(0.1, 0, 0), coat)])
}

/** Upper leg segment, hanging from a pivot at y = 0 down to the knee at y = −len. */
export function buildUpperLegGeometry(len: number, rTop: number) {
  return merge([finish(new CylinderGeometry(rTop * 0.7, rTop, len, 10).translate(0, -len / 2, 0), coat)])
}

/** Lower leg with hoof, from the knee pivot down to the ground. */
export function buildLowerLegGeometry(len: number) {
  return merge([
    finish(new CylinderGeometry(0.045, 0.055, len - 0.08, 8).translate(0, -(len - 0.08) / 2, 0), (n) => mix(COAT, BELLY, n.y < 0 ? 0.3 : 0)),
    finish(new CylinderGeometry(0.07, 0.085, 0.09, 10).translate(0, -len + 0.045, 0.015), flat(HOOF)),
  ])
}

/** Branching antlers (both sides), varied per seed. Pivot at the skull top. */
export function buildAntlerGeometry(seed: number) {
  const rand = mulberry32(seed)
  const parts: BufferGeometry[] = []
  const scale = 0.85 + rand() * 0.35
  const tube = (pts: [number, number, number][], r: number) => {
    const curve = new CatmullRomCurve3(pts.map(([x, y, z]) => new Vector3(x * scale, y * scale, z * scale)))
    parts.push(finish(new TubeGeometry(curve, 16, r, 6, false), flat(ANTLER)))
  }
  for (const s of [-1, 1]) {
    const j = () => (rand() - 0.5) * 0.06
    // Main beam: up, back, then sweeping forward at the top.
    const beam: [number, number, number][] = [
      [s * 0.07, 0.15, 0.06],
      [s * 0.2, 0.38, -0.06 + j()],
      [s * 0.33, 0.66, -0.08 + j()],
      [s * 0.33, 0.92, 0.04 + j()],
      [s * 0.24, 1.08, 0.2 + j()],
    ]
    tube(beam, 0.03)
    // Brow tine (the forward "shovel").
    tube(
      [
        [s * 0.11, 0.22, 0.06],
        [s * 0.08, 0.3, 0.22],
        [s * 0.03, 0.36, 0.3 + j()],
      ],
      0.022,
    )
    // Upper tines.
    tube(
      [
        [s * 0.33, 0.66, -0.08],
        [s * (0.4 + j()), 0.78, 0.06],
        [s * 0.42, 0.88, 0.16 + j()],
      ],
      0.02,
    )
    tube(
      [
        [s * 0.33, 0.9, 0.04],
        [s * (0.45 + j()), 1.0, -0.02],
        [s * 0.5, 1.12, 0.0 + j()],
      ],
      0.018,
    )
    if (rand() > 0.35)
      tube(
        [
          [s * 0.26, 1.06, 0.18],
          [s * 0.3, 1.2, 0.26 + j()],
        ],
        0.016,
      )
  }
  return merge(parts)
}

/** Red leather collar with gold bells, sitting around the base of the neck. */
export function buildCollarGeometry() {
  const parts: BufferGeometry[] = [finish(new TorusGeometry(0.27, 0.035, 8, 24).rotateX(0.62 + Math.PI / 2).translate(0, 1.27, 0.69), flat([0.45, 0.04, 0.05]))]
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + ((i - 3) / 6) * 2.2
    const x = Math.cos(a) * 0.3
    const yz = Math.sin(a) * 0.3
    parts.push(finish(new SphereGeometry(0.045, 10, 8).translate(x, 1.32 + yz * Math.cos(0.62), 0.72 - yz * Math.sin(0.62) * 0.4), flat([0.86, 0.62, 0.22])))
  }
  return merge(parts)
}

export const LEG = {
  frontUpper: 0.5,
  frontLower: 0.5,
  backUpper: 0.52,
  backLower: 0.48,
  frontZ: 0.55,
  backZ: -0.58,
  hipY: 1.0,
  x: 0.17,
}
