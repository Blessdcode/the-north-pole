import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LinearMipmapLinearFilter,
  Shape,
  SRGBColorSpace,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ROOF_RATIO } from './village-layout'

/**
 * Procedural building blocks for the village (temporary hero-architecture
 * stand-ins — see ASSETS.md for the authored replacements planned).
 * All are unit-sized so a single instance matrix (w, h, d) shapes a house.
 */

/** Walls: unit box (y 0→1) with front/back gables reaching up to 1 + ROOF_RATIO. */
export function buildHouseWallsGeometry() {
  const box = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0).toNonIndexed()
  const gable = new BufferGeometry()
  const R = ROOF_RATIO
  const z = 0.5
  // Front (+z) and back (-z) triangles with outward-facing winding.
  const verts = [-0.5, 1, z, 0.5, 1, z, 0, 1 + R, z, 0.5, 1, -z, -0.5, 1, -z, 0, 1 + R, -z]
  gable.setAttribute('position', new Float32BufferAttribute(verts, 3))
  gable.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1], 3))
  gable.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 0.5, 1, 0, 0, 1, 0, 0.5, 1], 2))
  const merged = mergeGeometries([box, gable])!
  box.dispose()
  gable.dispose()
  return merged
}

/** Roof: a chevron extruded along the ridge (z), with overhang and thickness. */
export function buildRoofGeometry() {
  const R = ROOF_RATIO
  const o = 0.09
  const t = 0.07
  const s = new Shape()
  s.moveTo(-0.5 - o, 1 - 0.1)
  s.lineTo(0, 1 + R + 0.05)
  s.lineTo(0.5 + o, 1 - 0.1)
  s.lineTo(0.5 + o, 1 - 0.1 - t)
  s.lineTo(0, 1 + R + 0.05 - t * 1.6)
  s.lineTo(-0.5 - o, 1 - 0.1 - t)
  s.closePath()
  const g = new ExtrudeGeometry(s, { depth: 1 + o * 2, bevelEnabled: false })
  g.translate(0, 0, -0.5 - o)
  g.computeVertexNormals()
  return g
}

/** Chimney: unit box standing on y = 0. */
export function buildChimneyGeometry() {
  const shaft = new BoxGeometry(1, 1, 1).translate(0, 0.5, 0)
  const cap = new BoxGeometry(1.3, 0.12, 1.3).translate(0, 1.0, 0)
  const g = mergeGeometries([shaft.toNonIndexed(), cap.toNonIndexed()])!
  shaft.dispose()
  cap.dispose()
  return g
}

/** Lit window with mullions and a warm interior gradient. */
export function createWindowTexture() {
  const w = 64
  const h = 96
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(w / 2, h * 0.62, 4, w / 2, h * 0.55, h * 0.7)
  grad.addColorStop(0, '#fff1d0')
  grad.addColorStop(0.45, '#ffc46e')
  grad.addColorStop(1, '#b0521c')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  // Curtains on the sides.
  ctx.fillStyle = 'rgba(120, 30, 18, 0.55)'
  ctx.fillRect(4, 4, 10, h - 8)
  ctx.fillRect(w - 14, 4, 10, h - 8)
  // Frame + mullions.
  ctx.strokeStyle = '#1a0e08'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, w - 6, h - 6)
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(w / 2, 0)
  ctx.lineTo(w / 2, h)
  ctx.moveTo(0, h * 0.42)
  ctx.lineTo(w, h * 0.42)
  ctx.stroke()
  // Snow on the sill.
  ctx.fillStyle = '#e8f0ff'
  ctx.fillRect(0, h - 7, w, 7)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.minFilter = LinearMipmapLinearFilter
  tex.anisotropy = 4
  return tex
}

/** Soft radial falloff used for pools of warm light on the snow. */
export function createGlowTexture() {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.14)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/** Painted station nameboard. */
export function createSignTexture(text: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 160
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#0f241b'
  ctx.fillRect(0, 0, 1024, 160)
  ctx.strokeStyle = '#c9a25a'
  ctx.lineWidth = 8
  ctx.strokeRect(10, 10, 1004, 140)
  ctx.lineWidth = 2
  ctx.strokeRect(22, 22, 980, 116)
  ctx.fillStyle = '#f0d39a'
  ctx.font = '600 82px "Cormorant Garamond", Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 512, 84)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/** Helper: per-vertex constant colour so merged parts keep their own tint. */
export function tint(g: BufferGeometry, r: number, gg: number, b: number) {
  const n = g.attributes.position.count
  const c = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    c[i * 3] = r
    c[i * 3 + 1] = gg
    c[i * 3 + 2] = b
  }
  g.setAttribute('color', new BufferAttribute(c, 3))
  return g
}
