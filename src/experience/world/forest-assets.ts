import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry } from 'three'
import { mulberry32 } from '../../lib/math'
import { createNoise2D } from '../../lib/noise'
import { distanceToGiftLine, distanceToRail, heightAt, slopeAt } from './geography'

/** A snow-laden Arctic spruce: stacked tiers, snow on the upper surfaces. */
export function buildSpruceGeometry() {
  const parts: BufferGeometry[] = []
  const trunk = new CylinderGeometry(0.35, 0.5, 3, 6).translate(0, 1.5, 0)
  paint(trunk, new Color('#1d130d'), new Color('#1d130d'))
  parts.push(trunk)
  const tiers = [
    { r: 4.2, h: 6.5, y: 2.0 },
    { r: 3.3, h: 5.6, y: 5.0 },
    { r: 2.4, h: 4.8, y: 7.8 },
    { r: 1.4, h: 3.8, y: 10.4 },
  ]
  for (const t of tiers) {
    const cone = new ConeGeometry(t.r, t.h, 9, 2, true).translate(0, t.y + t.h / 2, 0)
    paint(cone, new Color('#e4ecff'), new Color('#0b1a17'))
    parts.push(cone)
  }
  const merged = mergeGeometries(parts.map((p) => p.toNonIndexed()))!
  parts.forEach((p) => p.dispose())
  merged.computeVertexNormals()
  return merged
}

/** Vertical gradient: snow at the top of a tier, dark needles underneath. */
function paint(g: BufferGeometry, top: Color, bottom: Color) {
  g.computeBoundingBox()
  const box = g.boundingBox!
  const pos = g.attributes.position as BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const c = new Color()
  const rand = mulberry32(pos.count)
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - box.min.y) / (box.max.y - box.min.y || 1)
    const snowy = Math.min(1, Math.pow(t, 1.4) * 1.25 + (rand() - 0.5) * 0.25)
    c.copy(bottom).lerp(top, Math.max(0, snowy))
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new BufferAttribute(colors, 3))
}

export interface TreeInstance {
  x: number
  y: number
  z: number
  s: number
  r: number
  tint: number
}

export function scatterTrees(count: number): TreeInstance[] {
  const rand = mulberry32(1225)
  const clump = createNoise2D(5)
  const trees: TreeInstance[] = []
  let attempts = 0
  while (trees.length < count && attempts < count * 12) {
    attempts++
    // Bias sampling toward the visible corridor (south valley → village bowl).
    const x = (rand() - 0.5) * 3600
    const z = -1500 + rand() * 3700
    const d = Math.hypot(x, z)
    if (d < 70) continue
    const railD = distanceToRail(x, z)
    if (railD < 16) continue
    if (distanceToGiftLine(x, z) < 10) continue // keep the cableway clear
    const h = heightAt(x, z)
    if (h > 300) continue
    const slope = slopeAt(x, z)
    if (slope > 0.6) continue
    const density = clump(x * 0.004, z * 0.004) * 0.6 + clump(x * 0.015, z * 0.015) * 0.4
    let accept = 0.15 + density * 0.9
    if (d < 250) accept *= 0.35 // the village keeps open snowfields between houses
    if (d < 140) accept *= 0.4
    accept *= 1 - slope
    // The frozen forest: the western line runs through dense, old spruce.
    if (x < -140 && z < 40 && d > 235 && railD < 140) accept = Math.max(accept, 0.85) * 1.4
    accept *= 1 - Math.max(0, h - 180) / 140
    if (rand() > accept) continue
    trees.push({
      x,
      y: h - 0.6,
      z,
      s: 0.65 + Math.pow(rand(), 1.6) * 1.1,
      r: rand() * Math.PI * 2,
      tint: rand(),
    })
  }
  return trees
}

