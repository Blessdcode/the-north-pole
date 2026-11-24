import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  RepeatWrapping,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../../../lib/math'

/**
 * Procedural assets for the Great Workshop (temporary stand-ins — see ASSETS.md).
 */

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat = true) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d')!)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping
  t.anisotropy = 4
  return t
}

/** Worn oak floor planks. */
export function createPlankTexture() {
  const rand = mulberry32(5)
  return canvasTexture(512, 512, (ctx) => {
    for (let row = 0; row < 16; row++) {
      let x = -rand() * 200
      while (x < 512) {
        const len = 140 + rand() * 180
        const l = 26 + rand() * 12
        ctx.fillStyle = `hsl(${24 + rand() * 8}, ${38 + rand() * 12}%, ${l}%)`
        ctx.fillRect(x, row * 32, len, 32)
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillRect(x, row * 32, 2, 32)
        // Grain.
        ctx.strokeStyle = 'rgba(60,30,10,0.18)'
        for (let g = 0; g < 4; g++) {
          ctx.beginPath()
          const y = row * 32 + 4 + rand() * 24
          ctx.moveTo(x, y)
          ctx.bezierCurveTo(x + len * 0.3, y + rand() * 4 - 2, x + len * 0.6, y + rand() * 4 - 2, x + len, y)
          ctx.stroke()
        }
        x += len
      }
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, row * 32, 512, 2)
    }
  })
}

/** Dressed stone blocks for the hall walls. */
export function createStoneTexture() {
  const rand = mulberry32(9)
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#2a211b'
    ctx.fillRect(0, 0, 512, 512)
    for (let row = 0; row < 8; row++) {
      const off = row % 2 ? 64 : 0
      for (let col = -1; col < 5; col++) {
        const l = 30 + rand() * 12
        ctx.fillStyle = `hsl(${26 + rand() * 10}, ${12 + rand() * 8}%, ${l}%)`
        ctx.fillRect(col * 128 + off + 3, row * 64 + 3, 122, 58)
        ctx.fillStyle = 'rgba(255,255,255,0.04)'
        ctx.fillRect(col * 128 + off + 3, row * 64 + 3, 122, 6)
      }
    }
  })
}

/** Festive wrapping paper (stripes + dots). */
export function createPaperTexture(base: string, stripe: string) {
  return canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 256, 256)
    ctx.fillStyle = stripe
    for (let i = -256; i < 512; i += 48) {
      ctx.save()
      ctx.translate(i, 0)
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(0, -400, 14, 900)
      ctx.restore()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    for (let y = 12; y < 256; y += 32) for (let x = (y / 32) % 2 ? 28 : 12; x < 256; x += 32) ctx.fillRect(x, y, 3, 3)
  })
}

/** Rubber conveyor belt with cleats (scrolled for motion). */
export function createBeltTexture() {
  return canvasTexture(256, 64, (ctx) => {
    ctx.fillStyle = '#1a1716'
    ctx.fillRect(0, 0, 256, 64)
    ctx.fillStyle = '#2c2624'
    for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 6, 64)
  })
}

/** Painted sign over the west wall. */
export function createSignTexture(lines: string[]) {
  return canvasTexture(
    1024,
    256,
    (ctx) => {
      ctx.fillStyle = '#14301f'
      ctx.fillRect(0, 0, 1024, 256)
      ctx.strokeStyle = '#d2a24f'
      ctx.lineWidth = 10
      ctx.strokeRect(14, 14, 996, 228)
      ctx.lineWidth = 3
      ctx.strokeRect(32, 32, 960, 192)
      ctx.fillStyle = '#f3d9a4'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '600 92px "Cormorant Garamond", Georgia, serif'
      ctx.fillText(lines[0], 512, 112)
      ctx.font = '500 34px Inter, sans-serif'
      ctx.fillText(lines[1] ?? '', 512, 190)
    },
    false,
  )
}

/** A gear, axis along z, centred at the origin. */
export function buildGearGeometry(radius: number, teeth: number, depth: number) {
  const s = new Shape()
  const inner = radius * 0.86
  const tooth = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * tooth
    const pts: [number, number][] = [
      [inner, a],
      [radius, a + tooth * 0.15],
      [radius, a + tooth * 0.45],
      [inner, a + tooth * 0.6],
    ]
    pts.forEach(([r, ang], k) => {
      const x = Math.cos(ang) * r
      const y = Math.sin(ang) * r
      if (i === 0 && k === 0) s.moveTo(x, y)
      else s.lineTo(x, y)
    })
  }
  s.closePath()
  // Spoke windows.
  const holes = 6
  for (let i = 0; i < holes; i++) {
    const a0 = (i / holes) * Math.PI * 2 + 0.12
    const a1 = ((i + 1) / holes) * Math.PI * 2 - 0.12
    const h = new Shape()
    const r0 = radius * 0.28
    const r1 = radius * 0.7
    h.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0)
    h.absarc(0, 0, r1, a0, a1, false)
    h.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0)
    h.absarc(0, 0, r0, a1, a0, true)
    s.holes.push(h)
  }
  const g = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1, curveSegments: 6 })
  g.translate(0, 0, -depth / 2)
  return g
}

function painted(g: BufferGeometry, rgb: [number, number, number]) {
  const ng = g.index ? g.toNonIndexed() : g
  const n = ng.attributes.position.count
  const c = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) c.set(rgb, i * 3)
  ng.setAttribute('color', new BufferAttribute(c, 3))
  for (const name of Object.keys(ng.attributes)) if (!['position', 'normal', 'color'].includes(name)) ng.deleteAttribute(name)
  return ng
}

/** A workshop elf (≈1.15 m): tunic, belt, head, pointed hat with pom-pom. Vertex coloured. */
export function buildElfGeometry() {
  const parts = [
    painted(new CylinderGeometry(0.2, 0.3, 0.6, 10).translate(0, 0.42, 0), [0.08, 0.32, 0.14]),
    painted(new CylinderGeometry(0.31, 0.31, 0.07, 10).translate(0, 0.42, 0), [0.12, 0.07, 0.04]),
    painted(new CylinderGeometry(0.08, 0.08, 0.14, 6).translate(-0.1, 0.07, 0), [0.15, 0.08, 0.05]),
    painted(new CylinderGeometry(0.08, 0.08, 0.14, 6).translate(0.1, 0.07, 0), [0.15, 0.08, 0.05]),
    painted(new SphereGeometry(0.17, 12, 8).translate(0, 0.86, 0), [0.95, 0.72, 0.58]),
    painted(new SphereGeometry(0.04, 6, 4).translate(-0.17, 0.88, 0), [0.95, 0.66, 0.52]),
    painted(new SphereGeometry(0.04, 6, 4).translate(0.17, 0.88, 0), [0.95, 0.66, 0.52]),
    painted(new ConeGeometry(0.18, 0.42, 10).rotateZ(0.3).translate(-0.05, 1.13, 0), [0.62, 0.05, 0.06]),
    painted(new SphereGeometry(0.06, 8, 6).translate(-0.17, 1.31, 0), [0.95, 0.95, 0.95]),
    painted(new CylinderGeometry(0.06, 0.07, 0.3, 6).rotateZ(0.5).translate(-0.27, 0.48, 0.05), [0.08, 0.32, 0.14]),
    painted(new CylinderGeometry(0.06, 0.07, 0.3, 6).rotateZ(-0.5).translate(0.27, 0.48, 0.05), [0.08, 0.32, 0.14]),
  ]
  const g = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  return g
}

/** Ribbon cross + bow, sized for a unit present (scaled per instance). */
export function buildRibbonGeometry() {
  const parts = [
    new BoxGeometry(1.04, 1.04, 0.16),
    new BoxGeometry(0.16, 1.04, 1.04),
    new TorusGeometry(0.16, 0.05, 6, 12).rotateY(Math.PI / 4).rotateX(0.5).translate(-0.12, 0.6, 0),
    new TorusGeometry(0.16, 0.05, 6, 12).rotateY(Math.PI / 4).rotateX(-0.5).translate(0.12, 0.6, 0),
  ].map((g) => {
    const ng = g.index ? g.toNonIndexed() : g
    for (const name of Object.keys(ng.attributes)) if (!['position', 'normal'].includes(name)) ng.deleteAttribute(name)
    return ng
  })
  const g = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  return g
}
